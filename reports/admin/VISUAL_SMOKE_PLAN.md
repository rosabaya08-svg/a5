# Admin Visual Smoke Plan

Track: admin  
Workspace: my-app-admin  
Entry route: `/admin/status`

## Preconditions

- Run this only after dev-server usage is allowed by the human operator.
- Do not connect Firebase, PG, Alimtalk, delivery lookup, external inventory, Storage, or production deploy during this smoke.
- Do not treat mock buttons as real approval, refund, payout, or notification actions.

## Click Order

1. Open `/admin/status`.
2. Confirm the top status banner says mock/test beta and `실제 Firebase/PG 연결 없음`.
3. Confirm progress cards, blocker cards, next-task cards, and state coverage cards render.
4. In the Preview hub, open `Dashboard` and check KPI cards, period filters, recent order table, and risk alerts.
5. Return to `/admin/status`.
6. Open `Companies` and check pending/approved/suspended/rejected states, masked account display, filters, empty/error UI.
7. Open `Company Detail` and check tabs for basic info, admin accounts, products, orders, settlements, risk logs, and approval history.
8. Open `Nurseries` and check nursery_id, address, manager, room count, tablet count, active QR count, and pickup waiting count.
9. Open `Nursery Detail` and check rooms, tablets, QR history, orders, pickup, and risk logs.
10. Open `Rooms` and check room_id, room_number, tablet mapping, recent QR, pickup waiting, and bulk registration preview.
11. Open `Tablets` and check tablet_id, nursery_id, room_id, last seen, QR count, cart state, and browser-blocking notice.
12. Open `Products Approval` and check approval states, price comparison, placeholder image, reject reason, and reapproval warning.
13. Open `Orders` and check order-level and order_items-level tables, filters, and detail links.
14. Open `Payments` and confirm all PG status remains mock only.
15. Open `Refunds` and confirm partial cancel/refund actions show blockers only.
16. Open `Settlements` and confirm payout remains blocked and order_items are the settlement basis.
17. Open `Notifications` and confirm missing-template blocker is visible.
18. Open `Delivery/Pickup` at `/admin/delivery` and confirm delivery_events and pickup_events are separated.
19. Open the legacy alias `/admin/delivery-events` and confirm it renders the same mock page.
20. Open `External Inventory` and confirm official docs / secret / blocked statuses.
21. Open `Audit Logs` and check audit table, security logs, detail timeline, and risk state badges.
22. Open `Risk Center` at `/admin/risk-center` and confirm PG, Storage, Alimtalk, delivery, inventory, rules, and deploy blockers.
23. Open the legacy alias `/admin/risks` and confirm it renders the same mock page.

## Responsive Checks

- Desktop: verify preview hub cards render in multiple columns without overlapping text.
- Tablet: verify cards collapse cleanly and route links remain tappable.
- Mobile: verify route cards, tables, compact lists, badges, and banners wrap without horizontal text overlap.

## State Coverage Checks

- Empty state: company detail, search/no-result style panels, and checklist panels.
- Loading state: shared admin mock loading blocks.
- Error state: shared admin mock error blocks.
- Risk state: PG, refund, payout, Alimtalk, delivery, inventory, Storage, Firestore Rules, production deploy.

## Stop Conditions

- Any route shows a missing page error.
- Any page implies real Firebase/PG/payment/refund/payout action is available.
- Any text overlap hides route links, status badges, or blockers.
- Any screen imports or requests real Firebase/PG/API data.
