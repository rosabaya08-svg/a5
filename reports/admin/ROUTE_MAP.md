# Admin Route Map

Track: admin
Workspace: my-app-admin
Mode: mock/test beta

## Primary Routes

| Route | Purpose | Status |
| --- | --- | --- |
| `/admin` | Admin index and safe entry points | mock_ready |
| `/admin/status` | Local visual worktree status dashboard | mock_ready |
| `/admin/dashboard` | KPI dashboard, period mock, recent orders, risk center | mock_ready |
| `/admin/companies` | Company list, approval status, masked settlement account | mock_ready |
| `/admin/companies/detail` | Company detail tabs and static approval review | mock_ready |
| `/admin/nurseries` | Nursery list and QR provenance summary | mock_ready |
| `/admin/nurseries/detail` | Nursery detail, rooms, tablets, QR history | mock_ready |
| `/admin/rooms` | Room list and bulk registration preview | mock_ready |
| `/admin/tablets` | Tablet assignment and access-state review | mock_ready |
| `/admin/qr-sources` | QR source tracing by cart, QR, nursery, room, tablet | mock_ready |
| `/admin/products` | Product approval queue and price comparison | mock_ready |
| `/admin/products/detail` | Product approval detail and reapproval requirement | mock_ready |
| `/admin/orders` | Orders and order_items separated | mock_ready |
| `/admin/orders/detail` | Order detail with payment and settlement preview | mock_ready |
| `/admin/payments` | Mock payment ledger | mock_ready |
| `/admin/payments/detail` | Payment detail mock | mock_ready |
| `/admin/refunds` | Refund/cancel request queue | mock_ready |
| `/admin/refunds/detail` | Refund detail mock | mock_ready |
| `/admin/settlements` | Company settlement review by order_items | mock_ready |
| `/admin/settlements/detail` | Settlement detail mock | mock_ready |
| `/admin/notifications` | Notification log mock | mock_ready |
| `/admin/delivery` | Preferred Delivery/Pickup visual smoke route | mock_ready |
| `/admin/delivery-events` | delivery_events and pickup_events mock | mock_ready |
| `/admin/inventory-sync` | External inventory sync status mock | mock_ready |
| `/admin/integrations` | External integration readiness board | mock_ready |
| `/admin/risk-center` | Preferred operational risk center visual smoke route | mock_ready |
| `/admin/risks` | Operational risk dashboard | mock_ready |
| `/admin/search` | Unified admin search mock | mock_ready |
| `/admin/permissions` | Role-permission matrix mock | mock_ready |
| `/admin/exports` | Disabled export preview mock | mock_ready |
| `/admin/sla` | SLA aging mock | mock_ready |
| `/admin/data-quality` | Data quality issue mock | mock_ready |
| `/admin/release-readiness` | Release readiness mock | mock_ready |
| `/admin/queue-ownership` | Queue ownership by owner/team | mock_ready |
| `/admin/change-requests` | High-risk change request mock | mock_ready |
| `/admin/privacy-review` | Privacy review mock | mock_ready |
| `/admin/incidents` | Incident response mock | mock_ready |
| `/admin/onboarding` | Admin onboarding checklist | mock_ready |
| `/admin/accessibility` | Accessibility checklist mock | mock_ready |
| `/admin/localization` | Localization checklist mock | mock_ready |
| `/admin/performance-budget` | Performance budget mock | mock_ready |
| `/admin/merge-readiness` | Merge readiness mock | mock_ready |
| `/admin/handoff` | Final admin handoff mock | mock_ready |
| `/admin/audit-logs` | Audit and security logs | mock_ready |
| `/admin/audit-logs/detail` | Audit log detail timeline | mock_ready |

## Route Decisions

- Dynamic route params were not created because the local Next.js docs directory is unavailable and build/lint are forbidden in this unattended mode.
- Static `/detail` routes are intentionally used for mock/test beta coverage.
- `/admin/delivery` and `/admin/risk-center` are preferred visual smoke aliases for existing admin mock pages.
- No route performs production mutations or live external calls.
