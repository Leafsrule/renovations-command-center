# renovations-command-center
Mobile-first AI-assisted renovation scheduling app

## Development environment

This repository is configured to use GitHub Codespaces as the primary development environment.

- Repository: `Leafsrule/renovations-command-center`
- Branch: `main`
- Workspace: `/workspaces/renovations-command-center`
- Operating system: Linux
- Shell: bash

For setup and Codespaces workflow, see `docs/CODESPACES_DEVELOPMENT.md`.

## Production infrastructure

- GitHub is the authoritative source for code, infrastructure, tests, documentation, and recovery history.
- Render is the sole production web host. The Render Blueprint is configured in `render.yaml` for a Node 22 web service on the Starter plan.
- Firebase is backend-only for Authentication, Firestore, Storage, and security rules.
- Firestore and Storage rules are mapped in `firebase.json` and deployed only after GitHub Actions secrets and Firebase permissions are verified.
- GitHub Actions validates the app on pull requests and provides rules-deployment automation from `main`.
- Run `npm run validate:render` to validate `render.yaml` against Render's published Blueprint schema.
- Run `npm run validate:firebase` to validate `firebase.json`, Firestore rules, and Storage rules wiring.
- Run `npm run validate:production` before changing deployment or security-rule files.
- Run `CHECK_PRODUCTION_ENV=true npm run validate:production` in GitHub Actions or any trusted shell that has production deploy secrets available.

See `docs/SYSTEM_OF_RECORD.md` for the platform map, recovery order, secret inventory, and browser-local state notes.
