# my-app 자동 파일 생성 준비 보고

## 2026-05-25 A5 Firebase feature alignment

### Summary

- Converted connected CMS/file areas from mock-only implementation language to Firebase live beta wiring.
- CMS upload paths now use A5 company/product or storefront Storage folders.
- CMS Firestore payloads now include default scoped fields for company/nursery/tablet modes so deployed rules can authorize writes.
- Added `A5_FIREBASE_IMPLEMENTED_FEATURES.md` to list mock-to-implemented Firebase work and remaining blockers.

### Verification

- `npm.cmd run lint`: passed, 0 errors, 12 image warnings.
- `npm.cmd run build`: passed, 93 static routes.

## 2026-05-25 Firebase automatic integration boundary batch

### Summary

- Clarified what Codex can automatically connect and what needs owner/provider action.
- Added Firebase Storage client export.
- Converted CMS Storage upload from blocked placeholder to real Firebase Storage upload helper.
- Aligned live CMS collection names with A5 Firestore rules.
- Added Firestore foundation seed script for companies, nursery, room, tablet, brands, home section, banners, videos, exhibition, tablet home config, and product detail seed documents.
- Expanded Firestore rules source with `media_assets` and seed-admin write support.
- `npm.cmd run lint` passed with 0 errors and 12 existing image warnings.
- `npm.cmd run build` passed with 93 static routes.
- Updated Firestore rules deployed successfully.
- Storage rules compile/deploy confirmed.
- `npm.cmd run seed:firestore:foundation` was blocked because local seed credentials are not present in env.

### Still blocked

- Custom Claims assignment.
- Seed account email/password and `seed_admin` or `SUPER_ADMIN` claim.
- Service account/private key generation.
- PG real approval/cancel/refund/settlement.
- Secret Manager values.
- Alimtalk, delivery tracking, external inventory APIs.
- Order/payment Firestore writes until server payment flow is deployed.

## 2026-05-25 Firebase products storefront read push batch

### Summary

- Hardened `/products`, `/tablet/products`, and `/tablet/products/[id]` so Firestore `products` remains the first source and mockProducts remains the fallback.
- Added visible source/read diagnostics for `Firebase products` and `mock fallback`.
- Added developer-facing product metadata display: `product id`, raw `status`, `source`, and `seeded_at`/mock seed state.
- Sandbox build passed but Firestore network access was blocked with `EACCES/UNAVAILABLE`, proving fallback remains safe.
- Network-enabled build passed and confirmed the 4 active Firestore products through generated SSG routes.

### Verification

- `npm.cmd run lint`: passed, 0 errors, 12 existing `<img>` warnings.
- `npm.cmd run build`: passed, 93 static routes in the network-enabled verification run.
- Firestore active products confirmed in generated routes: `product-bag`, `product-care-kit`, `product-robe`, `product-tea`.
- No `.env.local`, service account, private key, reCAPTCHA secret, or PG secret value was printed.

## 2026-05-25 QA release gate scripts

### 작업 요약

- `scripts/check-env.mjs` 생성: `NEXT_PUBLIC_FIREBASE_*` 키 존재만 확인하고 실제 값은 출력하지 않는다.
- `scripts/check-no-secrets.mjs` 생성: `.env.local` git index 추적 여부, `serviceAccountKey.json`, private key 후보 파일 존재 여부를 확인한다. git 명령은 실행하지 않는다.
- `scripts/check-routes.mjs` 생성: App Router `page.*` 파일을 route 목록으로 변환하고 필수 smoke route 존재를 확인한다.
- `QA_RELEASE_GATE.md`, `CLOUD_DEPLOY_CHECKLIST.md` 작성.
- `package.json`에 `check:env`, `check:no-secrets`, `check:release` 추가.

### 검증

- `npm.cmd run check:env`: 성공.
- `npm.cmd run check:no-secrets`: 성공. `.env.local`은 로컬 존재, git index 미추적, `serviceAccountKey.json` 없음.
- `node scripts/check-routes.mjs`: 성공. 69개 page route 발견, 필수 route 모두 존재.
- `npm.cmd run build`: 성공. static routes 96개 생성.
- build 중 Firestore backend 접근은 현재 실행 환경 네트워크 제한으로 `EACCES`/`UNAVAILABLE` 로그가 발생했고, mock fallback 유지.


## 2026-05-25 Firebase Functions v2 payment server skeleton

### 작업 요약

- `functions` 폴더에 Firebase Functions v2 mock-only 결제 서버 skeleton을 생성했다.
- `paymentsReady`, `paymentsConfirm`, `paymentsWebhook`, `paymentsCancel` HTTPS functions export 구조를 만들었다.
- 실제 PG API 호출, PG secret 사용, 실제 Firestore write는 하지 않는다.
- order snapshot, inventory reserve/release, QR validation, amount assertion, audit log skeleton을 분리했다.
- `FIREBASE_FUNCTIONS_PLAN.md`, `PAYMENT_CONNECT_PLAN.md`, `PAYMENT_FLOW_CHECKLIST.md`를 갱신했다.

### 검증

- `npm.cmd run build`: 성공, static pages 96개.
- build 중 Firestore backend 접근은 현재 실행 환경 네트워크 제한으로 `EACCES`/`UNAVAILABLE` 로그가 발생했고, products는 mock fallback으로 생성됨.
- `functions/node_modules` 없음. dependency 설치 승인 전이므로 `npm.cmd --prefix functions run build`는 실행하지 않고 blocker로 기록.


## 2026-05-25 PG readiness and enterprise beta uplift

### 작업 요약

- PG 키 수령 후 연결 지점을 분리하기 위해 `types/payment.ts`, `lib/payments/**`, `PAYMENT_CONNECT_PLAN.md`, `PG_ENV_KEYS.md`, `PAYMENT_FLOW_CHECKLIST.md`를 생성했다.
- 실제 PG SDK/API 호출 없이 mock provider와 PG provider skeleton만 추가했다.
- `/q/[code]/checkout`에 PG 준비 상태, 누락 키, 서버 confirm 필요 안내를 표시했다.
- 고객 폐쇄몰 홈에 영상/GIF 광고 placeholder, 섹션형 상품 편성, 장바구니 QR 전환 안내를 추가했다.
- 최고관리자에는 배너/광고/홈 편집/기업 계정 초대/PG 전환 게이트를 노출했다.
- 기업 어드민에는 입점 서류, 통장 사본, CS/주소, 상품 법정 고지, 상세 미리보기 구조를 보강했다.
- 조리원 어드민에는 사업자등록증 기준 계정, 객실 선택, A4 external mapping mock 구조를 보강했다.
- products read 외 Firestore write를 막기 위해 `lib/firebase/liveShopRepository.ts`를 blocked/local 메시지로 제한했다.

### 검증

- `npm.cmd run lint`: 성공, 오류 0개, `<img>` 최적화 경고 12건.
- `npm.cmd run build`: 성공, static pages 96개.
- build 중 Firestore backend 접근은 실행 환경 네트워크 제한으로 실패했으나 mock fallback으로 정적 생성 성공.

### 금지 준수

- git add/commit/push 실행 없음.
- deploy 실행 없음.
- service account/private key/Secret 생성 없음.
- 실제 PG 승인/취소/환불/정산 실행 없음.
- 알림톡/배송조회/외부 재고 API 호출 없음.

## 2026-05-25 Firebase products read verification

### 확인 요약

- Firebase Web SDK dependency 확인: `firebase`는 `package.json`에 존재하며 `npm.cmd install firebase` 결과 최신 상태.
- Firebase products read 1차 구조는 이미 반영되어 있음.
- `.env.local.example`, `lib/firebase/client.ts`, `lib/firebase/appCheck.ts`, `lib/repositories/firebase/firebaseProductRepository.ts`, `scripts/seed-firestore-products.mjs`, `reports/my-app/FIREBASE_CONNECT_PLAN.md` 존재 확인.
- `.env.local` 파일은 현재 workspace에 존재하지만 내용은 읽지 않았고 Git status에는 표시되지 않음.
- `/products`, `/tablet/products`, `/tablet/products/[id]`는 `Firebase products` 우선, 실패/빈 결과 시 `mock fallback` 구조 확인.

### 검증

- `npm.cmd run build`: 성공, static pages 96개 생성.
- build 중 Firestore backend 접근은 현재 실행 환경 네트워크 제한으로 `EACCES`/`UNAVAILABLE` 로그가 발생함.
- 해당 실패는 `firebaseProductRepository`의 fallback 대상이며, 화면은 mock fallback으로 유지됨.

### 금지 준수

- git add/commit/push 실행 없음.
- service account/private key 생성 없음.
- firebase deploy 실행 없음.
- PG/환불/정산/알림톡/배송조회/외부 재고 API 실제 연결 없음.

## 2026-05-23 Firebase products read phase 1

### 작업 요약

- `npm.cmd install firebase` 실행 결과: 이미 최신 상태, 439 packages audit 완료, moderate 취약점 2건 보고.
- `.env.local.example` 생성: 실제 값 없이 key 이름만 작성.
- `.gitignore`에 `!.env.local.example` 추가: 실제 `.env*`는 계속 ignore, example만 추적 가능.
- `lib/firebase/client.ts` 정리: Web SDK app/auth/firestore 초기화 유지, Storage client export 제거.
- `lib/firebase/appCheck.ts` 생성: 브라우저 환경에서만 reCAPTCHA v3 App Check 초기화.
- `lib/repositories/firebase/firebaseProductRepository.ts` 구현: `products` 컬렉션에서 `status == "active"` read.
- `/products`, `/tablet/products`, `/tablet/products/[id]`는 Firebase products를 우선 시도하고 실패/빈 결과면 mock fallback 사용.
- 화면 상단에 `Firebase products` 또는 `mock fallback` 데이터 소스 배지 표시.
- `scripts/seed-firestore-products.mjs` 생성: Firebase Web SDK + Email/Password seed admin 로그인으로 `products` 컬렉션 seed.
- `package.json`에 `seed:firestore:products` 추가.
- Firebase Storage upload는 `lib/firebase/contentRepository.ts`에서 명시적으로 차단.

### 검증

- `npm.cmd run build`: 성공, static pages 96개 생성.
- `npm.cmd run lint`: 성공, 오류 0개.
- lint warning: `<img>` 최적화 경고와 사용하지 않는 `OptionPanel` 경고 포함 13건.

### 금지 준수

- 실제 `.env.local` 생성 없음.
- service account/private key 생성 없음.
- `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` 생성 없음.
- `firebase deploy`, git add/commit/push 실행 없음.
- PG/환불/정산/알림톡/배송조회/외부 재고 API 실제 연결 없음.
- Firebase Storage 실제 업로드 연결 없음.

## 2026-05-22 storefront/admin UX coding batch

### 생성/수정 요약

- 고객 폐쇄몰 화면을 단순 허브에서 실제 쇼핑몰형 화면으로 고도화했다.
- `mommy-a5.pages.dev` 스타일을 참고해 hero banner, promo banner, brand logo grid, 실사 상품 카드, 할인 배지, AI 분석 mock layer, 상세 이미지 갤러리, 상세 탭, 모바일 고정 CTA를 추가했다.
- QR 고객 흐름을 모바일 결제 진입 화면처럼 재구성하고 loading/status/expired/refund mock route를 보강했다.
- 관리자/기업 영역에 광고 배너, 영상 광고, 브랜드 로고, 쇼핑몰 홈 편집, 기획전, 상품 상세 미리보기 mock route를 추가했다.
- 공통 `DataTable`, `FilterBar`, `AppShell`, `TopBar`, `AdminSidebar`를 전문가용 SaaS 콘솔에 더 가깝게 확장했다.

### 주요 신규 파일

- `data/mockShopContent.ts`
- `components/storefront/TabletMallPages.tsx`
- `components/storefront/GuestQrExperience.tsx`
- `components/marketing/ContentAdminPages.tsx`
- `app/admin/marketing/banners/page.tsx`
- `app/admin/marketing/videos/page.tsx`
- `app/admin/brands/page.tsx`
- `app/admin/home-editor/page.tsx`
- `app/admin/exhibitions/page.tsx`
- `app/company/products/preview/page.tsx`
- `app/company/ads/banners/page.tsx`
- `app/company/ads/videos/page.tsx`
- `app/company/brand/page.tsx`
- `app/company/exhibitions/page.tsx`
- `app/q/[code]/loading/page.tsx`
- `app/q/[code]/expired/page.tsx`
- `app/q/[code]/status/page.tsx`
- `app/orders/guest/[orderNo]/refund/page.tsx`

### 검증 결과

- `npm.cmd run build`: 성공, static generation 94 routes.
- `npm.cmd run lint`: 성공, 오류 없음.
- lint warning: `@next/next/no-img-element` 11건. 현재는 mock/static export와 외부 mock 이미지 사용 때문에 남겨둔 비차단 경고다.

### Browser smoke 결과

- `/tablet/products`: 404 없음, 쇼핑몰형 hero와 HANSANYEON closed mall UI 표시.
- `/tablet/products/product-care-kit`: 404 없음, 상품 상세 mock 표시.
- `/tablet/cart`: 404 없음, 장바구니 mock 표시.
- `/q/SANHO701`: 404 없음, 고객 QR 랜딩 mock 표시.
- `/q/SANHO701/status`: 404 없음, QR 상태 mock 표시.
- `/orders/guest/A5-20260519-001/refund`: 404 없음, 환불 요청 mock 표시.
- `/admin/marketing/banners`: 404 없음, 콘텐츠 운영 mock 표시.
- `/company/products/preview`: 404 없음, 상품 콘텐츠 미리보기 mock 표시.

### 실연동 상태

- Firebase SDK import 없음.
- 실제 Firestore/Auth 연결 없음.
- 실제 PG/환불/정산 처리 없음.
- 실제 알림톡, 배송조회, 외부 재고 API 호출 없음.
- `.env`, Secret Key, service account, Firebase rules/config/deploy 파일 생성 없음.

## 2026-05-22 Cloudflare Pages static export 점검

- `next.config.ts`에서 `output: "export"`와 `images.unoptimized: true` 적용 상태를 확인했다.
- `/products` route가 이미 존재하며 `/tablet/products` 기반 고객 상품 목록 mock/test beta 화면을 재사용하는 상태를 확인했다.
- `reports/my-app/CLOUDFLARE_DEPLOY_PLAN.md`에 Cloudflare 실패 원인, 수정 상태, 배포 설정 권장값, 검증 결과를 정리했다.
- `npm run build`는 로컬 PowerShell execution policy 때문에 `npm.ps1` 실행이 차단되었다.
- 동일 빌드를 `npm.cmd run build`로 실행해 성공을 확인했고, `out` 폴더가 생성되었다.
- Firebase/PG/Storage/Secret/.env/deploy/git 명령은 실행하지 않았다.

## 작업 기준

- 작업 폴더: `C:\Users\djfhl\Desktop\my-app`
- 트랙명: `my-app`
- 모드: 무인 파일 생성 준비 모드
- 공용 보고서 파일(`AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md`)은 수정하지 않음
- `git add`, `git commit`, `git push`, `npm run lint`, `npm run build`, `npm install`, deploy, Firebase 연결 작업은 실행하지 않음

## 이번 처리

- 제공된 공통 무인 작업 지시를 `my-app` 트랙 기준으로 반영함
- 트랙 전용 보고서 폴더를 `reports/my-app/`로 분리함
- 세부 작업 큐가 제공되지 않았으므로 앱 코드, Firebase 코드, mock UI 파일은 생성/수정하지 않음
- 질문이 필요한 항목은 `reports/my-app/BLOCKERS.md`에 기록함

## 생성 파일

- `reports/my-app/AUTO_REPORT.md`
- `reports/my-app/NEXT_TASKS.md`
- `reports/my-app/BLOCKERS.md`

## 검증

- 사용자 지시에 따라 `npm run lint` 실행하지 않음
- 사용자 지시에 따라 `npm run build` 실행하지 않음
- 사용자 지시에 따라 git 명령 실행하지 않음

## 추가 진행: UI/UX 고도화 준비

- `DAY 1~DAY 5`의 구체 작업 큐가 현재 `my-app` 트랙에 지정되지 않아 앱 코드 생성은 보류함
- 질문으로 멈추지 않기 위해 안전 범위인 `reports/my-app/` 안에서 고도화 기준을 문서화함
- 빈 상태 UI, 오류 상태 UI, 위험 상태 배지, 필터/검색/정렬, 상세 페이지 mock, 반응형, mock 데이터 확장 기준을 정리함
- 병렬 worktree merge 충돌을 피하기 위해 공용 보고서와 앱 소스는 수정하지 않음

## 추가 생성 파일

- `reports/my-app/UI_UX_ENHANCEMENT_BACKLOG.md`
- `reports/my-app/MOCK_DATA_ENHANCEMENT_PLAN.md`
- `reports/my-app/SAFE_EXECUTION_QUEUE.md`

## 현재 상태 판단

- `my-app` 트랙은 공통 통합/관리 트랙으로 유지하는 것이 안전함
- 실제 UI 구현은 `admin`, `company`, `nursery`, `tablet-qr`처럼 명확히 분리된 트랙에서 수행하는 것이 충돌 위험이 낮음
- 현재 지시의 금지 범위 때문에 검증 명령과 git 명령은 계속 미실행 상태임

## 추가 진행: mock/test UI 상태 컴포넌트

### 생성된 타입/데이터

- `types/mockUi.ts`
- `types/mockCommerceView.ts`
- `data/mockUiScenarios.ts`
- `data/mockCommerceView.ts`

### 생성된 UI 컴포넌트

- `components/ui/RiskStatusBadge.tsx`
- `components/ui/StatePanel.tsx`
- `components/ui/SearchSortFilterPanel.tsx`
- `components/ui/MockDetailSections.tsx`
- `components/ui/MockResponsivePreview.tsx`
- `components/ui/MockMallProductCard.tsx`
- `components/ui/MockQrSessionCard.tsx`
- `components/ui/MockOrderTimeline.tsx`

### 생성된 mock preview 라우트

- `app/mock-ui/page.tsx`
- `app/mock-ui/detail/page.tsx`

### 포함된 고도화 항목

- 빈 상태 UI preview
- 오류/만료/차단 상태 UI preview
- 위험 상태 배지
- 검색/필터/정렬 UI shell
- 상품 카드형 UI
- QR 세션 카드 UI
- 주문 타임라인 mock
- 모바일/태블릿/데스크톱 반응형 grid 기준

## 미실행 검증

- 사용자 지시에 따라 `npm run lint` 미실행
- 사용자 지시에 따라 `npm run build` 미실행
- 사용자 지시에 따라 git 명령 미실행

## 운영 연동 상태

- Firebase SDK import 없음
- Firestore/Auth 실제 연결 없음
- PG 실제 결제 없음
- 환불/정산 실제 처리 없음
- 알림톡/배송조회/외부 재고 API 호출 없음
- `.env`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` 생성 없음
## 추가 진행: QR checkout / guest lookup mock

### 생성된 타입/데이터

- `types/mockCheckoutView.ts`
- `data/mockCheckoutView.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockMobileActionBar.tsx`
- `components/ui/MockCheckoutSummary.tsx`
- `components/ui/MockGuestOrderLookup.tsx`

### 생성된 preview 라우트

- `app/mock-ui/checkout/page.tsx`

### 목적

- `/q/[code]/checkout` 화면에 이식 가능한 결제 진입 summary 구조 준비
- `/orders/guest` 화면에 이식 가능한 비회원 주문조회 form/result 구조 준비
- 실제 PG 또는 개인정보 검증 없이 mock/test UI만 제공

### 미실행 검증

- 사용자 지시에 따라 `npm run lint` 미실행
- 사용자 지시에 따라 `npm run build` 미실행
- 사용자 지시에 따라 git 명령 미실행
## 추가 확인: 금지 패턴 읽기 검색

- 대상: `app/mock-ui`, `components/ui`, `data`, `types`, `reports/my-app`
- `firebase/app`, `firebase/firestore`, `firebase/auth` import 없음
- `process.env` 사용 없음
- service account/private key/Secret Key 생성 없음
- `PG` 문자열은 실제 연동 코드가 아니라 "호출 없음/차단/mock only" 안내 문구로만 확인됨
- 사용자 지시에 따라 lint/build/git 명령은 실행하지 않음
## 추가 진행: operations board mock

### 생성된 타입/데이터

- `types/mockOperationsView.ts`
- `data/mockOperationsView.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockMetricGrid.tsx`
- `components/ui/MockApprovalQueue.tsx`
- `components/ui/MockIntegrationGateList.tsx`
- `components/ui/MockRouteSmokeMatrix.tsx`

### 생성된 preview 라우트

- `app/mock-ui/operations/page.tsx`

### 목적

- 관리자/기업/조리원/태블릿QR/Firebase/QA 트랙의 운영 상태를 mock board로 확인
- 승인 대기, 연동 차단, smoke route 후보를 실제 외부 호출 없이 시각화
- 다음 출근일 수동 검증 경로에 `/mock-ui/operations` 추가 후보 제공
## 추가 진행: QA / merge readiness mock

### 생성된 타입/데이터

- `types/mockQaView.ts`
- `data/mockQaView.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockMergePlanBoard.tsx`
- `components/ui/MockManualChecklist.tsx`
- `components/ui/MockReleaseReadiness.tsx`

### 생성된 preview 라우트

- `app/mock-ui/qa/page.tsx`

### 목적

- 다음 출근일의 `git status`, `git pull origin main`, worktree merge 검토, 최종 lint/build 수동 실행 절차를 화면으로 정리
- 실제 git/npm 명령은 실행하지 않고 manual-only checklist로만 표시
- live release 전 차단 상태를 유지해야 하는 Firebase/PG/Storage/QA 조건을 mock readiness로 표시
## 추가 진행: storefront mock

### 생성된 타입/데이터

- `types/mockStorefrontView.ts`
- `data/mockStorefrontView.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockStoreHero.tsx`
- `components/ui/MockCategoryRail.tsx`
- `components/ui/MockStoreBenefitStrip.tsx`
- `components/ui/MockPriceLayerPanel.tsx`

### 생성된 preview 라우트

- `app/mock-ui/storefront/page.tsx`

### 목적

- 태블릿/고객 폐쇄몰의 첫 화면 느낌을 별도 preview로 고도화
- 조리원/객실/QR 만료/폐쇄몰가/가격 비교 안내를 mock-only 화면으로 분리
- 실제 상품 구매, 장바구니 상태 변경, PG 결제, Firebase 연결 없이 정적 UI만 제공
## 추가 진행: session lifecycle mock

### 생성된 타입/데이터

- `types/mockSessionLifecycle.ts`
- `data/mockSessionLifecycle.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockSessionLifecycleBoard.tsx`
- `components/ui/MockDeviceContextPanel.tsx`
- `components/ui/MockPayerHandoffCard.tsx`

### 생성된 preview 라우트

- `app/mock-ui/session/page.tsx`

### 목적

- 태블릿 장바구니 snapshot, QR 활성, 모바일 결제 진입, mock 결제 결과, 만료/사용완료 차단 상태를 정적 UI로 정리
- 조리원/객실/태블릿 출처 추적 패널 제공
- 실제 Firebase session document 또는 PG transaction 생성 없이 lifecycle만 preview
## 추가 진행: analytics / settlement visibility mock

### 생성된 타입/데이터

- `types/mockAnalyticsView.ts`
- `data/mockAnalyticsView.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockAnalyticsTiles.tsx`
- `components/ui/MockRiskDistribution.tsx`
- `components/ui/MockSettlementPreview.tsx`

### 생성된 preview 라우트

- `app/mock-ui/analytics/page.tsx`

### 목적

- 관리자/기업 화면에 이식 가능한 매출, 위험 분포, 정산 preview UI 확보
- 실제 정산/입금/환불/회계 데이터가 아니라 mock/test visibility로만 제한
- payout disabled 상태를 명시하여 운영 지급 처리로 오해하지 않게 구성
## 추가 진행: preview route index

### 생성된 타입/데이터

- `types/mockPreviewRoute.ts`
- `data/mockPreviewRoutes.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockPreviewRouteGrid.tsx`

### 수정된 preview 라우트

- `app/mock-ui/page.tsx`

### 목적

- `/mock-ui`에서 storefront, detail, checkout, session, operations, QA, analytics preview로 이동 가능한 route index 제공
- 다음 출근일 수동 smoke 확인 경로를 한 화면에 모음
- 실제 브라우저/빌드 실행 없이 정적 link UI만 구성
## 추가 확인: unattended command hygiene

- `reports/my-app/SAFE_EXECUTION_QUEUE.md`에서 이전 커밋 후보 명령 블록을 제거하고 `COMMIT_CANDIDATE.md` 참조만 남김
- 최신 지시에 따라 커밋 후보 명령은 `reports/my-app/COMMIT_CANDIDATE.md`에만 보관
- `git`, `npm run lint`, `npm run build`, install, deploy 명령은 실행하지 않음
## 추가 진행: end-to-end journey mock

### 생성된 타입/데이터

- `types/mockJourneyView.ts`
- `data/mockJourneyView.ts`

### 생성된 UI 컴포넌트

- `components/ui/MockJourneyMap.tsx`
- `components/ui/MockDecisionLedger.tsx`

### 생성된/수정된 preview 라우트

- `app/mock-ui/journey/page.tsx`
- `data/mockPreviewRoutes.ts`

### 목적

- 태블릿 상품 탐색, 장바구니 검토, QR 생성, 모바일 checkout, 결제 결과, 비회원 주문조회까지의 end-to-end mock 흐름을 한 화면에 정리
- 고객 로그인, 금액 재계산, 재고 차감, 환불/정산 같은 운영 전환 결정을 safe mock choice와 live requirement로 분리
- 실제 주문/결제/환불/정산을 생성하지 않고 의사결정 ledger만 제공
## 추가 진행: mock UI route index document

### 생성된 문서

- `reports/my-app/MOCK_UI_ROUTE_INDEX.md`

### 목적

- 새로 생성된 `/mock-ui/**` preview route 목록과 목적을 한 곳에 정리
- 다음 출근일 수동 smoke 확인 후보를 문서화
- 실제 연동 금지 상태와 mock-only 범위를 명시
## 추가 진행: next working day handoff

### 생성된 문서

- `reports/my-app/NEXT_WORKDAY_HANDOFF.md`

### 목적

- 다음 출근일 수동 확인 순서와 generated preview routes를 별도 문서로 분리
- 금지된 live integration 항목을 다시 명시
- 무인 모드에서 실행하지 않은 lint/build/smoke를 사람 검증 단계로 넘김
## 추가 진행: local status dashboard

### 경로 결정

- 현재 작업 폴더명은 `my-app`
- 사용자 지시의 6개 worktree 매핑에는 `my-app`이 없음
- 질문하지 말라는 지시에 따라 safe fallback으로 `track=my-app`, `status route=/mock-ui/status`를 선택
- 해당 결정은 `reports/my-app/STATUS_SUMMARY.md`와 `BLOCKERS.md`에 기록

### 생성된 파일

- `app/mock-ui/status/page.tsx`
- `components/my-app/StatusDashboard.tsx`
- `data/my-app/statusMock.ts`
- `reports/my-app/STATUS_SUMMARY.md`

### 수정된 파일

- `types/mockPreviewRoute.ts`
- `data/mockPreviewRoutes.ts`
- `components/ui/MockPreviewRouteGrid.tsx`
- `reports/my-app/COMMIT_CANDIDATE.md`
- `reports/my-app/MOCK_UI_ROUTE_INDEX.md`
- `reports/my-app/NEXT_WORKDAY_HANDOFF.md`

### 대시보드 표시 항목

- 현재 트랙명
- 생성된 주요 파일 수
- 생성된 주요 화면 목록
- mock/test 완료 항목
- 실제 연결 금지 항목
- Firebase 상태: 실제 연결 없음
- PG 상태: mock only
- 알림톡/배송조회/외부 재고 API: blocker
- Storage 상태: Spark 제한으로 보류
- 다음 작업 10개
- 사람이 확인해야 할 항목
- 브라우저 smoke route 목록
- empty/loading/error/risk 상태 커버리지
## 추가 진행: status dashboard design enhancement

### 수정된 파일

- `data/my-app/statusMock.ts`
- `components/my-app/StatusDashboard.tsx`

### 생성된 문서

- `reports/my-app/STATUS_DASHBOARD_DESIGN_NOTES.md`

### 추가된 대시보드 항목

- live integration status grid
- worktree progress timeline
- Firebase/PG/Storage/Alimtalk/배송조회/외부 재고 API 상태별 required-before-live 문구
- empty/loading/error/risk coverage 설명 강화
- 모바일/태블릿/데스크톱 반응형 구성 메모
## 추가 확인: status dashboard read-only scan

- 확인 범위: `app/mock-ui`, `components/my-app`, `data/my-app`, `reports/my-app`
- 확인된 status route: `app/mock-ui/status/page.tsx`
- 확인된 dashboard component: `components/my-app/StatusDashboard.tsx`
- 확인된 dashboard mock data: `data/my-app/statusMock.ts`
- Firebase SDK import 패턴 없음
- `process.env` 사용 없음
- secret/config 생성 없음
- 검색에 잡힌 민감 키워드는 "생성하지 않음/확인 필요" 보고서 문구로만 존재
## 추가 진행: localhost:3000 통합 런처와 route index

### 수정된 화면

- `app/page.tsx`
  - 기존 6개 주요 영역 카드 구조 유지
  - `자동 생성 결과 확인` 섹션 추가
  - `/mock-ui/status`, `/mock-ui`, `/tablet/products`, `/tablet/cart`, `/tablet/qr`, `/q/SANHO701`, `/q/SANHO701/checkout`, `/orders/guest/A5-20260519-001` 카드 추가
  - 각 카드에 `Firebase beta live`, `Firestore commerce ready`, `PG module pending`, `No production payment` 배지 추가

### 수정된 status dashboard

- `data/my-app/statusMock.ts`
  - 생성된 파일 그룹 데이터 추가
  - worktree 포트 안내 데이터 추가
  - route 목록 확장
  - 진행률 및 count 갱신
- `components/my-app/StatusDashboard.tsx`
  - 전체 진행률 카드 유지
  - 생성된 파일 그룹 섹션 추가
  - 확인 가능한 route 목록 확장
  - 차단된 실연동 목록 명확화
  - worktree 포트 안내 추가

### 생성된 브라우저 확인 화면

- `app/mock-ui/smoke/page.tsx`
- `components/my-app/VisualSmokeChecklist.tsx`
- `app/mock-ui/merge/page.tsx`
- `components/my-app/MergeHandoffBoard.tsx`

### 생성된 보고서

- `reports/my-app/ROUTE_INDEX.md`
- `reports/my-app/VISUAL_SMOKE_PLAN.md`
- `reports/my-app/MERGE_HANDOFF.md`

### 검증 상태

- 사용자 지시에 따라 `git` 명령 미실행
- 사용자 지시에 따라 `npm run lint` 미실행
- 사용자 지시에 따라 `npm run build` 미실행
- 사용자 지시에 따라 deploy 미실행
- 실제 Firebase/PG/정산/알림톡/배송조회/외부 재고 API 연결 없음

## 추가 진행: browser-visible smoke and merge screens

- `/mock-ui/smoke` 화면 생성
- `/mock-ui/merge` 화면 생성
- `app/page.tsx`의 `자동 생성 결과 확인` 섹션에 smoke/merge 카드 추가
- `data/my-app/statusMock.ts` route count와 generated screen 목록 갱신
- `ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, `MERGE_HANDOFF.md`에 smoke/merge route 반영
## 추가 확인: 통합 런처 read-only scan

- 확인 범위: `app/page.tsx`, `app/mock-ui`, `components/my-app`, `components/ui`, `data/my-app`, `reports/my-app`
- 확인된 브라우저 확인 화면:
  - `/`
  - `/mock-ui/status`
  - `/mock-ui/smoke`
  - `/mock-ui/merge`
  - `/mock-ui`
- Firebase SDK import 패턴 없음
- `process.env` 사용 없음
- secret/config 생성 없음
- `git`/`npm` 명령 문자열은 `COMMIT_CANDIDATE.md`, 수동 checklist, 보고서 문구에만 존재하며 실행하지 않음
## 추가 진행: /products route smoke fix

### 생성된 파일

- `app/products/page.tsx`

### 수정된 파일

- `data/my-app/statusMock.ts`
- `components/my-app/StatusDashboard.tsx`
- `components/my-app/VisualSmokeChecklist.tsx`
- `reports/my-app/ROUTE_INDEX.md`
- `reports/my-app/VISUAL_SMOKE_PLAN.md`

### 생성된 보고서

- `reports/my-app/ROUTE_404_STATUS.md`

### 변경 내용

- `/products` route를 추가해 404를 해소
- `/products`는 기존 `/tablet/products`의 `TabletProductsPage`를 재사용
- 상단에 `Firebase beta live`, `Firestore commerce ready`, `PG module pending`, `No production payment` 배지 표시
- `/mock-ui/status` route map에 `/products` 추가
- `/mock-ui/status`에 전체 worktree route status matrix 추가
- `/mock-ui/status`에 route별 404 status matrix 추가
- 홈 런처에 `/products`, `/company/products`, `/nursery/rooms` 등 주요 route 카드 연결
- Route index와 visual smoke plan에 `/products` 확인 항목 추가

### 실행하지 않은 것

- git add/commit/push 미실행
- npm install 미실행
- Firebase/PG/환불/정산/알림톡/배송조회/외부 재고 API 연결 없음

## 2026-05-25 PG module handoff readiness

- Added PG browser bridge contract: `lib/payments/pgCheckoutBridge.ts`.
- Added Firebase Functions endpoint mapper: `lib/payments/paymentEndpoints.ts`.
- Added checkout PG handoff UI: `components/storefront/PgIntegrationPanel.tsx`.
- Updated `/q/[code]/checkout` to show PG public config, Functions endpoint, browser module, and mock boundary status.
- Updated Functions payment handlers with server PG readiness snapshots.
- Updated `.env.local.example` and `functions/.env.example` with key names only.
- Updated PG/Firebase payment docs: `PAYMENT_CONNECT_PLAN.md`, `PAYMENT_FLOW_CHECKLIST.md`, `PG_ENV_KEYS.md`, `PG_READY_HANDOFF.md`, `FIREBASE_FUNCTIONS_PLAN.md`.
- Validation:
  - `npm.cmd run lint`: passed, 0 errors, 12 existing `<img>` warnings.
  - `npm.cmd run build`: passed, 93 static routes.
  - `npm.cmd --prefix functions install`: completed with Node engine warning and 9 moderate audit findings.
  - `npm.cmd --prefix functions run build`: passed.
  - `npm.cmd run check:no-secrets`: passed.
- Real PG approval/cancel/refund/settlement calls remain blocked.

## 2026-05-25 Firebase live commerce integration

- Converted products, product options, QR sessions, guest orders, order items, payment events, inventory movements, and audit logs to Firebase repository implementations where safe.
- Updated customer QR and guest order screens to prefer Firestore live data and fall back to mock data only on read failure or empty result.
- Updated storefront badges so the QR/customer frame no longer says Firebase is disconnected when Firestore data is live.
- Deployed updated Firestore rules for A5 closed mall guest/demo commerce documents.
- Seeded Firestore product options, QR sessions, guest orders, and order items without a service account key.
- Validation passed: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd --prefix functions run build`, and `npm.cmd run check:no-secrets`.
- Remaining real-payment boundary: PG provider SDK/keys, Functions secrets, confirm/webhook/cancel implementation, and production refund/settlement policy.

## 2026-05-25 Firebase CMS, Storage, and Functions deployment

- Deployed Firestore and Storage rules for beta CMS/foundation data and A5 media upload paths.
- Seeded Firestore foundation data: companies, nursery, room, tablet, brands, home section, marketing banner/video, exhibition, tablet home config, and product detail page.
- Upgraded Functions runtime declaration to Node 22 and rebuilt successfully.
- Implemented Firestore writes inside Functions:
  - `paymentsReady` writes payment intent documents.
  - `paymentsConfirm` writes mock payment, order, order_items, payment_events, inventory_movements, QR paid marker, and audit log documents in a transaction.
  - `paymentsWebhook` writes webhook event skeletons.
  - `paymentsCancel` writes cancel request manual review documents.
- Deployed `paymentsReady`, `paymentsConfirm`, `paymentsWebhook`, and `paymentsCancel` to `asia-northeast3`.
- Set Artifact Registry cleanup policy to 7 days.
- Smoke tested `paymentsReady` and `paymentsConfirm` HTTPS endpoints successfully in mock mode.
- Re-seeded commerce demo data after smoke so the fixed demo QR/session routes remain usable.

## 2026-05-25 Tablet transparent background for A3

- Removed the hard white browser canvas from `app/globals.css` by making `html` and `body` transparent.
- Removed the hard black full-screen tablet storefront background from `components/storefront/TabletMallPages.tsx`.
- Converted the tablet header, context band, product cards, detail panels, cart panels, QR panels, and developer diagnostic panels to translucent glass surfaces.
- Preserved Firebase products, PG handoff, cart, QR, and guest flow behavior; this change is visual only.
- Intended A3 behavior: when the shopping tab is opened inside the A3 glassmorphism shell, A3 background graphics remain visible behind the A5 tablet webview.
- Validation passed: `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:no-secrets`.

## 2026-05-25 Sidebar navigation integrity fix

- Added `components/layout/navigation.ts` as the central source for admin, company, and nursery sidebar links.
- Updated admin, admin CMS, company, company content, and nursery pages to use the same role-level menu definition.
- Updated `AppShell` so sidebar title remains stable by role instead of changing to page-specific groups such as content operation.
- Updated `AdminSidebar` with fixed desktop width, fixed height, internal scroll, stable item height, and active-route highlighting via `usePathname()`.
- Verified 34 central sidebar links map to existing `app/**/page.tsx` files with 0 missing pages.
- Added `reports/my-app/NAVIGATION_INTEGRITY.md`.
- Validation passed: `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:no-secrets`.

## 2026-05-25 Korean menu label restoration

- Restored visible sidebar menu labels to Korean in `components/layout/navigation.ts`.
- Replaced visible English sidebar/top-bar labels:
  - `Mock/Test Beta` -> `모의/테스트 베타`
  - `CMS` -> `콘텐츠`
  - `new` -> `신규`
  - `White mode` / `Dark mode ready` -> `화이트 모드` / `다크 모드`
  - `기업 Admin` / `산후조리원 Admin` -> `기업 관리자` / `산후조리원 관리자`
- Replaced legacy menu arrays with the central Korean navigation source so old English menu labels do not reappear.
- Firebase/PG behavior unchanged.
- Validation passed: `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:no-secrets`.
## 2026-05-25 Firebase commerce backend beta / PG-ready gate

- Fixed release blockers: `refunded` order status and root ESLint functions build-output ignore.
- Added Functions server surface: `paymentsStatus`, PG adapter slot, order number helper, transaction helper.
- Added RBAC implementation prep: `types/authClaims.ts`, `functions/src/auth/**`, `/admin/permissions`.
- Added enterprise onboarding/compliance UI: `/company/onboarding`, seller disclosure, certification upload mock, return policy, legal checklist.
- Updated Firestore rules so client write is blocked for order/payment/inventory/audit ledgers; Functions Admin SDK remains the write path.
- Added QA scripts: `check:firestore-products`, `check:release:ready`.
- Firestore active products read verified: 4 active products.
- Validation passed: env check, no-secrets, route check, release-ready check, lint, root build, functions build.
- Real PG, refund, settlement, Alimtalk, delivery tracking, external inventory, and deploy remain blocked.
## 2026-05-26 Release gate verification

- Confirmed `refunded` is included in `OrderStatus`, status labels, tone map, and Firebase order repository status normalization.
- Confirmed root ESLint ignores `functions/lib/**`, so Functions TypeScript build output is not linted.
- `npm.cmd run lint`: passed, 0 errors, 12 existing `<img>` warnings.
- `npm.cmd run build`: passed, 95 static pages generated.
- `npm.cmd --prefix functions run build`: passed.
- `node scripts/check-routes.mjs`: passed, 71 page routes.
- No Firebase deploy, real PG approval/refund/settlement, service account, or secret changes were made.
## 2026-05-26 Firebase products storefront read verification

- `/products` and `/tablet/products` render `TabletProductsPage`, which reads Firestore `products` before mock fallback.
- `/tablet/products/[id]` reads Firestore `products/{id}` before mock fallback.
- `NEXT_PUBLIC_DATA_SOURCE=firebase` is now the explicit storefront data-source gate.
- Successful Firestore reads show `Firebase products`; fallback renders `mock fallback` with reason.
- Developer diagnostics show product id, status, source, seeded_at, and last fallback reason.
- `.env.local.example` includes `NEXT_PUBLIC_DATA_SOURCE=firebase`.
- Firestore smoke passed with 4 active products: product-bag, product-care-kit, product-robe, product-tea.
- `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd --prefix functions run build`, and `node scripts/check-routes.mjs` passed.

## 2026-05-26 Repository layer integration

- Added repository selector in `lib/repositories/index.ts` for Firestore-first reads with mock fallback.
- Expanded repository contracts for products, product options, companies, nurseries, rooms, tablets, QR sessions, orders, payments, inventory, audit logs, and content.
- Added Firebase repository files for foundation collections: companies, nurseries, rooms, tablets, product options, and content slots.
- Added mock fallback repository files for the same foundation collections and storefront content.
- Updated tablet/customer storefront components so active screens no longer import core `data/mock*.ts` directly.
- Updated legacy `components/pages/tabletPages.tsx` and `components/pages/guestPages.tsx` to re-export the live storefront implementations.
- Updated marketing/content admin previews to obtain product and content data through repositories.
- Validation passed: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd --prefix functions run build`, and `node scripts/check-routes.mjs`.

## 2026-05-26 Firebase Auth/RBAC Custom Claims skeleton

- Expanded `types/authClaims.ts` with A5 role, scope, validation, and access helpers.
- Strengthened `functions/src/auth/verifyClaims.ts` so Functions can validate role assignment and scope mismatch before any Custom Claims mutation.
- Updated `functions/src/auth/setCustomClaims.ts` to require `SUPER_ADMIN` or `seed_admin` requester claims and validate target scope.
- Updated `functions/src/auth/inviteAdminUser.ts` to use invite/reset-link flow metadata, no plain password storage, and no bulk user creation.
- Rebuilt the `/admin/permissions` panel with Korean role matrix, scope examples, invite flow, and guest-account boundary.
- Updated `AUTH_CLAIMS_PLAN.md` with the implementation skeleton and remaining blocked items.
- Validation passed: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd --prefix functions run build`, `node scripts/check-routes.mjs`, and `npm.cmd run check:no-secrets`.
- Boundaries preserved: no `.env.local` commit, no service account/private key, no Firebase deploy, no real PG/refund/settlement execution.
