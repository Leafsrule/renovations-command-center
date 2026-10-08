/** Shared validation only; credentials never enter this module or the browser. */
export function firebaseEnvironmentProblems(env: Record<string, string | undefined>, production: boolean) {
  const problems: string[] = [];
  const required = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_APP_ID", "FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_STORAGE_BUCKET"];
  for (const name of required) if (!env[name]?.trim()) problems.push(`Missing ${name}`);
  if (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && env.FIREBASE_ADMIN_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== env.FIREBASE_ADMIN_PROJECT_ID) problems.push("Browser and server Firebase projects must match.");
  if (env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET && env.FIREBASE_ADMIN_STORAGE_BUCKET && env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET !== env.FIREBASE_ADMIN_STORAGE_BUCKET) problems.push("Browser and server Storage buckets must match.");
  const emulator = env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";
  if (production && (emulator || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST)) problems.push("Production cannot use emulator configuration.");
  if (emulator && (!env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith("demo-") || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== env.FIREBASE_ADMIN_PROJECT_ID)) problems.push("Local emulators require the same demo- project on browser and server.");
  if (!emulator && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith("demo-")) problems.push("Demo projects require explicit local emulator mode.");
  return problems;
}
