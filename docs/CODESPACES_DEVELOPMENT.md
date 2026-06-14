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

## Common commands

- Install dependencies: `npm ci`
- Start development server: `npm run dev -- --hostname 0.0.0.0`
- Lint: `npm run lint`
- Build: `npm run build`
- Audit: `npm audit --audit-level=high`

## Rebuild after changing secrets

1. Add or update the Codespaces secrets in GitHub.
2. Rebuild the Codespace using `Dev Containers: Rebuild Container`.
3. Confirm `npm ci` runs successfully.

## Notes

- Do not use the Windows path `C:\Users\ghajj\OneDrive\Documents\Renovations App` for active development.
- Do not use PowerShell commands or Windows-specific paths.
- Use Linux and bash in the Codespaces workspace.
