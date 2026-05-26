# Functions Server Logic Plan

작성일: 2026-05-20

## 1. 목적

Cloud Functions와 서버 Route Handler/Server Action으로 처리해야 할 신뢰 경계 로직을 정리한다. 현재는 설계 단계이며 실제 Functions 코드, deploy, Firebase 연결은 만들지 않는다.

## 2. Cloud Functions 후보

| 함수 | 트리거 | 역할 |
| --- | --- | --- |
| `createQrSession` | HTTPS callable 또는 server action boundary | 태블릿 cart snapshot 기준 QR 생성 |
| `expireQrSessions` | Scheduler | 만료 시간이 지난 active QR을 expired 처리 |
| `preparePayment` | HTTPS | 서버 snapshot 기준 금액 재계산, PG 요청 준비 |
| `approvePaymentCallback` | HTTPS webhook | PG 승인 callback 검증, 주문 확정, QR paid 처리 |
| `failPaymentCallback` | HTTPS webhook | PG 실패 이벤트 기록 |
| `requestRefund` | HTTPS | 고객/기업 환불 요청 생성 |
| `reviewRefund` | HTTPS/admin | 환불 검토. 실제 환불 실행은 별도 승인 |
| `updateDeliveryEvent` | HTTPS/admin | 송장/배송 상태 이벤트 기록 |
| `completePickup` | HTTPS/admin | 현장수령 완료 처리 |
| `sendNotification` | Event/HTTPS | 알림톡/SMS 발송 요청과 로그 기록 |
| `syncExternalInventory` | Scheduler/HTTPS | 외부 재고 API 동기화 후보 |
| `writeAuditLog` | Internal | 권한/금액/상태 변경 감사 로그 append |
| `setUserClaims` | Admin only | Auth Custom Claims 설정 |

## 3. 서버 로직 원칙

- 결제 금액은 클라이언트 입력값을 신뢰하지 않는다.
- QR session의 cart/item snapshot과 정책 기준으로 서버에서 재계산한다.
- QR paid 처리, 주문 생성, 결제 이벤트 기록은 원자적 처리 또는 보상 로직 필요
- paid/expired/cancelled QR은 재사용 불가
- 환불/부분취소/정산 지급은 자동 실행 금지. 요청/검토/체크리스트까지만 자동화 가능
- 모든 금액/권한/상태 변경은 `audit_logs` 기록

## 3-1. QR 생성 로직

1. `TABLET_DEVICE` claim 또는 태블릿 등록 세션에서 `nursery_id`, `room_id`, `tablet_id`를 확인한다.
2. 장바구니의 `cart_id`가 해당 `tablet_id`에 속하는지 검증한다.
3. cart item별 `product_id`, `option_id`, `quantity`, 수령방식 가능 여부를 조회한다.
4. `products.status = approved`인지, 옵션/상품 재고가 충분한지 확인한다.
5. 상품명, 옵션명, 단가, 수량, `company_id`, 수령방식을 `items_snapshot`으로 고정한다.
6. `short_code`와 `token_hash`를 생성하고, 원문 token은 저장하지 않는다.
7. `expires_at`은 정책상 2~3시간 범위로 설정한다.
8. `qr_payment_sessions.status = active`로 생성하고 `audit_logs`에 QR 생성 이벤트를 남긴다.

## 3-2. QR 만료 로직

1. Scheduler가 `status = active`이고 `expires_at < now`인 세션을 조회한다.
2. 각 QR을 `expired`로 변경한다.
3. 이미 `paid`, `cancelled`인 세션은 변경하지 않는다.
4. 만료 처리 결과는 `audit_logs` 또는 `system_status`에 요약한다.
5. 만료된 QR은 고객 랜딩, 결제 준비, 상품 상세 접근을 모두 차단한다.

## 3-3. 주문금액 재계산 로직

1. 클라이언트에서 전달된 금액은 표시 참고값으로만 취급한다.
2. 서버는 `qr_payment_sessions.items_snapshot`을 기준으로 `unit_price * quantity`를 합산한다.
3. 배송비, 현장수령, 할인, 정책 비용이 생기면 `policies` snapshot을 함께 적용한다.
4. 재계산 금액과 `total_amount_snapshot`이 다르면 결제 준비를 중단하고 `payment_events`에 `amount_mismatch`를 남긴다.
5. 결제 승인 직전에도 QR 상태, 만료, 재사용 여부, 금액을 다시 검증한다.

## 3-4. 상품 snapshot과 주문 생성

1. PG mock 승인 또는 추후 PG callback 승인 이후에만 주문을 확정한다.
2. `orders`에는 주문 헤더와 고객 마스킹/해시, QR 출처, 총액을 저장한다.
3. `order_items`에는 입점사별 상품명/옵션/단가/수량/정산 기준 금액 snapshot을 저장한다.
4. 주문 후 상품 가격이나 옵션명이 바뀌어도 기존 `order_items` snapshot은 변경하지 않는다.
5. 입점사 Admin 화면과 정산은 `orders.total_amount`가 아니라 `order_items.company_id` 기준으로 조회한다.

## 3-5. 재고 차감/복구 로직

1. 결제 준비 단계에서는 필요 시 재고 reserve 후보를 만들 수 있으나, 현재 mock 단계에서는 차감하지 않는다.
2. 결제 승인 시 `product_options.stock` 또는 상품 대표 재고를 차감한다.
3. 동시에 `inventory_movements`에 `deduct` 이벤트를 append한다.
4. 승인 실패, 만료, 취소 시 reserve가 있다면 `restore` 이벤트로 복구한다.
5. 외부 재고 API 연동 전까지 외부 재고값은 `externalProductCode`와 mock adapter 기준으로만 표시한다.

## 3-6. 결제 mock에서 실연동으로 전환하는 단계

| 단계 | 상태 | 처리 |
| --- | --- | --- |
| 1 | 현재 mock | `paymentMock.ts`와 `approved_mock`, `failed_mock` 상태만 사용 |
| 2 | PG 문서 확보 | 테스트 MID/KEY, callback 검증, 취소/부분취소 문서 확보 후 설계 보강 |
| 3 | dev adapter 초안 | 운영키 없이 test adapter interface 작성. Secret은 코드에 넣지 않음 |
| 4 | prepare/approve 검증 | 서버 금액 재계산, QR 재사용 차단, TID 저장, 주문 snapshot 테스트 |
| 5 | cancel/refund 검토 | 운영 환불 실행 전 요청/검토/금액 검산만 구현 |
| 6 | prod 전환 승인 | 대표님 승인, dev/prod 분리, Secret Manager, 운영 PG 계약 확인 후 별도 작업 |

실제 PG 연결, 환불 실행, 정산 지급은 이 문서 단계에서 금지한다.

## 4. Cloud Run 후보

Cloud Functions보다 Cloud Run이 적합할 수 있는 작업:

- 월별/입점사별 정산 배치
- 대량 주문/배송/정산 리포트 생성
- 외부 재고 API 대량 동기화
- 배송조회 주기적 대량 갱신
- 알림 재시도 큐 처리
- 대시보드 summary 재계산
- 긴 실행 시간 또는 많은 dependency가 필요한 작업

## 5. Secret Manager에 넣을 값 목록

| Secret | 용도 | 상태 |
| --- | --- | --- |
| `PG_TEST_MID` | PG 테스트 상점 ID | 미확보 |
| `PG_TEST_SECRET` | PG 테스트 서명/키 | 미확보 |
| `PG_PROD_MID` | PG 운영 상점 ID | 미확보 |
| `PG_PROD_SECRET` | PG 운영 키 | 미확보 |
| `KAKAO_ALIMTALK_SENDER_KEY` | 알림톡 발송 | 미확보 |
| `KAKAO_ALIMTALK_TEMPLATE_CODES` | 템플릿 코드 | 미확보 |
| `SMS_FALLBACK_API_KEY` | SMS fallback | 미확보 |
| `DELIVERY_TRACKING_API_KEY` | 배송조회 API | 미확보 |
| `EXTERNAL_INVENTORY_API_KEY` | 외부 재고 API | 미확보 |
| `EXTERNAL_INVENTORY_API_SECRET` | 외부 재고 API secret | 미확보 |
| `APP_INTERNAL_SIGNING_SECRET` | QR/order token 서명 | 생성 금지, 설계만 |

## 6. 실제 연동 전 필요한 문서와 키

- PG 계약서, 테스트 MID/KEY, 운영 MID/KEY, callback 검증 방식, 취소/부분취소 문서
- 카카오 알림톡 발송 대행사 계약, 발신 프로필, 템플릿 승인 코드
- SMS fallback API 문서와 키
- 배송조회 API 공식 문서, 택배사 코드, rate limit, 테스트 계정
- 외부 명품쇼핑몰 재고 API 공식 규격서, 테스트 계정, rate limit, 장애 응답표
- 개인정보/약관/비회원 주문조회 인증 정책

## 7. 현재 금지

Functions 코드 생성, deploy, Secret 생성, PG callback route 운영 연결, 실제 외부 API 호출은 금지한다.

## 8. 2026-05-25 PG 실전 전환 서버 계약

PG 키를 받은 뒤에도 클라이언트 화면만으로는 실결제를 열 수 없다. 다음 서버 로직이 먼저 필요하다.

| 서버 액션 | 역할 | 실제 구현 전 상태 |
| --- | --- | --- |
| `createPaymentIntent` | QR/session/order 후보와 금액 snapshot 준비 | interface 준비 |
| `requestPayment` | PG 모듈 진입 정보 생성 | mock/provider skeleton |
| `confirmPayment` | secret key로 PG 승인 확인 | 서버 runtime 필요 |
| `handleWebhook` | PG webhook 서명 검증과 중복 이벤트 차단 | server only |
| `cancelPayment` | 취소 요청 검산, 정산 보류, PG 취소 | blocker |
| `refundPayment` | 환불 승인, 부분취소, 정산 보정 | blocker |

결제 승인 순서:

1. QR 상태가 `active`인지 확인한다.
2. QR 만료와 1회 사용 여부를 확인한다.
3. 상품/옵션/가격 snapshot으로 금액을 서버 재계산한다.
4. 재고 차감 또는 reserve를 처리한다.
5. PG confirm API를 secret key로 호출한다.
6. `payments`, `orders`, `order_items`, `inventory_movements`, `audit_logs`를 기록한다.
7. QR 상태를 `paid`로 변경한다.

Cloudflare Pages static export는 secret key를 안전하게 보관할 수 없으므로 Firebase Functions, Cloud Run, Cloudflare Workers/Pages Functions 중 하나를 확정해야 한다.
# 2026-05-25 Implementation Update

Functions beta server layer now includes:
- `paymentsReady`: validates QR/cart input, recalculates amount, creates `payment_intents` in mock mode.
- `paymentsConfirm`: keeps real PG calls disabled, then writes `orders`, `order_items`, `payments`, `payment_events`, `inventory_movements`, `audit_logs`, and QR status through a Firestore transaction.
- `paymentsStatus`: reads payment status by `paymentIntentId` or `orderNo`.
- `paymentsWebhook`: signature verification skeleton only.
- `paymentsCancel`: cancellation interface only, real cancel/refund blocked.
- `providerAdapter`: PG provider slot for Toss/PortOne/KCP/NICE without SDK imports.

Server-owned collections:
- Client write is blocked in rules for `orders`, `order_items`, `payments`, `payment_events`, `inventory_movements`, and `audit_logs`.
- Firebase Functions Admin SDK is the intended write path.

Still blocked:
- Real PG approval/cancel/refund API.
- Real webhook signature validation.
- Real settlement payout.
- Real Alimtalk, delivery tracking, and external inventory APIs.
