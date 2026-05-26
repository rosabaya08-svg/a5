# my-app route index

This is the route index for `localhost:3000` in the `my-app` worktree. Customer commerce routes now use Firebase/Firestore beta data where available and fall back to mock data when reads fail. No route should be interpreted as production launch, real payment, settlement execution, Alimtalk sending, delivery tracking, or external inventory integration.

## 2026-05-22 storefront/admin UX route additions

| Route | Purpose | Smoke status |
| --- | --- | --- |
| `/products` | Customer product list alias using the shopping mall style tablet catalog | build passed, smoke ready |
| `/tablet/products` | Closed mall storefront with hero banner, promo banners, brand grid, product cards, filters, and mock AI price layer | browser smoke passed |
| `/tablet/products/product-care-kit` | Product detail with gallery, detail tabs, review summary, price comparison, and mobile CTA | browser smoke passed |
| `/tablet/cart` | Cart with quantity/options/fulfillment summary and QR generation CTA | browser smoke passed |
| `/tablet/qr` | Tablet QR generation mock with session expiry and safety notices | build passed, smoke ready |
| `/q/SANHO701` | Mobile customer QR landing page | browser smoke passed |
| `/q/SANHO701/checkout` | Mobile checkout mock, no PG call | build passed, smoke ready |
| `/q/SANHO701/loading` | Checkout loading mock state | build passed, smoke ready |
| `/q/SANHO701/status` | QR lifecycle status mock | browser smoke passed |
| `/q/SANHO701/expired` | Expired QR mock state | build passed, smoke ready |
| `/orders/guest` | Guest order lookup mock form | build passed, smoke ready |
| `/orders/guest/A5-20260519-001` | Guest order detail mock | build passed, smoke ready |
| `/orders/guest/A5-20260519-001/refund` | Guest refund request mock, no real refund | browser smoke passed |
| `/admin/marketing/banners` | Admin banner management mock | browser smoke passed |
| `/admin/marketing/videos` | Admin video management mock | build passed, smoke ready |
| `/admin/brands` | Admin brand logo grid mock | build passed, smoke ready |
| `/admin/home-editor` | Admin shopping home section editor mock | build passed, smoke ready |
| `/admin/exhibitions` | Admin exhibition management mock | build passed, smoke ready |
| `/company/products/preview` | Company product detail preview mock | browser smoke passed |
| `/company/ads/banners` | Company banner ad submission mock | build passed, smoke ready |
| `/company/ads/videos` | Company video ad submission mock | build passed, smoke ready |
| `/company/brand` | Company brand room mock | build passed, smoke ready |
| `/company/exhibitions` | Company exhibition application mock | build passed, smoke ready |

## Primary launcher

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Home launcher with the original 6 domain cards and generated result review section | mock/test beta |
| `/products` | Customer product list alias that reuses `/tablet/products` with Firestore products first and mock fallback | Firebase beta |
| `/mock-ui/status` | Integrated progress status dashboard | mock/test beta |
| `/mock-ui` | Mock UI preview hub | mock/test beta |
| `/mock-ui/smoke` | Visual smoke checklist screen | mock/test beta |
| `/mock-ui/merge` | Merge handoff board | mock/test beta |

## Generated preview routes

| Route | Purpose | Status |
| --- | --- | --- |
| `/mock-ui/storefront` | Closed mall storefront preview | mock/test beta |
| `/mock-ui/detail` | Product, QR, and order detail pattern preview | mock/test beta |
| `/mock-ui/checkout` | QR checkout and guest lookup preview | mock/test beta |
| `/mock-ui/session` | QR session lifecycle and device source preview | mock/test beta |
| `/mock-ui/journey` | End-to-end tablet to QR checkout journey map | mock/test beta |
| `/mock-ui/operations` | Approval queue, integration gates, and route matrix preview | mock/test beta |
| `/mock-ui/qa` | Merge plan, manual checklist, and release readiness preview | mock/test beta |
| `/mock-ui/analytics` | Mock sales, risk distribution, and settlement visibility preview | mock/test beta |

## Existing domain routes to inspect

| Route | Purpose | Status |
| --- | --- | --- |
| `/admin/dashboard` | 최고관리자 mock dashboard | manual smoke pending |
| `/company/dashboard` | 기업 Admin mock dashboard | manual smoke pending |
| `/company/products` | 기업 상품 관리 mock route | manual smoke pending |
| `/nursery/dashboard` | 조리원 Admin mock dashboard | manual smoke pending |
| `/nursery/rooms` | 조리원 객실 관리 mock route | manual smoke pending |
| `/tablet` | 태블릿 홈 mock route | manual smoke pending |
| `/tablet/products` | 태블릿 상품 목록 | manual smoke pending |
| `/tablet/cart` | 태블릿 장바구니 | manual smoke pending |
| `/tablet/qr` | 태블릿 QR 생성 | manual smoke pending |
| `/q/SANHO701` | 고객 QR 랜딩 | manual smoke pending |
| `/q/SANHO701/checkout` | 고객 checkout mock | manual smoke pending |
| `/orders/guest` | 비회원 주문조회 입력 | manual smoke pending |
| `/orders/guest/A5-20260519-001` | 비회원 주문조회 상세 | manual smoke pending |

## Safety badges used on the home launcher

- `mock/test beta`
- `Firebase beta live`
- `Firestore commerce ready`
- `PG module pending`
- `No production payment`

## Live integration status

- Firebase: no live connection
- Firestore/Auth: no live connection
- PG: mock only
- Alimtalk: blocker
- Delivery tracking: blocker
- External inventory API: blocker
- Storage: held because Spark plan blocks usage
- Deployment: not production
## 2026-05-25 Added PG/Firebase readiness routes

- `/admin/permissions`: Firebase Auth Custom Claims and admin invite/password reset planning UI.
- `/company/onboarding`: company onboarding, seller disclosure, document upload mock, and account activation gate.
