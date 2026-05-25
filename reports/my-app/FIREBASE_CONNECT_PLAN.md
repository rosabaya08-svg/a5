# Firebase Connect Plan

## 2026-05-25 verification update

- `npm.cmd install firebase`: up to date.
- `npm.cmd run build`: passed, 96 static routes generated.
- Current execution environment could not reach Cloud Firestore backend and logged `EACCES` / `UNAVAILABLE`.
- The product repository is expected to fall back to mock data in this condition.
- `.env.local` exists in the workspace but was not read and is not shown in Git status. Keep it untracked.
- No git, deploy, service account, private key, PG, refund, settlement, Alimtalk, delivery tracking, external inventory, or Storage upload work was performed.

## 2026-05-23 phase 1 scope

This phase moves product browsing out of mock-only mode while keeping payments, refunds, settlements, Alimtalk, delivery tracking, external inventory, deploy, rules files, and Storage upload blocked.

## Implemented

- Installed/confirmed `firebase` dependency with `npm.cmd install firebase`.
- Added `.env.local.example` with key names only. No real `.env.local` values were created.
- Updated `.gitignore` so `.env.local.example` can be tracked while real `.env*` files stay ignored.
- Added `lib/firebase/appCheck.ts` with browser-only `initializeAppCheck` and `ReCaptchaV3Provider`.
- Kept `lib/firebase/client.ts` on Web SDK app/auth/firestore initialization. Storage client export was removed for this phase.
- Implemented `lib/repositories/firebase/firebaseProductRepository.ts`.
- Product Firestore query reads `products` where `status == "active"`.
- Firestore product documents map `title/name`, `price`, `category`, `company_id`, `nursery_id`, `inventory`, comparison prices, and image placeholder fields into the local `Product` shape.
- `/products`, `/tablet/products`, and `/tablet/products/[id]` now prefer Firebase products and fall back to mock products on missing env, read error, empty result, or inactive/not-found detail.
- Product screens show `Firebase products` or `mock fallback` source badges.
- Added `scripts/seed-firestore-products.mjs` using Firebase Web SDK and `FIREBASE_SEED_EMAIL` / `FIREBASE_SEED_PASSWORD`.
- Added `seed:firestore:products` package script.
- Firebase Storage upload is explicitly blocked in `lib/firebase/contentRepository.ts`.

## Required local env names

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`
- `FIREBASE_SEED_EMAIL`
- `FIREBASE_SEED_PASSWORD`

## Firestore products shape

The seed script writes `products/{productId}` documents with:

- `status: "active"`
- `company_id`
- `nursery_id`
- `title`
- `name`
- `brand`
- `subtitle`
- `category`
- `price`
- `inventory`
- `list_price`
- `platform_lowest_price`
- `closed_mall_price`
- `image_url`
- `option_ids`
- `delivery_available`
- `pickup_available`
- `source: "local_mock_seed"`

## Still blocked

- Do not commit real `.env.local`.
- Do not create service account or Firebase Admin private key.
- Do not create `firebase.json`, `.firebaserc`, `firestore.rules`, or `storage.rules`.
- Do not run `firebase deploy`.
- Do not connect PG, real refund, real settlement, Alimtalk, delivery tracking, or external inventory APIs.
- Do not connect Firebase Storage upload until separate approval and Blaze/storage policy are confirmed.

## Validation

- `npm.cmd run build`: passed, 96 static routes generated.
- `npm.cmd run lint`: passed with 0 errors and 13 warnings. Warnings are image optimization warnings and one unused mock `OptionPanel`.
