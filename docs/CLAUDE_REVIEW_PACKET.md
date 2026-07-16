# Claude Review Packet

## Repository Identity

- Repository: `Leafsrule/renovations-command-center`
- Pull request: PR #5
- Base branch: `main`
- Base SHA: `f053f7f4b1ebd32e61465e60d8a5eddc98323ec2`
- Reviewed branch: `infra/remote-first-production`
- Reviewed application commit: `ad29eda4f259c65fca4a6859f396d3c8ff150b9b`
- PR merge-candidate SHA associated with CI: `ad8f10d98062e5c51f9e492fbb66876d4cdd2aae`
- Release decision at packet creation: `DO NOT RELEASE`

## Material Implementation Areas

- Scheduling remediation: Today recommendations evaluate dependencies against the full task universe, recognize completed dependencies outside the primary candidate subset, continue past oversized tasks, and exclude `waiting_curing` tasks from primary planning.
- Today Planner action handling: Start, Complete, Block, and failure paths are covered by mounted tests where user-visible behavior is expected.
- Modal-local blocker validation: blocker validation and rejected blocker writes remain inside the blocker modal rather than replacing the page with a fatal load error.
- Active-project navigation: mobile bottom navigation refreshes after active-project changes, browser focus, authentication loss, alias routes, and project-list failures.
- Targeted Firestore writes: task execution actions persist targeted `updateDoc` payloads rather than whole stale task snapshots.
- Mounted UI tests: `components/TodayPlanner.mounted.test.tsx` and `components/MobileBottomNav.mounted.test.tsx`.
- Persistence-boundary tests: `lib/tasks.persistence.test.ts`.
- Production infrastructure configuration: `render.yaml`, `/api/health`, production infrastructure validators, and CI gates.
- Firebase Rules and deployment workflow: `firestore.rules`, `storage.rules`, `firebase.json`, and the manual guarded Firebase Rules workflow.

## Test Evidence

- Total tests: 113
- Checkpoint A CI run: `28213671401`
- CI conclusion: `success`
- CI head SHA: `ad29eda4f259c65fca4a6859f396d3c8ff150b9b`
- CI merge-candidate SHA: `ad8f10d98062e5c51f9e492fbb66876d4cdd2aae`
- CI job: `validate`
- CI verified steps: checkout, Node 22 setup, `npm ci`, patch whitespace check, lint, typecheck, production infrastructure validation, Render Blueprint validation, Firebase configuration validation, production build, high-severity npm audit, and tests.

### Mounted Today Planner Scenarios

- Planner renders.
- Blocker modal opens for the selected task.
- Invalid blocker submission keeps the modal open.
- Validation appears inside the modal and does not replace the planner with the page-level fatal error view.
- Correcting blocker type, notes, and blocked-until date clears modal validation.
- Cancel closes the modal and performs no persistence action.
- Successful blocker save performs one intended `block` action.
- Rejected blocker save leaves the modal usable and does not display false success.
- Over-capacity Not Today task does not render Start.
- Capacity-eligible task renders Start.
- Clicking Start invokes exactly one intended `start` action with the selected task and project context, then refreshes tasks.
- Complete requires confirmation.
- Cancelling Complete writes nothing.
- Rejected Complete remains recoverable and does not falsely update visible state.

### Mounted MobileBottomNav Scenarios

- Project A appears in project-specific links initially.
- Active-project change to project B updates links without reload.
- Old project A URLs disappear after switching.
- Custom active-project event refreshes links.
- Browser focus refresh retrieves the current active project.
- Today, Tasks, Schedule, Materials, and Photos use the active project.
- No-active-project state links safely to `/projects`.
- Active-project aliases do not create redirect loops.
- Authentication loss clears project-specific navigation safely.
- Project-list failures do not preserve unsafe stale links.

### Firestore Payload Matrix

- Start: exact payload verified and unrelated fields absent.
- Resume: exact payload verified and unrelated fields absent.
- Mark Waiting: exact payload verified and unrelated fields absent.
- Complete: exact payload verified and unrelated fields absent.
- Block: exact blocker/transition payload verified and unrelated fields absent.
- Clear Blocker: exact blocker-clearing/readiness payload verified and unrelated fields absent.
- Rejected writes: permission-denied failures propagate and do not perform refresh reads for Start, Resume, Complete, Block, and Clear Blocker.

### Local Validation Commands

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- `npm run validate:production`
- `npm run validate:render`
- `npm run validate:firebase`
- `git diff --check`

## Historical Review Targets

- PR #3 dependency-subset finding: implemented and regression-tested.
- PR #3 completed dependency outside candidate subset finding: implemented and regression-tested.
- PR #3 oversized task capacity finding: implemented and regression-tested.
- PR #3 waiting/curing primary-planning finding: implemented and regression-tested.
- PR #3 over-capacity Start visibility finding: implemented and mounted-tested.
- PR #3 stale quick-action overwrite finding: targeted persistence implemented and action payload matrix tested.
- PR #4 blocker modal validation finding: implemented and mounted-tested.
- PR #4 mobile active-project navigation finding: implemented and mounted-tested.
- PR #4 readiness synchronization finding: implemented and unit-tested.

## Security-Review Target

Assess the following without assuming the intended verdict:

> Firestore project updates are authorized using the existing `resource.data.ownerUserId`, but the current rule does not explicitly require `request.resource.data.ownerUserId` to remain unchanged. Determine whether ownership transfer is intended, whether this creates an authorization or integrity concern, and whether an immutability rule and regression tests are required.

Do not treat this packet as authorization to change or deploy Firebase Rules.

## External-State Limitations

The following remain unverified:

- Render live workspace and repository authorization.
- Render release-candidate service and deployment.
- Firebase live project identity.
- Firebase Authentication providers.
- Firebase authorized domains.
- Deployed Firestore and Storage Rules.
- CI deploy secrets and IAM.
- Smoke tests.
- Rollback.
- Billing.
- Temporary-resource cleanup.

## Remaining Governance Work

- Invoke a genuine Claude review path.
- Record and preserve the Claude review result.
- Route any material P0/P1/P2 findings back through implementation, validation, CI, and another review cycle.
- Complete Render provider verification.
- Complete Firebase provider verification.
- Complete deployment, smoke testing, rollback, cleanup, and billing verification.
