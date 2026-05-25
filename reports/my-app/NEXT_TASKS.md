# my-app 다음 작업

## 2026-05-25 Firebase products read 다음 작업

1. 로컬 VS Code 터미널에서 실제 `.env.local`을 만들되 Git에 포함하지 않는다.
2. Firebase Console에서 beta rules 적용 후 `products` read와 seed admin write가 의도대로 열렸는지 확인한다.
3. 네트워크가 허용된 로컬 환경에서 `/products`와 `/tablet/products`가 `Firebase products` badge로 전환되는지 확인한다.
4. Firestore backend 접근 실패 또는 products 빈 결과일 때 `mock fallback` badge가 유지되는지 확인한다.
5. seed 계정 준비 후에만 `npm run seed:firestore:products`를 실행한다.
6. Cloudflare Pages 환경 변수에 `NEXT_PUBLIC_FIREBASE_*`와 `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`를 입력할지 별도 승인한다.
7. App Check enforcement는 현재 OFF 유지. ON 전환은 route smoke와 Firestore rules 검증 후 진행한다.
8. Storage, PG, 환불, 정산, 알림톡, 배송조회, 외부 재고 API는 계속 차단 상태로 둔다.

## 2026-05-23 Firebase products read 다음 작업

1. Firebase Console에서 beta Firestore Rules를 적용하기 전, `products` public read와 seed admin write 조건을 문서와 대조한다.
2. 로컬에 실제 `.env.local`을 만들 경우 Git에 포함되지 않는지 `git status --ignored`로 확인한다.
3. seed admin 계정에 `FIREBASE_SEED_EMAIL` / `FIREBASE_SEED_PASSWORD`로 로그인 가능한지 확인한다.
4. `npm run seed:firestore:products`는 rules와 seed 계정 준비 후 로컬 터미널에서만 실행한다.
5. seed 후 `/products`와 `/tablet/products` 상단 badge가 `Firebase products`로 바뀌는지 확인한다.
6. Firestore query가 빈 결과 또는 rules 거부일 때 `mock fallback`으로 유지되는지 확인한다.
7. `products/{id}` 상세 route는 static export 특성상 seed product id가 `generateStaticParams`에 포함되는지 확인한다.
8. `@next/next/no-img-element` warning을 `next/image` 전환 또는 이미지 정책 확정 후 정리한다.
9. Firebase Storage 업로드는 계속 차단한다. Blaze/Storage policy 승인 전까지 상품 이미지 업로드 UI는 placeholder만 사용한다.
10. 다음 Firebase 연결 범위는 products options 또는 read-only CMS 중 하나로 좁혀서 승인받는다.

## 2026-05-22 storefront/admin UX 후속 작업

1. `@next/next/no-img-element` lint 경고 11건을 `next/image` 전환 또는 이미지 정책 확정으로 정리한다.
2. `mommy-a5.pages.dev` 원격 이미지를 계속 mock reference로 둘지, `public` 아래 로컬 placeholder 자산으로 옮길지 결정한다.
3. 고객 폐쇄몰 route(`/products`, `/tablet/products`, `/tablet/products/product-care-kit`, `/tablet/cart`, `/tablet/qr`)를 실제 태블릿 해상도에서 육안 점검한다.
4. QR 고객 route(`/q/SANHO701`, `/q/SANHO701/checkout`, `/q/SANHO701/status`, `/q/SANHO701/expired`)를 모바일 폭에서 점검한다.
5. 비회원 주문조회 route(`/orders/guest`, `/orders/guest/A5-20260519-001`, `/orders/guest/A5-20260519-001/refund`)를 모바일 폭에서 점검한다.
6. 관리자 콘텐츠 route(`/admin/marketing/banners`, `/admin/marketing/videos`, `/admin/brands`, `/admin/home-editor`, `/admin/exhibitions`)를 기존 최고관리자 메뉴와 연결한다.
7. 기업 콘텐츠 route(`/company/products/preview`, `/company/ads/banners`, `/company/ads/videos`, `/company/brand`, `/company/exhibitions`)를 기존 기업 상품 등록/승인 흐름과 연결한다.
8. Firebase Storage가 Spark 제한으로 보류된 상태이므로 이미지/GIF/영상 업로드는 placeholder와 mock submission으로 유지한다.
9. 실제 Firebase/PG 전환 전 QR 금액 재계산, 상품 snapshot, 재고 차감, 결제 상태 전이를 Functions 설계와 다시 대조한다.
10. 병렬 worktree merge 전 `components/storefront`, `components/marketing`, `data/mockShopContent.ts`, layout/ui 공통 컴포넌트 충돌을 우선 확인한다.

## Cloudflare Pages 배포 확인 순서

1. Cloudflare Pages의 build output directory를 `out`으로 설정한다.
2. build command는 `npm run build` 또는 `npx next build`를 사용한다.
3. 재배포 후 `/products`가 404 없이 고객 상품 목록 mock/test beta 화면을 보여주는지 확인한다.
4. `/mock-ui/status`에서 route index와 blocker 상태가 최신인지 확인한다.
5. Static export 제약상 Firebase/PG/알림톡/배송조회/외부 재고 API 실제 연결이 없는 상태를 유지한다.

## 우선순위

1. `my-app` 트랙에서 수행할 세부 작업 범위를 확정한다.
2. 병렬 worktree 방식이라면 `my-app` 트랙이 담당할 파일 범위를 다른 트랙과 겹치지 않게 지정한다.
3. mock/test 베타 파일 생성이 필요한 경우 허용 수정 범위를 먼저 명시한다.
4. 검증이 필요한 단계에서는 별도 승인 또는 새 지시로 `npm run lint`, `npm run build` 허용 여부를 정한다.
5. 모든 작업 종료 후에만 커밋 후보 명령을 검토한다.

## 권장 트랙 분리

- `admin`: 최고관리자 화면
- `company`: 입점사 Admin 화면
- `nursery`: 산후조리원 Admin 화면
- `tablet-qr`: 태블릿 폐쇄몰, 고객 QR, 비회원 주문조회
- `firebase-contract`: Firebase 연결 전 설계 문서
- `qa`: QA, smoke checklist, merge plan
- `my-app`: 공통 통합 기준, 보고서, 최종 정리

## 다음 입력에 포함하면 좋은 정보

- 트랙명
- 허용 수정 범위
- 금지 수정 범위
- 1일차부터 5일차까지 작업 큐
- 보고서 위치
- 검증 실행 여부

## 추가 고도화 실행 큐

1. 빈 상태 UI 기준을 각 도메인별로 적용한다.
   - 상품 없음
   - 주문 없음
   - QR 세션 없음
   - 정산 내역 없음
   - 검색 결과 없음

2. 오류 상태 UI 기준을 각 도메인별로 적용한다.
   - mock 데이터 조회 실패
   - QR 만료
   - 결제 mock 실패
   - 주문번호/휴대폰 불일치
   - 권한 부족 mock

3. 위험 상태 배지 기준을 통일한다.
   - `blocked`
   - `expired`
   - `needs_review`
   - `payment_failed`
   - `settlement_hold`
   - `inventory_low`

4. 필터/검색/정렬 UI를 화면별로 보강한다.
   - 관리자: 기간, 상태, 입점사, 조리원, 결제 상태
   - 기업: 승인 상태, 재고 상태, 배송 상태
   - 조리원: 객실, 태블릿, 현장수령 상태
   - 고객/태블릿: 카테고리, 가격대, 수령방식, 재고 상태

5. 상세 페이지 mock을 우선 추가한다.
   - 상품 상세
   - 주문 상세
   - QR 세션 상세
   - 입점사 상세
   - 조리원/객실/태블릿 상세

6. 모바일/태블릿 반응형 기준을 보강한다.
   - 태블릿 상품 목록은 2~3열 카드 중심
   - 모바일 QR 결제 화면은 단일 컬럼 중심
   - 관리자 표는 모바일에서 카드형 요약으로 전환

7. mock 데이터를 확장한다.
   - 정상 상태뿐 아니라 실패, 만료, 승인대기, 반려, 품절, 재고부족 상태 포함
   - 가격 비교 표시용 정상가/폐쇄몰가/할인율 조합 확대
   - QR 세션 만료/사용완료/취소 케이스 확대

## my-app 트랙 권장 역할

- 공통 문서와 통합 큐 관리
- 병렬 트랙 merge 전후의 충돌 체크리스트 관리
- 실제 구현은 각 기능 트랙에서 수행
- 기능 트랙 결과가 모인 뒤 최종 보고서 통합

## 다음 추가 고도화 후보

1. `/mock-ui` preview를 실제 각 도메인 화면에 연결할지 검토한다.
2. `components/ui/StatePanel.tsx`를 기존 `EmptyState.tsx` 대체 후보로 통합할지 검토한다.
3. `RiskStatusBadge`와 기존 `StatusBadge`의 역할을 분리한다.
   - `StatusBadge`: 도메인 상태
   - `RiskStatusBadge`: 위험/운영 차단/연동 대기 상태
4. `MockMallProductCard`를 태블릿 상품 카드의 차세대 버전으로 이식한다.
5. `MockQrSessionCard`를 `/tablet/qr`, `/q/[code]` 흐름의 요약 카드로 이식한다.
6. `MockOrderTimeline`을 비회원 주문 상세 화면에 이식한다.
7. mock 데이터가 실제 `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts`와 겹치는지 정리한다.
8. 금지 지시가 해제되면 `npm run lint`, `npm run build`를 실행해 새 파일 타입 검증을 수행한다.

## 검증 재개 시 우선 확인 라우트

- `/mock-ui`
- `/mock-ui/detail`
- `/tablet/products`
- `/tablet/cart`
- `/tablet/qr`
- `/q/SANHO701`
- `/orders/guest/A5-20260519-001`
## 추가 이식 후보

1. `MockCheckoutSummary`를 `/q/[code]/checkout`에 이식한다.
2. `MockMobileActionBar`를 `/tablet/cart`, `/tablet/qr`, `/q/[code]/checkout`의 주요 CTA 영역에 이식한다.
3. `MockGuestOrderLookup`을 `/orders/guest`에 이식한다.
4. `MockOrderTimeline`을 `/orders/guest/[orderNo]`에 이식한다.
5. 고객-facing 라우트에서 공통 메시지를 통일한다.
   - `Mock only`
   - `No live PG call`
   - `No Firebase connection`
   - `No customer login required`
6. 실제 화면 이식 전 기존 파일의 한글 인코딩 상태를 확인한다.
7. 검증 금지 지시가 해제되면 `/mock-ui/checkout`을 smoke 확인 목록에 추가한다.
## 다음 검증 재개 조건

1. 사용자가 `npm run lint` 실행을 다시 허용한다.
2. 사용자가 `npm run build` 실행을 다시 허용한다.
3. preview route smoke 확인이 허용되면 `/mock-ui`, `/mock-ui/detail`, `/mock-ui/checkout` 순서로 확인한다.
4. 검증 실패가 있으면 실제 Firebase 연결 없이 새 mock UI 파일 범위에서만 수정한다.
## operations board 이식 후보

1. `MockMetricGrid`를 관리자 dashboard KPI preview에 이식한다.
2. `MockApprovalQueue`를 상품 승인, 환불 검토, Storage 승인 대기 화면에 이식한다.
3. `MockIntegrationGateList`를 Firebase/PG/Storage/배송조회 blocker 안내 화면에 이식한다.
4. `MockRouteSmokeMatrix`를 QA checklist 문서 또는 QA 화면에 이식한다.
5. 검증 허용 시 `/mock-ui/operations`를 smoke 확인 목록에 추가한다.
## QA preview 이식 후보

1. `/mock-ui/qa`를 다음 출근일 수동 점검 보조 화면으로 확인한다.
2. `MockMergePlanBoard`의 merge order를 실제 worktree 결과에 맞게 업데이트한다.
3. `MockManualChecklist`의 명령은 사람이 직접 터미널에서 실행한다.
4. `MockReleaseReadiness`는 운영 전환 gate 문서와 비교해 갱신한다.
5. lint/build 허용 후 새 preview 라우트 전체를 검증한다.
## storefront preview 이식 후보

1. `/mock-ui/storefront`를 기준으로 `/tablet/products` 상단 배너를 개선한다.
2. `MockStoreHero`를 태블릿 홈 또는 상품 목록의 session banner 후보로 검토한다.
3. `MockCategoryRail`을 상품 카테고리 탐색 UI 후보로 검토한다.
4. `MockStoreBenefitStrip`을 배송/현장수령/가격비교 안내 영역으로 검토한다.
5. `MockPriceLayerPanel`을 실제 AI가 아닌 가격 비교 안내 layer로 유지한다.
## session lifecycle 이식 후보

1. `MockSessionLifecycleBoard`를 `/tablet/qr` 또는 `/q/[code]`의 내부 QA preview로 활용한다.
2. `MockDeviceContextPanel`을 조리원/태블릿 관리 화면의 source tracking UI 후보로 검토한다.
3. `MockPayerHandoffCard`를 구매 QR/조르기 QR 분기 안내 카드로 이식한다.
4. 실제 서버 로직 전환 시 QR 생성/만료/사용완료 차단은 Cloud Functions 계획과 대조한다.
5. 검증 허용 시 `/mock-ui/session`을 smoke 확인 목록에 추가한다.
## analytics preview 이식 후보

1. `MockAnalyticsTiles`를 관리자/기업 dashboard KPI 후보로 검토한다.
2. `MockRiskDistribution`을 운영 위험 상태 요약 영역으로 검토한다.
3. `MockSettlementPreview`는 정산 지급 기능이 아니라 preview-only table로만 유지한다.
4. 실제 정산/환불/입금 처리는 PG 및 회계 정책 승인 전까지 계속 차단한다.
5. 검증 허용 시 `/mock-ui/analytics`를 smoke 확인 목록에 추가한다.
## preview route index 확인 후보

1. 검증 허용 시 `/mock-ui`에서 route card들이 렌더링되는지 확인한다.
2. 각 route card가 `/mock-ui/storefront`, `/mock-ui/detail`, `/mock-ui/checkout`, `/mock-ui/session`, `/mock-ui/operations`, `/mock-ui/qa`, `/mock-ui/analytics`로 연결되는지 수동 확인한다.
3. 실제 고객/관리자 화면으로 이식하기 전 preview route별 우선순위를 정한다.
## journey preview 이식 후보

1. `/mock-ui/journey`를 기준으로 tablet/QR/customer guest route 간 흐름을 점검한다.
2. `MockJourneyMap`의 route candidate를 실제 화면 smoke checklist와 연결한다.
3. `MockDecisionLedger`를 Firebase/PG 전환 전 위험 의사결정 문서와 대조한다.
4. 금액 재계산, 재고 차감, QR 만료는 실제 연결 전 Cloud Functions 계획과 반드시 맞춘다.
5. 검증 허용 시 `/mock-ui/journey`를 smoke 확인 목록에 추가한다.
## route index 문서 활용

1. 다음 출근일 `reports/my-app/MOCK_UI_ROUTE_INDEX.md`의 route 목록을 기준으로 smoke 확인한다.
2. 검증 전에는 여전히 `npm run lint`, `npm run build`가 무인 모드에서 금지였음을 확인한다.
3. preview route 중 실제 화면에 이식할 우선순위를 정한다.
4. route별 live integration status를 확인하고 운영 연동 항목은 계속 BLOCKERS로 유지한다.
## next working day handoff

1. `reports/my-app/NEXT_WORKDAY_HANDOFF.md`를 먼저 확인한다.
2. 수동으로 workspace 상태와 최신 main 반영 여부를 확인한다.
3. lint/build를 수동 실행하기 전 금지 파일 생성 여부를 먼저 확인한다.
4. mock preview routes를 smoke 확인한 뒤 실제 tablet/customer/admin 화면 이식 범위를 결정한다.
## status dashboard 후속 작업

1. 다음 출근일 `/mock-ui/status`를 브라우저에서 육안 확인한다.
2. `data/my-app/statusMock.ts`의 파일 수와 route count를 실제 git status 결과와 비교해 보정한다.
3. `/mock-ui/status`에서 route map link가 모두 정상 이동하는지 확인한다.
4. empty/loading/error/risk coverage 표현이 실제 QA 기준과 맞는지 검토한다.
5. `components/my-app/StatusDashboard.tsx`를 다른 worktree용 status dashboard template로 재사용할지 결정한다.
6. 폴더명이 `my-app`인 경우의 fallback route 정책을 유지할지 결정한다.
7. status dashboard를 실제 운영 화면으로 오해하지 않도록 mock/test beta 라벨을 유지한다.
8. live integration blockers가 최신 Firebase console 상태와 일치하는지 검토한다.
9. lint/build 허용 후 status dashboard 타입 검증을 수행한다.
10. 검증 성공 후에만 `reports/my-app/COMMIT_CANDIDATE.md`의 후보 명령을 검토한다.
## status dashboard design 후속 작업

1. `/mock-ui/status`의 integration status 카드가 운영 오픈으로 오해되지 않는지 확인한다.
2. progress timeline의 정적 배치 설명이 `UNATTENDED_PROGRESS.md`와 일치하는지 검토한다.
3. 상태 대시보드 파일 수는 실제 git status와 비교해 수동 보정한다.
4. 다른 worktree에서도 동일한 status dashboard 구조를 쓸 경우 track별 데이터만 분리한다.
5. lint/build 허용 후 `StatusDashboard.tsx`의 Tailwind class와 타입 import를 확인한다.
## localhost:3000 통합 확인 다음 작업

1. 사람이 `localhost:3000` 홈 화면을 열어 기존 6개 카드와 `자동 생성 결과 확인` 섹션을 확인한다.
2. `/mock-ui/status`에서 전체 진행률, 파일 그룹, route map, blockers, worktree port guide를 확인한다.
3. `reports/my-app/ROUTE_INDEX.md`를 기준으로 route 누락 여부를 확인한다.
4. `reports/my-app/VISUAL_SMOKE_PLAN.md` 순서대로 브라우저 클릭 검증을 수행한다.
5. `reports/my-app/MERGE_HANDOFF.md` 기준으로 다른 worktree merge 전 forbidden file/import 여부를 확인한다.
6. 각 worktree 포트 안내를 실제 dev server 실행 계획과 맞춘다.
7. lint/build 허용 시 수동으로 실행하고 status dashboard의 정적 count를 보정한다.
8. tablet/customer route에 preview component를 이식할 우선순위를 결정한다.
9. Firebase/PG/Storage/API blocker가 문서와 화면에서 일관되게 보이는지 확인한다.
10. 모든 수동 검증 후 `reports/my-app/COMMIT_CANDIDATE.md`의 후보를 검토한다.

## smoke/merge 화면 후속 작업

1. `/mock-ui/smoke`에서 클릭 순서가 실제 확인 순서와 맞는지 본다.
2. `/mock-ui/merge`에서 worktree merge 순서와 금지 파일 검사가 충분한지 본다.
3. 홈의 `자동 생성 결과 확인` 카드 수가 너무 많으면 우선순위별로 접거나 그룹화할지 결정한다.
4. 수동 smoke가 끝난 뒤 ROUTE_INDEX와 VISUAL_SMOKE_PLAN의 누락 route를 보정한다.
# my-app Next Tasks

## 2026-05-25 Firebase automatic integration next tasks

1. Deploy updated Firestore/Storage rules after local validation.
2. Run `npm.cmd run seed:firestore:foundation` after confirming the seed account has `seed_admin` or `SUPER_ADMIN`.
3. Confirm the account and claims matrix for owner/admin/company/nursery/tablet actors.
4. Verify Firebase CMS pages with live Firestore and Storage upload.
5. Keep order/payment writes blocked until Functions PG server flow is deployed.
6. Add a no-secret Custom Claims assignment procedure using trusted runtime only.

## 2026-05-25 Firebase products read next tasks

1. After GitHub push and Cloudflare auto deploy, visually verify `/products`, `/tablet/products`, `/tablet/products/product-care-kit`, `/tablet/products/product-robe`, `/tablet/products/product-bag`, and `/tablet/products/product-tea`.
2. Confirm production pages show `Firebase products`; if they show `mock fallback`, check Cloudflare env variables, Firestore rules, and browser console.
3. Keep `.env.local` local-only and continue using `.env.local.example` for key names.
4. Keep Firestore write scope blocked for orders, payments, QR sessions, inventory, refunds, and settlements.
5. Defer App Check enforcement until Cloudflare custom domain and reCAPTCHA domain coverage are verified.
6. Resolve storefront `<img>` lint warnings only after final Storage/image policy is approved.

## 2026-05-25 QA release gate next tasks

1. Cloudflare 재배포 전 `npm.cmd run check:release` 실행.
2. CI/Cloudflare build step에 QA 스크립트를 어느 수준까지 포함할지 결정.
3. 실제 PG 키 입력 전 `npm.cmd run check:no-secrets` 재실행.
4. 신규 route 추가 시 `scripts/check-routes.mjs` required route 목록 갱신.
5. Functions dependency 설치 승인 후 functions build 검증.

## 2026-05-25 Functions skeleton next tasks

1. functions dependency 설치 승인 후 `npm.cmd --prefix functions install` 실행.
2. `npm.cmd --prefix functions run build`로 Functions TS skeleton 검증.
3. PG사 키/문서 수령 후 provider 요청/응답 필드 매핑.
4. Firestore transaction 실제 구현 전 Rules/IAM/audit log 설계 승인.
5. cancel/refund는 정산 정책 승인 전까지 계속 blocked response 유지.

## 2026-05-25 PG and enterprise demo next tasks

1. PG provider 확정 후 `PG_ENV_KEYS.md`의 키 이름을 실제 PG 문서와 맞춘다.
2. 서버 runtime을 확정한다: Firebase Functions, Cloud Run, Cloudflare Workers/Pages Functions 중 하나.
3. server confirm endpoint에서 QR 만료, 중복 사용, 금액 재계산, 재고 차감, 상품 snapshot 저장을 구현한다.
4. `/q/SANHO701/checkout`, `/admin/payments`, `/company/products/new`, `/nursery/dashboard`를 미팅 전 육안 확인한다.
5. 기업 입점 서류 양식과 상품 등록 법정 고지 문구를 실제 운영 정책으로 확정한다.
6. Storage Blaze/Rules 승인 전까지 업로드 기능은 placeholder로 유지한다.
7. A4 연동용 external id 규칙을 실제 A4 데이터와 맞춘다.
8. `<img>` warning은 배포 이미지 전략 확정 후 처리한다.

## 2026-05-25 PG module handoff next tasks

1. Collect PG official sandbox documents, client key, MID, channel key, secret key, webhook secret, success/fail/webhook URL rules.
2. Put only `NEXT_PUBLIC_PG_*` values into Cloudflare Pages.
3. Put `PG_SECRET_KEY` and `PG_WEBHOOK_SECRET` into Firebase Functions Secret Manager.
4. Implement provider-specific wrapper for `window.A5PgProvider.requestPayment(payload)`.
5. Replace mock approval inside `functions/src/payments/confirm.ts` with provider confirm after server amount recalculation.
6. Implement webhook signature verification and duplicate event guard.
7. Run PG sandbox success/fail/expired QR/duplicate payment/amount mismatch tests.
8. Resolve Functions Node 20 local/runtime mismatch and npm audit findings before production deploy.

## 2026-05-25 Firebase live commerce next tasks

1. Verify Cloudflare production storefront pages show Firestore live data, not mock fallback.
2. Keep beta/demo Firestore writes limited to cart, QR session, order snapshot, payment event, inventory movement, and audit log paths.
3. Collect the official PG browser module, server confirm API, cancel API, webhook signature algorithm, sandbox MID/channel key, and secret key.
4. Put browser-safe `NEXT_PUBLIC_PG_*` values in Cloudflare only; put PG secrets in Firebase Secret Manager only.
5. Deploy Firebase Functions only after Node 20 and npm audit findings are resolved.
6. Convert admin/company/nursery aggregate dashboards from mockApi to Firestore read models after customer payment flow is stable.
7. Keep real refunds, settlements, payouts, Alimtalk, delivery tracking, and external inventory blocked.

## 2026-05-25 after Functions deployment next tasks

1. Add PG sandbox public keys to Cloudflare Pages and server keys to Firebase Secret Manager.
2. Swap the mock provider branch in deployed Functions for the official PG confirm/cancel/webhook adapter.
3. Run sandbox PG success, failure, expired QR, duplicate webhook, and amount mismatch tests.
4. Convert admin/company/nursery dashboards to Firestore aggregate read models.
5. Decide when to enable App Check enforcement after Cloudflare domain and reCAPTCHA coverage are confirmed.
6. Review `firebase-functions` package update warning and 9 moderate npm audit findings before production payment launch.

## 2026-05-25 A3 tablet transparent canvas next tasks

1. Smoke check `/tablet/products`, `/tablet/cart`, `/tablet/qr`, and one `/tablet/products/[id]` route inside the A3 shopping tab container.
2. Confirm A3 glassmorphism background graphics remain visible because A5 no longer paints a hard white or black screen background.
3. Confirm text contrast on translucent panels over A3 light/dark backgrounds.
4. If needed, create a single tablet opacity token for panel strength instead of adding per-page hard backgrounds.

## 2026-05-25 Sidebar navigation next tasks

1. Visually compare `/admin/dashboard`, `/admin/marketing/banners`, `/admin/home-editor`, and `/admin/exhibitions` for identical sidebar title, order, width, and active state.
2. Visually compare `/company/dashboard`, `/company/ads/banners`, `/company/products/preview`, and `/company/exhibitions` for identical sidebar behavior.
3. Add every new sidebar route only through `components/layout/navigation.ts`.
4. Promote the route-link check from manual PowerShell verification to a reusable CI script.

## 2026-05-25 Korean menu label next tasks

1. Confirm the deployed sidebar no longer shows `Dashboard`, `CMS`, `new`, `Mock/Test Beta`, or English mode labels.
2. Keep `components/layout/navigation.ts` as the only place for admin/company/nursery menu label changes.
3. Run a separate Korean copy cleanup for non-menu body text when the UI structure is approved.
