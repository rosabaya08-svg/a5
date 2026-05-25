# PG_READY_HANDOFF

## What Is Ready

- Public PG env placeholders are in `.env.local.example`.
- Server PG env placeholders are in `functions/.env.example`.
- Checkout UI has a PG module readiness panel.
- `lib/payments/pgCheckoutBridge.ts` defines the browser module contract.
- `lib/payments/paymentEndpoints.ts` maps the Functions base URL to payment handlers.
- Firebase Functions payment handlers exist and return mock-only results.
- Server readiness checks detect missing PG keys without printing secrets.

## Where To Paste Provider Code

| Need | File |
| --- | --- |
| Browser module wrapper | `lib/payments/pgCheckoutBridge.ts` or a provider-specific file next to it |
| Client-side script loader | storefront layout/component after provider confirms script URL |
| Server confirm adapter | `functions/src/payments/providerRuntime.ts` plus a new provider adapter file |
| Confirm handler call site | `functions/src/payments/confirm.ts` |
| Webhook signature verification | `functions/src/payments/webhook.ts` |
| Cancel/refund policy gate | `functions/src/payments/cancel.ts` |

## Must Not Paste Into Browser

- `PG_SECRET_KEY`
- `PG_WEBHOOK_SECRET`
- private key files
- service account files
- refund/cancel secret credentials

## First Real Test Sequence

1. Set public PG keys in Cloudflare Pages test environment.
2. Set server PG keys in Firebase Secret Manager.
3. Deploy Functions to test runtime.
4. Open `/q/SANHO701/checkout`.
5. Confirm the panel says public config ready and Functions base configured.
6. Run a PG sandbox approval only.
7. Verify Firestore writes in test collections.
8. Verify duplicate webhook is ignored.
9. Verify QR cannot be paid twice.
