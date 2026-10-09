# No-paid-services implementation plan

Decision: October 9, 2026, following the owner's explicit correction. This plan supersedes every instruction to activate Blaze or treat billing as a completion prerequisite. Status: architecture revised; storage adaptation and hosting verification not yet implemented. No paid service was enabled.

## Non-negotiable cost boundary

Use actual Free plans only. No billing activation, payment-method entry, automatic paid overages, paid persistent disks, expiring trials, paid database backups/PITR, paid AI APIs or paid hosting. A no-cost allowance on a paid plan is insufficient. At capacity, retain unsynced work and show an actionable capacity state; never upgrade automatically. Quota enforcement must cover storage, bandwidth, build/runtime usage and the provider workspace, not just a service's instance label. Provider changes must be rechecked before provisioning/release.

## Revised target

| Component | Target | State and limits |
| --- | --- | --- |
| Sign-in | Existing Firebase Email/Password on Spark | Verified enabled; retain current user identities |
| Project/task records | Existing Firestore on Spark | Preserve records; free quotas must be checked against expected use; no billing upgrade |
| Private photo files | Supabase Free, separate private bucket dedicated to this app | Proposed; not provisioned or integrated. Published allowance: 1 GB storage, 5 GB uncached egress and 5 GB cached egress; pause after one week of inactivity; at most two active free projects |
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

Application code still depends on Firebase Cloud Storage, including numeric GCS generations and server credentials. The hybrid free target is a planned change, not a functioning deployment. Previously passed 175 app tests, 27 backend/security tests and CI apply to that prior implementation only. No rule change, main merge, billing upgrade, migration or deployment was made. Existing Firestore data and Firebase settings remain intact. Do not ask the owner to continue the Storage Upgrade project workflow.

## Official references checked October 9

- Firebase pricing plans: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Firebase Cloud Storage requires Blaze: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Supabase Free pricing/quotas/inactivity: https://supabase.com/pricing
- Supabase Free quota restrictions: https://supabase.com/docs/guides/platform/billing-faq
- Supabase private Storage access policies: https://supabase.com/docs/guides/storage/security/access-control
- Render Free limitations/overages: https://render.com/docs/free

These are current provider terms, not a guarantee of unchanged future pricing or indefinite free availability.
