import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { firebaseEnvironmentProblems } from "../lib/firebase-config.ts";

function readJsonFile(path) {
  try {return JSON.parse(readFileSync(path,"utf8"));} catch {throw new Error("Configuration file could not be read as JSON. No environment was written.");}
}

export function environmentFromWebConfig(config) {
  const fields = {apiKey:"API_KEY",authDomain:"AUTH_DOMAIN",projectId:"PROJECT_ID",storageBucket:"STORAGE_BUCKET",messagingSenderId:"MESSAGING_SENDER_ID",appId:"APP_ID"};
  const env = {};
  for (const [field, suffix] of Object.entries(fields)) {
    const value = config?.[field];
    if (typeof value !== "string" || !value.trim() || /[\r\n\x00]/.test(value)) throw new Error(`Invalid Firebase web field: ${field}`);
    env[`NEXT_PUBLIC_FIREBASE_${suffix}`] = value.trim();
  }
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(config.projectId) || config.projectId.startsWith("demo-")) throw new Error("Use the verified existing live Firebase project ID.");
  if (!/^[a-zA-Z0-9.-]+$/.test(config.authDomain) || !/^[a-zA-Z0-9._-]+$/.test(config.storageBucket)) throw new Error("Use the Firebase SDK hostname and bucket name without a URL scheme.");
  env.FIREBASE_ADMIN_PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  env.FIREBASE_ADMIN_STORAGE_BUCKET = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return env;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = process.argv[2];
    if (!input) throw new Error("Usage: npm run firebase:configure -- /path/to/web-config.json [existing-credential-file]");
    const env = environmentFromWebConfig(readJsonFile(input));
    if (process.argv[3]) {
      const path = realpathSync(process.argv[3]);
      const repo = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
      if (!relative(repo, path).startsWith("..")) throw new Error("Keep admin credential files outside this repository.");
      const credential = readJsonFile(path);
      if (credential.type === "service_account" && credential.project_id !== env.FIREBASE_ADMIN_PROJECT_ID) throw new Error("Credential belongs to a different Firebase project.");
      env.GOOGLE_APPLICATION_CREDENTIALS = path;
    }
    const problems = firebaseEnvironmentProblems(env, false);
    if (problems.length) throw new Error(problems.join("\n"));
    const target = fileURLToPath(new URL("../.env.local", import.meta.url));
    writeFileSync(target, Object.entries(env).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join("\n")+"\n", {flag:"wx",mode:0o600});
    console.log("Local Firebase environment written. Existing files are never overwritten. Run firebase:check; live access is not yet verified.");
  } catch (error) {
    console.error(error.code === "EEXIST" ? "An environment already exists. Preserve it and review changes manually." : error.message);
    process.exitCode = 1;
  }
}
