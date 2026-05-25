# PAYMENT_CONNECT_PLAN

Last updated: 2026-05-25

## Today Goal

A5 closed mall must be ready so the PG company's module, test MID/client key/secret key, and webhook rule can be inserted without redesigning checkout.

Real approval, cancel, refund, settlement payout, Alimtalk, delivery tracking, and external inventory sync are still blocked.

## Current Architecture

| Layer | File | Status |
| --- | --- | --- |
| Storefront checkout | `components/storefront/GuestQrExperience.tsx` | Shows mock checkout, PG readiness, and PG module handoff panel |
| Browser PG bridge | `lib/payments/pgCheckoutBridge.ts` | Prepared. Calls `window.A5PgProvider.requestPayment` only if a real provider module is loaded |
| Endpoint config | `lib/payments/paymentEndpoints.ts` | Maps public Functions base URL to `paymentsReady`, `paymentsConfirm`, `paymentsWebhook`, `paymentsCancel` |
| Payment provider contract | `lib/payments/types.ts` | Interface exists for create/request/confirm/webhook/cancel/refund |
| Mock provider | `lib/payments/providers/mockPaymentProvider.ts` | Still active for beta flow |
| PG skeleton provider | `lib/payments/providers/pgProviderSkeleton.ts` | Blocks real calls but preserves adapter contract |
| Firebase Functions server | `functions/src/payments/*` | Mock-only HTTPS handlers with amount recalculation and Firestore transaction plans |
| Server PG readiness | `functions/src/payments/providerRuntime.ts` | Detects required PG secret/config keys without printing values |

## Required PG Keys

Browser/build-time keys:

- `NEXT_PUBLIC_PG_PROVIDER`
- `NEXT_PUBLIC_PG_ENVIRONMENT`
- `NEXT_PUBLIC_PG_CLIENT_KEY`
- `NEXT_PUBLIC_PG_CHANNEL_KEY`
- `NEXT_PUBLIC_PG_MERCHANT_ID`
- `NEXT_PUBLIC_PG_SCRIPT_URL`
- `NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL`

Server-only keys:

- `PG_PROVIDER`
- `PG_ENVIRONMENT`
- `PG_CLIENT_KEY`
- `PG_SECRET_KEY`
- `PG_MERCHANT_ID`
- `PG_CHANNEL_KEY`
- `PG_WEBHOOK_SECRET`
- `PG_API_BASE_URL`
- `PG_SUCCESS_URL`
- `PG_FAIL_URL`
- `PG_WEBHOOK_URL`

Server-only values must go to Firebase Secret Manager or the approved server runtime secret store. They must not be committed to Git.

## Insert PG Module Tomorrow

1. Confirm PG provider name, official SDK/script URL, test MID, client key, channel key, secret key, webhook secret, success URL, fail URL, and webhook URL.
2. Put public values into Cloudflare Pages environment variables.
3. Put secret values into Firebase Functions Secret Manager or the selected backend runtime.
4. Add the PG browser module loader so it exposes `window.A5PgProvider.requestPayment(payload)`.
5. Replace the internals of `pgProviderSkeleton` or add a provider-specific adapter without changing storefront UI.
6. Deploy Functions only after rules/secrets are reviewed.
7. Run sandbox test: ready -> PG module payment window -> confirm -> webhook idempotency -> order snapshot -> QR paid.

## Non-Negotiable Confirm Rule

The browser must never trust its own amount. The server must:

- validate QR session status and expiry,
- recalculate amount from product/order snapshot,
- reserve inventory,
- call PG confirm with `PG_SECRET_KEY`,
- create payment/order/order_items snapshots,
- mark QR as paid once,
- write audit log,
- reject duplicate webhook/payment attempts.

## Still Blocked

- Real PG approval/cancel/refund.
- PG webhook signature verification using the real algorithm.
- Settlement payout and refund hold automation.
- Production Functions deploy.
- Legal wording and PG terms confirmation.
