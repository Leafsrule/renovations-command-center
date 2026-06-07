import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import { getApps, initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import { getAuth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const missingFirebaseEnvVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp
  ? getFirestore(firebaseApp)
  : null;
export const storage: FirebaseStorage | null = firebaseApp
  ? getStorage(firebaseApp)
  : null;
