# Repository Agent Instructions

This repository uses GitHub Codespaces as the primary development environment.

- Work in `/workspaces/renovations-command-center` on Linux/bash.
- Use feature branches for changes; do not work directly on `main`.
- Never commit secrets or `.env` files.
- Keep port `3000` private and do not expose it publicly.
- Do not weaken Firebase Authentication or Firestore security.
- Preserve existing screens and task flows when updating scheduling logic.
- Prefer focused tests and run a full validation pass before merging.
- Use `npm ci` when dependencies or `package-lock.json` changes.
- Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm audit --audit-level=high`, and `npm test` on validation.
- Use the local coding agent for code changes and avoid external edit conflicts.
