import { expect, it } from "vitest";
import { firebaseEnvironmentProblems } from "./firebase-config";
const env = {
  NEXT_PUBLIC_FIREBASE_API_KEY:"test-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:"renovations-test.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID:"renovations-test",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:"renovations-test.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:"123",
  NEXT_PUBLIC_FIREBASE_APP_ID:"1:123:web:test",
  FIREBASE_ADMIN_PROJECT_ID:"renovations-test",
  FIREBASE_ADMIN_STORAGE_BUCKET:"renovations-test.firebasestorage.app",
};
it("rejects browser/server project or bucket mismatches",()=>{
  expect(firebaseEnvironmentProblems(env,true)).toEqual([]);
  expect(firebaseEnvironmentProblems({...env,FIREBASE_ADMIN_PROJECT_ID:"unrelated"},true)).toContain("Browser and server Firebase projects must match.");
  expect(firebaseEnvironmentProblems({...env,FIREBASE_ADMIN_STORAGE_BUCKET:"unrelated"},true)).toContain("Browser and server Storage buckets must match.");
});
it("fails closed for missing configuration and production emulators",()=>{
  expect(firebaseEnvironmentProblems({},true)).toHaveLength(8);
  expect(firebaseEnvironmentProblems({...env,FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080"},true)).toContain("Production cannot use emulator configuration.");
  expect(firebaseEnvironmentProblems({...env,NEXT_PUBLIC_FIREBASE_USE_EMULATORS:"true"},false)).toContain("Local emulators require the same demo- project on browser and server.");
});
