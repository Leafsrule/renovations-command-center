import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import { getApps, initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { connectFirestoreEmulator, getFirestore,initializeFirestore,persistentLocalCache,persistentMultipleTabManager } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const missingFirebaseEnvVars = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== "storageBucket" && !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;
const existingApp = getApps().find(app=>app.name === "[DEFAULT]");
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";
if (useEmulators && (process.env.NODE_ENV === "production" || !firebaseConfig.projectId?.startsWith("demo-"))) throw new Error("Emulators require a local development demo project.");

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? existingApp
    ? existingApp
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp
  ? typeof window === "undefined" || existingApp ? getFirestore(firebaseApp) : initializeFirestore(firebaseApp, {localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})
  : null;
export const storage: FirebaseStorage | null = firebaseApp
  ? getStorage(firebaseApp)
  : null;
if (useEmulators && typeof window !== "undefined" && !existingApp && auth && db && storage) {
  if (!["127.0.0.1","localhost","[::1]"].includes(window.location.hostname)) throw new Error("Local emulators cannot be used on a hosted app.");
  connectAuthEmulator(auth,"http://127.0.0.1:9099");
  connectFirestoreEmulator(db,"127.0.0.1",8080);
  connectStorageEmulator(storage,"127.0.0.1",9199);
}
