# Firebase Seed Data Plan

작성일: 2026-05-20

## 1. 목적

현재 `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts`에 있는 mock 원장을 Firestore 전환 전 seed data로 어떻게 분해하고 검증할지 정의한다. 이 문서는 설계 문서이며 seed script, Firebase SDK 코드, Firestore 연결 코드를 만들지 않는다.

## 2. 현재 seed 후보 원장

| 원본 파일 | 포함 데이터 | 현재 건수 | Firestore 대상 |
| --- | --- | ---: | --- |
| `data/mockProducts.ts` | `mockProducts` | 7 | `products` |
| `data/mockProducts.ts` | `mockProductOptions` | 12 | `product_options` |
| `data/mockQrSessions.ts` | `mockQrSessions` | 3 | `qr_payment_sessions` |
| `data/mockOrders.ts` | `mockOrders` | 3 | `orders` |
| `data/mockOrders.ts` | `mockOrderItems` | 4 | `order_items` |
| `data/mockOrders.ts` | `mockPayments` | 3 | `payments`, `payment_events` 후보 |
| `data/mockOrders.ts` | `mockAuditLogs` | 3 | `audit_logs` |

참조 관계상 `companies`, `nurseries`, `rooms`, `tablets` seed도 필요하다. 해당 원장은 `data/mockCompanies.ts`, `data/mockNurseries.ts`, `data/mockRooms.ts`, `data/mockTablets.ts`를 별도 선행 seed로 다룬다.

## 3. Seed 전환 원칙

- mock seed는 개발/테스트용 초기 데이터이며 운영 데이터가 아니다.
- 실제 고객 개인정보, 실제 휴대폰번호, 실제 결제 TID, 실제 PG 키는 seed에 포함하지 않는다.
- TypeScript camelCase 필드는 Firestore snake_case 필드로 변환한다.
- QR/주문/결제는 상품명, 옵션명, 단가, 수량을 snapshot으로 보존한다.
- `orders.total_amount`는 주문 헤더 표시용이고, 정산은 `order_items.company_id` 기준으로 계산한다.
- `short_code`, `order_no`는 노출/조회용 값이며 내부 문서 ID와 분리할 수 있다.
- seed 재실행은 idempotent해야 한다. 같은 seed ID가 있으면 덮어쓰기보다 `seed_version` 비교 후 중단 또는 dry-run을 우선한다.

## 4. 컬렉션 변환표

### 상품

| mock 필드 | Firestore 필드 | 설명 |
| --- | --- | --- |
| `id` | document id 또는 `product_code` | mock 추적용 ID |
| `companyId` | `company_id` | 입점사 권한 scope |
| `name` | `name` | 상품명 |
| `category` | `category` | 카테고리 |
| `status` | `status` | 승인/판매 상태 |
| `price` | `price` | 현재 폐쇄몰 표시가 |
| `stock` | `stock_summary` | 대표 재고. 실제 운영은 옵션 재고 기준 |
| `externalProductCode` | `external_product_code` | 외부 재고 API 연결 후보 |
| `comparison.listPrice` | `comparison.list_price` | 정상가 |
| `comparison.platformLowestPrice` | `comparison.platform_lowest_price` | 플랫폼 최저가 |
| `comparison.closedMallPrice` | `comparison.closed_mall_price` | 폐쇄몰가 |
| `optionIds` | `option_ids` | 옵션 문서 참조 |
| `thumbnailTone` | `thumbnail_placeholder.tone` | Storage 보류 중 placeholder |

### 상품 옵션

| mock 필드 | Firestore 필드 | 설명 |
| --- | --- | --- |
| `id` | document id 또는 `option_code` | mock 추적용 ID |
| `productId` | `product_id` | 상품 참조 |
| `name` | `name` | 옵션명 |
| `priceDelta` | `price_delta` | 추가금액 |
| `stock` | `stock` | 옵션별 재고 |

추가 필요 필드:

- `company_id`: 상품에서 역정규화
- `status`: `active`, `sold_out`, `suspended`
- `safety_stock`: 운영 안전재고 후보
- `updated_at`: seed 기준 timestamp

### QR 세션

| mock 필드 | Firestore 필드 | 설명 |
| --- | --- | --- |
| `id` | document id | 내부 QR 세션 ID |
| `shortCode` | `short_code` | 고객 URL 노출 코드 |
| `type` | `type` | `purchase`, `ask` |
| `status` | `status` | `active`, `paid`, `expired`, `cancelled` |
| `nurseryId` | `nursery_id` | 조리원 출처 |
| `roomId` | `room_id` | 객실 출처 |
| `tabletId` | `tablet_id` | 태블릿 출처 |
| `cartId` | `cart_id` | 장바구니 출처 |
| `createdAt` | `created_at` | 생성 시각 |
| `expiresAt` | `expires_at` | 만료 시각 |
| `deliveryMethod` | `delivery_method` | `pickup`, `delivery` |
| `totalAmount` | `total_amount_snapshot` | QR 생성 시점 총액 |
| `items` | `items_snapshot` | 상품 snapshot 배열 |

추가 필요 필드:

- `token_hash`: 원문 QR token 저장 금지
- `used_at`: 결제 완료 시각 후보
- `source_snapshot`: 조리원명/객실명/태블릿 표시명 snapshot
- `seed_version`: seed 추적용

### 주문

| mock 필드 | Firestore 필드 | 설명 |
| --- | --- | --- |
| `id` | document id | 내부 주문 ID |
| `orderNo` | `order_no` | 고객 조회용 주문번호 |
| `qrSessionId` | `qr_session_id` | QR 세션 참조 |
| `nurseryId` | `nursery_id` | 조리원 scope |
| `roomId` | `room_id` | 객실 출처 |
| `customerName` | `customer_name_masked` | mock 마스킹 이름 |
| `customerPhoneMasked` | `customer_phone_masked` | 마스킹 번호 |
| `status` | `status` | 주문 상태 |
| `deliveryMethod` | `delivery_method` | 수령방식 |
| `totalAmount` | `total_amount` | 주문 총액 snapshot |
| `paidAt` | `paid_at` | 결제 시각 |
| `createdAt` | `created_at` | 생성 시각 |
| `itemIds` | `item_ids` | seed 검증용. 운영 조회는 `order_items.order_id` 권장 |

추가 필요 필드:

- `customer_phone_hash`: 실제 운영 전 정책 승인 필요
- `payment_id`: 결제 참조
- `item_count`: 주문 상세 수
- `token_hash`: 비회원 주문조회 인증 후보

### 주문상세

| mock 필드 | Firestore 필드 | 설명 |
| --- | --- | --- |
| `id` | document id | 주문상세 ID |
| `orderId` | `order_id` | 주문 참조 |
| `companyId` | `company_id` | 입점사 scope/정산 기준 |
| `productName` | `product_name_snapshot` | 주문 당시 상품명 |
| `optionName` | `option_name_snapshot` | 주문 당시 옵션명 |
| `quantity` | `quantity` | 수량 |
| `unitPrice` | `unit_price_snapshot` | 주문 당시 단가 |
| `deliveryStatus` | `delivery_status` | 배송/현장수령 상태 |
| `settlementAmount` | `settlement_amount` | mock 정산액 |

추가 필요 필드:

- `product_id`: 가능하면 QR snapshot에서 복원
- `option_id`: 가능하면 QR snapshot에서 복원
- `line_amount`: `unit_price_snapshot * quantity`
- `settlement_status`: `draft`, `review`, `confirmed_mock`, `payout_blocked`
- `created_at`: 주문 생성 시각

### 결제와 감사 로그

| mock 구조 | Firestore 컬렉션 | 전환 원칙 |
| --- | --- | --- |
| `mockPayments` | `payments` | `mock_tid`는 mock 전용. 실 PG 전환 시 `pg_tid` 별도 |
| `mockPayments` 상태 변경 | `payment_events` | 승인/실패/취소 요청 이벤트 append 후보 |
| `mockAuditLogs` | `audit_logs` | 권한/금액/상태 변경 로그. server append only |

## 5. Seed 적용 순서

1. `companies`, `nurseries`, `rooms`, `tablets` 선행 seed
2. `products`
3. `product_options`
4. `qr_payment_sessions`
5. `orders`
6. `order_items`
7. `payments`
8. `payment_events` 후보
9. `audit_logs`

이 순서를 지켜야 참조 무결성 검증이 가능하다.

## 6. Seed 검증 체크리스트

| 검증 항목 | 기준 |
| --- | --- |
| 상품 옵션 참조 | 모든 `products.option_ids`가 `product_options`에 존재 |
| 옵션 상품 참조 | 모든 `product_options.product_id`가 `products`에 존재 |
| QR 출처 | 모든 QR의 `nursery_id`, `room_id`, `tablet_id`가 선행 seed에 존재 |
| QR 금액 | `items_snapshot.line_amount` 합계가 `total_amount_snapshot`과 일치 |
| 주문 QR 참조 | 모든 `orders.qr_session_id`가 `qr_payment_sessions`에 존재 |
| 주문상세 참조 | 모든 `order_items.order_id`가 `orders`에 존재 |
| 주문 금액 | `order_items.line_amount` 합계가 `orders.total_amount`와 일치 |
| 결제 금액 | `payments.amount`가 해당 주문의 `total_amount`와 일치 |
| 정산 기준 | `order_items.company_id`가 존재하고 settlement 계산 후보로 사용 가능 |
| 개인정보 | 원문 휴대폰번호/실명/실 TID/Secret이 seed에 없음 |

## 7. Seed 파일 구조 제안

실제 파일은 아직 만들지 않는다. 승인 후 생성한다면 아래처럼 mock과 Firestore seed를 분리한다.

```text
data/
  mockProducts.ts
  mockOrders.ts
  mockQrSessions.ts

docs-or-seed-plan-only/
  firebase-seed-map.md

scripts/seed/
  buildSeedDocuments.ts        # 후보. 실제 생성은 별도 승인 후
  validateSeedDocuments.ts     # 후보. 실제 생성은 별도 승인 후
```

승인 전에는 `scripts/seed/**`를 만들지 않는다.

## 8. 현재 금지

- Firebase SDK 설치
- Firebase config 삽입
- `.env` 생성
- `firebase.json`, `.firebaserc` 생성
- `firestore.rules`, `storage.rules` 생성
- 실제 Firestore seed 실행
- 실제 Auth/PG/알림톡/배송조회/외부 재고 API 연결
- deploy
