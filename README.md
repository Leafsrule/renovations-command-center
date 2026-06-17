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

- Next.js production rollouts are configured for Firebase App Hosting through `apphosting.yaml`.
- Render Blueprint rollouts are configured through `render.yaml` for a remote Node web service.
- Firestore and Storage rules are mapped in `firebase.json`.
- GitHub Actions validates the app on pull requests and deploys Firebase rules from `main`.
- Run `npm run validate:render` to validate `render.yaml` against Render's published Blueprint schema.
- Run `npm run validate:firebase` to validate `firebase.json`, Firestore rules, and Storage rules wiring.
- Run `npm run validate:production` before changing deployment or security-rule files.
- Run `CHECK_PRODUCTION_ENV=true npm run validate:production` in GitHub Actions or any trusted shell that has production deploy secrets available.
