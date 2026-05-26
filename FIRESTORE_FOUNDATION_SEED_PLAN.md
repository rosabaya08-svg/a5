# Firestore Foundation Seed Plan

## Scope

This plan covers the first foundation seed for with.commerce operations after the `products` collection seed.

Seed script:
- `scripts/seed-firestore-foundation.mjs`

Package scripts:
- `npm run seed:firestore:foundation:dry-run`
- `npm run seed:firestore:foundation`

The seed uses Firebase Web SDK and Firebase Auth email/password login. It does not use a service account key, Admin SDK private key, Firebase deploy, PG API, Alimtalk, delivery tracking, or external inventory API.

## Required Seed Collections

The script validates and seeds the following foundation collections:

| Collection | Purpose | Required relationship fields |
| --- | --- | --- |
| `companies` | Seller/company scope and settlement ownership | `company_id` |
| `nurseries` | Postpartum care center scope | `nursery_id` |
| `rooms` | Room-level tablet and QR origin | `nursery_id`, `room_id` |
| `tablets` | Tablet device origin and A4 mapping | `nursery_id`, `room_id`, `tablet_id` |
| `product_options` | Product option stock and price delta | `company_id`, `product_id`, `option_id` |
| `qr_payment_sessions` | Guest QR payment entry state | `nursery_id`, `room_id`, `tablet_id`, `short_code` |
| `marketing_banners` | Storefront banner CMS | `company_id` |
| `marketing_videos` | Storefront video/GIF CMS placeholder | `company_id` |
| `home_sections` | Shopping home section composition | `section_id` |
| `tablet_home_configs` | Tablet home exposure by room/device | `nursery_id`, `room_id`, `tablet_id` |
| `media_assets` | Storage/CMS media metadata | `owner_type`, `owner_id` |
| `audit_logs` | Seed and operations audit trail | `actor_role`, `action` |

Every seeded document includes:
- `status`
- `created_at`
- `updated_at`
- `seeded_at`
- `source: foundation_seed`
- `demo_read_enabled: true`
- `guest_write_enabled: true`

`guest_write_enabled` is kept only for beta seed compatibility with the current rules. It must be removed or restricted before production operation.

## Relationship Map

Current seed relationship baseline:

| Entity | Seed ids |
| --- | --- |
| Companies | `company-sanho-care`, `company-bebe-lux`, `company-momtable` |
| Nurseries | `nursery-gangnam-01`, `nursery-bundang-01` |
| Rooms | `room-701`, `room-702`, `room-501` |
| Tablets | `tablet-701-a`, `tablet-702-a`, `tablet-501-a` |
| Product options | `opt-care-s`, `opt-care-l`, `opt-robe-m`, `opt-bag-cream`, `opt-tea-basic` |
| QR sessions | `qr-sanho701` with `SANHO701`, `qr-askmom88` with `ASKMOM88` |
| Marketing banners | `banner-main-80`, `banner-baby-care` |
| Marketing videos | `video-care-intro` |
| Home sections | `section-main-hero`, `section-best-products` |
| Tablet home configs | `tablet-home-gangnam-701`, `tablet-home-gangnam-702` |
| Media assets | `media-banner-80`, `media-banner-baby-care`, `media-video-care-intro` |
| Audit logs | `audit-foundation-seed` |

## Dry Run

Use dry-run first. It validates required collections, required relationship keys, and timestamp fields without Firebase login or Firestore writes.

```powershell
cd C:\Users\djfhl\Desktop\my-app
npm run seed:firestore:foundation:dry-run
```

Expected result:
- Collection count summary appears.
- Message: `Dry run complete. No Firebase login or Firestore write was attempted.`

## Actual Seed

Run only with a Firebase Auth seed account that has the approved beta write scope under the current Firestore rules.

```powershell
cd C:\Users\djfhl\Desktop\my-app
$env:FIREBASE_SEED_EMAIL="seed-admin@example.com"
$env:FIREBASE_SEED_PASSWORD="***"
npm run seed:firestore:foundation
```

Rules:
- Do not print seed credentials.
- Do not commit `.env.local`.
- Do not create `serviceAccountKey.json`.
- Do not use Firebase Admin private keys.
- Do not deploy rules or functions from this seed step.

## Verification

After actual seed:
1. Open Firestore Console for `a5-closed-mall`.
2. Confirm all required collections exist.
3. Confirm each seeded document has `status`, `created_at`, `updated_at`, and relationship keys.
4. Run `npm run check:firestore-products` for the existing product read smoke.
5. Run `node scripts/check-routes.mjs` for route inventory if UI routes changed.

## Blockers

- Production rules must remove beta `guest_write_enabled` write escape paths.
- Real order/payment/inventory write remains Functions-only.
- Actual PG provider keys and webhook signing docs are still required.
- Alimtalk, delivery tracking, and external inventory API integrations remain blocked.
