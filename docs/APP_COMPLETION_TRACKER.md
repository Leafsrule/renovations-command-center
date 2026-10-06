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

Latest evidence: 139 Vitest + 9 emulator tests passed; lint/typecheck/build and zero-vulnerability audit passed. See `RACP_QA_SECURITY_REVIEW.md` for limitations and exact findings.

Next: close release-critical authoritative-invariant and offline coverage gaps, run real browser/E2E with authorized Firebase test data, verify existing host/backend access, then distinct final QA/security reviews and deployment of the tested commit.
