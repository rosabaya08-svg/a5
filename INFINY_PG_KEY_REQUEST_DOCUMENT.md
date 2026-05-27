# 인피니 PG 연동 키값 및 기술자료 요청서

## 1. 요청 목적

A5 산후조리원 객실 전용 핫딜/쇼핑몰에서 입점 기업별로 인피니 PG 결제를 연동하기 위한 공식 키값, 설정값, API 문서, 테스트 환경 정보를 요청드립니다.

본 서비스는 하나의 대표 MID로 전체 판매자 결제를 처리하는 구조가 아닙니다. 입점 기업마다 인피니에서 승인 및 발급된 별도 MID와 결제 모듈 키값을 매핑해 결제하는 구조입니다.

## 2. 서비스 운영 주체

- 상호: (주)한국산후조리원연합회
- 대표자: 이석범
- 대표전화: 02-2038-2203
- 팩스: 02-2038-2203
- 사업자등록번호: 760-86-03326
- 주소: 경기 과천시 과천대로7길 65 (갈현동, 과천상상자이타워)
- 개인정보책임자 이메일: hansy0619@naver.com
- 서비스 형태: 산후조리원 객실 태블릿 기반 핫딜/쇼핑몰 결제 서비스
- 결제 방식: 고객 휴대폰에서 QR 접속 후 모바일 결제

## 3. 결제 흐름 요약

1. 객실 태블릿에서 상품을 장바구니에 담습니다.
2. 태블릿 장바구니에서 결제 QR을 생성합니다.
3. 고객이 본인 휴대폰으로 QR을 스캔합니다.
4. 고객 휴대폰에서 수령 정보와 결제 정보를 입력합니다.
5. 고객 휴대폰에서 인피니 PG 결제창을 호출합니다.
6. 결제 성공 후 Firebase Functions 서버에서 PG 승인 confirm을 처리합니다.
7. 주문, 결제, 재고, QR 상태를 서버에서 확정합니다.
8. 고객에게 주문내역 확인 링크를 제공합니다.

PG secret 계열 값은 Firebase Functions 또는 Secret Manager에서만 사용하며, 브라우저/Pages 정적 배포 코드에는 노출하지 않습니다.

## 4. 기업별 발급 요청 값

입점 기업마다 아래 항목 중 실제 인피니 연동에 필요한 값을 발급 또는 확인 부탁드립니다.

| 구분 | 요청 항목 | 설명 |
|---|---|---|
| 기업 식별 | MID | 기업별 가맹점 ID |
| 기업 인증 | merchant password | 승인/취소/조회 API에 필요한 경우 |
| 기업 인증 | signKey 또는 hashKey | 무결성 검증 또는 서명 생성용 |
| 기업 인증 | serial number | 키스에이전트 또는 모듈 인증에 필요한 경우 |
| 기업 인증 | terminal ID 또는 TID | 단말/가맹점 식별값이 필요한 경우 |
| 기업 인증 | agent ID 또는 agent key | 키스에이전트 또는 별도 agent 사용 시 |
| 결제 모듈 | moduleKey 또는 channelKey | 결제창/결제 모듈 호출용 |
| 브라우저 | clientKey 또는 public key | 고객 휴대폰 결제창 초기화용 |
| 브라우저 | script URL 또는 SDK URL | 고객 휴대폰에서 로드할 공식 PG 스크립트 |
| 브라우저 | request function name | 예: requestPayment 형태의 실제 함수명 |
| 서버 | secret key | Firebase Functions confirm/cancel/status 호출용 |
| 서버 | webhook secret | webhook 서명 검증용 |

사용하지 않는 항목이 있다면 “미사용”으로 표시 부탁드립니다.

## 5. 공식 API 및 모듈 자료 요청

아래 문서 또는 샘플을 요청드립니다.

- 모바일 웹 결제창 연동 문서
- 결제 승인 confirm API 문서
- 결제 취소 cancel API 문서
- 부분취소 가능 여부 및 API 문서
- 결제 상태 조회 API 문서
- webhook 수신 문서
- webhook signature 생성 및 검증 방식
- 결제 요청 필수 파라미터 목록
- 승인 응답 필드 목록
- 오류 코드표
- 테스트 카드/계좌/가상 결제 수단 정보
- 운영 전환 체크리스트

## 6. API endpoint 요청

테스트 및 운영 환경 각각 아래 endpoint를 요청드립니다.

| 환경 | 요청 항목 |
|---|---|
| 테스트 | API Base URL |
| 테스트 | 결제 승인 confirm URL |
| 테스트 | 결제 취소 cancel URL |
| 테스트 | 결제 상태 조회 URL |
| 테스트 | webhook 수신 URL 등록 방식 |
| 운영 | API Base URL |
| 운영 | 결제 승인 confirm URL |
| 운영 | 결제 취소 cancel URL |
| 운영 | 결제 상태 조회 URL |
| 운영 | webhook 수신 URL 등록 방식 |

## 7. Webhook 확인 요청

webhook 연동을 위해 아래 내용을 확인 부탁드립니다.

- webhook event 종류
- 결제성공 event 명칭
- 결제실패 event 명칭
- 취소/환불 event 명칭
- webhook signature header 이름
- signature algorithm: HMAC SHA-256 또는 SHA-512 여부
- raw body 기준 서명인지 여부
- 중복 event 식별값 필드명
- 재전송 정책
- webhook 실패 시 재시도 횟수와 간격

## 8. 모바일 QR 결제 가능 여부 확인

본 서비스는 고객 휴대폰에서 QR로 접속해 결제하는 방식입니다.

아래 사항을 확인 부탁드립니다.

- 모바일 브라우저에서 결제창 호출 가능 여부
- PC 설치형 키스에이전트가 필수인지 여부
- 키스에이전트가 필요한 경우 모바일 QR 결제 대체 방식
- iOS Safari 및 Android Chrome 지원 여부
- 인앱 브라우저 지원 여부
- 결제 성공/실패 redirect URL 설정 방식

## 9. Redirect URL 및 Webhook URL 등록 요청

아래 URL 형식 등록 가능 여부를 확인 부탁드립니다.

- 결제 성공 URL: `{A5_PUBLIC_BASE_URL}/q/{shortCode}/success`
- 결제 실패 URL: `{A5_PUBLIC_BASE_URL}/q/{shortCode}/failed`
- webhook URL: `{FUNCTIONS_BASE_URL}/paymentsWebhook`

운영 도메인 확정 전 테스트 도메인으로 먼저 등록 가능한지도 확인 부탁드립니다.

## 10. 확인 질문

1. 기업별 MID마다 별도 secret, signKey, password가 발급됩니까?
2. 플랫폼 본사 secret 하나로 기업별 MID 승인 처리가 가능합니까?
3. 결제창 호출에는 moduleKey와 channelKey 중 어떤 값을 사용합니까?
4. 서버 승인 confirm에는 MID 외에 어떤 인증값이 필수입니까?
5. 고객 브라우저 결제 결과로 `paymentKey`, `transactionId`, `tid` 중 어떤 값이 반환됩니까?
6. 승인 API 호출 시 금액 무결성 검증 hash를 직접 생성해야 합니까?
7. webhook signature 검증 방식은 무엇입니까?
8. 부분취소를 지원합니까?
9. 정산은 기업별 MID 기준으로 자동 분리됩니까?
10. 테스트 MID와 운영 MID 발급 절차가 어떻게 됩니까?

## 11. 전달 요청 양식

가능하다면 기업별 키값은 아래 양식으로 전달 부탁드립니다.

```txt
companyName:
businessRegistrationNumber:
MID:
merchantPassword:
signKey:
hashKey:
serialNumber:
terminalId:
agentId:
agentKey:
moduleKey:
channelKey:
clientKey:
scriptUrl:
requestFunctionName:
apiBaseUrl:
confirmUrl:
cancelUrl:
statusUrl:
webhookSecret:
webhookSignatureHeader:
webhookSignatureAlgorithm:
testOrProduction:
memo:
```

## 12. 보안 요청

secret, password, signKey, webhookSecret 등 서버 전용 값은 이메일 본문 평문 전달보다 안전한 방식으로 전달 부탁드립니다.

권장 전달 방식:

- 암호화 파일
- 별도 비밀번호 전달
- 인피니 관리자 콘솔 확인
- 보안 메신저
- 담당자 직접 전달

## 13. 당사 입력 예정 방식

인피니에서 제공한 기업별 키값은 당사 최고관리자 화면에서 기업별로 등록합니다.

기업관리자는 PG 키값을 직접 수정하지 않고, 결제 가능 상태와 마스킹된 MID/모듈키만 확인합니다.

서버 전용 secret 값은 Firebase Functions Secret Manager에 저장하고, 브라우저에는 공개 가능한 clientKey, scriptUrl, moduleKey 성격의 값만 노출합니다.
