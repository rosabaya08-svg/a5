# tablet-qr EDGE_CASE_MATRIX

## QR Edge Cases

| Case | Mock route | Expected beta behavior | Real integration status |
| --- | --- | --- | --- |
| Active purchase QR | `/q/SANHO701/status` | Allow mock checkout | PG/Firebase blocked |
| Active ask-payer QR | `/q/ASKNOW44/status` | Show guardian payer copy | Auth/notification blocked |
| Expired QR | `/q/OLDQR22/status` | Block checkout and guide to failure/lookup | Server expiry check pending |
| Already used QR | `/q/USED701/status` | Guide to order detail | Real single-use lock pending |
| Cancelled QR | `/q/CANCEL77/status` | Block retry without new QR | Operator audit pending |
| Payment failed QR | `/q/VOID1234/status` | Show retry warning as UI-only | PG retry/refund pending |

## Order Lookup Edge Cases

| Case | Mock route | Expected beta behavior | Real integration status |
| --- | --- | --- | --- |
| Delivery order | `/orders/guest/A5-20260519-001` | Show invoice-pending style status | Carrier API blocked |
| Pickup order | `/orders/guest/A5-20260519-002` | Show pickup timeline | Nursery write rules pending |
| Cancelled order | `/orders/guest/A5-20260519-004` | Show failed/cancelled state | Refund/settlement blocked |
| Delivered order | `/orders/guest/A5-20260518-012` | Show completed delivery branch | Tracking proof blocked |
| Unknown order | `/orders/guest/UNKNOWN-ORDER` | Show safe not-found state | Real customer lookup blocked |
| Phone mismatch | `/orders/guest` | Show mismatch copy without leaking existence | Verification policy pending |

## Product Edge Cases

| Case | Mock route | Expected beta behavior | Real integration status |
| --- | --- | --- | --- |
| Critical stock | `/tablet/products/product-monitor` | Show high-risk stock badge | Inventory locking pending |
| Missing external code | `/tablet/products/product-wrap-set` | Show supplier mapping warning | External API blocked |
| Generated catalog rows | `/tablet/products` | Keep card layout stable with 30+ items | Server filters pending |
