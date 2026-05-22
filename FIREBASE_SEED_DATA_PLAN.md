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

## 9. 5일 베타 seed 계약

실제 seed script를 만들지 않고, mock 원장을 Firestore seed로 옮길 때의 데이터 묶음만 확정한다.

| seed 묶음 | 포함 문서 | 목적 |
| --- | --- | --- |
| 운영 주체 | `companies`, `nurseries`, `rooms`, `tablets` | scope와 권한 검증 기준 |
| 상품 | `products`, `product_options` | 태블릿 상품 목록, 기업 Admin 상품 관리 |
| QR | `carts`, `cart_items`, `qr_payment_sessions` | QR 랜딩과 결제 전 snapshot |
| 주문 | `orders`, `order_items` | 고객 주문조회, 조리원 이력, 입점사 배송/정산 |
| 결제 | `payments`, `payment_events` | mock 결제 상태와 PG 전환 대비 |
| 운영 | `inventory_movements`, `pickup_events`, `delivery_events`, `refunds` | 재고/수령/배송/환불 mock 흐름 |
| 정산 | `settlements`, `payouts` | 입점사별 정산 mock |
| 로그 | `audit_logs`, `notification_logs`, `system_status` | 운영 감사와 QA 추적 |

## 10. seed 변환 dry-run 규칙

실제 실행 전 dry-run 검증은 아래 순서로 설계한다.

1. mock 데이터 배열을 읽는다.
2. camelCase 필드를 snake_case 후보로 변환한다.
3. 참조 무결성을 검사한다.
4. 금액 합산을 검사한다.
5. scope 필드 누락을 검사한다.
6. 개인정보 원문, Secret, 실제 PG TID가 없는지 검사한다.
7. 결과를 쓰지 않고 report 형태로 출력한다.

현재 작업에서는 dry-run script도 만들지 않는다. 설계 기준만 남긴다.

## 11. seed idempotency 기준

| 항목 | 기준 |
| --- | --- |
| 문서 ID | mock 고정 ID를 우선 사용하되 운영 생성 ID와 충돌하지 않게 `seed_` 또는 `mock_` prefix 검토 |
| 재실행 | 같은 `seed_version`이 있으면 덮어쓰기 전 중단 후보 |
| 삭제 | 기존 운영 데이터 삭제 금지 |
| 업데이트 | dev seed에서만 명시적 overwrite 허용 후보 |
| 검증 실패 | 일부 쓰기 금지, 전체 중단 |
| 개인정보 | 원문 전화번호, 실명, 주소, PG key 저장 금지 |

## 12. mock 데이터 보강 필요 후보

- `companies`: 입점사 상태, 수수료율, 정산계좌 마스킹
- `nurseries`: 조리원 이름, 주소 표시용, 상태
- `rooms`: 객실 번호, 활성 상태, 조리원 참조
- `tablets`: 태블릿 식별자, 마지막 접속, 객실 연결
- `policies`: QR 만료 시간, 배송비, 환불 가능 기간, 수수료율
- `system_status`: mock beta 점검 상태

위 데이터가 없으면 각 화면은 placeholder를 쓰고, 실제 Firestore seed 전에는 별도 mock 원장으로 분리한다.

## 13. 추가 변환표 - cart, settlement, audit

현재 mock QR/주문 데이터에는 cart 원장이 독립 파일로 분리되어 있지 않을 수 있다. Firestore 전환 전에는 아래 기준으로 파생 seed를 만든다.

| 원천 | 파생 대상 | 변환 기준 |
| --- | --- | --- |
| `mockQrSessions.cartId` | `carts/{cartId}` | QR 생성 전 태블릿 장바구니 원장으로 복원. `tablet_id`, `room_id`, `nursery_id`, `status` 포함 |
| `mockQrSessions.items[]` | `cart_items/{cartItemId}` 후보 | QR 생성 전 상품 선택 상태로 복원하되, 결제 기준은 QR `items_snapshot`으로 유지 |
| `mockOrderItems[]` | `settlements/{settlementId}` 후보 | `company_id`와 기간 기준으로 묶어 `gross_amount`, `commission_amount`, `payout_amount` 계산 |
| `mockPayments[]` | `payment_events/{eventId}` 후보 | 승인/실패/취소 상태 변화를 append-only 이벤트로 분리 |
| `mockAuditLogs[]` | `audit_logs/{auditLogId}` | actor/action/target/scope를 표준 필드로 맞추고 민감정보 제거 |

## 14. settlement seed 계산 후보

실제 정산 지급은 하지 않고, mock 정산 snapshot만 만든다.

| 필드 | 계산 기준 |
| --- | --- |
| `gross_amount` | 기간 내 `order_items.line_amount` 합계 |
| `refund_amount` | 환불 승인 mock이 있는 order item 합계. 없으면 0 |
| `commission_rate_snapshot` | company seed 또는 policy seed의 수수료율 |
| `commission_amount` | `gross_amount - refund_amount`에 수수료율 적용 |
| `payout_amount` | `gross_amount - refund_amount - commission_amount` |
| `status` | mock 단계에서는 `draft`, `review`, `confirmed_mock`, `payout_blocked`만 사용 |

정산 지급 완료 상태인 `paid`는 실제 입금 확인 전에는 seed에 넣지 않는다.

## 15. mock scenario catalog

추가 mock 데이터는 실제 고객/결제/배송 정보를 만들지 않고, UI 상태와 QA를 검증하기 위한 scenario로만 정의한다.

| scenario | 필요한 mock 문서 | 검증 UI |
| --- | --- | --- |
| `empty_products` | 승인 상품 0건 | 상품 목록 빈 상태 |
| `empty_orders` | 기간 필터 결과 주문 0건 | 주문 목록 빈 상태 |
| `qr_expiring_soon` | `qr_payment_sessions.status = active`, `expires_at` 임박 | QR 위험 배지 `watch` |
| `qr_expired` | `qr_payment_sessions.status = expired` | QR 만료 오류 상태 |
| `qr_already_paid` | `status = paid`, `used_at` 있음 | 이미 사용된 QR 상태 |
| `amount_mismatch` | `payment_events.type = amount_mismatch` | 결제 위험 배지 `risk` |
| `out_of_stock` | `product_options.stock = 0` | 상품/checkout 오류 상태 |
| `low_stock` | `stock <= safety_stock` | 재고 위험 배지 `watch` |
| `external_blocked` | `system_status.external_inventory = blocked` | 외부 연동 차단 상태 |
| `settlement_blocked` | `settlements.status = payout_blocked` | 정산 지급 차단 배지 |
| `refund_requested` | `refunds.status = requested_mock` | 환불 요청 상세 mock |
| `audit_empty` | audit filter 결과 0건 | 감사 로그 빈 상태 |

## 16. mock data 추가 원칙

- mock 데이터는 실제 운영 데이터처럼 보이는 개인정보를 포함하지 않는다.
- 전화번호는 항상 masked/hash 후보만 둔다.
- PG TID는 `mock_tid`만 사용하고 실제 거래 ID 형식을 복제하지 않는다.
- 외부 재고, 배송조회, 알림톡은 provider 응답을 흉내낸 mock status만 둔다.
- 위험/오류/빈 상태 scenario는 최소 1개씩 seed 후보에 포함한다.
- 모바일/태블릿 검증을 위해 긴 상품명, 긴 옵션명, 긴 반려 사유, 긴 차단 사유를 별도 scenario로 둔다.

## 17. 상세 페이지 mock seed 후보

| 상세 페이지 | seed 후보 |
| --- | --- |
| 상품 상세 | 승인 상품, 승인 대기 상품, 반려 상품, 품절 옵션, 재고 임박 옵션 |
| QR 상세 | active QR, expiring QR, expired QR, paid QR, cancelled QR |
| 주문 상세 | 결제 완료, 배송 대기, 현장수령 대기, 환불 요청, 결제 실패 |
| 정산 상세 | draft 정산, review 정산, confirmed_mock 정산, payout_blocked 정산 |
| 감사 로그 상세 | 권한 변경, 금액 불일치, QR 만료, 재고 차감, 외부 연동 차단 |

위 seed 후보는 문서 기준이며, 실제 `data/**` 파일은 이 트랙에서 수정하지 않는다.

## 18. Batch 01 확장 seed 후보 - payouts/notification logs

| 컬렉션 | mock seed 후보 | 주의 |
| --- | --- | --- |
| `payouts` | `scheduled_mock`, `blocked`, `paid_mock` 각 1건 | 실제 입금/은행 API와 혼동 금지 |
| `notification_logs` | `queued_mock`, `sent_mock`, `failed_mock`, `retry_scheduled`, `blocked` 각 1건 | 실제 발송 금지, 수신자 masked |
| `audit_logs` | 권한 변경, 금액 불일치, 지급 차단, 알림 실패 | 민감정보 제거 |
| `inventory_movements` | reserve, deduct, restore, external_sync failure | 실제 외부 재고 API 호출 금지 |

## 19. seed 검증 오류 상태

seed dry-run은 아래 오류를 발견하면 실제 쓰기를 중단해야 한다.

| code | 조건 | 조치 |
| --- | --- | --- |
| `MISSING_SCOPE` | `company_id`, `nursery_id`, `tablet_id` 등 필수 scope 없음 | seed 중단 |
| `BROKEN_REFERENCE` | product/order/qr/payment 참조 대상 없음 | seed 중단 |
| `AMOUNT_MISMATCH` | line amount 합계와 total 불일치 | seed 중단 |
| `UNSAFE_PERSONAL_DATA` | 원문 전화번호/실명/주소 포함 | seed 중단 |
| `SECRET_LIKE_VALUE` | key/secret/token처럼 보이는 값 포함 | seed 중단 |
| `INVALID_STATUS` | 허용 enum 밖 상태값 | seed 중단 |
| `PROD_LIKE_PAYMENT_ID` | 실제 PG TID처럼 보이는 값 | mock_tid로 교체 전 중단 |

실제 검증 스크립트는 만들지 않고, 이 문서의 기준만 유지한다.

## 20. Batch 40 seed data dry-run 절차

실제 seed script는 만들지 않는다. 승인 후 구현할 절차만 정의한다.

1. mock 원장 로드: products, options, QR, orders, payments, audit 후보
2. 선행 원장 확인: companies, nurseries, rooms, tablets, policies
3. camelCase -> snake_case 변환 후보 생성
4. 필수 scope 필드 검사
5. 참조 무결성 검사
6. 금액 합계 검사: cart, QR snapshot, order, order_items, payment
7. 상태 enum 검사
8. 개인정보/Secret-like 값 검사
9. external id/mock id 혼동 검사
10. dry-run report 출력
11. 사람 승인 전 실제 Firestore write 금지

## 21. seed 적용 순서 확정 후보

| 순서 | 원장 | 이유 |
| --- | --- | --- |
| 1 | `companies` | 상품/정산 scope 상위 |
| 2 | `nurseries`, `rooms`, `tablets` | QR/cart/order source scope |
| 3 | `policies` | QR 만료/수수료/배송 정책 |
| 4 | `products`, `product_options` | cart/QR item 참조 |
| 5 | `carts`, `cart_items` | QR 생성 전 상태 |
| 6 | `qr_payment_sessions` | 주문/결제 출처 |
| 7 | `payments`, `payment_events` | 주문 결제 검증 |
| 8 | `orders`, `order_items` | 정산/배송 기준 |
| 9 | `refund_requests`, `delivery_events`, `pickup_events` | 운영 상태 mock |
| 10 | `settlements`, `payouts` | order_items 기반 계산 |
| 11 | `notification_logs`, `external_inventory_sync_logs`, `audit_logs` | 이력/감사 |

실제 실행 전에는 항상 dry-run report를 먼저 검토한다.
