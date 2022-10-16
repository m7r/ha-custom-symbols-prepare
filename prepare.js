import { program } from "commander";
import { writeFile, readFile, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { HTMLParser, Document } from "svgdom";
import { parse } from "css";

const colorMap = {
  custom: "beige",
  labelcolor: "secondary",
  tertiarylabelcolor: "tertiary",
  tintcolor: "primary",
};

const round2 = (x) => Math.round(x * 100) / 100;

const beautify = (x) =>
  String(x || "")
    .replace(/<path/g, "\n  <path")
    .replace("</svg>", "\n</svg>");

const titleCase = (value) =>
  String(value)
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());

const match = (regex) => (value) => String(value).match(regex) || [];
const first = (fn) => (value) => fn(value)[1];

const getSystemColor = first(match(/System([a-z]+)Color/i));
const getColorName = first(match(/multicolor-\d+:([^\s]+)/));
const getHierarchy = first(match(/hierarchical-\d+:([^\s]+)/));
const getPreview = first(match(/SFSymbolsPreview([A-F0-9]+(o[0-9]+)?)/));
const getColor = (value) => {
  const name = (getColorName(value) ?? "").toLowerCase();
  return getSystemColor(name) || colorMap[name] || name;
};
const getHex = (value) => {
  const [hex, opacity] = (getPreview(value) || "").split("o");
  let result = "#" + hex;
  if (opacity) result += Math.round((opacity / 100) * 255).toString(16);
  return result;
};

const getClass = (name, rules) => {
  const names = name
    .replace("monochrome-0 monochrome-1", "monochrome-1") // fix window.*
    .split(" ")
    .filter((name) => !name.startsWith("SFSymbolsPreview"));

  // add missing classes
  if (!names.some((name) => name.startsWith("monochrome"))) {
    names.unshift(`monochrome-0`);
  }
  if (!names.some((name) => name.startsWith("multicolor"))) {
    names.splice(1, 0, `multicolor-0:primary`);
  }
  if (!names.some((name) => name.startsWith("hierarchical"))) {
    names.splice(2, 0, `hierarchical-0:primary`);
  }

  return names
    .map((name) => {
      const declarations =
        rules.find((rule) => rule.selectors.includes("." + name))
          ?.declarations ?? [];
      const threshold = declarations.find(
        (d) => d.property == "-sfsymbols-variable-threshold"
      )?.value;

      if (name.startsWith("multicolor")) {
        name = name.slice(0, name.indexOf(":") + 1) + getColor(name);
      }

      if (
        declarations.some(
          (d) => d.property == "-sfsymbols-clear-behind" && d.value == "true"
        )
      ) {
        name += "#clear";
      }

      if (threshold) {
        name += "%" + threshold * 100;
      }

      return name;
    })
    .join(" ");
};

const getSvgs = async (folder) =>
  (await readdir(folder))
    .filter((name) => name.endsWith(".svg"))
    .map((name) => ({ name, path: join(folder, name) }));

const parseFile = async (file) => {
  const doc = new Document();
  const data = await readFile(file.path, "utf8");
  HTMLParser(data, doc);
  return doc;
};

const convertFiles = async (fn, option) => {
  const files = await getSvgs(option.inFolder);
  await mkdir(option.outFolder).catch(() => {});
  await Promise.all([fn(files, option), fn(files, option), fn(files, option)]);
};

const setRootArgs = (svg, viewBox) => {
  svg.setAttribute("version", "1.1");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", viewBox);
};

const calcViewBox = (
  { left, right, top, bottom, width, height },
  boxWidth,
  option
) => {
  let x = (boxWidth - option.size) / 2;
  let y = option.height * -1;
  let size = option.size;
  const maxSize = Math.max(width, height);
  const maxRight = x + size;
  const maxBottom = option.size - option.height;

  if (left < x) x = left;
  if (top < y) y = top;
  if (right > maxRight) x = right - maxRight;
  if (maxSize > option.size) {
    size = maxSize;
    if (maxSize == width) {
      x = left;
      y -= (size - option.size) / 2;
    } else {
      x -= (size - option.size) / 2;
      y = option.size * -1 + maxBottom;
    }
  } else {
    if (left + x + width > option.size) {
      x -= option.size - left + x - width - (option.size - width) / 2;
    }
    if (bottom > maxBottom) {
      y -= maxBottom - bottom;
    }
  }

  return [round2(x), round2(y), round2(size), round2(size)].join(" ");
};

const getPosition = (doc, query) => {
  return Number(doc.querySelector(query).getAttribute("x1"));
};

const getWidth = (doc, base) => {
  return (
    getPosition(doc, "#right-margin-" + base) -
    getPosition(doc, "#left-margin-" + base)
  );
};

const addPath = (parent, path, i) => {
  const node = parent.doc.createElement("path");
  const className = path.getAttribute("class") || "";
  node.setAttribute("class", getClass(className, parent.rules, i));
  node.setAttribute("fill", getHex(className));
  node.setAttribute("d", path.getAttribute("d"));
  parent.appendChild(node);
  return parent;
};

const prepareFile = async (files, option) => {
  const file = files.pop();
  if (!file) return;

  const doc = await parseFile(file);
  const svg = doc.createElement("svg");
  const base = titleCase(option.weight) + "-S";
  const icon = doc.querySelector("#" + base);

  if (icon) {
    console.log(file.name);
    const viewBox = file.name.includes("joystick.tilt")
      ? "-3.5 -95.5 120 120"
      : calcViewBox(icon.getBBox(), getWidth(doc, base), option);
    setRootArgs(svg, viewBox);
    svg.doc = doc;
    svg.rules = parse(
      (doc.querySelector("style") || { innerHTML: "" }).innerHTML
    ).stylesheet.rules;
    icon.children.reduce(addPath, svg);
    await writeFile(join(option.outFolder, file.name), beautify(svg.outerHTML));
  }

  return prepareFile(files, option);
};

const prepare = (option) => convertFiles(prepareFile, option);

const listNames = async (option) => {
  console.log("Collect svg info");
  const name = new Set();
  const multicolor = new Set();
  const hierarchical = new Set();
  const id = "#" + titleCase(option.weight) + "-S";
  const svgs = await getSvgs(option.inFolder);
  const docs = await Promise.all(svgs.map(parseFile));
  docs.forEach((doc) => {
    const icon = doc.querySelector(id);
    icon.children.forEach((node) => {
      const h = getHierarchy(node.className);
      const c = getColor(node.className);
      if (h) {
        hierarchical.add(h);
      }
      if (c) {
        const hex = getHex(node.className);
        multicolor.add(`${c} ${hex}`);
      }
      name.add(node.className);
    });
  });
  const result = {
    hierarchical: Array.from(hierarchical).sort(),
    multicolor: Array.from(multicolor).sort(),
    raw: Array.from(name),
  };
  console.log(JSON.stringify(result, null, 2));
};

const main = (inFolder, option) => {
  const fn = option.list ? listNames : prepare;
  option.inFolder = inFolder;
  option.outFolder = option.out;
  fn(option).catch(console.error);
};

program
  .version("1.0.0", "-v, --version")
  .description("Prepare SF Symbols for HA Custom Symbols")
  .argument("<folder>", "Path to folder with exported svg files")
  .option("-l, --list", "List all used css classes", false)
  .option("-w, --weight <ultralight|regular|black>", "Symbol weight", "regular")
  .option("-h, --height", "Line height of SF-Symbol", 90)
  .option("-s, --size", "Symbol size", 108)
  .option("-o, --out", "Folder for prepared svg", "./result")
  .action(main)
  .parse();
