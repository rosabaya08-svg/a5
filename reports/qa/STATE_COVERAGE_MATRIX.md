# QA State Coverage Matrix

## Companion Document

The root `STATE_COVERAGE_MATRIX.md` is the authoritative merged QA matrix. This report-local file remains as the QA track companion and uses the same core states: `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready`, and `production_blocked`.

## Purpose

This matrix expands the mock/test beta QA scope beyond route existence. It defines the expected state coverage for empty screens, error screens, risk badges, filtering, searching, sorting, detail mock pages, responsive behavior, and mock data quality. It is a QA guide only and does not connect real Firebase, PG, refund, settlement, delivery, notification, or external inventory services.

## State Definitions

| State | QA Meaning | Required Evidence |
| --- | --- | --- |
| Empty | The UI has no matching rows, products, orders, sessions, rooms, or logs. | Clear message, recovery action, and no broken layout. |
| Loading | The UI represents pending mock data or a future async boundary. | Loading copy/skeleton/spinner does not create a live dependency. |
| Error | A mock lookup, invalid ID, expired QR, failed payment, missing order, or blocked integration is represented. | Clear cause, safe next action, and no production service call. |
| Normal | The expected mock happy path renders. | Stable IDs, readable labels, and mock/test context are visible. |
| Risk | A status requires operator attention, such as failed payment, pending refund, settlement mismatch, expired QR, stock warning, or suspicious access. | Visible badge with severity and short reason. |
| Blocked | A flow is intentionally stopped because approval, credential, or production integration is not allowed. | Block reason, owner, and next step are visible or documented. |
| Mock Ready | A screen is reviewable with mock data and no external dependency. | Primary mock flow can be completed by a reviewer. |
| Production Blocked | Real operation is intentionally unavailable. | UI or docs make live Firebase/PG/Storage/external integration disabled status clear. |
| Filter | User can narrow data by tenant, status, date, category, or fulfillment mode. | Filter controls are visible and stable on desktop/tablet/mobile as applicable. |
| Search | User can search by order number, QR code, room, tablet, company, nursery, or product. | Search field has a clear target and empty-result behavior. |
| Sort | User can sort list/table data by date, status, amount, stock, or priority. | Sort state is visible and does not reshuffle unrelated sections. |
| Detail | User can inspect one entity without needing production data. | Detail page, panel, modal, or section shows stable mock identifiers and snapshots. |
| Responsive | Layout remains usable across desktop, tablet, and mobile widths. | No overlapping text, clipped controls, or hidden primary actions. |

## Route State Matrix

| Area | Route Examples | Empty | Error | Risk | Filter | Search | Sort | Detail | Responsive Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Landing | `/` | P2 | P2 | N/A | N/A | N/A | N/A | N/A | Desktop + mobile |
| Admin dashboard | `/admin`, `/admin/dashboard` | P1 | P1 | P0 | Date/status | N/A | Priority/date | Alert/order drilldown | Desktop first, mobile smoke |
| Admin companies | `/admin/companies` | P1 | P1 | P1 | Status/date | Company/name/id | Approval date/status | Company detail/tabs | Desktop first |
| Admin nurseries | `/admin/nurseries` | P1 | P1 | P1 | Region/status | Nursery/room/tablet | Name/status | Nursery/room/tablet detail | Desktop first |
| Admin products | `/admin/products` | P1 | P1 | P1 | Approval status/company | Product/company | Submitted date/status | Approval detail/reject reason | Desktop first |
| Admin orders/payments | `/admin/orders`, `/admin/payments` | P1 | P0 | P0 | Payment/status/date | Order/phone/session | Date/amount/risk | Order/payment snapshot | Desktop first |
| Admin settlements | `/admin/settlements` | P1 | P0 | P0 | Status/company/date | Company/order item | Amount/date/status | Settlement item detail | Desktop first |
| Admin audit logs | `/admin/audit-logs` | P1 | P1 | P0 | Severity/date/user | Actor/entity/id | Severity/date | Log detail | Desktop first |
| Company dashboard | `/company`, `/company/dashboard` | P1 | P1 | P1 | Date/status | N/A | Date/priority | Sales/order drilldown | Desktop + tablet |
| Company products | `/company/products`, `/company/products/new` | P1 | P1 | P1 | Approval/category | Product/code | Stock/status/date | Product form/detail | Desktop + tablet |
| Company inventory | `/company/inventory` | P1 | P0 | P0 | Stock/status | SKU/external code | Stock/risk | Movement detail | Desktop + tablet |
| Company orders/delivery | `/company/orders`, `/company/deliveries` | P1 | P0 | P1 | Fulfillment/status/date | Order/recipient | Date/status | Order item detail | Desktop + tablet |
| Company payouts/sales | `/company/payouts`, `/company/sales` | P1 | P0 | P0 | Settlement status/date | Settlement/order | Amount/date/status | Payout detail | Desktop + tablet |
| Nursery dashboard | `/nursery`, `/nursery/dashboard` | P1 | P1 | P1 | Date/status | N/A | Date/status | QR/pickup drilldown | Desktop + tablet |
| Nursery rooms | `/nursery/rooms` | P1 | P1 | P1 | Active/status | Room number | Room/status | Room/tablet detail | Desktop + tablet |
| Nursery tablets | `/nursery/tablets` | P1 | P1 | P0 | Active/access state | Tablet/room | Last seen/status | Tablet detail | Desktop + tablet |
| Nursery pickups | `/nursery/pickups` | P1 | P1 | P1 | Pickup status/date | Order/room | Date/status | Pickup event detail | Desktop + tablet |
| Nursery QR/orders | `/nursery/qr-history`, `/nursery/orders` | P1 | P1 | P1 | QR/order status/date | QR/order/room | Date/status | QR/order detail | Desktop + tablet |
| Tablet product list | `/tablet/products` | P0 | P1 | P1 | Category/stock | Product | Price/discount | Product card/detail | Tablet + mobile |
| Tablet product detail | `/tablet/products/product-care-kit` | P0 | P1 | P1 | Option/fulfillment | N/A | N/A | Product option/detail | Tablet + mobile |
| Tablet cart/QR | `/tablet/cart`, `/tablet/qr`, `/tablet/ask` | P0 | P0 | P0 | Fulfillment | N/A | N/A | Cart item/session detail | Tablet + mobile |
| Customer QR | `/q/SANHO701`, `/q/SANHO701/checkout` | P0 | P0 | P0 | N/A | N/A | N/A | Session/payment summary | Mobile first |
| Customer result | `/q/SANHO701/success`, `/q/SANHO701/failed` | P0 | P0 | P0 | N/A | N/A | N/A | Order/result summary | Mobile first |
| Guest order | `/orders/guest`, `/orders/guest/A5-20260519-001` | P0 | P0 | P1 | Status if list exists | Order/phone | N/A | Order/refund detail | Mobile first |

## Responsive QA Breakpoints

| Viewport | Width | Primary Routes |
| --- | --- | --- |
| Mobile narrow | 360px | `/q/SANHO701`, `/q/SANHO701/checkout`, `/orders/guest`, `/orders/guest/A5-20260519-001` |
| Mobile wide | 430px | Customer QR, result, and guest order routes |
| Tablet portrait | 768px | `/tablet/products`, `/tablet/cart`, `/tablet/qr`, nursery/company routes |
| Tablet landscape | 1024px | Tablet mall routes and admin dense tables |
| Desktop | 1440px | Admin, company, nursery management routes |

## Mock Data Quality Matrix

| Data Area | Required Mock Cases | QA Notes |
| --- | --- | --- |
| Products | Approved, pending, rejected, low stock, sold out, discounted, optioned, no-option | Product IDs must be stable for route smoke checks. |
| Orders | Delivery, pickup, paid, failed, pending refund, refunded, settlement pending | Order item snapshots must remain visible even if product data changes. |
| QR sessions | Active, expired, used, canceled, invalid code | Customer routes must never imply live PG session creation. |
| Companies | Active, approval pending, suspended, payout hold | Settlement account values must be masked. |
| Nurseries | Active, inactive, room/tablet mismatch, pickup pending | Customer data should remain mock-only. |
| Tablets | Active, inactive, stale last seen, blocked browser access | Access warnings should be clear and non-production. |
| Audit logs | Info, warning, critical, operator action, access denial | Risk badges need severity and timestamp. |
