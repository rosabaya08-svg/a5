# A5 Firebase Implemented Feature Map

Updated: 2026-05-25

This document separates features that moved from mock-only to Firebase-connected beta from features that still need owner/provider input.

## Mock to implemented beta

| Previous state | Implemented Firebase-connected state | Main files |
| --- | --- | --- |
| Product list used mock data first | `/products`, `/tablet/products`, and product detail read Firestore `products` first and use mock fallback only on failure | `lib/repositories/firebase/firebaseProductRepository.ts`, `components/storefront/TabletMallPages.tsx` |
| Product source was unclear | Storefront shows `Firebase products` or `mock fallback` plus product id/status/source/seeded_at | `components/storefront/TabletMallPages.tsx`, `types/commerce.ts` |
| CMS screen used mock labels | CMS form now writes to Firestore A5 collections and subscribes to live records | `components/firebase/FirebaseCmsManager.tsx`, `lib/firebase/contentRepository.ts` |
| Storage upload was blocked in code | CMS upload now uses Firebase Storage `uploadBytes` and `getDownloadURL` | `lib/firebase/client.ts`, `lib/firebase/contentRepository.ts` |
| CMS collection names did not match rules | CMS collections now align to A5 rules: `marketing_banners`, `marketing_videos`, `product_detail_pages`, `home_sections`, `tablet_home_configs`, `media_assets` | `components/firebase/FirebaseCmsManager.tsx`, `firestore.rules` |
| Firebase rules did not exist | Firestore and Storage rules source exists and has been deployed | `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc` |
| Foundation data had no seed path | Foundation seed script exists for companies, nursery, room, tablet, brands, home section, banner, video, exhibition, tablet home config, product detail page | `scripts/seed-firestore-foundation.mjs` |
| Product seed required shell-only env | Product seed can read local untracked `.env.local` values | `scripts/seed-firestore-products.mjs` |
| Firebase scope was informal | Auto-connectable work and blockers are documented | `FIREBASE_AUTOMATION_SCOPE.md`, `FIREBASE_INTEGRATION_BLOCKERS.md` |

## Still mock or blocked by design

| Feature | Reason |
| --- | --- |
| Orders write | Must be server-side after PG confirm and amount recalculation |
| Payments write | Must be server-side through Functions/PG flow |
| Refund/cancel/settlement/payout | Requires PG policy, settlement hold policy, operator approval |
| Custom Claims assignment | Requires trusted Admin SDK runtime; no service account private key should be committed |
| Alimtalk/SMS | Requires provider keys and approved templates |
| Delivery tracking | Requires carrier/API contract and keys |
| External inventory | Requires official external inventory API contract and keys |
| A4 integration | Requires A4 API contract and credentials |

## Immediate next connection steps

1. Add local untracked `FIREBASE_SEED_EMAIL` and `FIREBASE_SEED_PASSWORD`.
2. Give the seed account `seed_admin` or `SUPER_ADMIN` claim through a trusted Admin SDK process.
3. Run `npm.cmd run seed:firestore:foundation`.
4. Open Firebase CMS pages and create/upload one banner and one product detail image.
5. Confirm Firestore documents and Storage paths appear under the expected A5 collections and folders.
