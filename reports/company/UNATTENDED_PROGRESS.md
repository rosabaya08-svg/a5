# Company Unattended Progress

## Batch 17-25

- Product list filters, pagination mock, status chips, and reapproval state were extended.
- Product detail tabs were added for info, options, stock, order history, approval history, and price changes.
- Product wizard route was added.
- Rejection reason and price-analysis routes were added.
- Option management and inventory adjustment routes were added.
- Inventory movement coverage was expanded.

## Batch 26-35

- External inventory mapping and external sync log routes were added.
- Order list now separates `order_id` and `order_item_id` in detail contexts.
- Delivery event timeline data and pickup event screens were added.
- Pickup detail route was added.
- Sales breakdown mock chart/table was added.
- Payout status coverage includes `blocked_real_payout`.

## Batch 36-50

- Settlement detail route was added and emphasizes `order_items` by `company_id`.
- Refund detail route was added with PG refund blocked state.
- Company users, profile, notifications, audit logs, and integrated search routes were added.
- Common table, state, loading, and risk preset components were added under `components/company`.
- Route map, state coverage, auto report, next tasks, blockers, and commit candidate docs were updated.

## Batch 51-75 Self-Generated Continuation

- Inventory option detail route was added.
- Mobile/tablet compact operations route was kept and linked.
- Browser-visible local status dashboard route `/company/status` was added.
- Status summary data and report were added.
- Route preview hub, route index, smoke checklist, risk center, and merge handoff docs were added.
- Visual alias routes were added for product detail, order detail, external inventory, delivery, and settlements.
- Generated mock dataset expansion was added:
  - Products: 20 total target coverage.
  - Orders: 30 total target coverage.
  - Inventory movements: 50 total target coverage.
  - Settlements: 10+ target coverage.
- Extra external mapping rows were generated for coverage.

## Still Mock Only

- No Firebase connection.
- No Storage upload.
- No PG refund or partial cancel.
- No payout execution.
- No delivery tracking API.
- No Alimtalk/SMS/email send.
- No external inventory API call.
