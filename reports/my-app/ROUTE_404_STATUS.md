# Route 404 status

This file records route smoke findings and expected status after the `/products` alias fix. Browser smoke has not been executed in this step; entries marked `manual_pending` must be confirmed by opening localhost manually.

## 2026-05-22 browser smoke update

Selected routes were opened in the in-app browser against the existing `localhost:3000` dev server. These checks did not run deploy, Firebase, PG, Alimtalk, delivery tracking, or external inventory calls.

| Route | Current status | Evidence |
| --- | --- | --- |
| `/tablet/products` | no 404 | Loaded storefront page with closed mall hero and HANSANYEON shopping UI. |
| `/tablet/products/product-care-kit` | no 404 | Loaded product detail mock page. |
| `/tablet/cart` | no 404 | Loaded cart mock page. |
| `/q/SANHO701` | no 404 | Loaded customer QR landing mock page. |
| `/q/SANHO701/status` | no 404 | Loaded QR status mock page. |
| `/orders/guest/A5-20260519-001/refund` | no 404 | Loaded guest refund request mock page. |
| `/admin/marketing/banners` | no 404 | Loaded admin marketing banner route. |
| `/company/products/preview` | no 404 | Loaded company product preview route. |

Build also generated static routes for `/products`, `/q/SANHO701/checkout`, `/q/SANHO701/loading`, `/q/SANHO701/expired`, `/orders/guest`, `/orders/guest/A5-20260519-001`, `/admin/marketing/videos`, `/admin/brands`, `/admin/home-editor`, `/admin/exhibitions`, `/company/ads/banners`, `/company/ads/videos`, `/company/brand`, and `/company/exhibitions`.

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
