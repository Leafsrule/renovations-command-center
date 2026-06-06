# Phase 1 Decisions

- App type: Next.js mobile-first PWA.
- Auth: Firebase email/password only.
- Deployment: run locally first; prepare for Firebase Hosting later.
- Users: Owner is the only authenticated user in Phase 1.
- People: champions and helpers are lightweight records with optional future `linkedUserId`.
- Projects: database supports multiple projects; UI can focus on one active project first.
- Overrides: every Owner override requires a typed reason and audit log entry.
- Schedule: readiness updates automatically; full recalculation runs only from Owner action and updates task dates plus Today order.
- Critical path: simple risk indicator only; no full CPM, float/slack, advanced Gantt, or AI scheduling.
- Photos: optional by default; task completion is blocked when `photosRequired = true` unless Owner override is logged.
- Costs: store material cost data, show it only on material detail screens, no budget reporting in Phase 1.
- Tools: keep schema-ready only; do not build full tool tracker in Phase 1.
- AI: no AI features in Phase 1; keep future suggestion architecture in mind.
