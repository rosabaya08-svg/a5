# Nursery Route Smoke Checklist

## Scope

Owner track: `nursery`

This checklist validates nursery admin mock/test beta screens scoped by `nursery_id`. It does not approve real customer data storage, notification sending, delivery integration, or payment integration.

## Routes

| Route | Desktop | Tablet | Required States | Required Controls | Notes |
| --- | --- | --- | --- | --- | --- |
| `/nursery` | [ ] | [ ] | `normal`, `mock_ready`, `production_blocked` | Nursery navigation | Entry can redirect or render dashboard if documented. |
| `/nursery/dashboard` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Date/status filter | Rooms, tablets, QR, pickups, order history mock KPIs. |
| `/nursery/rooms` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Active/status filter, room search | Duplicate room number guidance. |
| `/nursery/tablets` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Active/access filters, tablet search, last-seen sort | Browser access blocked and stale tablet states. |
| `/nursery/pickups` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Pickup/date filters, order/room search | Pending/completed/canceled pickup events. |
| `/nursery/qr-history` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | QR status/date filters, room search | Active, expired, used, canceled QR states. |
| `/nursery/orders` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Order/status/date filters, order/room search | Customer data remains mock/masked. |

## Required Failure Notes

- Missing `nursery_id`, `room_id`, or `tablet_id` context is P1.
- Real customer phone/address exposure is P0/P1 depending on severity.
- Tablet browser-block/access warnings missing from tablet management are P1 for beta readiness.

