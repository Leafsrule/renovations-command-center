# Candidate operation and recovery

This app is still under development. Do not treat this as production acceptance.

## Daily workflow

Sign in using this app's Firebase account, create/select a project, enter rooms/people/tasks, configure Work Calendar, record materials/tools, then open Today. Use guarded task actions. Pause work and Wait / cure are distinct actions. Open task details for QC/work records and curing release times; upload task-linked photos/receipts through Photos. Record measurements/decisions with explicit verification/approval. Recalculate planned dates from Schedule. Open reports from the project command center to print saved daily work and actions.

Device drafts and pending field changes are labelled separately from saved cloud records. Conflicting changes must be reviewed against the current version. Restore produces a separate project copy and leaves existing records intact.

## Backup

Use Backup / restore in project details to export a private portable JSON archive containing records and every verified linked photo. Keep the download private: it contains the actual photo bytes. Limits are 20 MB total photo bytes, 32 MB JSON and 450 records. Export fails when a photo is missing or the limit is exceeded; it never silently omits files. Larger projects need a separate storage archive, which remains unfinished.

Restore validates photo checksums, copies files to a separate project's private paths and verifies readback before publishing the records. Original projects remain intact. An interrupted transfer retains its destination and private objects for retry; keep the backup and retry the same request. The browser clears its recovery ID only after record and photo readback passes. Older record-only format-1 backups remain supported, but format-1 backups with photo references cannot restore the missing bytes. Provider recovery/rollback and abandoned-transfer cleanup are still unverified.

## Hosting and rollback

Before deployment, verify an existing authorized host, set its app root to `apps/renovations-command-center`, and supply only this app's Firebase settings. Do not create paid resources. Deploy only a reviewed commit after all gates pass. Record its provider deployment ID and URL; retain the previously tested version/rules and backup. A rollback rehearsal and actual provider instructions remain required because no operational host/backend was verified in this session.

## Trusted saves and device changes

Execution, QC/work, evidence confirmation, portable backup and restore require the authenticated server described in `TRUSTED_MUTATIONS.md`. Pending task/QC changes appear in Device changes and replay on reconnect/reload under the original account. A conflict preserves the submitted change for comparison; it does not silently overwrite. Dismiss confirmed changes after reviewing the task. Do not clear browser storage to resolve a pending change. Quality and project forms preserve drafts; storage failure is shown explicitly. Raw photos are retained on the original account's device until confirmed. Unconfirmed field submissions cannot be edited until retried or reviewed; late responses preserve newer drafts. Full offline navigation and every metadata/form queue remain unfinished.
