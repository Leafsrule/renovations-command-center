# Favorite 1.0 Foundation

This branch begins the Favorite 1.0 operational app upgrade while preserving the existing task execution, readiness, authentication, and Firestore structures.

## Implemented

- Live mobile schedule board replacing the Schedule placeholder
- Schedule states for completed, late, blocked, waiting, review, in-progress, ready, scheduled, and pending work
- Next-14-days, critical, and all-task filters
- Concurrent-work, dependency, material, due-date, room, and duration indicators
- Task-linked material readiness dashboard
- Duplicate material grouping and missing-detail detection
- Domain foundations for measurements, photo requirements, materials, decisions, coordinates, validation checks, and sync audits
- Unit tests for schedule projection and material grouping

## Workbook migration mapping

| Workbook area | App entity |
| --- | --- |
| Task List | RenovationTask |
| Measurements | MeasurementRecord |
| Photo Index | PhotoRequirement |
| Materials Inventory | MaterialRecord |
| Decision & Revision Log | DecisionRecord |
| Folder Index | Drive folder mapping and SyncAuditLog |
| Schedule Overview / Daily Schedule / Daily Calendar | Schedule projection and future schedule blocks |
| Coordinate & Dimensions | CoordinatePoint and ValidationCheck |

## Follow-on phases

1. Persist measurements, decisions, coordinates, and photo requirements in Firestore.
2. Add workbook import and parity reporting.
3. Add Google Drive photo/file routing and naming.
4. Add approval notifications and Google Calendar synchronization.
5. Add PWA caching, offline queues, and deployment configuration.
