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

This app is configured for Firebase App Hosting because it is a Next.js app. Create the production backend in Firebase App Hosting, connect it to the GitHub repository, and use `main` as the live branch. App Hosting will build and roll out the app remotely after changes land on that branch.

Production Firebase web environment variables should be managed in the Firebase App Hosting console or Secret Manager. Keep `apphosting.yaml` limited to deployable runtime configuration unless a value is intentionally safe to commit.

The repository also includes `render.yaml` as a Render Blueprint for the same Next.js app. Use it when production is recovered or moved through Render. The Blueprint keeps Firebase web configuration as `sync: false` environment variables, so values must be entered only in Render's secure environment-variable UI.

Firestore and Storage security rules deploy from GitHub Actions through `.github/workflows/firebase-rules.yml` whenever rule files change on `main`. You can also run that workflow manually from the Actions tab.

Before merging production infrastructure changes:

1. Confirm the pull request CI passes.
2. Confirm the Firebase App Hosting backend is connected to this repository and tracks `main`.
3. If Render is used, confirm the Blueprint is connected to this repository and tracks `main`.
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
