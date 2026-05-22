# Route Smoke Checklist

## How To Use

Run these checks only after a human explicitly starts the local app. This document does not require Codex to run `npm install`, `npm run build`, `npm run lint`, or deployment commands during unattended generation.

## Baseline Routes

| Route | Expected Mock Beta Result | Desktop | Mobile | Notes |
| --- | --- | --- | --- | --- |
| `/` | Landing or route hub renders and links to major mock areas. | [ ] | [ ] | Confirm no production-only setup prompt blocks entry. |
| `/qa/status` | QA local status dashboard renders with mock-only progress, blockers, routes, and next tasks. | [ ] | [ ] | No real service lookup; uses static `data/qa/statusMock.ts`. |
| `/qa/routes` | QA route index and preview hub renders grouped route cards. | [ ] | [ ] | No real service lookup; uses static `data/qa/routeHubMock.ts`. |
| `/qa/smoke` | QA visual smoke checklist renders route/state/responsive/production-safety checks. | [ ] | [ ] | Human browser review guide only. |
| `/qa/handoff` | QA merge handoff hub renders merge order, inputs, exit criteria, and blockers. | [ ] | [ ] | Mirrors `reports/qa/MERGE_HANDOFF.md`. |
| `/admin/dashboard` | Admin dashboard KPIs, risk alerts, and recent activity render. | [ ] | [ ] | If redirected to `/admin`, record actual behavior. |
| `/admin` | Admin shell or dashboard renders. | [ ] | [ ] | Verify sidebar and top navigation. |
| `/admin/companies` | Company management mock table renders. | [ ] | [ ] | Approval, suspended, and detail states should be visible or reachable. |
| `/admin/nurseries` | Nursery management mock table renders. | [ ] | [ ] | Include nursery, room, and tablet identifiers. |
| `/admin/products` | Product approval mock queue renders. | [ ] | [ ] | Rejected and pending states should be represented. |
| `/admin/orders` | Admin order list renders. | [ ] | [ ] | Payment and settlement states remain mock-only. |
| `/admin/payments` | Mock payment/refund management route renders. | [ ] | [ ] | No PG call is allowed. |
| `/admin/settlements` | Settlement queue renders. | [ ] | [ ] | Account display must be masked. |
| `/admin/audit-logs` | Audit/security log route renders. | [ ] | [ ] | Risk badges should be understandable. |
| `/company` | Company admin entry renders. | [ ] | [ ] | Confirm `company_id` context is visible. |
| `/company/dashboard` | Company dashboard metrics render. | [ ] | [ ] | Sales and payout numbers are mock. |
| `/company/products` | Product list and approval status render. | [ ] | [ ] | Draft, pending, approved, rejected states. |
| `/company/products/new` | Product registration mock UI renders. | [ ] | [ ] | Images use placeholder only. |
| `/company/inventory` | Inventory and external code mapping mock route renders. | [ ] | [ ] | No external API call. |
| `/company/orders` | Company order item list renders. | [ ] | [ ] | Verify order item-level settlement hints. |
| `/company/deliveries` | Delivery handling mock UI renders. | [ ] | [ ] | No shipping lookup API. |
| `/company/payouts` | Payout/settlement mock route renders. | [ ] | [ ] | No real payout action. |
| `/company/sales` | Sales mock route renders. | [ ] | [ ] | Confirm summary values are labeled mock/test. |
| `/nursery` | Nursery admin entry renders. | [ ] | [ ] | Confirm `nursery_id` context is visible. |
| `/nursery/dashboard` | Nursery dashboard metrics render. | [ ] | [ ] | Rooms, tablets, QR, pickup counts are mock. |
| `/nursery/rooms` | Room management mock UI renders. | [ ] | [ ] | Duplicate room number guidance should be visible. |
| `/nursery/tablets` | Tablet management route renders. | [ ] | [ ] | Last seen and active state should be visible. |
| `/nursery/pickups` | Pickup events mock route renders. | [ ] | [ ] | No notification or delivery integration. |
| `/nursery/qr-history` | QR session history route renders. | [ ] | [ ] | Expired, used, canceled states should be visible. |
| `/nursery/orders` | Nursery order history route renders. | [ ] | [ ] | Search/filter behavior can remain mock. |
| `/tablet/products` | Tablet product list renders. | [ ] | [ ] | Category, price, discount, and stock states. |
| `/tablet/products/product-care-kit` | Product detail route renders for a sample product. | [ ] | [ ] | Stable sample ID observed in `data/mockProducts.ts`. |
| `/tablet/cart` | Cart, quantity, pickup/delivery split, and QR generation entry render. | [ ] | [ ] | No real payment session. |
| `/tablet/qr` | Tablet QR mock generation/status route renders. | [ ] | [ ] | QR session expiration guidance. |
| `/tablet/ask` | Ask-to-pay or customer handoff mock route renders. | [ ] | [ ] | Session summary should be clear. |
| `/q/SANHO701` | Customer QR landing renders. | [ ] | [ ] | Expired/used variants should be tested if available. |
| `/q/SANHO701/checkout` | Customer checkout confirmation mock renders. | [ ] | [ ] | No PG script or live checkout. |
| `/q/SANHO701/success` | Success mock route renders. | [ ] | [ ] | Order number should be visible. |
| `/q/SANHO701/failed` | Failure mock route renders. | [ ] | [ ] | Retry/expired messaging should not imply live PG. |
| `/orders/guest` | Guest order lookup form renders. | [ ] | [ ] | Mock phone/order number input only. |
| `/orders/guest/A5-20260519-001` | Guest order detail renders. | [ ] | [ ] | Delivery, pickup, and refund request states are mock. |

## Segmented Checklists

Use these files for detailed route-family review:

| Area | Checklist |
| --- | --- |
| Admin | `reports/qa/ROUTE_SMOKE_ADMIN.md` |
| Company | `reports/qa/ROUTE_SMOKE_COMPANY.md` |
| Nursery | `reports/qa/ROUTE_SMOKE_NURSERY.md` |
| Tablet/QR/Guest | `reports/qa/ROUTE_SMOKE_TABLET_QR.md` |
| Firebase contract docs | `reports/qa/FIREBASE_CONTRACT_VALIDATION_CHECKLIST.md` |
| QA status dashboard | `reports/qa/STATUS_DASHBOARD_ROUTE_MAP.md` and `reports/qa/STATUS_DASHBOARD_STATE_COVERAGE.md` |
| QA route index, smoke, handoff | `reports/qa/ROUTE_INDEX.md`, `reports/qa/VISUAL_SMOKE_PLAN.md`, `reports/qa/MERGE_HANDOFF.md` |

## Browser Review Notes

- Check a wide desktop viewport for dense admin tables and filters.
- Check a phone-width viewport for `/q/*`, checkout, and guest order lookup.
- Check tablet-sized viewport for `/tablet/products`, product detail, cart, and QR routes.
- Record route failures with URL, viewport, screenshot path if available, and suspected source track.

## State Smoke Addendum

For each route above, record whether the route exposes or can simulate the following states without production integration:

| State | Pass | Fail | Notes |
| --- | --- | --- | --- |
| Empty state | [ ] | [ ] | No data, no search result, empty cart, no orders, no logs, or no sessions. |
| Loading state | [ ] | [ ] | Mock loading/skeleton does not create a live network dependency. |
| Error state | [ ] | [ ] | Invalid ID, invalid QR, failed lookup, failed mock payment, or blocked integration. |
| Normal state | [ ] | [ ] | Expected mock data renders with stable IDs and readable status. |
| Risk badge | [ ] | [ ] | Critical, warning, pending, expired, failed, low stock, payout hold, or access denied. |
| Blocked state | [ ] | [ ] | Firebase, PG, Storage, shipping, notification, or external API block is clear. |
| Mock-ready state | [ ] | [ ] | Reviewer can complete the mock flow without production dependencies. |
| Production-blocked state | [ ] | [ ] | UI does not imply real operation is enabled. |
| Filter/search/sort | [ ] | [ ] | Applicable to list/table routes only. |
| Detail view | [ ] | [ ] | Stable ID, snapshot, and mock-only status are visible. |
| Mobile/tablet responsive | [ ] | [ ] | No clipped labels, overlapping controls, or unreachable primary action. |

Use `STATE_COVERAGE_MATRIX.md` and `reports/qa/STATE_COVERAGE_MATRIX.md` to decide which states are P0/P1 for each area.
