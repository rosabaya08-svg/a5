# Firestore Schema Plan

작성일: 2026-05-20

## 1. 목적

현재 `data/**` mock 원장을 실제 Firestore로 전환하기 전 컬렉션 구조와 보존 원칙을 정의한다. 이 문서는 설계 초안이며 실제 Firestore 연결이나 Rules 파일을 만들지 않는다.

## 2. 최상위 컬렉션 초안

| 컬렉션 | 목적 | 주요 접근 주체 |
| --- | --- | --- |
| `companies` | 입점사 정보, 상태, 수수료율 | SUPER_ADMIN, COMPANY_ADMIN |
| `nurseries` | 산후조리원 정보 | SUPER_ADMIN, NURSERY_ADMIN |
| `rooms` | 객실 정보 | SUPER_ADMIN, NURSERY_ADMIN |
| `tablets` | 태블릿 장치/세션 정보 | SUPER_ADMIN, NURSERY_ADMIN, TABLET_DEVICE |
| `products` | 상품 원장 | SUPER_ADMIN, COMPANY_ADMIN, TABLET_DEVICE read |
| `product_options` | 옵션/재고 | SUPER_ADMIN, COMPANY_ADMIN, TABLET_DEVICE read |
| `inventory_movements` | 재고 차감/복구/동기화 이력 | SUPER_ADMIN, COMPANY_ADMIN |
| `carts` | 태블릿 장바구니 | TABLET_DEVICE, server |
| `cart_items` | 장바구니 상세 | TABLET_DEVICE, server |
| `qr_payment_sessions` | QR/조르기 세션 | TABLET_DEVICE, guest token, server |
| `orders` | 주문 헤더 | SUPER_ADMIN, NURSERY_ADMIN scoped, guest token |
| `order_items` | 입점사별 주문상세/정산 기준 | SUPER_ADMIN, COMPANY_ADMIN scoped |
| `payments` | PG 승인/실패/TID 원장 | SUPER_ADMIN, server |
| `payment_events` | 결제 이벤트 이력 | SUPER_ADMIN, server |
| `refunds` | 취소/환불 요청/검토 | SUPER_ADMIN, COMPANY_ADMIN scoped, guest token |
| `delivery_events` | 송장/배송 상태 | SUPER_ADMIN, COMPANY_ADMIN scoped, guest token |
| `pickup_events` | 현장수령 상태 | SUPER_ADMIN, NURSERY_ADMIN scoped, COMPANY_ADMIN scoped |
| `settlements` | 입점사별 정산 snapshot | SUPER_ADMIN, COMPANY_ADMIN scoped |
| `payouts` | 지급 예정/검토/완료 기록 | SUPER_ADMIN only |
| `notification_logs` | 알림톡/SMS/email 발송 기록 | SUPER_ADMIN, scoped read |
| `audit_logs` | 권한/금액/상태 변경 감사 | SUPER_ADMIN, server append |
| `system_status` | 운영 상태/점검/배치 결과 | SUPER_ADMIN |
| `policies` | 수수료/배송/환불/QR 만료 정책 | SUPER_ADMIN |

## 2-1. mock 데이터 기준 변환표

현재 구현 직전 비교 대상은 `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts`이다. Firestore 전환 시 mock 배열을 그대로 저장하지 않고, 조회/권한/정산 기준이 되는 컬렉션으로 분해한다.

| mock 파일/타입 | 현재 구조 | Firestore 컬렉션 | 전환 원칙 |
| --- | --- | --- | --- |
| `mockProducts: Product[]` | 상품 기본정보, `comparison`, `optionIds`, `stock` summary | `products/{productId}` | 상품 원장. `company_id`, `status`, 가격비교 필드, 노출/배송 가능 여부를 문서에 저장 |
| `mockProductOptions: ProductOption[]` | 옵션명, 추가금액, 옵션 재고 | `product_options/{optionId}` | 옵션 원장. `product_id`, `company_id`, `stock`, `price_delta`를 명시 |
| `mockQrSessions: QrPaymentSession[]` | QR 세션, 출처, 만료, 장바구니 snapshot | `qr_payment_sessions/{qrSessionId}` | 2~3시간 만료, 1회성 사용, `items_snapshot`과 `total_amount_snapshot` 보존 |
| `QrPaymentSession.items` | 상품명/옵션/단가/수량/company snapshot | `qr_payment_sessions.items_snapshot[]` | 결제 전 금액 재계산과 고객 QR 화면 표시 기준 |
| QR 생성 전 장바구니 상태 | 태블릿 상품 선택, 수량, 수령방식 후보 | `carts/{cartId}`, `cart_items/{cartItemId}` | QR 생성 전 임시 원장. QR 생성 후에는 QR snapshot을 기준으로 결제 |
| `mockOrders: Order[]` | 주문 헤더, 고객 마스킹, 총액, `itemIds` | `orders/{orderId}` | 고객 결제 단위. 개인정보는 원문 저장 최소화, phone hash/masked 분리 |
| `mockOrderItems: OrderItem[]` | 입점사별 상품 snapshot, 배송상태, 정산액 | `order_items/{orderItemId}` | 정산 기준 원장. `orders` 총액이 아니라 `order_items.company_id` 기준 |
| `mockPayments: Payment[]` | mock TID, 결제 상태, 승인시각 | `payments/{paymentId}` + `payment_events/{eventId}` | PG mock에서 실연동 전환 시 이벤트 이력 append |
| order item 정산 값 | 입점사별 판매액, 수수료, 환불 차감 후보 | `settlements/{settlementId}` | 기간별 정산 snapshot. 실제 지급은 별도 승인 전 금지 |
| `mockAuditLogs: AuditLog[]` | 권한/상태 변경 기록 | `audit_logs/{auditLogId}` | 권한, 금액, 상태 변경은 server append only |

## 2-2. 컬렉션별 문서 ID 전략

| 컬렉션 | 권장 ID | 이유 |
| --- | --- | --- |
| `products` | 기존 `product-*` 또는 자동 ID + `product_code` | mock seed와 운영 생성 모두 수용 |
| `product_options` | 기존 `opt-*` 또는 `productId_optionKey` | 옵션 단독 조회와 재고 검산 필요 |
| `carts` | 자동 ID 또는 `tabletId_active` 후보 | 태블릿별 active cart가 1개인지 정책 결정 필요 |
| `cart_items` | 자동 ID, `cart_id` + `product_id` + `option_id` 인덱스 | QR 생성 전 수량 변경과 중복 옵션 병합 필요 |
| `qr_payment_sessions` | 자동 ID, `short_code` 별도 unique 검증 | 짧은 URL 코드는 노출값이므로 내부 ID와 분리 |
| `orders` | 자동 ID, `order_no` 별도 unique 검증 | 고객 조회용 주문번호와 내부 ID 분리 |
| `order_items` | 자동 ID, `order_id` + `company_id` 인덱스 | 입점사별 정산/배송 조회 최적화 |
| `payments` | 자동 ID, `order_id` 인덱스 | PG 승인/취소 이벤트 확장 대비 |
| `settlements` | `company_id_period` 또는 자동 ID + unique key | 기간별 확정 snapshot 중복 방지 |
| `audit_logs` | 자동 ID | append-only 로그 |

## 3. 핵심 문서 구조 예시

### `products/{productId}`

- `company_id`: 입점사 scope
- `name`: 상품명
- `category`: 카테고리
- `status`: `draft`, `pending_approval`, `approved`, `rejected`, `suspended`, `archived`
- `price`: 현재 폐쇄몰 판매가
- `stock_summary`: 옵션 합산 또는 대표 재고
- `external_product_code`: 외부 재고 API 매핑 코드. 없을 수 있음
- `comparison.list_price`: 정상가
- `comparison.platform_lowest_price`: 플랫폼 최저가
- `comparison.closed_mall_price`: 폐쇄몰가
- `option_ids`: 옵션 문서 ID 배열
- `thumbnail_placeholder`: 현재 mock placeholder/tone. Storage 전환 전 임시
- `delivery_methods`: `pickup`, `delivery` 후보
- `created_at`
- `updated_at`
- `approved_at`
- `approved_by`

### `product_options/{optionId}`

- `product_id`
- `company_id`
- `name`
- `price_delta`
- `stock`
- `safety_stock`
- `status`: `active`, `sold_out`, `suspended`
- `updated_at`

### `qr_payment_sessions/{qrSessionId}`

- `short_code`: 고객 QR URL 노출 코드
- `type`: `purchase` 또는 `ask`
- `status`: `active`, `paid`, `expired`, `cancelled`
- `nursery_id`
- `room_id`
- `tablet_id`
- `cart_id`
- `items_snapshot`
- `delivery_method`
- `total_amount_snapshot`
- `expires_at`
- `used_at`
- `created_at`
- `token_hash`
- `payer_type`: `self`, `third_party` 후보
- `source_snapshot`: 조리원/객실/태블릿 표시용 snapshot

`items_snapshot[]` 최소 필드:

- `product_id`
- `company_id`
- `product_name`
- `option_id`
- `option_name`
- `unit_price`
- `quantity`
- `line_amount`

### `orders/{orderId}`

- `order_no`
- `qr_session_id`
- `nursery_id`
- `room_id`
- `customer_name_masked`
- `customer_phone_hash`
- `customer_phone_masked`
- `status`
- `delivery_method`
- `total_amount`
- `item_count`
- `paid_at`
- `created_at`
- `payment_id`
- `token_hash`

### `order_items/{orderItemId}`

- `order_id`
- `company_id`
- `product_id`
- `product_name_snapshot`
- `option_name_snapshot`
- `unit_price_snapshot`
- `quantity`
- `line_amount`
- `delivery_status`
- `settlement_amount`
- `settlement_status`
- `created_at`

### `payments/{paymentId}`

- `order_id`
- `order_no`
- `qr_session_id`
- `status`: `ready`, `approved_mock`, `failed_mock`, `cancel_requested`, `cancelled_mock`, 추후 PG 실상태
- `amount`
- `mock_tid`: mock 단계 전용
- `pg_tid`: 실연동 전환 후 PG 거래 ID
- `approved_at`
- `created_at`

### `inventory_movements/{movementId}`

- `product_id`
- `option_id`
- `company_id`
- `type`: `reserve`, `deduct`, `restore`, `external_sync`, `manual_adjust`
- `quantity`
- `reason`
- `source_id`: `qr_session_id`, `order_id`, `refund_id`, external sync id
- `created_at`
- `created_by`

### `carts/{cartId}`

- `cart_id`
- `nursery_id`
- `room_id`
- `tablet_id`
- `status`: `active`, `converted_to_qr`, `abandoned`, `expired`
- `delivery_method`: `pickup`, `delivery`, `undecided`
- `estimated_total`: 화면 표시용 추정 금액. 결제 기준 금액이 아님
- `item_count`
- `qr_session_id`: QR 생성 후 연결 후보
- `created_at`
- `updated_at`
- `expires_at`: 장시간 방치 cart 정리 후보

### `cart_items/{cartItemId}`

- `cart_id`
- `nursery_id`
- `room_id`
- `tablet_id`
- `product_id`
- `option_id`
- `company_id`
- `quantity`
- `unit_price_snapshot`: 장바구니 표시용 snapshot. QR 생성 시 다시 검증
- `line_amount`
- `status`: `active`, `removed`, `converted_to_qr`
- `created_at`
- `updated_at`

### `settlements/{settlementId}`

- `company_id`
- `period`: `YYYY-MM` 또는 정산 회차 key
- `status`: `draft`, `review`, `confirmed_mock`, `payout_blocked`, `paid`
- `order_item_ids`
- `gross_amount`
- `refund_amount`
- `commission_rate_snapshot`
- `commission_amount`
- `payout_amount`
- `blocked_reason`: 실제 지급 전 차단 사유
- `created_at`
- `confirmed_at`
- `confirmed_by`

`paid`는 실제 지급 완료를 의미하므로 mock/test 베타에서는 사용하지 않는다. 베타에서는 `confirmed_mock` 또는 `payout_blocked`까지만 허용한다.

### `audit_logs/{auditLogId}`

- `actor_type`: `system`, `super_admin`, `company_admin`, `nursery_admin`, `tablet_device`, `guest`
- `actor_id`
- `actor_role`
- `action`
- `target_type`
- `target_id`
- `scope.company_id`
- `scope.nursery_id`
- `scope.room_id`
- `scope.tablet_id`
- `before_snapshot`
- `after_snapshot`
- `metadata`
- `created_at`

`audit_logs`에는 원문 전화번호, 원문 QR token, PG secret, service account key를 저장하지 않는다.

## 3-1. mock 필드와 Firestore 필드명 매핑

Firestore에서는 문서 간 일관성을 위해 snake_case를 기본으로 둔다.

| TypeScript 필드 | Firestore 필드 | 비고 |
| --- | --- | --- |
| `companyId` | `company_id` | 권한 scope 필드 |
| `nurseryId` | `nursery_id` | 조리원 scope 필드 |
| `roomId` | `room_id` | QR 출처/조리원 권한 |
| `tabletId` | `tablet_id` | 태블릿 출처 |
| `cartId` | `cart_id` | QR 생성 원본 |
| `shortCode` | `short_code` | 고객 URL 노출 코드 |
| `listPrice` | `comparison.list_price` | 가격비교 표시 |
| `platformLowestPrice` | `comparison.platform_lowest_price` | 가격비교 표시 |
| `closedMallPrice` | `comparison.closed_mall_price` | 가격비교 표시 |
| `totalAmount` | `total_amount_snapshot` 또는 `total_amount` | QR은 snapshot, 주문은 확정 금액 |
| `mockTid` | `mock_tid` | 운영 PG 전환 전용 mock 값 |
| `itemIds` | `item_ids` 또는 `order_items` query | 운영에서는 `order_items.order_id` 조회 권장 |

## 4. 인덱스 후보

- `products`: `company_id + status`
- `products`: `status + category`
- `carts`: `tablet_id + status`
- `cart_items`: `cart_id + status`
- `qr_payment_sessions`: `short_code`
- `qr_payment_sessions`: `status + expires_at`
- `qr_payment_sessions`: `nursery_id + room_id + created_at`
- `orders`: `nursery_id + created_at`
- `orders`: `order_no`
- `orders`: `qr_session_id`
- `order_items`: `company_id + created_at`
- `order_items`: `order_id`
- `inventory_movements`: `product_id + created_at`
- `inventory_movements`: `company_id + created_at`
- `payments`: `order_id`
- `settlements`: `company_id + period`
- `audit_logs`: `created_at`
- `audit_logs`: `target`

## 5. 보존/트랜잭션 원칙

- 주문 생성 시 상품/옵션/가격 snapshot 저장
- 결제 승인 전 `orders.status = paid` 금지
- QR 사용 처리와 결제 승인, 주문 생성은 서버 트랜잭션 또는 보상 로직 필요
- QR은 paid/expired/cancelled 이후 재사용 금지
- 재고 변경은 `inventory_movements` append 후 summary 반영
- 정산은 `order_items` 기준, 기간별 snapshot으로 확정
- 금액/권한/상태 변경은 `audit_logs` append

## 6. 구현 직전 체크리스트

1. Firestore Rules 권한 매트릭스가 `company_id`, `nursery_id`, `tablet_id`, guest token 범위를 모두 설명해야 한다.
2. `short_code`, `order_no` unique 보장 방식은 Cloud Functions 또는 서버 로직에서 처리한다.
3. QR 생성 시 상품/옵션/가격/수령방식 snapshot을 먼저 만들고, 결제 시 다시 서버에서 재계산한다.
4. 결제 승인 callback은 QR 상태, 만료, `token_hash`, 금액, 재고를 동시에 검증해야 한다.
5. 재고 차감은 `product_options.stock` 직접 수정만 하지 않고 `inventory_movements`를 함께 남겨야 한다.
6. Storage 보류 동안 상품 이미지/GIF는 placeholder 필드를 사용하고, 실제 URL 필드는 별도 승인 전까지 비워 둔다.

## 7. 현재 금지

이 계획을 바탕으로 실제 Firestore 연결 코드, `firebase.json`, rules 파일, `.env`를 만들지 않는다.

## 8. 5일 베타 계약 확정 범위

이 섹션은 mock/test 베타에서 실제 Firebase 전환 전까지 고정할 데이터 계약이다. 아직 Firestore 컬렉션을 만들지 않으며, 화면과 mock repository가 같은 명칭과 상태값을 사용하도록 기준만 확정한다.

| 영역 | 베타 계약 | 실제 연결 전 확인 |
| --- | --- | --- |
| 상품 | `products`와 `product_options` 분리, 상품 승인은 `status`로 관리 | 승인권자, 반려 사유 저장 위치 |
| 장바구니 | `carts`와 `cart_items`는 태블릿 scope에 종속 | guest가 장바구니 원장에 직접 접근하지 않는지 |
| QR | `qr_payment_sessions`는 결제 전 snapshot과 token hash를 보존 | `short_code` unique 보장 방식 |
| 주문 | `orders`는 고객 결제 단위, `order_items`는 입점사 정산 단위 | 주문번호 unique, 개인정보 최소 저장 |
| 결제 | `payments`와 `payment_events` 분리 | PG callback 검증 방식 |
| 재고 | `inventory_movements` append 후 summary 반영 | 동시 결제 race condition 처리 |
| 정산 | `settlements`는 기간별 snapshot | 수수료율, 환불 차감 정책 |
| 감사 | `audit_logs`는 server append only | Rules보다 서버 검증 우선 |

## 9. 컬렉션별 필수 필드 게이트

아래 필드는 실제 Firestore 전환 전 누락되면 안 되는 최소 게이트다.

| 컬렉션 | 필수 scope 필드 | 필수 상태 필드 | 금액/snapshot 필드 |
| --- | --- | --- | --- |
| `companies` | `company_id` | `status` | `commission_rate` |
| `nurseries` | `nursery_id` | `status` | 없음 |
| `rooms` | `nursery_id`, `room_id` | `status` | 없음 |
| `tablets` | `nursery_id`, `room_id`, `tablet_id` | `status`, `last_seen_at` | 없음 |
| `products` | `company_id` | `status` | `price`, `comparison` |
| `product_options` | `company_id`, `product_id` | `status` | `price_delta`, `stock` |
| `carts` | `nursery_id`, `room_id`, `tablet_id` | `status` | `estimated_total` |
| `cart_items` | `cart_id`, `product_id`, `option_id` | `status` | `unit_price_snapshot`, `line_amount` |
| `qr_payment_sessions` | `nursery_id`, `room_id`, `tablet_id` | `status`, `expires_at` | `items_snapshot`, `total_amount_snapshot` |
| `orders` | `nursery_id`, `room_id`, `qr_session_id` | `status` | `total_amount`, `payment_id` |
| `order_items` | `order_id`, `company_id`, `product_id` | `delivery_status`, `settlement_status` | `unit_price_snapshot`, `line_amount`, `settlement_amount` |
| `payments` | `order_id`, `qr_session_id` | `status` | `amount`, `mock_tid` 또는 `pg_tid` |
| `inventory_movements` | `company_id`, `product_id`, `option_id` | `type` | `quantity` |
| `settlements` | `company_id`, `period` | `status` | `gross_amount`, `refund_amount`, `commission_amount`, `payout_amount` |
| `audit_logs` | `actor_role`, `target_type`, `target_id` | `action` | 변경 전후 값 snapshot |

## 10. Rules 초안 - 문서 전용

`firestore.rules` 파일은 만들지 않는다. 아래는 실제 Rules 작성 전 검토용 문서 초안이다.

| 접근 주체 | 허용 원칙 | 차단 원칙 |
| --- | --- | --- |
| `SUPER_ADMIN` | 운영 데이터 read, 승인/검토 상태 write | 결제 승인, 환불 실행, 정산 지급은 서버 action만 |
| `COMPANY_ADMIN` | 자기 `company_id` 상품 read/write, 자기 주문상세 read, 배송 상태 후보 write | 다른 회사 상품/정산/주문 접근 |
| `NURSERY_ADMIN` | 자기 `nursery_id` 객실/태블릿/QR/현장수령 read | 다른 조리원 주문/객실/태블릿 접근 |
| `TABLET_DEVICE` | 자기 `tablet_id` 장바구니 작성, 승인 상품 read, QR 생성 요청 | 주문 확정, 결제 상태 변경, 재고 차감 |
| guest QR | token 검증 후 해당 QR/주문 제한 read | 컬렉션 list, 상품 원장 직접 read, 결제 상태 직접 write |
| server | QR 생성, 결제 준비, 주문 확정, 재고 차감, audit append | IAM 오남용 방지를 위해 service account 최소 권한 |

## 11. App Check, IAM, Server SDK 우회 위험

- App Check는 공개 웹/태블릿 클라이언트에서 비정상 호출을 줄이는 보조 장치로 둔다. 권한 검증의 유일한 근거로 쓰지 않는다.
- Cloud Functions나 서버 SDK는 Firestore Rules를 우회할 수 있으므로, 모든 mutation은 claims와 문서 scope를 서버 코드에서 다시 검증해야 한다.
- service account는 기능별 최소 권한을 원칙으로 한다. 최고 권한 key를 로컬에 저장하지 않는다.
- guest QR token은 원문 저장 금지, `token_hash`와 만료 시각만 저장한다.
- `short_code`는 추측 가능성을 낮추고, token 없이 code만으로 결제/주문 조회를 허용하지 않는다.
- 결제 금액, 재고, 정산 금액은 클라이언트 표시값을 신뢰하지 않는다.

## 12. dev/prod 분리와 Emulator 검토

| 항목 | dev | prod |
| --- | --- | --- |
| Firebase project | 별도 dev project 권장 | 운영 project |
| Auth 사용자 | 테스트 운영자만 | 승인된 운영자만 |
| PG | mock 또는 PG test key | 운영 PG key, 별도 승인 |
| Storage | placeholder 우선 | Blaze/비용/권한 승인 후 |
| Functions | Emulator 또는 dev deploy 후보 | 대표 승인 후 |
| Rules | 문서 초안 검토 후 Emulator 테스트 | 테스트 통과 후 배포 |

Emulator는 Rules, Auth claims, QR 만료, 주문 snapshot 검증에 유용하다. 단, 지금 단계에서는 Emulator 설정 파일도 만들지 않는다.

## 13. 상태 UI와 검색/정렬 지원 필드 계약

실제 UI 코드를 만들지 않고, admin/company/nursery/tablet/guest 화면이 공통으로 사용할 상태 표시 계약만 정의한다.

### 공통 위험 상태 배지

| 값 | 의미 | 대표 사용처 |
| --- | --- | --- |
| `normal` | 정상 | 승인 상품, 정상 QR, 결제 완료 주문 |
| `watch` | 확인 필요 | 재고 부족 임박, 만료 임박 QR, 검토 대기 정산 |
| `risk` | 위험 | 금액 불일치, scope 불일치 의심, 중복 callback |
| `blocked` | 진행 차단 | 실제 PG/배송/알림/재고 API 미연결, 지급 차단 |

위험 배지는 문서 원장의 `status`, `risk_level`, `blocked_reason`, `expires_at`, `stock`, `settlement_status`를 조합해 표시한다. 실제 계산은 UI가 아니라 server/service 경계에서 수행하는 것을 권장한다.

### 빈 상태 UI 계약

| 화면 | 빈 상태 조건 | 표시해야 할 안전한 설명 |
| --- | --- | --- |
| 상품 목록 | approved 상품 0건 | 승인된 상품이 아직 없다는 안내 |
| 장바구니 | active cart item 0건 | QR 생성 불가, 상품 선택 필요 |
| QR 이력 | scope 내 QR 0건 | 선택한 기간에 QR 이력이 없음 |
| 주문 목록 | scope 내 주문 0건 | 선택한 필터에 주문이 없음 |
| 정산 목록 | period 내 settlement 0건 | 정산 생성 전 상태 |
| 감사 로그 | filter 결과 0건 | 조건에 맞는 로그가 없음 |

빈 상태는 Firestore 문서 생성을 의미하지 않는다. 조회 결과가 0건일 때 UI가 해석할 상태다.

### 오류 상태 UI 계약

| 오류 코드 | UI 상태 | 기록 위치 |
| --- | --- | --- |
| `NOT_FOUND` | 대상 없음 | 필요 시 `audit_logs` 조회 실패 요약 |
| `FORBIDDEN_SCOPE` | 권한 없음 | `audit_logs`에 actor/scope/target 기록 후보 |
| `QR_EXPIRED` | 만료된 QR | `qr_payment_sessions.status = expired` |
| `QR_ALREADY_USED` | 이미 사용된 QR | `qr_payment_sessions.used_at` |
| `AMOUNT_MISMATCH` | 금액 재계산 불일치 | `payment_events`, `audit_logs` |
| `OUT_OF_STOCK` | 재고 부족 | `inventory_movements` 후보 또는 상품 상태 |
| `INVALID_STATUS_TRANSITION` | 상태 변경 불가 | `audit_logs` |
| `EXTERNAL_BLOCKED` | 외부 연동 차단 | `blocked_reason`, `system_status` |
| `CONFIG_REQUIRED` | 설정 필요 | `system_status`, blockers 문서 |

### 필터/검색/정렬 계약

| 컬렉션 | 필터 후보 | 검색 후보 | 정렬 후보 |
| --- | --- | --- | --- |
| `products` | `company_id`, `status`, `category`, `risk_level` | `name`, `external_product_code` | `updated_at`, `price`, `stock_summary` |
| `qr_payment_sessions` | `nursery_id`, `room_id`, `tablet_id`, `status`, `expires_at` | `short_code` | `created_at`, `expires_at`, `total_amount_snapshot` |
| `orders` | `nursery_id`, `status`, `delivery_method`, `created_at` | `order_no`, `customer_phone_masked` | `created_at`, `paid_at`, `total_amount` |
| `order_items` | `company_id`, `delivery_status`, `settlement_status` | `product_name_snapshot`, `order_id` | `created_at`, `line_amount`, `settlement_amount` |
| `settlements` | `company_id`, `period`, `status` | `settlement_id` | `period`, `gross_amount`, `payout_amount` |
| `audit_logs` | `actor_type`, `action`, `target_type`, `created_at` | `target_id`, `actor_id` | `created_at` |

Firestore 전환 시 full text 검색이 필요하면 별도 검색 서비스 또는 제한된 prefix/search key 전략이 필요하다. 현재는 문서상 후보만 남긴다.

### 상세 페이지 mock 계약

상세 화면은 원장 문서 하나만 표시하지 않고, 아래 조합 view를 사용한다.

| 상세 화면 | 필요한 원장 |
| --- | --- |
| 상품 상세 | `products`, `product_options`, 최근 `inventory_movements` |
| QR 상세 | `qr_payment_sessions`, 연결 `cart`, `cart_items`, payment/order 후보 |
| 주문 상세 | `orders`, `order_items`, `payments`, `delivery_events`, `pickup_events`, `refunds` |
| 정산 상세 | `settlements`, 포함 `order_items`, 환불 차감 후보 |
| 감사 로그 상세 | `audit_logs`, 관련 target snapshot |

### 모바일/태블릿 반응형 데이터 원칙

- 모바일/태블릿 화면은 개인정보와 금액 필드를 더 적게 노출한다.
- QR/주문 조회 화면은 원문 고객정보 대신 masked/hash 기반 필드만 사용한다.
- 리스트 화면은 핵심 상태와 금액만 표시하고, 상세 화면에서 snapshot을 펼친다.
- 태블릿 화면은 `tablet_id`, `room_id`, `nursery_id` source banner를 항상 표시할 수 있어야 한다.

## 14. Batch 01-03 컬렉션 확정 매트릭스

아래 표는 실제 Firestore 연결 전 고정할 컬렉션별 문서 계약이다. 실제 컬렉션 생성은 하지 않는다.

| 컬렉션 | 문서 ID 전략 | 필수 필드 | 선택 필드 | 생성 주체 | 수정 주체 |
| --- | --- | --- | --- | --- | --- |
| `products` | 자동 ID 또는 `product-*`; `product_code` 별도 | `company_id`, `name`, `status`, `price`, `created_at` | `comparison`, `option_ids`, `external_product_code`, `risk_level` | COMPANY_ADMIN draft, SUPER_ADMIN seed | COMPANY_ADMIN 자기 상품, SUPER_ADMIN 승인/정지 |
| `product_options` | 자동 ID 또는 `productId_optionKey` | `product_id`, `company_id`, `name`, `stock`, `status` | `price_delta`, `safety_stock`, `external_sku` | COMPANY_ADMIN | COMPANY_ADMIN 자기 옵션, server 재고 반영 |
| `carts` | 자동 ID 또는 `tabletId_active` 후보 | `cart_id`, `nursery_id`, `room_id`, `tablet_id`, `status` | `delivery_method`, `estimated_total`, `expires_at` | TABLET_DEVICE | TABLET_DEVICE, server QR 전환 |
| `cart_items` | 자동 ID | `cart_id`, `product_id`, `option_id`, `quantity`, `status` | `unit_price_snapshot`, `line_amount` | TABLET_DEVICE | TABLET_DEVICE, server QR 전환 |
| `qr_payment_sessions` | 자동 ID; `short_code` unique 별도 | `qr_session_id`, `short_code`, `token_hash`, `status`, `expires_at` | `payer_type`, `source_snapshot`, `risk_level` | server from TABLET_DEVICE request | server only |
| `orders` | 자동 ID; `order_no` unique 별도 | `order_id`, `order_no`, `qr_session_id`, `status`, `total_amount` | `customer_name_masked`, `customer_phone_hash`, `payment_id` | server payment confirm | server only, admin status review 후보 |
| `order_items` | 자동 ID | `order_item_id`, `order_id`, `company_id`, `product_id`, `line_amount` | `delivery_status`, `settlement_status`, `refund_id` | server order creation | COMPANY_ADMIN 배송 후보, server 정산/환불 |
| `payments` | 자동 ID | `payment_id`, `order_id`, `qr_session_id`, `status`, `amount` | `mock_tid`, `pg_tid`, `failure_reason` | server payment prepare | server callback/mock confirm |
| `inventory_movements` | 자동 ID | `movement_id`, `product_id`, `option_id`, `type`, `quantity` | `source_id`, `external_sync_id`, `failure_reason` | server | append-only |
| `settlements` | `company_id_period` 또는 자동 ID + unique key | `settlement_id`, `company_id`, `period`, `status` | `gross_amount`, `commission_amount`, `payout_amount`, `blocked_reason` | server batch/mock preview | SUPER_ADMIN review, server recompute |
| `payouts` | 자동 ID; `settlement_id` 인덱스 | `payout_id`, `settlement_id`, `company_id`, `status` | `scheduled_at`, `paid_at`, `bank_account_masked`, `blocked_reason` | SUPER_ADMIN review 후보 | server/admin, 실제 지급은 별도 승인 |
| `notification_logs` | 자동 ID | `notification_id`, `channel`, `status`, `target_type`, `target_id` | `template_code`, `provider_message_id`, `failure_reason`, `retry_count` | server/mock notifier | server retry only |
| `audit_logs` | 자동 ID | `audit_id`, `actor_type`, `action`, `target_type`, `target_id`, `created_at` | `before_snapshot`, `after_snapshot`, `metadata` | server | append-only |

### 상태값 확정

| 컬렉션 | 상태 필드 | 허용 상태 |
| --- | --- | --- |
| `products` | `status` | `draft`, `pending_approval`, `approved`, `rejected`, `suspended`, `archived` |
| `product_options` | `status` | `active`, `sold_out`, `suspended` |
| `carts` | `status` | `active`, `converted_to_qr`, `abandoned`, `expired` |
| `cart_items` | `status` | `active`, `removed`, `converted_to_qr` |
| `qr_payment_sessions` | `status` | `active`, `paid`, `expired`, `cancelled` |
| `orders` | `status` | `payment_pending`, `paid`, `delivery_pending`, `pickup_pending`, `completed`, `cancelled_mock`, `refund_requested` |
| `order_items` | `delivery_status` | `pending`, `invoice_ready_mock`, `shipping_mock`, `delivered_mock`, `pickup_ready`, `picked_up`, `blocked` |
| `order_items` | `settlement_status` | `draft`, `review`, `confirmed_mock`, `payout_blocked` |
| `payments` | `status` | `ready`, `approved_mock`, `failed_mock`, `cancel_requested`, `cancelled_mock`, `pg_pending`, `pg_approved`, `pg_failed` |
| `inventory_movements` | `type` | `reserve`, `deduct`, `restore`, `external_sync`, `manual_adjust` |
| `settlements` | `status` | `draft`, `review`, `confirmed_mock`, `payout_blocked`, `paid` |
| `payouts` | `status` | `scheduled_mock`, `blocked`, `approved_pending`, `paid_mock`, `paid` |
| `notification_logs` | `status` | `queued_mock`, `sent_mock`, `failed_mock`, `retry_scheduled`, `blocked` |
| `audit_logs` | `action` | 자유 문자열이지만 서버 정의 enum 후보만 허용 |

`paid` 계열 상태는 실제 입금/PG 운영 전에는 mock 상태와 분리해 표시한다.

## 15. Batch 03 ID 전략 상세

| ID | 전략 | 주의 |
| --- | --- | --- |
| `company_id` | 사람이 읽을 수 있는 slug 후보 + 내부 자동 ID 병행 가능 | URL/권한 scope에 노출되므로 변경 비용 큼 |
| `nursery_id` | 조리원 slug 또는 자동 ID + display code | 객실/태블릿/QR scope의 상위 키 |
| `room_id` | `nursery_id` 내부 unique, 예: `room-701` | 다른 조리원 객실번호와 충돌 가능하므로 nursery scope 필요 |
| `tablet_id` | 장치 등록 시 발급되는 불변 ID | 재발급 시 이전 장치 차단 정책 필요 |
| `cart_id` | 자동 ID, active cart unique는 server 정책 | 태블릿별 active cart 중복 방지 필요 |
| `qr_session_id` | 내부 자동 ID | `short_code`와 분리, token 없이 접근 금지 |
| `order_id` | 내부 자동 ID | 고객용 `order_no`와 분리 |
| `order_item_id` | 내부 자동 ID | 정산/배송은 `company_id + order_id` 인덱스 사용 |
| `payment_id` | 내부 자동 ID | PG TID와 분리 |
| `settlement_id` | `company_id_period` 또는 자동 ID + unique key | 기간별 중복 정산 방지 |
| `payout_id` | 자동 ID | 실제 지급 추적은 지급 provider ID와 분리 |
| `notification_id` | 자동 ID | provider message ID와 분리 |
| `audit_id` | 자동 ID | append-only, 사람이 만드는 ID 금지 |

## 16. Batch 06 Index 후보 확정

| 컬렉션 | 인덱스 후보 | 사용 화면/로직 |
| --- | --- | --- |
| `products` | `company_id + status + created_at` | 기업 상품 목록, 승인 대기 |
| `products` | `status + category + created_at` | 태블릿 승인 상품 목록 |
| `product_options` | `product_id + status` | 상품 상세 옵션 |
| `product_options` | `company_id + stock` | 재고 위험 목록 |
| `carts` | `tablet_id + status + updated_at` | 태블릿 active cart 조회 |
| `cart_items` | `cart_id + status + updated_at` | 장바구니 상세 |
| `qr_payment_sessions` | `short_code` | 고객 QR 랜딩 |
| `qr_payment_sessions` | `nursery_id + status + created_at` | 조리원 QR 이력 |
| `qr_payment_sessions` | `tablet_id + status + created_at` | 태블릿 QR 이력 |
| `qr_payment_sessions` | `qr_session_id + expires_at` | 만료/결제 검증 |
| `orders` | `nursery_id + status + created_at` | 조리원 주문 이력 |
| `orders` | `order_no` | 비회원 주문조회 |
| `orders` | `qr_session_id + created_at` | QR에서 주문 역조회 |
| `order_items` | `company_id + delivery_status + created_at` | 기업 배송 처리 |
| `order_items` | `company_id + settlement_status + created_at` | 기업 정산 |
| `order_items` | `order_id + company_id` | 주문 상세 조합 |
| `payments` | `order_id + status` | 주문 결제 상태 |
| `payments` | `qr_session_id + status` | QR 결제 준비/확정 |
| `payments` | `order_id + payment_status` | PG 전환 시 alias 후보. 실제 필드는 `status`로 통일 권장 |
| `inventory_movements` | `company_id + created_at` | 기업 재고 이력 |
| `inventory_movements` | `option_id + created_at` | 옵션 재고 감사 |
| `settlements` | `company_id + period + status` | 정산 목록 |
| `payouts` | `company_id + status + scheduled_at` | 지급 대기 목록 |
| `notification_logs` | `target_type + target_id + created_at` | 주문/QR별 알림 이력 |
| `notification_logs` | `status + retry_count + created_at` | 실패 재시도 큐 |
| `audit_logs` | `target_type + target_id + created_at` | 상세 감사 타임라인 |
| `audit_logs` | `actor_type + created_at` | 운영자 활동 감사 |

실제 composite index 파일은 만들지 않는다. Firestore 연결 후 쿼리 실패 메시지와 사용 화면을 기준으로 승인된 index만 생성한다.

## 17. payouts와 notification_logs 문서 구조

### `payouts/{payoutId}`

- `payout_id`
- `settlement_id`
- `company_id`
- `period`
- `status`: `scheduled_mock`, `blocked`, `approved_pending`, `paid_mock`, `paid`
- `payout_amount`
- `bank_account_masked`
- `scheduled_at`
- `approved_by`
- `approved_at`
- `paid_at`
- `blocked_reason`
- `created_at`
- `updated_at`

실제 지급 API나 은행 연동은 금지한다. mock/test 베타에서는 `paid_mock`까지만 사용한다.

### `notification_logs/{notificationId}`

- `notification_id`
- `channel`: `alimtalk`, `sms`, `email`, `mock`
- `template_code`
- `target_type`: `qr_session`, `order`, `order_item`, `refund`, `settlement`
- `target_id`
- `recipient_masked`
- `status`: `queued_mock`, `sent_mock`, `failed_mock`, `retry_scheduled`, `blocked`
- `provider_message_id`: 실제 provider 연결 전에는 비움
- `failure_reason`
- `retry_count`
- `next_retry_at`
- `created_at`
- `updated_at`

알림 발송 성공처럼 보이는 화면은 mock 상태만 사용하며 실제 알림톡/SMS를 보내지 않는다.

## 18. Batch 17 컬렉션 lifecycle

삭제는 운영 감사와 정산 추적을 깨뜨리므로 기본 금지한다. 필요하면 `archived`, `blocked`, `cancelled_mock` 같은 상태 전이로 처리한다.

| 컬렉션 | 생성 | 수정 | 삭제 금지 | archive 여부 | audit log 필요 |
| --- | --- | --- | --- | --- | --- |
| `products` | COMPANY_ADMIN draft, seed | COMPANY_ADMIN 자기 상품, SUPER_ADMIN 승인/정지 | 예 | `archived` 허용 | 승인/반려/정지/가격 변경 |
| `product_options` | COMPANY_ADMIN | COMPANY_ADMIN, server 재고 반영 | 예 | `suspended` 권장 | 재고/가격/상태 변경 |
| `carts` | TABLET_DEVICE | TABLET_DEVICE, server QR 전환 | 예 | `abandoned`, `expired` | QR 전환/강제 만료 |
| `cart_items` | TABLET_DEVICE | TABLET_DEVICE 수량 변경, server QR 전환 | 예 | `removed` | 고가 상품 수량 변경 후보 |
| `qr_payment_sessions` | server | server only | 예 | `expired`, `canceled`, `blocked` | 생성/만료/사용/차단 |
| `orders` | server | server only, 관리자 검토 상태 후보 | 예 | `cancelled_mock` | 결제/취소/환불/완료 |
| `order_items` | server | 배송/수령/정산 상태만 제한 수정 | 예 | 없음, 주문 상태로 추적 | 배송/정산/환불 |
| `payments` | server | server callback/mock confirm | 예 | 없음 | 승인/실패/취소 |
| `inventory_movements` | server | append-only | 예 | 없음 | 자체가 감사 원장 |
| `settlements` | server batch/mock preview | SUPER_ADMIN 검토, server recompute | 예 | `payout_blocked` | 확정/차단/재계산 |
| `payouts` | SUPER_ADMIN review 후보 | server/admin 제한 | 예 | `blocked` | 지급 승인/차단/완료 mock |
| `notification_logs` | server/mock notifier | server retry only | 예 | `blocked` | 실패/재시도/차단 |
| `delivery_events` | COMPANY_ADMIN/server mock | append 또는 latest summary | 예 | 없음 | 송장/배송 상태 변경 |
| `pickup_events` | NURSERY_ADMIN/server mock | 수령 상태 변경 | 예 | 없음 | 현장수령 완료/취소 |
| `refund_requests` | guest/company/admin request | SUPER_ADMIN 검토 mock | 예 | `blocked`, `rejected_mock` | 요청/검토/차단 |
| `external_inventory_sync_logs` | server/mock sync | append-only | 예 | 없음 | sync 성공/실패 |
| `audit_logs` | server | append-only | 예 | 없음 | 자체 |

## 19. Batch 18 orders/order_items 상태 전이표

`orders`는 고객 결제 단위이고, `order_items`는 입점사 배송/정산 단위다. 정산 계산은 항상 `order_items.company_id` 기준으로 한다.

| 현재 상태 | 다음 상태 | 주체 | 조건 | 금지/주의 |
| --- | --- | --- | --- | --- |
| `draft_from_qr` | `payment_pending` | server | QR active, 금액 재계산 성공 | 고객 입력 금액 신뢰 금지 |
| `payment_pending` | `paid_mock` | server mock payment | mock 승인 성공 | 실제 PG 승인처럼 표시 금지 |
| `payment_pending` | `payment_failed` | server mock payment | mock 실패/만료/금액 불일치 | 주문 확정 금지 |
| `paid_mock` | `fulfilled` | COMPANY_ADMIN/NURSERY_ADMIN mock | 배송완료 또는 현장수령 완료 | 실제 배송조회 연동 금지 |
| `paid_mock` | `cancel_requested` | guest/admin mock | 취소 요청 접수 | 실제 PG 취소 금지 |
| `paid_mock` | `refund_requested` | guest/company/admin mock | 환불 요청 접수 | 실제 환불 실행 금지 |
| `fulfilled` | `settlement_pending` | server batch/mock | order_items 정산 후보 생성 | orders 총액 기준 정산 금지 |
| `settlement_pending` | `settlement_blocked` | SUPER_ADMIN/server | 환불/금액/정책 불일치 | 지급 금지 |
| `settlement_pending` | `fulfilled` | server/admin | 정산 재검토 취소 | audit 필요 |

`order_items` 상태는 `delivery_status`와 `settlement_status`로 분리한다.

| 축 | 상태 | 의미 |
| --- | --- | --- |
| delivery | `pending` | 입점사 처리 전 |
| delivery | `invoice_ready_mock` | 송장 입력 mock |
| delivery | `shipping_mock` | 배송중 mock |
| delivery | `delivered_mock` | 배송완료 mock |
| delivery | `pickup_ready` | 현장수령 준비 |
| delivery | `picked_up` | 현장수령 완료 |
| delivery | `blocked` | 배송/수령 차단 |
| settlement | `draft` | 정산 계산 전 |
| settlement | `review` | 검토 중 |
| settlement | `confirmed_mock` | mock 확정 |
| settlement | `payout_blocked` | 지급 차단 |

## 20. Batch 19 qr_payment_sessions 상태 전이표

| 상태 | 생성/전이 주체 | 만료 조건 | 재사용 금지 조건 | 다음 상태 |
| --- | --- | --- | --- | --- |
| `created` | server | 생성 직후 active 전 검증 실패 시 차단 후보 | token 미검증 | `active`, `blocked` |
| `active` | server from TABLET_DEVICE request | `expires_at < now` | `used_at`이 있으면 금지 | `used`, `expired`, `payment_failed`, `canceled`, `blocked` |
| `expired` | scheduler/server | 만료 시각 경과 | 항상 재사용 금지 | 없음 |
| `used` | payment/order server | 결제 승인 및 주문 생성 완료 | 항상 재사용 금지 | 없음 |
| `payment_failed` | payment mock/server | 결제 실패, 금액 불일치 | 동일 QR 재결제 허용 여부는 별도 정책 필요 | `blocked` 후보 |
| `canceled` | tablet/admin/server | 사용자/운영 취소 | 재사용 금지 | 없음 |
| `blocked` | server/admin | scope 의심, 중복 callback, 정책 위반 | 재사용 금지 | 없음 |

QR은 `short_code`만으로 접근시키지 않고 원문 token 검증을 요구한다. Firestore에는 원문 token이 아니라 `token_hash`만 둔다.

## 21. Batch 20 inventory_movements 보상 로직

| 시나리오 | movement | 처리 원칙 | 보상 로직 |
| --- | --- | --- | --- |
| 주문 예약 | `reserve` | 결제 준비 단계에서 선택 후보. mock 단계에서는 필수 아님 | 만료/실패 시 `restore` |
| 결제 성공 차감 | `deduct` | 결제 승인과 주문 생성 transaction 안에서 처리 | 실패 시 전체 rollback 또는 보상 큐 |
| 결제 실패 복구 | `restore` | reserve가 있는 경우만 복구 | 중복 restore 방지 |
| 취소 복구 | `restore` | 취소/환불 승인 mock 후 재고 복구 후보 | 실제 PG 환불 전 자동 복구 금지 |
| 외부 재고 sync 실패 | `external_sync` + `failure_reason` | 외부 API 공식 문서 전 mock failure만 | 내부 재고 덮어쓰기 금지 |

`inventory_movements`는 append-only이며, summary stock 수정은 server/service 경계에서만 수행한다.

## 22. Batch 21 payments mock 원장과 실제 PG 원장 분리

| 필드/원장 | mock 단계 | 실제 PG 전환 후 |
| --- | --- | --- |
| `payment_id` | 내부 결제 문서 ID | 내부 결제 문서 ID 유지 |
| `mock_payment_id` | mock 승인/실패 식별자 | 운영 PG와 무관, 운영에서는 비움 |
| `mock_tid` | mock 거래 표시용 | 운영 PG TID와 혼동 금지 |
| `real_pg_tid` 또는 `pg_tid` | 비움 | PG가 반환한 거래 ID |
| `status` | `ready`, `approved_mock`, `failed_mock`, `cancelled_mock` | `pg_pending`, `pg_approved`, `pg_failed`, `cancel_requested` |
| `payment_events` | mock event append | PG callback/webhook event append |

전환 조건:

1. PG 테스트 MID와 Secret Manager 정책 승인
2. callback URL과 webhook 검증 방식 승인
3. cancel/partial cancel 문서 확보
4. 중복 callback idempotency 테스트
5. mock 필드와 PG 필드가 동시에 승인 상태로 쓰이지 않도록 검증

## 23. Batch 22 refund_requests 후보

실제 환불은 금지하고 요청/검토/차단 상태만 둔다.

### `refund_requests/{refundRequestId}`

- `refund_request_id`
- `order_id`
- `order_item_id`
- `company_id`
- `payment_id`
- `requested_by`: `guest`, `company_admin`, `super_admin`
- `reason_code`
- `reason_text`
- `status`: `requested_mock`, `reviewing_mock`, `approved_mock_no_pg`, `rejected_mock`, `blocked`
- `requested_amount`
- `approved_amount_mock`
- `blocked_reason`
- `created_at`
- `reviewed_at`
- `reviewed_by`

`approved_mock_no_pg`는 운영 환불 실행이 아니라 내부 검토 승인 mock이다.

## 24. Batch 23 settlements/payouts 상세 원칙

- 정산 기준은 `orders.total_amount`가 아니라 `order_items.company_id`와 `order_items.line_amount`다.
- 하나의 주문에 여러 입점사가 섞일 수 있으므로 order header 총액으로 입점사 정산을 계산하지 않는다.
- 환불/취소 차감도 `order_items` 단위로 연결한다.
- `settlements`는 기간별 계산 snapshot이고, `payouts`는 지급 검토/차단/완료 mock 이력이다.
- 실제 지급, 은행 API, 세무/증빙 자동처리는 별도 C등급 승인 전 금지한다.

## 25. Batch 24 notification_logs 상세

| 항목 | mock/test | 실제 전환 필요 |
| --- | --- | --- |
| 알림톡 | `sent_mock`, `failed_mock` | 발송사 API, 발신 프로필, 템플릿 코드 |
| SMS fallback | `queued_mock`, `blocked` | SMS provider key, fallback 조건 |
| 템플릿 코드 | `mock_order_paid`, `mock_delivery` | 승인된 템플릿 코드 |
| 실패 재시도 | `retry_scheduled` | retry backoff, 최대 횟수 |
| 실제 발송 | 금지 | Secret, provider 계약, 수신 동의 |

수신자 원문 전화번호는 저장하지 않고 `recipient_masked` 또는 provider 전송 직전 server-only 입력으로 제한한다.

## 26. Batch 25 delivery_events와 pickup_events 분리

### `delivery_events/{deliveryEventId}`

- `delivery_event_id`
- `order_item_id`
- `company_id`
- `carrier_code_mock`
- `tracking_number_masked`
- `status`: `invoice_ready_mock`, `shipping_mock`, `delivered_mock`, `failed_mock`, `blocked`
- `handled_by`
- `created_at`

처리 주체: COMPANY_ADMIN 또는 server mock. 실제 배송조회 API 호출 금지.

### `pickup_events/{pickupEventId}`

- `pickup_event_id`
- `order_item_id`
- `nursery_id`
- `room_id`
- `status`: `pickup_ready`, `picked_up`, `pickup_cancelled_mock`, `blocked`
- `handled_by`
- `picked_up_at`
- `created_at`

처리 주체: NURSERY_ADMIN 또는 server mock. 실제 고객 신원 확인 원문 저장 금지.

## 27. Batch 26 external_inventory_sync_logs 후보

외부 명품몰 재고 API는 공식 문서, 테스트 계정, rate limit, 장애 응답표 확보 전까지 mock만 가능하다.

### `external_inventory_sync_logs/{syncLogId}`

- `sync_log_id`
- `company_id`
- `product_id`
- `option_id`
- `external_product_id`
- `external_sku`
- `status`: `success_mock`, `failed_mock`, `partial_mock`, `blocked`
- `requested_stock`
- `received_stock`
- `failure_reason`
- `rate_limit_reset_at`
- `created_at`

실패해도 내부 재고를 자동으로 0 처리하지 않는다. 운영자 검토 또는 다음 sync까지 기존 내부 재고를 유지한다.

## 28. Batch 27 쿼리별 상세 Index 후보

| 화면/로직 | 쿼리 조건 | 정렬 | 후보 index |
| --- | --- | --- | --- |
| 최고관리자 상품 승인 | `status = pending_approval` | `created_at desc` | `products(status, created_at)` |
| 기업 상품 목록 | `company_id`, `status` | `updated_at desc` | `products(company_id, status, updated_at)` |
| 태블릿 상품 목록 | `status = approved`, `category` | `created_at desc` | `products(status, category, created_at)` |
| 장바구니 | `cart_id`, `status = active` | `updated_at asc` | `cart_items(cart_id, status, updated_at)` |
| QR 만료 배치 | `status = active`, `expires_at < now` | `expires_at asc` | `qr_payment_sessions(status, expires_at)` |
| 조리원 QR 이력 | `nursery_id`, `status` | `created_at desc` | `qr_payment_sessions(nursery_id, status, created_at)` |
| 비회원 주문조회 | `order_no` | 없음 | `orders(order_no)` |
| 조리원 주문 목록 | `nursery_id`, `status` | `created_at desc` | `orders(nursery_id, status, created_at)` |
| 기업 배송 목록 | `company_id`, `delivery_status` | `created_at desc` | `order_items(company_id, delivery_status, created_at)` |
| 기업 정산 후보 | `company_id`, `settlement_status` | `created_at desc` | `order_items(company_id, settlement_status, created_at)` |
| 결제 조회 | `order_id`, `status` | `created_at desc` | `payments(order_id, status, created_at)` |
| 정산 목록 | `company_id`, `period`, `status` | `period desc` | `settlements(company_id, period, status)` |
| 지급 대기 | `company_id`, `status` | `scheduled_at asc` | `payouts(company_id, status, scheduled_at)` |
| 알림 실패 재시도 | `status`, `retry_count` | `created_at asc` | `notification_logs(status, retry_count, created_at)` |
| 감사 타임라인 | `target_type`, `target_id` | `created_at desc` | `audit_logs(target_type, target_id, created_at)` |

## 29. Batch 42 개인정보/주문정보 보관 원칙

| 정보 | 저장 원칙 | 화면 노출 |
| --- | --- | --- |
| 고객 이름 | 가능하면 원문 저장 금지, `customer_name_masked` | 마스킹 |
| 휴대폰 | `customer_phone_hash`, `customer_phone_masked` | 마스킹 |
| 주소 | 배송에 필요한 최소 필드만 server-only 후보 | 관리자 최소 노출 |
| 배송정보 | 송장번호는 마스킹 또는 일부 표시 | 입점사/고객 제한 노출 |
| QR token | 원문 저장 금지, `token_hash` | 노출 금지 |
| 주문번호 | 고객 조회용 노출 가능 | `order_no` |
| 결제 TID | 운영 PG 전환 전 비움 | 관리자 제한 |

삭제/보관 정책은 법무/개인정보 검토 전 확정하지 않는다. mock/test 단계에서는 실제 개인정보를 seed에 넣지 않는다.

## 30. Batch 43 audit_logs와 financial_events 구분

`audit_logs`는 권한/상태/운영 행위 감사이고, `financial_events`는 금액 변경 추적 후보 원장이다. 실제 컬렉션 생성은 보류한다.

| 이벤트 | audit_logs | financial_events 후보 |
| --- | --- | --- |
| 권한 변경 | 필수 | 불필요 |
| 주문 상태 변경 | 필수 | 금액 영향 없으면 불필요 |
| 결제 승인/실패 | 필수 | 필수 후보 |
| 환불 요청/승인 mock | 필수 | 금액 변경 시 후보 |
| 정산 확정/차단 | 필수 | 필수 후보 |
| 지급 완료 mock | 필수 | 필수 후보 |

`financial_events` 후보 필드: `event_id`, `event_type`, `order_id`, `order_item_id`, `company_id`, `amount`, `currency`, `source_id`, `created_at`. 실제 지급/환불 실행 전까지 문서 후보로만 둔다.

## 31. Batch 32 Firestore pseudo-rules 초안

실제 `firestore.rules` 파일은 만들지 않는다. 아래는 문서 검토용 pseudo-rules다.

```text
products:
  read approved products: TABLET_DEVICE, scoped admins
  write draft/update: COMPANY_ADMIN where token.company_id == resource.company_id
  approve/reject/suspend: SUPER_ADMIN only

product_options:
  read approved options: same as products
  write option fields: COMPANY_ADMIN scoped
  write stock summary: server only

carts/cart_items:
  create/update: TABLET_DEVICE where token.tablet_id == document.tablet_id
  convert_to_qr: server only
  read: same tablet scope or SUPER_ADMIN

qr_payment_sessions:
  create: server only
  read admin: SUPER_ADMIN or matching NURSERY_ADMIN
  read guest: server-mediated token_hash verification only
  update paid/expired/blocked: server only

orders:
  create: server only
  read nursery: NURSERY_ADMIN where token.nursery_id == order.nursery_id
  read guest: server-mediated order lookup only
  update payment/refund status: server only

order_items:
  create: server only
  read company: COMPANY_ADMIN where token.company_id == item.company_id
  update delivery mock fields: COMPANY_ADMIN scoped, server validated
  update settlement/refund fields: server/SUPER_ADMIN review only

payments/payment_events:
  create/update: server only
  read: SUPER_ADMIN only, limited derived status to guest/order views

settlements/payouts:
  read company: COMPANY_ADMIN where token.company_id == settlement.company_id
  write/review: SUPER_ADMIN/server
  real payout: prohibited until C-grade approval

notification_logs:
  create/update: server only
  read: SUPER_ADMIN or scoped derived target owner

audit_logs:
  create: server only
  read: SUPER_ADMIN only
  update/delete: never
```

Rules로 해결하기 어려운 guest token 검증, 금액 재계산, 주문 생성 transaction, 재고 차감, PG callback 검증은 반드시 서버 로직으로 중재한다.

## 32. 추가 고도화 - 문서 품질 acceptance criteria

| 항목 | 통과 기준 |
| --- | --- |
| 상태명 | mock 상태와 운영 상태가 분리되어 있다 |
| 금액 | 클라이언트 입력 금액을 신뢰하지 않는다고 명시되어 있다 |
| 정산 | `order_items.company_id` 기준이라고 반복 명시되어 있다 |
| 개인정보 | 원문 전화번호/token/Secret 저장 금지가 명시되어 있다 |
| 외부 연동 | PG/알림/배송/재고는 gate 통과 전 mock만 허용된다 |
| Rules | 파일이 아니라 pseudo-rules 문서로만 존재한다 |
| Server SDK | Rules 우회 위험과 IAM/audit 통제가 문서화되어 있다 |

## 33. Batch 51 컬렉션별 validation 규칙

실제 validator 코드는 만들지 않는다. Firestore 전환 전 서버/service 경계에서 적용할 검증 규칙만 정의한다.

| 컬렉션 | validation 규칙 | 실패 코드 |
| --- | --- | --- |
| `products` | `company_id`, `name`, `status`, `price >= 0`; approved 전 옵션 1개 이상 권장 | `INVALID_PRODUCT` |
| `product_options` | `product_id`, `company_id`, `stock >= 0`, `status` enum | `INVALID_OPTION` |
| `carts` | `tablet_id`, `room_id`, `nursery_id` scope 일치, active cart 중복 방지 | `INVALID_CART_SCOPE` |
| `cart_items` | `quantity > 0`, product/option 참조 존재, cart active | `INVALID_CART_ITEM` |
| `qr_payment_sessions` | `short_code` unique, `token_hash` 존재, `expires_at > created_at` | `INVALID_QR_SESSION` |
| `orders` | `order_no` unique, `total_amount` 재계산값과 일치, QR 참조 존재 | `INVALID_ORDER` |
| `order_items` | `line_amount = unit_price_snapshot * quantity`, `company_id` 존재 | `INVALID_ORDER_ITEM` |
| `payments` | `amount > 0`, mock/PG 필드 혼용 금지 | `INVALID_PAYMENT` |
| `inventory_movements` | `quantity != 0`, source 참조, type enum | `INVALID_INVENTORY_MOVEMENT` |
| `settlements` | `company_id`, `period`, order_items 합계 일치 | `INVALID_SETTLEMENT` |
| `payouts` | settlement 참조, payout amount 일치, 실제 지급 전 blocked/mock 상태 | `INVALID_PAYOUT` |
| `notification_logs` | target 참조, template_code 후보, recipient 원문 금지 | `INVALID_NOTIFICATION` |
| `audit_logs` | actor/action/target/created_at 필수, Secret-like 값 금지 | `INVALID_AUDIT_LOG` |

## 34. Batch 52 상태 invariant

| invariant | 설명 |
| --- | --- |
| QR paid/used 이후 재사용 금지 | `used_at`이 있거나 `status in used, paid`이면 결제 준비 금지 |
| 주문 확정 전 결제 승인 금지 | `orders.status = paid_mock`은 payment 승인 이후만 |
| 정산은 order_items 기준 | `settlements`는 `orders.total_amount`가 아니라 `order_items.company_id` 합계 |
| 재고 변경은 movement 동반 | stock summary 변경 시 `inventory_movements` append 필요 |
| mock과 prod 결제 ID 분리 | `mock_tid`와 `real_pg_tid`를 같은 의미로 사용 금지 |
| audit append-only | audit log update/delete 금지 |
| guest list 금지 | CUSTOMER_GUEST는 단일 QR/order view만 |
| 개인정보 원문 금지 | phone/token/secret 원문 저장 금지 |

## 35. Batch 53 금액 source of truth

| 금액 | 기준 원장 | 계산 위치 | 주의 |
| --- | --- | --- | --- |
| cart 표시 금액 | `cart_items.unit_price_snapshot` | UI 표시 후보 | 결제 기준 아님 |
| QR 결제 후보 금액 | `qr_payment_sessions.items_snapshot` | server QR 생성 | 결제 준비 시 재검산 |
| 주문 확정 금액 | `orders.total_amount`, `order_items.line_amount` | server payment confirm | 클라이언트 금액 신뢰 금지 |
| payment amount | `payments.amount` | server prepare/confirm | QR/order 금액과 일치해야 함 |
| settlement gross | `order_items.line_amount` 합계 | server batch/mock | orders 총액 기준 금지 |
| payout amount | settlement snapshot | SUPER_ADMIN/server mock | 실제 지급 전 mock/blocked |
| refund amount | `refund_requests.approved_amount_mock` 후보 | review mock | 실제 PG 환불 금지 |

## 36. Batch 54 QR/token 위협 모델

| 위협 | 방어 기준 |
| --- | --- |
| short_code 추측 | 충분한 난수성, rate limit, token 병행 검증 |
| QR URL 공유 | 만료 시간, 1회 사용, payer info 최소 검증 |
| token 원문 유출 | Firestore에는 `token_hash`만 저장 |
| 만료 QR 결제 시도 | `expires_at` 서버 검증 |
| 이미 결제된 QR 재사용 | `used_at`, status 검증 |
| 금액 변조 | QR snapshot 서버 재계산 |
| 다른 객실 QR 생성 | TABLET_DEVICE scope 검증 |
| guest list query | server-mediated 단일 조회만 허용 |

## 37. Batch 55 idempotency key 후보

| 작업 | idempotency 기준 |
| --- | --- |
| QR 생성 | `cart_id + tablet_id + active status` 중복 방지 |
| 결제 준비 | `qr_session_id + amount + status` |
| 결제 승인 | `payment_id` 또는 PG event id |
| 주문 생성 | `qr_session_id`당 order 1개 |
| 재고 reserve | `source_id + option_id + type` |
| 재고 restore | 원 movement id 기반 1회 |
| 알림 발송 | `target_type + target_id + template_code` |
| 정산 생성 | `company_id + period` |
| payout 생성 | `settlement_id`당 active payout 1개 |

## 38. Batch 56 검색 key 후보

Firestore full text 검색을 전제로 하지 않는다. 필요한 경우 승인 후 별도 검색 서비스를 붙인다.

| 대상 | search key 후보 | 제한 |
| --- | --- | --- |
| 상품명 | `name_search_tokens` 후보 | 실제 구현 전 생성 금지 |
| 주문번호 | `order_no` exact match | prefix 검색은 별도 결정 |
| 전화번호 | phone hash exact match | 원문 검색 금지 |
| short code | exact match | token 검증 병행 |
| 외부 상품 ID | `external_product_id` exact match | 공식 API 전 mock |
| 감사 대상 | `target_type + target_id` | 자유 text 검색 금지 |

## 39. Batch 57 데이터 보존/archival 후보

| 데이터 | 보존 후보 | archive 방식 |
| --- | --- | --- |
| QR session | 만료 후 일정 기간 | `expired` 상태 유지 |
| cart/cart_items | QR 전환/만료 후 일정 기간 | `converted_to_qr`, `abandoned` |
| orders/order_items | 법정/운영 보존 정책 필요 | 삭제 금지 |
| payments/payment_events | PG/정산 대조 기간 | 삭제 금지 |
| audit_logs | 장기 보존 후보 | 별도 archive/export 검토 |
| notification_logs | 발송 증빙 기간 | 실패 재시도 종료 후 보존 |
| external sync logs | 장애 분석 기간 | 오래된 로그 archive 후보 |
| 개인정보 | 최소 보존, 마스킹/hash | 삭제 요청 정책 별도 승인 |
