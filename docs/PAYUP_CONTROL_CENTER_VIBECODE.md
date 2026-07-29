# A5S PayUp 장바구니 PG 통합 관제 바이브코드

작성일: 2026-07-29  
대상: A5S 기업관리자, A5S 고객몰, A5WS 파트너·공급사, A5LS 독립몰  
작업 브랜치: `feature/payup-control-center-sandbox-20260729`

## 1. 작업 목표

기존 `/admin/pg-settings` 주소만 존재하고 관리자가 직접 경로를 기억해야 했던 상태를 제거한다.
A5S 기업관리자 왼쪽 메뉴에서 PayUp 기능을 업무별로 분리하고, 클릭 즉시 각 관리 화면으로 들어가도록 한다.

운영 화면은 다음 기준을 따른다.

- 연결 상태는 카드와 차단 사유로 표시한다.
- 다량 데이터는 엑셀과 같은 행·열 표로 표시한다.
- 하위사업자 등록은 입력 폼과 자동 `subMerchantId` 생성으로 단순화한다.
- 결제·대사·취소 회로는 실제 토글 스위치로 ON/OFF한다.
- 부분취소와 브라우저 `paid` fallback은 잠금 상태로 고정한다.
- 공급사·파트너는 자기 사업자 판매·정산 로그만 조회한다.
- A5S 최고관리자는 모든 사업자와 모든 채널을 조회한다.
- API Key, API Cert Key, Signature, AuthToken, 계좌번호 원문은 화면과 로그에 노출하지 않는다.

## 2. PayUp 공식 규격 기준

### 하위업체

- 등록·수정: `POST /cartpay/api/sub/{merchantId}/update`
- 조회: `POST /cartpay/api/sub/{merchantId}/list`
- 모든 요청값은 String
- `subMerchantId`는 최대 20자
- 사업자번호·계좌번호는 하이픈 없이 전송

### 거래·정산

- 거래조회: `POST /cartpay/api/auth/{merchantId}/list`
- 정산목록: `POST /cartpay/api/closing/{merchantId}/list`
- 정산상세: `POST /cartpay/api/closing/{merchantId}/detail`
- 조회기간은 시작일부터 31일 이내
- 정산 지급상태 `0001`부터 `0009`까지 원문을 보존

### 승인·취소

- 주문요청: `POST /ap/api/payment/{merchantId}/order`
- 최종승인: 주문요청 응답의 `payUrl`
- 최종승인 시 `cartPayFlag=Y`, `cartPayList[]` 전달
- `SUM(cartPayList.amount) == 승인금액` 강제
- 전체취소: `POST /v2/api/payment/{merchantId}/cancel2`
- 부분취소: 공식 미지원

## 3. 기존 코드와 충돌 제거

### 기존 상태

- `/admin/pg-settings`는 인피니 MID 설명 화면이었다.
- 결제 Provider는 `mock`, `infiny`, `toss`, `portone`, `kcp`, `nice` 중심이었다.
- PayUp 거래·정산 조회 메뉴가 없었다.
- 실제 취소 대신 `manual_review_required` 문서만 생성했다.
- 고객 결제는 mock 또는 브라우저 fallback으로 `paid`가 될 수 있었다.

### 이번 분리 원칙

- 기존 인피니 정책 파일을 삭제하지 않는다.
- PayUp은 별도 중앙 Gateway와 별도 기능 플래그를 사용한다.
- `/admin/pg-settings`는 PayUp 연결 입구로 교체한다.
- PayUp 전용 메뉴는 `/admin/payup/*` 아래에 둔다.
- 실제 외부 호출은 `PAYUP_LIVE_CALLS_ENABLED=true`일 때만 허용한다.
- 기존 거래 대사·정산 조회·취소 회로는 신규 결제 회로와 별도로 제어한다.

## 4. 관리자 메뉴

```text
PayUp 장바구니 PG
├─ PayUp 통합 관제
├─ 연결 설정
├─ 운영 배전판
├─ 하위사업자
├─ 거래/분배
├─ 정산 대사
├─ 전체취소
└─ 통합 로그
```

라우트:

```text
/admin/payup
/admin/payup/connection
/admin/payup/switchboard
/admin/payup/submerchants
/admin/payup/transactions
/admin/payup/settlements
/admin/payup/cancellations
/admin/payup/logs
```

기존 주소:

```text
/admin/pg-settings
```

위 주소도 PayUp 연결 설정 화면을 연다.

## 5. 운영 배전판

### 결제 회로

- `PAYUP_MASTER`
- `NEW_ORDER`
- `PAYMENT_WINDOW`
- `FINAL_APPROVAL`
- `CART_DISTRIBUTION`

### 하위사업자 회로

- `SUBMERCHANT_CREATE`
- `SUBMERCHANT_UPDATE`
- `SUBMERCHANT_SYNC`

### 대사 회로

- `TRANSACTION_RECON`
- `SETTLEMENT_RECON`

### 취소·정산 회로

- `FULL_CANCEL`
- `PARTIAL_CANCEL`: 영구 잠금
- `PAYOUT_HOLD`

### 안전장치

- `MOCK_MODE`: 테스트 전용
- `LOCAL_PAID_FALLBACK`: 영구 잠금

중요:

```text
신규 결제 OFF
≠
기존 거래 대사·정산 조회·전체취소 OFF
```

장애 시 `PRODUCTION_DRAIN`과 동일하게 신규 승인만 차단하고 기존 거래 사후처리는 유지한다.

## 6. 하위사업자 등록 UX

입력값:

```text
역할
사업자번호
상호
대표자
연락처
은행명
계좌번호
예금주
```

운영 ID 규칙:

```text
subMerchantId는 역할이나 사업자번호로 임의 생성하지 않는다.
PayUp 운영 MID의 `/cartpay/api/sub/{merchantId}/list`에서 확인되거나 PayUp이 발급한 값을 대소문자까지 그대로 사용한다.
```

등록 과정:

```text
입력 검증
→ 내부 중복 확인
→ PayUp 등록 요청
→ PayUp 목록 재조회
→ 내부 원장과 대사
→ ACTIVE 전환
→ 관리자·사업자 감사로그 기록
```

계좌번호는 서버 호출 후 마스킹 값만 저장한다.

## 7. 엑셀형 화면

다음 화면은 공통으로 행 번호, 고정 헤더, 검색, CSV 다운로드를 제공한다.

- 하위사업자
- 원거래·하위거래·분배
- 정산목록·정산상세
- 전체취소·수동처리 큐
- API·감사·사업 이벤트 로그
- 공급사·파트너 본인 판매·정산 로그

## 8. 서버 함수

### A5S 최고관리자

```text
payupAdminHealth
payupAdminFeatureFlags
payupAdminSubmerchants
payupAdminTransactions
payupAdminSettlements
payupAdminCancel
payupAdminLogs
```

### 공급사·파트너

```text
payupPartnerActivity
```

`payupPartnerActivity`는 요청 본문의 사업자 ID를 신뢰하지 않는다.
Firebase ID Token의 `organization_id`, `company_id` 또는 `business_number` Claim을 사용한다.

## 9. Secret과 환경변수

### Secret Manager

```text
PAYUP_API_KEY
PAYUP_API_CERT_KEY
```

### 서버 환경변수

```text
PAYUP_MERCHANT_ID
PAYUP_ENVIRONMENT=test|production
PAYUP_FIXED_IP_REGISTERED=true|false
PAYUP_LIVE_CALLS_ENABLED=true|false
```

### 프런트 공개 환경변수

```text
NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL
```

프런트에는 PayUp API Key와 API Cert Key를 절대 넣지 않는다.

## 10. 전체취소

```text
취소요청
→ transactionId 검증
→ 정산 HOLD
→ FULL_CANCEL 토글 확인
→ cancel2 호출
→ 응답 저장
→ 거래조회 재대사
→ 배분원장 역분개
→ 재고복원
→ 공급사·파트너 이벤트 반영
```

오류 `1003`:

```text
CANCELLED 처리 금지
→ MANUAL_PAYUP_REQUIRED
→ PAYOUT_HOLD 유지
→ 수동처리 큐
```

부분취소는 공식 API 제공 전까지 UI와 서버 모두 차단한다.

## 11. 로그 가시성

### A5S 최고관리자

- 모든 API 로그
- 모든 감사로그
- 모든 사업 이벤트
- 모든 공급사·파트너 거래·정산·취소

### 공급사·A5WS 파트너

- 자기 조직의 판매
- 자기 수취 금액
- 자기 정산 상태
- 자기 주문의 취소·역분개

다른 사업자의 차액·계좌·수익은 조회할 수 없다.

## 12. 샌드박스와 운영 경계

샌드박스에서는 다음이 동작한다.

- 메뉴 이동
- 토글 조작
- 엑셀형 표 검색
- CSV 다운로드
- 하위사업자 등록 UX
- 거래·정산·로그 조회 버튼
- 전체취소 dry-run

다음은 운영 준비 전 차단한다.

- 실제 신규 결제
- 실제 최종 승인
- 실제 하위사업자 등록·수정
- 실제 전체취소

실제 호출 개통 조건:

```text
운영 또는 테스트 merchantId
API KEY Secret
API Cert Key Secret
허용 공인 IP
PayUp 계약
기능 플래그 승인
```

## 13. 배포 순서

```text
1. 기능 브랜치 빌드
2. Next.js route 검사
3. Functions TypeScript 빌드
4. 샌드박스 프리뷰 확인
5. PayUp 테스트 Secret 등록
6. 테스트 공인 IP 등록
7. Functions 배포
8. payupAdminHealth 실제 probe
9. 하위사업자 샘플 등록·조회
10. 거래·정산 조회 검증
11. 전체취소 dry-run
12. 테스트 거래 전체취소
13. 운영 토글 순차 ON
```

## 14. 운영 전 필수 미완료 항목

- PayUp 테스트/운영 Secret 실제 등록
- 고정 NAT 공인 IP 등록
- 공급사·파트너 실사업자 KYC 완료
- 상품별 분배정책 데이터 이관
- 고객 PC·모바일 인증결제창 최종 실증
- 승인 후 `transactionId` 원장 및 분배 Projection 실증
- 전체취소 후 역분개·재고복원 실증
- 부분취소 대체 운영정책 확정

위 항목이 완료되기 전 `FINAL_APPROVAL`은 ON하지 않는다.
