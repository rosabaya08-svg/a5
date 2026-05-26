# FIREBASE_FUNCTIONS_PLAN

Last updated: 2026-05-25

## Purpose

Firebase Functions v2 is the preferred first server runtime for with.commerce payment confirm, QR one-time-use control, order snapshot creation, inventory reservation, and webhook verification.

The current server runtime is deployed and mock-provider-only. It writes beta Firestore payment/order snapshots and is structured so PG keys and provider adapter code can be inserted without changing the checkout UI.

## Exported HTTPS Functions

| Function | Runtime intent | Current behavior |
| --- | --- | --- |
| `paymentsReady` | Prepare payment | Recalculates amount, validates QR skeleton, writes `payment_intents/{id}`, returns PG readiness snapshot |
| `paymentsConfirm` | Confirm payment | Recalculates amount, writes mock payment/order/order_items/payment_event/inventory/audit snapshots in a Firestore transaction |
| `paymentsWebhook` | Receive PG event | Accepts payload, checks signature header presence, writes a `payment_events/{eventId}` skeleton |
| `paymentsCancel` | Cancel/refund gate | Blocks real cancel/refund and writes a `cancel_requests/{id}` manual review record |

## Server PG Readiness

`functions/src/payments/providerRuntime.ts` checks:

- `PG_PROVIDER`
- `PG_SECRET_KEY`
- `PG_MERCHANT_ID`
- `PG_CHANNEL_KEY`
- `PG_WEBHOOK_SECRET`

It never prints secret values. It only returns missing key names and readiness booleans.

## Firestore Transaction Design

Mock-provider write implementation is active. Real PG provider calls must be added only after PG test keys, docs, and webhook signature rules are approved.

Confirm transaction must:

1. Read `qr_payment_sessions/{qrSessionId}`.
2. Reject paid, expired, cancelled, or reused QR sessions.
3. Read product/order snapshot.
4. Recalculate amount on server.
5. Reserve or decrement inventory.
6. Call PG confirm API with server secret.
7. Create `payments/{paymentIntentId}`.
8. Create `orders/{orderNo}`.
9. Create `order_items/{orderNo}-{lineNo}` for company settlement.
10. Mark QR session as paid.
11. Append `inventory_movements/{autoId}`.
12. Append `audit_logs/{autoId}`.

## Secret Manager Candidates

- `PG_PROVIDER`
- `PG_CLIENT_KEY`
- `PG_SECRET_KEY`
- `PG_WEBHOOK_SECRET`
- `PG_MERCHANT_ID`
- `PG_CHANNEL_KEY`
- `PG_API_BASE_URL`
- `APP_INTERNAL_SIGNING_SECRET`

## Build Status

- `npm.cmd --prefix functions install`: completed. `functions/package-lock.json` was generated.
- `npm.cmd --prefix functions run build`: passed.
- Functions package now declares Node `22`; local Node is `v24.15.0`, so npm still emits a local `EBADENGINE` warning only.
- npm audit reported 9 moderate vulnerabilities in the Functions dependency tree. Review before production deploy.
- `firebase.cmd deploy --only functions`: passed after setting the Artifact Registry cleanup policy.
- Deployed URLs:
  - `https://asia-northeast3-a5-closed-mall.cloudfunctions.net/paymentsReady`
  - `https://asia-northeast3-a5-closed-mall.cloudfunctions.net/paymentsConfirm`
  - `https://asia-northeast3-a5-closed-mall.cloudfunctions.net/paymentsWebhook`
  - `https://asia-northeast3-a5-closed-mall.cloudfunctions.net/paymentsCancel`

## Deploy Blockers

- PG official docs and test keys are required.
- Webhook callback URL must be registered with the PG company.
- `firebase-functions` package is deployable but Firebase CLI warns it is not the newest available version.
