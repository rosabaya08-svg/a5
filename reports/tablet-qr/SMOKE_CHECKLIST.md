# tablet-qr SMOKE_CHECKLIST

## Tablet Catalog

- `/tablet/status` shows the local track progress dashboard, blocker cards, route map, next tasks, and state coverage.
- `/tablet/products` shows nursery, room, tablet, and QR source banner.
- Catalog filter UI shows category, price, stock, receive method, search, and sort controls.
- Product cards show list price, closed mall price, discount rate, comparison saving, stock badge, and fulfillment badge.
- Empty state and external inventory error state are visible as mock UI sections.

## Product Detail

- `/tablet/products/product-care-kit` shows image placeholder gallery, options, quantity mock, price comparison, risk badges, policy notes, and cart/QR actions.
- `/tablet/products/product-monitor` shows critical stock risk.
- `/tablet/products/product-wrap-set` shows missing external-code risk.

## Cart And QR Creation

- `/tablet/cart` shows cart item snapshots, quantity controls, inventory guard notices, delete/recalculate mock actions, fulfillment branch, subtotal, and total.
- `/tablet/qr` shows purchase QR, purchase/ask QR split, expiry notice, QR status summaries, and QR state preview links.
- `/tablet/ask` shows ask-payer QR and guardian checkout preview path.

## QR Landing And Status

- `/q/SANHO701` renders active QR landing and can continue to checkout.
- `/q/SANHO701/expired` renders a dedicated expired QR page and blocks checkout.
- `/q/ASKNOW44` renders ask-payer copy and guardian mock flow.
- `/q/OLDQR22/status` renders expired status.
- `/q/USED701/status` renders used status.
- `/q/CANCEL77/status` renders canceled status.
- `/q/VOID1234/status` renders payment failed status.
- `/q/DELIV900/status` renders paid delivery QR status.

## Checkout Mock

- `/q/SANHO701/checkout` shows payer fields, payer validation, checkout confirmation, loading mock, card mock, easy pay mock, and blocked bank-transfer mock.
- `/q/SANHO701/loading` shows the payment progress mock and exits to success or failure without PG execution.
- No PG SDK, PG redirect, PG approval request, or real payment action is present.

## Success And Failure

- `/q/SANHO701/success` shows order number, amount, fulfillment snapshot, and order detail link.
- `/q/OLDQR22/failed` shows expired QR failure reason.
- `/q/USED701/failed` shows already-used QR failure reason.
- `/q/VOID1234/failed` shows payment failed/cancelled retry warning.

## Guest Order Lookup

- `/orders/guest` shows order number + phone mock input, mismatch safe-error copy, filter/search/sort mock controls, state summary, and QA route matrix.
- `/orders/guest/A5-20260519-001` shows delivery order, payment detail, and refund request mock.
- `/orders/guest/A5-20260519-001/refund` shows the dedicated refund request mock route with no real refund action.
- `/orders/guest/A5-20260519-002` shows pickup order state.
- `/orders/guest/A5-20260519-004` shows cancelled/payment-failed order state.
- `/orders/guest/A5-20260519-005` shows canceled QR order without real refund/payment writes.
- `/orders/guest/A5-20260518-012` shows delivered order state.
- `/orders/guest/UNKNOWN-ORDER` shows safe error state.

## Blocked Real Integrations

- Firebase SDK import must remain absent.
- `lib/repositories/firebase/**` must remain unused.
- Firestore/Auth/Storage/PG/refund/settlement/notification/delivery tracking/external inventory calls must remain absent.
