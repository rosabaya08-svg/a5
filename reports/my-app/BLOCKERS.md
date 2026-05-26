# my-app BLOCKERS

## 2026-05-22 storefront/admin UX blockers

1. Firebase Storage는 Spark 제한으로 보류 상태다. 상품 이미지, GIF, 영상 업로드는 실제 연결하지 않고 원격 mock image 또는 placeholder UI로만 표시한다.
2. 실사 이미지 전략이 필요하다. 현재 쇼핑몰 느낌을 위해 `mommy-a5.pages.dev`의 공개 이미지 URL을 mock reference로 사용했으며, 운영 전에는 저작권/소유권/Storage/CDN 정책을 확정해야 한다.
3. `npm.cmd run lint`는 성공했지만 `<img>` 사용에 대한 `@next/next/no-img-element` 경고 11건이 남아 있다. static export와 이미지 최적화 정책을 확정한 뒤 정리한다.
4. 배너/영상/브랜드/기획전 관리 화면은 모두 mock UI다. 실제 업로드, 승인 알림, 게시 예약, 노출 통계, 클릭 추적은 구현하지 않았다.
5. QR checkout, refund request, settlement/payout 화면은 모두 mock UI다. 실제 PG, 환불, 정산, 입금 처리는 계속 차단 상태다.
6. 알림톡, 배송조회, 외부 재고 API는 공식 문서, 테스트 키, 템플릿, 계약 정보가 확보되기 전까지 연결 금지 상태를 유지한다.

## 현재 보류 항목

1. 세부 트랙명이 명시되지 않아 현재 폴더명을 기준으로 `my-app` 트랙으로 해석함.
2. 구체적인 생성 대상 파일, 허용 수정 범위, 작업 큐가 제공되지 않아 앱 코드 생성은 진행하지 않음.
3. 사용자 지시에 따라 `npm run lint`, `npm run build`, git 명령은 실행하지 않음.
4. 실제 Firebase 연결, Firestore/Auth 연결, PG/환불/정산/알림톡/배송조회/외부 재고 API 연결은 금지 상태를 유지함.

## 다음 진행 전 필요한 결정

- `my-app` 트랙을 공통 통합/문서 트랙으로 사용할지, 특정 기능 트랙으로 사용할지 결정 필요
- 병렬 worktree와 병합할 경우 `my-app`에서 수정해도 되는 파일 범위 결정 필요
- 검증 명령을 끝까지 금지할지, 최종 단계에서만 허용할지 결정 필요

## 추가 진행 중 유지된 차단 사항

1. `DAY 1~DAY 5`의 세부 작업 큐가 현재 `my-app` 트랙에 직접 제공되지 않음.
2. 공용 보고서 수정 금지 지시가 있어 루트의 `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md`는 갱신하지 않음.
3. `npm run lint`, `npm run build`가 금지되어 실제 빌드 검증은 수행하지 않음.
4. git 명령 전체가 금지되어 변경 상태 확인, 스테이징, 커밋은 수행하지 않음.
5. Firebase 연결 및 설정 파일 생성이 금지되어 실제 Firebase 전환 작업은 수행하지 않음.
6. 실제 PG, 환불, 정산, 알림톡, 배송조회, 외부 재고 API 연결은 계속 차단 상태임.

## 안전하게 다음으로 넘긴 항목

- 앱 코드 직접 수정은 세부 트랙과 허용 수정 범위가 명확해질 때까지 보류
- 검증 명령은 금지 지시가 해제되거나 최종 단계 허용 지시가 있을 때까지 보류
- 운영 연동 후보는 모두 문서/계약/stub 단계로만 유지

## 추가 생성 후 남은 차단 사항

1. `npm run lint`와 `npm run build`가 명시적으로 금지되어 새 TypeScript/TSX 파일의 자동 검증은 수행하지 못함.
2. `/mock-ui`, `/mock-ui/detail`은 preview 라우트이며 실제 고객/관리자 화면에 아직 연결하지 않음.
3. 기존 일부 파일의 한글 출력이 터미널에서 깨져 보여 직접 수정 시 위험이 있어, 이번 배치에서는 기존 페이지 파일 수정 대신 새 파일 추가만 수행함.
4. 실제 Firebase/PG/알림톡/배송조회/외부 재고 API 연결은 계속 금지 상태임.
5. 향후 실제 화면 이식 전에는 기존 `components/pages/*` 파일의 인코딩과 빌드 상태 확인이 필요함.
## QR checkout / guest lookup 추가 후 차단 사항

1. 새 `/mock-ui/checkout` preview 라우트는 아직 실제 `/q/[code]/checkout`, `/orders/guest` 화면에 연결하지 않음.
2. 결제 CTA는 버튼 mock이며 실제 PG 요청, 주문 생성, 환불, 정산 처리는 수행하지 않음.
3. 비회원 주문조회 form은 정적 mock UI이며 실제 고객 개인정보 검증 또는 저장을 수행하지 않음.
4. `npm run lint`, `npm run build`가 금지되어 새 컴포넌트 자동 검증은 수행하지 않음.
## 금지 패턴 검색 후 메모

1. 금지된 Firebase SDK import는 새 mock UI 범위에서 발견되지 않음.
2. `.env` 또는 Secret Key 생성은 수행하지 않음.
3. `PG` 문자열은 실제 연동이 아니라 차단/미연동 안내 문구로만 사용됨.
4. lint/build가 금지되어 타입 안정성은 다음 검증 허용 시 확인 필요.
## operations board 추가 후 차단 사항

1. `/mock-ui/operations`는 preview 전용이며 실제 관리자 승인/반려/정산/환불 액션을 수행하지 않음.
2. `MockIntegrationGateList`는 연결 차단 안내만 제공하며 Firebase, PG, Storage, 배송조회 API를 호출하지 않음.
3. `MockRouteSmokeMatrix`는 수동 확인 후보 목록이며 실제 smoke test 실행은 수행하지 않음.
4. lint/build 금지 때문에 새 operations 파일의 타입 검증은 다음 수동 단계로 보류함.
## QA preview 추가 후 차단 사항

1. `/mock-ui/qa`는 수동 절차 안내 화면이며 실제 git/npm 명령을 실행하지 않음.
2. worktree merge 충돌 여부는 실제 각 worktree 상태를 읽지 않았으므로 다음 출근일 사람이 확인해야 함.
3. release readiness 항목은 mock/static 기준이며 운영 승인으로 해석하면 안 됨.
4. lint/build 금지 때문에 새 QA 파일의 타입 검증은 다음 수동 단계로 보류함.
## storefront preview 추가 후 차단 사항

1. `/mock-ui/storefront`는 정적 preview이며 실제 장바구니 변경이나 QR 생성 액션을 수행하지 않음.
2. 가격 비교 layer는 실제 AI/외부 가격 API가 아니라 mock 안내 문구로만 구성됨.
3. 상품 이미지/미디어는 Firebase Storage가 금지되어 placeholder-style UI만 사용함.
4. lint/build 금지 때문에 새 storefront 파일의 타입 검증은 다음 수동 단계로 보류함.
## session lifecycle preview 추가 후 차단 사항

1. `/mock-ui/session`은 정적 preview이며 실제 QR session document를 생성하지 않음.
2. 결제 성공/실패/만료 상태는 UI 상태만 표시하며 PG 또는 서버 검증을 수행하지 않음.
3. 태블릿 출처 추적은 mock 데이터이며 실제 기기 인증 또는 App Check를 수행하지 않음.
4. lint/build 금지 때문에 새 session 파일의 타입 검증은 다음 수동 단계로 보류함.
## analytics preview 추가 후 차단 사항

1. `/mock-ui/analytics`는 정적 preview이며 실제 매출, 정산, 환불, 입금 처리를 수행하지 않음.
2. 정산 금액은 mock visibility 데이터이며 회계/세무/입금 데이터로 사용하면 안 됨.
3. PG 실연동, 환불 정책, 정산 정책, 입금 계좌 검증이 승인되기 전까지 payout은 계속 차단 상태임.
4. lint/build 금지 때문에 새 analytics 파일의 타입 검증은 다음 수동 단계로 보류함.
## preview route index 추가 후 차단 사항

1. `/mock-ui` route index는 Next `Link`를 사용하지만 실제 smoke 확인은 수행하지 않음.
2. lint/build 금지 때문에 새 route index 파일의 타입 검증은 다음 수동 단계로 보류함.
3. preview route들은 실제 서비스 IA가 아니라 mock/test 검토 허브로만 사용해야 함.
## journey preview 추가 후 차단 사항

1. `/mock-ui/journey`는 흐름 설명용 preview이며 실제 주문, 결제, 환불, 정산을 생성하지 않음.
2. route candidate는 수동 smoke 후보이며 dev server 실행이나 브라우저 확인은 수행하지 않음.
3. 금액 재계산, 재고 차감, QR 만료 처리는 실제 Cloud Functions 구현 전까지 mock decision으로만 유지함.
4. lint/build 금지 때문에 새 journey 파일의 타입 검증은 다음 수동 단계로 보류함.
## status dashboard 추가 후 차단 사항

1. 현재 폴더명 `my-app`은 사용자 지시의 worktree mapping 목록에 없어 `track=my-app`, `route=/mock-ui/status`로 safe fallback 처리함.
2. 파일 수와 진행률은 무인 생성 기준의 정적 mock summary이며 실제 git status/build 결과가 아님.
3. `/mock-ui/status`는 로컬 브라우저 육안 확인용 preview이며 live monitoring dashboard가 아님.
4. lint/build/browser smoke 실행이 금지되어 실제 렌더링 검증은 수행하지 않음.
5. Firebase/PG/Storage/알림톡/배송조회/외부 재고 API는 계속 blocker로 표시함.
## status dashboard design enhancement 후 차단 사항

1. live integration status grid는 정적 mock summary이며 실제 서비스 상태 모니터링이 아님.
2. progress timeline은 무인 작업 기록을 사람이 보기 쉽게 표시한 것이며 실제 git history가 아님.
3. 파일 수와 진행률은 manual review 전까지 추정치로 유지됨.
4. lint/build/browser smoke 금지로 인해 대시보드 렌더링 검증은 다음 수동 단계로 보류함.
## status dashboard read-only scan 후 메모

1. Firebase SDK import, env 사용, secret/config 생성 패턴은 status dashboard 범위에서 발견되지 않음.
2. 민감 키워드는 "생성하지 않음" 또는 "사람 확인 필요" 안내 문구로만 존재함.
3. 실제 타입/렌더링 검증은 `npm run lint`, `npm run build`, browser smoke 금지로 인해 다음 수동 단계로 유지함.
## localhost:3000 통합 런처 추가 후 차단 사항

1. 홈 화면과 `/mock-ui/status`는 정적 mock/test beta 런처이며 실제 운영 상태를 조회하지 않음.
2. 생성된 파일 수, route 수, component 수는 수동 검증 전까지 정적 추정치임.
3. worktree 포트 안내는 사람이 각 dev server를 별도로 실행해야 확인 가능함.
4. 브라우저 smoke, lint, build는 사용자 지시로 실행하지 않음.
5. 실제 Firebase SDK import, Firebase config, Firestore/Auth 연결은 계속 금지 상태임.
6. 실제 PG 결제, 환불, 정산, 알림톡, 배송조회, 외부 재고 API 연결은 계속 금지 상태임.
7. 운영 배포는 계속 금지 상태임.

## smoke/merge 화면 추가 후 차단 사항

1. `/mock-ui/smoke`는 수동 체크리스트 화면이며 실제 브라우저 자동화를 수행하지 않음.
2. `/mock-ui/merge`는 merge handoff 화면이며 실제 git merge, git add, git commit, git push를 수행하지 않음.
3. route count와 file count는 여전히 정적 mock summary이며 수동 검증 후 보정 필요.
## 통합 런처 read-only scan 후 메모

1. 통합 런처와 status/smoke/merge 화면 범위에서 Firebase SDK import 또는 env 사용은 발견되지 않음.
2. `git`/`npm` 문자열은 수동 확인용 보고서와 커밋 후보 문서에만 존재함.
3. 명령은 실행하지 않았으며 lint/build/browser smoke는 계속 수동 단계로 남음.
# my-app Blockers

## 2026-05-25 Firebase automatic integration blockers

- Custom Claims cannot be assigned safely from this browser/static app without a trusted Admin SDK runtime.
- Service account private keys must not be generated or committed.
- Seed script execution requires local `FIREBASE_SEED_EMAIL` and `FIREBASE_SEED_PASSWORD` values plus `seed_admin` or `SUPER_ADMIN` claim.
- Real PG, refund, settlement, payout, Alimtalk, delivery tracking, and external inventory APIs remain blocked.
- Orders/payments Firestore writes remain blocked until Functions server payment confirmation is deployed.

## 2026-05-25 Firebase products read blockers

- Firestore products read is now verified for active products, but all Firestore writes outside product read remain blocked.
- App Check enforcement remains OFF; do not enforce until Cloudflare custom domain and local dev behavior are verified.
- Cloudflare deployment must be visually checked after push to ensure production pages show `Firebase products` instead of `mock fallback`.
- PG approval/cancel/refund/settlement remain blocked until official PG keys, docs, webhook signature policy, and server runtime are confirmed.
- Storage upload remains blocked until image/GIF/video policy, rules, and product registration workflow are approved.

## 2026-05-25 active blockers

- QA scripts are local only and not yet connected to CI or Cloudflare build step.
- Functions dependencies are declared but not installed in this task; `functions/node_modules` is absent.
- `firebase.json` and `.firebaserc` are not created.
- Functions are deployed in mock-provider mode.
- Firestore write transaction is implemented for mock payment confirm snapshots.
- PG 테스트/운영 키와 공식 문서 미수령.
- Static export 화면만으로는 PG secret confirm 불가. 서버 runtime 필요.
- 실제 PG 승인/취소/환불/정산 실행 금지.
- Firestore products read 외 write 금지.
- Storage Blaze/Rules 승인 전 상품 이미지, 영상, GIF, 사업자등록증, 통장 사본 업로드 금지.
- 알림톡 템플릿, 배송조회 API, 외부 재고 API 미확보.
- 조리원 A4 API와 external id 매핑 규칙 미확정.

## 2026-05-25 PG integration blockers

- Real PG provider documents and sandbox keys are not received yet.
- Real provider SDK/script is not imported yet.
- Real PG confirm/cancel/refund/webhook calls are intentionally blocked.
- Firebase Functions are deployed in mock-provider mode.
- Secret Manager values are not created from this workspace.
- Functions install reported 9 moderate audit findings.
- Local Node v24 differs from Functions Node 20 engine.

## 2026-05-25 remaining blockers after Firebase live commerce

- Real PG provider documents and keys are still missing.
- Firebase Functions are deployed; real PG confirm/webhook/cancel still require PG provider adapter and Secret Manager values.
- PG server secrets, webhook secrets, and provider credentials must go to Firebase Secret Manager only.
- Admin/company/nursery dashboards still need Firestore aggregate read conversion.
- App Check enforcement remains OFF until Cloudflare custom domain and reCAPTCHA domain coverage are verified.
- Production refund, settlement, payout, Alimtalk, delivery tracking, and external inventory integrations remain blocked.

## 2026-05-25 remaining blockers after Functions deployment

- Firebase Functions are deployed in mock-provider mode at `asia-northeast3`.
- Real PG provider documents and keys are still missing, so no real PG capture/cancel/refund/webhook verification is active.
- PG server secrets, webhook secrets, and provider credentials must go to Firebase Secret Manager only.
- `firebase-functions` package is deployable but Firebase CLI warns it is not the newest available package.
- Local Node v24 differs from Functions runtime Node 22; build passes, but local engine warning remains.
- Admin/company/nursery dashboards still need final aggregate read-model conversion, but CMS/foundation records are seeded and beta writable in Firestore.
- App Check enforcement remains OFF until Cloudflare custom domain and reCAPTCHA domain coverage are verified.
- Production refund, settlement, payout, Alimtalk, delivery tracking, and external inventory integrations remain blocked.
## 2026-05-25 remaining blockers after Firebase commerce backend beta gate

- Real PG provider docs, sandbox keys, webhook signature spec, cancel/refund API, and settlement policy are still required.
- Server secrets must be entered only in Firebase Functions runtime/Secret Manager.
- Real PG, refund, settlement payout, Alimtalk, delivery tracking, and external inventory API calls remain blocked.
- Firestore/Storage deploy commands are documented but not executed in this phase.
- App Check enforcement remains OFF pending Cloudflare custom domain/reCAPTCHA verification.
- Storage upload validation and media governance are still required before production upload.
- `<img>` warnings are still present but not build-blocking.

## 2026-05-26 Auth/RBAC blockers

- Initial `SUPER_ADMIN` or `seed_admin` claim assignment still requires a trusted operator path; no Admin private key file should be generated.
- Custom Claims mutation must be protected by audit log writes before production account issuance.
- Bulk user creation remains blocked until owner approval and account recovery policy are defined.
- Plain password issuance or storage remains prohibited.
- `CUSTOMER_GUEST` must remain outside Firebase Auth and use QR/session/order verification only.

## 2026-05-26 Payment transaction backend blockers

- Functions deploy was not executed in this task.
- Real PG provider code is not implemented; `providerAdapter.ts` remains mock-only.
- PG server secrets and webhook secrets are not created in code or Git and must go to Firebase Secret Manager/runtime.
- Real webhook signature verification is still blocked until the PG company provides the official algorithm.
- Real PG cancel/refund and settlement payout remain blocked.
- Literal `/payments/ready` path routing may require Firebase Hosting, Cloud Run, or Cloudflare rewrite configuration after deploy.

## 2026-05-26 PG adapter blockers

- Real PG provider SDK/API is still not imported.
- Actual `PG_SECRET_KEY`, `PG_WEBHOOK_SECRET`, merchant id, channel key, and client key values are not in Git and must stay out of Git.
- Toss/PortOne/KCP/NICE exact request and response fields must come from the official PG document.
- Real cancel/refund remains blocked until refund policy and settlement hold rules are approved.
- Real webhook status transitions remain blocked until signature verification is implemented.

## 2026-05-26 Checkout server flow blockers

- Real PG payment window calls remain blocked until the selected PG provider module, sandbox keys, and official request/response contract are approved.
- `NEXT_PUBLIC_PAYMENT_API_BASE_URL` must point to reachable deployed Functions before customer checkout can call ready/confirm/status in production Cloudflare.
- Seeded QR sessions with past `expires_at` values will be correctly blocked by the server and need refresh/reseed before demo payment smoke.
- Real refund, settlement payout, Alimtalk, delivery tracking, and external inventory APIs remain blocked.
