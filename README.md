# Renovation applications

These applications are independent. There is no shared operational database, authentication or runtime.

- **Renovations Command Center:** `apps/renovations-command-center`. Run `npm ci`, `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit --audit-level=high` from that directory. Keep port 3000 private. Firebase environment variables belong only to that app.
- **Site Control:** `docs/site-control`. Serve this directory as static files or use its existing GitHub Pages path. It has no npm dependencies. Its existing records and entry point are preserved. See its README for known limitations.

Application boundaries and acceptance tracking: `docs/RACP_IMPLEMENTATION_PLAN.md`. Work is in progress; no production release is certified.
