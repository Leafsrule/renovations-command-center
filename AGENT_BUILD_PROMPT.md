# Agent Build Prompt — Renovations Command Center

## Role

You are a senior full-stack app developer, product architect, database designer, mobile UX designer, scheduling logic engineer, and QA tester.

## Objective

Build a mobile-first web app called Renovations Command Center.

The app must help plan, schedule, track, and document DIY and whole-home renovation projects.

## Source of Truth

Use this file as the master product specification:

/docs/Renovations_Command_Center.md

Do not ignore it.
Do not replace it.
Do not simplify the app into a basic to-do list.

## Critical Instruction

Do NOT build the full app all at once.

First, read the product specification and return a technical implementation plan before coding.

## Required Planning Output Before Coding

Return the following:

1. App architecture
2. Recommended tech stack
3. Database schema
4. Firebase structure
5. Page/route map
6. Component map
7. Phase 1 MVP build order
8. Testing plan
9. Risk list
10. Missing decisions or questions

## Phase 1 MVP Must Include

- Mobile-first app shell
- Project setup
- Room/area manager
- Master task list
- Task champion assignment
- Helper assignment
- Task dependencies
- Work hours
- Blackout dates
- Material blockers
- Today view
- Photo upload
- Basic critical-path indicator

## Required Logic

The app must support:

- No task starts before dependencies are complete
- No task schedules during blackout dates
- No person is double-booked unless manually allowed
- No material-required task starts without material marked available
- No helper-required task starts without helper assigned
- Cure/wait times must affect the schedule
- Critical-path task delays must affect the finish date
- Concurrent work is allowed only when safe
- Manual overrides must be logged

## AI Safety Rules

AI may suggest:

- Tasks
- Dependencies
- Durations
- Concurrent work
- Material lists
- Schedule changes
- Daily plans

AI must NOT:

- Delete tasks without confirmation
- Mark work complete by itself
- Override blockers automatically
- Change critical dependencies without approval
- Invent missing measurements, materials, or labour availability

## Development Rules

- Build mobile-first.
- Keep the interface simple and clean.
- Use clear beginner-friendly labels.
- Avoid unnecessary complexity.
- Use reusable components.
- Use proper database relationships.
- Add comments where logic is important.
- Test after each major feature.
- Commit in small stages.

## Recommended Stack

Use this unless there is a strong reason not to:

- Frontend: React or Next.js
- Database: Firebase Firestore
- Auth: Firebase Auth
- Photos/files: Firebase Storage
- Hosting: Render
- Code storage: GitHub

## First Required Response

Before writing any code, produce:

1. Technical architecture
2. Database design
3. Screen list
4. Component list
5. Phase 1 build plan
6. Test plan

Wait for approval before implementing.
