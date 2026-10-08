# Candidate operation and recovery

This app is still under development. Do not treat this as production acceptance.

## Daily workflow

Sign in using this app's Firebase account, create/select a project, enter rooms/people/tasks, configure Work Calendar, record materials/tools, then open Today. Use guarded task actions. Pause work and Wait / cure are distinct actions. Open task details for QC/work records and curing release times; upload task-linked photos/receipts through Photos. Record measurements/decisions with explicit verification/approval. Recalculate planned dates from Schedule. Open reports from the project command center to print saved daily work and actions.

Device drafts and pending field changes are labelled separately from saved cloud records. Conflicting changes must be reviewed against the current version. Restore produces a separate project copy and leaves existing records intact.

## Backup

Use Backup / restore in project details to export private JSON. Keep the download private. It contains record metadata, not a private storage-object backup. Evidence-backed restore is currently blocked pending a verified storage backup/copy workflow. Do not assume exporting JSON alone protects photos.

## Hosting and rollback

Before deployment, verify an existing authorized host, set its app root to `apps/renovations-command-center`, and supply only this app's Firebase settings. Do not create paid resources. Deploy only a reviewed commit after all gates pass. Record its provider deployment ID and URL; retain the previously tested version/rules and backup. A rollback rehearsal and actual provider instructions remain required because no operational host/backend was verified in this session.

## Trusted saves and device changes

Execution, QC/work, evidence confirmation and restore require the authenticated server described in `TRUSTED_MUTATIONS.md`. Pending task/QC changes appear in Device changes and replay on reconnect/reload under the original account. A conflict preserves the submitted change for comparison; it does not silently overwrite. Dismiss confirmed changes after reviewing the task. Do not clear browser storage to resolve a pending change. Quality and project forms preserve drafts; storage failure is shown explicitly. Offline photo capture and full offline navigation remain unfinished.
