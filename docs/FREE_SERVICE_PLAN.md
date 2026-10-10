# No-paid-services implementation plan

Decision: October 9, 2026, following the owner's explicit correction. This plan supersedes every instruction to activate Blaze or treat billing as a completion prerequisite. Status: free-storage candidate implemented and locally tested; live provider and hosting verification remain blocked. No paid service was enabled.

## Non-negotiable cost boundary

Use actual Free plans only. No billing activation, payment-method entry, automatic paid overages, paid persistent disks, expiring trials, paid database backups/PITR, paid AI APIs or paid hosting. A no-cost allowance on a paid plan is insufficient. At capacity, retain unsynced work and show an actionable capacity state; never upgrade automatically. Quota enforcement must cover storage, bandwidth, build/runtime usage and the provider workspace, not just a service's instance label. Provider changes must be rechecked before provisioning/release.

## Revised target

| Component | Target | State and limits |
| --- | --- | --- |
| Sign-in | Existing Firebase Email/Password on Spark | Verified enabled; retain current user identities |
| Project/task records | Existing Firestore on Spark | Preserve records; free quotas must be checked against expected use; no billing upgrade |
| Private photo files | Supabase Free, separate private bucket dedicated to this app | Adapter and authenticated routes implemented; not provisioned or live-verified. Published allowance: 1 GB storage, 5 GB uncached egress and 5 GB cached egress; pause after one week of inactivity; at most two active free projects |
| Trusted API and UI | Existing Next.js server on a verified no-charge host | Host not selected/certified. Keep authoritative server mutations; do not replace them with unguarded browser writes |
| Device/offline copies | Existing account-scoped IndexedDB, expanded offline navigation/queues | Already partial; device copies do not substitute for independent backups or cross-device photo storage |
| Recovery | Portable project/photo archives saved by the owner | Retain checksum/readback and separate-copy restore; adapt to new storage; larger archives/cleanup remain required |

Render Free is a Node hosting candidate, not the current release decision. Official guidance discourages production use. It sleeps after 15 minutes idle, can take about a minute to resume, has 750 instance-hours shared per workspace and an ephemeral filesystem. Its outbound bandwidth/build overages can be charged when a payment method is present. An existing workspace with other services cannot be assumed cost-safe. Do not deploy there until account-level no-charge behavior and suitability for this personal app are verified. Do not use its 30-day Free Postgres, in-memory-only Key Value or local disk for durable project/photo data. If no host meets the strict boundary, use a clearly documented local build for development while pursuing a compatible free deployment architecture; do not label it a remotely available release.

## Implementation sequence

1. Retain existing Firebase Auth/Firestore and Site Control separation. Introduce a private-photo provider boundary; decouple Firebase Admin identity/database initialization and configuration validation from mandatory GCS bucket access. Preserve the Firebase emulator path for existing regression tests without using it as proof of Supabase acceptance.
2. Implement Supabase private-object operations behind authenticated Next routes. Verify Firebase tokens and project/task ownership on every operation. Keep Supabase privileged credentials server-only; no public bucket or privileged browser key. Default-deny ordinary storage access. If direct staging upload is necessary, use narrowly scoped, expiring authority after server checks, never reusable write credentials.
3. Replace browser Firebase Storage uploads/reads and GCS-specific server calls in evidence, task completion, archives and restore. Preserve original evidence/request IDs and outbox bytes until authenticated readback. Use unique immutable object paths, create-only uploads and recorded SHA-256/size/type identity. Supabase object identity must not masquerade as a GCS generation. Any provider feature needed for these guarantees must be verified before committing to the adapter; compensate for partial uploads without weakening receipts or ownership.
4. Add transactional capacity reservations and safety headroom for staging, restore and abandoned transfers. The app must reject capacity-exceeding operations before discarding device copies. Provider-wide quota/exhaustion can still occur, so preserve retries and distinguish quota, paused service and authentication errors. Do not downscale or delete originals silently. Offer explicit owner-controlled compression/archive options and retain requested evidence quality.
5. Verify a Free Supabase project/account is available, safe private-bucket configuration, no automatic billing, app-specific credentials and a no-charge host. Account creation/terms and new security-sensitive credential grants remain subject to applicable confirmation requirements; preparing code does not require routine approval. Do not extract browser sessions or provision keys implicitly.
6. Run provider-specific isolation, overwrite denial, actual-byte completion checks, interruption/retry, concurrent restore, cross-account denial, quota-full and paused-service tests. Rehearse owner-download backup and separate-copy recovery with the actual provider. Complete offline/phone/desktop/print/multi-device and existing scheduler/security/external-review gates before any release.

## Current state

The candidate now selects Supabase for production photos, with no mandatory GCS bucket. Firebase Storage remains the isolated demo regression backend. Photo records retain the legacy `generation` field name but hold explicitly tagged `supabase:object-id:version-id` identities for the new provider, plus server-only SHA-256 manifests. New tests exercise the adapter using a fake Storage transport and real demo Firestore transactions; this is not a live Supabase or hosting verification. The local production check correctly reports the three missing Supabase settings. Authorized Firebase server credentials also remain absent. The app is not deployed. No rule change, main merge, billing upgrade, migration or deployment was made. Existing Firestore data and Firebase settings remain intact. Do not ask the owner to continue the Storage Upgrade project workflow.

## Official references checked October 9

- Firebase pricing plans: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Firebase Cloud Storage requires Blaze: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Supabase Free pricing/quotas/inactivity: https://supabase.com/pricing
- Supabase Free quota restrictions: https://supabase.com/docs/guides/platform/billing-faq
- Supabase private Storage access policies: https://supabase.com/docs/guides/storage/security/access-control
- Render Free limitations/overages: https://render.com/docs/free

These are current provider terms, not a guarantee of unchanged future pricing or indefinite free availability.

## October 9 implementation checkpoint

Private server routes now stage/download photos after revocation-checked identity, project/task ownership and body-limit checks. Final bytes are create-only and read back before evidence linking. The browser uploads through these routes, keeps original bytes through lost responses/account changes, and requires matching authenticated SHA-256 readback before releasing the device copy. No public download URL or Supabase credential enters the browser.

App-specific server manifests and capacity reservations are protected by Firestore default-deny rules. The 800 MiB ceiling includes staging, final files, pending uploads and restored copies; concurrent reservations cannot oversubscribe it. Confirmed staging removal uses a deletion state to block recreation and releases capacity only after provider confirmation. Interrupted/abandoned uploads and restore copies retain capacity until a reviewed cleanup workflow exists. This app counter is not a measurement of other buckets or account-wide provider egress. Dedicated Free account/project/bucket and actual plan/quotas/RLS must still be verified. A paid plan with this counter remains disallowed.

Production rejects Firebase Storage selection and emulator settings; the local demo launcher explicitly selects the Firebase emulator backend. Supabase adapter checks the bucket is explicitly private on every operation, verifies actual object IDs/versions/size/type, and hashes readback. Live SDK behavior, private access policies, inactivity recovery, free egress handling, actual credentials and free hosting remain release gates.

Validation for the October 9 free-photo candidate: npm ci, lint, typecheck, production build, 188 Vitest tests, 30 demo backend/security tests, actual demo Auth-to-Next HTTP photo staging/link/read and backup/restore replay, audit with zero vulnerabilities, Site Control isolation and whitespace checks passed locally. Supabase transport is faked in its unit/integration tests; the HTTP smoke uses the actual Firebase Storage emulator adapter. Remote CI must be verified for the published commit. No live provider acceptance or independent external review is claimed.
