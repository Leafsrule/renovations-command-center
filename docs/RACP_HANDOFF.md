# RACP continuation handoff

Status: IN PROGRESS / FREE-PROVIDER SETUP / ACCEPTANCE BLOCKED. No production app completion is claimed.

Owner correction on October 9: all services must be free. Do not request a Blaze upgrade. `FREE_SERVICE_PLAN.md` supersedes the earlier Storage/billing prerequisite. The October 9 candidate now contains the free-storage adapter and authenticated photo routes; live provider setup and release remain unverified.

Repository: Leafsrule/renovations-command-center
Branch: racp/rev02-completion
Base: 37a83fb9ada89a05a43b0a01acdcccce3dd9a787
Local isolation checkpoint: cb92f5e (retained in racp/local-checkpoint-20261006).
Original October 6 application candidate: 4a7177772fb71998b7629d3ff0e5f744f4ec0e34
Trusted mutations/queues increment: 08c646aca3124ab8eb7416bbf390aaeca4876bc7. Latest application increment is the current feature-branch HEAD; see the final continuation section below.
Draft PR: https://github.com/Leafsrule/renovations-command-center/pull/8
Published trusted-mutations application tree: 61502455272a9c59cc54215f2daef6343d4a68b8 (identical to its locally tested tree).
Local October 8 checkpoint: racp/local-checkpoint-20261008.

CLI git push had no HTTPS credentials. The authorized GitHub connector published the identical tree; remote content was fetched and compared successfully. Continue via the connector or an already authorized git credential. Do not force-push to reconcile local/remote author metadata.

## Resume without restarting

Read `APP_COMPLETION_TRACKER.md` and `RACP_QA_SECURITY_REVIEW.md`, then inspect `git status` and branch HEAD. Run all npm commands from `apps/renovations-command-center`. Site Control remains at `docs/site-control`; never move its operational records into the core app.

October 8 continuation adds the authenticated server command boundary, guarded private evidence, durable execution/QC queues, stale project/QC drafts, server restore and printable daily records. See the tracker for current evidence. Next development tasks: full offline navigation/new-project/metadata and raw-photo workflows, photo-object backup/restore, and complete scheduling/resource acceptance. Do not use real projects until live identity/rules/storage and browser verification pass. Next review tasks are listed in the QA report; do not describe them as completed.

Validation:

```bash
cd apps/renovations-command-center
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
npx --yes firebase-tools@14 emulators:exec --project demo-renovations-racp --only firestore,storage 'npm run test:backend'
cd ../..
node scripts/check-app-isolation.mjs
git diff --check
```

Verified October 8: 156 app tests and 22 demo backend/security tests passed locally; lint, typecheck, production build, audit (zero vulnerabilities), isolation and whitespace checks passed. GitHub CI run 37788495866 for application commit 08c646aca3124ab8eb7416bbf390aaeca4876bc7 completed successfully in all three jobs: validate, backend-security and site-control-isolation. Backend CI used Firebase CLI15 and Java21; local CLI14 was the Java-compatible route. Neither validates the live provider deployment.

Built-server HTTP smoke checks passed: login 200, health 200, unauthenticated command 401, and unconfigured secure backend 503 with an explicit unsaved response. Health success is not proof of live Firebase operation. The temporary server was stopped after testing.

## External blockers and smallest remaining access

- Existing Firebase project/web configuration, authorized test account, rules/storage deployment capability and existing web-host service/root-directory configuration need verification. No new paid service or merged database is authorized. Do not commit secrets.
- Connected-service discovery failed (Rube connection error). Direct Render read access was later verified; its confirmed workspace has no renovation-app service. Firebase live authentication remains unavailable.
- Playwright browser installation failed (invalid/empty downloaded ZIP). The alternate cloud browser also could not reach the private localhost preview (ERR_CONNECTION_REFUSED). Rendered/mobile/print/E2E acceptance remains unverified; successful HTTP checks do not substitute for it.
- Genuine external review gates associated with existing PR #5 remain unperformed.

No main merge, production deployment, data migration or real-task completion occurred. Preserve all rescue and source branches. Current progress is retained on the feature branch/draft PR. The session does not keep running after its final response.

October 8 candidate requires Firebase Admin project/bucket settings and securely supplied Application Default Credentials. See `apps/renovations-command-center/docs/TRUSTED_MUTATIONS.md`. Do not commit secrets or deploy the stronger rules independently of a validated server-capable app. No live deployment or migration occurred.

## Next retained increment

October 8 Firebase setup tooling, local Auth-to-HTTP smoke workflow, atomic project creation/retry, worker/helper calendars and durable raw-photo outbox are the new increment. Live Firebase sign-in was cancelled; do not equate emulator success with live access. Resume from the current feature-branch HEAD, `FIREBASE_SETUP.md` and the tracker. Continue complete metadata queues/offline navigation and photo recovery alongside the still-required live setup and review gates.

## Latest continuation: portable photo recovery

Resume from current `racp/rev02-completion` HEAD. Previous application commit `403f58f` has successful CI run `37822185218`. This increment adds `/api/projects/backup`, format-2 records/photo archives, pinned-generation export, checksum/readback verification, token-free separate-project photo restore and server-only `projectRestores` reservations for interrupted transfers. Local browser recovery IDs survive readback failure; field-record retries preserve newer drafts. Limits: 20 MB photo bytes, 32 MB JSON, 450 records. These are portable backups, not provider-wide backups.

Validated locally: 175 app tests, 27 backend/rules/Storage tests, actual demo Auth-to-HTTP backup/restore replay, lint/typecheck/build, zero-vulnerability audit and isolation/whitespace. No new npm dependency or rule relaxation. Verify this increment's remote CI after publication. Interrupted restore files are intentionally retained for retry; abandon/expiry cleanup and larger-project archive support remain open.

Automatic approval review rejected navigation to Google sign-in because the previous secure sign-in was cancelled without explicit renewed authorization. No browser authentication or live provider action was attempted after rejection. The next live-access step needs renewed user authorization for secure Google/Firebase sign-in, then browserAuth; do not request passwords or codes in chat. Browser sign-in still does not provision server credentials. Continue remaining offline/form queues, resource/space/waiver acceptance and recovery cleanup while access is unavailable. Do not repeat provider discovery or the already-passed baseline checks absent new changes.

## Current access/configuration checkpoint — October 9 Toronto

The previous sign-in blocker is resolved: renewed authorization and the owner's completed passkey handoff led to a positively verified Firebase console session. Existing project: `renovations-command-center`; registered web app: `renovations-command-center-web`. Its verified public SDK settings and matching Admin project/bucket settings are in the ignored mode-0600 local `.env.local`. Configuration production check and rebuild passed. Never commit or publish that environment file.

Verified live: Email/Password enabled; Firestore `(default)` in `nam5` with old June 9 owner-based rules and existing test records. No rules/data changes. Storage is not operationally verified and the console requires Blaze billing on the current Spark plan; provider backups/PITR also show an upgrade prerequisite. Server credential/ADC remains missing, so the Node Admin read-only live check failed despite successful browser access. Do not extract browser tokens or generate new keys as an implicit workaround.

Superseded by the October 9 no-paid-services correction: a billing upgrade is prohibited. Next dependent steps: implement the free private-storage adapter, verify a free hosting arrangement and securely provision server identity; coordinated release of tested server and stricter rules only after remaining development, browser, independent review and provider recovery/rollback gates. No paid resource, IAM change, service-account key, provider deployment or production mutation has been authorized or performed. Continue offline/form queues and resource/space/waiver/cleanup work from this checkpoint. Application commit `e8a458d` CI `37871933283` passed all three jobs. Browser access must be freshly verified when resuming; prior handoff is not proof of ongoing sign-in.

## Latest implementation — free private photos, October 9

Resume from the current feature-branch HEAD, `FREE_SERVICE_PLAN.md` and the app's `FREE_PHOTO_SETUP.md`. Production now requires `RCC_PHOTO_PROVIDER=supabase`, server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PHOTO_BUCKET`, Firebase Auth/Firestore settings and authorized server ADC. Supabase values/ADC remain unavailable. The ignored local environment selects Supabase but contains no invented provider value/credential; the production checker reports the three missing settings. Do not request Blaze, extract browser credentials or create new security-sensitive access implicitly.

The candidate has create-only photos, tagged object versions, server-only checksum manifests, 800 MiB transactional capacity reservations, resumable staging cleanup, private authenticated byte reads and matching browser readback before dropping original copies. Archives/restores use the same provider boundary; numeric GCS generations remain supported only for existing regression/development data. No live storage migration is claimed. Supabase unit tests use fake transport; adapter concurrency/recovery tests use real demo Firestore plus fake transport. Actual provider policies/IAM, inactivity/egress, no-charge hosting, larger archives/abandoned cleanup, remaining offline/resource features and browser/external review/recovery gates are still required.

Validation for the October 9 free-photo candidate: npm ci, lint, typecheck, production build, 188 Vitest tests, 30 demo backend/security tests, actual demo Auth-to-Next HTTP photo staging/link/read and backup/restore replay, audit with zero vulnerabilities, Site Control isolation and whitespace checks passed locally. Supabase transport is faked in its unit/integration tests; the HTTP smoke uses the actual Firebase Storage emulator adapter. Remote CI must be verified for the published commit. No live provider acceptance or independent external review is claimed.
