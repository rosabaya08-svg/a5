# Nursery Status Smoke Matrix

## Purpose
This matrix is for manual browser inspection after a dev server is already available or after runtime commands are explicitly allowed. It does not require Firebase, PG, notification, delivery tracking, Storage, or external inventory access.

## Primary Status Route
| Route | Expected mock/test display | Human check |
| --- | --- | --- |
| `/nursery/status` | Track name, progress cards, generated file count, blocker cards, next tasks, smoke route list | Confirm it clearly says mock/test beta and not production/open payment |

## Linked Nursery Routes
| Route | Expected mock/test display | Human check |
| --- | --- | --- |
| `/nursery` | Dashboard index-style mock | Confirm it lands on nursery dashboard content |
| `/nursery/dashboard` | KPI, period/status filter, risk alerts | Confirm nursery_id scoped copy |
| `/nursery/rooms` | Room list, linked tablet, active QR, recent order | Confirm duplicate guard notice exists |
| `/nursery/rooms/bulk` | Bulk registration preview | Confirm no actual save action is implied |
| `/nursery/rooms/bulk-create` | Recommended bulk registration preview | Confirm no actual save action is implied |
| `/nursery/rooms/status` | active/inactive/maintenance/blocked state mock | Confirm status changes are display-only |
| `/nursery/tablets` | Tablet list, last seen, QR count, cart state | Confirm offline/access risk badges |
| `/nursery/tablets/assignment` | Tablet assignment/reassignment preview | Confirm no real device session mutation |
| `/nursery/tablets/access` | Tablet session and browser block notice | Confirm no real session validation is implied |
| `/nursery/pickups` | Pickup queue and completion mock | Confirm no notification/delivery side effect |
| `/nursery/qr-history` | QR active/expired/used/canceled/payment_failed rows | Confirm 2~3 hour expiry guidance |
| `/nursery/orders` | Nursery order history with delivery/pickup split | Confirm no real customer data |
| `/nursery/risk-center` | QR, tablet, pickup, delivery risk hub | Confirm blockers remain visible |
| `/nursery/search` | Unified search mock | Confirm filters are display-only |
| `/nursery/states` | empty/loading/error/risk/ready coverage | Confirm all state cards are visible |
| `/nursery/mock-data` | Generated mock counts | Confirm 30/30/50/50/30 summary |
| `/nursery/operations` | Operational risk checklist | Confirm blockers remain visible |

## No-Connect Assertions
- Firebase: no real connection.
- PG: mock only.
- Alimtalk: blocker.
- Delivery tracking: blocker.
- External inventory API: blocker.
- Storage: Spark limitation pending.
