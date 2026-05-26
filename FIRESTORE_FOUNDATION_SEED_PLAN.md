# Firestore Foundation Seed Plan

## Seed Script
- Script: `scripts/seed-firestore-foundation.mjs`
- Command:

```powershell
$env:FIREBASE_SEED_EMAIL="seed-admin@example.com"
$env:FIREBASE_SEED_PASSWORD="***"
npm run seed:firestore:foundation
```

Do not print or commit seed credentials.

## Seed Collections
- `companies`
- `nurseries`
- `rooms`
- `tablets`
- `product_options`
- `qr_payment_sessions`
- `marketing_banners`
- `marketing_videos`
- `product_detail_pages`
- `home_sections`
- `tablet_home_configs`
- `media_assets`
- `audit_logs`

## Relationship Keys
- `company_id`: seller/company scope.
- `nursery_id`: postpartum center scope.
- `room_id`: room-level QR/tablet origin.
- `tablet_id`: tablet device origin.

## Verification
- Check Firestore Console for records with `status`, `created_at`, and `updated_at`.
- Run `npm run check:firestore-products` for active product read smoke.
- Route smoke remains `node scripts/check-routes.mjs`.
