# Chromebook testing corrections — October 9, 2026

The local demo now shows its test-mode notice in normal page flow rather than Firebase Auth's fixed footer. The demo-only SDK warning is suppressed after the existing local-host/demo-project guards; production isolation is unchanged. Bottom navigation retains its safe-area padding.

Every project header links to Projects, Project settings, Rooms, and Champions and helpers. Task forms link directly to room and people management; task drafts are already retained across navigation. Add a person with the Champion role, then return to the task form to select them. Phase/readiness/material options are controlled workflow lists; adding people or rooms populates those entity selectors.

Design is available for task/project phase, task/project/room status, readiness, and material/tool/measurement/decision status. Project phase and room status are now editable. Design work cannot start or enter the work calendar until its task status/readiness is changed to ready. Adding a Design phase alone does not block a separately ready design task.

Shared labels keep task forms/details, Today, schedule, material overview and field records consistent. Material selectors offer Ordered, Received, Stock and Partially Received. Old `partial`, `delivered` and `on_site` values remain readable with the corrected labels; partial quantities remain unavailable. Received/Stock satisfy material availability, including trusted server recomputation and shopping-list exclusions. Existing Ready and Used values are retained.

## Apply on the Chromebook without clearing the demo

Keep the running emulator Terminal open. In a second Linux Terminal:

```bash
cd ~/renovations-command-center

git pull --ff-only
```

Refresh the existing app page. No dependency installation is required for this increment. The emulator watches the rules file. Do not stop/restart the emulator to apply UI changes; restarting clears this demo's server data. Export a project backup before any intentional restart.

Validation includes app tests covering serialization, legacy labels, Design/readiness, material availability and guarded planning transitions; real-emulator authorization tests verify Design cannot bypass execution or ownership checks. Chromebook visual acceptance remains a user test after pulling the update. No deployment, billing change, main merge or live rules/data mutation is part of this change.
