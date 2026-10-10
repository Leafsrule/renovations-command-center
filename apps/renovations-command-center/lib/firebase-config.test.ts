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
  expect(firebaseEnvironmentProblems(env,false)).toEqual([]);
  expect(firebaseEnvironmentProblems({...env,FIREBASE_ADMIN_PROJECT_ID:"unrelated"},true)).toContain("Browser and server Firebase projects must match.");
  expect(firebaseEnvironmentProblems({...env,FIREBASE_ADMIN_STORAGE_BUCKET:"unrelated"},true)).toContain("Browser and server Storage buckets must match.");
});
it("fails closed for missing configuration and production emulators",()=>{
  expect(firebaseEnvironmentProblems({},true)).toHaveLength(9);
  expect(firebaseEnvironmentProblems({...env,FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080"},true)).toContain("Production cannot use emulator configuration.");
  expect(firebaseEnvironmentProblems({...env,NEXT_PUBLIC_FIREBASE_USE_EMULATORS:"true"},false)).toContain("Local emulators require the same demo- project on browser and server.");
});

it("requires free production storage and validates private server configuration",()=>{
  expect(firebaseEnvironmentProblems(env,true)).toContain("Production requires the free private photo provider; Firebase Storage billing is prohibited.");
  const free={...env,RCC_PHOTO_PROVIDER:"supabase",SUPABASE_URL:"https://example.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"server-only-test",SUPABASE_PHOTO_BUCKET:"private-photos",NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:undefined,FIREBASE_ADMIN_STORAGE_BUCKET:undefined};
  expect(firebaseEnvironmentProblems(free,true)).toEqual([]);
  expect(firebaseEnvironmentProblems({...free,SUPABASE_URL:"https://attacker.test"},true)).toContain("Use the canonical HTTPS Supabase project URL.");
  expect(firebaseEnvironmentProblems({...free,SUPABASE_SERVICE_ROLE_KEY:undefined},true)).toContain("Missing SUPABASE_SERVICE_ROLE_KEY");
});
