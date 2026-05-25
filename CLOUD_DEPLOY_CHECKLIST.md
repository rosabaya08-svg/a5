# Cloud Deploy Checklist

Last updated: 2026-05-25

## Scope

This checklist is for Cloudflare Pages, Firebase, and PG transition readiness. It is not a deploy instruction and does not approve production release.

## Cloudflare Pages

- Build command: `npm run build`
- Static output directory: `out`
- Confirm `next.config.ts` uses static export settings.
- Confirm `/products` alias route exists.
- Confirm customer routes render with mock fallback if Firestore is unavailable.

## Firebase

- Firebase project: `a5-closed-mall`
- Products read path exists with mock fallback.
- Orders, payments, QR sessions, inventory, and audit writes remain blocked.
- `firebase.json` and `.firebaserc` are not created in this project phase.
- Functions v2 payment skeleton exists but is not deployed.

## PG

- PG provider keys are not committed.
- PG real approval/cancel/refund is blocked.
- Functions server skeleton exists for:
  - `paymentsReady`
  - `paymentsConfirm`
  - `paymentsWebhook`
  - `paymentsCancel`
- Server confirm must recalculate amount before any real PG confirm.

## QA Commands

```powershell
npm.cmd run check:env
npm.cmd run check:no-secrets
node scripts/check-routes.mjs
npm.cmd run build
```

Latest local result on 2026-05-25:

- env check: passed
- no-secret check: passed
- route check: passed, 69 page routes found
- build: passed, 96 static routes generated
- Firestore backend network warning appeared in the local sandbox, but mock fallback preserved build success

## Route Smoke List

- `/`
- `/mock-ui/status`
- `/products`
- `/tablet/products`
- `/tablet/cart`
- `/tablet/qr`
- `/q/SANHO701`
- `/q/SANHO701/checkout`
- `/orders/guest`
- `/orders/guest/A5-20260519-001`
- `/admin/dashboard`
- `/admin/payments`
- `/company/products/new`
- `/company/products/preview`
- `/nursery/dashboard`

## Not Approved Yet

- Firebase deploy
- Cloudflare production domain switch
- PG real payment
- PG cancel/refund
- Settlement payout
- Alimtalk sending
- Delivery tracking
- External inventory sync
