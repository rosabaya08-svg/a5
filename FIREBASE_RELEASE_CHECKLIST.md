# Firebase Release Checklist

Last updated: 2026-05-26

## Current Firebase State

- Firebase project: `a5-closed-mall`
- Firestore products seed exists and products read is live.
- Storefront products prefer Firestore and fall back to mock data.
- Company operation screens read Firestore schema collections by `company_id` with mock fallback.
- Nursery operation screens read Firestore schema collections by `nursery_id` with mock fallback.
- Functions payment/order/QR/inventory endpoints exist as PG-ready server skeletons.
- Real PG provider calls remain disabled.
- Firestore rules and Storage rules are present in repo.
- Storage bucket exists, but production upload governance is not approved.

## Before Firebase Rules Deploy

- Review `firestore.rules` for role/scope access:
  - `SUPER_ADMIN`
  - `COMPANY_ADMIN`
  - `NURSERY_ADMIN`
  - `TABLET_DEVICE`
  - `seed_admin`
- Confirm public reads are limited to approved storefront content.
- Confirm client writes for orders, payments, payment events, inventory movements, settlements, and audit logs are blocked.
- Confirm server write paths go through Functions with audit logs.
- Confirm Storage paths are scoped and default-deny.

Candidate commands only:

```powershell
firebase.cmd deploy --only firestore:rules
firebase.cmd deploy --only storage:rules
```

Do not run these from the release gate task unless explicitly approved.

## Before Functions Deploy

- Confirm selected PG provider: Toss, PortOne, KCP, or NICE.
- Add server-only values to Firebase Functions runtime or Secret Manager:
  - `PG_SECRET_KEY`
  - `PG_MERCHANT_ID`
  - `PG_CHANNEL_KEY`
  - `PG_WEBHOOK_SECRET`
  - `PAYMENT_WEBHOOK_URL`
- Keep these values out of Git and Cloudflare Pages.
- Confirm webhook signature verification from official PG docs.
- Confirm QR expiration, amount recalculation, product snapshot, inventory reserve/deduct/release, and audit log behavior.

## Before Production-Like Payment Test

- Run local gates:
  - `npm.cmd run check:env`
  - `npm.cmd run check:no-secrets`
  - `node scripts/check-routes.mjs`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd --prefix functions run build`
- Run optional Firestore smoke:
  - `npm.cmd run check:firestore-products`
- Confirm `NEXT_PUBLIC_PAYMENT_API_BASE_URL` points to reachable Functions endpoints.
- Confirm seeded QR sessions have future `expires_at` values.

## Never Commit

- `.env.local`
- `.env.production`
- Service account keys
- Firebase Admin private keys
- PG secret keys
- Webhook secret values
- Alimtalk, delivery, or external inventory secret keys

## Still Blocked

- Real PG approval/cancel/refund
- Settlement payout
- Alimtalk sending
- Delivery tracking
- External inventory API calls
- Storage production upload workflow
- A4 cross-project writes
