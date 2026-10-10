import "server-only";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { StorageClient } from "@supabase/storage-js";
import { supabasePhotoStore } from "./supabase-photo-store";
import { CommandError } from "../task-command";
import { firebaseEnvironmentProblems } from "../firebase-config";
export function adminServices() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;
  if (firebaseEnvironmentProblems(process.env, process.env.NODE_ENV === "production").length || !projectId)
    throw new CommandError(
      503,
      "Secure backend is not configured. No change was saved.",
    );
  if (
    process.env.NODE_ENV === "production" &&
    (process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIREBASE_STORAGE_EMULATOR_HOST)
  )
    throw new CommandError(
      503,
      "Production cannot use emulator configuration.",
    );
  const app =
    getApps().find((app) => app.name === "renovations-server") ??
    initializeApp(
      { projectId, storageBucket, credential: applicationDefault() },
      "renovations-server",
    );
  const db = getFirestore(app);
  return {
    db,
    auth: getAuth(app),
    bucket: process.env.RCC_PHOTO_PROVIDER === "supabase"
      ? supabasePhotoStore(db, new StorageClient(`${process.env.SUPABASE_URL}/storage/v1`, { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` }), process.env.SUPABASE_PHOTO_BUCKET!)
      : getStorage(app).bucket(),
  };
}
