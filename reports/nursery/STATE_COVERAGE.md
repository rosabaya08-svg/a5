# Nursery State Coverage

## Covered States
- Empty: no result for `room_id`, QR code, or order search.
- Loading: static loading state before real repository integration.
- Error: nursery_id scope mismatch and invalid room/tablet binding.
- Ready: display-only beta state with mock rows.
- Risk: tablet offline, QR expiration growth, long pickup wait, unassigned tablet, payment_failed.

## Screen Coverage
- Dashboard: KPI, risk, search/sort, pagination, empty/error/loading/ready.
- Rooms: duplicate guard, active QR, recent order, status filter, state scenarios.
- Room detail: tabbed mock sections for info, tablet, QR, orders, pickup.
- Room bulk: duplicate preview and save-blocked warning.
- Tablets: QR generated count, cart state, access state, risk badge.
- Tablet access: tablet session, room-bound, browser policy, risk.
- Pickups: ready/completed/exception status and action mock.
- Pickup detail: order_items snapshot and audit log mock.
- QR history: active/expired/used/canceled/payment_failed states and 2~3 hour expiration guidance.
- Orders: delivery/pickup split, status filter, search/sort mock.
- Status dashboard: done/in-progress/blocked cards, integration blockers, route smoke list, human review list, mock data snapshot.
- Risk center: QR, pickup_events, delivery_events, tablet and blocker risks.
- Tablet assignment: empty/loading/error/risk states reused for assignment/reassignment display.
- Status dashboard visual matrix: rooms, tablets, QR, pickup_events, delivery_events each list empty/loading/error/risk cases.

## Not Covered Until Later
- Real loading from network.
- Real validation errors from server.
- Real route-param based detail data.
- Persisted filters or querystring handling.
- Live progress telemetry from filesystem, git, CI, or browser runtime.
- Real delivery tracking state from carriers or external inventory APIs.
