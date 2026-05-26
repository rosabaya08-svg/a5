# QA Release Gate

Last updated: 2026-05-26

## Purpose

This gate verifies that the A5 closed mall Firebase beta is safe to push to GitHub and hand off to Cloudflare automatic deployment review.

The gate does not deploy Firebase, does not deploy Cloudflare directly, does not print secrets, and does not execute real PG approval, refund, settlement payout, Alimtalk, delivery tracking, or external inventory calls.

## Required Commands

Run these before every release push:

```powershell
npm.cmd run check:env
npm.cmd run check:no-secrets
node scripts/check-routes.mjs
npm.cmd run lint
npm.cmd run build
npm.cmd --prefix functions run build
```

One-command local gate:

```powershell
npm.cmd run check:release
```

Optional live Firestore product smoke:

```powershell
npm.cmd run check:firestore-products
```

## Environment Gate

Blocking public Firebase keys:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Non-blocking but recommended handoff keys:

- `NEXT_PUBLIC_DATA_SOURCE`
- `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`
- `NEXT_PUBLIC_PAYMENT_API_BASE_URL`
- `NEXT_PUBLIC_PG_PROVIDER`
- `NEXT_PUBLIC_PG_CLIENT_KEY`
- `NEXT_PUBLIC_PAYMENT_SUCCESS_URL`
- `NEXT_PUBLIC_PAYMENT_FAIL_URL`

## Secret Safety Gate

The release gate checks:

- `.env.local` can exist locally, but must not be tracked.
- `serviceAccountKey.json` must not exist.
- Firebase Admin private key files must not exist.
- PG secret files must not exist.
- Secret values are never printed to terminal or reports.

Manual Git safety check before commit:

```powershell
git status --short
git check-ignore .env.local
git ls-files .env.local
git diff --cached --name-only
git diff --cached --name-only | findstr /i ".env secret serviceAccount private key"
```

## Required Smoke Routes

- `/`
- `/products`
- `/tablet/products`
- `/tablet/cart`
- `/tablet/qr`
- `/q/[code]`
- `/q/[code]/checkout`
- `/orders/guest`
- `/orders/guest/[orderNo]`
- `/admin/dashboard`
- `/admin/payments`
- `/admin/permissions`
- `/company/dashboard`
- `/company/onboarding`
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
- `/mock-ui/status`

## Latest Local Gate Result

2026-05-26:

- `npm.cmd run check:env`: pass
- `npm.cmd run check:no-secrets`: pass
- `node scripts/check-routes.mjs`: pass, 71 page routes
- `npm.cmd run lint`: pass, 0 errors and existing `<img>` warnings only
- `npm.cmd run build`: pass, 95 static pages
- `npm.cmd --prefix functions run build`: pass
- `npm.cmd run check:firestore-products`: pass, 4 active Firestore products

## Hard Stop Conditions

- `.env.local` is tracked or staged.
- Service account/private key/secret files exist or are staged.
- Real PG approval, cancel, refund, or settlement payout is triggered.
- Real Alimtalk, delivery tracking, or external inventory API call is triggered.
- Firebase deploy is attempted from this release gate task.
- Firestore/Storage rules are changed without explicit owner review.
