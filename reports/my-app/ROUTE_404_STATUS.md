# Route 404 status

This file records route smoke findings and expected status after the `/products` alias fix. Browser smoke has not been executed in this step; entries marked `manual_pending` must be confirmed by opening localhost manually.

| Route | Previous state | Current expected state | Evidence |
| --- | --- | --- | --- |
| `/products` | was 404 | expected 200 | `app/products/page.tsx` was created and reuses `TabletProductsPage` from `/tablet/products`. |
| `/tablet/products` | not checked | manual pending | Existing route. |
| `/tablet/cart` | not checked | manual pending | Existing route. |
| `/tablet/qr` | not checked | manual pending | Existing route. |
| `/q/SANHO701` | not checked | manual pending | Existing dynamic QR route. |
| `/q/SANHO701/checkout` | not checked | manual pending | Existing dynamic checkout route. |
| `/orders/guest` | not checked | manual pending | Existing guest lookup route. |
| `/orders/guest/A5-20260519-001` | not checked | manual pending | Existing dynamic guest order route. |
| `/company/dashboard` | not checked | manual pending | Existing company route. |
| `/company/products` | not checked | manual pending | Existing company products route. |
| `/nursery/dashboard` | not checked | manual pending | Existing nursery route. |
| `/nursery/rooms` | not checked | manual pending | Existing nursery rooms route. |

## Notes

- No Firebase connection was added.
- No PG/refund/settlement/Alimtalk/delivery/external inventory integration was added.
- No git add, commit, push, npm install, lint, or build command was executed.

