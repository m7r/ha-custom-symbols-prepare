import { writeFile } from "fs/promises";
import { basename, join } from "path";
import fetch from "node-fetch";

const download = async (url) => {
  const response = await fetch(url);
  const text = await response.text();
  const target = new URL(join("root", basename(url)), import.meta.url);
  return writeFile(target, text);
};

download(
  "https://raw.githubusercontent.com/m7r/ha-custom-symbols/master/custom_components/custom_symbols/main.js"
).catch(console.error);
