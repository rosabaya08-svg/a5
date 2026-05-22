# Nursery Route Map

## Primary Admin Routes
- `/nursery` - dashboard redirect-style index mock
- `/nursery/dashboard` - KPI, period/status filters, risk, state, search/sort, pagination mock
- `/nursery/rooms` - room list with room_id, room_number, tablet, active QR, recent order
- `/nursery/rooms/detail` - room detail with static tab sections
- `/nursery/rooms/bulk` - bulk room registration wizard preview
- `/nursery/rooms/bulk-create` - recommended bulk room creation preview route
- `/nursery/rooms/status` - active/inactive/maintenance/blocked status change mock
- `/nursery/tablets` - tablet list with QR count and cart state
- `/nursery/tablets/detail` - tablet assignment/reassignment/inactivation mock
- `/nursery/tablets/assignment` - tablet assignment and reassignment mock
- `/nursery/tablets/access` - tablet session, room-bound, browser-block mock
- `/nursery/pickups` - pickup_events list
- `/nursery/pickups/detail` - pickup snapshot, order_items, handler, timeline, audit log mock
- `/nursery/qr-history` - qr_payment_sessions status list
- `/nursery/qr-history/detail` - QR detail with short_code, qr_session_id, cart_id, room_id, tablet_id, expires_at, status
- `/nursery/orders` - nursery_id-scoped order list
- `/nursery/orders/detail` - order detail mock

## Additional Mock Routes
- `/nursery/stats/rooms` - room order statistics mock
- `/nursery/stats/tablets` - tablet QR statistics mock
- `/nursery/search` - unified search mock
- `/nursery/states` - empty/loading/error/risk/ready state coverage
- `/nursery/mock-data` - generated mock data counts
- `/nursery/operations` - operation queue/risk checklist mock
- `/nursery/status` - local progress/status dashboard for browser visual inspection
- `/nursery/risk-center` - nursery risk center for tablet/QR/pickup/delivery blockers

## Route Decisions
- Dynamic route params are intentionally deferred.
- Static detail routes avoid relying on unavailable local Next.js docs.
- All routes are mock/test beta only.
- `/nursery/status` is static and does not scan files, connect services, or execute runtime checks.
- `/nursery/risk-center` is display-only and does not trigger notifications, delivery lookup, or payment actions.
