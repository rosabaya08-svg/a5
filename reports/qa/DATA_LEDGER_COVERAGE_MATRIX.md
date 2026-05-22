# Data Ledger Coverage Matrix

## Purpose

This matrix expands batch 24 coverage for the key mock ledgers: `products`, `orders`, `order_items`, `payments`, `qr_payment_sessions`, `inventory_movements`, and `audit_logs`.

| Ledger | List Screen Evidence | Detail Evidence | Cross-Ledger Link | Required Risk Case |
| --- | --- | --- | --- | --- |
| `products` | Product list/card/table rows | Product detail, options, stock, price comparison | `order_items.product_id`, inventory movement | Low stock, rejected, sold out |
| `orders` | Admin/company/nursery/guest order list | Order detail, fulfillment, totals | `order_items.order_id`, `payments.order_id`, QR success | Payment failed, refund requested |
| `order_items` | Company settlement/order item rows | Snapshot price, quantity, company, fulfillment | Product snapshot, settlement mock | Settlement pending/hold |
| `payments` | Admin payment/refund rows | Payment status, mock method, failure reason | Order total, QR checkout result | Failed/expired/refund requested |
| `qr_payment_sessions` | QR history and customer session | Short code, session ID, expiration, status | Cart snapshot, order after success | Expired, used, canceled, invalid |
| `inventory_movements` | Inventory movement list | Product/option delta and reason | Product stock warning | External code mismatch |
| `audit_logs` | Audit/security log list | Actor, role, action, target, severity | Approval/refund/payout/access events | Critical access denied |

## Required Consistency Checks

- [ ] Order totals reconcile to order item snapshots and mock payment amount.
- [ ] QR session status agrees with customer landing, checkout, success, and failed pages.
- [ ] Inventory movement deltas explain low-stock and sold-out badges.
- [ ] Settlement views reconcile to order item-level amounts.
- [ ] Audit logs exist for blocked production actions.

