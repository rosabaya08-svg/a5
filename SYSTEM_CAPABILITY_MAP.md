# A5 Closed Mall Capability Map

Last updated: 2026-05-25

## Current Implemented Capabilities

- Customer/tablet storefront routes: `/products`, `/tablet/products`, `/tablet/products/[id]`, `/tablet/cart`, `/tablet/qr`, `/q/[code]`, `/q/[code]/checkout`, guest order lookup.
- Firestore product read path exists through Firebase Web SDK with mock fallback.
- Product seed script exists for the `products` collection.
- Admin, company, and nursery mock consoles exist with KPI cards, tables, status badges, and blocked-operation notices.
- Marketing mock screens exist for banners, videos, brand grid, home editor, exhibitions, and company ad submissions.
- Mock payment flow exists and never calls real PG.
- Firebase/PG/Storage/Alimtalk/delivery/external inventory blockers are documented.

## Required Before Enterprise Meeting Demo

- Show PG readiness as a clear contract: env slots, provider interface, confirm/webhook/cancel/refund boundaries.
- Show customer checkout as “PG module ready, currently mock only”.
- Show admin ability to manage storefront banners, video/GIF placeholders, brand logos, exhibitions, and company admin invitation.
- Show company onboarding: business license, bankbook copy, CS contact, address, product legal notices, detail preview, and ad material submission.
- Show nursery onboarding: business license identity, registered address, room count, room selection, A4 external mapping fields.
- Improve table/filter/empty/loading/error states so dashboards read like a professional SaaS console.

## Still Blocked

- Real PG approval/cancel/refund/settlement execution.
- Real Firebase writes for orders, payments, QR sessions, and inventory.
- Firebase Storage upload until Blaze upgrade and upload policy approval.
- Alimtalk, delivery tracking, and external inventory APIs.
- Production deployment operations and any secret generation.
