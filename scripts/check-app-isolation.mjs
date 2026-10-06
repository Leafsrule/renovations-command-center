import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const core = "apps/renovations-command-center";
assert(existsSync(`${core}/package-lock.json`));
assert(!existsSync("package.json"), "The repository root must not own app dependencies");
const tracker = "docs/site-control";
for (const file of ["index.html", "data.json"]) {
 const current = readFileSync(`${tracker}/${file}`);
 const original = execFileSync("git", ["show", `37a83fb:${tracker}/${file}`], {maxBuffer: 16*1024*1024});
 assert(current.equals(original), `Site Control ${file} changed during isolation`);
}
const html = readFileSync(`${tracker}/index.html`, "utf8");
assert(html.includes("fetch('./data.json'"));
assert(html.includes("path:'docs/site-control/data.json'"));
JSON.parse(readFileSync(`${tracker}/data.json`, "utf8"));
function inspect(dir) {
 for (const file of readdirSync(dir, {withFileTypes: true})) {
  if (["node_modules", ".next", ".git"].includes(file.name)) continue;
  const path = `${dir}/${file.name}`;
  if (file.isDirectory()) inspect(path);
  else if (/\.(ts|tsx|mjs)$/.test(file.name)) {
   const text = readFileSync(path, "utf8");
   assert(!/site-control|docs\/site-control/.test(text), `Cross-app runtime reference: ${path}`);
  }
 }
}
inspect(`${core}/app`); inspect(`${core}/components`); inspect(`${core}/lib`);
console.log("PASS: independent app root, unchanged tracker data/entry point, no core runtime references to tracker");
