import { createServer } from "http";
import { pathToFileURL } from "url";
import { basename } from "path";
import { readdir, readFile } from "fs/promises";
import { program } from "commander";

const getIconList = async (url) =>
  (await readdir(url))
    .filter((name) => name.endsWith(".svg"))
    .map((name) => name.slice(0, -4));

const route = async (url, base) => {
  if (url === "/custom_symbols/list/cs") {
    return JSON.stringify(await getIconList(base), null, 2);
  }

  const file = url.startsWith("/custom_symbols/icon/cs")
    ? new URL(basename(url), base)
    : url === "/main.js"
    ? new URL("root/main.js", import.meta.url)
    : new URL("root/index.html", import.meta.url);

  return readFile(file, "utf-8");
};

const main = (svgfolder, option) => {
  const base = pathToFileURL(svgfolder);

  createServer((req, res) => {
    route(req.url, base)
      .then((text) => {
        res.write(text);
        res.end();
      })
      .catch((error) => {
        console.error(error);
        res.statusCode = 404;
        res.end();
      });
  }).listen(parseInt(option.port, 10), () =>
    console.log(`Open in your web browser
monochrome       http://localhost:${option.port}
monochrome   0%  http://localhost:${option.port}#0
hierachical      http://localhost:${option.port}#h
hierachical 40%  http://localhost:${option.port}#h40
palette          http://localhost:${option.port}#p
multicolor       http://localhost:${option.port}#m
multicolor  40%  http://localhost:${option.port}#m40`)
  );
};

program
  .version("1.0.0", "-v, --version")
  .description("Start a local server to test symbols in a browser")
  .argument("[svgfolder]", "Path to folder with svg files", "result/")
  .option("-p, --port <number>", "Port for http server", 3000)
  .action(main)
  .parse();
