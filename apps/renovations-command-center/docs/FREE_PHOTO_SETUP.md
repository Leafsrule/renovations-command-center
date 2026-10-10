# Free private photo setup

Status: implemented candidate; no Supabase provider resource or host configured. No paid service, billing activation, new key or production mutation occurred. Firebase remains on Spark.

## Required configuration

Retain the five Firebase web Auth/Firestore settings (API key, auth domain, project ID, sender ID and app ID), matching `FIREBASE_ADMIN_PROJECT_ID` and an existing authorized server identity/ADC. A Firebase Storage bucket is no longer required for the Supabase candidate. Browser console login does not provide server ADC.

Set server-only values using the host's private environment, outside git:

```text
RCC_PHOTO_PROVIDER=supabase
SUPABASE_URL=https://<verified-project-reference>.supabase.co
SUPABASE_PHOTO_BUCKET=<verified-private-app-bucket>
SUPABASE_SERVICE_ROLE_KEY=<existing-authorized-project-service-role-credential>
```

The displayed placeholders are not usable settings. Never put the service credential in `NEXT_PUBLIC_`, a public deployment file, client bundle, chat or repository. Key creation/material access expansion follows applicable confirmation requirements; no key is created by this guide. Use the actual Free plan without a billing commitment, and a dedicated app bucket. Confirm free project availability and no paid workspace/automatic overages before provider setup.

The bucket must be private, limited to JPG/PNG/WebP images smaller than 10 MiB, with default-deny browser/anonymous policies. The app accesses files through its Firebase-authenticated server routes, so no Supabase browser identity integration or public bucket is required. Audit every applicable policy, not just a newly added restrictive policy: permissive policies can combine. An existing service-role credential bypasses RLS; server ownership checks and secret isolation are essential. No Supabase policy or provider change has yet been applied.

Run `npm run firebase:check -- --production` for configuration validation, and `npm run firebase:check -- --production --live` for read-only Auth/Firestore/private-bucket checks. These never prove actual upload permissions, RLS, quota, account plan, hosting or recovery. Verify those independently with isolated authorized data before release. Without Supabase settings/ADC, the secure server fails closed; it does not fall back to billed Storage. The importer in `configure-firebase.mjs` preserves verified legacy SDK settings; configure the new server values separately and never overwrite an environment casually.

## Photo guarantees and limits

- All stage/read routes check revocation and project ownership. Uploads require an existing task, allowed type, nonempty bounded streamed bytes, create-only IDs and exact readback. Saved-upload replays do not recreate temporary files.
- Final evidence is server-only. Provider object ID/version, byte length/type and SHA-256 identity are checked before linkage, completion proof, downloads, backup and restore. The historical `generation` field now stores explicitly tagged `supabase:object-id:version-id`; it is not a GCS generation or provider version-history backup.
- `photoStorage/capacity` and `photoStorageObjects/*` are server-only Firestore documents. The 800 MiB app ceiling counts staging, final, pending and restored files. Failed/unknown transfers keep their reservation. Confirmed staging cleanup locks the allocation during deletion and releases it once. Abandoned-transfer cleanup and large archives remain unfinished.
- Existing raw-photo outbox keeps original account-scoped bytes until the command and authenticated hash readback succeed. Lost responses and quota errors preserve the source. Device copies are not an independent backup.
- Portable backups retain 20 MiB photo/32 MiB JSON/450-record limits. Restore creates a separate project and publishes its records only after all private-file checks. No existing live photo migration has occurred; existing accessible archives can be restored into a separate copy.

The app ceiling does not cover other buckets, account-wide usage or egress. Supabase Free quotas/inactivity limits and Free hosting sleep/suspension remain practical limits. Do not silently compress/delete originals or upgrade plans. Keep user-visible unsaved states and owner-download recovery; complete actual provider pause/quota and field acceptance before release.
