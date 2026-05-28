# A5 x Infiny/InnoPay PG Full Integration Vibe Prompt

이 문서는 A5 폐쇄몰 QR 결제 흐름과 인피니소프트 이노페이 PG API를 실제 운영 가능한 수준으로 연결하기 위한 바이브 코딩 지시서다.

실제 `mid`, `licenseKey`, `Merchant-Key`, `cancelPwd`, 카드번호, 생년월일, 빌키, 실명정보는 이 문서와 Git에 절대 기록하지 않는다. 모든 실값은 Firebase Functions 런타임 Secret Manager 또는 승인된 서버 비밀 저장소에만 둔다.

## 목표

A5의 현재 서버 소유 결제 장부 구조를 유지하면서, 인피니/이노페이 REST API를 안전하게 연결한다.

완료 상태는 다음을 만족해야 한다.

- 고객 QR 주문은 서버에서 금액, 상품, 재고, 회사 MID를 재검증한 뒤 결제를 시작한다.
- A5 클라이언트는 PG 비밀키를 절대 보지 않는다.
- 결제 승인, 취소, 가상계좌 입금 Noti, 거래조회는 모두 Firebase Functions 서버에서 처리한다.
- 주문, 결제, 재고 차감, QR 세션 paid 전환은 Firestore transaction으로 한 번만 처리된다.
- `moid`, `tid`, Noti event key 기준으로 중복 승인/중복 차감/중복 취소가 방지된다.
- 테스트 모드에서 검증되기 전까지 운영 PG 실호출은 차단된다.

## 반드시 먼저 읽을 파일

코드 작성 전 아래 파일을 읽고 현재 구조를 보존한다.

- `AGENTS.md`
- `functions/src/payments/providerAdapter.ts`
- `functions/src/payments/ready.ts`
- `functions/src/payments/confirm.ts`
- `functions/src/payments/cancel.ts`
- `functions/src/payments/webhook.ts`
- `functions/src/payments/providerRuntime.ts`
- `functions/src/payments/adminPg.ts`
- `functions/src/payments/credentialCrypto.ts`
- `components/guest/ServerCheckoutFlow.tsx`
- `lib/payments/pgCheckoutBridge.ts`
- `components/admin/PgGatewaySettingsPanel.tsx`
- `lib/payments/infinySettlementPolicy.ts`
- `firestore.rules`
- `PAYMENT_CONNECT_PLAN.md`
- `PG_ENV_KEYS.md`
- `FIREBASE_PG_PAYMENT_SERVER_DESIGN.md`

Next.js 코드를 수정해야 하면 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인한다. 이 프로젝트의 Next.js 버전은 일반적인 지식과 다를 수 있다.

## 현재 판단

현재 A5 코드는 PG 골격은 준비되어 있지만, 인피니 PG REST 샘플과 실제 호출 형태가 맞지 않는다.

현재 코드가 가정하는 형태:

- 브라우저 SDK 또는 결제창 호출
- `paymentKey` 또는 `transactionId`를 받아 서버 confirm
- 서버 confirm은 `Authorization: Bearer secret` + JSON `/payments/confirm` 가정

인피니/이노페이 샘플에서 확인된 형태:

- SMS 카드결제 API: 서버가 `smsPayApi` 호출
- 현금결제/현금영수증 API: 서버가 `cashPayApi` 호출
- 자동결제 API: 서버가 `regAutoCardBill`, `payAutoCardBill` 호출
- 취소 API: 서버가 `cancelApi` 호출
- 거래조회 API: `MID`, `Merchant-Key` 헤더로 `v1/transactions...` 조회
- 가상계좌 API: `vbankApi`, `vacctInquery`, `vbankCancel`
- 가상계좌 입금 Noti: `application/x-www-form-urlencoded`, 성공 응답은 plain text `0000`

따라서 `providerAdapter.ts`의 인피니 branch를 이노페이 REST API 방식으로 교체해야 한다.

## 1차 운영 범위

1차로는 SMS 카드결제 API를 우선 구현한다.

이유:

- A5가 카드번호, 카드비밀번호, 생년월일을 직접 받지 않는다.
- 폐쇄몰 QR 주문 UX와 가장 잘 맞는다.
- 서버가 결제 링크/요청을 만들고, 거래조회/Noti로 승인 상태를 확정할 수 있다.

가상계좌는 2차로 구현한다. 자동결제/빌키 즉시등록은 민감정보 취급 범위가 커서 별도 보안/계약 승인 전까지 구현하지 않는다.

## 인피니 API 계약

### SMS 카드결제 요청

Endpoint:

```text
POST https://api.innopay.co.kr/api/smsPayApi
Content-Type: application/json
```

Request fields:

- `mid`
- `payExpDate`
- `userId`
- `moid`
- `goodsName`
- `amt`
- `dutyFreeAmt`
- `buyerName`
- `buyerTel`
- `buyerEmail`
- `svcPrdtCd`

Expected response fields:

- `mid`
- `moid`
- `goodsName`
- `amt`
- `dutyFreeAmt`
- `buyerName`
- `buyerTel`
- `buyerEmail`
- `payExpDate`
- `userId`
- `resultCode`
- `resultMsg`

Success:

- `resultCode === "0000"`

### 통합 취소

Endpoint:

```text
POST https://api.innopay.co.kr/api/cancelApi
Content-Type: application/json
```

Request fields:

- `mid`
- `tid`
- `svcCd`
- `cancelAmt`
- `cancelMsg`
- `cancelPwd`
- `partialCancelCode`
- `refundBankCd`
- `refundAcctNo`
- `refundAcctNm`

`svcCd`:

- `01`: 신용카드
- `02`: 계좌이체
- `04`: 현금영수증
- `07`: 휴대폰

Success:

- `resultCode === "2001"`

### 거래조회

Endpoints:

```text
GET https://api.innopay.co.kr/v1/transactions/{tid}
GET https://api.innopay.co.kr/v1/transactions/orders/{moid}
GET https://api.innopay.co.kr/v1/transactions/merchants/{mid}?startDate=YYYYMMDD
```

Headers:

```text
MID: {mid}
Merchant-Key: {merchantKey}
```

거래조회는 SMS 카드결제 완료 여부 확인, Noti 누락 보정, 관리자 결제상태 동기화에 사용한다.

### 가상계좌 발급

Endpoint:

```text
POST https://api.innopay.co.kr/api/vbankApi
Content-Type: application/json
```

Required fields:

- `mid`
- `licenseKey`
- `moid`
- `goodsName`
- `amt`
- `buyerName`
- `vbankBankCode`
- `vbankAccountName`
- `countryCode`
- `socNo`
- `accountTel`

Success:

- `resultCode === "4100"`

### 가상계좌 상태조회

Endpoint:

```text
POST https://api.innopay.co.kr/api/vacctInquery
Content-Type: application/json
```

Success:

- `resultCode === "4100"`
- `resultCode === "4200"`도 정상 계좌 상태로 취급하되, 미입금 대기 거래가 있음을 별도 상태로 기록한다.

### 가상계좌 취소

Endpoint:

```text
POST https://api.innopay.co.kr/api/vbankCancel
Content-Type: application/json
```

Success:

- `resultCode === "4100"`

### 가상계좌 입금 Noti

Request:

```text
POST {A5 merchant noti URL}
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
```

Important fields:

- `tid`
- `shopCode`
- `moid`
- `goodsAmt`
- `buyerName`
- `status`
- `statusName`
- `pgAppDate`
- `pgAppTime`
- `pgTid`
- `vacctNo`
- `vbankBankCd`
- `vbankAcctNm`
- `userId`

Status:

- `25`: 결제완료
- `85`: 결제취소

Response:

```text
0000
```

Noti handler는 JSON HMAC 웹훅과 분리하거나 content-type branch로 처리한다.

## 새로 만들 서버 클라이언트

파일을 추가한다.

```text
functions/src/payments/innopayRestClient.ts
```

필수 메서드:

- `createSmsPaymentRequest(input)`
- `cancelTransaction(input)`
- `getTransactionByTid(input)`
- `getTransactionByMoid(input)`
- `getTransactionsByMerchantDate(input)`
- `createVbank(input)`
- `queryVbank(input)`
- `cancelVbank(input)`

2차 메서드:

- `issueCashReceipt(input)`
- `registerAutoCardBillKey(input)`
- `payAutoCardBillKey(input)`

구현 규칙:

- 모든 HTTP 호출은 서버에서만 수행한다.
- `fetch` timeout을 둔다.
- request/response raw payload를 그대로 로그에 남기지 않는다.
- `licenseKey`, `Merchant-Key`, `cancelPwd`, `cardNum`, `cardPwd`, `idNum`, `billKey`는 로그 마스킹한다.
- `amt`는 문자열로 보내되, 내부 검증은 number로 한다.
- 응답 성공코드는 API별로 분리한다.
- HTTP 200이어도 PG `resultCode` 실패면 실패로 처리한다.

권장 타입:

```ts
export type InnopayResult<T> =
  | { ok: true; data: T; resultCode: string; resultMsg: string; rawMasked: Record<string, unknown> }
  | { ok: false; resultCode?: string; resultMsg: string; httpStatus?: number; rawMasked?: Record<string, unknown> };
```

## 환경변수와 비밀값

기존 generic 키를 인피니 전용으로 정리한다.

Server-only:

- `INNOPAY_API_BASE_URL=https://api.innopay.co.kr`
- `INNOPAY_ENVIRONMENT=test`
- `INNOPAY_REAL_CALLS_ENABLED=false`
- `INNOPAY_DEFAULT_MID`
- `INNOPAY_DEFAULT_LICENSE_KEY`
- `INNOPAY_DEFAULT_MERCHANT_KEY`
- `INNOPAY_DEFAULT_CANCEL_PWD`

회사별 값은 `company_pg_credentials/{companyId}` 또는 기존 저장 구조에 암호화 저장한다.

필수 회사별 필드:

- `provider: "infiny"`
- `mid`
- `licenseKey` 또는 secret ref
- `merchantKey` 또는 secret ref
- `cancelPwd` 또는 secret ref
- `status: "active" | "test" | "blocked" | "missing"`
- `enabledMethods.smsCard`
- `enabledMethods.vbank`
- `enabledMethods.cashReceipt`
- `enabledMethods.autoBilling`

주의:

- `PG_CREDENTIAL_ENCRYPTION_KEY`가 없을 때 `PG_SECRET_KEY`로 복호화 키를 대체하지 않도록 수정하거나, production에서 hard fail한다.
- 테스트 키도 Git에 기록하지 않는다.

## 상태 모델

결제 상태는 최소한 아래를 지원한다.

- `ready`: A5 서버 검증 완료
- `pending_payment_link`: SMS 결제 요청 생성 완료, 고객 결제 대기
- `waiting_deposit`: 가상계좌 발급 완료, 입금 대기
- `confirming`: 승인 확정 처리 중
- `approved`: PG 승인 완료 및 주문 생성 완료
- `cancel_requested`: 취소 요청 접수
- `cancelled`: PG 취소 및 장부 반영 완료
- `failed`: PG 실패
- `expired`: 결제 만료

기존 `paymentsConfirm`은 즉시 승인형만 가정하므로 SMS 카드결제와 가상계좌는 별도 시작 함수 또는 branch가 필요하다.

권장 Functions:

- `paymentsReady`: 유지
- `paymentsStartInnopaySms`: 신규. ready intent 기반으로 `smsPayApi` 호출 후 pending 상태 기록
- `paymentsConfirm`: 결제창 SDK형이 남아 있으면 유지. SMS 카드결제에서는 거래조회 기반 확정 함수로 사용하거나 분리
- `paymentsSyncInnopayTransaction`: 신규. `moid` 또는 `tid`로 거래조회 후 승인 확정
- `paymentsWebhook`: JSON PG 웹훅 유지
- `paymentsInnopayNoti`: 신규 또는 content-type branch. form-urlencoded 처리 후 `0000` 응답
- `paymentsCancel`: 기존 유지하되 `cancelApi` 호출로 변경

## Firestore 기록 규칙

서버만 쓰기 가능해야 하는 컬렉션:

- `payment_intents`
- `payments`
- `payment_events`
- `webhook_events`
- `orders`
- `order_items`
- `cancel_requests`
- `inventory_movements`
- `qr_payment_sessions`

중복 방지 키:

- payment intent: `paymentIntentId`
- merchant order: `moid`
- PG transaction: `tid`
- Noti event: `innopay:{status}:{tid}:{pgTid}:{pgAppDate}{pgAppTime}`
- cancel request: `cancel:{tid}:{cancelAmt}:{createdDateBucket}`

승인 확정 transaction 안에서 반드시 수행:

- payment intent 상태 전환
- payment 생성/업데이트
- order 생성/업데이트
- order_items 생성
- inventory 차감
- inventory_movements 기록
- qr_payment_sessions paid 전환
- payment_events 기록
- audit log 기록

이미 `approved` 또는 `paid` 처리된 결제는 재처리하지 않는다.

## 프론트 UX

SMS 카드결제 1차 UX:

1. 고객이 QR 주문 확인
2. 서버 `paymentsReady` 호출
3. 서버 `paymentsStartInnopaySms` 호출
4. 화면은 `결제 요청 전송됨` 상태 표시
5. 고객은 문자 링크에서 결제
6. A5는 polling 또는 Noti/거래조회로 결제완료 전환
7. 주문완료 화면 표시

프론트 금지:

- `licenseKey`
- `Merchant-Key`
- `cancelPwd`
- `cardNum`
- `cardPwd`
- `idNum`
- `billKey`

## 관리자 UI

`PgGatewaySettingsPanel` 또는 관련 admin 화면에서 다음을 구분한다.

- 전역 API base URL
- 테스트/운영 모드
- 회사별 MID 상태
- 회사별 SMS 카드결제 사용 여부
- 회사별 가상계좌 사용 여부
- 회사별 취소 비밀번호 등록 여부
- Noti URL 등록 상태
- 마지막 거래조회 동기화 상태

실제 키 값은 입력 직후 저장하고 다시 화면에 보여주지 않는다. 표시가 필요하면 `등록됨`, `미등록`, `교체 필요`만 보여준다.

## 취소 규칙

`paymentsCancel`은 다음 순서로 동작한다.

1. 관리자 권한 확인
2. payment/order 조회
3. 이미 취소됐는지 확인
4. 취소 가능 상태인지 확인
5. 회사 PG credential 복호화
6. `cancelApi` 호출
7. `resultCode === "2001"`일 때만 Firestore transaction으로 취소 반영
8. 재고 복구
9. `cancel_requests`, `payment_events`, `audit_logs` 기록

부분취소는 정책 확정 전까지 차단하거나 `partialCancelCode` 계약 확인 후 별도 구현한다.

## 가상계좌 2차 구현 규칙

가상계좌는 즉시 주문 확정이 아니다.

발급 성공 시:

- payment intent: `waiting_deposit`
- payment: `waiting_deposit`
- order: draft 또는 pending 상태
- QR session: paid 아님

입금 Noti `status=25` 또는 거래조회 입금완료 확인 시:

- 최종 금액 재검증
- 미처리 상태인지 확인
- Firestore transaction으로 주문 생성/확정, 재고 차감, QR paid 전환
- 응답 `0000`

취소 Noti `status=85`:

- 이미 paid/order 완료인지 확인
- 취소 가능 상태면 cancelled 처리
- 응답 `0000`

## 자동결제/빌키 금지 조건

아래 API는 1차 운영 범위에서 구현하지 않는다.

- `regAutoCardBill`
- `payAutoCardBill`

구현 전 필요한 조건:

- 카드정보 직접 입력 여부에 대한 보안/법무 승인
- 개인정보/식별정보 보관 금지 설계
- 빌키 저장 방식 확정
- PG 계약상 자동결제 허용 확인
- 관리자 환불/해지/재결제 정책 확정

## 테스트

필수 명령:

```text
npm --prefix functions run build
npm run build
npm run check:no-secrets
```

현재 `npm run build`가 PG와 무관한 타입 오류로 실패할 수 있다면, 실패 파일과 오류를 별도 보고하고 PG 변경으로 인한 실패가 아님을 확인한다.

필수 단위 테스트 또는 로컬 검증:

- SMS 결제 요청 payload에 서버 재계산 금액이 들어간다.
- 클라이언트 금액 변조가 무시된다.
- `resultCode !== "0000"`이면 pending/approved로 넘어가지 않는다.
- 동일 `moid` 재요청은 중복 payment를 만들지 않는다.
- 동일 Noti 재수신은 주문/재고를 중복 처리하지 않는다.
- 취소 성공코드 `2001`일 때만 취소 장부가 반영된다.
- 가상계좌 Noti는 form-urlencoded를 파싱하고 plain text `0000`을 응답한다.
- 민감키가 로그와 Firestore plain field에 남지 않는다.

## 완료 기준

완료 후 보고서에 반드시 포함한다.

- 변경한 파일 목록
- 추가한 Functions endpoint 목록
- 인피니 API별 성공코드 매핑
- Firestore 상태 전환표
- 비밀키 저장 위치
- Noti URL
- 테스트 결과
- 아직 막아둔 기능: 부분취소, 자동결제/빌키, 운영키 전환, 정산 자동화

## 절대 하지 말 것

- PG 비밀키를 Next.js public env에 넣지 않는다.
- 테스트 키라도 Git에 커밋하지 않는다.
- 브라우저에서 `cancelApi`, 거래조회, 가상계좌 발급을 직접 호출하지 않는다.
- PG 응답만 믿고 금액을 확정하지 않는다. 항상 서버 금액과 비교한다.
- Noti를 검증 없이 주문 완료로 처리하지 않는다.
- `mock` 승인으로 실제 주문 완료를 만들지 않는다.
- 여러 회사 MID 상품이 섞인 장바구니를 하나의 PG 거래로 묶지 않는다.
