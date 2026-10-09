# Chromebook testing corrections — October 9, 2026

The local demo now shows its test-mode notice in normal page flow rather than Firebase Auth's fixed footer. The demo-only SDK warning is suppressed after the existing local-host/demo-project guards; production isolation is unchanged. Bottom navigation retains its safe-area padding.

Every project header links to Projects, Project settings, Rooms, and Champions and helpers. Task forms link directly to room and people management; task drafts are already retained across navigation. Add a person with the Champion role, then return to the task form to select them. Phase/readiness/material options are controlled workflow lists; adding people or rooms populates those entity selectors.

Design is available for task/project phase, task/project/room status, readiness, and tool/measurement/decision status. Material status excludes Design. Project phase and room status are now editable. Design work cannot start or enter the work calendar until its task status/readiness is changed to ready. Adding a Design phase alone does not block a separately ready design task.

Shared labels keep task forms/details, Today, schedule, material overview and field records consistent. Material selectors offer Ordered, Received, Stock and Partially Received. Old `partial`, `delivered` and `on_site` values remain readable with the corrected labels; partial quantities remain unavailable. Received/Stock satisfy material availability, including trusted server recomputation and shopping-list exclusions. Existing Ready and Used values are retained.

## Apply on the Chromebook without clearing the demo

Keep the running emulator Terminal open. In a second Linux Terminal:

```bash
cd ~/renovations-command-center

git pull --ff-only
```

Refresh the existing app page. No dependency installation is required for this increment. The emulator watches the rules file. Do not stop/restart the emulator to apply UI changes; restarting clears this demo's server data. Export a project backup before any intentional restart.

Validation includes app tests covering serialization, legacy labels, Design/readiness, material availability and guarded planning transitions; real-emulator authorization tests verify Design cannot bypass execution or ownership checks. Chromebook visual acceptance remains a user test after pulling the update. No deployment, billing change, main merge or live rules/data mutation is part of this change.

## Follow-up: old banner still visible

The original service worker cached `/_next/static/` during local development, so a normal refresh could continue loading old development bundles. Hot reload could also retain an already-connected Auth instance and its fixed warning element. The follow-up disables development registration, makes an existing localhost worker stop serving cached files and retire itself, and suppresses the SDK footer via a demo-only body/CSS marker. The in-flow local-test notice remains visible.

After pulling the follow-up, open `http://localhost:3000/refresh-test-app.html` in the existing app tab and click **Refresh test app**. This standalone page is fetched as a fresh navigation and removes only this origin's `/sw.js` registration and `rcc-public-shell-*` Cache Storage entries, then opens `/projects`. It does not clear cookies, IndexedDB, localStorage, saved drafts, Firebase emulator data or unrelated caches/workers. Keep the emulator Terminal running. Cleanup failures remain on the page and allow retry; non-local hosts are rejected.

Follow-up validation: 197 app tests, lint, typecheck and production build passed. Cleanup tests cover selective cache/worker removal, retained data stores, failure/retry and hosted-page refusal. Prior 31 backend/security tests remain applicable: no rules, server storage or domain workflow changes in this follow-up. Actual Chromebook visual confirmation remains pending after applying the refresh.

## Record deletion and terminology update

Delete controls are available on Rooms, Champions and helpers, individual task details, field records (materials, tools, measurements and decisions), and the project details page. They begin disabled while the authenticated server checks eligibility. Closed records and records linked to completed/cancelled task history cannot be deleted. Tasks with posted work, saved media, dependent entries or saved schedules are retained. Rooms and people with open task links require reassignment first; room measurement links also prevent deletion. Only empty projects qualify; populated projects remain available for Archive.

An eligible Delete requires confirmation and a fresh server transaction rechecks ownership, links, history and the displayed record revision. Records disappear from active lists but retain their original document, deletion timestamp/actor and immutable deletion audit. Backups and separate-copy restores include the audit and deleted records. Browser writes cannot physically delete records, forge deletion markers/audits or resurrect deleted records. Posted task room/champion/helper links and closed field-record status/linkage cannot be detached to bypass the retention policy. These are application retention controls; the app does not implement a financial accounting ledger.

Design remains available in phases and other planning statuses but is removed from both material selectors. Existing saved material Design values display as Needed, and an older local draft asks for a valid material status before saving. All dropdown choices sort by their visible label (case-insensitive, natural numeric ordering); empty prompts remain first. Under Photos, Category is now **Media purpose**. User-facing evidence wording is now media, including validation messages. Persisted collection names, command formats, photo paths and existing backups remain compatible.

Apply with the second-Terminal git pull and the refresh-test-app page above; keep the emulator Terminal running. No dependencies, live resources, billing or main branch changes are required. Chromebook visual acceptance remains pending after the update is pulled.

Validation for this increment: 207 app tests and 36 real Firestore/Storage emulator tests passed, including stale revision/new closed-link rejection, owner isolation, source/audit retention, readiness recalculation, immutable deletion rules and backup/restore preservation. A real demo Auth token also passed the private Next HTTP deletion routes (missing/invalid token rejection, posted task denial, eligible deletion and idempotent retry), alongside the existing photo/recovery smoke. Lint, typecheck, production build, app isolation, whitespace and npm audit (zero vulnerabilities) passed. No dependencies changed.
