# Firestore Rules Deploy Plan

Updated: 2026-05-26

## Goal

Prepare beta-safe Firestore rules for the A5 closed mall and record the live beta deploy state.

The current rule file is designed around these boundaries:

- Public storefront reads are allowed for active/approved/published content.
- CMS beta reads are enabled for storefront design/admin pages so operators can review draft records from the browser.
- CMS beta writes are enabled only when the browser payload carries the A5 beta guard fields: `guest_write_enabled=true`, `source=cms_beta`, `source_app`, `status`, and `updated_at`.
- Role/scope reads are allowed for admin, company, nursery, and tablet contexts.
- Customer guest access is read-only and must be limited by QR/session/order lookup fields.
- Client writes to order, payment, inventory, audit, refund, settlement, payout, webhook, delivery, and notification ledgers are blocked.
- Server writes are expected to happen through Firebase Functions/Admin SDK after server-side validation.

## Read Policy

| Collection group | Read policy |
| --- | --- |
| `products` | `status` is `active` or `approved`, or scoped company/admin operator |
| `product_options` | `status` is `active`, or scoped company/admin operator |
| `product_detail_pages` | published/active content, scoped company operator, or admin |
| `brands`, `home_sections`, `marketing_banners`, `marketing_videos`, `exhibitions`, `exhibition_products`, `popups`, `tablet_home_configs`, `media_assets` | published/active content plus relevant role/scope reads |
| `companies` | `SUPER_ADMIN`, `seed_admin`, or matching `COMPANY_ADMIN.company_id` |
| `nurseries` | `SUPER_ADMIN`, `seed_admin`, or matching `NURSERY_ADMIN.nursery_id` |
| `rooms`, `tablets` | `SUPER_ADMIN`, `seed_admin`, matching nursery scope, or matching tablet scope |
| `qr_payment_sessions` | admin/nursery/tablet scope or beta guest QR read marker |
| `orders`, `order_items` | admin/nursery/company scoped read where appropriate, plus beta guest lookup marker |
| `payments`, `payment_events`, `webhook_events`, `audit_logs`, `notification_logs` | `SUPER_ADMIN` or `seed_admin` read only |

## Write Policy

| Area | Client write policy |
| --- | --- |
| Catalog/foundation seed data | `SUPER_ADMIN` or `seed_admin` only, and only when request data has `status` and `updated_at` |
| CMS beta content | Browser beta write allowed only for guarded CMS payloads in `product_detail_pages`, `brands`, `home_sections`, `marketing_banners`, `marketing_videos`, `tablet_home_configs`, and `media_assets` |
| Orders, order items, payments, payment events | Blocked |
| Webhook events | Blocked |
| Inventory movements | Blocked |
| Audit logs | Blocked |
| Refunds/cancel/settlements/payouts | Blocked |
| QR sessions/cart/cart items | Blocked for direct client writes; Functions must mediate create/confirm transitions |
| Customer guest | Read-only QR/session/order lookup design; direct write blocked |

## Server-Owned Collections

These must be written by Firebase Functions/Admin SDK only:

- `orders`
- `order_items`
- `payments`
- `payment_events`
- `webhook_events`
- `inventory_movements`
- `audit_logs`
- `refunds`
- `delivery_events`
- `pickup_events`
- `settlements`
- `payouts`
- `notification_logs`

## Deploy Command Candidates

Executed for the live beta on 2026-05-26:

```powershell
firebase.cmd deploy --only firestore:rules,storage
```

## Pre-Deploy Checklist

1. Confirm the initial `SUPER_ADMIN` or `seed_admin` claim is assigned from a trusted operator path.
2. Confirm `companies`, `nurseries`, `rooms`, `tablets`, products, product options, and CMS seed records have `status`, `created_at`, and `updated_at`.
3. Confirm checkout uses Functions endpoints for ready/confirm/cancel/status and does not write ledgers directly from the browser.
4. Confirm guest QR and order lookup documents expose only safe read markers and no sensitive payer data.
5. Confirm Firestore indexes required by live queries are created before production traffic.

## Still Blocked

- Real PG confirm/cancel/refund API calls.
- Real webhook signature verification.
- Real settlement payout execution.
- Customer direct writes to QR, order, payment, or inventory state.
- Production write expansion outside guarded CMS beta paths.
