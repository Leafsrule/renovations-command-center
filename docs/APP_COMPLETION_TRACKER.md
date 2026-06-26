# Renovations Command Center — Living App Completion Tracker

> **Purpose:** This file is the authoritative, continuously maintained record of everything remaining before the application can be considered production-ready, safely deployed, recoverable, and operationally complete.
>
> **Maintenance rule:** Every material code change, test addition, provider configuration change, deployment event, review finding, rollback rehearsal, accepted limitation, or scope decision must update this file in the same commit or pull request.

---

## 1. Document Control

- **Repository:** `Leafsrule/renovations-command-center`
- **Pull request:** PR #5 — `infra: add remote-first Render production foundation`
- **Working branch:** `infra/remote-first-production`
- **Production branch:** `main`
- **Base SHA:** `f053f7f4b1ebd32e61465e60d8a5eddc98323ec2`
- **Last audited application commit:** `ad29eda4f259c65fca4a6859f396d3c8ff150b9b`
- **Evidence baseline commit:** `ad29eda4f259c65fca4a6859f396d3c8ff150b9b`
- **Previous application commit:** `a0d4f33b04150affe8eba677939ec54a85784645`
- **Previous evidence-only head:** `c373385f83d51d72096ddcba5b79d2cd21ac4106`
- **Last observed PR branch head:** `ad29eda4f259c65fca4a6859f396d3c8ff150b9b`
- **Branch-head observation:** `2026-06-26T02:41:00Z`
- **Authoritative current head:** Resolve dynamically from GitHub PR metadata or `git rev-parse HEAD`.
- **Latest observed CI run:** `28213671401`
- **Latest observed CI conclusion:** `success`
- **Last observed automated test count:** 113
- **Last substantive update:** 2026-06-26
- **Document owner:** Release-Hardening Supervisor
- **Release decision:** `DO NOT RELEASE`

> The authoritative current branch head must be resolved dynamically from GitHub PR metadata or `git rev-parse HEAD`. Any stored branch-head SHA is a timestamped observation and is not self-currenting.

### Commit classification

- **Audited application commit:** most recent code-bearing checkpoint whose application changes completed applicable validation.
- **Evidence baseline commit:** application commit against which the current confidence conclusions were produced.
- **Evidence-maintenance commit:** documentation-only commit that does not replace the audited application commit unless application code, tests, workflows, dependencies, lockfiles, infrastructure, configuration, build or deployment scripts, or security rules also change.

### Status legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Completed and verified
- `[!]` Blocked by a human-only action or unavailable external capability
- `[~]` Accepted limitation or deferred item
- `[?]` Requires revalidation

### Release-critical rule

Do not approve paid Render provisioning, deploy Firebase Rules, mark PR #5 ready, merge, or deploy production until all release-critical items in Sections 3 through 12 are complete and independently verified.

---

## 2. Verified Baseline

### 2.1 Repository and architecture

- [x] GitHub is the system of record for code, infrastructure, validation, documentation, and recovery history.
- [x] Render is the sole approved production web host.
- [x] Firebase remains backend-only for Authentication, Firestore, Storage, and security rules.
- [x] Codespaces is replaceable development infrastructure.
- [x] Permanent `render.yaml` correctly targets `main`.
- [x] Temporary RC service, if used, will separately target `infra/remote-first-production` without changing the permanent Blueprint.
- [x] Node 22 is declared for application and CI use.
- [x] `/api/health` exists and returns minimal health data.

### 2.2 Application foundation

- [x] Core scheduling engine exists.
- [x] Today Planner exists.
- [x] Task execution transition engine exists.
- [x] Blocker workflow exists.
- [x] Active-project routing exists.
- [x] Mobile navigation exists.
- [x] Firebase Firestore and Storage Rules files exist.
- [x] Firebase emulator configuration exists.
- [x] Manually gated Firebase Rules workflow exists.
- [x] Render Blueprint exists.
- [x] Production, Render, and Firebase validation scripts exist.

### 2.3 P2 remediation checkpoint

- [x] Dependency recommendations use the full task universe.
- [x] Completed dependencies outside the primary subset are recognized.
- [x] Oversized tasks no longer stop later fitting tasks from filling capacity.
- [x] `waiting_curing` tasks are excluded from primary Today scheduling.
- [x] Over-capacity Not Today tasks are guarded from Start in implementation.
- [x] Quick actions use targeted Firestore updates rather than whole stale snapshots.
- [x] Blocker validation uses modal-local state in implementation.
- [x] Active-project changes trigger mobile navigation refresh in implementation.
- [x] Start, Resume, and Mark Waiting synchronize readiness fields in implementation.

### 2.4 Validation and CI

- [x] Local remediation validation reported `npm ci` passed.
- [x] Local remediation validation reported lint passed.
- [x] Local remediation validation reported typecheck passed.
- [x] Local mounted-test checkpoint validation reported 113 tests passed.
- [x] Local remediation validation reported production build passed.
- [x] Local remediation validation reported high-severity audit passed, with moderate advisories noted.
- [x] Local remediation validation reported production, Render, and Firebase validators passed.
- [x] GitHub Actions run `28213671401` passed on PR head `ad29eda4f259c65fca4a6859f396d3c8ff150b9b` and validated PR merge candidate `ad8f10d98062e5c51f9e492fbb66876d4cdd2aae`.
- [x] CI passed installation, whitespace checks, lint, typecheck, production validation, Render validation, Firebase validation, build, audit, and tests.

### 2.5 Current release state

- [x] PR #5 is open.
- [x] PR #5 is draft.
- [x] PR #5 is unmerged.
- [x] PR #5 is mergeable at the last observation.
- [x] Both rescue branches exist.
- [x] No paid Render resource has been verified as created for this release candidate.
- [x] No Firebase Rules deployment has been verified for this release candidate.
- [x] No genuine Claude application review has been recorded.

---

## 3. Immediate Code and Test Hardening

### 3.1 Today Planner mounted behavioural tests

Current source-contract tests are supplemental only. Real DOM-mounted behavioural tests now cover the release-hardening scenarios implemented in `components/TodayPlanner.mounted.test.tsx`.

- [x] Add the minimum justified DOM test dependencies.
- [x] Configure Vitest so DOM tests use `jsdom` without forcing unrelated pure tests into a DOM environment.
- [x] Mount Today Planner with controlled repository mocks.
- [x] Verify the planner renders.
- [x] Verify the blocker modal opens for the selected task.
- [x] Verify default invalid blocker submission keeps the modal open.
- [x] Verify validation appears inside the modal.
- [x] Verify modal validation does not replace the planner with the page-level fatal error view.
- [x] Verify correcting blocker type clears the modal validation error.
- [x] Verify correcting blocker notes clears the modal validation error.
- [x] Verify correcting blocked-until date clears the modal validation error.
- [x] Verify closing the modal clears modal-only state.
- [x] Verify Cancel performs no persistence action.
- [x] Verify successful blocker save performs one targeted action.
- [x] Verify rejected blocker save keeps the modal usable.
- [x] Verify rejected blocker save reports failure without false success.
- [x] Verify an over-capacity Not Today task does not render Start.
- [x] Verify a capacity-eligible task renders Start.
- [x] Verify Start invokes the intended targeted action.
- [x] Verify Complete requires confirmation.
- [x] Verify cancelling Complete writes nothing.
- [x] Verify rejected Complete does not falsely update visible state and leaves the planner recoverable.
- [x] Verify source-string tests are retained only where they add supplemental contract value.

### 3.2 MobileBottomNav mounted runtime tests

- [x] Mount `MobileBottomNav` with controlled route, user, and project data.
- [x] Verify project A appears in relevant links initially.
- [x] Verify an active-project change to project B updates links without reload.
- [x] Verify old project A URLs disappear after switching.
- [x] Verify the custom active-project event refreshes links.
- [x] Verify browser focus refresh retrieves the current active project.
- [x] Verify Today uses the active project.
- [x] Verify Tasks uses the active project.
- [x] Verify Schedule uses the active project.
- [x] Verify Materials uses the active project.
- [x] Verify Photos uses the active project.
- [x] Verify no-active-project state is safe.
- [x] Verify active-project aliases do not create a redirect loop.
- [x] Verify authentication loss clears project-specific navigation safely.
- [x] Verify project-list failure does not create stale or unsafe links.

### 3.3 Firestore persistence-boundary matrix

Existing direct `updateDoc` tests cover Start, Mark Waiting, stale-field exclusion, and permission-denied no-refresh behaviour.

- [x] Exact Start payload asserted.
- [x] Exact Mark Waiting payload asserted.
- [x] Stale unrelated fields excluded on tested paths.
- [x] Permission-denied write rejects.
- [x] Failed write does not perform refresh read.
- [x] Add exact Resume payload assertion.
- [x] Add exact Complete payload assertion.
- [x] Add exact Block payload assertion.
- [x] Add exact Clear Blocker payload assertion.
- [x] Verify Resume excludes unrelated name, notes, dependency, material, date, duration, room, and priority fields.
- [x] Verify Complete excludes unrelated fields.
- [x] Verify Block writes only intended blocker and transition fields.
- [x] Verify Clear Blocker removes only intended blocker fields and writes reevaluated readiness fields.
- [x] Verify rejected Resume does not refresh or show false success.
- [x] Verify rejected Complete does not refresh or show false success.
- [x] Verify rejected Block does not refresh or show false success.
- [x] Verify rejected Clear Blocker does not refresh or show false success.
- [x] Verify mounted UI remains recoverable after rejected blocker and Complete actions where applicable.

### 3.4 Historical review evidence closure

#### PR #3 findings

- [x] Full task-list dependency evaluation implemented.
- [x] Completed external dependency recognition implemented.
- [x] Oversized-task continuation implemented.
- [x] Waiting/curing exclusion implemented.
- [x] Targeted stale-write prevention implemented.
- [x] Replace source-only capacity Start proof with mounted behavioural proof.
- [ ] Map every PR #3 finding to exact current file, test, commit, and CI evidence.
- [ ] Record whether formal historical thread resolution is technically available and appropriate on the merged PR.

#### PR #4 findings

- [x] Modal-local blocker validation implemented.
- [x] Active-project navigation refresh implemented.
- [x] Readiness synchronization implemented.
- [x] Replace source-only modal proof with mounted behavioural proof.
- [x] Replace helper-only navigation proof with mounted runtime proof.
- [ ] Map every PR #4 finding to exact current file, test, commit, and CI evidence.
- [ ] Record whether formal historical thread resolution is technically available and appropriate on the merged PR.

---

## 4. Evidence and Governance

### 4.1 Living tracker

- [x] Create the living completion tracker.
- [x] Distinguish audited application commits from evidence-maintenance commits.
- [x] Use timestamped branch-head observations rather than self-referential commit claims.
- [x] Require dynamic current-head resolution.
- [ ] Update this tracker in the same commit as every future material change.
- [ ] Add this tracker to contributor or PR guidance.
- [ ] Require Codex work packages to update this tracker.
- [ ] Require independent review to flag stale tracker content.

### 4.2 Release confidence report

- [x] Record base SHA.
- [x] Record audited application commit.
- [x] Record evidence baseline commit.
- [x] Record timestamped observed branch head.
- [x] Record current-head authority.
- [x] Record observed CI run and conclusion.
- [x] Remove stale wording that successful CI remains pending.
- [x] Distinguish genuine Claude review from Codex fallback self-review.
- [x] Record Render, Firebase, smoke-test, and rollback status as unverified where appropriate.
- [x] Record seven confidence categories and release decision.
- [x] Update after the mounted-test code checkpoint.
- [ ] Update after genuine Claude review.
- [ ] Update after Render RC validation.
- [ ] Update after Firebase live verification.
- [ ] Update after smoke and rollback testing.
- [ ] Finalize after production deployment and RC cleanup.

### 4.3 Machine-readable release evidence

- [x] Add schema version.
- [x] Add repository, PR, branch, and base SHA.
- [x] Add audited application and evidence baseline commits.
- [x] Add timestamped observed head and dynamic authority rule.
- [x] Add CI run and conclusion.
- [x] Add seven category scores, lowest category, and overall confidence.
- [x] Add open deficiencies.
- [x] Add Claude, Render, Firebase, RC, smoke-test, rollback, and cleanup status.
- [x] Add explicit `DO NOT RELEASE` decision.
- [x] Add next code-bearing checkpoint and CI evidence.
- [ ] Add genuine Claude invocation and verdict.
- [ ] Add provider deployment and rollback evidence.
- [ ] Add final production decision.

### 4.4 PR #5 body

- [x] Replace stale wording that calls `e2208f78...` the current head.
- [x] Identify `e2208f78...` as the audited P2 remediation commit.
- [x] State that authoritative head comes from current PR metadata.
- [x] Record current observed CI evidence.
- [x] State `Genuine Claude review: pending`.
- [x] Remove wording that represents the fallback Codex review as independent.
- [x] Keep PR #5 draft.
- [ ] Do not merge until all release gates pass.

---

## 5. Independent Claude Review

### 5.1 Review packet

- [x] Create `docs/CLAUDE_REVIEW_PACKET.md` after the mounted-test code checkpoint is green.
- [x] Reference the exact audited code-bearing commit.
- [x] Include base SHA.
- [x] Include changed files.
- [x] Include material implementation changes.
- [x] Include mounted behavioural test scenarios.
- [x] Include Firestore boundary matrix.
- [x] Include test totals and validation commands.
- [x] Include exact CI run and conclusion.
- [x] Include neutral historical PR #3 and PR #4 verification targets.
- [x] Include Render, Firebase, RC, smoke-test, and rollback status.
- [x] Include remaining evidence gaps.
- [x] Exclude desired verdicts, previous model verdicts, confidence recommendations, and approval language.
- [x] Verify no secrets or private data are included.

### 5.2 Genuine independent invocation

- [!] Establish a genuine Claude connector, Claude Code, authenticated Claude CLI, or approved API path.
- [ ] Send the exact review packet and relevant diff.
- [ ] Record invocation method.
- [ ] Record exact commit reviewed.
- [ ] Preserve the complete returned verdict.
- [ ] Record `PASS`, `CONDITIONAL PASS`, or `FAIL`.
- [ ] Record every P0/P1/P2 finding with file and line references.
- [ ] Route every confirmed P1/P2 to Codex.
- [ ] Require failing regression tests before fixes.
- [ ] Push fixes and verify CI.
- [ ] Repeat Claude review after material changes.
- [ ] Complete with no unresolved P0/P1/P2.

A Codex or GPT self-review is not a substitute for genuine Claude review.

---

## 6. Render Authorization and Source Integrity

### 6.1 Provider access

- [!] Verify Render authentication.
- [!] Verify the personal workspace `My Workspace`.
- [!] Verify GitHub integration is connected to the correct account.
- [!] Verify repository authorization includes `Leafsrule/renovations-command-center`.
- [!] Verify the TDSB repository is not selected as an application source.
- [!] Verify unrelated existing Render services remain untouched.

### 6.2 Permanent Blueprint

- [x] Permanent service name in repository configuration is `renovations-command-center`.
- [x] Permanent branch is `main`.
- [x] Runtime is Node.
- [x] Plan is Starter.
- [x] Node version is 22.
- [x] Build command is `npm ci && npm run build`.
- [x] Start command is `npm run start -- -H 0.0.0.0 -p $PORT`.
- [x] Health path is `/api/health`.
- [x] Six Firebase browser-variable names are declared with provider-side values required.
- [ ] Verify Blueprint against live Render account behaviour.

### 6.3 Temporary release-candidate service

Required metadata:

- Workspace: `My Workspace`
- Repository: `Leafsrule/renovations-command-center`
- Branch: `infra/remote-first-production`
- Service: `renovations-command-center-rc`
- Runtime: Node
- Node version: 22
- Plan: Starter
- Build: `npm ci && npm run build`
- Start: `npm run start -- -H 0.0.0.0 -p $PORT`
- Health: `/api/health`

Remaining work:

- [ ] Verify correct repository selection.
- [ ] Verify exact RC branch selection.
- [ ] Verify branch does not silently revert to `main`.
- [ ] Verify expected recurring Starter cost.
- [!] Obtain explicit payment approval before creating a paid RC service.
- [!] Enter payment details only in Render if required.
- [ ] Create no more than one RC service.
- [ ] Record service ID.
- [ ] Record service URL.
- [ ] Record deployment ID.
- [ ] Record exact deployed commit.
- [ ] Verify unrelated services are unchanged.

---

## 7. Render Environment and Deployment

### 7.1 Environment variables

- [!] Enter `NEXT_PUBLIC_FIREBASE_API_KEY` securely in Render.
- [!] Enter `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` securely in Render.
- [!] Enter `NEXT_PUBLIC_FIREBASE_PROJECT_ID` securely in Render.
- [!] Enter `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` securely in Render.
- [!] Enter `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` securely in Render.
- [!] Enter `NEXT_PUBLIC_FIREBASE_APP_ID` securely in Render.
- [ ] Verify all six variables exist.
- [ ] Verify no values are committed to GitHub.
- [ ] Verify no values appear in logs.
- [ ] Verify build and runtime receive the values.

### 7.2 RC deployment

- [ ] Trigger build from `infra/remote-first-production`.
- [ ] Verify Node 22.
- [ ] Verify `npm ci` succeeds.
- [ ] Verify production build succeeds.
- [ ] Verify start command succeeds.
- [ ] Verify service reaches healthy state.
- [ ] Verify `/api/health` returns HTTP 200.
- [ ] Verify health response contains no secrets or environment details.
- [ ] Verify homepage loads.
- [ ] Verify deploy logs contain no secrets.
- [ ] Verify restart controls.
- [ ] Verify rollback controls.
- [ ] Record deployment timestamp.

---

## 8. Firebase Live Verification

### 8.1 Project and products

- [!] Verify the exact Renovations Command Center Firebase project.
- [!] Verify Firebase Authentication is enabled.
- [!] Verify required sign-in providers.
- [!] Verify Firestore is enabled.
- [!] Verify Storage is enabled.
- [!] Verify RC domain is authorized for Authentication.
- [ ] Verify final production domain after production deployment.

### 8.2 Deployed Rules comparison

- [!] Retrieve deployed Firestore Rules.
- [!] Compare deployed Firestore Rules with repository `firestore.rules`.
- [ ] Document differences.
- [!] Retrieve deployed Storage Rules.
- [!] Compare deployed Storage Rules with repository `storage.rules`.
- [ ] Document differences.
- [ ] Correct only reviewed differences.

### 8.3 Rules behaviour

- [ ] Verify owner-scoped Firestore access.
- [ ] Verify unauthenticated Firestore denial.
- [ ] Verify cross-owner Firestore denial.
- [ ] Verify project, room, person, task, and related document rules.
- [ ] Verify owner-scoped Storage access.
- [ ] Verify unauthenticated Storage denial.
- [ ] Verify cross-owner Storage denial.
- [ ] Verify valid photo and file uploads.

### 8.4 Secrets and deploy identity

- [!] Verify `FIREBASE_PROJECT_ID` GitHub Actions secret presence without revealing value.
- [!] Verify `FIREBASE_SERVICE_ACCOUNT` secret presence without revealing value.
- [!] Verify required browser-variable secret presence where used by the workflow.
- [!] Verify deploy identity exists.
- [!] Verify least-privilege permissions.
- [ ] Prefer a custom role containing only demonstrated Firebase Security Rules permissions.
- [ ] Use `roles/firebaserules.admin` only as a justified predefined fallback.
- [ ] Do not grant Owner, Editor, Firebase Admin, or service-agent roles to the CI identity.

### 8.5 Controlled deployment

- [x] Workflow remains manually triggered.
- [x] Confirmation input requires `DEPLOY`.
- [ ] Run production-environment validation with required secrets available.
- [ ] Trigger one controlled Rules deployment.
- [ ] Verify Firestore Rules deployment.
- [ ] Verify Storage Rules deployment.
- [ ] Verify authorized application access afterward.
- [ ] Verify unauthorized access remains denied.
- [ ] Keep automatic Rules deployment disabled.

---

## 9. Production-Equivalent RC Smoke Testing

### 9.1 Authentication

- [ ] Sign in.
- [ ] Sign out.
- [ ] Verify protected unauthenticated denial.
- [ ] Verify session persistence after refresh.
- [ ] Verify session behaviour after browser restart.

### 9.2 Projects and navigation

- [ ] Create a project.
- [ ] Edit a project.
- [ ] Switch active project.
- [ ] Refresh and verify active project persistence.
- [ ] Verify mobile links follow the active project.
- [ ] Verify Today, Tasks, Schedule, Materials, and Photos routes.
- [ ] Verify no stale project URLs.

### 9.3 Rooms and people

- [ ] Create, edit, and safely remove or archive a room/area.
- [ ] Verify room isolation between projects.
- [ ] Create and edit a person/team member.
- [ ] Verify helper assignments.
- [ ] Verify person isolation between projects.

### 9.4 Task management

- [ ] Create a task.
- [ ] Edit a task.
- [ ] Set priority, phase, duration, dependencies, material status, dates, helpers, and concurrency.
- [ ] Verify saved values persist after refresh.
- [ ] Verify realistic concurrent-edit stale-write protection.

### 9.5 Today and execution

- [ ] Verify dependency-aware recommendations.
- [ ] Verify completed dependencies are recognized.
- [ ] Verify missing dependencies block work.
- [ ] Verify oversized tasks are skipped while smaller work fits.
- [ ] Verify waiting/curing tasks remain excluded.
- [ ] Verify capacity and protected buffer.
- [ ] Verify in-progress work reserves capacity.
- [ ] Verify over-capacity tasks do not expose Start.
- [ ] Verify Start.
- [ ] Verify Mark Waiting.
- [ ] Verify Resume.
- [ ] Verify Block validation, Cancel, Save, and failure recovery.
- [ ] Verify Clear Blocker.
- [ ] Verify Complete confirmation and failure recovery.
- [ ] Verify no action displays false success.

### 9.6 Photos and files

- [ ] Upload, view, and delete a photo safely.
- [ ] Upload and download a file.
- [ ] Verify unauthorized denial.
- [ ] Verify cross-owner denial.

### 9.7 Runtime quality

- [ ] Verify mobile viewport usability.
- [ ] Verify bottom navigation does not obscure controls.
- [ ] Verify no critical console errors.
- [ ] Verify no repeated network failures.
- [ ] Verify no hydration errors.
- [ ] Verify no uncaught promise rejections.
- [ ] Verify health remains green.
- [ ] Verify Render logs contain no critical runtime errors.

---

## 10. Rollback and Recovery

### 10.1 Git and Codespaces

- [ ] Identify previous known-good commit.
- [ ] Rehearse non-destructive Git rollback without rewriting shared history.
- [x] Verify rescue branches exist.
- [ ] Verify recovery from a bad commit.
- [ ] Create a fresh Codespace from GitHub.
- [ ] Verify dependency installation from lockfile.
- [ ] Verify tests and build in the replacement Codespace.
- [ ] Confirm no critical state exists only in the original Codespace.

### 10.2 Render rollback

- [ ] Select a known successful earlier RC deployment.
- [ ] Verify Render creates the rollback deployment from the intended build artifact.
- [ ] Verify provider event metadata.
- [ ] Verify `/api/health` returns 200 after rollback.
- [ ] Run critical smoke tests after rollback.
- [ ] Verify no new critical log errors.
- [ ] Inspect automatic deploy state.
- [ ] Deliberately restore automatic deploy when appropriate.
- [ ] Redeploy the latest good build and retest.

### 10.3 Firebase Rules rollback

- [ ] Preserve current deployed Firestore Rules before change.
- [ ] Preserve current deployed Storage Rules before change.
- [ ] Record Rules release identifiers where available.
- [ ] Deploy approved current Rules.
- [ ] Verify authorized and denied behaviour.
- [ ] Restore previous Firestore Rules.
- [ ] Restore previous Storage Rules.
- [ ] Repeat authorized and denied tests.
- [ ] Redeploy approved current Rules.
- [ ] Repeat critical tests.

### 10.4 Secret and incident recovery

- [ ] Document Render environment-variable restoration.
- [ ] Document GitHub Actions secret restoration.
- [ ] Document Firebase deploy-credential rotation.
- [ ] Verify documentation contains no secret values.
- [ ] Document failed-deploy recovery.
- [ ] Document incident-response ownership and communication.

---

## 11. Final PR #5 Gate

- [x] Complete mounted Today Planner tests.
- [x] Complete mounted MobileBottomNav tests.
- [ ] Complete Firestore action payload matrix.
- [ ] Pass full local validation.
- [ ] Push exact code-bearing checkpoint.
- [ ] Verify CI on exact code-bearing checkpoint.
- [x] Prepare factual Claude packet.
- [ ] Complete genuine Claude review with no unresolved P0/P1/P2.
- [ ] Complete Render RC deployment.
- [ ] Complete Firebase live verification and controlled deployment.
- [ ] Complete authenticated RC smoke testing.
- [ ] Complete Render rollback.
- [ ] Complete Firebase Rules rollback.
- [ ] Update all evidence records.
- [ ] Confirm all seven categories exceed 95%.
- [ ] Confirm no P0/P1/P2 remains.
- [ ] Confirm PR body is current.
- [ ] Confirm this tracker is current.
- [ ] Mark PR #5 ready for review.
- [ ] Obtain final approval.
- [ ] Merge using the approved method.
- [ ] Verify merge commit.

---

## 12. Final Production Deployment

Required production source:

- Repository: `Leafsrule/renovations-command-center`
- Branch: `main`
- Workspace: `My Workspace`
- Plan: Starter
- Node version: 22
- Health check: `/api/health`

Remaining work:

- [ ] Create or promote final production service.
- [ ] Verify correct repository.
- [ ] Verify branch is `main`.
- [ ] Verify exact merge commit is deployed.
- [ ] Verify build and start.
- [ ] Verify health.
- [ ] Verify Firebase environment variables.
- [ ] Verify Firebase Authentication.
- [ ] Verify Firestore.
- [ ] Verify Storage.
- [ ] Verify logs and restart.
- [ ] Verify rollback.
- [ ] Verify auto-deploy from `main`.
- [ ] Verify operation with Codespace stopped.
- [ ] Repeat critical smoke tests.
- [ ] Record production URL.
- [ ] Record service ID, deployment ID, and exact deployed commit.

---

## 13. Temporary Resource Cleanup and Cost Control

- [ ] Delete temporary RC after production verification.
- [ ] Verify RC deletion.
- [ ] Verify no orphaned paid service remains.
- [ ] Verify no duplicate production service.
- [ ] Verify no unintended Team or Organization workspace.
- [ ] Verify no unintended database, Redis, private service, or cron service.
- [ ] Verify final recurring monthly cost.
- [ ] Record taxes or account-specific charges separately when shown.
- [ ] Confirm unrelated Render services remain unchanged.

---

## 14. Known Limitations Requiring Explicit Release Decisions

### Waiting and curing share one status

- [?] Confirm current user-visible behaviour.
- [ ] Assess scheduling risk.
- [ ] Decide whether acceptable for first release.
- [ ] Document a future state split if deferred.

### No detailed execution audit history

- [?] Confirm current behaviour.
- [ ] Assess accountability and dispute risk.
- [ ] Decide whether acceptable for first release.
- [ ] Define future audit-event model if deferred.

### No advanced time tracking

- [?] Confirm current behaviour.
- [ ] Assess job-costing impact.
- [ ] Decide whether acceptable for first release.
- [ ] Define future scope if deferred.

### Helper availability is not a workforce calendar

- [?] Confirm current behaviour.
- [ ] Assess multi-person scheduling impact.
- [ ] Decide whether acceptable for first release.
- [ ] Define future workforce-calendar integration if deferred.

### Browser-local Today settings

- [?] Identify every browser-local setting.
- [ ] Distinguish harmless preferences from operational state.
- [ ] Assess cross-device inconsistency risk.
- [ ] Move operational settings to Firestore when required.
- [ ] Document accepted local preferences.

---

## 15. Post-Release Backlog

These items are not automatically first-release blockers unless the release decision elevates them.

### Product maturity

- [ ] Detailed execution audit history.
- [ ] Advanced time tracking.
- [ ] Workforce calendar.
- [ ] Separate waiting and curing states.
- [ ] Cloud persistence for operational Today settings.
- [ ] Notifications for blockers, due dates, materials, and dependencies.
- [ ] Richer dashboards.
- [ ] Reporting and export.
- [ ] Labour and cost tracking.
- [ ] Expanded role-based access for collaboration.

### Quality and operations

- [ ] End-to-end browser automation.
- [ ] Scheduled dependency scanning.
- [ ] Uptime monitoring.
- [ ] Production error tracking.
- [ ] Backup and restore drills.
- [ ] Accessibility audit.
- [ ] Performance audit.
- [ ] Mobile-device compatibility matrix.
- [ ] Data-retention policy.
- [ ] Privacy documentation.
- [ ] Incident-response runbook.

---

## 16. Seven-Category Confidence Ledger

| Category | Score | Current evidence state | Required before release |
| --- | ---: | --- | --- |
| A. Application Correctness | 92 | Mounted Today Planner and MobileBottomNav runtime proof exists; RC smoke tests and independent review remain incomplete. | RC smoke tests, independent review. |
| B. Data Integrity and Persistence | 93 | Targeted writes are verified across Start, Resume, Mark Waiting, Complete, Block, and Clear Blocker; rejected-write no-refresh coverage exists. | Provider smoke tests and independent review. |
| C. Security and Access Control | 78 | Rules and workflows exist; live provider state and denial tests unverified. | Firebase identity, least privilege, deployed-rule comparison, authorization tests. |
| D. Automated Quality Assurance | 94 | GitHub Actions run `28213671401` passed with 113 tests on the PR merge candidate for head `ad29eda4f259c65fca4a6859f396d3c8ff150b9b`. | Provider and release-candidate validation. |
| E. Infrastructure and Deployment | 70 | Blueprint and validators pass; no verified RC deployment. | Correct-source RC, health, logs, smoke tests. |
| F. Recovery, Rollback, and Cost Control | 65 | Rescue branches exist; provider rollback and cleanup unproven. | Render/Firebase rollback, Codespace rebuild, RC deletion, billing verification. |
| G. Documentation and Release Governance | 84 | Living records exist and evidence model is corrected; Claude and provider evidence incomplete. | Verified checkpoints, genuine Claude review, complete release record. |

- **Lowest category:** F. Recovery, Rollback, and Cost Control — 65
- **Overall release confidence:** 65
- **Release decision:** `DO NOT RELEASE`

Overall confidence equals the lowest release-critical category. Scores must change only when direct evidence changes.

---

## 17. Mandatory Update Procedure

Every agent or contributor making a material change must:

1. Read this file before work begins.
2. Mark relevant work `[-]` where practical.
3. Add newly discovered work immediately.
4. Mark `[x]` only after implementation and verification.
5. Record blockers with `[!]`.
6. Update the substantive date and evidence baseline where applicable.
7. Update confidence scores only when evidence changes.
8. Keep the release decision accurate.
9. Commit this file with the related material change.
10. Never remove unfinished work to make the project appear complete.

### Definition of complete

An item may be marked `[x]` only when all applicable conditions are met:

- implementation exists;
- appropriate tests exist;
- tests pass;
- CI passes on the exact commit;
- provider state is verified where applicable;
- runtime evidence exists where applicable;
- rollback evidence exists where applicable;
- documentation matches reality;
- no conflicting P0/P1/P2 finding remains.

---

## 18. Final Completion Criteria

This tracker is fully complete only when:

- [ ] Every release-critical item is `[x]`.
- [ ] All seven confidence categories exceed 95%.
- [ ] Genuine Claude review passes on the final code-bearing commit.
- [ ] PR #5 is merged.
- [ ] Production deploys from `main` at the verified merge commit.
- [ ] Production smoke tests pass.
- [ ] Firebase deployment and rollback are verified.
- [ ] Render rollback is verified.
- [ ] Temporary RC is deleted.
- [ ] Billing is verified.
- [ ] The app operates without the Codespace.
- [ ] Known limitations have explicit release decisions.
- [ ] Final production URL, service ID, deployment ID, and merge commit are recorded.
- [ ] This document reflects final production reality.
