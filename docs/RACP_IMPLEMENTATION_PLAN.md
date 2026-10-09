# RACP Rev02 execution plan

Date: 2026-10-06. Base: 37a83fb. Branch: racp/rev02-completion.

## Architecture and boundaries

Renovations Command Center is the Next.js/React/TypeScript app. The revised target retains Firebase Authentication/Firestore on Spark and replaces Firebase Cloud Storage with private Supabase Free storage. This storage adaptation is planned, not implemented. `FREE_SERVICE_PLAN.md` is the current infrastructure plan and supersedes all billing-upgrade instructions. It will own `apps/renovations-command-center`, its manifest, lockfile, configuration, tests, environment and private operational data. Site Control is the independent static app at `docs/site-control`; its HTML, JSON, browser settings and Pages URL stay there. No cross-app data migration. No paid resources, billing accounts or automatic overages are permitted. Free provider resources have not yet been provisioned; availability and secure account access must be verified before deployment.

## Reconciliation

Select infrastructure branch navigation/planner fixes and regression tests, not its stale release certifications. Select Favorite schedule/material views and projections. Preserve Site Control byte-for-byte and preserve all existing branch history. Configure independent CI.

## Implementation order

1. Separate app roots and verify tracker parity and core commands.
2. Repair prerequisite semantics, conservative defaults, execution bypasses and ownership rules.
3. Persist calendar/settings and implement deterministic recalculation.
4. Add task-linked material/tool records, evidence and QC.
5. Add measurements/decisions, exports/templates/recovery and durable offline/conflict handling.
6. Run mounted/UI/integration and rules checks, distinct QA and Security review passes, then deploy only if actual hosting/backend resources and all gates are verified.

## Requirements matrix

| Scope | Existing implementation | Remaining acceptance evidence |
|---|---|---|
| A Projects/rooms | projects.ts, rooms.ts, project forms | edit/archive/reopen/settings |
| B Tasks/people | tasks.ts, people.ts, TaskManager | guarded edits, logs, invariants |
| C Today | today.ts, TodayPlanner | defaults, dependency/resource/cure checks |
| D Planning | scheduling.ts; Favorite board | persisted calendar, recalculation, views |
| E Materials/tools | task fields; Favorite projection | editable structured records, tool checks |
| F Evidence/QC | photos placeholder | private upload, authoritative completion guard |
| G Measurements/decisions | absent | input validation, revisions, approvals |
| H Reliability | partial write/read flow | restart durability, conflict/retry/auth tests, PWA |
| I Recovery | absent | templates, print, validated import/export/restore |

## Release boundary and review mode

A–I are required. AI, billing, workforce logins, full CPM, push and Google integrations remain optional. Separate specialist review passes are used; no external or independent-agent approval is claimed. Existing PR #5 genuine Claude/provider review gates remain unresolved unless actually performed. No production completion is implied by this plan.
