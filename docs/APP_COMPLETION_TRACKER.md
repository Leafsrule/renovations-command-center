# RACP completion tracker

Status: **IN PROGRESS / EXTERNALLY BLOCKED**. Not development complete. Not released.

Branch: `racp/rev02-completion`. Original main: `37a83fb`.

| Scope | Candidate implementation | Remaining required work |
|---|---|---|
| Separation | Own core root/manifest/lock/env/rules/docs; independent static tracker; CI/core path | Verify provider root settings and URLs before merge |
| A | Create/select/edit/archive/reopen projects; existing room manager | Cross-device edit testing |
| B | Existing tasks/people; guarded metadata/execution; action history; actual work entries | Full work lifecycle, authoritative invariants, person availability |
| C | Prerequisite/capacity fixes; conservative defaults; verified calendar gating; task/QC links | Real daily workflow and resource-capacity verification |
| D | Calendar/blackouts/settings conflicts; serial recalculation; day/week/month views | Timed waits/helper calendars/delay parity across all entry points |
| E | Editable task-linked materials/tools; quantities/units/supplier/dates; grouped shopping list; required-item aggregate | Aggregate race/integration and tool conflict tests |
| F | Private image upload/gallery; receipts; QC/checklists/rework; recorded owner exceptions | Stronger trusted enforcement, live upload and field verification |
| G | Feet/inches/tolerance/derived inches; unknown/recheck/verified; decision approvals/history | Mounted/revision integration verification |
| H | Project/account drafts; durable record queues; conflict/idempotent retries; Firestore cache; PWA fallback | Full execution/form queue and offline app workflow |
| I | Basic bathroom draft template; print styles/lists; private portable records/photo export; checksum-verified restore copy | Large-project storage backups, provider recovery/rollback rehearsal and daily-report acceptance |

Latest evidence is recorded in the October 8 implementation update below. October 6 baseline: 139 Vitest + 9 emulator tests passed; lint/typecheck/build and zero-vulnerability audit passed. See `RACP_QA_SECURITY_REVIEW.md` for limitations and exact findings.

Next: close release-critical authoritative-invariant and offline coverage gaps, run real browser/E2E with authorized Firebase test data, verify existing host/backend access, then distinct final QA/security reviews and deployment of the tested commit.

## Current-state rerun — 2026-10-08

Rev02 was reread and its discovery/validation phase rerun from the saved checkpoint. Application code has not advanced since October 6; this update does not claim the full completion mission has finished.

- Remote main remains `37a83fb9ada89a05a43b0a01acdcccce3dd9a787`; candidate head at inspection was `ffffea80c81dc44277fd4eefc5b20382e2f0ac8b`. PR #8 remains open/draft/unmerged. Its existing GitHub CI run `37534108998` is successful.
- Fresh `npm ci`, lint, typecheck, 139 Vitest tests, production build and dependency audit passed. Audit: zero vulnerabilities. All nine Firestore/Storage emulator tests passed again using the isolated demo project. Local Node is 24; supported Node 22 was covered by the existing successful CI.
- App isolation and whitespace checks passed. Site Control HTML/data remain unchanged. No production deployment, main merge, private-data migration or real renovation task mutation occurred.
- Firebase/Render discovery was retried and returned a connection error. Relevant backend/hosting environment credentials/configuration remain absent; live service access and production state were not verified. Playwright Chromium installation was retried and failed with empty/invalid ZIP downloads. Rendered mobile/desktop and authenticated E2E acceptance remain outstanding.
- PR #5 still explicitly requires genuine external review plus Firebase/Render live verification and recovery gates; these remain unresolved.

### Is the available data sufficient?

**Yes for continuing implementation:** the Rev02 requirements, source, tests, history and saved plans give enough direction; more renovation records or routine product choices are not a prerequisite. Do not invent real field progress.

**No for certifying and releasing a completed app:** development gaps in authoritative task/evidence enforcement, complete offline actions, scheduling/resource handling and photo recovery remain. Separately, release requires verified access to the existing Firebase project (web configuration, isolated test account and rules/storage deployment capability), the existing hosting service and its app-root configuration, a working permitted browser test runtime, and actual external review/recovery evidence. Access alone does not finish the outstanding code.

Status remains **IN PROGRESS / EXTERNALLY BLOCKED**. Next development task remains the authoritative-invariant boundary, then complete durable execution/form queues; follow the QA report and handoff for subsequent acceptance work.

### Render alternative verified — 2026-10-08, 09:21 Toronto

The owner confirmed the connected Render workspace. Direct Render service listing succeeded, including previews. The two returned web services belong to another repository; no service is linked to `Leafsrule/renovations-command-center`. No unrelated service was inspected further or modified.

This supersedes the earlier statement that Render access was unverified: **Render read access works without Rube**, but an existing renovation-app hosting resource has not been found in the connected workspace. No hosting was created and no deployment occurred. Firebase CLI live project listing separately failed with an authentication error; emulator access is not production access. The next release prerequisite is an authorized app-specific hosting arrangement plus Firebase authentication and configuration, after development/review gates pass.

## Implementation continuation — 2026-10-08

Status remains **IN PROGRESS / EXTERNALLY BLOCKED**, not development complete or released.

- Sensitive execution, QC/actual work, evidence linkage and historical restore now use bearer-authenticated Next server endpoints. Firebase Admin verifies ID tokens with revocation checks; every command checks project ownership, reads current task/dependency/project data, and applies the shared transition policy. Browser writes cannot forge protected proof, audit or receipt fields.
- Commands have immutable server receipts keyed by request ID and payload fingerprint. Interrupted task/QC requests are stored before dispatch, survive reload, retry under the original account, and visibly distinguish pending/conflicting/failed/saved. Conflicts require review; past-day starts are not auto-replayed. A device sync panel retries on startup/reconnect. This does not establish a fully navigable offline app.
- Final evidence objects are server-only writes. Uploaded bytes must match the owner/task and image limits. The server copies verified temporary uploads without download tokens, removes the temporary path, and checks the actual object/generation again for completion. SDK writes cannot replace/delete final evidence. Live bucket/CORS/token behavior is still unverified.
- Project and QC drafts retain their original revisions; stale changes are rejected instead of overwriting newer edits. Work receipts prevent duplicate actual minutes. Ordinary pause is separate from a curing wait, and blocker clearing cannot reopen terminal work.
- Structured restore is server-only, creates a separate project, preserves child IDs/statuses/timestamps, rejects cycles, and retains a retry destination until count/semantic readback succeeds. Evidence-backed restoration remains explicitly blocked.
- Daily work records now have a printable report grouped by Toronto date, using saved work minutes and reasons without invented hours.
- Backend/rules CI was added with Node 22, Java 21 and Firebase CLI 15; local demo integration uses CLI 14/Java 17. See the latest CI for its actual result.

Remaining required development: full offline navigation, new-project/metadata queues, offline raw-photo capture and photo backup/restore; persisted worker/helper calendars and complete timed wait/resource/space/dependency-waiver handling; broader template and field workflow integration verification. The existing live/backend/browser/external review and rollback gates remain.

Configuration change: server-only `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_STORAGE_BUCKET` and securely provisioned Application Default Credentials are required. Missing configuration fails closed. No credentials, paid resources, production writes, main merge or unrelated-service changes were made. See `apps/renovations-command-center/docs/TRUSTED_MUTATIONS.md` for operation and release coordination.

Validation for the October 8 application increment: fresh install, lint, typecheck, build, 156 Vitest tests (25 files), 22 demo backend/rules/Storage tests, zero-vulnerability audit, whitespace and app isolation passed. The Firebase CLI 15/Java 21 GitHub job must be checked separately before any release.

## Firebase and field-work continuation — October 8

Live configuration is still blocked: the secure Google sign-in request was cancelled, no existing project/web configuration or server credential is available, and the configuration check correctly reports all eight required values missing. No provider changes occurred. See `apps/renovations-command-center/docs/FIREBASE_SETUP.md` for the prepared importer, fail-closed matching-project/bucket checks and read-only live verifier.

The local Firebase alternative now includes real Auth plus private Next HTTP endpoints, not only direct Admin test calls. This verified atomic project/template creation, stable destination retry, rejected unsigned/invalid-token requests, a guarded start and a single receipt. It supplies local development access only, not live Firebase access.

New-project drafts/request destinations survive reload and lost responses. Persisted worker/helper calendars limit schedules and block unavailable starts; recalculation detects changes to person availability. Timed waits use Toronto dates with conservative day-level release. Raw photos are retained in account-scoped IndexedDB before upload, with original-ID replay and pending versus saved states. These changes reduce the earlier offline and scheduling gaps but do not establish full offline navigation, every metadata/form queue, photo backup/recovery, resource/space scheduling or real field acceptance.

No main merge, deployment, live data write, new paid resource, IAM expansion or external review approval occurred. PR #8 remains a draft.

Validation for this increment: 169 app tests (30 files), 24 real demo backend/security tests, real Auth-to-HTTP smoke workflow, fresh npm ci, lint, typecheck, production build, zero-vulnerability audit, app isolation and whitespace checks passed locally. GitHub CI for the newly published increment must be verified separately.

## Portable photo recovery continuation — October 8, evening Toronto

The previous Firebase/field increment at `403f58f` has successful GitHub CI run `37822185218`. Continued from that exact checkpoint without redoing discovery or reinstalling dependencies.

- The app now exports a format-2 portable backup containing a consistent Firestore snapshot and every linked private photo, pinned to its recorded Storage generation. SHA-256 checksums cover the bytes. Export rejects missing, mismatched or token-bearing objects; it never silently leaves out files. The portable limit is 20 MB total photo bytes, 32 MB JSON and 450 records. Larger projects still require a separate provider/storage backup workflow.
- Restore validates all checksums before writing, reserves an owner/backup-specific destination, creates token-free final objects and verifies byte readback before atomically publishing the separate project and records. Interrupted transfers keep an inaccessible reservation and private objects for retry at the same destination. Original projects are not overwritten. Historical format-1 record-only backups remain supported; format-1 evidence restores remain rejected.
- The browser retains its recovery ID until record parity and authenticated photo-byte readback both pass. Field-record changes keep their submitted payload immutable while unconfirmed; late successes/failures cannot erase or replace a newer reviewed draft.
- Local validation passed: 175 app tests, 27 backend/security emulator tests, authenticated Auth-to-HTTP backup/restore replay, lint, typecheck, build, audit with zero vulnerabilities, app isolation and whitespace checks. No rendered-browser or live-provider acceptance is claimed. Inspect the new increment's CI separately.
- Live Google sign-in was blocked by automatic approval review because the prior secure sign-in was cancelled and renewed authorization was not explicit. The site was not reached. No live project configuration, credentials, rules, hosting or IAM were changed.

Still required: full offline navigation and metadata/form queues; full resource/space scheduling and audited dependency waivers; abandoned upload/restore cleanup and large-project photo archives; rendered mobile/desktop/print, multi-device and shared-device acceptance; live Firebase configuration, app-specific hosting, genuine external review and provider recovery/rollback. Status remains **IN PROGRESS / EXTERNALLY BLOCKED**. Main and production are unchanged.

## Live Firebase discovery and local configuration — October 9, 01:16+ Toronto

Owner renewed secure sign-in authorization and completed the passkey handoff. Fresh target-domain UI verified successful sign-in and the existing `renovations-command-center` project with its registered web app. Public SDK configuration and matching server project/bucket settings were imported into an ignored, mode-0600 local environment. Matching-project/bucket production validation and a rebuild with those values passed. No secret or environment file is included in GitHub.

Live console observations: Email/Password is enabled and an existing account is present; Firestore `(default)` is available in `nam5` with existing test-project data; deployed rules are the older June 9 owner-based rules and lack the candidate's protected execution/evidence/restore boundary. Existing rules and data were not changed. Storage is gated behind Blaze billing on the current Spark project. Scheduled provider backups/PITR also require an upgrade. A configured SDK bucket name does not establish provisioned Storage.

The read-only Node Admin live check failed because no authorized server credential/ADC is configured. Browser access is now resolved; server identity, usable Storage/billing and app hosting remain blockers. No service account key, IAM expansion, billing upgrade, live rules publication, merge or deployment occurred. This billing prerequisite is superseded by the owner's October 9 no-paid-services correction. Implement the free-storage replacement and verify no-charge hosting/server identity before live acceptance. The app remains IN PROGRESS, with all previous unfinished development/acceptance gates retained. Application commit `e8a458d` has successful CI run `37871933283` in all three jobs; this update changes documentation only.

## No-paid-services correction — October 9, 09:17 Toronto

The owner confirmed that no paid services are permitted. The earlier instruction to complete Blaze billing was an approach error and is withdrawn. Firebase remains on Spark; no billing change has occurred. See `FREE_SERVICE_PLAN.md` for the revised target and implementation/release gates.

Retain Firebase Auth/Firestore and current project/records. Replace Cloud Storage with private Supabase Free storage through a provider adapter and authenticated server routes. Verify an eligible no-charge host before deploying; Render Free is a candidate with unresolved workspace/overage and reliability constraints, not a certified production choice. No free resource, new identity, credential, account, storage migration or hosting deployment was created by this correction.

Current code still requires Firebase Storage and generation-based checks. These must be adapted and tested before the free target works. Existing 175/27 test evidence applies only to the prior Firebase implementation. Supabase's published Free allowance is 1 GB file storage and 5 GB uncached egress, with pause after one week of inactivity; capacity, retry/paused behavior, offline operation and portable backups are required acceptance work. Do not promise unlimited photos, permanent provider pricing or always-on free hosting.

## Free private-photo implementation — October 9

Supabase private-storage adapter and Firebase-authenticated photo staging/download routes are now implemented in the candidate. Browser photo uploads no longer use the Firebase Storage SDK; original bytes survive failed saves until authenticated checksum readback. Trusted completion/archives/restores use a provider boundary with tagged Supabase object versions, server-only checksum manifests and create-only objects. Firestore capacity reservations cap this app at 800 MiB, serialize concurrent uploads and retain uncertain allocations; staging cleanup resumes safely after lost delete responses. Production requires the free adapter; emulator tests retain Firebase Storage.

This is a tested code candidate, not a deployed service. Supabase account/project/bucket/server credential and Firebase ADC are unavailable; private policies, actual provider transport/inactivity/quota behavior and a genuinely no-charge host are unverified. No billing/paid service, live data/rule change, new credential, merge or deployment occurred. Full offline/resource/space/waiver work, abandoned-object/large archive support and all existing rendered/external-review/recovery gates remain. See app `docs/FREE_PHOTO_SETUP.md`.

Validation for the October 9 free-photo candidate: npm ci, lint, typecheck, production build, 188 Vitest tests, 30 demo backend/security tests, actual demo Auth-to-Next HTTP photo staging/link/read and backup/restore replay, audit with zero vulnerabilities, Site Control isolation and whitespace checks passed locally. Supabase transport is faked in its unit/integration tests; the HTTP smoke uses the actual Firebase Storage emulator adapter. Remote CI must be verified for the published commit. No live provider acceptance or independent external review is claimed.
