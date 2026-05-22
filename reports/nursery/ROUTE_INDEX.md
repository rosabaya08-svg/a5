# Nursery Route Index

## Track
- Track: `nursery`
- Worktree: `my-app-nursery`
- Status hub: `/nursery/status`
- Mode: mock/test beta only

## Mock Context Required On Screens
- `nursery_id`: `nursery-gangnam-01`
- `room_id`: `room-701`
- `tablet_id`: `tablet-701-a`

## Browser Preview Routes
| Group | Route | Page status | Visual check |
| --- | --- | --- | --- |
| Dashboard | `/nursery` | exists | KPI, risk, context cards |
| Dashboard | `/nursery/dashboard` | exists | KPI, period/status filters |
| Status Hub | `/nursery/status` | exists | route preview grid, blockers, state coverage |
| Rooms | `/nursery/rooms` | exists | room_id, room_number, linked tablet, active QR |
| Room Detail | `/nursery/rooms/detail` | exists | base info, tablet, QR, order, pickup tabs |
| Room Bulk Create | `/nursery/rooms/bulk-create` | exists | start/end/prefix, duplicate warning, preview table |
| Room Bulk Legacy | `/nursery/rooms/bulk` | exists | legacy alias-style bulk preview |
| Tablets | `/nursery/tablets` | exists | tablet_id, room_id, last seen, QR count, cart |
| Tablet Detail | `/nursery/tablets/detail` | exists | tablet detail and access block notice |
| Tablet Assignment | `/nursery/tablets/assignment` | exists | assignment/reassignment mock |
| Tablet Access | `/nursery/tablets/access` | exists | tablet session and browser block policy |
| QR History | `/nursery/qr-history` | exists | active, expired, used, payment_failed, canceled |
| QR Detail | `/nursery/qr-history/detail` | exists | short_code, qr_session_id, cart_id, room_id, tablet_id |
| Pickups | `/nursery/pickups` | exists | pickup_events ready/completed/exception |
| Pickup Detail | `/nursery/pickups/detail` | exists | order_items snapshot and audit log |
| Orders | `/nursery/orders` | exists | pickup_events and delivery_events split |
| Order Detail | `/nursery/orders/detail` | exists | order_items and fulfillment split |
| Risk Center | `/nursery/risk-center` | exists | tablet, QR, pickup, delivery risk states |
| Operations | `/nursery/operations` | exists | operation risk queue |
| Search | `/nursery/search` | exists | room/tablet/order/QR/status search mock |
| States | `/nursery/states` | exists | empty/loading/error/risk coverage |
| Mock Data | `/nursery/mock-data` | exists | generated data counts |
| Room Stats | `/nursery/stats/rooms` | exists | room order statistics |
| Tablet Stats | `/nursery/stats/tablets` | exists | tablet QR statistics |

## No-Connect Route Rules
- No Firebase SDK import.
- No Firestore/Auth reads or writes.
- No PG, refund, settlement, Alimtalk, delivery tracking, or external inventory calls.
- No actual Storage upload.
- No production deployment.
