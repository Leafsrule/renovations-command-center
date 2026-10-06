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

const errors = [];
const webServices =
  blueprint.services?.filter((service) => service?.type === "web") ?? [];
const service = webServices[0];
const firebaseEnvVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID"
];

if (webServices.length !== 1) {
  errors.push("render.yaml must define exactly one web service.");
}

for (const [field, expected] of [
  ["runtime", "node"],
  ["plan", "starter"],
  ["branch", "main"],
  ["buildCommand", "npm ci && npm run build"],
  ["startCommand", "npm run start -- -H 0.0.0.0 -p $PORT"],
  ["healthCheckPath", "/api/health"]
]) {
  if (service?.[field] !== expected) {
    errors.push(`render.yaml ${field} must be ${expected}.`);
  }
}

const envVars = new Map(
  service?.envVars?.map((envVar) => [envVar.key, envVar]) ?? []
);

if (envVars.get("NODE_VERSION")?.value !== "22") {
  errors.push("render.yaml must pin NODE_VERSION to 22.");
}

for (const name of firebaseEnvVars) {
  if (envVars.get(name)?.sync !== false) {
    errors.push(`render.yaml must define ${name} with sync: false.`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Render Blueprint passed JSON Schema validation.");
