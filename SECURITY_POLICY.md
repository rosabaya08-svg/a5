# Security Policy

작성일: 2026-05-19

## 1. 보안 경계

현재 베타는 mock/test 전용이며 실제 인증, 실제 Firebase, 실제 PG, 실제 알림, 실제 외부 API를 연결하지 않는다.

## 2. 금지 파일

다음 파일은 생성하거나 수정하지 않는다.

- `.env`
- `.env.*`
- service account JSON
- private key
- 실제 PG Key 파일
- Firebase 운영 설정
- 운영 배포 설정의 실행 스크립트

## 3. 권한 원칙

- 최고관리자만 전체 mock 데이터를 볼 수 있다.
- 기업 Admin은 자기 `company_id`의 상품, 주문상세, 정산만 볼 수 있어야 한다.
- 산후조리원 Admin은 자기 `nursery_id`의 객실, 태블릿, 현장수령, QR 이력만 볼 수 있어야 한다.
- 태블릿 세션은 `nursery_id`, `room_id`, `tablet_id`와 묶여야 한다.
- 고객/보호자는 회원가입 없이 QR token 또는 주문조회 인증으로만 접근한다.

## 4. 금액/결제 보안 원칙

- 실제 구현 시 결제 금액은 프론트 입력값을 신뢰하지 않는다.
- 서버 snapshot 기준으로 상품, 옵션, 배송비, 할인, 수수료를 재계산해야 한다.
- mock adapter는 운영 PG 호출처럼 보이면 안 된다.
- 운영 PG 전환은 계약, 공식 문서, 테스트 MID, 운영 MID, 사람 승인 없이는 금지한다.

## 5. 감사 로그 원칙

권한, 금액, 결제, 환불, 정산, 상품 승인 상태 변화는 `audit_logs` 또는 financial event로 남겨야 한다. 현재 베타는 mock audit log 데이터만 제공한다.

## 6. Firebase 보안 메모

Firestore Rules는 클라이언트 SDK 접근을 제한하지만 서버 SDK/Cloud Functions/Cloud Run의 IAM 접근을 대체하지 않는다. 운영 설계 전에는 Firebase 연결을 만들지 않는다.
