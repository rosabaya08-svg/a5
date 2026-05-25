# Auto Report

## 28. 2026-05-25 A5 Firebase feature alignment

| Item | Result |
| --- | --- |
| Scope | Converted connected A5 CMS/file features from mock-only wording/paths to Firebase live beta wiring |
| Storage scope | CMS uploads now write to A5 Storage paths with company/product or storefront context |
| Firestore scope | CMS payloads include `company_id`, `nursery_id`, `room_id`, and `tablet_id` defaults where applicable so rules can authorize scoped writes |
| Feature map | Added `A5_FIREBASE_IMPLEMENTED_FEATURES.md` mapping previous mock areas to implemented Firebase beta areas |
| Validation | `npm.cmd run lint` passed with 0 errors and 12 image warnings; `npm.cmd run build` passed with 93 static routes |
| Still blocked | Custom Claims, seed credentials, PG/settlement/refund/Alimtalk/delivery/external inventory, trusted Admin SDK flows |

## 27. 2026-05-25 Firebase automatic integration boundary batch

| Item | Result |
| --- | --- |
| Scope | Clarified auto-connectable Firebase scope and implemented all safe code-side integration in this batch |
| Client SDK | Added Firebase Storage client export next to app/auth/firestore |
| CMS Firestore | CMS collection names now align with A5 rules: `marketing_banners`, `marketing_videos`, `product_detail_pages`, `home_sections`, `tablet_home_configs`, `media_assets` |
| Storage upload | `uploadCmsFile` now uploads image/video files to Firebase Storage and returns download URL/path |
| Rules | `firestore.rules` expanded with `media_assets` and seed-admin write support for foundation collections |
| Seed | Added `scripts/seed-firestore-foundation.mjs` and `seed:firestore:foundation` package script |
| Docs | Added `FIREBASE_AUTOMATION_SCOPE.md` and `FIREBASE_INTEGRATION_BLOCKERS.md` |
| Validation | `npm.cmd run lint` passed with 0 errors and 12 existing image warnings; `npm.cmd run build` passed with 93 static routes |
| Deploy | Updated Firestore rules deployed; Storage rules compile/deploy confirmed |
| Seed run | `npm.cmd run seed:firestore:foundation` blocked because local seed email/password env values are missing |
| Still blocked | Custom claims, seed credentials/claim, real secrets, PG production approval, Functions production deploy, A4 credentials, real order/payment writes |

## 26. 2026-05-25 Firebase products storefront read push batch

| Item | Result |
| --- | --- |
| Scope | `/products`, `/tablet/products`, `/tablet/products/[id]` Firebase products read verification and display hardening |
| Firestore read | Network-enabled build confirmed the 4 active seeded products from Firestore by generating `/tablet/products/product-bag`, `/tablet/products/product-care-kit`, `/tablet/products/product-robe`, `/tablet/products/product-tea` |
| Fallback | Sandbox build still falls back safely on Firestore `EACCES/UNAVAILABLE` |
| UI | Storefront shell, product cards, and product detail show `Firebase products` or `mock fallback` plus product id, status, source, and seeded_at/dev seed fields |
| Lint | `npm.cmd run lint` passed with 0 errors and 12 existing `<img>` warnings |
| Build | `npm.cmd run build` passed; network-enabled run generated 93 static routes |
| Security | `.env.local` was not printed or staged; no service account/private key/reCAPTCHA secret/PG secret was created |

## 25. 2026-05-25 QA release gate scripts

| 항목 | 결과 |
| --- | --- |
| 신규 스크립트 | `scripts/check-env.mjs`, `scripts/check-no-secrets.mjs`, `scripts/check-routes.mjs` |
| 신규 문서 | `QA_RELEASE_GATE.md`, `CLOUD_DEPLOY_CHECKLIST.md` |
| package scripts | `check:env`, `check:no-secrets`, `check:release` 추가 |
| env check | `npm.cmd run check:env` 성공. `NEXT_PUBLIC_FIREBASE_*` 키 존재 확인, secret 값 출력 없음 |
| no-secret check | `npm.cmd run check:no-secrets` 성공. `.env.local`은 로컬 존재, git index 미추적, `serviceAccountKey.json` 없음 |
| route check | `node scripts/check-routes.mjs` 성공. 69개 page route 발견, 필수 smoke route 모두 존재 |
| build | `npm.cmd run build` 성공, static routes 96개 생성 |
| build 메모 | 실행 환경의 Firestore backend 접근은 `EACCES`/`UNAVAILABLE`, 기존 mock fallback 유지 |
| 금지 준수 | git 명령, secret 출력, deploy, 실제 PG/Firebase write 실행 없음 |

## 24. 2026-05-25 Firebase Functions v2 payment server skeleton

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | Functions v2 기반 payments ready/confirm/webhook/cancel mock-only 서버 계층 초안 생성 |
| 신규 파일 | `functions/package.json`, `functions/tsconfig.json`, `functions/.env.example`, `functions/src/**`, `FIREBASE_FUNCTIONS_PLAN.md` |
| export 함수 | `paymentsReady`, `paymentsConfirm`, `paymentsWebhook`, `paymentsCancel` |
| PG 상태 | 실제 PG API 호출 없음, secret 읽기 없음, mock provider만 반환 |
| Firestore 상태 | 실제 write 없음. transaction plan, order snapshot, inventory reserve/release, audit log skeleton만 작성 |
| 안전 설정 | `firebase.json`, `.firebaserc`, rules 파일, service account, private key 생성 없음 |
| 루트 빌드 | `npm.cmd run build` 성공, static pages 96개 |
| build 메모 | 실행 환경 네트워크 제한으로 Firestore products read는 `EACCES`/`UNAVAILABLE` 후 mock fallback |
| functions 빌드 | `functions/node_modules` 없음. dependency 설치 승인 전이므로 미실행 및 blocker 기록 |

## 23. 2026-05-25 PG readiness and enterprise beta uplift

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | PG 연동 준비 계약 계층, 고객 checkout PG readiness UI, 관리자/기업/조리원 운영 UI 보강, Firebase write 차단 정리 |
| 신규 문서 | `SYSTEM_CAPABILITY_MAP.md`, `PAYMENT_CONNECT_PLAN.md`, `PG_ENV_KEYS.md`, `PAYMENT_FLOW_CHECKLIST.md`, `FIREBASE_CONNECT_PLAN.md` |
| 신규 코드 | `types/payment.ts`, `lib/payments/**`, `types/admin.ts`, `types/company.ts`, `types/nursery.ts`, `data/admin/**`, `data/company/**`, `data/nursery/**` |
| PG 상태 | 실제 SDK/API 호출 없음. provider interface, mock provider, PG skeleton, env key template, checkout 연결 지점 준비 |
| 고객 UI | `/products`, `/tablet/products`, `/q/SANHO701/checkout`에 쇼핑몰 섹션/영상 placeholder/PG 준비 상태 표시 보강 |
| 관리자 UI | 최고관리자에 배너/광고/홈 편집/기업 계정 초대/PG 준비 게이트 노출 |
| 기업 UI | 입점 서류, 통장 사본, CS/주소, 상품 법정 고지, 상세 미리보기 승인 흐름 보강 |
| 조리원 UI | 사업자등록증 기준 계정, 객실 선택, A4 external mapping mock 구조 보강 |
| Firebase write | `lib/firebase/liveShopRepository.ts`에서 carts/qr/orders/order_items write를 차단하고 local/mock 메시지만 반환 |
| lint | `npm.cmd run lint` 성공, 오류 0개, `<img>` 최적화 경고 12건 |
| build | `npm.cmd run build` 성공, static pages 96개 |
| build 메모 | 현재 실행 환경에서 Firestore backend 네트워크 접근이 `EACCES`/`UNAVAILABLE`로 실패했으나 products fallback으로 정적 생성 성공 |
| 금지 준수 | git add/commit/push, deploy, service account/private key, 실제 PG/환불/정산/알림톡/배송조회/외부 재고 API 실행 없음 |

## 22. 2026-05-25 Firebase products read verification

| 항목 | 결과 |
| --- | --- |
| Firebase SDK | `npm.cmd install firebase` 실행, 최신 상태 |
| 구현 상태 | `.env.local.example`, Firebase client/appCheck, products repository, seed script, package script 존재 확인 |
| products read | Firestore `products`의 `status == "active"` 우선 read, 실패/빈 결과 시 mock fallback 유지 |
| 대상 route | `/products`, `/tablet/products`, `/tablet/products/[id]` |
| build | `npm.cmd run build` 성공, static pages 96개 |
| Firestore 접속 | 현재 실행 환경 네트워크 제한으로 `EACCES`/`UNAVAILABLE` 로그 발생, fallback 대상 |
| env 상태 | `.env.local` 존재 확인, 내용 읽지 않음, Git status 미표시 |
| 금지 준수 | git/deploy/service account/private key/PG/환불/정산/알림톡/배송조회/외부 재고 API 실행 없음 |

## 21. 2026-05-22 storefront/admin UX coding batch

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | 고객 폐쇄몰 쇼핑 UI, QR/비회원 흐름, 관리자/기업 콘텐츠 운영 mock UI 고도화 |
| 쇼핑몰 UI | `components/storefront/TabletMallPages.tsx`, `components/storefront/GuestQrExperience.tsx`, `data/mockShopContent.ts` 추가 |
| 태블릿/고객 route | `/tablet/products`, `/tablet/products/product-care-kit`, `/tablet/cart`, `/tablet/qr`, `/q/SANHO701`, `/q/SANHO701/status`, `/orders/guest/A5-20260519-001/refund` 확인 |
| 관리자/기업 route | `/admin/marketing/banners`, `/admin/marketing/videos`, `/admin/brands`, `/admin/home-editor`, `/admin/exhibitions`, `/company/products/preview`, `/company/ads/banners`, `/company/ads/videos`, `/company/brand`, `/company/exhibitions` 추가 |
| 공통 UI | `DataTable`, `FilterBar`, `AppShell`, `TopBar`, `AdminSidebar`에 mock 상태/필터/정렬/테마 대응 보강 |
| 검증 | `npm.cmd run build` 성공, `npm.cmd run lint` 성공 |
| lint 메모 | `<img>` 사용에 대한 `@next/next/no-img-element` 경고 11건 존재, 오류는 없음 |
| 브라우저 smoke | 기존 dev server `localhost:3000`에서 주요 route 7개 404 없음 확인 |
| 실연동 상태 | Firebase/PG/Storage/알림톡/배송조회/외부 재고 API 실제 연결 없음, mock/test beta 유지 |
| 금지 준수 | `.env`, Secret, service account, Firebase config/rules, deploy, git add/commit/push 실행 없음 |

## 20. 2026-05-22 Cloudflare Pages static export 점검

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | Cloudflare Pages Static HTML Export 배포 실패 원인 점검 및 문서화 |
| 실패 원인 | Cloudflare가 `out` output directory를 기대했지만 정적 export 산출물 확인이 필요했던 상태 |
| `next.config.ts` | `output: "export"` 및 `images.unoptimized: true` 적용 상태 확인 |
| `/products` route | 이미 존재하며 `/tablet/products` 고객 상품 목록 mock/test beta UI를 재사용 |
| 추가 문서 | `reports/my-app/CLOUDFLARE_DEPLOY_PLAN.md` 작성 |
| build 검증 | `npm run build`는 PowerShell execution policy로 차단, `npm.cmd run build` 성공 |
| export 결과 | `out` 폴더 생성 확인, static page generation 72개 route 성공 |
| 금지사항 준수 | Firebase/PG/Storage/Secret/.env/deploy/git 명령 미실행 |

작성일: 2026-05-19
최종 정리일: 2026-05-20

## 1. 작업명

산후조리원 폐쇄몰 기반 기업입점형 QR 결제 쇼핑몰 mock/test 베타 생성

## 2. 현재 원칙

- 실제 Firebase 연결 없음
- `.env` 또는 Secret Key 생성 없음
- 실제 PG 연동 없음
- 실결제, 운영 환불, 정산 지급, 운영 배포 없음
- 외부 연동은 mock adapter까지만 생성

## 3. 읽은 기준 문서

- `AGENTS.md`
- `README.md`
- `a5-learning/A_PROJECT_WORK_ANALYSIS.md`
- `a5-learning/CODING_MATERIALS_GENERATION_PREP.md`
- `a5-learning/.codex_docx_text/codex_final_master_learning_directive_v1.txt`
- `a5-learning/.codex_docx_text/codex_nextjs_error_review_guardrails_v3.txt`
- `a5-learning/.codex_docx_text/codex_nextjs_harness_project_documentation_v2.txt`
- `a5-learning/.codex_docx_text/fast25_ai_automation_shoppingmall_plan_v1.txt`
- `a5-learning/.codex_docx_text/sanho_closed_mall_uiux_master_v1.txt`
- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

## 4. 진행 로그

| 단계 | 상태 | 요약 |
| --- | --- | --- |
| 1. 프로젝트 안전 문서 | 완료 | 정책/상태/보안/자동화 문서 생성, Google Fonts 외부 fetch 실패를 피하기 위해 시스템 폰트로 전환 |
| 2. 공통 타입/목업 데이터 | 완료 | commerce/roles/status 타입, mock 원장, mockApi 집계 함수 생성 |
| 3. 공통 UI 컴포넌트 | 완료 | AppShell, Sidebar, TopBar, table, status, filter, empty, risk, confirm 컴포넌트 생성 |
| 4. 최고관리자 UI | 완료 | `/admin` 및 dashboard/companies/nurseries/rooms/tablets/products/orders/payments/settlements/audit-logs 생성 |
| 5. 기업 Admin UI | 완료 | `/company` 및 dashboard/products/new/orders/inventory/deliveries/sales/payouts 생성 |
| 6. 산후조리원 Admin UI | 완료 | `/nursery` 및 dashboard/rooms/tablets/pickups/qr-history/orders 생성 |
| 7. 태블릿/고객 QR UI | 완료 | `/tablet`, `/tablet/products/[id]`, `/q/[code]`, `/orders/guest/[orderNo]` 등 mock 흐름 생성 |
| 8. mock adapter | 완료 | payment/notification/delivery/externalInventory mock adapter 생성. 실제 외부 호출 없음 |

## 5. 검증 로그

| 시각 | 명령 | 결과 | 메모 |
| --- | --- | --- | --- |
| 2026-05-19 | `npm.cmd run lint` | 성공 | ESLint 통과 |
| 2026-05-19 | `npm.cmd run build` | 실패 | `next/font/google`이 Google Fonts를 가져오지 못함 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 시스템 폰트 전환 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 타입/목업 데이터 추가 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | 타입/목업 데이터 추가 후 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 공통 UI 컴포넌트 추가 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | 공통 UI 컴포넌트 추가 후 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 최고관리자 UI 추가 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | 최고관리자 UI 11개 라우트 포함 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 기업 Admin UI 추가 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | 기업 Admin UI 포함 24개 정적 라우트 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 산후조리원 Admin UI 추가 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | 산후조리원 Admin UI 포함 31개 정적 라우트 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 태블릿/고객 QR UI 추가 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | SSG 동적 라우트 포함 57개 페이지 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | mock adapter 추가 후 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | mock adapter 추가 후 57개 페이지 빌드 성공 |
| 2026-05-19 | `npm.cmd run lint` | 성공 | 최종 검증 통과 |
| 2026-05-19 | `npm.cmd run build` | 성공 | 최종 검증 통과, 57개 페이지 생성 |
| 2026-05-19 | Browser smoke | 부분 실패 | Browser 런타임이 내부 자산 경로 오류로 시작 실패 |
| 2026-05-19 | HTTP smoke | 성공 | `/`, `/admin/dashboard`, `/tablet/products`, `/q/SANHO701`, `/orders/guest/A5-20260519-001` 모두 200 |

## 6. 자동 수정 횟수

- 1회: `app/layout.tsx`, `app/globals.css`에서 Google Fonts 의존 제거

## 7. 추가/수정 파일

- `types/status.ts`
- `types/roles.ts`
- `types/commerce.ts`
- `data/mockCompanies.ts`
- `data/mockNurseries.ts`
- `data/mockRooms.ts`
- `data/mockTablets.ts`
- `data/mockProducts.ts`
- `data/mockQrSessions.ts`
- `data/mockOrders.ts`
- `data/mockSettlements.ts`
- `lib/utils/format.ts`
- `lib/mock/mockApi.ts`
- `components/layout/AppShell.tsx`
- `components/layout/AdminSidebar.tsx`
- `components/layout/TopBar.tsx`
- `components/ui/StatCard.tsx`
- `components/ui/DataTable.tsx`
- `components/ui/StatusBadge.tsx`
- `components/ui/FilterBar.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/RiskAlert.tsx`
- `components/ui/ConfirmBox.tsx`

## 8. 커밋 로그

- `db3d8b7 docs: add project audit and safety policies`
- `84098f5 feat: add commerce mock data and shared types`
- `c94cd1f feat: add shared dashboard components`
- `c9122d9 feat: add admin mock UI pages`
- `1c3f67a feat: add company admin mock UI pages`
- `62b7f1e feat: add nursery admin mock UI pages`
- `1af65af feat: add tablet shopping mock UI pages`
- `390eb25 chore: add automation report and blockers`
- `c310152 docs: update automation report and next tasks`

## 9. 최종 상태 메모

- 개발 서버: `http://127.0.0.1:3000` 응답 확인: HTTP 200
- 마지막 확인 시 Git 상태: local commits ahead of `origin/main`, working tree clean
- git push는 수행하지 않음

## 10. 2026-05-20 최종 요약

| 항목 | 결과 |
| --- | --- |
| 생성된 페이지 수 | `app/**/page.tsx` 기준 40개, `next build` 생성 기준 57개 |
| 생성된 주요 폴더 | `app/admin`, `app/company`, `app/nursery`, `app/tablet`, `app/q`, `app/orders/guest`, `components`, `types`, `data`, `lib/mock`, `lib/utils`, `lib/adapters` |
| lint 결과 | `npm.cmd run lint` 성공 |
| build 결과 | `npm.cmd run build` 성공, 57개 페이지 생성 |
| HTTP smoke 확인 경로 | `/`, `/admin/dashboard`, `/company/dashboard`, `/nursery/dashboard`, `/tablet/products`, `/q/SANHO701`, `/orders/guest/A5-20260519-001` 모두 HTTP 200 |
| Firebase 상태 | 실제 Firebase 연결 없음, `firebase.json`, `.firebaserc`, rules, `.env` 생성 없음 |
| PG 상태 | 실제 PG 연동 없음, `paymentMock.ts`만 존재 |
| 알림톡 상태 | 실제 알림톡 연동 없음, `notificationMock.ts`만 존재 |
| 배송조회 상태 | 실제 배송조회 API 연동 없음, `deliveryMock.ts`만 존재 |
| 외부 재고 API 상태 | 실제 외부 API 호출 없음, `externalInventoryMock.ts`만 존재 |

## 11. 남은 BLOCKERS

- 실제 프로젝트 루트 경로 표기 불일치 확인 필요
- Firebase 기존/신규 프로젝트 판단 및 dev/staging/prod 분리 정책 필요
- PG 계약사, 공식 문서, 테스트 MID, 운영 MID 확인 필요
- 카카오 알림톡 발송사와 템플릿 승인 상태 확인 필요
- 배송조회 API 또는 택배사 URL 방식 결정 필요
- 외부 명품쇼핑몰 재고 API 공식 규격서/테스트 계정 필요
- 정산 수수료율, 환불 차감, 지급일, 세무/증빙 정책 확정 필요
- 비회원 주문조회 인증 정책과 개인정보 노출 범위 확정 필요
- mock adapter의 production 전환은 공식 문서, 키, 계약, 사람 승인 전까지 계속 차단

## 12. 2026-05-20 고객 폐쇄몰 UI 고도화

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | 태블릿 상품 목록/상세/장바구니/QR, 고객 QR 랜딩/checkout, 비회원 주문조회/상세 UI 개선 |
| 기준 | 업로드 문서 9개, 기존 점검 보고서, 참고 URL `https://mommy-a5.pages.dev/`의 핫딜형 쇼핑몰 방향 |
| 상품 카드 | 상품명, 정상가, 플랫폼 최저가, 폐쇄몰가, 할인율, 수령 가능 여부, 재고 상태 표시 |
| 폐쇄몰 정보 | 조리원/객실, QR 세션 코드, 만료 안내, mock 전용 상태를 상단 배너에 표시 |
| 가격비교/AI분석 | 실제 AI가 아니라 정상가/플랫폼 최저가/폐쇄몰가 비교 레이어로 표시 |
| 장바구니 | 옵션, 수량, 수령방식, 상품 수, 합계금액, 구매 QR/조르기 QR 버튼 표시 |
| QR 랜딩 | 모바일 결제 진입 화면처럼 주문 요약, 출처, 만료, mock 결제 버튼 표시 |
| 비회원 주문조회 | 주문번호/휴대폰번호 mock 입력 UI와 주문 상세 mock 결과 표시 |
| mock 데이터 | 승인 상품 2개 추가, QR 세션/주문 합계와 order_items 보강 |

## 13. 2026-05-20 검증

| 명령/경로 | 결과 |
| --- | --- |
| `npm.cmd run lint` | 성공 |
| `npm.cmd run build` | 성공, 59개 페이지 생성 |
| `/tablet/products` | HTTP 200 |
| `/tablet/cart` | HTTP 200 |
| `/tablet/qr` | HTTP 200 |
| `/q/SANHO701` | HTTP 200 |
| `/q/SANHO701/checkout` | HTTP 200 |
| `/orders/guest/A5-20260519-001` | HTTP 200 |

## 14. 2026-05-20 미연동 상태

- 실제 Firebase 연결 없음
- 실제 PG 결제 없음
- 실제 알림톡 발송 없음
- 실제 배송조회 API 호출 없음
- 실제 외부 재고 API 호출 없음
- `.env`, Secret Key, service account, private key 생성 없음
- 운영 배포 없음

## 15. 2026-05-20 Firebase Console 상태 업데이트

| 항목 | 현재 상태 |
| --- | --- |
| Firebase 프로젝트 | `a5-closed-mall` 사용 |
| Web App | 등록 완료, config는 코드나 `.env`에 미삽입 |
| Firestore Database | 생성 완료, Rules는 프로덕션 모드 잠금 상태 유지 |
| Authentication | 이메일/비밀번호 활성화 완료, 관리자/기업/조리원 계정용으로만 계획 |
| 고객 로그인 | 고객은 비회원 QR 흐름 유지, 고객 Auth는 아직 만들지 않음 |
| Storage | Spark 요금제 사용 불가 안내로 보류, Blaze 업그레이드 지시 없음 |
| 상품 이미지/GIF | 실제 Storage가 아니라 mock placeholder 유지 |
| 실제 Storage 연동 | 입점사 상품 등록 기능 구현 전 별도 승인 필요 |

업데이트한 문서는 `FIREBASE_BLOCKERS.md`, `STORAGE_RULES_PLAN.md`, `FIREBASE_ARCHITECTURE_PLAN.md`, `NEXT_TASKS.md`, `AUTO_REPORT.md`이다. 이번 정리에서 Firebase config 코드, Firebase SDK 설치, `.env`, Secret Key, service account, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, deploy 작업은 수행하지 않았다.

## 16. 2026-05-20 Firebase 전환 설계 보강

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | 실제 Firebase 연결 전 문서 설계 보강 |
| 비교 기준 | `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts`, `types/commerce.ts` |
| Firestore schema | mock 데이터와 Firestore 컬렉션 변환표, 문서 ID 전략, snapshot 필드, 인덱스 후보, 구현 직전 체크리스트 보강 |
| Auth claims | 이메일/비밀번호 계정은 관리자/기업/조리원용으로 한정, `role`, `company_id`, `nursery_id`, `room_id`, `tablet_id` 권한 구조 보강 |
| Functions server logic | QR 생성/만료, 주문금액 서버 재계산, 상품 snapshot, 재고 차감/복구, 결제 mock에서 실연동 전환 단계를 정리 |
| Blockers | Storage Blaze 필요 여부, PG 문서/키, 알림톡 템플릿, 배송조회 API, 외부 재고 API 차단 항목 유지/보강 |
| 코드 변경 | 없음. 문서만 수정 |
| 검증 | 코드 파일을 수정하지 않아 `npm run lint`, `npm run build`는 이번 단계 필수 아님 |
| 금지사항 준수 | Firebase config, `.env`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, Firebase SDK 설치, 실제 Firestore/Auth/PG/알림톡/배송조회/외부 재고 연결, deploy 모두 수행하지 않음 |

수정 파일 목록: `FIRESTORE_SCHEMA_PLAN.md`, `AUTH_CLAIMS_PLAN.md`, `FUNCTIONS_SERVER_LOGIC_PLAN.md`, `FIREBASE_BLOCKERS.md`, `NEXT_TASKS.md`, `AUTO_REPORT.md`.

## 17. 2026-05-20 Repository interface 코드 초안

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | 실제 Firebase 연결 전 Repository interface와 mock/Firebase stub 계층 생성 |
| 기준 문서 | `REPOSITORY_INTERFACE_PLAN.md`, `ADAPTER_SPLIT_PLAN.md`, `FIREBASE_SEED_DATA_PLAN.md`, `FIRESTORE_SCHEMA_PLAN.md`, `AUTH_CLAIMS_PLAN.md`, `FUNCTIONS_SERVER_LOGIC_PLAN.md`, `FIREBASE_BLOCKERS.md` |
| 생성 파일 | `lib/repositories/types.ts`, `lib/repositories/mock/**`, `lib/repositories/firebase/**` |
| Repository interface | Product, QR Session, Order, Payment, Inventory, Audit Log interface 정의 |
| mock repository | `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts` 기반 read/mock mutation copy 구현 |
| Firebase repository | Firebase SDK import 없는 `NOT_IMPLEMENTED` stub skeleton만 생성 |
| 기존 화면 영향 | 기존 `mockApi` 사용 구조 유지. UI import 전환 없음 |
| lint 결과 | `npm.cmd run lint` 성공 |
| build 결과 | `npm.cmd run build` 성공, 59개 페이지 생성 |
| 금지사항 준수 | `npm install firebase`, Firebase SDK import, `.env`, `firebase.json`, `.firebaserc`, rules 파일, 실제 Firestore/Auth/PG/알림톡/배송조회/외부 재고 연결, deploy 수행하지 않음 |

남은 BLOCKERS: Firebase config 보관 방식, Firestore Rules, Auth claims 운영 절차, Storage Blaze, PG 공식 문서/키, 알림톡 템플릿, 배송조회 API, 외부 재고 API, 비회원 주문조회 인증 정책은 계속 사람 승인 필요.

## 18. 2026-05-20 화면 데이터 접근 mock repository 전환

| 항목 | 결과 |
| --- | --- |
| 작업 범위 | `app/tablet`, `app/q`, `app/orders/guest`, `components/pages/tabletPages.tsx`, `components/pages/guestPages.tsx` 데이터 접근 전환 |
| 전환 내용 | `mockApi` 기반 product/QR/order 조회를 `lib/repositories/mock/**` 호출로 변경 |
| 정적 경로 생성 | 상품 상세, QR 랜딩/checkout/success/failed, 비회원 주문상세 `generateStaticParams`를 mock repository 목록 조회로 변경 |
| 기존 UI 영향 | 화면 구조와 표시 문구 유지. 기존 `mockApi`는 다른 영역 호환을 위해 삭제하지 않음 |
| Firebase 상태 | `lib/repositories/firebase/**` stub은 사용하지 않음. 실제 Firebase 연결 없음 |
| lint 결과 | `npm.cmd run lint` 성공 |
| build 결과 | `npm.cmd run build` 성공, 59개 페이지 생성 |
| 금지사항 준수 | Firebase SDK import, `npm install firebase`, `.env`, `firebase.json`, `.firebaserc`, rules 파일, 실제 Firestore/Auth/PG/알림톡/배송조회/외부 재고 연결, deploy 수행하지 않음 |

이번 단계 후 고객/태블릿/비회원 주문조회 화면은 `mockRepositories`를 통해 mock 원장을 읽는다. 관리자/기업/조리원 화면은 아직 기존 mock API 기반 흐름이 남아 있으므로 별도 단계에서 전환 여부를 판단한다.

## 19. 2026-05-20 mock repository 전환 재검증

| 항목 | 결과 |
| --- | --- |
| 대상 범위 | `app/tablet`, `app/q`, `app/orders/guest`, `components/pages/tabletPages.tsx`, `components/pages/guestPages.tsx` |
| 직접 참조 확인 | 대상 범위에서 `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts`, `mockApi` 참조 없음 |
| 데이터 접근 | 대상 고객/태블릿 화면은 `mockRepositories` 기반 |
| Firebase import 확인 | `firebase/app`, `firebase/firestore`, `firebase/auth`, `initializeApp`, `getFirestore`, `getAuth` 참조 없음 |
| lint 결과 | `npm.cmd run lint` 성공 |
| build 결과 | `npm.cmd run build` 성공, 59개 페이지 생성 |
| 금지 파일 | `.env`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules` 생성 없음 |

참고: `components/pages/adminPages.tsx`, `companyPages.tsx`, `nurseryPages.tsx`에는 기존 `mockApi` 흐름이 남아 있으나, 이번 대상 후보 밖으로 분리했다.

## 20. 2026-05-25 Firebase products read verification

| Item | Result |
| --- | --- |
| Scope | `/products`, `/tablet/products`, `/tablet/products/[id]` Firebase products read display hardening |
| Repository | `firebaseProductRepository` still reads `products` where `status == "active"` first and uses mock fallback on error/empty/not-found |
| Developer display | Product cards/detail now show product id, raw status, source, and seeded_at/dev seed state |
| Screen source badges | `Firebase products` or `mock fallback` is visible in storefront shell and read diagnostic area |
| Local sandbox build | Passed, but sandbox network produced Firestore `EACCES/UNAVAILABLE`; fallback behavior remained safe |
| Network-enabled build | Passed and generated `/tablet/products/product-bag`, `/tablet/products/product-care-kit`, `/tablet/products/product-robe`, `/tablet/products/product-tea`, confirming active Firestore product read |
| Lint | `npm.cmd run lint` passed with 0 errors and 12 existing `<img>` warnings |
| Build | `npm.cmd run build` passed; network-enabled run generated 93 static routes |
| Secrets | `.env.local` values were not printed or committed; service account/private key/PG secret were not created |

## 21. 2026-05-25 PG module handoff readiness

| Item | Result |
| --- | --- |
| Scope | PG provider module/key insertion readiness for A5 closed mall checkout |
| Static export constraint | `next.config.ts` uses `output: "export"`, so real secret confirm is kept out of App Router route handlers |
| Storefront | `/q/[code]/checkout` now renders a PG module handoff panel with public key, Functions endpoint, browser module, and mock/real boundary status |
| Browser bridge | `lib/payments/pgCheckoutBridge.ts` defines `window.A5PgProvider.requestPayment(payload)` contract without importing a real PG SDK |
| Endpoint config | `lib/payments/paymentEndpoints.ts` maps `NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL` to `paymentsReady`, `paymentsConfirm`, `paymentsWebhook`, `paymentsCancel` |
| Functions server | `functions/src/payments/providerRuntime.ts` detects PG server key readiness without printing secrets |
| Docs | `PAYMENT_CONNECT_PLAN.md`, `PAYMENT_FLOW_CHECKLIST.md`, `PG_ENV_KEYS.md`, `PG_READY_HANDOFF.md`, `FIREBASE_FUNCTIONS_PLAN.md` updated |
| Env examples | `.env.local.example` and `functions/.env.example` now include public/server PG placeholders only |
| Root lint | `npm.cmd run lint` passed with 0 errors and 12 existing `<img>` warnings |
| Root build | `npm.cmd run build` passed and generated 93 static routes |
| Functions install | `npm.cmd --prefix functions install` completed; npm warned local Node v24 differs from declared Functions Node 20 and reported 9 moderate audit findings |
| Functions build | `npm.cmd --prefix functions run build` passed |
| Secret check | `npm.cmd run check:no-secrets` passed; `.env.local` exists locally but is not tracked, and no secret values were printed |
| Real PG | Still blocked. No approval/cancel/refund/settlement API call was added |

## 22. 2026-05-25 Firebase live commerce integration

| Item | Result |
| --- | --- |
| Scope | Converted the customer commerce path from mock-first to Firestore-first wherever it is safe before PG approval |
| Firestore read | Products, product options, QR payment sessions, guest orders, and order items now have Firebase repository implementations |
| Firestore write | Storefront cart, QR draft, order snapshot, payment event, inventory movement, and audit log repositories now have guarded Firebase implementations |
| UI data source | Customer QR and guest order screens show Firestore live data when Firebase read succeeds and mock fallback only when Firebase is unavailable |
| Rules | Firestore rules were updated and deployed for A5 closed mall guest/demo commerce paths without opening real PG/refund/settlement writes |
| Seed | Product options, QR sessions, guest orders, and order items were seeded to Firestore with no service account key |
| PG boundary | Checkout remains PG-module-ready but still uses mock approval until official PG keys/docs are received |
| Validation | `npm.cmd run lint`, root `npm.cmd run build`, functions build, and `npm.cmd run check:no-secrets` passed |
| Secrets | `.env.local` remains local-only and untracked; no service account, private key, PG secret, or reCAPTCHA secret was committed |
