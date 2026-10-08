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
| I | Basic bathroom draft template; print styles/lists; private structured export; validated restore copy | Photo-object backups, full recovery/rollback rehearsal and daily-report acceptance |

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
