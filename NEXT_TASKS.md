# Next Tasks

## 2026-05-25 A5 Firebase feature alignment next tasks

1. Confirm a seed/admin account has the correct claim, then run `npm.cmd run seed:firestore:foundation`.
2. In `/admin/marketing/banners`, create one Firebase banner record and upload one image.
3. In `/company/products/preview`, create one product detail page record with `company_id` scope.
4. Check Firebase Console for `marketing_banners`, `product_detail_pages`, and `media_assets` documents.
5. Check Storage paths under `companies/company-sanho-care/**` and `public/storefront/**`.
6. Keep PG/order/payment/refund/settlement writes blocked until Functions confirm flow is complete.

## 2026-05-25 Firebase automatic integration next tasks

1. Deploy the updated `firestore.rules` and `storage.rules` after lint/build passes.
2. Run `npm.cmd run seed:firestore:foundation` only after the seed account has `seed_admin` or `SUPER_ADMIN` claim.
3. Create/confirm operator account list for `SUPER_ADMIN`, `COMPANY_ADMIN`, `NURSERY_ADMIN`, and `TABLET_DEVICE`.
4. Implement a safe Custom Claims assignment process without committing service account private keys.
5. Verify `/admin/marketing/banners`, `/admin/marketing/videos`, `/company/products/preview`, and `/admin/home-editor` against live Firestore/Storage.
6. Keep `orders`, `payments`, `refunds`, `settlements`, and `payouts` writes blocked until PG Functions are deployed.

## 2026-05-25 Firebase products read next tasks

1. Cloudflare Pages deployment after push: verify `/products`, `/tablet/products`, and `/tablet/products/product-care-kit` show `Firebase products`.
2. Keep App Check enforcement OFF until Cloudflare domain and local dev read behavior are both confirmed.
3. If Firestore read fails on production, inspect browser console and Firestore rules before changing UI code.
4. Replace `<img>` storefront warnings with the final image strategy after Firebase Storage/product image policy is approved.
5. Do not enable orders/payments Firestore writes until PG server confirmation and amount recalculation are implemented.

## 2026-05-25 QA release gate next tasks

1. Cloudflare Pages 재배포 전 `npm.cmd run check:release`를 한 번 실행한다.
2. Functions dependency 설치 승인 후 functions build를 별도 검증한다.
3. GitHub Actions 또는 Cloudflare build step에 `npm run check:env`, `npm run check:no-secrets`, `node scripts/check-routes.mjs` 중 어디까지 넣을지 결정한다.
4. 실제 PG 키 입력 전 `check:no-secrets`를 반드시 재실행한다.
5. route smoke 목록이 늘어나면 `scripts/check-routes.mjs`의 `requiredRoutes`를 갱신한다.

## 2026-05-25 Functions server skeleton next tasks

1. `functions` dependency 설치 여부를 승인한 뒤 `npm.cmd --prefix functions install`과 `npm.cmd --prefix functions run build`를 실행한다.
2. PG사 문서 수령 후 `functions/src/payments/types.ts` 요청/응답을 provider 공식 필드와 대조한다.
3. Firestore write rules와 Functions IAM을 확정한 뒤 transaction 구현을 시작한다.
4. `paymentsReady`가 실제 `qr_payment_sessions`와 product snapshot을 읽도록 전환한다.
5. `paymentsConfirm`에서 real PG confirm 전 서버 금액 재계산, QR 재사용 차단, 재고 차감 테스트를 작성한다.
6. webhook idempotency collection 설계를 확정한다.
7. cancel/refund는 정산 보류와 운영 승인 flow 확정 전까지 계속 차단한다.

## 2026-05-25 PG/기업 미팅 직전 우선순위

1. PG사에서 받은 provider명, 테스트 MID, client key, secret key, webhook 검증 방식을 `PG_ENV_KEYS.md`와 대조한다.
2. Cloudflare Pages static export만으로는 PG secret confirm이 불가하므로 Firebase Functions, Cloud Run, Cloudflare Workers/Pages Functions 중 하나를 확정한다.
3. `POST /payments/ready`, `POST /payments/confirm`, `POST /payments/webhook`, `POST /payments/cancel` 서버 endpoint 설계를 확정한다.
4. `/q/SANHO701/checkout`에서 PG 준비 상태, mock 결제 상태, 서버 금액 재계산 안내가 보이는지 미팅 전 브라우저로 확인한다.
5. `/admin/payments`, `/admin/companies`, `/admin/marketing/banners`, `/company/products/new`, `/company/products/preview`, `/nursery/dashboard`를 기업 미팅 시연 후보로 확인한다.
6. 기업 입점 서류: 사업자등록증, 통장 사본, CS 연락처, 주소, 반품/파손/AS 책임 문구를 실제 양식으로 확정한다.
7. 조리원 A4 연동 전 `external_nursery_id`, `external_room_id`, `external_tablet_id` 실제 매핑 규칙을 확정한다.
8. Firebase products 외 Firestore write는 계속 차단하고, 서버 권한/Rules/Functions 승인 후에만 열어야 한다.
9. `<img>` lint warning 12건은 static export 이미지 전략 결정 후 `next/image` 또는 로컬 asset 전략으로 정리한다.
10. 실제 PG 연동 전 결제 실패/만료/중복결제/금액불일치/재고부족 테스트 케이스를 작성한다.

## 2026-05-25 Firebase products read 다음 작업

1. 실제 `.env.local`은 로컬에서만 생성하고 Git에 포함하지 않는다.
2. Firestore beta rules 적용 후 `products` read와 seed admin write를 검증한다.
3. 네트워크가 허용된 로컬/배포 환경에서 `/products`와 `/tablet/products`가 `Firebase products` badge를 표시하는지 확인한다.
4. `npm run seed:firestore:products`는 seed 계정과 rules 준비 후에만 실행한다.
5. Cloudflare Pages 환경 변수 입력은 별도 승인 후 진행한다.
6. Storage/PG/환불/정산/알림톡/배송조회/외부 재고 API는 계속 차단한다.

## 2026-05-22 storefront/admin UX 다음 작업

1. `@next/next/no-img-element` lint 경고 11건을 정리할지 결정한다. 정리한다면 static export 정책에 맞춰 `next/image` 또는 로컬/원격 이미지 정책을 먼저 확정한다.
2. 고객 폐쇄몰 홈에 실사 이미지 자산을 계속 쓸지, `public` 로컬 mock 이미지로 복제할지 결정한다.
3. `/tablet/products`, `/products`, `/tablet/products/product-care-kit`, `/tablet/cart`, `/q/SANHO701`, `/q/SANHO701/status`, `/orders/guest/A5-20260519-001/refund`를 모바일/태블릿 폭에서 다시 육안 확인한다.
4. 관리자 콘텐츠 운영 신규 route(`/admin/marketing/banners`, `/admin/marketing/videos`, `/admin/home-editor`, `/admin/exhibitions`)를 기존 최고관리자 메뉴 정보구조와 병합한다.
5. 기업 콘텐츠 신규 route(`/company/products/preview`, `/company/ads/banners`, `/company/ads/videos`, `/company/brand`, `/company/exhibitions`)를 기존 기업 Admin 상품/주문/정산 흐름과 연결한다.
6. Firebase Storage가 보류된 상태이므로 배너/상품/영상 업로드는 계속 placeholder와 mock 상태로 유지한다.
7. QR 결제 성공/실패/만료/상태 route를 실제 PG 연결 전 서버 재계산/상품 snapshot/재고 차감 설계와 대조한다.
8. 병렬 worktree 결과를 main에 합칠 때 신규 `components/storefront`, `components/marketing`, `data/mockShopContent.ts` 충돌 여부를 먼저 확인한다.

## 2026-05-22 Cloudflare Pages 배포 다음 작업

1. Cloudflare Pages 설정에서 Build output directory가 `out`인지 확인한다.
2. Cloudflare Pages build command를 `npm run build` 또는 `npx next build`로 맞춘다.
3. Cloudflare 재배포 후 `/`, `/products`, `/tablet/products`, `/tablet/cart`, `/tablet/qr`, `/q/SANHO701`, `/orders/guest/A5-20260519-001`, `/mock-ui/status`를 smoke 확인한다.
4. static export 제약 때문에 서버 런타임 기능, 실제 Firebase SDK, 실제 PG/API 호출이 포함되지 않았는지 유지 점검한다.
5. Firebase 실제 연결 단계 전까지 mock/test beta UI와 repository stub 구조를 유지한다.

작성일: 2026-05-20

## 1. 현재 진행 작업

- mock/test 베타 생성
- 실제 Firebase/PG/Secret/운영 배포 제외
- App Router 기반 화면과 mock adapter 우선
- Firebase Console 상태 문서 반영: Web App 등록, Firestore Database 생성, Auth 이메일/비밀번호 활성화 완료
- Firestore Rules는 프로덕션 모드 잠금 상태이며 실제 연결 전 권한 설계 필요
- Storage는 Spark 요금제 제약으로 보류하며 상품 이미지/GIF는 mock placeholder 유지
- 고객은 비회원 QR 흐름 유지, 고객 로그인은 아직 만들지 않음
- Firebase 실제 연결 전 전환 설계 보강: mock 데이터와 Firestore/Auth/Functions 계획 매핑
- 태블릿/QR/비회원 주문조회 화면 데이터 접근은 `mockRepositories` 기반으로 전환 및 재검증 완료

## 2. 다음 작업 후보

| 우선순위 | 작업 | 등급 | 상태 |
| --- | --- | --- | --- |
| 1 | 공통 타입/상태/역할 정의 | A | 완료 |
| 2 | mock 데이터 원장 생성 | A | 완료 |
| 3 | mock API 집계 함수 생성 | A | 완료 |
| 4 | 공통 UI 컴포넌트 생성 | A | 완료 |
| 5 | 최고관리자 mock UI | A | 완료 |
| 6 | 기업 Admin mock UI | A | 완료 |
| 7 | 산후조리원 Admin mock UI | A | 완료 |
| 8 | 태블릿 폐쇄몰 mock UI | A | 완료 |
| 9 | 고객 QR/비회원 주문조회 mock UI | A | 완료 |
| 10 | PG/알림/배송/재고 mock adapter | B | 완료 |

## 4. 다음 실행 순서

| 우선순위 | 작업 | 등급 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | Firestore Rules 권한 매트릭스 초안 작성 | B | `company_id`, `nursery_id`, `tablet_id`, guest token 범위가 컬렉션별로 정리됨 |
| 2 | QR 세션 서버 테스트 시나리오 작성 | B | 생성/만료/paid 재사용 차단/금액 불일치/동시 결제 케이스 정리 |
| 3 | mock seed to Firestore migration plan 작성 | B | `data/mockProducts.ts`, `mockQrSessions.ts`, `mockOrders.ts`를 seed 문서로 변환하는 절차 정리 |
| 4 | Auth dev 계정/claims 승인표 작성 | B | 관리자/기업/조리원 계정 목록과 claims 부여 승인 절차 정리 |
| 5 | Firebase Web App config 보관 방식 결정 | C | 코드 삽입 없이 config 관리 방식과 승인 절차만 문서화 |
| 6 | Storage 보류 정책 유지 | C | Blaze 업그레이드 전까지 mock placeholder 유지, 입점사 상품등록 전 별도 승인 |
| 7 | PG/알림톡/배송조회/외부 재고 API 문서 확보 | C | 공식 문서, 테스트키, 템플릿, 계약 정보 확보 전 실제 연결 금지 |

## 5. 후속 개발 후보

| 우선순위 | 작업 | 등급 | 메모 |
| --- | --- | --- | --- |
| 1 | Repository contract test 초안 | A | 화면이 사용하는 product/QR/order mock repository 결과를 외부 패키지 없이 검증 |
| 2 | service boundary 초안 | B | QR 생성, checkout, guest order lookup use case를 repository 위 계층으로 분리 |
| 3 | 남은 관리자/기업/조리원 화면 repository 전환 후보 검토 | A | 고객/태블릿 화면과 같은 방식으로 직접 `mockApi` 의존을 줄일지 판단 |
| 4 | Firestore Rules 권한 매트릭스 초안 작성 | B | `company_id`, `nursery_id`, `tablet_id`, guest token 범위가 컬렉션별로 정리됨 |
| 5 | Firebase adapter 실제 구현 승인 판단 | C | config 보관 방식, SDK 설치, Rules 승인 전까지 stub 유지 |
| 6 | Browser smoke test 확대 | A | 주요 라우트 desktop/mobile 확인 |
| 7 | 고객 폐쇄몰 UI 전문가용 고도화 | A | mock repository만 사용, 실제 Firebase/PG 연결 없이 상품 목록/상세/장바구니/QR 퍼널 개선 |
| 8 | PG/알림톡/배송조회/외부 재고 API 문서 확보 | C | 공식 문서, 테스트키, 템플릿, 계약 정보 확보 전 실제 연결 금지 |

## 3. 이후 사람 확인 필요

- 실제 프로젝트 루트 경로 표기 통일
- Firebase Web App config 보관 방식 결정
- Firestore Rules 권한 설계 승인
- Auth 이메일/비밀번호 계정 생성 범위와 Custom Claims 정책 승인
- Storage Blaze 요금제 전환 여부는 입점사 상품 등록 전 별도 승인
- PG 계약사/테스트 MID/공식 문서
- 카카오 알림톡 발송사/템플릿 승인
- 배송조회 API 또는 URL 방식 결정
- 외부 재고 API 공식 규격서
- 정산 수수료/차감/지급 정책
- 비회원 주문조회 인증 정책
- Firebase Repository stub을 실제 adapter로 전환할 승인 시점
- Repository service 계층에서 QR/결제/재고 transaction을 어디까지 mock으로 검증할지 결정
- 관리자/기업/조리원 화면까지 repository 계층으로 옮길지 여부

## 2026-05-25 PG module handoff next tasks

1. PG사에서 provider name, sandbox MID, client key, channel key, secret key, webhook secret, official browser SDK/script URL, confirm/cancel/webhook docs를 수령한다.
2. Cloudflare Pages에는 `NEXT_PUBLIC_PG_*`와 `NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL`만 입력한다.
3. Firebase Functions Secret Manager에는 `PG_SECRET_KEY`, `PG_WEBHOOK_SECRET`, `PG_MERCHANT_ID`, `PG_CHANNEL_KEY`, `PG_API_BASE_URL`을 입력한다.
4. PG SDK가 script 방식이면 `window.A5PgProvider.requestPayment(payload)` wrapper를 추가하고, npm SDK 방식이면 provider-specific adapter 파일을 별도로 만든다.
5. `functions/src/payments/confirm.ts`에서 mock approval을 provider confirm call로 교체하되, 서버 금액 재계산과 QR 재사용 차단은 그대로 유지한다.
6. `functions/src/payments/webhook.ts`에 공식 서명 검증 알고리즘과 idempotency collection을 연결한다.
7. Firebase Functions는 Node 20 runtime 기준으로 빌드/배포하고, 로컬 Node v24 `EBADENGINE` 경고는 운영 배포 전 정리한다.
8. `npm audit`의 Functions dependency 9 moderate findings를 production deploy 전에 검토한다.
9. PG sandbox에서 success/fail/cancel/duplicate webhook/amount mismatch/expired QR 테스트를 실행한다.
10. 환불/정산/입금 자동화는 PG 결제 성공 후에도 별도 승인 전까지 계속 차단한다.

## 2026-05-25 Firebase live commerce next tasks

1. In Cloudflare production, verify `/products`, `/tablet/products`, `/q/SANHO701`, `/q/SANHO701/checkout`, and `/orders/guest/A5-20260519-001` show Firestore live data.
2. Keep using Firestore live commerce only for beta/demo paths until PG confirm and webhook are deployed behind Firebase Functions.
3. When PG keys arrive, enter public keys in Cloudflare Pages and server secrets in Firebase Secret Manager only.
4. Replace the mock provider in `functions/src/payments/confirm.ts` with the selected PG confirm call after server amount recalculation is preserved.
5. Implement webhook signature verification and duplicate event protection before any real payment capture.
6. Connect admin/company/nursery dashboards to Firestore aggregate reads after the customer payment path is stable.
7. Keep refunds, settlements, payouts, Alimtalk, delivery tracking, and external inventory APIs blocked until official documents and keys are approved.

## 2026-05-25 after Functions deployment next tasks

1. Enter PG public browser keys into Cloudflare Pages only after the PG company issues the sandbox keys.
2. Enter `PG_SECRET_KEY`, `PG_WEBHOOK_SECRET`, merchant id, channel key, and API base URL into Firebase Secret Manager only.
3. Replace the mock approval branch in `functions/src/payments/confirm.ts` with the selected PG provider confirm call.
4. Replace webhook skeleton verification in `functions/src/payments/webhook.ts` with the official signature algorithm.
5. Run sandbox success/fail/expired QR/amount mismatch/duplicate webhook tests.
6. Convert admin/company/nursery aggregate summaries from mixed mock views to Firestore read-model views.
7. Keep production refund, settlement, payout, Alimtalk, delivery tracking, and external inventory blocked until policy and keys are approved.

## 2026-05-25 A3 tablet transparent canvas next tasks

1. In A3, open the A5 tablet shopping tab and verify `/tablet/products`, `/tablet/cart`, and `/tablet/qr` show the A3 glassmorphism background behind the webview.
2. Check that translucent A5 panels still keep product names, prices, QR codes, and cart totals readable over bright and dark A3 backgrounds.
3. If A3 uses a very busy background, add a configurable tablet panel opacity token instead of restoring a hard page background.
4. Keep customer mobile QR pages separate from this tablet transparency rule unless A3 also embeds those routes.

## 2026-05-25 Sidebar navigation next tasks

1. Browser smoke check `/admin/dashboard` to `/admin/marketing/banners` and verify the left menu title, width, item order, and active state do not shift.
2. Browser smoke check `/company/dashboard` to `/company/ads/banners` and verify the same 기업 Admin menu remains visible.
3. Keep all future admin/company/nursery sidebar additions inside `components/layout/navigation.ts` only.
4. Add route-link validation to CI after the route list stabilizes.

## 2026-05-25 Korean menu label next tasks

1. After deployment, visually confirm `/admin/dashboard`, `/admin/marketing/banners`, `/company/dashboard`, and `/nursery/dashboard` show Korean-only sidebar menu labels.
2. Keep future sidebar badges Korean-only unless the term is a fixed product or technical identifier.
3. If page body copy is also required to be fully Korean, handle that as a separate content cleanup pass.
## 2026-05-25 PG-ready next tasks after backend beta gate

1. Receive PG provider official sandbox docs, client key, MID/channel key, server secret, webhook secret, success/fail URL rules, and cancel/refund docs.
2. Put browser-safe `NEXT_PUBLIC_PG_*` values into Cloudflare Pages only.
3. Put `PG_SECRET_KEY`, `PG_WEBHOOK_SECRET`, merchant id, and channel key into Firebase Functions runtime/Secret Manager only.
4. Replace `functions/src/payments/providerAdapter.ts` skeleton with the selected Toss/PortOne/KCP/NICE adapter after official docs are reviewed.
5. Keep `paymentsConfirm` server amount recalculation and Firestore transaction writes unchanged while swapping mock approval for provider confirm.
6. Implement webhook signature verification and duplicate event guard before any real payment state transition.
7. Deploy Firestore rules only after owner confirmation with `firebase.cmd deploy --only firestore:rules`.
8. Visually smoke `/admin/permissions`, `/company/onboarding`, `/company/products/new`, `/q/SANHO701/checkout`, and `/orders/guest/A5-20260519-001`.
9. Convert remaining admin/company/nursery aggregate widgets from mock summaries to Firestore read models.
10. Keep refund, settlement payout, Alimtalk, delivery tracking, and external inventory APIs blocked until policies and official keys are approved.
## 2026-05-26 Next release tasks

1. Check Cloudflare Pages deployment triggered by the release-gate push.
2. Visually smoke `/products`, `/tablet/products`, `/q/SANHO701/checkout`, `/admin/permissions`, and `/company/onboarding`.
3. Resolve remaining `<img>` warnings after final Storage/image policy is approved.
4. Keep real PG confirm/cancel/refund/settlement blocked until official PG docs and keys are received.
5. Keep Firebase deploy commands manual and owner-approved only.
## 2026-05-26 Firebase products Cloudflare smoke

1. After Cloudflare deployment finishes, open `/products` and verify the badge reads `Firebase products`.
2. Open `/tablet/products` and verify the product cards show product id/status/source/seeded_at.
3. Open `/tablet/products/product-care-kit`, `/tablet/products/product-robe`, `/tablet/products/product-bag`, and `/tablet/products/product-tea`.
4. Confirm developer diagnostics show `NEXT_PUBLIC_DATA_SOURCE: firebase`.
5. If Cloudflare shows `mock fallback`, check `NEXT_PUBLIC_DATA_SOURCE` and all `NEXT_PUBLIC_FIREBASE_*` environment variables.

## 2026-05-26 Firestore foundation seed next tasks

1. Run `npm run seed:firestore:foundation:dry-run` before every foundation seed change.
2. When the seed account is ready, run `npm run seed:firestore:foundation` with `FIREBASE_SEED_EMAIL` and `FIREBASE_SEED_PASSWORD` provided only through the shell or local untracked `.env.local`.
3. Verify Firestore Console contains `companies`, `nurseries`, `rooms`, `tablets`, `product_options`, `qr_payment_sessions`, `marketing_banners`, `marketing_videos`, `home_sections`, `tablet_home_configs`, `media_assets`, and `audit_logs`.
4. Confirm each seeded document has `status`, `created_at`, `updated_at`, and the expected scope fields.
5. Replace beta `guest_write_enabled` seed compatibility with Custom Claims/Functions write paths before production.
6. Connect admin/company/nursery read-model pages to the seeded foundation collections.
7. Keep real PG confirm/cancel/refund/settlement, Alimtalk, delivery tracking, and external inventory API blocked until official keys and policies are approved.

## 2026-05-26 Repository integration next tasks

1. Convert admin/company/nursery dashboard aggregate widgets from `mockApi` helper summaries to repository-backed Firestore read models.
2. Add repository smoke checks for `companies`, `nurseries`, `rooms`, `tablets`, `product_options`, `qr_payment_sessions`, and CMS content slots.
3. Decide whether CMS `home_sections` should compose full storefront content from Firestore instead of using mock content fallback.
4. Add source badges to admin/company/nursery pages once their foundation collection reads are wired into the visible tables.
5. Keep mock fallback in place for demo safety until Firestore rules, indexes, and Custom Claims are verified on all role scopes.
6. Keep real PG confirm/cancel/refund/settlement, Alimtalk, delivery tracking, and external inventory API blocked until official keys/docs are approved.

## 2026-05-26 Auth/RBAC next tasks

1. Create a manual seed/SUPER_ADMIN account in Firebase Auth and set the initial claim from a trusted operator path only.
2. Add audit log writes around every Custom Claims change before production role assignment.
3. Wire `/admin/permissions` to a server-only callable/onRequest endpoint after owner approval.
4. Add Firestore Rules tests for company_id, nursery_id, room_id, and tablet_id scope mismatches.
5. Keep CUSTOMER_GUEST outside Firebase Auth; validate QR/session/order lookup through server logic.
6. Keep bulk user creation, plain password issuance, and Admin private key files blocked.

## 2026-05-26 Payment transaction backend next tasks

1. Deploy Functions only after owner approval and confirm the exported endpoints are reachable.
2. Add Hosting/Cloudflare rewrite mapping if literal `/payments/ready` style paths are required instead of function export names.
3. Insert the selected PG provider logic only inside `functions/src/payments/providerAdapter.ts` after official sandbox docs and keys are received.
4. Put `PG_SECRET_KEY` and `PG_WEBHOOK_SECRET` in Firebase Secret Manager/runtime only.
5. Implement the official webhook signature verification and duplicate event transition guard.
6. Run sandbox tests for success, fail, expired QR, duplicate confirm, amount mismatch, out-of-stock, cancel request, reserve, and release.
7. Keep real refund, settlement payout, Alimtalk, delivery tracking, and external inventory API blocked.

## 2026-05-26 PG adapter next tasks

1. Receive the PG company official sandbox document and identify whether the provider is Toss, PortOne, KCP, or NICE.
2. Enter browser-safe values into Cloudflare Pages: `NEXT_PUBLIC_PG_PROVIDER`, `NEXT_PUBLIC_PG_CLIENT_KEY`, `NEXT_PUBLIC_PAYMENT_SUCCESS_URL`, `NEXT_PUBLIC_PAYMENT_FAIL_URL`, `NEXT_PUBLIC_PAYMENT_API_BASE_URL`.
3. Enter server-only values into Firebase Functions runtime/Secret Manager: `PG_SECRET_KEY`, `PG_MERCHANT_ID`, `PG_CHANNEL_KEY`, `PG_WEBHOOK_SECRET`, `PAYMENT_WEBHOOK_URL`.
4. Replace only the selected branch internals in `functions/src/payments/providerAdapter.ts`.
5. Keep `paymentsConfirm` amount recalculation and Firestore transaction unchanged while swapping mock approval for real provider confirm.
6. Add the official webhook signature verification before any webhook status transition.

## 2026-05-26 Checkout server flow next tasks

1. Deploy or confirm deployed Firebase Functions endpoints for `paymentsReady`, `paymentsConfirm`, and `paymentsStatus` before live browser smoke.
2. Set `NEXT_PUBLIC_PAYMENT_API_BASE_URL` in Cloudflare Pages to the Functions base URL only after endpoint reachability is confirmed.
3. Run browser smoke for `/q/SANHO701/checkout`, server ready, mock confirm, success status lookup, failed state, expired state, and amount mismatch.
4. Refresh or reseed `qr_payment_sessions` expiration dates before demo because old seeded QR sessions can be server-blocked as expired.
5. After PG docs/keys arrive, fill the selected PG provider branch without changing the server amount recalculation and transaction write path.
6. Keep real refund, settlement payout, Alimtalk, delivery tracking, and external inventory APIs blocked.

## 2026-05-26 Compliance next tasks

1. Visually smoke `/company/onboarding`, `/company/products/new`, `/company/products/preview`, and `/admin/products`.
2. Replace mock legal notice values with Firestore-backed company/product compliance documents after write rules and Custom Claims are finalized.
3. Add admin review actions for approve/reject/request-fix with audit logs.
4. Add category-specific legal notice templates for food, health functional food, cosmetics, medical device, electric/living goods, and children products.
5. Verify KC number validity flow with official product-safety lookup policy before production.
6. Keep legal final judgment, real uploads, refunds, settlements, Alimtalk, delivery tracking, and external inventory integrations blocked.
