# Firebase Contract Auto Report

작성일: 2026-05-20
트랙명: firebase-contract

## 요약

실제 Firebase 연결 전 계약 문서를 보강했다. SDK import, `.env`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, service account, Secret, deploy는 생성하지 않았다.

## DAY 1 - Firestore schema

- `products`, `product_options`, `carts`, `cart_items`, `qr_payment_sessions`, `orders`, `order_items`, `payments`, `inventory_movements`, `settlements`, `audit_logs` 기준을 보강했다.
- collection별 필수 scope 필드, 상태 필드, 금액/snapshot 필드 gate를 추가했다.
- mock 데이터에서 Firestore seed로 넘어갈 때 분리해야 하는 데이터 묶음을 정리했다.
- `carts`, `cart_items`, `settlements`, `audit_logs` 상세 문서 구조와 ID/index 후보를 추가했다.

## DAY 2 - Auth Custom Claims

- `SUPER_ADMIN`, `COMPANY_ADMIN`, `NURSERY_ADMIN`, `TABLET_DEVICE` claims 계약을 보강했다.
- `CUSTOMER_GUEST`, `PAYER_GUEST`는 Auth 계정 없이 QR token/order lookup 인증으로 제한하는 방향을 유지했다.
- claims 변경 lifecycle과 거부 조건을 정리했다.

## DAY 3 - Functions server logic

- QR 생성/만료, 주문금액 재계산, 상품 snapshot, 재고 차감/복구, 결제 mock에서 PG 전환 gate를 보강했다.
- 주문 확정 transaction 초안을 추가했다.
- 중복 PG callback과 idempotency 처리 기준을 추가했다.
- audit log payload 기준을 문서화했다.

## DAY 4 - Rules/IAM/Secret/App Check

- 실제 `firestore.rules` 파일 없이 문서 전용 Rules 초안을 추가했다.
- App Check, IAM, Server SDK 우회 위험을 정리했다.
- Secret Manager 후보와 PG/알림/배송/외부재고 key 확보 전 금지 원칙을 유지했다.

## DAY 5 - 실제 연결 전 체크리스트

- dev/prod 분리와 Emulator 검토 기준을 보강했다.
- repository interface DTO 후보, error code, contract test 후보를 추가했다.
- CartRepository와 SettlementRepository 후보를 추가했다.
- adapter split 전환 승인 체크포인트와 feature flag 후보를 문서화했다.

## 추가 고도화 - 상태 UI/검색/상세 계약

- 빈 상태 UI, 오류 상태 UI, 위험 상태 배지의 데이터 계약을 문서화했다.
- 필터/검색/정렬 입력과 정렬 후보를 repository 계약으로 정리했다.
- 상세 페이지 mock이 사용할 related/timeline/snapshot 조합을 정의했다.
- 모바일/태블릿 반응형 노출 원칙을 개인정보 최소 노출 기준으로 보강했다.
- mock scenario catalog를 추가해 빈 상태, 오류 상태, 위험 상태, 상세 페이지 검증 후보를 문서화했다.
- 실제 UI 코드, mock data 파일, Firebase adapter 파일은 만들지 않았다.

## Batch 01-16 추가 완료

| 배치 | 처리 결과 |
| --- | --- |
| 01 | `payouts`, `notification_logs`까지 포함해 핵심 컬렉션 계약 보강 |
| 02 | 필수 필드, 선택 필드, 상태값, 생성/수정 주체 표 추가 |
| 03 | `company_id`, `nursery_id`, `room_id`, `tablet_id`, `cart_id`, `qr_session_id`, `order_id`, `order_item_id` 등 ID 전략 확장 |
| 04 | 최종 claims payload, scope 검증, CUSTOMER_GUEST QR 인증 흐름 보강 |
| 05 | Rules helper 후보와 서버 SDK 우회 위험 보강 |
| 06 | composite index 후보를 화면/로직 기준으로 확장 |
| 07 | `createQrSession`, `expireQrSessions`, `createOrderFromQrSession`, `recalculateOrderAmount`, `confirmMockPayment`, `reserveInventory`, `restoreInventory`, `writeAuditLog` 상세화 |
| 08 | PG MID/Secret/callback/cancel/partial cancel/webhook gate 정리 |
| 09 | 알림톡/SMS 템플릿, 발송사 API, 재시도, `notification_logs` gate 정리 |
| 10 | 배송조회 API carrier code, 송장번호, fallback gate 정리 |
| 11 | 외부 재고 API `external_product_id`, `external_sku`, sync failure gate 정리 |
| 12 | Storage Blaze 전환 판단 기준 정리 |
| 13 | Secret Manager 필요 목록 확장 |
| 14 | `a5-closed-mall` 단일 프로젝트에서 dev/prod 분리 시점 정리 |
| 15 | Firebase Emulator 가능/불가능 항목 정리 |
| 16 | 보고서 3종 업데이트 |

## 계속 고도화한 항목

- `PayoutRepository`, `NotificationLogRepository`, `DeliveryEventRepository`, `RefundRepository`, `SystemStatusRepository` 후보를 추가했다.
- query pagination 계약을 추가해 무제한 list 조회를 금지하는 방향으로 정리했다.
- 외부 연동 port/stub 계약과 production adapter 생성 차단 조건을 보강했다.
- seed dry-run 오류 상태와 payouts/notification logs seed 후보를 추가했다.

## Batch 17-50 추가 완료

| 배치 | 처리 결과 |
| --- | --- |
| 17 | 컬렉션 lifecycle, 삭제 금지, archive, audit 필요 여부 표 작성 |
| 18 | `orders`, `order_items` 상태 전이표 확정 |
| 19 | `qr_payment_sessions` 상태 전이표 확정 |
| 20 | `inventory_movements` 보상 로직 정리 |
| 21 | mock payment와 실제 PG 원장 분리 기준 정리 |
| 22 | `refund_requests` 후보 구조와 mock 상태 정의 |
| 23 | `settlements`, `payouts` 상세 원칙 보강 |
| 24 | `notification_logs` 구조와 알림톡/SMS fallback 정리 |
| 25 | `delivery_events`, `pickup_events` 분리 |
| 26 | `external_inventory_sync_logs` 후보 작성 |
| 27 | 화면/로직별 index 후보 상세화 |
| 28 | Auth Custom Claims 검증 매트릭스 작성 |
| 29 | CUSTOMER_GUEST 비회원 QR 흐름 정리 |
| 30 | Repository와 Firestore 컬렉션 대응표 작성 |
| 31 | Firebase adapter stub 준비 체크리스트 작성 |
| 32 | pseudo-rules helper 후보를 claims 문서에 정리 |
| 33 | 서버 SDK Rules 우회 위험과 통제 항목 정리 |
| 34 | Cloud Functions endpoint별 input/output/blocker 작성 |
| 35 | Cloud Run 후보 정리 |
| 36 | Secret Manager 필요 항목과 주의사항 확정 |
| 37 | Storage Blaze 전환 조건 상세화 |
| 38 | dev/prod 분리 조건 재정리 |
| 39 | Emulator 가능/불가능 항목 확장 |
| 40 | seed data dry-run 절차와 seed 적용 순서 작성 |
| 41 | 운영 전 승인 체크리스트 작성 |
| 42 | 개인정보/주문정보 보관 원칙 정리 |
| 43 | `audit_logs`와 `financial_events` 후보 차이 정리 |
| 44 | mock/test/production adapter 구분표 작성 |
| 45 | blockers A/B/C 등급 재분류 |
| 46 | `FIREBASE_BLOCKERS.md` high/medium/low 최신화 |
| 47 | `NEXT_TASKS.md` 1일/3일/5일/10일 계획으로 재구성 |
| 48 | `AUTO_REPORT.md` 현재 파일 업데이트 |
| 49 | `BLOCKERS.md` 사람 승인 필요 항목 통합 |
| 50 | 중복/모순 점검 후 추가 고도화 항목 작성 |

## Batch 50 점검 결과

- mock 결제 상태와 실제 PG 상태를 분리해 `mock_tid`와 `real_pg_tid` 혼동을 줄였다.
- 정산 기준을 `orders`가 아니라 `order_items.company_id`로 반복 명시했다.
- 실제 발송/지급/환불/API 호출은 모두 차단 상태로 유지했다.
- `paid` 같은 운영 상태는 mock 상태와 구분하도록 보강했다.
- Rules는 파일이 아니라 pseudo-rules/helper 후보 문서로만 유지했다.
- Firestore pseudo-rules를 문서 블록으로 추가하고 acceptance criteria를 보강했다.

## Batch 51-70 추가 완료

| 배치 | 처리 결과 |
| --- | --- |
| 51 | 컬렉션별 validation 규칙과 실패 코드 후보 추가 |
| 52 | 상태 invariant 정리 |
| 53 | 금액 source of truth 정리 |
| 54 | QR/token 위협 모델 작성 |
| 55 | idempotency key 후보 작성 |
| 56 | 검색 key 후보 작성 |
| 57 | 데이터 보존/archive 후보 작성 |
| 58 | retry/dead-letter 정책 후보 작성 |
| 59 | partial failure matrix 작성 |
| 60 | observability/system_status 후보 작성 |
| 61 | reconciliation 후보 작성 |
| 62 | runbook/no-go trigger 작성 |
| 63 | DTO versioning 계약 작성 |
| 64 | contract test acceptance 후보 작성 |
| 65 | rollout readiness contract 작성 |
| 66 | adapter rollout plan 작성 |
| 67 | rollback 기준 작성 |
| 68 | 추가 고도화 blockers 작성 |
| 69 | 추가 no-go 조건 작성 |
| 70 | handoff checklist 작성 |

## Local Status Dashboard 추가

- `/firebase-contract/status` route를 생성했다.
- 정적 mock/status 데이터 파일을 생성했다.
- `StatusDashboard` 컴포넌트를 생성했다.
- 브라우저 smoke route 목록, 연동 차단 상태, 다음 작업 10개, 사람 확인 항목, empty/loading/error/risk 커버리지를 표시하도록 구성했다.
- 운영 오픈/실결제/Firebase 실제 연결이 아님을 상단과 상태 카드에 명확히 표시했다.
- `node_modules/next/dist/docs`가 없어 Next.js 로컬 문서 확인은 완료하지 못했고, `npm install`은 금지되어 실행하지 않았다.

## Preview Hub / Route Index 추가

- `/firebase-contract` preview hub route를 생성했다.
- `/firebase-contract/schema`, `/auth-claims`, `/functions`, `/seed`, `/repositories`, `/blockers`, `/emulator`, `/secrets` route를 생성했다.
- `/firebase-contract/smoke`, `/firebase-contract/merge-handoff` route를 생성했다.
- `ContractRoutePreviewGrid`와 `ContractDocumentHub` 컴포넌트를 생성했다.
- 각 카드에 문서 요약, 상태, blocker, 사람 확인 필요 항목을 표시했다.
- `ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, `MERGE_HANDOFF.md`를 작성했다.

## 수정 파일

- `FIRESTORE_SCHEMA_PLAN.md`
- `AUTH_CLAIMS_PLAN.md`
- `FUNCTIONS_SERVER_LOGIC_PLAN.md`
- `FIREBASE_SEED_DATA_PLAN.md`
- `REPOSITORY_INTERFACE_PLAN.md`
- `ADAPTER_SPLIT_PLAN.md`
- `FIREBASE_BLOCKERS.md`
- `reports/firebase-contract/AUTO_REPORT.md`
- `reports/firebase-contract/NEXT_TASKS.md`
- `reports/firebase-contract/BLOCKERS.md`

## 금지 명령 준수

- git add/commit/push 실행하지 않음
- npm install/build/lint 실행하지 않음
- Firebase deploy/연결 실행하지 않음
- `.env`, Firebase 설정 파일, Rules 파일 생성하지 않음
- 실제 PG/환불/정산/알림톡/배송조회/외부 재고 API 연결하지 않음
- service account/private key/Secret 값 생성하지 않음
- 실제 seed script, adapter file, UI component 파일 생성하지 않음
- `reports/firebase-contract/UNATTENDED_PROGRESS.md`와 `reports/firebase-contract/COMMIT_CANDIDATE.md` 작성
- `reports/firebase-contract/STATUS_SUMMARY.md` 작성
- `app/firebase-contract/status/page.tsx` 작성
- `components/firebase-contract/StatusDashboard.tsx` 작성
- `data/firebase-contract/statusMock.ts` 작성
- `app/firebase-contract/**` preview hub routes 작성
- `components/firebase-contract/ContractRoutePreviewGrid.tsx` 작성
- `components/firebase-contract/ContractDocumentHub.tsx` 작성
- `reports/firebase-contract/ROUTE_INDEX.md` 작성
- `reports/firebase-contract/VISUAL_SMOKE_PLAN.md` 작성
- `reports/firebase-contract/MERGE_HANDOFF.md` 작성
