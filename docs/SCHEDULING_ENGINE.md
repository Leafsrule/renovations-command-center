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
