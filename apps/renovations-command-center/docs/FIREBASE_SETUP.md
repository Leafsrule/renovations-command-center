# Firebase configuration and local verification

**Current infrastructure decision, October 9:** no paid services. Keep this project on Spark; do not enable Blaze or billing. `../../../docs/FREE_SERVICE_PLAN.md` supersedes the former billing prerequisite. The free-storage adapter is implemented in the candidate; see `FREE_PHOTO_SETUP.md` for current deployment settings. The Firebase Storage checks/settings below describe the historical implementation or isolated demo regression path. Do not run its live Storage setup as a release prerequisite or claim that the replacement is already implemented.

Current status (October 9, Toronto): browser console sign-in succeeded and the existing `renovations-command-center` project/web app were verified. Its six public web values and matching Admin project/bucket values were imported into the ignored, mode-0600 `.env.local`; configuration validation and the production build pass. Email/Password is enabled. Firestore `(default)` exists in `nam5`; deployed rules still date from June 9 and do not contain this candidate's trusted-command protections. No live rules or records were changed.

Live runtime remains blocked. The project is on Spark; the Storage console explicitly requires a Blaze billing account, so the SDK bucket name is not proof of a usable provisioned bucket. Scheduled provider backups/PITR also show an upgrade requirement. Server credentials/ADC remain absent and the read-only Admin connectivity check fails. Browser console sign-in does not authenticate the Node server. Do not create keys, expand IAM, enable billing or release rules separately from the validated app without the applicable authorization and release gates. Hosting and remaining implementation/acceptance work remain unresolved.

## Existing live project only

1. Sign in securely to the existing Firebase account and identify the renovation app's project/web app. Do not paste credentials into chat or copy another application's configuration.
2. Retrieve its SDK configuration object as JSON (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId). Verify Email/Password authentication and the actual app host's authorized domain. Do not invent a project ID or bucket name.
3. Provision an already authorized server credential outside the repository, or use the host's existing Application Default Credentials. Browser sign-in does not provision server credentials. No new service account/key or broader IAM access is created by this workflow.
4. From the core app directory, run `npm run firebase:configure -- /path/to/web-config.json /path/outside/repository/to/existing-credential.json`. The credential argument is optional when ADC is supplied by the host. This writes only a new, ignored `.env.local` with restricted file permissions and refuses to overwrite an existing environment. It references the credential file; it does not copy its contents.
5. Run `npm run firebase:check -- --production`, then `npm run firebase:check -- --production --live`. The first validates matching browser/server project and bucket values. The second performs read-only Admin connectivity checks for Auth, Firestore and Storage without printing users, collection names, secrets or private metadata. Success does not verify browser rules, upload/CORS behavior, deployment, or recovery.
6. Configure those same public web values at host build time and the server-only values/ADC at runtime. Rebuild after changing public values. Firebase rules and the server-capable application must be released together after the remaining acceptance/review gates pass. Never publish admin credentials under NEXT_PUBLIC_.

Required server values are FIREBASE_ADMIN_PROJECT_ID and FIREBASE_ADMIN_STORAGE_BUCKET, matching NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET. GOOGLE_APPLICATION_CREDENTIALS is a path to an existing securely provisioned credential, not credential JSON. Missing or mismatched configuration fails closed with an unsaved response.

Provider documentation: https://firebase.google.com/docs/web/setup ; https://firebase.google.com/docs/admin/setup ; https://firebase.google.com/docs/cli/ .

## Local alternative without live access

`npm run dev:firebase` starts Auth/Firestore/Storage emulators and the private development app using the fixed demo-renovations-racp project. No live configuration file is written. The app and emulator listeners use loopback only. Production rejects this emulator mode; hosted browser origins also reject it. Data is disposable and is not exported automatically.

`npm run test:firebase-http` verifies a real demo Auth token through the private Next HTTP routes: atomic project/template creation, idempotent retries, invalid/missing token rejection, a guarded task start, and one immutable receipt. It stops the temporary app and emulators afterward. Current default CLI15 requires Java21; for the existing local Java17 runtime use `RCC_FIREBASE_CLI_VERSION=14 npm run test:firebase-http`. CLI14 is a local compatibility route; CI uses Node22/Java21/CLI15.

This is a verified local development alternative, not the same access to live Firebase. It cannot confirm real records, live permissions, provider rollback, billing, production readiness or external review.

## Continued application behavior

- Project creation retains the original input and destination before dispatch. Server creation and the six bathroom template tasks commit atomically. A lost response retries the same destination; changed requests and other owners cannot overwrite it. The new-project form persists drafts and can recover an unconfirmed creation.
- Worker/helper availability stores verified workdays, hours and unavailable dates with each person. Unknown/inactive/blackout availability prevents server starts. Schedule recalculation limits work by those hours and checks for concurrent availability edits. Day-only schedules conservatively start after the local Toronto cure-release day; this is not an hourly resource scheduler.
- Raw photo bytes are committed to IndexedDB before upload. The owner-scoped outbox keeps pending/error states across reload, reconnects under the original account, reuses the evidence ID, and releases local bytes only after server acknowledgment. Device copies are not a backup and require shared-device/privacy acceptance. Abandoned server-object cleanup is still outstanding. Capturing a photo does not mark a task complete.

Portable photo backup/restore is now implemented and demo-verified. The backup route reads a consistent record snapshot and every pinned private photo; format 2 includes photo bytes/checksums. Restore reserves a separate destination, verifies token-free private objects and atomically publishes records after all photos pass readback. Limits: 20 MB photos, 32 MB JSON and 450 records. Larger-project storage archives and abandoned-transfer cleanup remain unfinished. Google sign-in continuation was blocked by automatic approval review after the earlier cancellation; renewed secure sign-in authorization is required. No live settings changed.

Still unfinished: complete offline navigation and metadata queues; larger photo archives and cleanup; full resource/space coordination and audited dependency waivers; real mobile/desktop/print and multi-device acceptance; live Firebase/hosting setup, genuine external review and provider recovery/rollback rehearsal. The app remains IN PROGRESS / EXTERNALLY BLOCKED.
