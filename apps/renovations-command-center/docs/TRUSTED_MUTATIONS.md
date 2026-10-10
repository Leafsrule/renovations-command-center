# Authenticated mutation boundary — development candidate

This is a candidate implementation, not production certification. Its real Firebase project, bucket, IAM, credentials and browser workflows must be verified before release.

## Server configuration

Set `FIREBASE_ADMIN_PROJECT_ID` and `FIREBASE_ADMIN_STORAGE_BUCKET` only on this app's server. Supply Application Default Credentials securely, for example an existing authorized service credential file mounted on the host with `GOOGLE_APPLICATION_CREDENTIALS` pointing to it. Never commit the credential file or put admin credentials in `NEXT_PUBLIC_*`. Verify the credential's least privilege against this app's independent Firebase project/bucket. No credential is created by this implementation.

The browser still uses its existing six public Firebase web settings. The server verifies Firebase ID tokens, including revocation, then checks project ownership inside its transaction. Missing admin configuration fails closed with an unsaved/pending message. Production refuses emulator configuration. A successful build or `/api/health` response is not proof that Firebase authentication or mutation services work.

Reference: [Firebase Admin setup](https://firebase.google.com/docs/admin/setup), [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Admin Storage](https://firebase.google.com/docs/storage/admin/start).

## Commands and proof

`POST /api/projects/{projectId}/tasks/{taskId}/commands` accepts only guarded action, quality/work, or evidence-confirmation commands. The actor comes from the verified token. The task universe/calendar/materials/tools/helper records are read from the backend; a browser-supplied task universe cannot establish readiness. The original task revision is checked for execution/QC drafts.

Command IDs and payload fingerprints are saved with immutable receipts. Identical retries return the acknowledgment, without adding actual work twice. Reusing an ID for different content is a conflict. Audits and protected completion fields cannot be written directly by the browser. Blocker clearing cannot reopen completed/cancelled work.

Before dispatch, task/QC commands persist to account-scoped browser keys, with project/task IDs. Reconnect/startup retries only pending commands. Conflicting or rejected changes stay visible for review. A start/resume from another day must be reviewed again. Task metadata and new-project creation do not yet have this full command queue.

## Private files

The browser uploads to `projects/{projectId}/evidence-staging/{id}` with task/owner metadata. The server checks actual object metadata and size/type, copies to `projects/{projectId}/evidence/{id}` without reusable download tokens, and deletes the temporary upload. Only the server can write final objects. Owners read them with authenticated blob access; no signed/token URL is generated for ordinary gallery use.

Completion checks the final object's actual generation and task/owner linkage, rather than accepting a claimed evidence count. If a response is interrupted, keep the queued confirmation and retry; do not delete its file. Abandoned staging/final objects need an app-scoped cleanup/recovery workflow and live verification. Legacy evidence without verified linkage must be reviewed; no legacy object migration has been performed.

## Restore and release coordination

`POST /api/projects/restore` validates an account-owned backup, rejects orphan/cyclic task links, and creates a separate project atomically. Destination IDs persist on the device until count/semantic readback succeeds. Repeating the same destination/content is idempotent; newer existing data is never overwritten. Evidence-backed backups are explicitly rejected until private-file backup/copy and parity verification are implemented.

Release the server-capable app, browser client and tightened Firestore/Storage rules as one controlled, verified release. Old clients attempting direct execution/proof writes will be rejected by the new rules; their new workflows require the server endpoints. Do not deploy these rules alone to an unverified existing app. Retain an audited compatible rollback candidate and backed-up records/rules; rollback to a known insecure rule set is not a successful recovery plan.

Local checks: `npm test`, lint/typecheck/build/audit, then demo emulators running `npm run test:backend`. CI uses Node 22, Java 21 and Firebase CLI 15. Local CLI 14 with Java 17 is a development route only. Never run the integration fixture on production resources.
