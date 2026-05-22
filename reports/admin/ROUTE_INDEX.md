# Admin Route Index

Track: admin  
Workspace: my-app-admin  
Status hub: `/admin/status`  
Mode: mock/test beta only

## Safety Banner

Every admin page rendered through `AdminShell` now shows a mock/test beta warning and the phrase `실제 Firebase/PG 연결 없음`. The status hub also repeats that no real Firebase, PG, payout, refund, notification, delivery lookup, or external inventory connection exists.

## Preview Hub Cards

| Card | Route | Purpose | Status |
| --- | --- | --- | --- |
| Dashboard | `/admin/dashboard` | KPI, period filter, recent orders, risk alerts | ready_mock |
| Companies | `/admin/companies` | Company list, approval states, masked payout account | ready_mock |
| Company Detail | `/admin/companies/detail` | Basic info, admin accounts, products, orders, settlements, logs | ready_mock |
| Nurseries | `/admin/nurseries` | Nursery list with room, tablet, QR, pickup counts | ready_mock |
| Nursery Detail | `/admin/nurseries/detail` | Rooms, tablets, QR history, orders, pickup, risk logs | ready_mock |
| Rooms | `/admin/rooms` | Room table, tablet mapping, bulk create preview | ready_mock |
| Tablets | `/admin/tablets` | Tablet assignment, last seen, QR count, cart state | ready_mock |
| Products Approval | `/admin/products` | Approval queue, prices, placeholder images, reject reasons | ready_mock |
| Orders | `/admin/orders` | Order list, order_items separation, filters, detail link | ready_mock |
| Payments | `/admin/payments` | Mock payment ledger, TID, success/fail states | partial_mock |
| Refunds | `/admin/refunds` | Refund/cancel requests with real PG blocker | partial_mock |
| Settlements | `/admin/settlements` | order_items settlement basis and payout blocker | partial_mock |
| Notifications | `/admin/notifications` | Notification logs and missing-template failure state | blocked_real_connection |
| Delivery/Pickup | `/admin/delivery` | Alias for delivery and pickup event logs | blocked_real_connection |
| External Inventory | `/admin/inventory-sync` | Inventory sync readiness and secret/doc blockers | blocked_real_connection |
| Audit Logs | `/admin/audit-logs` | Audit table, security logs, detail timeline | ready_mock |
| Risk Center | `/admin/risk-center` | Operation blockers and release risk dashboard | ready_mock |

## Alias Routes

| Preferred Route | Legacy Route | Notes |
| --- | --- | --- |
| `/admin/delivery` | `/admin/delivery-events` | Both render the same mock delivery/pickup event page. |
| `/admin/risk-center` | `/admin/risks` | Both render the same mock operation risk dashboard. |

## Extended Admin Routes

- `/admin`
- `/admin/status`
- `/admin/qr-sources`
- `/admin/products/detail`
- `/admin/orders/detail`
- `/admin/payments/detail`
- `/admin/refunds/detail`
- `/admin/settlements/detail`
- `/admin/audit-logs/detail`
- `/admin/integrations`
- `/admin/search`
- `/admin/permissions`
- `/admin/exports`
- `/admin/sla`
- `/admin/data-quality`
- `/admin/release-readiness`
- `/admin/queue-ownership`
- `/admin/change-requests`
- `/admin/privacy-review`
- `/admin/incidents`
- `/admin/onboarding`
- `/admin/accessibility`
- `/admin/localization`
- `/admin/performance-budget`
- `/admin/merge-readiness`
- `/admin/handoff`

## Real Connection Status

- Firebase: no real connection.
- Firestore/Auth: no real connection.
- PG: mock only.
- Refund/cancel execution: blocked.
- Settlement payout: blocked.
- Alimtalk: blocker.
- Delivery lookup: blocker.
- External inventory API: blocker.
- Storage: Spark limitation pending.
- Production deploy/open: forbidden.
