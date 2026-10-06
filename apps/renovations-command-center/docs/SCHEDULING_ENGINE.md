# Scheduling Engine

## What existed before this sprint

The repository already maintained task metadata for renovation scheduling, including:

- task statuses, priorities, phases, and readiness states
- dependency task IDs and blocker metadata
- material status and material items
- estimated duration in minutes
- earliest start dates and due dates
- a `lib/scheduling.ts` module with scheduling insight logic
- `TaskManager` and `TaskDetail` components showing readiness and scheduling labels

Existing scheduling behavior was embedded in `lib/scheduling.ts` and surfaced as task summaries in the UI.

## What this sprint implements

This sprint establishes a deterministic, testable scheduling foundation with:

- a pure scheduler module in `lib/scheduling.ts`
- explicit task readiness evaluation and recommendation types
- deterministic `getTaskReadinessEvaluation` for readiness state and explainable reasons
- `getRecommendedNextTasks` for stable ranking and safe recommendations
- support for
  - blocked tasks due to incomplete hard dependencies
  - required materials missing or unavailable
  - active blockers and blocker dates
  - invalid duration values (zero or negative)
  - completed or cancelled task exclusion
  - earliest start date restrictions
  - helper-required tasks with helper availability input
  - concurrent execution eligibility via `canRunConcurrent`
  - passive waiting eligibility in recommendations
  - remaining capacity filtering
- UI integration in `TaskManager` for recommended next tasks
- Vitest test coverage for core scheduling behaviour
- CI workflow validating lint, typecheck, build, audit, and tests

## Supported model in this sprint

### Projects

- Projects are collections of renovation tasks.
- Scheduling operates on a project’s task list.

### Rooms or areas

- Tasks reference `roomId`.
- Room names remain available in UI task summaries.

### Tasks

- Tasks include IDs, names, phases, descriptions, statuses, priorities, rooms, and scheduling metadata.
- Existing Firestore-compatible task shape is preserved.

### Phases

- Supported phases: `setup`, `demolition`, `prep`, `rough_in`, `waterproofing`, `tile`, `flooring`, `drywall`, `paint`, `trim`, `fixtures`, `cleanup`, `other`.

### Statuses

- Supported statuses: `draft`, `not_ready`, `ready`, `in_progress`, `blocked`, `waiting_curing`, `qc_review`, `complete`, `rework_required`, `cancelled`.

### Priorities

- Supported priorities: `low`, `medium`, `high`, `urgent`.

### Estimated duration

- Tasks use `estimatedDurationMinutes`.
- Zero or missing durations are considered invalid.
- Negative durations are invalid.

### Dependencies

- Hard dependencies are represented by `dependencyTaskIds`.
- A task is blocked if any dependency is incomplete or missing.

### Materials

- Task material readiness uses `materialStatus`.
- `needed`, `ordered`, `partial`, or `blocked` are treated as unavailable.
- Only `ready` is considered material-ready.

### Blockers

- `blockerType`, `blockedUntilDate`, and `status` are considered active blockers.
- Any blocker marks the task as blocked.

### Readiness

- `getTaskReadinessEvaluation` returns:
  - `ready`
  - `blocked`
  - `invalid`
  - `not_ready`
- The evaluation includes detailed reasons and explains readiness decisions.

### Scheduling recommendation

- `getRecommendedNextTasks` returns deterministic task recommendations.
- Ready tasks are prioritized by status, priority, phase order, duration, and stability.
- Recommendations exclude completed, cancelled, invalid, blocked, or capacity-exceeding tasks.

### Recommended Next

- The UI surfaces recommended next tasks based on the scheduler.
- Recommendations are stable and explainable.

### Capacity and concurrency foundation

- Supported input includes `availableMinutes` and `helperAvailable`.
- Helper-required tasks are excluded when helpers are unavailable.
- `canRunConcurrent` marks tasks eligible to run during passive wait.
- Passive wait eligibility is included in recommendation filtering.

### Future work

Planned future improvements include:

- a full calendar optimizer or schedule builder
- multi-worker capacity models and helper shift assignment
- more detailed material item availability tracking
- cure/drying period automation and passive wait periods as scheduled tasks
- phase-aware critical path planning beyond simple sorting
- richer task dependency graph analysis
- user interfaces dedicated to scheduling and Today recommendations
- expanded task readiness workflows for `waiting_curing` and inspections

## Centralized task execution

Task execution commands are evaluated by the pure
`evaluateTaskTransition` function in `lib/task-execution.ts`. The evaluator
accepts a plain task, an action, and project context. It has no React or
Firebase dependencies, does not mutate inputs, and returns either targeted
field updates or a friendly denied-transition reason.

Supported actions are:

- `start`: only a `ready` task that passes deterministic readiness may start
- `resume`: only `waiting_curing` work that still passes readiness may resume
- `mark_waiting`: only `in_progress` work may enter passive waiting or curing
- `complete`: only `in_progress` work may complete, after UI confirmation
- `block`: actionable work requires a blocker type and non-empty note
- `clear_blocker`: clears blocker metadata and reevaluates all other readiness constraints

Start and resume evaluate dependencies, materials, active blockers, estimated
duration, earliest start date, completed or cancelled state, and helper
availability when supplied. Denied actions return the first relevant readiness
reason for display to the user.

`executeProjectTaskAction` in `lib/tasks.ts` is the single persistence path for
execution commands. It evaluates the transition, updates only the returned
status/readiness/blocker fields plus `updatedAt`, and reads the task back after
the Firestore update. Existing task documents remain compatible and unrelated
fields are preserved.

## Blocker workflow

Today uses a task-scoped blocker dialog with blocker type, blocker note, and an
optional blocked-until date. Cancelling does not write data. Submitted blocker
details appear in Blocked / Not Today explanations.

Clearing a blocker first removes blocker metadata on an evaluation copy. The
scheduler then reevaluates dependencies, materials, dates, duration, and helper
availability. The task returns to `ready` only when that evaluation passes;
otherwise it becomes `not_ready` with the remaining readiness reasons retained.

Task Manager remains the full metadata and readiness editor, and Task Detail is
read-only. Today is currently the execution-command UI and routes all of its
Start, Resume, Mark Waiting, Complete, Block, and Clear Blocker actions through
the centralized workflow.

## Execution limitations

- Waiting and curing share the existing `waiting_curing` status; timed cure periods are not automated.
- Completion records do not yet capture elapsed time or a detailed audit history.
- Helper availability is supplied by the Today planning control and is not stored as a workforce calendar.
- Existing documents are not migrated; missing fields continue to use the task parser defaults.
- Future time-tracking work should add explicit start/pause/resume events without changing these transition rules implicitly.
