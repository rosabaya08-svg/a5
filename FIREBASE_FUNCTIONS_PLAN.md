# FIREBASE_FUNCTIONS_PLAN

Last updated: 2026-05-25

## Purpose

Firebase Functions v2 is the preferred first server runtime for A5 closed mall payment confirm, QR one-time-use control, order snapshot creation, inventory reservation, and webhook verification.

The current code is still mock-only. It is now structured so PG keys and provider adapter code can be inserted without changing the checkout UI.

## Exported HTTPS Functions

| Function | Runtime intent | Current behavior |
| --- | --- | --- |
| `paymentsReady` | Prepare payment | Recalculates amount, validates QR skeleton, returns mock payment intent and PG readiness snapshot |
| `paymentsConfirm` | Confirm payment | Recalculates amount, returns mock approval, order snapshot plan, inventory plan, audit plan |
| `paymentsWebhook` | Receive PG event | Accepts payload, checks signature header presence, returns signature/idempotency plan |
| `paymentsCancel` | Cancel/refund gate | Blocks real cancel/refund and returns manual review/settlement hold plan |

## Server PG Readiness

`functions/src/payments/providerRuntime.ts` checks:

- `PG_PROVIDER`
- `PG_SECRET_KEY`
- `PG_MERCHANT_ID`
- `PG_CHANNEL_KEY`
- `PG_WEBHOOK_SECRET`

It never prints secret values. It only returns missing key names and readiness booleans.

## Firestore Transaction Design

Real write implementation must be added only after PG test keys and rules are approved.

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
- Local Node is `v24.15.0`, while Functions package declares Node `20`; npm emitted an `EBADENGINE` warning. Firebase deploy should use the declared Node 20 runtime.
- npm audit reported 9 moderate vulnerabilities in the Functions dependency tree. Review before production deploy.

## Deploy Blockers

- Firebase Functions deploy approval is required.
- PG official docs and test keys are required.
- Firestore write rules/IAM plan must be confirmed.
- Webhook callback URL must be registered with the PG company.
