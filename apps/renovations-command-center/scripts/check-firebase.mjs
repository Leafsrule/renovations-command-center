import nextEnv from "@next/env";
import { firebaseEnvironmentProblems } from "../lib/firebase-config.ts";
import { initializeApp, applicationDefault, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { StorageClient } from "@supabase/storage-js";
nextEnv.loadEnvConfig(process.cwd(), true);
const problems = firebaseEnvironmentProblems(process.env, process.argv.includes("--production"));
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else if (!process.argv.includes("--live")) {
  console.log("Project and photo-provider configuration agree. Credential permissions, live rules, auth provider and upload behavior remain unverified. Use --live for read-only Admin connectivity checks.");
} else {
  if (process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true" || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error("Live verification cannot use emulators.");
  const app = initializeApp({projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,storageBucket:process.env.FIREBASE_ADMIN_STORAGE_BUCKET,credential:applicationDefault()});
  try {
    // Never print users, private collection names, tokens or object metadata.
    await getAuth(app).listUsers(1);
    await getFirestore(app).listCollections();
    if (process.env.RCC_PHOTO_PROVIDER === "supabase") {
      const storage = new StorageClient(`${process.env.SUPABASE_URL}/storage/v1`,{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`});
      const {data,error}=await storage.getBucket(process.env.SUPABASE_PHOTO_BUCKET);
      if(error || !data || data.public !== false) throw new Error("Private photo bucket unavailable.");
    } else { throw new Error("Live Firebase Storage is excluded by the no-paid-services requirement."); }
    console.log("Read-only Admin access succeeded for Auth, Firestore and the private photo bucket. This does not prove client rules, deployment, or end-to-end acceptance.");
  } catch {
    console.error("Live Firebase access could not be verified. Check the existing credential, its permissions and the configured project/photo provider.");
    process.exitCode = 1;
  } finally { await deleteApp(app); }
}
