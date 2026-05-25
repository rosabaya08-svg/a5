# Firebase Connect Plan

Last updated: 2026-05-25

## Current State

- Firebase project: `a5-closed-mall`
- Web SDK installed.
- Product read repository exists.
- `products` Firestore read has mock fallback.
- Authentication Email/Password is enabled for admin/company/nursery accounts.
- App Check is registered but enforcement remains OFF.
- Storage is deferred because Spark plan blocks Storage usage.

## Connected Scope

The connected beta scope now covers:

- `products` active read with mock fallback.
- `product_options` read/seed for option-level stock display.
- `qr_payment_sessions` read/seed and guarded demo write.
- `orders` and `order_items` read/seed and guarded demo order snapshot write.
- `payments`, `payment_events`, `inventory_movements`, and `audit_logs` repository implementations for PG-ready beta flow.

Customer-facing storefront pages prefer Firestore live data and fall back to mock data only when Firebase is unavailable.

## Still Blocked

- Real PG-confirmed writes for payments, refunds, settlements, and inventory deductions.
- Firebase Auth account provisioning and Custom Claims server logic.
- Storage upload for product images, detail images, video, GIF, business documents, and bankbook copy.
- PG real approval/cancel/refund/settlement.
- Alimtalk, delivery tracking, and external inventory API.
- Admin/company/nursery aggregate dashboards still need Firestore read-model conversion.

## Next Practical Step

Before real PG or order writes, choose a server runtime:

- Firebase Cloud Functions
- Cloud Run
- Cloudflare Workers/Pages Functions

The server must own payment confirm, webhook verification, QR one-time use, amount recalculation, inventory deduction, and audit log append.
