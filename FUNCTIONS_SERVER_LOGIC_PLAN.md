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

## 8. 5일 베타 서버 계약

아래 항목은 실제 Functions 코드를 만들기 전 mock/service 문서 계약으로 고정한다.

| 서버 경계 | 입력 | 출력 | 실패 코드 후보 |
| --- | --- | --- | --- |
| QR 생성 | tablet scope, cart id, delivery method | active QR session snapshot | `FORBIDDEN_SCOPE`, `OUT_OF_STOCK`, `INVALID_STATUS_TRANSITION` |
| QR 만료 | scheduler time | expired QR count | `NOT_FOUND`, `INVALID_STATUS_TRANSITION` |
| 결제 준비 | QR short code, token, client amount hint | payment ready mock | `QR_EXPIRED`, `QR_ALREADY_USED`, `AMOUNT_MISMATCH` |
| 결제 승인 | payment id, mock 또는 PG event | order, order_items, payment approved | `AMOUNT_MISMATCH`, `OUT_OF_STOCK`, `INVALID_STATUS_TRANSITION` |
| 주문조회 | order no, phone/token credential | masked order detail | `NOT_FOUND`, `FORBIDDEN_SCOPE` |
| 환불 요청 | order item id, reason | refund request mock | `INVALID_STATUS_TRANSITION`, `EXTERNAL_BLOCKED` |
| 배송 변경 | company scope, order item id, tracking input | delivery event mock | `FORBIDDEN_SCOPE`, `EXTERNAL_BLOCKED` |
| 현장수령 완료 | nursery scope, pickup event id | pickup completed mock | `FORBIDDEN_SCOPE`, `INVALID_STATUS_TRANSITION` |

## 9. 주문 확정 transaction 초안

실제 구현 전 문서상 원자성 요구사항은 다음 순서로 본다.

1. QR session을 조회하고 `active`, `expires_at >= now`, `used_at = null`을 검증한다.
2. token hash와 `short_code`를 함께 검증한다.
3. `items_snapshot` 기준으로 금액을 재계산한다.
4. 상품/옵션 status와 재고를 다시 검증한다.
5. payment를 `approved_mock` 또는 PG 승인 상태로 기록한다.
6. `orders` 문서를 생성한다.
7. `order_items` 문서를 입점사별 snapshot으로 생성한다.
8. 재고 차감과 `inventory_movements` append를 함께 수행한다.
9. QR session을 `paid`로 변경하고 `used_at`을 기록한다.
10. `audit_logs`에 금액, actor, source, status transition을 남긴다.

위 단계 중 하나라도 실패하면 paid QR, 주문 없음, 재고 차감됨 같은 중간 상태를 만들지 않아야 한다.

## 9-1. 중복 callback과 idempotency

PG 실연동 전환 시 같은 callback이 여러 번 들어올 수 있으므로 아래 기준을 둔다.

| 상황 | 처리 원칙 |
| --- | --- |
| 같은 `payment_id` 승인 callback 재수신 | 이미 승인된 payment면 기존 order를 반환하고 새 주문 생성 금지 |
| QR이 이미 `paid` | `QR_ALREADY_USED`로 처리하되 audit/payment event에는 중복 수신 기록 |
| payment amount 불일치 | `AMOUNT_MISMATCH` 기록, 주문 생성 금지 |
| callback signature 검증 실패 | payment event에 실패 후보 기록, 상태 변경 금지 |
| 재고 차감 후 주문 생성 실패 | 같은 transaction 안에서 실패해야 하며 부분 반영 금지 |
| 외부 PG는 성공, 내부 주문 실패 | 운영 전 별도 보상 로직과 수동 점검 큐 필요 |

mock 단계에서는 이 케이스들을 실제 PG 없이 상태표와 BLOCKERS로만 남긴다.

## 10. PG mock에서 실연동으로 넘어가는 승인 gate

| gate | 통과 조건 |
| --- | --- |
| PG-G1 | 테스트 MID/KEY 확보, callback 서명 검증 문서 확보 |
| PG-G2 | dev/prod key 분리 방식 확정 |
| PG-G3 | Secret Manager 사용 방식 확정 |
| PG-G4 | 승인, 실패, 취소, 부분취소, 중복 callback 시나리오 테스트 |
| PG-G5 | 환불 실행 권한과 수동 검토 정책 승인 |
| PG-G6 | 실제 정산 지급과 PG 정산 자료 대조 방식 승인 |

이 gate가 통과되기 전까지는 PG adapter, 환불 실행, 운영 callback route를 만들지 않는다.

## 11. 감사 로그 payload 기준

`audit_logs`에는 최소한 아래 필드를 남기는 것을 계약으로 둔다.

| 필드 | 의미 |
| --- | --- |
| `actor_type` | `system`, `super_admin`, `company_admin`, `nursery_admin`, `tablet_device`, `guest` |
| `actor_id` | 사용자, 태블릿, 시스템 작업 식별자 |
| `action` | `create_qr`, `approve_payment`, `create_order`, `deduct_stock`, `change_claims` 등 |
| `target_type` | `qr_session`, `order`, `payment`, `product`, `claims`, `settlement` |
| `target_id` | 대상 문서 ID |
| `scope` | `company_id`, `nursery_id`, `room_id`, `tablet_id` 중 관련 값 |
| `before_snapshot` | 변경 전 주요 값, 민감정보 제외 |
| `after_snapshot` | 변경 후 주요 값, 민감정보 제외 |
| `created_at` | 서버 시각 |

개인정보 원문, Secret, PG key, 원문 QR token은 감사 로그에도 저장하지 않는다.

## 12. 위험 배지 계산 후보

위험 배지는 UI가 임의로 판단하지 않고, server/service 경계에서 아래 조건을 기준으로 내려주는 것을 권장한다. 현재는 문서 계약만 정의한다.

| risk level | 조건 후보 | 관련 원장 |
| --- | --- | --- |
| `normal` | 정상 상태, 차단 사유 없음 | 전체 |
| `watch` | QR 만료 임박, 재고 안전선 이하, 정산 검토 대기 | `qr_payment_sessions`, `product_options`, `settlements` |
| `risk` | 금액 불일치, 권한 scope 불일치, 중복 callback 감지 | `payment_events`, `audit_logs` |
| `blocked` | 실제 외부 연동 필요, 지급 차단, 설정 누락 | `system_status`, `settlements`, blockers |

## 13. 오류 상태 응답 계약

서버 경계는 오류를 문자열 메시지만으로 반환하지 않고, UI가 안전하게 해석할 수 있는 code와 retry 정책을 포함한다.

| 필드 | 의미 |
| --- | --- |
| `code` | `NOT_FOUND`, `FORBIDDEN_SCOPE`, `QR_EXPIRED` 등 표준 code |
| `message` | 사용자에게 보여도 되는 안전한 설명 |
| `retryable` | 재시도 가능 여부 |
| `blocked_reason` | 외부 연동/설정/승인 미비로 차단된 경우 |
| `audit_id` | 감사 로그가 남은 경우 참조 ID |
| `safe_next_action` | mock 단계에서 가능한 다음 행동 |

PG/환불/정산/알림톡/배송조회/외부 재고처럼 실제 연동이 필요한 오류는 `EXTERNAL_BLOCKED` 또는 `CONFIG_REQUIRED`로 고정한다.

## 14. Batch 07 Functions 상세 명세

실제 Functions 코드나 route handler는 만들지 않는다. 아래는 서버 로직 계약이다.

| 함수 | 입력 | 핵심 검증 | 출력 | audit action |
| --- | --- | --- | --- | --- |
| `createQrSession` | tablet scope, cart_id, delivery_method | TABLET_DEVICE scope, cart 소유, 상품 승인, 옵션 재고, 수령방식 | active `qr_payment_sessions` | `create_qr` |
| `expireQrSessions` | scheduler now | `status = active`, `expires_at < now` | expired count, skipped count | `expire_qr` |
| `createOrderFromQrSession` | qr_session_id, payment_id | QR active, token hash, payment approved, amount match, stock | `orders`, `order_items` | `create_order` |
| `recalculateOrderAmount` | qr_session_id | `items_snapshot`, 정책 snapshot, 수량/단가 | amount summary | `recalculate_amount` 후보 |
| `confirmMockPayment` | qr_session_id, mock result | QR active, amount match, duplicate confirm 방지 | approved/failed mock payment | `confirm_mock_payment` |
| `reserveInventory` | option_id, quantity, source_id | stock >= quantity, duplicate reserve 방지 | reserve movement | `reserve_inventory` |
| `restoreInventory` | option_id, quantity, reason | 원 reserve/deduct 존재, 중복 restore 방지 | restore movement | `restore_inventory` |
| `writeAuditLog` | actor, action, target, before/after | 민감정보 제거, append-only | audit_id | `write_audit_log` |

### `createQrSession` 상세 흐름

1. TABLET_DEVICE claims의 `nursery_id`, `room_id`, `tablet_id`를 읽는다.
2. `carts.status = active`이고 scope가 일치하는지 확인한다.
3. active `cart_items`가 1건 이상인지 확인한다.
4. 상품과 옵션 상태가 결제 가능인지 확인한다.
5. 금액은 표시값이 아니라 상품/옵션 snapshot 기준으로 계산한다.
6. `short_code`, 원문 token, `token_hash`를 생성한다. 원문 token은 저장하지 않는다.
7. QR session을 active로 만들고 cart를 `converted_to_qr` 후보로 전환한다.
8. audit log를 남긴다.

### `createOrderFromQrSession` 상세 흐름

1. QR session을 다시 조회한다.
2. `status = active`, `expires_at >= now`, `used_at = null`을 검증한다.
3. payment가 approved 상태인지 검증한다.
4. 금액을 `recalculateOrderAmount`로 재검산한다.
5. 재고를 reserve/deduct한다.
6. order와 order_items를 snapshot으로 만든다.
7. payment, QR, inventory, audit를 같은 transaction 또는 보상 가능한 흐름으로 묶는다.

## 15. Batch 08 PG mock -> 실제 PG 전환 gate

| 필요 항목 | 승인 기준 | 미확보 시 안전 동작 |
| --- | --- | --- |
| PG 테스트 MID | 테스트 상점 ID 문서 확보 | `confirmMockPayment`만 사용 |
| PG Secret | Secret Manager 저장 방식 승인 | 코드/문서에 key 기록 금지 |
| callback URL | dev/prod URL 분리, HTTPS, 서명 검증 | callback route 생성 금지 |
| cancel API 문서 | 전체취소 요청/응답/오류 문서 확보 | 환불 요청 mock만 유지 |
| partial cancel 문서 | 부분취소 가능 조건, 금액 계산 문서 확보 | 부분환불 실행 금지 |
| webhook 검증 방식 | signature/header/timestamp/replay 방지 기준 확보 | webhook 수신 금지 |
| 중복 callback 정책 | idempotency key와 재시도 처리 승인 | 중복은 BLOCKERS 기록 |

## 16. Batch 09 알림톡/SMS 전환 gate

| 항목 | 필요 결정 | mock 유지 방식 |
| --- | --- | --- |
| 템플릿 코드 | 주문 생성, 결제 성공, 배송, 환불 요청, QR 만료 템플릿 승인 | `template_code = mock_*` |
| 발송사 API | 알림톡 provider, SMS fallback provider 선정 | `notification_logs.status = queued_mock/sent_mock` |
| 실패 재시도 | retry count, backoff, 최종 실패 기준 | `retry_scheduled` mock |
| 수신자 정보 | masked phone 저장, 원문 전화번호 보관 위치 결정 | 원문 저장 금지 |
| 야간/스팸 정책 | 발송 제한 시간, 수신 거부 정책 | 실제 발송 금지 |

`notification_logs`는 알림 요청과 결과를 기록하지만, 현재 단계에서는 실제 발송하지 않는다.

## 17. Batch 10 배송조회 API 전환 gate

| 항목 | 필요 결정 | mock 유지 방식 |
| --- | --- | --- |
| 택배사 코드 | provider별 carrier code 표준화 | mock carrier code 사용 |
| 송장번호 | 입력 검증, 마스킹 여부 | 송장번호 입력 mock |
| API 문서 | 조회 endpoint, rate limit, 장애 응답 확보 | 배송상태 mock |
| fallback | API 장애 시 수동 URL 또는 상태 고정 정책 | `EXTERNAL_BLOCKED` |
| 저장 위치 | `delivery_events`와 `order_items.delivery_status` 동기화 | mock event append |

## 18. Batch 11 외부 명품몰 재고 API 전환 gate

| 항목 | 필요 결정 | mock 유지 방식 |
| --- | --- | --- |
| `external_product_id` | 외부 상품과 내부 product 매핑 | 문자열 표시만 |
| `external_sku` | 옵션 단위 매핑 | `product_options.external_sku` 후보 |
| sync log | 성공/실패/부분 성공 기록 위치 | `inventory_movements.type = external_sync` |
| failure reason | 품절, API 장애, rate limit, 인증 실패 표준화 | `failure_reason` 후보 |
| 동기화 주기 | 실시간/배치/수동 동기화 선택 | 실제 호출 금지 |

## 19. Batch 12 Storage Blaze 전환 판단

| 대상 | 필요성 | 전환 전 확인 |
| --- | --- | --- |
| 상품 이미지 | 상품 카드/상세 노출 | Blaze 비용, 업로드 권한, 이미지 리사이즈 |
| GIF/동영상 | 고가 상품 설명 후보 | 용량 제한, CDN, 저작권/검수 |
| 정산/환불 증빙 | 운영 검토 자료 | 접근 권한, 보존 기간, 개인정보 |
| 사업자/입점 서류 | 입점 심사 후보 | 관리자만 접근, 다운로드 감사 |

Storage 전환 전까지 상품 이미지는 placeholder와 외부 mock tone으로 유지한다.

## 20. Batch 13 Secret Manager 필요 목록

| Secret | 용도 | 접근 주체 후보 |
| --- | --- | --- |
| `PG_TEST_MID` | PG 테스트 상점 ID | dev payment function |
| `PG_TEST_SECRET` | PG 테스트 서명 검증 | dev payment function |
| `PG_PROD_MID` | PG 운영 상점 ID | prod payment function |
| `PG_PROD_SECRET` | PG 운영 서명/취소 | prod payment function |
| `ALIMTALK_API_KEY` | 알림톡 발송 | notification function |
| `ALIMTALK_SENDER_KEY` | 발신 프로필 | notification function |
| `SMS_API_KEY` | SMS fallback | notification function |
| `DELIVERY_API_KEY` | 배송조회 | delivery sync function |
| `EXTERNAL_INVENTORY_API_KEY` | 외부 재고 조회 | inventory sync function |
| `EXTERNAL_INVENTORY_API_SECRET` | 외부 재고 인증 | inventory sync function |
| `APP_INTERNAL_SIGNING_SECRET` | QR/order token 서명 | QR/order functions |

Secret 값은 파일, 코드, 문서에 기록하지 않는다. 이 표는 이름과 용도만 정의한다.

## 21. Batch 34 endpoint별 input/output/blocker

| endpoint/function | input | output | blocker |
| --- | --- | --- | --- |
| `createQrSession` | tablet claims, cart_id, delivery_method | qr_session view, short_code, expires_at | 태블릿 인증 방식 미정 |
| `expireQrSessions` | now, batch limit | expired count, skipped count | Scheduler/Emulator 설정 미정 |
| `createOrderFromQr` | qr_session_id, token, payment_id | order view, order_items | PG callback/transaction 전략 미정 |
| `confirmPaymentMock` | qr_session_id, mock result | payment status, order 후보 | 실제 PG와 명칭 혼동 주의 |
| `reserveInventory` | option_id, quantity, source_id | movement id, reserved stock 후보 | reserve 정책 미승인 |
| `restoreInventory` | movement/source id, quantity, reason | restore movement id | 중복 restore 방지 필요 |
| `writeAuditLog` | actor, action, target, before/after | audit_id | 민감정보 제거 규칙 필요 |

## 22. Batch 35 Cloud Run 후보

Cloud Functions보다 Cloud Run이 적합한 작업은 실행 시간이 길거나 외부 dependency/대량 처리가 많은 경우다.

| 후보 | 이유 | 현재 처리 |
| --- | --- | --- |
| 정산 대량 처리 | 기간별 `order_items` 집계와 report 생성 | 문서/Mock만 |
| 외부 재고 API sync | rate limit, retry, 대량 SKU | mock sync log |
| 대량 원장 export | 관리자/회계용 CSV/PDF 후보 | 실제 export 금지 |
| 배송 API batch | 다수 송장 상태 갱신 | mock delivery events |
| 알림 재시도 worker | 실패 재시도/backoff | notification_logs mock |
| 감사 로그 archive | 장기 보관/검색 최적화 | 삭제 금지, archive 정책만 |

Cloud Run 배포, Dockerfile, cloud config는 만들지 않는다.

## 23. Batch 58 retry/dead-letter 정책 후보

실제 queue나 scheduler는 만들지 않는다.

| 작업 | retry 가능 | dead-letter 후보 | 주의 |
| --- | --- | --- | --- |
| QR 만료 | 예 | `system_status.qr_expire_failed` | 중복 만료 안전해야 함 |
| mock 결제 승인 | 제한적 | `payment_events.confirm_failed` | 중복 주문 생성 금지 |
| 알림 발송 mock | 예 | `notification_logs.blocked` | 실제 발송 금지 |
| 배송조회 mock sync | 예 | `delivery_events.failed_mock` | 실제 API 호출 금지 |
| 외부 재고 sync | 예 | `external_inventory_sync_logs.failed_mock` | 내부 재고 자동 덮어쓰기 금지 |
| 정산 batch | 예 | `settlements.payout_blocked` | 지급 자동화 금지 |

## 24. Batch 59 partial failure matrix

| 실패 지점 | 위험 | 보상/차단 |
| --- | --- | --- |
| payment approved 후 order 생성 실패 | 결제는 성공, 주문 없음 | prod 전 보상 큐/수동 점검 필요 |
| order 생성 후 order_items 일부 실패 | 정산/배송 누락 | transaction 또는 전체 rollback |
| 재고 차감 후 audit 실패 | 추적 누락 | audit write를 transaction 경계에 포함 |
| 알림 실패 | 고객 미통지 | notification retry, 주문 상태 영향 없음 |
| 배송조회 실패 | 상태 갱신 지연 | mock fallback/status 유지 |
| 외부 재고 sync 실패 | 재고 불일치 | 내부 재고 유지, 위험 배지 |
| settlement 계산 실패 | 지급 오류 위험 | payout blocked |

## 25. Batch 60 observability/system_status 후보

| status key | 의미 | 표시 대상 |
| --- | --- | --- |
| `firebase_connection` | Firebase 연결 여부 | admin only |
| `pg_provider` | mock/test/prod 준비 상태 | admin only |
| `notification_provider` | 알림 mock/blocked 상태 | admin/company scoped |
| `delivery_provider` | 배송조회 mock/blocked 상태 | admin/company scoped |
| `external_inventory_provider` | 외부 재고 mock/blocked 상태 | admin/company scoped |
| `storage_provider` | placeholder/blaze-ready/prod 상태 | admin/company scoped |
| `seed_dry_run` | 마지막 dry-run 결과 후보 | admin only |
| `rules_test` | 마지막 Rules test 결과 후보 | admin only |

## 26. Batch 61 reconciliation 후보

| 대조 | 기준 | 차이 발생 시 |
| --- | --- | --- |
| QR vs payment | `qr_session_id`, amount, status | payment blocked |
| payment vs order | `payment_id`, `order_id`, amount | order review needed |
| order vs order_items | order total vs item sum | settlement blocked |
| order_items vs settlement | company/period/item sum | payout blocked |
| PG callback vs payment_events | PG event id/idempotency | duplicate/risk badge |
| inventory summary vs movements | option stock vs movement sum | inventory review |

실제 PG/정산 대조는 운영 전 별도 승인 후 구현한다.

## 27. Batch 62 runbook/no-go trigger

| trigger | 조치 |
| --- | --- |
| 금액 불일치 | 결제/주문 확정 중단, audit 기록 |
| scope 불일치 | 요청 거부, audit 기록 |
| QR 재사용 시도 | 결제 준비 중단 |
| PG callback 검증 실패 | payment status 변경 금지 |
| 재고 음수 가능성 | 주문 확정 중단 |
| 정산 합계 불일치 | payout blocked |
| Secret/config 없음 | `CONFIG_REQUIRED` |
| 외부 provider 장애 | mock fallback 또는 `EXTERNAL_BLOCKED` |
