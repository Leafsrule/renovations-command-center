import { readFileSync } from "node:fs";

const firebaseConfig = JSON.parse(readFileSync("firebase.json", "utf8"));
const firestoreRules = readFileSync("firestore.rules", "utf8");
const storageRules = readFileSync("storage.rules", "utf8");
const errors = [];

if (firebaseConfig.firestore?.rules !== "firestore.rules") {
  errors.push("firebase.json must point Firestore rules to firestore.rules.");
}

if (firebaseConfig.storage?.rules !== "storage.rules") {
  errors.push("firebase.json must point Storage rules to storage.rules.");
}

if (firebaseConfig.hosting) {
  errors.push("firebase.json must not configure Firebase Hosting for this sprint.");
}

for (const [file, rules, requiredPatterns] of [
  [
    "firestore.rules",
    firestoreRules,
    [
      "rules_version = '2';",
      "service cloud.firestore",
      "request.auth != null",
      "ownerUserId == request.auth.uid",
      "match /{document=**}",
      "allow read, write: if false;"
    ]
  ],
  [
    "storage.rules",
    storageRules,
    [
      "rules_version = '2';",
      "service firebase.storage",
      "request.auth != null",
      "firestore.get(",
      "ownerUserId == request.auth.uid",
      "match /{allPaths=**}",
      "allow read, write: if false;"
    ]
  ]
]) {
  for (const pattern of requiredPatterns) {
    if (!rules.includes(pattern)) {
      errors.push(`${file} must include required rules pattern: ${pattern}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Firebase configuration and rules passed validation.");
