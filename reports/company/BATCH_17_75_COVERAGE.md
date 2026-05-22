# Company Batch 17-75 Coverage

## Product

- Batch 17: Product list filters and pagination mock.
- Batch 18: Product detail tabs for info, options, stock, orders, approval, and price changes.
- Batch 19: Product registration wizard.
- Batch 20: Approval states include `draft`, `pending_approval`, `approved`, `rejected`, `needs_reapproval`.
- Batch 21: Rejection reason UI.
- Batch 22: Price comparison and non-AI analysis UI.
- Batch 23: Option management UI.

## Inventory

- Batch 24: Manual stock adjustment mock.
- Batch 25: Inventory movement history.
- Batch 26: External inventory mapping.
- Batch 27: External sync log mock.
- Batch 47: Generated inventory movements bring coverage to 50+ target.
- Batch 51-75: Inventory option detail route.

## Orders And Fulfillment

- Batch 28: Order item based order list.
- Batch 29: Order detail mock.
- Batch 30: Invoice input mock.
- Batch 31: Delivery event timeline data.
- Batch 32: Pickup event list.
- Batch 33: Pickup detail route.

## Money

- Batch 34: Sales dashboard breakdowns.
- Batch 35: Payout status coverage including `blocked_real_payout`.
- Batch 36: Settlement detail based on `order_items`.
- Batch 37: Refund list.
- Batch 38: Refund detail with blocked PG refund.

## Company Operations

- Batch 39: Company users and permissions.
- Batch 40: Company profile and masked settlement account.
- Batch 41: Notification settings mock, no Alimtalk sending.
- Batch 42: Audit log UI.
- Batch 43: Integrated product/order/settlement search.
- Batch 44: Common table components.
- Batch 45: Empty/error/loading state components.
- Batch 46: Risk preset badges for Storage, PG, delivery, and external inventory.

## Reports

- Batch 48: `ROUTE_MAP.md`
- Batch 49: `STATE_COVERAGE.md`
- Batch 50: `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md`
- Extra: `UNATTENDED_PROGRESS.md`, `COMMIT_CANDIDATE.md`

## Remaining Mock Boundaries

- No real Firebase.
- No real Storage.
- No real PG.
- No real payout.
- No real delivery tracking.
- No real Alimtalk.
- No real external inventory sync.
