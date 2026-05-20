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

## 3. 핵심 문서 구조 예시

### `products/{productId}`

- `company_id`
- `name`
- `category`
- `status`
- `price`
- `stock_summary`
- `external_product_code`
- `comparison.list_price`
- `comparison.platform_lowest_price`
- `comparison.closed_mall_price`
- `delivery_methods`
- `created_at`
- `updated_at`
- `approved_at`

### `qr_payment_sessions/{qrSessionId}`

- `short_code`
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
- `paid_at`
- `created_at`

### `order_items/{orderItemId}`

- `order_id`
- `company_id`
- `product_id`
- `product_name_snapshot`
- `option_name_snapshot`
- `unit_price_snapshot`
- `quantity`
- `delivery_status`
- `settlement_amount`

## 4. 인덱스 후보

- `products`: `company_id + status`
- `products`: `status + category`
- `qr_payment_sessions`: `short_code`
- `qr_payment_sessions`: `status + expires_at`
- `orders`: `nursery_id + created_at`
- `orders`: `order_no`
- `order_items`: `company_id + created_at`
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

## 6. 현재 금지

이 계획을 바탕으로 실제 Firestore 연결 코드, `firebase.json`, rules 파일, `.env`를 만들지 않는다.
