# tablet-qr DATA_VOLUME_NOTE

## Runtime Mock Counts

- `data/mockProducts.ts` contains 30+ product records focused on postpartum, nursery, baby care, premium goods, and food categories.
- `data/mockQrSessions.ts` contains base QR cases plus generated `BETA001` through `BETA024` sessions.
- `data/mockOrders.ts` derives generated bulk orders, order items, and payments from generated QR sessions.

## Why Some Counts Are Generated

- The unattended phase prioritizes broad state coverage without copying repetitive static records.
- Generated QR sessions keep active, paid, expired, and cancelled states distributed across the bulk sample set.
- Generated orders keep pickup, delivery, pending payment, picked up, delivered, cancelled, and failed-payment style branches available for lookup.

## Verification Caveat

- Simple text search can undercount generated records because repeated records are produced by mapped arrays.
- Build, lint, runtime rendering, and route screenshots remain pending because commands were prohibited.
- No real personal information is used; generated customers use sample names and masked sample phone numbers only.
