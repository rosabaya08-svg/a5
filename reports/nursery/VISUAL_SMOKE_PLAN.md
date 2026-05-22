# Nursery Visual Smoke Plan

## Purpose
Use this checklist only after a dev server is already running or after runtime commands are explicitly allowed. The current unattended task did not run build, lint, npm, git, deploy, or browser automation.

## Status Hub First
1. Open `/nursery/status`.
2. Confirm the page says `mock/test beta`.
3. Confirm it says 운영 오픈/실결제 아님.
4. Confirm route cards are visible for Dashboard, Rooms, Room Detail, Room Bulk Create, Tablets, Tablet Detail, Tablet Assignment, QR History, QR Detail, Pickups, Pickup Detail, Orders, Order Detail, and Risk Center.
5. Confirm each route card shows nursery mock context or route-specific context.

## Route Checks
| Route | Expected visual state |
| --- | --- |
| `/nursery` | Dashboard content with mock context cards |
| `/nursery/rooms` | Room list with room_id, room_number, linked tablet, active QR |
| `/nursery/rooms/detail` | Tab panels for room info, tablet, QR, order, pickup |
| `/nursery/rooms/bulk-create` | Bulk create preview and duplicate warnings |
| `/nursery/tablets` | Tablet list with access state and cart state |
| `/nursery/tablets/detail` | Tablet detail with disabled real session actions |
| `/nursery/tablets/assignment` | Assignment/reassignment mock table |
| `/nursery/qr-history` | QR states: active, expired, used, payment_failed, canceled |
| `/nursery/qr-history/detail` | QR identifiers and payment status mock |
| `/nursery/pickups` | pickup_events table |
| `/nursery/pickups/detail` | pickup snapshot and audit log |
| `/nursery/orders` | pickup_events and delivery_events shown separately |
| `/nursery/orders/detail` | order_items and fulfillment split |
| `/nursery/risk-center` | risk badges and no-connect blockers |

## State Coverage
- Empty: search result 없음, unassigned state, no result copy.
- Loading: static loading state before repository connection.
- Error: nursery_id mismatch and room/tablet binding errors.
- Risk: offline tablet, QR expiration growth, long pickup wait, unassigned tablet, payment_failed, delivery blocker.

## No-Connect Assertions
- Firebase: 실제 연결 없음.
- PG: mock only.
- Alimtalk: blocker.
- Delivery tracking: blocker.
- External inventory API: blocker.
- Storage: Spark limitation pending.
