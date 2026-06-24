# Release Confidence Report

## Scope

This report records the live-Codespace remediation for PR #5 on `infra/remote-first-production`.

The remediation closes P2 findings around Today Planner recommendations, task execution transitions, blocker modal validation, active-project navigation, and Firestore persistence boundaries. It does not change Render provisioning, Firebase deployed rules, GitHub secrets, or either rescue branch.

## Historical Review Disposition

| Source | Finding | Disposition | Evidence |
| --- | --- | --- | --- |
| PR #3 | Today recommendations evaluated dependencies only inside the primary candidate subset. | Fixed by this remediation. | `getTodayPlan` passes the full task universe into the scheduler; regression coverage in `lib/today.test.ts` and `lib/scheduling.test.ts`. |
| PR #3 | Completed dependencies outside the primary candidate subset were treated as incomplete. | Fixed by this remediation. | Full dependency-map tests cover helper-required completed dependencies outside the candidate set. |
| PR #3 | Oversized recommendations stopped later smaller tasks from filling available capacity. | Fixed by this remediation. | Today planning now skips oversized candidates and continues; tests cover one and multiple oversized tasks. |
| PR #3 | `waiting_curing` tasks could re-enter Start First or Do Next. | Fixed by this remediation. | Primary candidates exclude `waiting_curing`; tests verify waiting/curing exclusion. |
| PR #3 | Over-capacity Not Today tasks still displayed Start. | Fixed by this remediation. | Today Planner hides Start when the task carries the remaining-capacity reason; source-contract coverage verifies the UI guard. |
| PR #3 | Quick task actions risked overwriting stale task fields. | Already fixed and now regression-tested. | `executeProjectTaskAction` persists transition updates with targeted Firestore `updateDoc` payloads; persistence-boundary tests verify unrelated fields are excluded. |
| PR #4 | Blocker validation errors escaped into page-level fatal error state. | Fixed by this remediation. | Blocker validation uses modal-local `blockerError`; tests verify separation and clearing. |
| PR #4 | Active-project mobile navigation could retain a stale project id. | Fixed by this remediation. | Active-project changes dispatch a navigation refresh event and navigation links prefer the current active project; route helper tests cover switching and alias behavior. |
| PR #4 | Starting ready tasks did not synchronize readiness fields. | Fixed by this remediation. | Start and resume transitions now persist coherent readiness fields; transition tests cover start, resume, and mark waiting behavior. |

No historical P1 finding is known to remain open in this remediation scope.

## Persistence Boundary Evidence

The tested write path is:

```text
TodayPlanner action
-> evaluateTaskTransition
-> executeProjectTaskAction
-> Firestore updateDoc
-> refreshed task read after successful write
```

Regression tests prove the Firestore update payload contains only intended transition fields plus `updatedAt`. They also verify stale snapshots do not overwrite independently changed `name`, `dependencyTaskIds`, `materialStatus`, `notes`, or `dueDate` fields, and that a permission-denied write rejects without a false refresh.

## Local Validation Evidence

Latest local validation run in the live Codespace:

- `npm ci`: passed before the final gate.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 87 tests.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed; only moderate advisories were reported.
- `npm run validate:production`: passed.
- `npm run validate:render`: passed.
- `npm run validate:firebase`: passed.
- `git diff --check`: passed.

## Remaining External Validation

PR #5 must still pass GitHub Actions on the pushed remediation commit. Render release-candidate and Firebase deployed-rule checks remain outside this code-only remediation until external authorization is resumed.
