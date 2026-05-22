# tablet-qr ROUTE_MAP

## Tablet Routes

- `/tablet/products` - tablet closed-mall catalog with category, price, stock, fulfillment, search, and sort mock controls.
- `/tablet/products/[id]` - product detail with image placeholder gallery, option mock, quantity mock, risk badges, price comparison, and refund/delivery policy.
- `/tablet/cart` - cart snapshot, quantity mock, delete mock, recalculation mock, fulfillment branch, and total.
- `/tablet/qr` - purchase QR creation preview, QR expiry notice, QR summary grid, state gallery, and QA matrix.
- `/tablet/ask` - ask-payer QR preview with guardian payment path.
- `/tablet/status` - local worktree status dashboard with progress, blockers, routes, state coverage, next tasks, and human checks.

## Guest QR Routes

- `/q/[code]` - customer QR landing with item summary, amount, fulfillment, QR identity, expiry, and state block.
- `/q/[code]/checkout` - mock checkout with payer fields, card mock, easy pay mock, and blocked bank transfer.
- `/q/[code]/loading` - intermediate payment loading mock with deterministic success/failure exits.
- `/q/[code]/success` - mock success with order number, product snapshot, amount, fulfillment, and order detail link.
- `/q/[code]/failed` - mock failed state with QR-specific failure reason and retry/lookup links.
- `/q/[code]/expired` - dedicated expired QR page with checkout blocked and no real expiry lookup.
- `/q/[code]/status` - QR lifecycle state page for active, expired, used, canceled, and payment_failed.

## Guest Order Routes

- `/orders/guest` - non-member order lookup input, phone mock, filters, summary grid, result list, and route matrix.
- `/orders/guest/[orderNo]` - order detail with order status, payment status, delivery or pickup state, product snapshot, and refund request mock.
- `/orders/guest/[orderNo]/refund` - dedicated refund request mock page with admin approval copy and no real refund.

## State Sample Routes

- `/q/SANHO701/status` - active QR.
- `/q/OLDQR22/status` - expired QR.
- `/q/USED701/status` - used QR.
- `/q/CANCEL77/status` - canceled QR.
- `/q/VOID1234/status` - payment_failed because the related payment mock is failed.
- `/q/DELIV900/status` - paid delivery QR.
- `/orders/guest/UNKNOWN-ORDER` - safe not-found error state.
