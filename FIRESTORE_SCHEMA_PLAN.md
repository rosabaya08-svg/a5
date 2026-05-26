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
| `mockOrders: Order[]` | 주문 헤더, 고객 마스킹, 총액, `itemIds` | `orders/{orderId}` | 고객 결제 단위. 개인정보는 원문 저장 최소화, phone hash/masked 분리 |
| `mockOrderItems: OrderItem[]` | 입점사별 상품 snapshot, 배송상태, 정산액 | `order_items/{orderItemId}` | 정산 기준 원장. `orders` 총액이 아니라 `order_items.company_id` 기준 |
| `mockPayments: Payment[]` | mock TID, 결제 상태, 승인시각 | `payments/{paymentId}` + `payment_events/{eventId}` | PG mock에서 실연동 전환 시 이벤트 이력 append |
| `mockAuditLogs: AuditLog[]` | 권한/상태 변경 기록 | `audit_logs/{auditLogId}` | 권한, 금액, 상태 변경은 server append only |

## 2-2. 컬렉션별 문서 ID 전략

| 컬렉션 | 권장 ID | 이유 |
| --- | --- | --- |
| `products` | 기존 `product-*` 또는 자동 ID + `product_code` | mock seed와 운영 생성 모두 수용 |
| `product_options` | 기존 `opt-*` 또는 `productId_optionKey` | 옵션 단독 조회와 재고 검산 필요 |
| `qr_payment_sessions` | 자동 ID, `short_code` 별도 unique 검증 | 짧은 URL 코드는 노출값이므로 내부 ID와 분리 |
| `orders` | 자동 ID, `order_no` 별도 unique 검증 | 고객 조회용 주문번호와 내부 ID 분리 |
| `order_items` | 자동 ID, `order_id` + `company_id` 인덱스 | 입점사별 정산/배송 조회 최적화 |
| `payments` | 자동 ID, `order_id` 인덱스 | PG 승인/취소 이벤트 확장 대비 |
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

## 8. 2026-05-25 실전 전환 보강

현재 코드 기준으로 `products` 컬렉션 read repository는 생성되어 있고, 실패 시 `mockProducts` fallback을 사용한다. 다음 write 컬렉션은 아직 운영 연결하지 않는다.

| 컬렉션 | 전환 준비 | 현재 상태 |
| --- | --- | --- |
| `products` | `status == active` read, mock fallback | 1차 read 연결 |
| `qr_payment_sessions` | QR 생성/만료/1회 사용 서버 처리 필요 | write 금지 |
| `orders` | PG 승인 후 서버에서 snapshot 생성 | write 금지 |
| `order_items` | 입점사 정산/배송 기준 원장 | write 금지 |
| `payments` | PG confirm/webhook 결과 저장 | write 금지 |
| `inventory_movements` | 결제 승인/취소 시 재고 차감/복구 | write 금지 |
| `content_slots` | 배너/광고/영상/브랜드 편성 | Storage/Rules 승인 전 write 금지 |
| `company_documents` | 사업자등록증/통장 사본/CS 정책 | Storage Blaze 전까지 파일 업로드 금지 |
| `nursery_external_mappings` | A4 연동용 외부 ID 매핑 | 설계만 |

실결제 전에는 서버가 `qr_payment_sessions.items` snapshot을 기준으로 주문금액을 재계산하고, 클라이언트가 보낸 금액은 참고값으로만 사용한다.
# 2026-05-25 Schema Implementation Update

Server-owned transaction collections:
- `payment_intents`
- `orders`
- `order_items`
- `payments`
- `payment_events`
- `inventory_movements`
- `qr_payment_sessions`
- `audit_logs`

Client write policy:
- Client direct write is blocked for order/payment/inventory/audit ledgers.
- Firebase Functions Admin SDK is the only intended beta write path for payment confirmation.

Foundation seed coverage:
- `companies`
- `nurseries`
- `rooms`
- `tablets`
- `product_options`
- `qr_payment_sessions`
- `marketing_banners`
- `marketing_videos`
- `product_detail_pages`
- `home_sections`
- `tablet_home_configs`
- `media_assets`
- `audit_logs`
