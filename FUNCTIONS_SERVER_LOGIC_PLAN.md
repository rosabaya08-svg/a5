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
