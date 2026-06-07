# Firestore Rules Activation Guide

## Current Status

The Room / Area Manager depends on the Firestore rules in:

`C:\Users\ghajj\OneDrive\Documents\Renovations App\firestore.rules`

Firebase CLI deployment is not currently available from this workspace because:

- `firebase` is not installed or not on PATH.
- `firebase.json` is not present.
- `.firebaserc` is not present.

Do not loosen the rules to public read/write. The current rules keep project and room access owner-scoped.

## Two-Minute Firebase Console Checklist

1. Open the Firebase Console and select the existing Renovations Command Center Firebase project.
2. Go to **Firestore Database**.
3. Open the **Rules** tab.
4. Replace the editor contents with the contents of `firestore.rules` from this local project.
5. Review that the final fallback rule remains:

   ```js
   match /{document=**} {
     allow read, write: if false;
   }
   ```

6. Click **Publish**.
7. Return to the app and run the Room / Area Manager smoke test.

## Expected Rule Behavior

- Signed-in users can create projects only for their own `ownerUserId`.
- Signed-in project owners can read, update, and delete only their own projects.
- Signed-in project owners can create, read, update, and delete rooms only under their own projects.
- All other Firestore reads and writes are denied.
