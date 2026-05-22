# Company Route Smoke Checklist

## Scope

Owner track: `company`

This checklist validates company admin mock/test beta screens scoped by `company_id`. It does not approve real product upload, Storage, external inventory API, delivery lookup, refund, payout, or settlement.

## Routes

| Route | Desktop | Tablet | Required States | Required Controls | Notes |
| --- | --- | --- | --- | --- | --- |
| `/company` | [ ] | [ ] | `normal`, `mock_ready`, `production_blocked` | Company navigation | Entry can redirect or render dashboard if documented. |
| `/company/dashboard` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Date/status filters | Product count, approval queue, orders, delivery, sales, payout metrics. |
| `/company/products` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Approval/category filters, product search, stock/status sort | Draft, pending, approved, rejected states. |
| `/company/products/new` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `blocked`, `mock_ready` | Product form fields | Image/GIF placeholder only; no Storage upload. |
| `/company/inventory` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Stock/status filters, SKU/external code search | External API remains blocked/mock. |
| `/company/orders` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Order/status/date filters, order search | Order item-level settlement hints. |
| `/company/deliveries` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `blocked`, `production_blocked` | Fulfillment/status filters | Shipping lookup disabled; invoice input is mock. |
| `/company/payouts` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Settlement status/date filters | Real payout disabled; account masked. |
| `/company/sales` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Date filter, amount sort | Sales values labeled mock/test. |

## Required Failure Notes

- Missing `company_id` context is a P1 scoping issue.
- Real Storage or external inventory client is a P0/P1 depending on whether credentials or live calls are present.
- Unmasked settlement account data is P1 or P0 if real-looking.

