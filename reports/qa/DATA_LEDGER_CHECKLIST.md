# Data Ledger Checklist

## Purpose

This checklist verifies that mock/test beta data behaves like a consistent ledger without connecting real Firebase, PG, settlement, shipping, notification, Storage, or external inventory services.

## Entity Checks

| Ledger | Required Fields | Required Mock Cases | Integrity Checks |
| --- | --- | --- | --- |
| `products` | `product_id`, `company_id`, name, category, approval status, price, stock, option IDs | Approved, pending, rejected, low stock, sold out, no-option, optioned | Product IDs stay stable across list/detail/cart/order snapshots. |
| `order_items` | `order_item_id`, `order_id`, `product_id`, `company_id`, quantity, price snapshot, fulfillment type | Delivery, pickup, canceled, refund requested, settled, unsettled | Order item snapshots survive product data changes. |
| `payments` | `payment_id`, `order_id`, amount, status, method mock, failure reason | Pending, succeeded, failed, expired, refund requested, refunded | Sum of payment amounts matches order total in mock views. |
| `qr_payment_sessions` | `qr_session_id`, short code, cart snapshot, expires at, status, used at | Active, expired, used, canceled, invalid | QR state and result routes agree on one-time-use status. |
| `inventory_movements` | `movement_id`, `product_id`, `option_id`, delta, reason, timestamp | Purchase hold, release, manual adjust, external code mismatch | Stock warnings and movement history are consistent. |
| `audit_logs` | `audit_log_id`, actor, role, action, target, severity, timestamp | Info, warning, critical, denied access, mock external blocked | Critical/risk badges map to visible audit entries. |

## Cross-Ledger Checks

- [ ] Every order item references an existing product or includes a complete product snapshot.
- [ ] Payment status and order status do not contradict each other.
- [ ] QR session cart snapshot matches order items after success.
- [ ] Inventory movement deltas explain low-stock or sold-out badges.
- [ ] Settlement and payout mock screens reconcile to order item-level amounts.
- [ ] Audit logs exist for approval, rejection, refund review, payout hold, blocked access, and external API blocked events.

## Prohibited Ledger Behavior

- [ ] No real customer phone, address, account, card, or payment token appears in mock data.
- [ ] No secret-looking string is required to render mock data.
- [ ] No live Firebase path or production project ID is required for ledger checks.
- [ ] No live PG transaction ID is required; mock IDs must be clearly fake.

