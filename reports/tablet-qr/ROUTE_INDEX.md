# tablet-qr ROUTE_INDEX

## Preview Hub

- `/tablet/status` - browser-visible preview hub for tablet, QR, checkout, guest order lookup, and refund request mock routes.

## Tablet Routes

| Label | Route | Purpose |
| --- | --- | --- |
| Tablet Home | `/tablet` | Entry into tablet closed-mall flow. |
| Products | `/tablet/products` | Catalog with category, price, stock, fulfillment, search, and sort mock controls. |
| Product Detail | `/tablet/products/product-care-kit` | Product gallery placeholder, options, quantity, policy, and risk panels. |
| Cart | `/tablet/cart` | Cart snapshot, quantity mock, fulfillment split, inventory guard, and total. |
| Ask / 조르기 | `/tablet/ask` | Guardian payer QR preview. |
| QR Generate | `/tablet/qr` | Purchase QR and ask-payer QR generation preview. |

## QR Routes

| Label | Route | Purpose |
| --- | --- | --- |
| QR Landing | `/q/SANHO701` | Active customer QR landing. |
| Checkout | `/q/SANHO701/checkout` | Payer information, validation, and payment method mock. |
| Loading | `/q/SANHO701/loading` | Payment progress mock with deterministic exits. |
| Success | `/q/SANHO701/success` | Mock success with order number and fulfillment snapshot. |
| Failed | `/q/SANHO701/failed` | Mock failure route without PG retry. |
| Expired | `/q/SANHO701/expired` | Dedicated expired QR page. |

## QR State Preview Routes

| State | Route | Behavior |
| --- | --- | --- |
| active | `/q/SANHO701/status` | Can continue to checkout mock. |
| expired | `/q/OLDQR22/status` | Checkout is blocked. |
| used | `/q/USED701/status` | Already paid, route to lookup. |
| payment_failed | `/q/VOID1234/status` | Failed payment mock branch. |
| canceled | `/q/CANCEL77/status` | Operator-cancelled QR branch. |

## Guest Order Routes

| Label | Route | Purpose |
| --- | --- | --- |
| Guest Order Lookup | `/orders/guest` | Non-member order number and phone mock lookup. |
| Guest Order Detail | `/orders/guest/A5-20260519-001` | Order, payment, fulfillment, and item snapshot. |
| Refund Request Mock | `/orders/guest/A5-20260519-001/refund` | UI-only refund request with admin approval copy. |

## Safety Notes

- All routes are mock/test beta.
- Firebase SDK, Firestore/Auth, real PG, refund, AlimTalk, delivery tracking, external stock API, and Storage upload remain blocked.
