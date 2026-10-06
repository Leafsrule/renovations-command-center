# Render Release Process

Render is the sole production web host. The permanent production Blueprint is `render.yaml`, and it must continue to target the `main` branch.

Do not provision Render resources until external authorization resumes.

## Permanent Production Service

- Source: GitHub repository `Leafsrule/renovations-command-center`
- Branch: `main`
- Runtime: Node 22
- Plan: Starter, approximately $7 USD/month before taxes or account-specific charges
- Build command: `npm ci && npm run build`
- Start command: `npm run start -- -H 0.0.0.0 -p $PORT`
- Health path: `/api/health`
- Firebase browser configuration: entered as secure Render environment values, never committed

## Preferred Release Candidate

Use a Render pull-request preview or preview environment for the draft infrastructure pull request when the authorized Render account supports it.

The preview must use the pull request head from `infra/remote-first-production` while leaving the permanent production service and `render.yaml` production branch unchanged.

## Fallback Release Candidate

If pull-request previews are unavailable, create one temporary release-candidate service pointing to:

```text
infra/remote-first-production
```

The fallback service must:

- Be clearly named as temporary.
- Use the same build command, start command, Node version, health check, and Firebase environment-variable names as production.
- Avoid modifying the permanent production service.
- Avoid changing `render.yaml` away from `main`.
- Be deleted automatically after final production verification.
- Never leave an orphaned paid service.
- Require no additional user decision after the authorization window opens.

## Required Release-Candidate Checks

The release candidate must pass all of these before merge:

- `/api/health` returns HTTP 200.
- Login loads.
- Authenticated Firebase access works.
- Project routing works.
- Today, Tasks, Schedule, Materials, and Photos open.
- Nested-route refreshes work.
- No critical browser-console errors appear.
- No secrets appear in responses or logs.
- Mobile-width layout remains usable.

## After Verification

After final production verification, delete any fallback release-candidate service and confirm no temporary paid service remains.
