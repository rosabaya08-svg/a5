# Mock Fixture Expectations

## Purpose

This document defines the minimum mock fixture coverage expected after all tracks merge. It helps prevent route smoke failures caused by missing IDs, inconsistent statuses, or unclear production-blocked states.

## Stable Route Fixtures

| Fixture | Required Stable Value | Used By |
| --- | --- | --- |
| Product ID | `product-care-kit` | `/tablet/products/product-care-kit`, cart, order item snapshots |
| QR short code | `SANHO701` | `/q/SANHO701`, checkout, success, failed, QR history |
| Guest order number | `A5-20260519-001` | `/orders/guest/A5-20260519-001`, admin/company/nursery order views |
| Company ID | `company-sanho-care` or final agreed equivalent | Company admin, products, order items, settlements |
| Nursery ID | Stable sample nursery ID | Nursery admin, room/tablet/QR session views |
| Tablet ID | Stable sample tablet ID | Tablet mall banner, tablet access state |
| Room ID | Stable sample room ID | Nursery room/tablet and tablet QR context |

## Required Product Fixtures

- Approved product with options.
- Approved product with no options.
- Pending approval product.
- Rejected product with reason.
- Low-stock product.
- Sold-out or unavailable product.
- Placeholder image/GIF product.
- External inventory code mapped product with blocked external API state.

## Required Order Fixtures

- Delivery order.
- Pickup order.
- Payment succeeded order.
- Payment failed order.
- QR expired order attempt.
- Refund requested order.
- Settlement pending order item.
- Settlement completed order item.

## Required QR Session Fixtures

- Active session.
- Expired session.
- Used session.
- Canceled session.
- Invalid short code/no-match case.
- Failed mock payment case.
- Success mock payment case.

## Required Risk Fixtures

- Payment failed.
- Refund requested.
- Settlement hold.
- Inventory low stock.
- Tablet stale last seen.
- Browser access blocked.
- Critical audit log.
- External API blocked.

## Encoding And Syntax Expectations

- Mock display text should be valid UTF-8 or ASCII.
- Object literals must be build-safe TypeScript.
- Sample IDs used by route smoke checks must not change without updating `ROUTE_SMOKE_CHECKLIST.md`, `STATE_COVERAGE_MATRIX.md`, and `reports/qa/ROUTE_OWNER_MATRIX.md`.
- Real customer data, full phone numbers, addresses, bank account numbers, card data, tokens, and secret-looking strings are prohibited.

