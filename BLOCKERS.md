# Blockers

작성일: 2026-05-19

## 1. 현재 중단/확인 필요 항목

| ID | Blocker | 현재 상태 | 필요 조치 |
| --- | --- | --- | --- |
| B-025 | CI release gate 미연결 | QA 스크립트는 생성됐지만 GitHub Actions/Cloudflare build step에 아직 연결하지 않음 | CI 적용 범위 승인 후 workflow/build command 반영 |
| B-022 | Functions dependency 미설치 | `functions/package.json`은 생성됐고 `functions/node_modules`는 없음. 설치/빌드는 별도 승인 필요 | `npm.cmd --prefix functions install` 승인 후 `npm.cmd --prefix functions run build` |
| B-023 | Firebase deploy 설정 없음 | `firebase.json`, `.firebaserc`를 의도적으로 생성하지 않음 | 배포 승인 전까지 유지 |
| B-024 | Functions Firestore write 미구현 | transaction plan과 skeleton만 존재 | Rules/IAM/Secret 승인 후 구현 |
| B-017 | PG 서버 confirm 런타임 미확정 | 결제 interface/skeleton은 준비됐지만 static export 화면에서는 secret key 사용 불가 | Functions, Cloud Run, Workers 중 하나 선택 후 서버 endpoint 구현 |
| B-018 | PG 키/공식 문서 미수령 | env key 이름과 skeleton만 준비됨 | PG사 테스트/운영 키, callback 검증, 취소/부분취소 문서 확보 |
| B-019 | Firebase write 차단 유지 | products read 외 carts/orders/payments/qr_sessions write는 차단 | Rules/Functions/audit log 승인 전 write 금지 |
| B-020 | 기업 서류/이미지/영상 업로드 보류 | Storage Spark 제한 및 보안 규칙 미확정 | Blaze/Storage Rules/파일 정책 승인 후 별도 구현 |
| B-021 | 조리원 A4 연동 미확정 | external mapping mock 필드만 준비 | A4 API/ID 규칙/동기화 정책 확보 |
| B-001 | 프로젝트 루트 경로 불일치 | 사용자 요청 경로 `C:\Users\djfh\Desktop\my-app`는 존재하지 않고, 실제 workspace는 `C:\Users\djfhl\Desktop\my-app` | 이후 작업 기준 경로를 명확히 확정 |
| B-002 | Firebase 기존/신규 프로젝트 판단 불가 | `firebase.json`, `.firebaserc`, rules, env, Firebase dependency 없음 | Firebase decision 보고서 작성 및 사람 승인 |
| B-003 | 운영 Firebase 연결 금지 상태 | owner/IAM/환경 분리/운영 데이터 여부 확인 불가 | 개발/스테이징/운영 분리 정책 확정 전 연결 금지 |
| B-004 | PG 공식 문서/테스트 MID/운영 MID 없음 | 현재 프로젝트에 결제 설정 없음 | mock/test adapter 외 실제 PG 구현 금지 |
| B-005 | 카카오 알림톡 발송사/템플릿 승인 정보 없음 | 관련 설정 없음 | mock adapter 또는 템플릿 체크리스트까지만 허용 |
| B-006 | 배송조회 API 또는 택배사 URL 방식 미결정 | 관련 설정 없음 | 공식 API/계약 문서 확보 전 mock/URL 초안만 허용 |
| B-007 | 외부 명품쇼핑몰 재고 API 규격 없음 | 관련 설정 없음 | external stock mock adapter까지만 허용 |
| B-008 | 정산 정책 미확정 | 수수료율, 환불 차감, 배송비, 지급 기준 없음 | 정산 계산 초안/검산표 외 지급 처리 금지 |
| B-009 | 비회원 주문조회 인증 정책 미확정 | 개인정보 노출 기준 없음 | 주문번호/휴대폰 등 정책 확정 필요 |
| B-010 | Gate 0 정책 문서 부족 | `PROJECT_RULES.md`, `DB_SCHEMA.md`, `STATUS_MODEL.md`, `SECURITY_POLICY.md`, `AUTO_MODE_POLICY.md` 없음 | 구현 전 정책 문서 작성/승인 |
| B-011 | Next.js 16.2.6 변경사항 확인 필요 | `AGENTS.md`가 bundled docs 확인을 요구 | 구현 전 관련 `node_modules/next/dist/docs/` 문서 확인 |
| B-012 | npm PowerShell 실행 정책 차단 | `npm.ps1` 직접 실행 실패, `npm.cmd`는 가능 | 명령 실행 시 `npm.cmd` 사용 또는 정책 확인 |
| B-013 | 운영 외부 연동 정보 없음 | PG, 알림톡, 배송조회, 외부 재고 API 운영 문서/키/계약 정보 없음 | mock adapter까지만 생성하고 실제 연동 금지 |
| B-014 | 정산 지급 정책 미확정 | 수수료율, 지급일, 차감, 세무/증빙 정책 없음 | 정산 mock UI와 검산표 수준까지만 허용 |
| B-015 | mock adapter의 production 전환 차단 | `lib/adapters/*Mock.ts`만 생성됨. production adapter 없음 | 공식 문서, 키, 계약, 승인 전 production adapter 생성 금지 |
| B-016 | 고객 폐쇄몰 UI는 mock 전용 | 태블릿/QR/비회원 주문조회 UI가 쇼핑몰형으로 개선됐지만 실제 결제/DB/알림/배송/재고 API와 연결되지 않음 | 운영 연동 전 Firebase/PG/알림톡/배송조회/외부 API 승인 필요 |

## 2. 현재 허용 가능한 작업

현재 단계에서 허용 가능한 작업은 분석, 문서 작성, 보고서 정리, mock/test 설계 초안 작성까지다.

허용:

- 파일 인벤토리
- 설치 상태 보고
- gap 분석
- risk register
- Firebase decision 초안
- architecture map 초안
- 정책 문서 초안

금지:

- 코드 구현
- 기존 파일 삭제
- 대량 덮어쓰기
- Firebase 연결
- `.env` 또는 Secret Key 생성
- PG, 환불, 정산, 운영 배포
- 실결제 관련 구현

## 3. 다음 승인 필요 후보

1. 실제 프로젝트 루트 경로 확정
2. Firebase 기존 프로젝트 사용 여부 또는 신규 프로젝트 생성 여부 결정
3. `a5-learning` 문서 중 어떤 파일명을 최종 기준으로 삼을지 확정
4. Gate 0 정책 문서 작성 승인
5. 구현 시작 전 A/B/C 자동화 등급 적용 방식 승인

## 2026-05-25 PG integration blockers

- PG provider official documentation is still required: browser module/script, ready/confirm/cancel API, webhook signature algorithm, sandbox console settings.
- Real `PG_SECRET_KEY`, `PG_WEBHOOK_SECRET`, service credentials, and provider keys are not stored in this repository and must only be entered into approved runtime secret stores.
- Firebase Functions are deployed in mock-provider mode. Real PG provider calls still require official keys/docs and Secret Manager values.
- Functions dependencies installed successfully, but npm reported 9 moderate audit findings that must be reviewed before production deploy.
- Local Node is v24.15.0 while Functions declares Node 22; local npm emits an engine warning, but deployed runtime is Node 22.
- Real cancel/refund/settlement payout remains blocked until refund policy, settlement hold, and admin approval flow are signed off.

## 2026-05-25 remaining blockers after Firebase live commerce

- Real PG provider keys and official API documents are still required before replacing mock approval.
- Firebase Functions are deployed; real payment confirm/webhook/cancel still require the selected PG provider adapter and Secret Manager values.
- Server secrets must be entered in Firebase Secret Manager, not in repository files or Cloudflare public variables.
- Admin/company/nursery dashboards still contain some mock aggregate summaries, but beta CMS/foundation records are now seeded and writable in Firestore.
- App Check enforcement remains OFF until Cloudflare custom domain, localhost behavior, and reCAPTCHA domain coverage are verified.
- Production refund, settlement, payout, Alimtalk, delivery tracking, and external inventory APIs remain blocked.

## 2026-05-25 remaining blockers after Functions deployment

- Firebase Functions are deployed in mock-provider mode. Real PG provider calls still require official PG docs, sandbox keys, and Secret Manager values.
- `paymentsReady` and `paymentsConfirm` smoke tests passed, but they intentionally use mock approval only.
- Webhook signature verification is still skeleton-only until the PG provider supplies the official algorithm and secret.
- Real cancel/refund/settlement/payout remains blocked until finance policy, settlement hold, and admin approval workflow are signed off.
- Alimtalk, delivery tracking, and external inventory integrations remain blocked until official accounts/API keys are issued.
- Firebase App Check enforcement remains OFF until Cloudflare custom domain and reCAPTCHA coverage are verified.
- `firebase-functions` deploys, but Firebase CLI warns the package is not the newest available version; review before production payment launch.
## 2026-05-25 remaining blockers after Firebase commerce backend beta gate

- Real PG provider docs and sandbox keys are still required before real approval/cancel/webhook implementation.
- `PG_SECRET_KEY`, `PG_WEBHOOK_SECRET`, provider credentials, and any reCAPTCHA secret must never be committed; they belong in Firebase Functions runtime/Secret Manager.
- Real PG approval, cancel, refund, settlement payout, Alimtalk, delivery tracking, and external inventory API calls remain blocked.
- Firestore rules deploy was not run in this phase; candidate command is documented only.
- App Check enforcement remains OFF until Cloudflare domain and localhost behavior are verified.
- Storage upload production behavior still needs file type, size, malware scan, approval workflow, and retention policy.
- Remaining `<img>` lint warnings are non-blocking but should be resolved after final image/Storage strategy is approved.
## 2026-05-26 Auth/RBAC blockers

- First `SUPER_ADMIN` or `seed_admin` claim assignment still needs a trusted operator path; do not create Firebase Admin private key files.
- Every production claim change needs audit log write and owner-approved account recovery policy.
- Bulk user creation remains blocked.
- Plain password issuance/storage remains blocked.
- `CUSTOMER_GUEST` remains a QR/session/order lookup flow, not a Firebase Auth account.

## 2026-05-26 Compliance blockers

- Final product legality, restricted category interpretation, KC applicability, and legal notice wording require expert/legal review.
- KC certification validity lookup is not connected to an official verification service.
- Real Firebase Storage uploads, malware scanning, retention policy, and access logging are not connected.
- Company compliance writes remain mock UI until role-scoped Firestore writes and audit logs are approved.
- Real refund, settlement payout, Alimtalk, delivery tracking, and external inventory APIs remain blocked.

## 2026-05-26 Admin operations blockers

- Real approve/reject/status write actions require `SUPER_ADMIN` Custom Claim verification, server-side validation, and audit log writes.
- CMS write actions require Storage/media governance, scoped Firestore rules, and content approval policy before enabling.
- Payment monitor remains read/diagnostic only until PG webhook signature verification and provider event mapping are implemented.
- Order monitor remains read/diagnostic only; manual order state mutation must stay server-side.
- Real PG cancel/refund, settlement payout, Alimtalk, delivery tracking, and external inventory APIs remain blocked.

## 2026-05-26 Firebase CMS live registration blockers

- CMS create/update is enabled as a guarded beta path; production still needs Custom Claims, server-side audit logs, and stricter approval workflow.
- Storefront rendering needs browser smoke after Cloudflare deploy to confirm live Firestore CMS records override fallback banners/brands/home sections.
- Storage upload is enabled only for public storefront/ad/product media; private business documents, bank documents, settlement files, payout files, and audit exports remain blocked.
- Malware scanning, media moderation, retention policy, and deletion governance are not implemented.
- PG, order/payment ledgers, refund, settlement payout, Alimtalk, delivery tracking, and external inventory API integrations remain blocked.
