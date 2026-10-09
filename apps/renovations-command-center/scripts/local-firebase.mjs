import { spawn } from "node:child_process";
const project="demo-renovations-racp";
const env={...process.env,
  RCC_PHOTO_PROVIDER:"firebase",
  NEXT_PUBLIC_FIREBASE_USE_EMULATORS:"true",
  NEXT_PUBLIC_FIREBASE_API_KEY:"demo-local-only",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:`${project}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID:project,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:`${project}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:"123456789",
  NEXT_PUBLIC_FIREBASE_APP_ID:"1:123456789:web:local-demo",
  FIREBASE_ADMIN_PROJECT_ID:project,
  FIREBASE_ADMIN_STORAGE_BUCKET:`${project}.appspot.com`,
};
// No credentials, data exports, paid resources, public listener or live project.
delete env.GOOGLE_APPLICATION_CREDENTIALS;
delete env.FIREBASE_TOKEN;
const verify=process.argv.includes("--verify");
const cli=process.env.RCC_FIREBASE_CLI_VERSION || "15";
if (!["14","15"].includes(cli)) throw new Error("Use supported Firebase CLI14 (Java17) or CLI15 (Java21).");
const child=spawn("npx",["--yes",`firebase-tools@${cli}`,"emulators:exec","--project",project,"--only","auth,firestore,storage",verify?"node --import tsx scripts/emulator-http-smoke.mjs":"npm run dev -- --hostname 127.0.0.1 --port 3000"],{env,stdio:"inherit"});
for (const signal of ["SIGINT","SIGTERM"]) process.on(signal,()=>child.kill(signal));
child.on("exit",code=>{process.exitCode=code ?? 1;});
