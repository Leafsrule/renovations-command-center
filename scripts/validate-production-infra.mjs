import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "apphosting.yaml",
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

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    errors.push(`Missing required production infrastructure file: ${file}`);
  }
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
    errors.push("firebase.json must not define Firebase Hosting for this remote-first sprint.");
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

if (existsSync("apphosting.yaml")) {
  const appHostingConfig = readText("apphosting.yaml");
  const forbiddenCommittedConfig = [
    "FIREBASE_SERVICE_ACCOUNT",
    ...firebasePublicEnvVars
  ];

  if (!appHostingConfig.includes("runConfig:")) {
    errors.push("apphosting.yaml must include runConfig for production runtime sizing.");
  }

  for (const name of forbiddenCommittedConfig) {
    if (appHostingConfig.includes(name)) {
      errors.push(`${name} must not be committed in apphosting.yaml.`);
    }
  }
}

if (existsSync("render.yaml")) {
  const renderConfig = readText("render.yaml");

  for (const pattern of [
    "type: web",
    "runtime: node",
    "buildCommand: npm ci && npm run build",
    "startCommand: npm run start -- -H 0.0.0.0 -p $PORT",
    "healthCheckPath: /projects"
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
