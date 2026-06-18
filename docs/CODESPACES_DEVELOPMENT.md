# GitHub Codespaces Development

## Development environment

- Repository: `Leafsrule/renovations-command-center`
- Branch: `main`
- Workspace: `/workspaces/renovations-command-center`
- Operating system: Linux
- Shell: bash
- Primary development environment: GitHub Codespaces

## Setup

1. Open this repository in GitHub Codespaces.
2. The development container is configured in `.devcontainer/devcontainer.json`.
3. Codespaces will run `npm ci` automatically after container creation.
4. Port `3000` is forwarded automatically, labeled `Renovations Command Center`, and configured as private.
5. Port `3000` must remain private.

## Required secrets

Create repository-scoped Codespaces secrets with these exact names:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Create repository-scoped GitHub Actions secrets for production rules deploys:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

`FIREBASE_SERVICE_ACCOUNT` must be a JSON service account key with permission to deploy Firestore and Storage security rules. Do not commit the key or place it in `.env` files.

## Remote-first production deployment

Render is the sole production web host. Create or update production web hosting from the Render Blueprint in `render.yaml` only after external authorization resumes. The approved workspace expectation is a personal Hobby workspace, using the Starter plan for the web service.

The Render Blueprint keeps Firebase web configuration as `sync: false` environment variables, so values must be entered only in Render's secure environment-variable UI. Do not commit Firebase values to repository files.

Firestore and Storage security rules deploy from GitHub Actions through the manually triggered `.github/workflows/firebase-rules.yml` workflow. The dispatch confirmation must be exactly `DEPLOY`.

The rules workflow must remain inactive until all required GitHub Actions secrets exist and the Firebase deploy identity has been verified to have only the permissions needed to deploy Firestore and Storage rules.

Automatic rules deployment may be considered only after required GitHub Actions secrets are verified, the deploy identity and least-privilege permissions are verified, deployed Firestore and Storage rules are compared against this repository, and one successful manually triggered deployment plus rollback check has completed.

Render release-candidate validation must happen before merge. Prefer a Render pull-request preview. If previews are unavailable, use one temporary release-candidate service for `infra/remote-first-production`, keep `render.yaml` pointed at `main`, and delete the temporary service after final production verification.

Before merging production infrastructure changes:

1. Confirm the pull request CI passes.
2. Confirm the Render Blueprint is connected to this repository and tracks `main`.
3. Confirm the Render service has the required Firebase environment variables entered in Render with secure values.
4. Confirm the GitHub Actions secrets above exist in the repository settings.
5. Confirm `FIREBASE_SERVICE_ACCOUNT` has only the permissions needed to deploy Firestore and Storage rules.
6. Run `npm run validate:production` locally, then let the workflow run `CHECK_PRODUCTION_ENV=true npm run validate:production` remotely.

## Common commands

- Install dependencies: `npm ci`
- Start development server: `npm run dev -- --hostname 0.0.0.0`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Test: `npm test`
- Validate Render Blueprint: `npm run validate:render`
- Validate Firebase configuration and rules: `npm run validate:firebase`
- Validate production infrastructure config: `npm run validate:production`
- Audit: `npm audit --audit-level=high`

## Rebuild after changing secrets

1. Add or update the Codespaces secrets in GitHub.
2. Rebuild the Codespace using `Dev Containers: Rebuild Container`.
3. Confirm `npm ci` runs successfully.

## Notes

- Do not use the Windows path `C:\Users\ghajj\OneDrive\Documents\Renovations App` for active development.
- Do not use PowerShell commands or Windows-specific paths.
- Use Linux and bash in the Codespaces workspace.
