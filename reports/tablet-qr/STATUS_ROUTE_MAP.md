# tablet-qr STATUS_ROUTE_MAP

## Status Entry

- `/tablet/status` - local worktree dashboard for the tablet-qr track.

## Linked Smoke Routes

- `/tablet/products` - catalog, filters, product cards, empty/error sections.
- `/tablet/products/product-monitor` - critical stock product detail.
- `/tablet/cart` - cart snapshot, quantity mock, fulfillment split, inventory guard.
- `/tablet/qr` - QR issue, purchase/ask split, QR state previews.
- `/q/SANHO701` - active QR customer landing.
- `/q/SANHO701/checkout` - checkout mock.
- `/q/SANHO701/loading` - mock payment loading route.
- `/q/SANHO701/success` - success mock.
- `/q/SANHO701/failed` - failed mock.
- `/q/SANHO701/expired` - expired QR mock page.
- `/q/OLDQR22/status` - expired QR state.
- `/q/USED701/status` - used QR state.
- `/q/VOID1234/status` - payment failed QR state.
- `/q/CANCEL77/status` - canceled QR state.
- `/orders/guest` - guest lookup and mismatch safe-error copy.
- `/orders/guest/A5-20260519-001` - guest order detail.
- `/orders/guest/A5-20260519-001/refund` - refund request mock.
- `/orders/guest/UNKNOWN-ORDER` - unknown order safe error.

## Dashboard Constraints

- Links are for browser smoke only.
- Dashboard data is static mock summary data.
- No route performs real Firebase, PG, notification, delivery, Storage, or external inventory calls.
