# System of Record

## Authority

GitHub is the authoritative source for code, infrastructure, tests, documentation, and recovery history for `Leafsrule/renovations-command-center`.

- `main` is the released baseline branch.
- `infra/remote-first-production` is the current production-infrastructure candidate branch.
- The current GitHub Codespace named `musical fishstick` is a replaceable development environment, not a system of record.
- Codex task history, chat text, terminal scrollback, and local shell history are not authoritative sources.

## Canonical Platform Map

- Web host: Render only.
- Render workspace expectation: personal Hobby workspace.
- Render service expectation: Node web service from `render.yaml`, production branch `main`, Starter plan, approximately $7 USD/month before taxes or account-specific charges.
- Backend services: Firebase Authentication, Cloud Firestore, Firebase Storage.
- Backend rules: `firestore.rules` and `storage.rules`, mapped by `firebase.json`.
- Automation: GitHub Actions validates pull requests and provides manual-only Firebase rules-deployment automation after required secrets and Firebase permissions are verified.

Firebase is backend-only. It is not an approved production web-hosting target for this repository.

No Render resource or paid Render plan is known to exist unless independently verified in Render. Repository files describe desired infrastructure; they do not prove provider-side resources exist.

## Recovery Branches

- `rescue/task-execution-integrity`: read-only recovery reference for task execution integrity work.
- `rescue/post-merge-todayplanner-action-error`: read-only recovery reference for Today Planner action error recovery.

Do not rebase, merge, delete, retarget, or force-push either rescue branch during infrastructure work.

## Cloud-Backed Data

The following application data is cloud-backed in Firebase:

- Firebase Authentication user accounts.
- Firestore `projects` documents owned by `ownerUserId`.
- Firestore project subcollections for rooms, people, and tasks.
- Firebase Storage objects under project-scoped paths.

Security rules must remain owner-scoped and must retain deny-all fallbacks.

Firebase rules deployment remains manual-only until all of these are complete:

1. Required GitHub Actions secrets are verified.
2. The Firebase deploy identity and least-privilege permissions are verified.
3. Deployed Firestore rules are compared with `firestore.rules`.
4. Deployed Storage rules are compared with `storage.rules`.
5. One successful manually triggered deployment and rollback check has completed.

Render release-candidate testing occurs before merge. Prefer Render pull-request previews when available. If unavailable, use one temporary release-candidate service pointed at `infra/remote-first-production`, then delete it after final production verification. Permanent production deploys from `main`.

## Browser-Local State

The Today Planner currently stores these settings in browser local storage:

- `today-available-hours`
- `today-buffer-percent`
- `today-helper-available`

Classification:

- `today-buffer-percent` is a harmless device-specific preference.
- `today-available-hours` and `today-helper-available` are operational planning settings that should follow the signed-in user and active project.

Follow-up item, not part of this reconciliation commit:

- Move operational Today Planner settings to authenticated Firebase storage at an owner-scoped location such as `projects/{projectId}/userPreferences/{uid}/todayPlanner`.
- Required tests: preference read/write authorization, owner isolation, fallback to browser-local defaults during migration, and preservation of existing Today Planner calculations.

## Secret And Environment Inventory

Names only. Do not write values in repository files, docs, chat, commits, or issue comments.

| Name | Code reference | Current Codespace env observed | Future Render env entry | Future GitHub Actions secret | Firebase deployment credential | Transient credential |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `lib/firebase.ts` | Present during reconciliation | Required, `sync: false` | Required for deploy validation | No | Codespace env |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `lib/firebase.ts` | Present during reconciliation | Required, `sync: false` | Required for deploy validation | No | Codespace env |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `lib/firebase.ts` | Present during reconciliation | Required, `sync: false` | Required for deploy validation | No | Codespace env |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `lib/firebase.ts` | Present during reconciliation | Required, `sync: false` | Required for deploy validation | No | Codespace env |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `lib/firebase.ts` | Present during reconciliation | Required, `sync: false` | Required for deploy validation | No | Codespace env |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `lib/firebase.ts` | Present during reconciliation | Required, `sync: false` | Required for deploy validation | No | Codespace env |
| `FIREBASE_PROJECT_ID` | Firebase rules workflow and deploy docs | Not observed during reconciliation | Not required for web app | Required | Yes, project selector only | None |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase rules workflow | Not observed during reconciliation | Not allowed for web app | Required | Yes, rules deploy identity | None |

The presence of a name in repository files does not prove the corresponding GitHub Actions secret or Render environment value exists. Verify provider-side entries before enabling deployment workflows.

## Approved Secret Storage Locations

- Render dashboard environment variables: Firebase browser configuration values required by the Next.js client.
- GitHub Actions repository secrets: Firebase rules-deployment values and deploy identity.
- GitHub Codespaces secrets or environment: development-only Firebase browser configuration values.

Do not store Firebase service account JSON in Render, source files, `.env` files, docs, or chat.

## Transient Credentials

These credentials may exist locally but are not authoritative and must not be committed:

- GitHub Codespaces token and GitHub runtime tokens.
- Render CLI token under the local user home directory.
- Firebase CLI or Google Application Default Credentials, if a developer explicitly authenticates.
- Firebase browser configuration values injected into the current Codespace environment.

## Recovery Order

If a device or Codespace fails:

1. Start from GitHub repository state.
2. Check out `main` for released baseline or `infra/remote-first-production` for the current infrastructure candidate.
3. Rebuild dependencies with `npm ci`.
4. Run the validation gate documented in `README.md`.
5. Recreate Codespaces secrets from the approved external secret manager or provider UI; never recover them from chat or logs.
6. Reauthorize Render or Firebase CLIs only when external authorization is explicitly resumed.
7. Use rescue branches only as read-only references if their specific recovery context is needed.
