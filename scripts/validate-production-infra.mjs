import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import YAML from "yaml";

const requiredFiles = [
  "app/api/health/route.ts",
  "firebase.json",
  "firestore.rules",
  "render.yaml",
  "storage.rules"
];

const requiredFirebaseEnvVars = [
  "FIREBASE_SERVICE_ACCOUNT",
  "FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID"
];

const errors = [];

const firebasePublicEnvVars = requiredFirebaseEnvVars.filter(
  (name) => name.startsWith("NEXT_PUBLIC_FIREBASE_")
);

function readText(file) {
  return readFileSync(file, "utf8");
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    errors.push(`${file} must be valid JSON: ${error.message}`);
    return null;
  }
}

function getTrackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    errors.push(`Missing required production infrastructure file: ${file}`);
  }
}

if (existsSync("apphosting.yaml")) {
  errors.push("apphosting.yaml must not exist; Render is the sole production web host.");
}

if (existsSync("firebase.json")) {
  const firebaseConfig = readJson("firebase.json");

  if (firebaseConfig?.firestore?.rules !== "firestore.rules") {
    errors.push("firebase.json must deploy firestore.rules.");
  }

  if (firebaseConfig?.storage?.rules !== "storage.rules") {
    errors.push("firebase.json must deploy storage.rules.");
  }

  if (firebaseConfig?.hosting) {
    errors.push("firebase.json must not define Firebase Hosting; Firebase is backend-only.");
  }
}

for (const [file, expectedDenyRule] of [
  ["firestore.rules", "allow read, write: if false;"],
  ["storage.rules", "allow read, write: if false;"]
]) {
  if (existsSync(file)) {
    const rules = readText(file);
    if (!rules.includes(expectedDenyRule)) {
      errors.push(`${file} must keep a final deny-all fallback rule.`);
    }
  }
}

if (existsSync("firestore.rules")) {
  const firestoreRules = readText("firestore.rules");

  for (const pattern of [
    "request.auth != null",
    "ownerUserId == request.auth.uid",
    "match /projects/{projectId}",
    "match /rooms/{roomId}",
    "match /people/{personId}",
    "match /tasks/{taskId}"
  ]) {
    if (!firestoreRules.includes(pattern)) {
      errors.push(`firestore.rules must include owner-scoped project access pattern: ${pattern}`);
    }
  }
}

if (existsSync("storage.rules")) {
  const storageRules = readText("storage.rules");

  for (const pattern of [
    "request.auth != null",
    "firestore.get(",
    "ownerUserId == request.auth.uid",
    "match /projects/{projectId}/{allPaths=**}"
  ]) {
    if (!storageRules.includes(pattern)) {
      errors.push(`storage.rules must include owner-scoped file access pattern: ${pattern}`);
    }
  }
}

if (existsSync("render.yaml")) {
  const renderConfig = readText("render.yaml");
  let renderBlueprint = null;

  try {
    renderBlueprint = YAML.parse(renderConfig);
  } catch (error) {
    errors.push(`render.yaml must be valid YAML: ${error.message}`);
  }

  const webServices =
    renderBlueprint?.services?.filter((service) => service?.type === "web") ?? [];
  const renderService = webServices[0];

  if (webServices.length !== 1) {
    errors.push("render.yaml must define exactly one web service.");
  }

  if (renderService?.plan !== "starter") {
    errors.push("render.yaml must use the approved Starter plan.");
  }

  if (renderService?.runtime !== "node") {
    errors.push("render.yaml must use the Node runtime.");
  }

  if (renderService?.branch !== "main") {
    errors.push("render.yaml must use main as the production branch.");
  }

  if (renderService?.healthCheckPath !== "/api/health") {
    errors.push("render.yaml healthCheckPath must be /api/health.");
  }

  const renderEnvVars = new Map(
    renderService?.envVars?.map((envVar) => [envVar.key, envVar]) ?? []
  );

  if (renderEnvVars.get("NODE_VERSION")?.value !== "22") {
    errors.push("render.yaml must pin NODE_VERSION to 22.");
  }

  for (const pattern of [
    "type: web",
    "runtime: node",
    "plan: starter",
    "branch: main",
    "key: NODE_VERSION",
    'value: "22"',
    "buildCommand: npm ci && npm run build",
    "startCommand: npm run start -- -H 0.0.0.0 -p $PORT",
    "healthCheckPath: /api/health"
  ]) {
    if (!renderConfig.includes(pattern)) {
      errors.push(`render.yaml must include production web service setting: ${pattern}`);
    }
  }

  for (const name of firebasePublicEnvVars) {
    const envVarPattern = new RegExp(`key:\\s*${name}\\s*\\n\\s*sync:\\s*false`, "m");
    if (!envVarPattern.test(renderConfig)) {
      errors.push(`render.yaml must define ${name} with sync: false.`);
    }
  }

  if (renderConfig.includes("FIREBASE_SERVICE_ACCOUNT")) {
    errors.push("FIREBASE_SERVICE_ACCOUNT must not be configured for the Render web service.");
  }
}

if (existsSync("app/api/health/route.ts")) {
  const healthRoute = readText("app/api/health/route.ts");

  for (const forbiddenPattern of [
    "process.env",
    "auth",
    "db",
    "storage",
    "firebase",
    "projectId"
  ]) {
    if (healthRoute.includes(forbiddenPattern)) {
      errors.push(`Health route must not expose or query ${forbiddenPattern}.`);
    }
  }

  if (!healthRoute.includes("{ ok: true }")) {
    errors.push("Health route must return a minimal ok JSON payload.");
  }
}

const trackedFiles = getTrackedFiles();
const documentationFiles = trackedFiles.filter(
  (file) =>
    file === "README.md" ||
    file === "AGENT_BUILD_PROMPT.md" ||
    file.startsWith("docs/")
);

for (const file of documentationFiles) {
  const contents = readText(file);
  for (const forbiddenPhrase of [
    "Firebase App Hosting",
    "App Hosting",
    "apphosting.yaml"
  ]) {
    if (contents.includes(forbiddenPhrase)) {
      errors.push(`${file} must not describe Firebase App Hosting as a production target.`);
    }
  }
}

const firebaseConfig = existsSync("firebase.json") ? readJson("firebase.json") : null;
const activeWebHosts = [
  existsSync("render.yaml") ? "Render" : null,
  existsSync("apphosting.yaml") ? "Firebase App Hosting" : null,
  firebaseConfig?.hosting ? "Firebase Hosting" : null
].filter(Boolean);

if (activeWebHosts.length !== 1 || activeWebHosts[0] !== "Render") {
  errors.push(
    `Exactly one active web host is allowed, and it must be Render. Found: ${activeWebHosts.join(", ") || "none"}`
  );
}

const secretValuePatterns = [
  [/AIza[0-9A-Za-z_-]{20,}/, "Google API key"],
  [new RegExp("-----BEGIN " + "PRIVATE KEY-----"), "private key"]
];

for (const name of ["FIREBASE_SERVICE_ACCOUNT", "NEXT_PUBLIC_FIREBASE_API_KEY"]) {
  const value = process.env[name]?.trim();
  if (value) {
    secretValuePatterns.push([
      new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${name} value`
    ]);
  }
}

for (const file of trackedFiles) {
  if (!existsSync(file)) {
    continue;
  }

  const contents = readText(file);
  for (const [pattern, label] of secretValuePatterns) {
    if (pattern.test(contents)) {
      errors.push(`Tracked file ${file} appears to contain a ${label}.`);
    }
  }
}

if (process.env.CHECK_PRODUCTION_ENV === "true") {
  const missingEnvVars = requiredFirebaseEnvVars.filter(
    (name) => !process.env[name]?.trim()
  );

  if (missingEnvVars.length > 0) {
    errors.push(
      `Missing Firebase production environment variables: ${missingEnvVars.join(", ")}`
    );
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Production infrastructure configuration passed validation.");
