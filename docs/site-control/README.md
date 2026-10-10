# Site Control

Independent static tracker. Serve `index.html` and `data.json` together. Existing GitHub Pages URL and GitHub JSON save path remain `docs/site-control`. No install or build is required. Operational data is independent of Renovations Command Center.

Known pre-existing limitations: records are in a public repository; do not add private customer/project evidence. GitHub saving uses a token and replaces the whole JSON file, without a durable offline queue or concurrent edit protection. Text rendering requires a security review before adding untrusted records. These limitations are not resolved by this isolation change.

Regression check: `node scripts/check-app-isolation.mjs` from the repository root.
