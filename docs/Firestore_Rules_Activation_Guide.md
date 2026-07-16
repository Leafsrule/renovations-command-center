# Firestore Rules Activation Guide

## Current Status

The Room / Area Manager, People / Team Manager, and Task Manager depend on the Firestore rules in:

`firestore.rules`

Photo and file access depends on the Storage rules in:

`storage.rules`

Do not loosen these rules to public read/write. The current rules keep project, room, person, task, and file access owner-scoped.

## Remote Deployment

`firebase.json` maps both rule files for Firebase CLI deployment. The remote-first path is the manually triggered `Firebase Rules Deploy` GitHub Actions workflow, but that workflow must remain inactive until its required GitHub Actions secrets and Firebase permissions are verified:

1. Add the required GitHub Actions secrets from `docs/CODESPACES_DEVELOPMENT.md`.
2. Merge rule changes to `main`, or run the workflow manually from the Actions tab.
3. Confirm the workflow validates production infrastructure and deploys `firestore.rules` plus `storage.rules`.
4. Do not run the workflow until the deploy identity is confirmed to have only the permissions needed to deploy Firestore and Storage rules.

Automatic rules deployment may be considered only after all of these have occurred:

1. Required GitHub Actions secrets are verified.
2. The Firebase deploy identity and least-privilege permissions are verified.
3. Deployed Firestore rules are compared with `firestore.rules`.
4. Deployed Storage rules are compared with `storage.rules`.
5. One successful manually triggered deployment and rollback check has completed.

For an emergency manual deploy from Codespaces, authenticate with Firebase or Google Cloud credentials that are allowed to deploy rules, then run:

```bash
npx --yes firebase-tools@latest deploy --only firestore:rules,storage --project "$FIREBASE_PROJECT_ID" --non-interactive
```

## Two-Minute Firebase Console Checklist

Use this only if the GitHub Actions workflow is unavailable.

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
7. Go to **Storage**.
8. Open the **Rules** tab.
9. Replace the editor contents with the contents of `storage.rules` from this local project.
10. Click **Publish**.
11. Return to the app and run the Room / Area Manager, People / Team Manager, Task Manager, or photo/file smoke test.

## Expected Rule Behavior

- Signed-in users can create projects only for their own `ownerUserId`.
- Signed-in project owners can read, update, and delete only their own projects.
- Signed-in project owners can create, read, update, and delete rooms only under their own projects.
- Signed-in project owners can create, read, update, and delete people only under their own projects.
- Signed-in project owners can create, read, update, and delete tasks only under their own projects.
- Signed-in project owners can read and write files only under their own project storage path.
- All other Firestore reads and writes are denied.
- All other Storage reads and writes are denied.
