# RACP QA and Security review — 2026-10-06

Mode: separate specialist review passes by the same work session. No independent agent, external model, Claude, licensed-professional or owner acceptance is claimed.

## Decision

DO NOT RELEASE. This is an in-progress development candidate. Required A–I scope has not yet met full acceptance. Main and existing production resources were not changed.

## Evidence

- Lint, typecheck and Next.js 16.4 production build passed.
- 139 Vitest tests passed, including mounted navigation/planner and browser draft tests, transactional actions, calendar/DST, input integrity, app-scoped backup validation and lint-glob compatibility.
- Nine Firestore/Storage emulator tests passed: ownership immutability, cross-owner/anonymous isolation, missing evidence, guarded completed-task creation, atomic restore, private image access, rejected nonimages and object-overwrite denial. The overwrite test caught a defect; adding `resource == null` fixed it.
- `npm audit --audit-level=high`: zero vulnerabilities after dependency updates. Scoped replacements: gRPC 1.14.5 and Next lint's sole globSync consumer uses tinyglobby 0.2.17. The real lint caller is tested. No audit exclusions or forced downgrade.
- Static app isolation check passed: original Site Control HTML and JSON are byte-identical; original relative data/save paths remain.
- Browser installation failed: permitted Playwright download produced invalid/empty ZIPs. No rendered phone/desktop or authenticated E2E claim.
- Rules tests used Firebase CLI 14 with the available Java runtime; latest CLI requires Java 21. Repeat on Java 21/current CLI in CI before release.

## QA findings that still block full acceptance

1. Full owner workflow, real upload/CORS, second-device changes, restart/auth-expiry/reconnect and rendered accessibility need live/browser verification.
2. Core task metadata now compares the original updatedAt and validates a freshly read dependency graph transactionally. Project metadata and QC editing still need comparable version-conflict coverage.
3. Task edits have durable drafts; field records have durable queues/version conflicts/idempotency. Today execution commands, new-project creation and quality/work forms do not yet have a complete durable offline queue. Offline navigation currently shows a fallback, not a fully functional offline app.
4. Scheduling is a conservative serial date plan. Persisted worker/helper availability, timed cure propagation through every entry point, resource/space validation and fully audited cancelled-prerequisite waivers remain incomplete. Legacy concurrency flags are deliberately shown as needing review.
5. Task completion/photo/QC guards and override history exist. However, client-writable proof fields and all sensitive task transitions still need stronger authoritative enforcement or a trusted service boundary; a user with direct SDK access can bypass some client policy. This is release-critical.
6. Backup restore checks IDs/counts/semantic parity into a new project, but rejects evidence-backed restores until private object backup/copy is implemented and verified. Actual provider backups and release rollback have not been rehearsed.
7. Draft/queue failure paths and the new material/tool aggregate need additional mounted/integration coverage. Preserve legacy material requirements separately from structured required items.
8. Existing app requirements include broader templates and daily records; the current bathroom template and printable lists are only basic implementations, not full I acceptance.

## Security / release findings

No Firebase web configuration, backend deployment credential or Render authorization was present in this environment. Connected-service discovery via Rube failed with a connection error. Repository permissions are admin/push, but they do not establish backend or hosting authority. No deployed-rule comparison, live IAM check, production smoke test, backup/restore rehearsal or rollback occurred. PR #5's genuine external/provider gates were not forged or bypassed.

Site Control retains pre-existing public-JSON, GitHub-token, whole-file overwrite, unsafe text-rendering and offline limitations; these are not fixed by isolating it. Do not add private evidence there. No cross-app data migration occurred.

## October 8 interim QA review

Separate review pass after implementation; same work session, no independent-agent or external-model approval. The bounded command/queue increment is reviewable, but this is not the final A–I acceptance review.

The previous stale QC/project edit findings now have persisted original-revision checks. Execution/QC replay and restore destination reuse have rejection/reload tests. Device sync has mounted startup/reconnect/conflict/acknowledgment coverage. Toronto midnight/DST report grouping excludes undated events and never infers hours. Pause and terminal blocker-clearing regressions have coverage.

Meaningful migration of coverage: the old mocked client transaction suite was replaced by server-backed transport tests and real Admin SDK/demo-emulator command tests; test counts must not imply dropped policy coverage.

Remaining QA blockers: rendered phone/desktop/authenticated workflow, live upload/CORS/private-file access, actual browser restart and second-device exercise; complete offline navigation/capture/new-project workflows; all scheduling/helper/cure/resource/waiver acceptance; photo recovery and provider rollback. The new daily report has logic tests, not rendered print acceptance.

## October 8 interim Security & Release review

Separate review pass focused on the privileged mutation boundary. Firestore now denies direct SDK execution/proof/history/receipt forgery and restored-project bypass. Storage permits only scoped temporary uploads and owner reads; final writes are server-only. Tests exercise other-owner rejection, fresh prerequisites, concurrent starts, forged counters, actual file/task/owner verification, audited exceptions, immutable command IDs, replay without doubled work, and separate-copy restore. API authentication rejects absent/revoked identity, takes the actor only from the verified token and hides private internal errors. Body limits measure streamed bytes instead of trusting Content-Length. Server secrets are not public environment variables.

Review/test findings corrected: emulator token revocation did not work via metadata patch; verified uploads now copy to token-free final storage and delete the temporary path. Historical restore originally allowed a client status bypass; it is now server-only. Clear-blocker could reopen terminal work; the policy now rejects it.

Release is still denied. Verify the server credential's least privilege and app-specific project/bucket on real infrastructure; configure existing Firebase resources securely; verify final-object privacy and temporary cleanup against the live provider; audit abandoned upload cleanup; add photo-object backup/restore and validate rollback. No production security or external Claude review is claimed. Direct Render read access works, but the connected workspace has no renovation-app service.

Validation for the October 8 application increment: fresh install, lint, typecheck, build, 156 Vitest tests (25 files), 22 demo backend/rules/Storage tests, zero-vulnerability audit, whitespace and app isolation passed. The Firebase CLI 15/Java 21 GitHub job must be checked separately before any release.
