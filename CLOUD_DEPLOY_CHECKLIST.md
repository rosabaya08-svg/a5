# Cloud Deploy Checklist

Last updated: 2026-05-26

## Scope

This checklist covers Cloudflare Pages automatic deployment review for the A5 closed mall Firebase beta.

GitHub push to `feat/mock-ui-progress-capture-20260520` can trigger Cloudflare Pages. This checklist does not approve manual Cloudflare API deploys, Firebase deploys, or production payment activation.

## Cloudflare Pages

- Build command: `npm run build`
- Static output directory: `out`
- Next static export is configured in `next.config.ts`.
- Production branch: `feat/mock-ui-progress-capture-20260520`
- Custom domain candidate: `mall.signage-ai-a5.co.kr`
- Public Firebase env values must be configured in Cloudflare Pages.
- Public PG browser values can be configured only after the PG company provides official sandbox keys.
- Server PG secrets must never be configured in Cloudflare Pages for static export.

## Cloudflare Environment Variables

Required:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_DATA_SOURCE=firebase`

Recommended before PG browser smoke:

- `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`
- `NEXT_PUBLIC_PAYMENT_API_BASE_URL`
- `NEXT_PUBLIC_PG_PROVIDER`
- `NEXT_PUBLIC_PG_CLIENT_KEY`
- `NEXT_PUBLIC_PAYMENT_SUCCESS_URL`
- `NEXT_PUBLIC_PAYMENT_FAIL_URL`

Forbidden in Cloudflare Pages:

- `PG_SECRET_KEY`
- `PG_WEBHOOK_SECRET`
- Firebase Admin private key
- Service account JSON
- Alimtalk, delivery, external inventory secret keys

## Firebase Beta State

- Project: `a5-closed-mall`
- Firestore products read is live with mock fallback.
- Company/nursery operation screens are Firestore-first read with mock fallback.
- Functions payment endpoints are the PG-ready server path.
- Real PG calls remain blocked until official provider code and secrets are added server-side.
- Firestore/Storage rules files exist in repo; deploy requires explicit owner review.

## Required Local Commands Before Push

```powershell
npm.cmd run check:env
npm.cmd run check:no-secrets
node scripts/check-routes.mjs
npm.cmd run lint
npm.cmd run build
npm.cmd --prefix functions run build
```

## Browser Smoke After Cloudflare Deploy

- `/`
- `/mock-ui/status`
- `/products`
- `/tablet/products`
- `/tablet/products/product-care-kit`
- `/tablet/cart`
- `/tablet/qr`
- `/q/SANHO701`
- `/q/SANHO701/checkout`
- `/orders/guest/A5-20260519-001`
- `/admin/dashboard`
- `/admin/payments`
- `/admin/permissions`
- `/company/dashboard`
- `/company/products`
- `/company/orders`
- `/company/inventory`
- `/company/products/new`
- `/company/products/preview`
- `/nursery/dashboard`
- `/nursery/rooms`
- `/nursery/tablets`
- `/nursery/qr-history`
- `/nursery/orders`
- `/nursery/pickups`

## Not Approved Yet

- Firebase deploy from this task
- Real PG approval/cancel/refund
- Settlement payout
- Alimtalk sending
- Delivery tracking
- External inventory sync
- Storage production upload flow
