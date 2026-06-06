# Renovations Command Center

**Document Type:** Product / Systems Architecture Canvas  
**Product:** Mobile-first, AI-assisted renovation scheduling platform  
**Core Concept:** A renovation command centre that connects tasks, rooms, labour, helpers, materials, tools, blockers, photos, dependencies, blackout dates, and critical-path visibility.

---

## 1. Product Role

**AI-Assisted Renovation Project Scheduler**

A mobile-first renovation planning app that converts whole-home renovation work into structured tasks, schedules, dependencies, blockers, labour assignments, material tracking, photo documentation, and critical-path visibility.

---

## 2. Core System Name

## Renovation Scheduling Intelligence Layer

This is the core logic layer that connects:

- Tasks
- Dependencies
- Labour
- Task champions
- Helpers
- Materials
- Tools
- Blackout dates
- Blockers
- Photos
- QC checklists
- Critical path
- AI recommendations

This is what makes the app more than a basic task list.

---

## 3. Primary App Sections

### A. Today

**Purpose:** Show exactly what should be done today.

**Required Data Fields**
- Date
- Available work hours
- Assigned workers
- Ready tasks
- Blocked tasks
- Materials needed
- Tools needed
- Priority order

**UI Behaviour**
- Mobile-first checklist
- Shows: Start first, Do next, Prep if time, Blocked/not today
- One-tap task start
- One-tap blocker logging
- One-tap photo upload

**Dependency Logic**
- Only tasks with cleared dependencies appear as actionable.

**Automation Rules**
- Auto-generate daily work plan
- Carry incomplete tasks forward
- Adjust plan if work finishes early
- Warn if critical-path task is slipping

**Permissions**
- Owner sees all work
- Champion sees assigned work
- Helper sees assigned helper tasks only

**Backend Requirements**
- Daily planner function
- Task readiness engine
- Availability data
- Schedule recalculation trigger

**Testing Criteria**
- Blocked tasks do not appear as ready
- Today view respects work hours
- Incomplete tasks roll forward correctly

---

### B. Tasks

**Purpose:** Central master list for all renovation work.

**Required Data Fields**
- Task ID
- Task name
- Project
- Room / area
- Phase
- Description
- Status
- Priority
- Champion
- Helper required
- Estimated duration
- Actual duration
- Earliest start date
- Due date
- Dependencies
- Blockers
- Materials required
- Tools required
- Photos required
- QC required
- Notes

**UI Behaviour**
- Mobile task cards
- Swipe actions: Start, Complete, Block, Reassign
- Filters: Today, Ready, Blocked, Critical Path, Champion, Room, Phase
- Task detail screen with tabs: Details, Dependencies, Materials, Photos, QC, Notes

**Dependency Logic**
- Task cannot become Ready until required predecessors are complete.
- Task cannot start if required materials, tools, labour, or helper are missing.

**Automation Rules**
- Auto-move task to Ready when dependencies clear
- Auto-reschedule downstream tasks when delayed
- Auto-detect tasks that can run concurrently
- Auto-flag missing materials/tools

**Permissions**
- Owner: full control
- Champion: update assigned task status/details
- Helper: progress/photo updates only
- Viewer: read-only

**Backend Requirements**
- Tasks table
- Dependency table
- Assignment table
- Status history table
- Audit log

**Testing Criteria**
- Dependency-blocked task cannot start
- Ready task appears correctly
- Reassignment updates task and schedule
- Status changes are logged

---

### C. Schedule

**Purpose:** Turn renovation work into a realistic schedule.

**Required Data Fields**
- Task duration
- Work hours
- Work days
- Blackout dates
- Labour availability
- Dependencies
- Priority
- Start/end dates
- Buffer time
- Critical-path flag

**UI Behaviour**
- Views: Today, Week, Month, Gantt-style timeline, Critical Path
- Drag-and-drop task movement
- Recalculate schedule button
- Blocked/late/critical visual indicators

**Dependency Logic**
- Supports:
  - Finish-to-start
  - Start-to-start
  - Finish-to-finish
  - Waiting/cure time
  - Inspection required
  - Material required
  - Optional dependency
  - Hard dependency
  - Soft dependency

**Automation Rules**
- Build baseline schedule
- Recalculate when tasks are delayed
- Skip blackout dates
- Prevent labour double-booking
- Protect critical path
- Detect impossible timelines

**Permissions**
- Owner edits schedule
- Champion can request schedule change
- Helper cannot change master schedule

**Backend Requirements**
- Scheduling algorithm
- Dependency solver
- Calendar table
- Blackout table
- Availability table
- Critical path calculation

**Testing Criteria**
- Schedule respects work hours
- Schedule respects blackout dates
- Dependent tasks move correctly
- Concurrent tasks do not conflict
- Critical-path tasks calculate correctly

---

### D. Materials

**Purpose:** Prevent tasks from starting before materials are available.

**Required Data Fields**
- Material name
- Quantity
- Unit
- Required task
- Required by date
- Ordered / purchased / delivered / on-site
- Supplier
- Cost
- Receipt/photo
- Notes

**UI Behaviour**
- Material checklist by task
- Status badges: Needed, Ordered, Purchased, Picked Up, Delivered, On Site, Missing, Used
- Tap material to see linked tasks
- Shopping-list view

**Dependency Logic**
- Task cannot start if mandatory material is missing.

**Automation Rules**
- Auto-create material blocker
- Remind before material due date
- Auto-unblock task when material is marked on-site
- AI generates shopping list from tasks

**Permissions**
- Owner edits all materials
- Champion can confirm material status
- Helper can upload receipt/photo if allowed

**Backend Requirements**
- Materials table
- Task-material relationship table
- Receipt/photo storage
- Material status history

**Testing Criteria**
- Missing material blocks task
- Material update unblocks task
- Shopping list groups duplicates correctly

---

### E. Photos

**Purpose:** Keep visual progress records, proof, issues, receipts, and completion documentation.

**Required Data Fields**
- Photo file
- Date/time
- Project
- Room
- Task
- Category: Before, During, After, Issue, Material, Receipt, Inspection
- Caption
- Uploaded by

**UI Behaviour**
- Camera-first mobile upload
- Attach photo directly to task
- Gallery by room/task/date
- Before/during/after comparison

**Dependency Logic**
- Some tasks can require photos before completion.

**Automation Rules**
- Auto-tag photos by active task/room
- AI can summarize progress from photos
- Completion blocked if required photo missing

**Permissions**
- Owner sees all photos
- Champion uploads assigned task photos
- Helper uploads only for assigned work
- Viewer read-only

**Backend Requirements**
- Cloud storage
- Image compression
- Photo metadata table
- Access rules

**Testing Criteria**
- Photo uploads on mobile
- Photo links to correct task
- Required-photo validation works

---

## 4. Supporting Modules

### Project Dashboard

**Purpose:** Fast snapshot of all active renovation projects.

**Fields**
- Project name
- Room/area
- Status
- Start date
- Target finish date
- Current phase
- Next task
- Active blockers
- Overdue tasks
- Critical-path warning

**UI**
- Mobile cards
- Red/yellow/green health indicators
- Tap project card opens project command centre

**Automation**
- Auto-calculate percent complete
- Auto-show next available task
- Auto-detect critical-path blockers

---

### Project Setup Wizard

**Purpose:** Create a renovation project correctly from the start.

**Fields**
- Project name
- Project type
- Room/zone
- Scope
- Start date
- Target finish date
- Work hours
- Available workers
- DIY/contractor/mixed
- Budget allowance
- Known constraints

**UI**
- Step-by-step mobile wizard
- Save/resume
- Templates: Bathroom, Bedroom, Kitchen, Basement, Flooring, Whole-home, Custom

**Automation**
- AI suggests task list
- AI estimates duration
- AI identifies missing info
- Auto-creates baseline schedule

---

### Room / Area Manager

**Purpose:** Support whole-home expansion.

**Fields**
- Room name
- Floor level
- Dimensions
- Status
- Priority
- Linked project
- Notes
- Photos
- Trade categories

**UI**
- Rooms grouped by floor: Basement, Main, Second, Exterior, Garage
- Tap room to open room-specific task board

**Automation**
- AI suggests tasks by room type
- Warns when one room blocks another

---

### Task Champion System

**Purpose:** Assign clear responsibility.

**Fields**
- Champion name
- Role
- Contact
- Availability
- Assigned tasks
- Skill tags
- Permission level
- Notes

**UI**
- Task card shows Champion, Helper, Labour count
- Easy reassignment dropdown
- My Tasks view

**Automation**
- Detect overloaded champion
- Suggest reassignment
- Adjust start date if champion unavailable

---

### Helper Assignment

**Purpose:** Allow tasks to run faster or concurrently.

**Fields**
- Helper name
- Helper availability
- Skill level
- Assigned task
- Required/optional helper flag
- Estimated time savings
- Notes

**UI**
- Task card shows 1-person, 2-person, optional helper
- Toggles: Needs helper, Can run concurrently

**Automation**
- Suggest helper-suitable tasks:
  - Cleaning
  - Decluttering
  - Garbage removal
  - Material pickup
  - Dust control
  - Prep work
- Auto-run safe concurrent tasks

---

### Concurrent Work Logic

**Purpose:** Allow multiple tasks to happen at the same time when safe.

**Fields**
- Can run concurrent
- Space conflict
- Labour conflict
- Tool conflict
- Material conflict
- Safety conflict

**UI**
- Shows: Can run together, Cannot run together, Needs review
- Suggested concurrent task groups

**Automation Rules**
Concurrent tasks are allowed only if:
- No hard dependency conflict
- No same-worker conflict
- No room access conflict
- No tool conflict
- No material conflict
- No safety conflict

---

### Dependency Manager

**Purpose:** Control what must happen before something else.

**Fields**
- Predecessor task
- Successor task
- Dependency type
- Lag time
- Reason
- Required/optional
- Override allowed

**UI**
- Visual dependency chain
- Task detail shows Blocked By and Blocks These Tasks
- Warning before deleting dependency

**Automation**
- Auto-create standard dependencies from templates
- Auto-add cure/wait time for SLU, thinset, grout, paint, drywall compound, waterproofing
- Block circular dependencies

---

### Blackout Dates / Work Availability

**Purpose:** Prevent scheduling work on unavailable days.

**Fields**
- Date
- Time range
- Reason
- Applies to project, room, worker, or whole app
- Recurring yes/no

**UI**
- Calendar blackout overlay
- Add blackout button
- Schedule conflict warning

**Automation**
- Auto-shift affected tasks
- Warn if target finish becomes unrealistic
- Recalculate critical path

---

### Tool / Equipment Tracker

**Purpose:** Ensure required tools are available.

**Fields**
- Tool name
- Required task
- Owner
- Available yes/no
- Condition
- Location
- Notes

**UI**
- Tool checklist on task
- Tools needed today view
- Tool conflict warning

**Automation**
- Generate daily tool list
- Flag tool conflicts between concurrent tasks

---

### Blocker System

**Purpose:** Track anything stopping progress.

**Fields**
- Blocker title
- Type: Material, Labour, Tool, Inspection, Damage, Unknown, Access, Weather
- Linked task
- Severity
- Date logged
- Owner
- Resolution plan
- Status
- Photos
- Notes

**UI**
- Red blocker badge on task
- Blocker list view
- Resolve blocker button
- Photo-first issue input

**Automation**
- Pause downstream tasks
- Update critical path
- Suggest resolution steps
- Notify champion

---

### QC / Completion Checklist

**Purpose:** Prevent false completion.

**Fields**
- Checklist item
- Required yes/no
- Pass/fail
- Notes
- Photo required yes/no
- Signed off by
- Completion date

**UI**
- Checklist appears before Complete Task
- Failed item keeps task open
- Owner signoff option

**Automation**
- Load checklist by task type
- Suggest missing QC items
- Create rework task if QC fails

---

### Critical Path View

**Purpose:** Show what controls the finish date.

**Fields**
- Task duration
- Dependencies
- Earliest start
- Latest start
- Float/slack
- Critical yes/no
- Delay impact

**UI**
- Critical tasks highlighted
- Delay impact shown in plain language
- Example: “This task delays the project by 2 days.”

**Automation**
- Recalculate after delay, blocker, new task, blackout date, or worker change
- Warn when critical task is blocked

---

### AI Planning Assistant

**Purpose:** Help build, review, and optimize renovation plans.

**Fields**
- Project details
- Task list
- Room details
- Materials
- Labour availability
- Constraints
- User questions
- AI suggestions
- Accepted/rejected status

**UI**
- Chat-style assistant
- Buttons:
  - Build schedule
  - Find blockers
  - Suggest next task
  - Optimize weekend work
  - Generate material list
  - Explain delay
- AI suggestions appear as review cards

**Automation**
- Suggest sequencing
- Suggest dependencies
- Suggest durations
- Suggest concurrent work
- Flag risks
- Build daily work plans
- Generate material lists
- Summarize progress

**Guardrails**
AI cannot:
- Delete tasks without confirmation
- Change critical dependencies without approval
- Mark work complete by itself
- Override blockers automatically
- Invent missing measurements, material status, or labour availability

---

### Notifications / Alerts

**Purpose:** Keep work moving.

**Fields**
- Alert type
- Recipient
- Linked task/project
- Priority
- Send time
- Read/unread
- Action required

**UI**
- Push notifications
- In-app alert centre
- Action buttons: View task, Resolve blocker, Confirm material, Recalculate schedule

**Automation**
Notify when:
- Task becomes ready
- Task is overdue
- Material is missing
- Critical task is blocked
- Schedule changes
- Helper assigned

---

### Reports / Export

**Purpose:** Produce printable/shareable records.

**Fields**
- Project summary
- Task status
- Photo log
- Blockers
- Materials
- Costs
- Schedule
- Completion report

**UI**
- Export buttons: PDF, CSV, Photo Report, Task List, Material List
- Mobile preview before export

**Automation**
- Weekly summary
- AI plain-language status report

---

## 5. Required Status Values

### Project Status
- Not started
- Planning
- Active
- Blocked
- Behind schedule
- On hold
- Complete
- Archived

### Task Status
- Draft
- Not ready
- Ready
- In progress
- Blocked
- Waiting / curing
- QC review
- Complete
- Rework required
- Cancelled

### Material Status
- Needed
- Ordered
- Purchased
- Picked up
- Delivered
- On site
- Used
- Missing

---

## 6. Required Permission Roles

### Owner / Admin
- Full control
- Edit schedule
- Approve AI changes
- Assign users
- Override blockers

### Champion
- Owns assigned tasks
- Updates task status
- Uploads photos
- Logs blockers
- Cannot modify master dependencies unless allowed

### Helper
- Sees assigned tasks only
- Uploads progress/photos
- Marks helper work complete
- Cannot change schedule

### Viewer
- Read-only access
- Useful for spouse/client/contractor review

---

## 7. Required Backend Data Model

Minimum entities:

- Users
- Projects
- Rooms / Areas
- Tasks
- Task Dependencies
- Task Assignments
- Worker Availability
- Blackout Dates
- Materials
- Tools
- Blockers
- Photos
- Checklists
- Notes
- Costs
- Notifications
- Templates
- AI Suggestions
- Audit Logs

---

## 8. Required Scheduling Rules

The app must support:

- No task starts before dependencies are complete
- No task schedules during blackout dates
- No person is double-booked unless manual override is enabled
- No material-required task starts without material marked available
- No mandatory-helper task starts without helper assigned
- Cure/wait times count as real schedule time
- Critical-path task delays update final project date
- Concurrent work only allowed when labour, room, material, tool, and safety conflicts are clear
- Manual overrides are allowed but must be logged

---

## 9. MVP Build Priority

### Phase 1 — Must Have
- Project setup
- Room/area manager
- Master task list
- Task champions
- Helper assignments
- Dependencies
- Work hours
- Blackout dates
- Material blockers
- Today view
- Photo upload
- Critical-path indicator
- Mobile-first UI

### Phase 2 — Strong Upgrade
- AI schedule builder
- Concurrent task suggestions
- Gantt timeline
- Daily work plan
- QC checklists
- Notifications
- Reports/export

### Phase 3 — Whole-Home Expansion
- Multi-project dashboard
- Room templates
- Budget tracking
- Tool tracking
- Reusable renovation templates
- Historical project archive
- Full AI optimization engine

---

## 10. Recommended Mobile Navigation

Bottom navigation:

1. Today
2. Tasks
3. Schedule
4. Materials
5. Photos

Top project switcher:

- Project
- Room
- Worker
- Status filter

Floating plus button:

- Add task
- Add blocker
- Add material
- Add photo
- Add note

---

## 11. Acceptance Criteria Summary

The app is successful when:

- A user can create a renovation project from a template or custom setup.
- Tasks can be assigned to champions and helpers.
- Dependencies prevent work from starting too early.
- Blackout dates and work hours are respected.
- Materials and tools can block tasks.
- Photos can be attached to tasks and required for completion.
- The app identifies ready tasks and blocked tasks.
- The app can show what work can run concurrently.
- The app calculates critical-path risk.
- The app produces a simple daily plan.
- AI suggestions are reviewable and do not overwrite core data without approval.
- The system can expand from one room to a full-home renovation.
