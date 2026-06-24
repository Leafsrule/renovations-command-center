# Renovations Command Center — Living App Completion Tracker

> **Purpose:** This file is the authoritative, continuously maintained record of everything that remains to be completed before the app can be considered production-ready, safely deployed, and operationally complete.
>
> **Maintenance rule:** Every material code change, test addition, provider configuration change, deployment event, review finding, rollback rehearsal, accepted limitation, or scope decision must update this file in the same commit or pull request.

---

## 1. Document Control

- **Repository:** `Leafsrule/renovations-command-center`
- **Current working branch:** `infra/remote-first-production`
- **Current pull request:** PR #5 — `infra: add remote-first Render production foundation`
- **Current verified PR head at tracker creation:** `e2208f78f8e191a9a2368c8c32d1b45e02686786`
- **Production branch:** `main`
- **Primary Codespace:** `musical fishstick`
- **Expected workspace:** `/workspaces/renovations-command-center`
- **Last updated:** 2026-06-24
- **Document owner:** Autonomous Release-Hardening Supervisor
- **Update requirement:** Mandatory with every material change

### Status legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Completed and verified
- `[!]` Blocked by a human-only action or external provider
- `[~]` Accepted limitation or deferred item
- `[?]` Requires revalidation

### Release-critical rule

The app must not proceed to paid Render provisioning, Firebase rules deployment, PR-ready status, merge, or final production deployment until every release-critical item in Sections 3 through 12 is complete and independently verified.

---

## 2. Current Verified Baseline

### Completed foundation

- [x] GitHub is the authoritative source of truth for code, infrastructure, tests, documentation, CI, and recovery history.
- [x] Render is defined as the sole production web host.
- [x] Firebase is defined as backend-only for Authentication, Firestore, Storage, and security rules.
- [x] GitHub Codespaces is treated as replaceable development infrastructure.
- [x] Core scheduling engine exists.
- [x] Today Planner exists.
- [x] Task execution and blocker workflow exist.
- [x] Active-project routing exists.
- [x] Mobile navigation exists.
- [x] CI workflow exists and passes on the current verified head.
- [x] Render Blueprint exists.
- [x] Firebase rule files and deployment workflow exist.
- [x] `/api/health` endpoint exists.
- [x] Production validation scripts exist.
- [x] P2 remediation checkpoint was committed and pushed.
- [x] 87 automated tests passed at the current verified checkpoint.
- [x] `npm ci`, lint, typecheck, test, build, audit, production validation, Render validation, Firebase validation, and `git diff --check` passed at the current verified checkpoint.

### Current release state

- [x] PR #5 remains open.
- [x] PR #5 remains draft.
- [x] PR #5 remains unmerged.
- [x] PR #5 is currently mergeable.
- [x] No paid Render resource was created by the latest remediation.
- [x] No Firebase rule was deployed by the latest remediation.
- [x] No GitHub secret was created or modified by the latest remediation.
- [x] Rescue branches remain protected and untouched.

---

## 3. Immediate Pre-Deployment Hardening

### 3.1 Behavioural component testing

- [ ] Replace or supplement source-text assertions in `components/TodayPlanner.behavior.test.ts` with mounted runtime behavioural tests.
- [ ] Add a DOM-based test environment using an appropriate React testing library.
- [ ] Verify Today Planner renders successfully.
- [ ] Verify blocker modal opens for the selected task.
- [ ] Verify invalid blocker submission keeps the modal open.
- [ ] Verify blocker validation appears inside the modal.
- [ ] Verify blocker validation does not trigger the page-level fatal error screen.
- [ ] Verify correcting blocker type clears the modal validation error.
- [ ] Verify correcting blocker notes clears the modal validation error.
- [ ] Verify correcting blocked-until date clears the modal validation error.
- [ ] Verify closing the modal clears modal-only validation state.
- [ ] Verify Cancel performs no persistence write.
- [ ] Verify successful blocker save performs exactly one targeted write.
- [ ] Verify rejected blocker persistence keeps the modal usable.
- [ ] Verify rejected blocker persistence does not display false success.
- [ ] Verify over-capacity Not Today tasks do not render Start.
- [ ] Verify capacity-eligible tasks render Start.
- [ ] Verify Start performs the intended targeted persistence update.
- [ ] Verify Complete requires explicit confirmation.
- [ ] Verify failed Complete does not falsely update visible state.

### 3.2 Mobile navigation runtime testing

- [ ] Add mounted or integration-level tests for `MobileBottomNav`.
- [ ] Verify project A is reflected in navigation links initially.
- [ ] Verify switching to project B updates all relevant navigation links without reloading.
- [ ] Verify old project IDs disappear after switching.
- [ ] Verify focus refresh reloads the active project.
- [ ] Verify `/projects/active/...` aliases resolve safely.
- [ ] Verify no redirect loop occurs.
- [ ] Verify no-active-project behaviour is safe.
- [ ] Verify Today link uses the active project.
- [ ] Verify Tasks link uses the active project.
- [ ] Verify Schedule link uses the active project.
- [ ] Verify Materials link uses the active project.
- [ ] Verify Photos link uses the active project.

### 3.3 Persistence-boundary verification

- [ ] Verify actual Firestore payloads for Start.
- [ ] Verify actual Firestore payloads for Resume.
- [ ] Verify actual Firestore payloads for Mark Waiting.
- [ ] Verify actual Firestore payloads for Complete.
- [ ] Verify actual Firestore payloads for Block.
- [ ] Verify actual Firestore payloads for Clear Blocker.
- [ ] Verify unrelated `name` fields are excluded from quick-action writes.
- [ ] Verify unrelated `notes` fields are excluded from quick-action writes.
- [ ] Verify unrelated dependency fields are excluded from quick-action writes.
- [ ] Verify unrelated material fields are excluded from quick-action writes.
- [ ] Verify unrelated date fields are excluded from quick-action writes.
- [ ] Verify unrelated duration fields are excluded from quick-action writes.
- [ ] Verify unrelated room-assignment fields are excluded from quick-action writes.
- [ ] Verify unrelated priority fields are excluded from quick-action writes.
- [ ] Verify permission-denied writes reject safely.
- [ ] Verify failed writes do not trigger false refresh.
- [ ] Verify failed writes do not trigger false success state.
- [ ] Verify stale snapshots cannot overwrite newer independent edits.

### 3.4 Regression closure for historical findings

- [x] Dependency recommendations use the complete task universe.
- [x] Completed dependencies outside the candidate subset are recognized.
- [x] Oversized tasks no longer prevent smaller later tasks from filling capacity.
- [x] `waiting_curing` tasks are excluded from primary scheduling.
- [x] Over-capacity tasks no longer show Start.
- [x] Quick actions use targeted persistence writes.
- [x] Blocker validation uses modal-local state.
- [x] Mobile navigation refreshes when active project changes.
- [x] Start and Resume synchronize readiness fields.
- [ ] Resolve or formally close the historical PR #3 review threads with evidence.
- [ ] Resolve or formally close the historical PR #4 review threads with evidence.

---

## 4. Independent Review Requirements

### 4.1 Genuine Claude review

- [!] Establish a genuine Claude invocation path.
- [ ] Verify whether an approved Claude connector is available.
- [ ] Verify whether Claude Code is available and authenticated.
- [ ] Verify whether Claude CLI is available and authenticated.
- [ ] Verify whether a securely stored Claude API credential is available without exposing it.
- [ ] Create or update `docs/CLAUDE_REVIEW_PACKET.md`.
- [ ] Ensure the review packet references the exact current commit.
- [ ] Include the exact PR diff in the review packet or invocation context.
- [ ] Exclude Codex confidence conclusions from the Claude input.
- [ ] Obtain a preserved Claude verdict: `PASS`, `CONDITIONAL PASS`, or `FAIL`.
- [ ] Record Claude invocation method.
- [ ] Record exact commit reviewed by Claude.
- [ ] Record every Claude P1 finding.
- [ ] Record every Claude P2 finding.
- [ ] Route all Claude P1/P2 findings to Codex.
- [ ] Add regression tests for every confirmed finding.
- [ ] Push corrections.
- [ ] Re-run CI.
- [ ] Re-run Claude review after every material correction.
- [ ] Complete the gate with no unresolved P1/P2 findings.

### 4.2 Supervisor verification

- [ ] Independently verify Codex’s final implementation claims.
- [ ] Independently verify exact PR head.
- [ ] Independently verify CI on exact PR head.
- [ ] Independently verify review-thread status.
- [ ] Independently verify release evidence files.
- [ ] Independently verify no secret-bearing files are tracked.
- [ ] Independently verify no TDSB repository reference is introduced.

---

## 5. Release Evidence and Governance

### 5.1 `docs/RELEASE_CONFIDENCE_REPORT.md`

- [ ] Update exact commit SHA.
- [ ] Update exact base SHA.
- [ ] Update CI run ID.
- [ ] Update CI conclusion.
- [ ] Remove any stale statement that CI is still pending.
- [ ] Add behavioural component-test evidence.
- [ ] Add mobile-navigation runtime-test evidence.
- [ ] Add persistence failure-path evidence.
- [ ] Add Claude invocation method and verdict.
- [ ] Add Render state.
- [ ] Add Firebase state.
- [ ] Add release-candidate state.
- [ ] Add rollback state.
- [ ] Add seven-category confidence scores.
- [ ] Add the lowest category score.
- [ ] Add explicit release decision.
- [ ] Add all accepted limitations.
- [ ] Add remaining non-blocking work.

### 5.2 `docs/release-confidence.json`

- [ ] Add schema version.
- [ ] Add ISO 8601 timestamp.
- [ ] Add repository identifier.
- [ ] Add PR number.
- [ ] Add branch.
- [ ] Add exact commit SHA.
- [ ] Add exact base SHA.
- [ ] Add CI run ID.
- [ ] Add CI conclusion.
- [ ] Add seven category scores.
- [ ] Add lowest category score.
- [ ] Add overall confidence.
- [ ] Add open deficiency list.
- [ ] Add test commands and outcomes.
- [ ] Add Claude invocation method.
- [ ] Add Claude verdict.
- [ ] Add Render verification status.
- [ ] Add Firebase verification status.
- [ ] Add rules deployment status.
- [ ] Add release-candidate status.
- [ ] Add rollback status.
- [ ] Add production status.
- [ ] Add temporary-resource status.
- [ ] Add explicit release decision.

### 5.3 Living-document maintenance

- [x] Create this file as the living completion tracker.
- [ ] Add a repository rule or documented policy requiring this file to be updated with every material change.
- [ ] Require Codex to update this tracker in every implementation prompt.
- [ ] Require GPT Agent Mode to verify this tracker before closing any task.
- [ ] Require Claude to flag stale tracker content during independent review.
- [ ] Add this tracker to the PR checklist or contribution workflow.

---

## 6. Render Repository and Authorization Repair

### 6.1 GitHub-to-Render integration

- [!] Verify Render is authenticated in the current Codespace.
- [!] Verify Render is connected to the correct GitHub account.
- [!] Verify Render GitHub App access includes `Leafsrule/renovations-command-center`.
- [!] Remove or avoid use of `Leafsrule/tdsb-fight-back-lap` as an app source.
- [!] Verify repository-scoped access is used where possible.
- [!] Verify `infra/remote-first-production` is visible to Render.
- [!] Verify Render can select the exact infrastructure branch.
- [!] Verify Render no longer silently reverts the RC branch to `main`.
- [!] Verify the two unrelated existing Render services remain untouched.

### 6.2 Release-candidate source integrity

The release-candidate service must use exactly:

- Workspace: `My Workspace`
- Repository: `Leafsrule/renovations-command-center`
- Branch: `infra/remote-first-production`
- Service name: `renovations-command-center-rc`
- Runtime: Node
- Node version: 22
- Plan: Starter
- Build command: `npm ci && npm run build`
- Start command: `npm run start -- -H 0.0.0.0 -p $PORT`
- Health check: `/api/health`

Remaining work:

- [!] Verify all source metadata through Render CLI, API, or dashboard.
- [!] Verify the recurring Starter cost before approval.
- [!] Obtain explicit human payment approval only after metadata is correct.
- [!] Enter payment information only in Render.
- [ ] Create no more than one RC service.
- [ ] Record RC service ID.
- [ ] Record RC service URL.
- [ ] Record exact deployed commit SHA.
- [ ] Verify unrelated Render services are unchanged.

---

## 7. Render Release-Candidate Deployment

- [ ] Trigger RC build from `infra/remote-first-production`.
- [ ] Verify build uses Node 22.
- [ ] Verify `npm ci` succeeds in Render.
- [ ] Verify `npm run build` succeeds in Render.
- [ ] Verify start command succeeds.
- [ ] Verify service reaches healthy state.
- [ ] Verify `/api/health` returns HTTP 200.
- [ ] Verify `/api/health` returns only minimal health data.
- [ ] Verify application homepage loads.
- [ ] Verify no secret values appear in Render logs.
- [ ] Verify deploy logs are accessible.
- [ ] Verify service restart is accessible.
- [ ] Verify rollback controls are accessible.
- [ ] Record deployment ID.
- [ ] Record exact deployed commit SHA.
- [ ] Record deployment timestamp.

---

## 8. Render Environment Variables

Securely configure in Render:

- [!] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [!] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [!] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [!] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [!] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [!] `NEXT_PUBLIC_FIREBASE_APP_ID`

Verification requirements:

- [ ] Confirm all six variables exist in the RC service.
- [ ] Confirm values are entered only through approved provider surfaces.
- [ ] Confirm no values are committed to GitHub.
- [ ] Confirm no values are printed in logs.
- [ ] Confirm build and runtime can access required values.
- [ ] Confirm environment variables are copied safely to final production service later.

---

## 9. Firebase Production Verification

### 9.1 Firebase project and products

- [!] Verify the exact Renovations Command Center Firebase project.
- [!] Verify Firebase Authentication is enabled.
- [!] Verify required sign-in providers are configured.
- [!] Verify Firestore is enabled.
- [!] Verify Firebase Storage is enabled.
- [!] Verify the Render RC domain is authorized for Authentication.
- [ ] Verify the final production Render domain is authorized after production deployment.

### 9.2 Firestore rules

- [!] Retrieve currently deployed Firestore rules.
- [!] Compare deployed rules with repository `firestore.rules`.
- [ ] Document all differences.
- [ ] Correct differences only after review.
- [ ] Verify owner-scoped access.
- [ ] Verify unauthorized users are denied.
- [ ] Verify authenticated users cannot access another owner’s data.
- [ ] Verify project, room, person, task, and related document rules behave correctly.

### 9.3 Storage rules

- [!] Retrieve currently deployed Storage rules.
- [!] Compare deployed rules with repository `storage.rules`.
- [ ] Document all differences.
- [ ] Correct differences only after review.
- [ ] Verify owner-scoped file access.
- [ ] Verify unauthorized reads are denied.
- [ ] Verify unauthorized writes are denied.
- [ ] Verify cross-owner access is denied.
- [ ] Verify valid photo and file uploads succeed.

### 9.4 Deployment identity and GitHub secrets

- [!] Verify `FIREBASE_PROJECT_ID` GitHub Actions secret.
- [!] Verify `FIREBASE_SERVICE_ACCOUNT` GitHub Actions secret.
- [!] Verify all six Firebase browser-variable GitHub Actions secrets where required.
- [!] Verify the Firebase deploy identity exists.
- [!] Verify deploy identity permissions are least-privilege.
- [!] Verify credentials are not stored in the repository.
- [ ] Run production environment validation with secrets available.
- [ ] Record secret presence without recording values.

### 9.5 Manual Firebase rules deployment

- [ ] Confirm workflow remains `workflow_dispatch` only.
- [ ] Confirm exact confirmation input remains `DEPLOY`.
- [ ] Trigger one controlled manual deployment.
- [ ] Verify Firestore rules deployment succeeds.
- [ ] Verify Storage rules deployment succeeds.
- [ ] Verify application access still works after deployment.
- [ ] Verify unauthorized access remains denied.
- [ ] Keep automatic deployment disabled.

---

## 10. Production-Equivalent Smoke Testing

Run on the RC service.

### Authentication

- [ ] Sign in successfully.
- [ ] Sign out successfully.
- [ ] Verify unauthenticated access is denied where required.
- [ ] Verify session persistence after refresh.
- [ ] Verify session behaviour after browser restart.

### Project management

- [ ] Create a project.
- [ ] Edit a project.
- [ ] Switch active project.
- [ ] Refresh and verify active project persists.
- [ ] Verify mobile navigation follows the new active project.

### Room and area management

- [ ] Create room/area.
- [ ] Edit room/area.
- [ ] Delete or archive room/area safely.
- [ ] Verify cross-project isolation.

### People and team management

- [ ] Create person/team member.
- [ ] Edit person/team member.
- [ ] Assign helper requirements.
- [ ] Verify cross-project isolation.

### Task management

- [ ] Create task.
- [ ] Edit task.
- [ ] Set priority.
- [ ] Set phase.
- [ ] Set duration.
- [ ] Set dependencies.
- [ ] Set material status.
- [ ] Set earliest start date.
- [ ] Set due date.
- [ ] Set helper requirement.
- [ ] Set concurrent-work flag.
- [ ] Verify stale-write protection in a realistic multi-edit scenario.

### Today Planner and execution

- [ ] Verify dependency-aware recommendations.
- [ ] Verify completed dependencies are recognized.
- [ ] Verify missing dependencies block work.
- [ ] Verify oversized tasks are skipped while smaller tasks fit.
- [ ] Verify waiting/curing tasks remain excluded from primary planning.
- [ ] Verify capacity and buffer calculations.
- [ ] Verify current in-progress work reserves capacity.
- [ ] Verify over-capacity tasks do not show Start.
- [ ] Verify Start.
- [ ] Verify Mark Waiting.
- [ ] Verify Resume.
- [ ] Verify Block.
- [ ] Verify blocker validation.
- [ ] Verify blocker Cancel.
- [ ] Verify blocker Save.
- [ ] Verify Clear Blocker.
- [ ] Verify Complete confirmation.
- [ ] Verify failed actions do not report false success.

### Navigation and mobile

- [ ] Verify Today navigation.
- [ ] Verify Tasks navigation.
- [ ] Verify Schedule navigation.
- [ ] Verify Materials navigation.
- [ ] Verify Photos navigation.
- [ ] Verify mobile viewport usability.
- [ ] Verify bottom navigation does not overlap critical controls.
- [ ] Verify no stale project links.

### Photos and files

- [ ] Upload photo.
- [ ] View photo.
- [ ] Delete photo safely.
- [ ] Upload file.
- [ ] Download file.
- [ ] Verify unauthorized access denial.
- [ ] Verify cross-owner denial.

### Runtime quality

- [ ] Verify no critical browser-console errors.
- [ ] Verify no repeated network failures.
- [ ] Verify no hydration errors.
- [ ] Verify no uncaught promise rejections.
- [ ] Verify health endpoint remains healthy during testing.
- [ ] Verify Render logs show no critical runtime error.

---

## 11. Rollback and Recovery

### Git and branch recovery

- [ ] Verify previous known-good commit.
- [ ] Verify rollback procedure without rewriting shared history.
- [ ] Verify rescue branch integrity.
- [ ] Verify recovery from an accidental bad commit.

### Render rollback

- [ ] Perform a non-destructive rollback rehearsal on the RC service.
- [ ] Verify rollback selects the expected prior deployment.
- [ ] Verify service returns healthy after rollback.
- [ ] Verify re-deployment of the latest good commit.
- [ ] Document rollback timing and steps.

### Firebase rules rollback

- [ ] Preserve the previously deployed Firestore rules.
- [ ] Preserve the previously deployed Storage rules.
- [ ] Perform a controlled Firestore rules rollback rehearsal.
- [ ] Perform a controlled Storage rules rollback rehearsal.
- [ ] Verify app access after rollback.
- [ ] Verify unauthorized denial after rollback.

### Codespace replacement

- [ ] Verify the project can be rebuilt from GitHub in a fresh Codespace.
- [ ] Verify no critical state exists only in the current Codespace.
- [ ] Verify dependency installation from lockfile.
- [ ] Verify tests and build in the replacement environment.

### Secret recovery

- [ ] Document how Render secrets are restored.
- [ ] Document how GitHub Actions secrets are restored.
- [ ] Document how Firebase deploy credentials are rotated.
- [ ] Confirm no secret values are stored in documentation.

---

## 12. Final PR #5 Completion

- [ ] Complete all behavioural test hardening.
- [ ] Complete genuine Claude review.
- [ ] Complete release evidence updates.
- [ ] Complete Render RC deployment.
- [ ] Complete Firebase verification.
- [ ] Complete smoke testing.
- [ ] Complete rollback rehearsals.
- [ ] Confirm all seven confidence categories exceed 95%.
- [ ] Confirm no open P1 finding.
- [ ] Confirm no open P2 finding.
- [ ] Confirm CI green on exact final head.
- [ ] Confirm PR body is current.
- [ ] Confirm this tracker is current.
- [ ] Mark PR #5 ready for review.
- [ ] Obtain final review approval.
- [ ] Merge PR #5 using the approved merge method.
- [ ] Verify merge commit.

---

## 13. Final Production Deployment

The final production service must use:

- Repository: `Leafsrule/renovations-command-center`
- Branch: `main`
- Workspace: `My Workspace`
- Plan: Starter
- Node version: 22
- Health check: `/api/health`

Remaining work:

- [ ] Create or promote the final production service.
- [ ] Verify repository is correct.
- [ ] Verify branch is `main`.
- [ ] Verify exact merge commit is deployed.
- [ ] Verify build succeeds.
- [ ] Verify service starts.
- [ ] Verify health endpoint.
- [ ] Verify Firebase environment variables.
- [ ] Verify Firebase Authentication.
- [ ] Verify Firestore.
- [ ] Verify Storage.
- [ ] Verify logs.
- [ ] Verify restart.
- [ ] Verify rollback.
- [ ] Verify auto-deploy from `main`.
- [ ] Verify operation with the Codespace stopped.
- [ ] Repeat critical smoke tests.
- [ ] Record production URL.
- [ ] Record production service ID.
- [ ] Record exact deployed commit.

---

## 14. Temporary Resource Cleanup and Cost Control

- [ ] Delete the temporary RC service after production verification.
- [ ] Verify RC service deletion.
- [ ] Verify no orphaned paid service remains.
- [ ] Verify no duplicate production service exists.
- [ ] Verify no paid Team or Organization workspace exists.
- [ ] Verify no unintended database exists.
- [ ] Verify no unintended Redis service exists.
- [ ] Verify no unintended private service exists.
- [ ] Verify no unintended cron job exists.
- [ ] Verify final recurring monthly cost.
- [ ] Record taxes or account-specific charges separately if shown.

---

## 15. Known Limitations Requiring Release Decision

### Waiting and curing share one status

- [?] Confirm current behaviour.
- [ ] Assess user impact.
- [ ] Assess scheduling risk.
- [ ] Decide whether acceptable for first release.
- [ ] Document future split between waiting and curing if deferred.

### No detailed execution audit history

- [?] Confirm current behaviour.
- [ ] Assess accountability and dispute risk.
- [ ] Decide whether acceptable for first release.
- [ ] Define future audit-event model if deferred.

### No advanced time tracking

- [?] Confirm current behaviour.
- [ ] Assess job-costing impact.
- [ ] Decide whether acceptable for first release.
- [ ] Define future time-tracking scope if deferred.

### Helper availability is not a workforce calendar

- [?] Confirm current behaviour.
- [ ] Assess multi-person scheduling impact.
- [ ] Decide whether acceptable for first release.
- [ ] Define future workforce-calendar integration if deferred.

### Browser-local Today settings

- [?] Confirm which settings remain browser-local.
- [ ] Assess cross-device inconsistency risk.
- [ ] Decide which settings must move to Firestore before release.
- [ ] Document accepted local preferences versus operational settings.

---

## 16. Post-Release Follow-Up Work

These items are not automatically release blockers unless the release decision marks them critical.

### Product maturity

- [ ] Add detailed execution audit history.
- [ ] Add advanced time tracking.
- [ ] Add workforce calendar.
- [ ] Separate waiting and curing states.
- [ ] Move operational Today settings to cloud persistence.
- [ ] Add notifications for blockers, due dates, materials, and dependencies.
- [ ] Add richer project dashboards.
- [ ] Add reporting and export features.
- [ ] Add labour and cost tracking.
- [ ] Add role-based access if multi-user collaboration expands.

### Quality and operations

- [ ] Add end-to-end browser automation.
- [ ] Add scheduled dependency scanning.
- [ ] Add uptime monitoring.
- [ ] Add production error tracking.
- [ ] Add backup and restore drills.
- [ ] Add accessibility audit.
- [ ] Add performance audit.
- [ ] Add mobile-device compatibility matrix.
- [ ] Add data-retention policy.
- [ ] Add privacy documentation.
- [ ] Add incident-response runbook.

---

## 17. Seven-Category Confidence Ledger

Scores must be evidence-based and updated whenever the system changes.

| Category | Current status | Current score | Required before release |
| --- | --- | ---: | --- |
| A. Application Correctness | P2 logic remediation complete; behavioural UI evidence incomplete | 90 | Mounted behavioural tests, smoke tests, Claude review |
| B. Data Integrity and Persistence | Targeted payload tests exist; full runtime failure verification incomplete | 91 | Complete persistence-boundary and rejected-write coverage |
| C. Security and Access Control | Repository rules exist; deployed provider state unverified | 78 | Firebase project, rules, secrets, least privilege, denial tests |
| D. Automated Quality Assurance | 87 tests and CI pass; component tests need stronger behavioural proof | 92 | Mounted UI tests, independent review, final CI |
| E. Infrastructure and Deployment | Config exists; Render source integrity and RC deployment unverified | 70 | Correct repo/branch, RC deploy, health, logs, smoke tests |
| F. Recovery, Rollback, and Cost Control | Plans exist; rehearsals and cleanup not complete | 65 | Render/Firebase rollback, Codespace rebuild, RC deletion |
| G. Documentation and Release Governance | Evidence docs exist; Claude and provider evidence incomplete | 84 | Current reports, Claude record, provider evidence, release decision |

- **Current lowest category:** F. Recovery, Rollback, and Cost Control
- **Current overall release confidence:** 65
- **Release decision:** `DO NOT RELEASE`

> Update these scores only when direct evidence changes. Overall confidence must always equal the lowest release-critical category.

---

## 18. Mandatory Update Procedure

Every agent or contributor making a material change must:

1. Read this file before beginning work.
2. Mark relevant items `[-]` before implementation where practical.
3. Update completed items to `[x]` only after verification.
4. Add newly discovered work immediately.
5. Record new blockers with `[!]`.
6. Update exact commit and date.
7. Update the confidence ledger.
8. Update the release decision.
9. Commit this file in the same commit or PR as the related change.
10. Never remove incomplete work merely to make the checklist appear complete.

### Definition of complete

An item may be marked `[x]` only when:

- implementation exists;
- tests exist where applicable;
- tests pass;
- CI passes where applicable;
- provider state is verified where applicable;
- evidence is recorded;
- no conflicting finding remains.

---

## 19. Final Completion Criteria

This tracker may be considered fully complete only when:

- [ ] Every release-critical item is `[x]`.
- [ ] All seven confidence categories exceed 95%.
- [ ] Genuine Claude review passes.
- [ ] PR #5 is merged.
- [ ] Production deploys from `main`.
- [ ] Production smoke tests pass.
- [ ] Firebase rules and rollback are verified.
- [ ] Render rollback is verified.
- [ ] Temporary RC service is deleted.
- [ ] Billing is verified.
- [ ] App operates without the Codespace.
- [ ] Known limitations have explicit release decisions.
- [ ] Final production URL and merge commit are recorded.
- [ ] This document reflects the final production state.
