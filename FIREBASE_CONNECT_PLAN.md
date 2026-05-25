# Firebase Connect Plan

Last updated: 2026-05-25

## Current State

- Firebase project: `a5-closed-mall`
- Web SDK installed.
- Product read repository exists.
- `products` Firestore read has mock fallback.
- Authentication Email/Password is enabled for admin/company/nursery accounts.
- App Check is registered but enforcement remains OFF.
- Storage bucket is initialized and beta CMS upload rules are deployed.

## Connected Scope

The connected beta scope now covers:

- `products` active read with mock fallback.
- `product_options` read/seed for option-level stock display.
- `qr_payment_sessions` read/seed and guarded demo write.
- `orders` and `order_items` read/seed and guarded demo order snapshot write.
- `payments`, `payment_events`, `inventory_movements`, and `audit_logs` repository implementations for PG-ready beta flow.
- Firebase Functions HTTPS endpoints for payment ready/confirm/webhook/cancel in mock-provider mode.

Customer-facing storefront pages prefer Firestore live data and fall back to mock data only when Firebase is unavailable.

## Still Blocked

- Real PG provider calls for payment approval, cancellation, refund, webhook verification, and settlement release.
- Firebase Auth account provisioning and Custom Claims server logic.
- Storage upload for product images, detail images, video, GIF, business documents, and bankbook copy.
- PG real approval/cancel/refund/settlement.
- Alimtalk, delivery tracking, and external inventory API.
- Admin/company/nursery aggregate dashboards still need Firestore read-model conversion.

## Next Practical Step

Firebase Cloud Functions is now the first server runtime. The deployed mock-provider endpoints own amount recalculation, payment intent creation, order snapshot writing, QR status marking, inventory movement writing, and audit logging.

Next practical step: insert the official PG provider adapter and Secret Manager values, then replace mock approval with real sandbox confirm while preserving server amount recalculation and transaction guards.
