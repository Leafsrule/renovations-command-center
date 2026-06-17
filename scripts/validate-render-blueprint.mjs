import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import YAML from "yaml";

const schemaUrl = "https://render.com/schema/render.yaml.json";
const response = await fetch(schemaUrl);

if (!response.ok) {
  throw new Error(`Unable to fetch Render Blueprint schema: ${response.status}`);
}

const schema = await response.json();
const blueprint = YAML.parse(readFileSync("render.yaml", "utf8"));
const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false
});
const validate = ajv.compile(schema);

if (!validate(blueprint)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

console.log("Render Blueprint passed JSON Schema validation.");
