# State Coverage Matrix

## Purpose

This is the root QA state matrix for mock/test beta integration. It defines which states must be visible or manually testable before the merged beta can be reviewed. It does not authorize production Firebase, PG payment, refund, settlement, notification, shipping lookup, Storage upload, or external inventory API integration.

## Required States

| State | Meaning | Pass Criteria | Production Safety Rule |
| --- | --- | --- | --- |
| `empty` | No rows, no cart items, no QR sessions, no matching search result, or no logs. | Layout remains stable and suggests a safe next action. | Do not fetch production data to fill the empty state. |
| `loading` | Mock data is being prepared or a future async boundary is represented. | Loading copy/skeleton/spinner does not block forever in static mock mode. | Do not create real network dependency. |
| `error` | Invalid ID, missing order, invalid QR, failed mock payment, or unavailable adapter. | User sees cause, recovery action, and mock-only status. | Do not call live Firebase, PG, shipping, or external APIs. |
| `normal` | Expected happy path with mock data. | Primary content renders with stable identifiers and readable labels. | Mark values as mock/test where confusion is possible. |
| `risk` | Needs operator attention: failed payment, refund pending, settlement hold, low stock, expired QR, suspicious access, stale tablet. | Visible badge with severity and short reason. | Do not execute irreversible actions. |
| `blocked` | Feature cannot proceed due to policy, missing approval, external dependency, or production-only integration. | Block reason and owner/next step are shown. | Record in blockers rather than wiring real services. |
| `mock_ready` | Mock/test beta behavior is reviewable without production dependency. | Screen is usable with local mock data and documented limits. | Keep repository/adapters separable from real implementation. |
| `production_blocked` | Not allowed for real operation yet. | Screen/doc states real operation is disabled or pending approval. | No live credentials, config, rules, deploy, or secrets. |

## Area Matrix

| Area | Required States | Required Controls | Required Detail Evidence | Responsive Priority |
| --- | --- | --- | --- | --- |
| Admin dashboard | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready`, `production_blocked` | Date/status filters | KPI source labels, risk alert detail, recent order snapshot | Desktop first, mobile smoke |
| Admin companies | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Approval/status filter, company search, date sort | Company detail tabs, masked settlement account, approval history | Desktop first |
| Admin nurseries | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Region/status filter, nursery/room/tablet search | Nursery, room, tablet IDs and QR source context | Desktop first |
| Admin products | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Company/status/category filter, product search, submitted sort | Approval detail, rejection reason, product snapshot | Desktop first |
| Admin payments/refunds | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Payment/refund/date filters, order search | Payment snapshot, mock refund reason, PG blocked note | Desktop first |
| Admin settlements | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Settlement/company/date filters, amount sort | Settlement item detail, masked account, payout blocked note | Desktop first |
| Admin audit logs | `empty`, `loading`, `error`, `normal`, `risk` | Severity/date/actor filters, entity search | Log detail with actor, entity, timestamp, severity | Desktop first |
| Company dashboard | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Date/status filters | Sales/order/payout summaries scoped by `company_id` | Desktop + tablet |
| Company products | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Approval/category filters, product search, stock sort | Product form/detail, option snapshot, placeholder image state | Desktop + tablet |
| Company inventory | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Stock/status filters, external code search | Inventory movement detail, external API blocked note | Desktop + tablet |
| Company orders/deliveries | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Fulfillment/status/date filters, order search | Order item detail, invoice mock field, shipping API blocked note | Desktop + tablet |
| Company payouts/sales | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Settlement/date/status filters, amount sort | Payout detail, mock deposit state, real payout blocked note | Desktop + tablet |
| Nursery dashboard | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Nursery/status/date filters | Room/tablet/QR/pickup summaries scoped by `nursery_id` | Desktop + tablet |
| Nursery rooms | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Active/status filter, room search | Room detail, duplicate number guidance, linked tablet state | Desktop + tablet |
| Nursery tablets | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Active/access filters, tablet search, last seen sort | Tablet detail, stale access warning, browser block note | Desktop + tablet |
| Nursery pickups | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Pickup/date filters, order/room search | Pickup event detail and mock completion state | Desktop + tablet |
| Nursery QR/orders | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | QR/order/date/status filters, room search | QR/order detail, expiration and used/canceled states | Desktop + tablet |
| Tablet products | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Category/stock filters, product search, price sort | Product card/detail, option/stock/discount evidence | Tablet + mobile |
| Tablet cart/QR | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready`, `production_blocked` | Fulfillment selector, quantity controls | Cart item snapshot, QR session ID, expiration, PG blocked note | Tablet + mobile |
| Customer QR checkout | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready`, `production_blocked` | Minimal customer/payment mock fields | QR session summary, third-party payer mock, no live PG call | Mobile first |
| Customer result pages | `error`, `normal`, `risk`, `blocked`, `mock_ready`, `production_blocked` | Result-specific actions | Success order number, failure reason, expired/used state | Mobile first |
| Guest order lookup | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready`, `production_blocked` | Order/phone lookup fields | Order detail, fulfillment state, mock refund request | Mobile first |

## Breakpoints

| Breakpoint | Width | Must Review |
| --- | --- | --- |
| Mobile narrow | 360px | QR landing, checkout, success/failed, guest order lookup |
| Mobile wide | 430px | Customer QR and guest detail content density |
| Tablet portrait | 768px | Tablet products, cart, QR, nursery/company list screens |
| Tablet landscape | 1024px | Tablet mall and dense management tables |
| Desktop | 1440px | Admin/company/nursery management workflows |

## Recording Format

| Route | State | Result | Owner | Notes |
| --- | --- | --- | --- | --- |
| TBD | `empty` | Not run / Pass / Fail / Blocked | TBD | TBD |
| TBD | `error` | Not run / Pass / Fail / Blocked | TBD | TBD |
| TBD | `risk` | Not run / Pass / Fail / Blocked | TBD | TBD |
| TBD | `mock_ready` | Not run / Pass / Fail / Blocked | TBD | TBD |
| TBD | `production_blocked` | Not run / Pass / Fail / Blocked | TBD | TBD |

