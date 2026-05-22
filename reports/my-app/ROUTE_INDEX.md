# my-app route index

This is the route index for `localhost:3000` in the `my-app` worktree. All routes listed here are mock/test beta review targets. No route should be interpreted as production launch, real payment, real Firebase connection, settlement execution, Alimtalk sending, delivery tracking, or external inventory integration.

## Primary launcher

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Home launcher with the original 6 domain cards and generated result review section | mock/test beta |
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
| `/nursery/dashboard` | 조리원 Admin mock dashboard | manual smoke pending |
| `/tablet/products` | 태블릿 상품 목록 | manual smoke pending |
| `/tablet/cart` | 태블릿 장바구니 | manual smoke pending |
| `/tablet/qr` | 태블릿 QR 생성 | manual smoke pending |
| `/q/SANHO701` | 고객 QR 랜딩 | manual smoke pending |
| `/q/SANHO701/checkout` | 고객 checkout mock | manual smoke pending |
| `/orders/guest` | 비회원 주문조회 입력 | manual smoke pending |
| `/orders/guest/A5-20260519-001` | 비회원 주문조회 상세 | manual smoke pending |

## Safety badges used on the home launcher

- `mock/test beta`
- `Firebase 연결 없음`
- `PG 연결 없음`
- `운영 배포 아님`

## Live integration status

- Firebase: no live connection
- Firestore/Auth: no live connection
- PG: mock only
- Alimtalk: blocker
- Delivery tracking: blocker
- External inventory API: blocker
- Storage: held because Spark plan blocks usage
- Deployment: not production
