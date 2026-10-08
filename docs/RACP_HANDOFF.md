# RACP continuation handoff

Status: IN PROGRESS / EXTERNALLY BLOCKED. No production app completion is claimed.

Repository: Leafsrule/renovations-command-center
Branch: racp/rev02-completion
Base: 37a83fb9ada89a05a43b0a01acdcccce3dd9a787
Local isolation checkpoint: cb92f5e (retained in racp/local-checkpoint-20261006).
Original October 6 application candidate: 4a7177772fb71998b7629d3ff0e5f744f4ec0e34
Latest application increment: October 8 trusted mutations/queues; inspect branch HEAD and tracker for the published commit.
Draft PR: https://github.com/Leafsrule/renovations-command-center/pull/8
Published tree: a555f0098687aca5414e1ff0a01ee36a035fd023 (identical to locally tested tree).
October 8 includes material application changes; the October 6 tree above is historical, not the current candidate.

CLI git push had no HTTPS credentials. The authorized GitHub connector published the identical tree; remote content was fetched and compared successfully. Continue via the connector or an already authorized git credential. Do not force-push to reconcile local/remote author metadata.

## Resume without restarting

Read `APP_COMPLETION_TRACKER.md` and `RACP_QA_SECURITY_REVIEW.md`, then inspect `git status` and branch HEAD. Run all npm commands from `apps/renovations-command-center`. Site Control remains at `docs/site-control`; never move its operational records into the core app.

October 8 continuation adds the authenticated server command boundary, guarded private evidence, durable execution/QC queues, stale project/QC drafts, server restore and printable daily records. See the tracker for current evidence. Next development tasks: full offline navigation/new-project/metadata and raw-photo workflows, photo-object backup/restore, and complete scheduling/resource acceptance. Do not use real projects until live identity/rules/storage and browser verification pass. Next review tasks are listed in the QA report; do not describe them as completed.

Validation:

```bash
cd apps/renovations-command-center
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
npx --yes firebase-tools@14 emulators:exec --project demo-renovations-racp --only firestore,storage 'npm run test:backend'
cd ../..
node scripts/check-app-isolation.mjs
git diff --check
```

Use current Firebase CLI with Java 21 for the final CI/provider review. CLI14 is the tested local Java-compatible route, not a claim about current production rules.

## External blockers and smallest remaining access

- Existing Firebase project/web configuration, authorized test account, rules/storage deployment capability and existing web-host service/root-directory configuration need verification. No new paid service or merged database is authorized. Do not commit secrets.
- Connected-service discovery failed (Rube connection error). Direct Render read access was later verified; its confirmed workspace has no renovation-app service. Firebase live authentication remains unavailable.
- Playwright browser installation failed (invalid/empty downloaded ZIP). A working permitted browser runtime is required for rendered/mobile/E2E verification.
- Genuine external review gates associated with existing PR #5 remain unperformed.

No main merge, production deployment, data migration or real-task completion occurred. Preserve all rescue and source branches. Current progress is retained on the feature branch/draft PR. The session does not keep running after its final response.

October 8 candidate requires Firebase Admin project/bucket settings and securely supplied Application Default Credentials. See `apps/renovations-command-center/docs/TRUSTED_MUTATIONS.md`. Do not commit secrets or deploy the stronger rules independently of a validated server-capable app. No live deployment or migration occurred.
