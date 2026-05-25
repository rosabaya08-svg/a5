# Next Tasks

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
