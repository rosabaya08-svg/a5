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

### CartRepository

목적: 태블릿 장바구니와 QR 생성 전 상품 선택 상태를 담당한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `getActiveCartByTablet` | tablet_id | cart + items | TABLET_DEVICE scope |
| `upsertCartItem` | cart_id, product_id, option_id, quantity | cart item | QR 생성 전까지만 허용 |
| `removeCartItem` | cart_item_id | 변경 결과 | 자기 tablet scope 검증 |
| `markCartConvertedToQr` | cart_id, qr_session_id | 변경 결과 | QR snapshot 생성 후 호출 |

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

### SettlementRepository

목적: 입점사별 기간 정산 snapshot을 조회하고 mock 확정 상태를 관리한다.

필요 메서드 후보:

| 메서드 | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| `listSettlementsByCompany` | company_id, period filter | settlement list | COMPANY_ADMIN scope |
| `previewSettlement` | company_id, period | settlement draft | `order_items` 기준 계산 |
| `markSettlementReviewed` | settlement_id, actor | reviewed settlement | SUPER_ADMIN 전용 후보 |
| `blockPayout` | settlement_id, reason | blocked settlement | 실제 지급 전 차단 |

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

## 9. 5일 베타 repository 계약

실제 TypeScript interface 파일은 만들지 않고, 화면과 mock adapter가 공유해야 할 계약만 문서로 고정한다.

| 계약 | 기준 |
| --- | --- |
| 반환 형태 | 성공 시 typed DTO 후보, 실패 시 공통 error code |
| scope 입력 | admin/company/nursery/tablet/guest context를 명시적으로 전달 |
| 금액 계산 | repository 단독 계산 금지, service/use case 경계에서 수행 |
| 상태 변경 | repository는 저장 경계, status transition 검증은 service 경계 |
| snapshot | 주문/QR/결제는 원장 참조와 snapshot을 함께 보존 |
| 외부 연동 | PG/배송/알림/외부재고는 port를 통해 mock 처리 |

## 10. DTO 후보

| DTO | 핵심 필드 |
| --- | --- |
| `ProductSummary` | `product_id`, `company_id`, `name`, `status`, `price`, `comparison`, `stock_summary` |
| `ProductOptionSummary` | `option_id`, `product_id`, `name`, `price_delta`, `stock`, `status` |
| `QrSessionView` | `qr_session_id`, `short_code`, `status`, `expires_at`, `items_snapshot`, `total_amount_snapshot` |
| `OrderView` | `order_id`, `order_no`, `status`, `delivery_method`, `total_amount`, `items` |
| `OrderItemView` | `order_item_id`, `company_id`, `product_name_snapshot`, `quantity`, `delivery_status`, `settlement_status` |
| `PaymentView` | `payment_id`, `order_id`, `status`, `amount`, `mock_tid`, `pg_tid` |
| `AuditLogView` | `action`, `target_type`, `target_id`, `actor_type`, `created_at` |

DTO는 화면 표시용이며, Firestore 문서 구조와 1:1로 묶지 않는다.

## 11. 공통 error code 계약

| code | 사용 위치 |
| --- | --- |
| `NOT_FOUND` | QR, 주문, 상품, 옵션 없음 |
| `FORBIDDEN_SCOPE` | role/scope 불일치 |
| `QR_EXPIRED` | QR 만료 |
| `QR_ALREADY_USED` | paid/cancelled QR 재사용 |
| `AMOUNT_MISMATCH` | 서버 재계산 금액 불일치 |
| `OUT_OF_STOCK` | 옵션 또는 상품 재고 부족 |
| `INVALID_STATUS_TRANSITION` | 허용되지 않은 상태 전이 |
| `EXTERNAL_BLOCKED` | 실제 PG/배송/알림/재고 API 차단 |
| `CONFIG_REQUIRED` | Firebase/Secret 설정이 필요한 작업 차단 |

## 12. adapter contract test 후보

실제 테스트 파일은 만들지 않는다. 추후 mock repository와 Firebase repository는 같은 contract test를 통과해야 한다.

1. 승인 상품 목록은 `approved` 상태만 반환한다.
2. `COMPANY_ADMIN`은 다른 회사 상품을 볼 수 없다.
3. QR 조회는 `short_code`와 token 검증을 동시에 요구한다.
4. 만료 QR은 결제 준비가 실패한다.
5. 주문 조회는 마스킹된 고객 정보만 반환한다.
6. 입점사 주문 목록은 `order_items.company_id` 기준으로 반환한다.
7. 결제 승인 흐름은 주문 snapshot을 보존한다.
8. 외부 연동은 mock adapter에서 `EXTERNAL_BLOCKED` 또는 mock result만 반환한다.

## 13. 상태 UI ViewModel 계약

실제 UI 컴포넌트를 만들지 않고, 각 트랙의 화면이 같은 상태 모델을 해석하도록 ViewModel 후보를 정의한다.

| ViewModel | 필드 후보 | 목적 |
| --- | --- | --- |
| `EmptyStateView` | `kind`, `title`, `message`, `safe_action_label` | 빈 목록/빈 상세 상태 표시 |
| `ErrorStateView` | `code`, `message`, `retryable`, `blocked_reason` | 오류 상태 UI |
| `RiskBadgeView` | `level`, `label`, `reason`, `source` | 위험 상태 배지 |
| `FilterView` | `query`, `status`, `scope`, `date_from`, `date_to` | 필터/검색 UI |
| `SortView` | `field`, `direction`, `label` | 정렬 UI |
| `PageResultView<T>` | `items`, `total_count`, `empty_state`, `risk_summary` | 리스트 응답 |
| `DetailView<T>` | `record`, `related`, `timeline`, `risk_badges` | 상세 페이지 mock |

## 14. 필터/검색/정렬 repository 계약

| repository | list 메서드 입력 후보 | 정렬 후보 | 빈 상태 |
| --- | --- | --- | --- |
| ProductRepository | `company_id`, `category`, `status`, `query`, `risk_level` | `updated_at`, `price`, `stock_summary` | 승인 상품 없음 |
| CartRepository | `tablet_id`, `status` | `updated_at`, `estimated_total` | 장바구니 비어 있음 |
| QrSessionRepository | `nursery_id`, `room_id`, `tablet_id`, `status`, `date_range`, `short_code` | `created_at`, `expires_at` | QR 이력 없음 |
| OrderRepository | `nursery_id`, `company_id`, `status`, `delivery_method`, `query` | `created_at`, `paid_at`, `total_amount` | 주문 없음 |
| PaymentRepository | `status`, `order_id`, `date_range` | `created_at`, `amount` | 결제 이력 없음 |
| SettlementRepository | `company_id`, `period`, `status` | `period`, `payout_amount` | 정산 없음 |
| AuditLogRepository | `actor_type`, `action`, `target_type`, `date_range` | `created_at` | 감사 로그 없음 |

검색은 Firestore 단독 full text를 전제로 하지 않는다. `query`는 정확 일치, prefix key, 별도 검색 인덱스 중 승인된 방식으로만 구현한다.

## 15. 상세 페이지 mock 계약

| detail | repository 조합 | related/timeline 후보 |
| --- | --- | --- |
| ProductDetail | Product, Inventory, Audit | 옵션 목록, 재고 변경, 승인 이력 |
| QrSessionDetail | QrSession, Cart, Payment, Order, Audit | QR 생성, 만료, 결제 준비, 주문 확정 |
| OrderDetail | Order, Payment, Delivery, Refund, Audit | 결제 이벤트, 배송/수령, 환불 요청 |
| SettlementDetail | Settlement, OrderItem, Audit | 포함 주문상세, 환불 차감, 검토 이력 |
| DeviceDetail | Tablet, QrSession, Audit | 마지막 접속, 객실 연결, QR 생성 이력 |

상세 mock은 관련 문서가 없을 때도 `EmptyStateView`를 반환해야 하며, 실제 외부 API 호출로 빈칸을 채우지 않는다.

## 16. 반응형 노출 계약

| 화면 크기 | 노출 원칙 |
| --- | --- |
| mobile | 상태, 금액, 핵심 식별자만 우선. 긴 snapshot은 접힘 상태 |
| tablet | 객실/태블릿 출처 banner와 QR/장바구니 흐름 우선 |
| desktop | 필터, 정렬, summary, 상세 패널 동시 표시 후보 |

개인정보는 화면 크기와 관계없이 masked 필드만 노출한다.

## 17. Batch 16 추가 repository 후보

| Repository | 목적 | 주요 메서드 후보 |
| --- | --- | --- |
| `PayoutRepository` | 정산 지급 후보 조회와 mock 지급 차단 상태 관리 | `listPayoutsByCompany`, `getPayoutBySettlement`, `markPayoutBlocked` |
| `NotificationLogRepository` | 알림톡/SMS/email mock 이력과 재시도 후보 조회 | `appendNotificationLog`, `listNotificationLogsByTarget`, `markRetryScheduled` |
| `DeliveryEventRepository` | 송장/배송상태 mock 이벤트 | `appendDeliveryEvent`, `listDeliveryEventsByOrderItem` |
| `RefundRepository` | 환불 요청/검토 mock | `createRefundRequest`, `listRefundsByOrder`, `markRefundReviewBlocked` |
| `SystemStatusRepository` | 외부 연동 차단/설정 필요 상태 표시 | `getSystemStatus`, `listBlockedIntegrations` |

## 18. query pagination 계약

Firestore 전환 시 무제한 list를 금지한다.

| 입력 | 의미 |
| --- | --- |
| `limit` | 한 번에 가져올 최대 건수. 화면별 기본값 필요 |
| `cursor` | 다음 페이지 시작점. 문서 snapshot 또는 encoded cursor 후보 |
| `sort.field` | 허용된 정렬 필드만 |
| `sort.direction` | `asc`, `desc` |
| `filters` | role/scope 필터가 항상 우선 적용 |

scope 필터 없이 전체 조회가 필요한 경우는 `SUPER_ADMIN`과 서버 배치만 허용한다.

## 19. Batch 30 Repository와 Firestore 컬렉션 대응표

| Repository | 주요 컬렉션 | 보조 컬렉션 | 주의 |
| --- | --- | --- | --- |
| `ProductRepository` | `products`, `product_options` | `inventory_movements`, `audit_logs` | 승인 상품과 기업 상품 scope 분리 |
| `OrderRepository` | `orders`, `order_items` | `payments`, `delivery_events`, `pickup_events`, `refund_requests` | order header와 company item 분리 |
| `QrSessionRepository` | `qr_payment_sessions` | `carts`, `cart_items`, `payments`, `orders` | `short_code`와 token 검증 분리 |
| `PaymentRepository` | `payments`, `payment_events` | `orders`, `audit_logs` | `mock_payment_id`와 `real_pg_tid` 혼동 금지 |
| `InventoryRepository` | `product_options`, `inventory_movements` | `external_inventory_sync_logs` | movement append 후 summary 반영 |
| `AuditLogRepository` | `audit_logs` | financial event 후보 | append-only |
| `SettlementRepository` | `settlements`, `payouts` | `order_items`, `refund_requests` | 정산은 `order_items.company_id` 기준 |
| `NotificationLogRepository` | `notification_logs` | `orders`, `qr_payment_sessions` | 실제 발송 금지 |
| `DeliveryEventRepository` | `delivery_events`, `pickup_events` | `order_items` | 택배/현장수령 분리 |
| `ExternalInventoryRepository` | `external_inventory_sync_logs` | `products`, `product_options` | 공식 API 전 mock만 |

## 20. Batch 31 Firebase adapter stub 준비 체크리스트

실제 Firebase adapter 파일은 만들지 않는다. 생성 전 아래 입력값이 준비되어야 한다.

| 준비 항목 | 필요성 | 현재 상태 |
| --- | --- | --- |
| Firebase config | dev project 연결 | 생성/삽입 금지 |
| Emulator 사용 여부 | local rules/functions 검증 | 결정 필요 |
| Auth claims | scope 테스트 | 문서 계약 완료, 실제 연결 금지 |
| Firestore Rules | 권한 차단 | pseudo-rules 문서만 |
| Seed data | dev 검증 데이터 | dry-run 절차만 |
| Secret Manager | PG/알림/배송/재고 key | 이름만 정의, 값 생성 금지 |
| App Check | 공개 클라이언트 abuse 완화 | 적용 범위 미정 |
| Contract tests | mock/firebase adapter 일치 검증 | 후보만 문서화 |

## 21. Batch 63 DTO versioning 계약

| DTO | version 후보 | 변경 정책 |
| --- | --- | --- |
| `ProductSummary` | `v1` | 필드 추가는 허용, 의미 변경 금지 |
| `QrSessionView` | `v1` | token 원문 추가 금지 |
| `OrderView` | `v1` | 개인정보 원문 추가 금지 |
| `PaymentView` | `v1` | mock/real PG 필드 분리 유지 |
| `SettlementView` | `v1` | order_items 기준 계산 유지 |
| `ErrorStateView` | `v1` | code enum 후방 호환 |
| `RiskBadgeView` | `v1` | level enum 후방 호환 |

## 22. Batch 64 contract test acceptance 후보

실제 테스트 파일은 만들지 않는다.

| 테스트 | 통과 기준 |
| --- | --- |
| scope 차단 | 다른 `company_id`/`nursery_id` 데이터 미노출 |
| QR 만료 | expired QR은 payment prepare 실패 |
| QR 재사용 | used QR은 order 재생성 금지 |
| 금액 재계산 | item sum과 payment amount 불일치 시 실패 |
| 재고 부족 | `OUT_OF_STOCK` 반환 |
| 정산 계산 | `order_items.company_id` 기준 합계 |
| 개인정보 | 원문 phone/token/secret 미반환 |
| mock/prod 분리 | mock_tid와 pg_tid 혼용 없음 |

## 23. Batch 65 rollout readiness contract

| 단계 | repository 조건 |
| --- | --- |
| mock beta | mock repository만 사용, 외부 provider blocked |
| contract test | mock repository가 DTO/error/risk 계약 충족 |
| emulator candidate | Firebase adapter 후보가 같은 contract 충족 |
| dev adapter | dev Firebase만, Secret test scope |
| prod candidate | 모든 C등급 gate 승인 후 |
