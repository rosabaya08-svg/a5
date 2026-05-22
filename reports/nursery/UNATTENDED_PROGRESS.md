# Nursery Unattended Progress

## Batch 17
- Added period/status filters to the dashboard.

## Batch 18
- Expanded room list columns: room_id, room_number, status, linked tablet, active QR, recent order.

## Batch 19
- Expanded room detail with static tab sections: base info, tablet, QR history, order history, pickup history.

## Batch 20
- Added room bulk registration wizard route and preview table.

## Batch 21
- Added room status change mock for active, inactive, maintenance, blocked.

## Batch 22-25
- Expanded tablet list/detail/access screens with QR count, cart state, reassignment mock, and browser block guidance.

## Batch 26-28
- Expanded QR history and QR detail states: active, expired, used, canceled, payment_failed.

## Batch 29-33
- Expanded order and pickup detail mocks with snapshots, pickup timeline, and audit logs.

## Batch 34-35
- Added room order statistics and tablet QR statistics routes.

## Batch 36-40
- Expanded risk panels, unified search, pagination, state UI, and responsive grid/flex layouts.

## Batch 41
- Added generated mock arrays:
  - 30 rooms
  - 30 tablets
  - 50 QR sessions
  - 50 orders
  - 30 pickup events

## Batch 42-49
- Added route map, state coverage, pickup checklist, tablet checklist, QR checklist.
- Updated AUTO_REPORT, NEXT_TASKS, BLOCKERS.

## Batch 50-70 Seed
- Added `/nursery/mock-data` and `/nursery/operations` to continue review of large mock datasets and operation queues.
- Next unattended expansion should add client-state drafts, route param migration notes, and screenshot checklist when commands are allowed.

## Batch 71
- Added `/nursery/status` for local browser-visible worktree progress inspection.
- Added status summary mock data covering progress, routes, blockers, next tasks, human review, smoke routes, and state coverage.
- Added done/in-progress/blocked visual cards and mock data snapshot sections.
- Linked the status dashboard from the nursery Admin navigation.

## Batch 72
- Updated `STATUS_SUMMARY.md`, `ROUTE_MAP.md`, `STATE_COVERAGE.md`, `AUTO_REPORT.md`, `NEXT_TASKS.md`, and `BLOCKERS.md`.
- Kept status dashboard static and display-only to avoid filesystem scans, Firebase access, or runtime checks.

## Batch 73
- Added `STATUS_SMOKE_MATRIX.md` for later manual browser inspection.
- Listed `/nursery/status` and linked nursery routes with expected mock/test display and human review notes.
- Repeated no-connect assertions for Firebase, PG, Alimtalk, delivery tracking, external inventory API, and Storage.

## Batch 74
- Added `NurseryRoutePreviewGrid` and connected it to `/nursery/status`.
- Added route cards for Dashboard, Rooms, Room Detail, Room Bulk Create, Tablets, Tablet Detail, Tablet Assignment, QR History, QR Detail, Pickups, Pickup Detail, Orders, Order Detail, and Risk Center.
- Added `/nursery/rooms/bulk-create`, `/nursery/tablets/assignment`, and `/nursery/risk-center`.
- Added nursery-wide mock context cards for `nursery_id`, `room_id`, and `tablet_id`.

## Batch 75
- Added `delivery_events` mock data and separated it from `pickup_events` on order screens.
- Added `ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, and `MERGE_HANDOFF.md`.
- Updated route map, status summary, state coverage, blockers, next tasks, and commit candidate notes.

## Batch 76
- Added visual state matrix to `/nursery/status`.
- Covered empty/loading/error/risk for rooms, tablets, QR, pickup_events, and delivery_events.
