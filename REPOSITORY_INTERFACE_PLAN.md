# Repository Interface Plan

작성일: 2026-05-20

## 1. 목적

현재 mock/test 베타가 `mockApi`와 `data/**`를 직접 사용하는 구조에서, 실제 Firebase 연결 전 Repository interface 경계를 먼저 정의한다. 이 문서는 설계 초안이며 TypeScript interface 파일, Firebase adapter, Firestore 연결 코드를 만들지 않는다.

## 2. 설계 원칙

- UI는 mock 데이터 배열이나 Firebase SDK를 직접 알지 않는다.
- 화면은 Repository interface만 호출하고, 실제 구현체는 mock 또는 Firebase adapter로 교체한다.
- mock adapter와 Firebase adapter는 같은 반환 형태와 에러 의미를 가져야 한다.
- 금액, QR, 재고, 주문 확정 같은 신뢰 경계 로직은 단순 repository가 아니라 server service/transaction 계층에서 처리한다.
- Firebase adapter는 공식 연결 승인 전까지 생성하지 않는다.

## 3. 계층 구조 초안

```text
app/**, components/**
  -> use case/service boundary
    -> repository interface
      -> mock repository implementation
      -> firebase repository implementation 후보
```

구분:

| 계층 | 역할 | 현재 상태 |
| --- | --- | --- |
| UI/Page | 화면 표시, 사용자 입력 | mock UI 존재 |
| Use case/Service | QR 생성, 결제 준비, 주문조회 같은 업무 흐름 | 문서 설계 단계 |
| Repository interface | 데이터 접근 계약 | 이번 문서에서 초안 |
| Mock repository | `data/**` 기반 구현 | 추후 기존 `mockApi`를 감싸는 방식 후보 |
| Firebase repository | Firestore/Auth/Functions 연결 구현 | 실제 연결 승인 전 생성 금지 |

## 4. Repository 후보

### ProductRepository

목적: 상품 목록, 상세, 옵션, 가격비교 표시를 조회한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `listApprovedProducts` | category, company_id 후보 | 상품 목록 | 태블릿/고객 read |
| `getProductById` | product_id | 상품 상세 | 승인 상품만 고객 노출 |
| `listProductOptions` | product_id | 옵션 목록 | 재고 포함 |
| `listCompanyProducts` | company_id, status | 입점사 상품 목록 | 기업 Admin scope |

### QrSessionRepository

목적: QR/조르기 세션 조회와 상태 변경을 담당한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `getQrSessionByShortCode` | short_code, token 후보 | QR 세션 | guest 접근은 token 검증 필요 |
| `createQrSessionDraft` | tablet scope, cart snapshot | active QR | 실제 생성은 server service 경계 |
| `markQrPaid` | qr_session_id, payment_id | 상태 변경 결과 | transaction 필요 |
| `markQrExpired` | qr_session_id | 상태 변경 결과 | Scheduler 후보 |
| `markQrCancelled` | qr_session_id, actor | 상태 변경 결과 | audit log 필요 |

### OrderRepository

목적: 주문 헤더와 주문상세 snapshot을 조회/생성한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `getOrderByOrderNo` | order_no, guest credential 후보 | 주문 상세 | 비회원 주문조회 |
| `listOrdersByNursery` | nursery_id, filters | 주문 목록 | 조리원 Admin scope |
| `listOrderItemsByCompany` | company_id, filters | 주문상세 목록 | 기업 Admin/정산 기준 |
| `createOrderFromQrSnapshot` | qr_session, payment | order + order_items | payment 승인 후 transaction |

### PaymentRepository

목적: mock/PG 결제 상태와 이벤트를 기록한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `createPaymentReady` | order/qr amount | payment ready | PG prepare 전 |
| `recordPaymentApproved` | payment_id, tid, amount | payment approved | mock_tid/pg_tid 구분 |
| `recordPaymentFailed` | payment_id, reason | payment failed | 실패 이벤트 |
| `appendPaymentEvent` | event | event id | append-only |

### InventoryRepository

목적: 옵션 재고와 재고 이동 원장을 처리한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `getOptionStock` | option_id | stock | 결제 전 검증 |
| `reserveStock` | option_id, quantity, source | movement | 실제 정책 승인 후 |
| `deductStock` | option_id, quantity, order_id | movement | 결제 승인 transaction |
| `restoreStock` | option_id, quantity, reason | movement | 취소/실패/환불 후보 |
| `appendInventoryMovement` | movement | movement id | append-only |

### AuditLogRepository

목적: 권한/금액/상태 변경을 기록한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `appendAuditLog` | actor, action, target, message | audit id | server only |
| `listAuditLogs` | filters | audit list | SUPER_ADMIN read |

## 5. Use Case/Service 경계

Repository만으로 처리하면 위험한 업무는 service 계층으로 올린다.

| Use case | 필요한 repository | 핵심 검증 |
| --- | --- | --- |
| QR 생성 | Product, QrSession, Inventory, Audit | 태블릿 scope, 승인 상품, 옵션 재고, 수령방식 |
| QR 만료 | QrSession, Audit | active 상태와 만료시간 |
| 결제 준비 | QrSession, Payment, Audit | QR active, 금액 서버 재계산, token 검증 |
| 결제 승인 | QrSession, Order, Payment, Inventory, Audit | 재사용 차단, 주문 snapshot, 재고 차감, 원자성 |
| 비회원 주문조회 | Order | 주문번호, 휴대폰 hash/token, 개인정보 최소 노출 |
| 환불 요청 | Order, Payment, Inventory, Audit | 상태별 가능 여부. 실제 PG 환불은 별도 승인 |

## 6. Error 모델 초안

mock adapter와 Firebase adapter는 같은 에러 코드를 반환해야 한다.

| 코드 | 의미 |
| --- | --- |
| `NOT_FOUND` | 문서/원장 없음 |
| `FORBIDDEN_SCOPE` | role/scope 불일치 |
| `QR_EXPIRED` | QR 만료 |
| `QR_ALREADY_USED` | paid/cancelled QR 재사용 |
| `AMOUNT_MISMATCH` | 서버 재계산 금액 불일치 |
| `OUT_OF_STOCK` | 재고 부족 |
| `INVALID_STATUS_TRANSITION` | 상태 전이 불가 |
| `EXTERNAL_BLOCKED` | PG/알림/배송/재고 실제 연동 차단 |

## 7. Transaction 경계

Firestore 전환 시 아래 작업은 단일 transaction 또는 보상 로직이 필요하다.

- QR `active` -> `paid`
- `orders` 생성
- `order_items` 생성
- `payments` 승인 상태 기록
- `inventory_movements` append
- 상품 옵션 재고 차감
- `audit_logs` append

실패 시 QR을 paid로 바꾸고 주문이 없는 상태, 주문은 있는데 재고 차감이 없는 상태를 만들면 안 된다.

## 8. 현재 금지

- 실제 Repository interface 파일 생성
- Firebase adapter 파일 생성
- Firebase SDK import
- Firestore/Auth 연결
- `.env`, Secret, service account 생성
- deploy
