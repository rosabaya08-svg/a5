# Firebase Contract Next Tasks

## 사람 검토 필요

1. Firestore 컬렉션과 필수 필드 gate 승인
2. Auth claims role/scope 구조 승인
3. 태블릿 인증 방식 결정
4. guest QR/order lookup 인증 방식 결정
5. Rules 초안 검토 후 Emulator 테스트 여부 결정
6. dev/prod Firebase project 분리 여부 결정
7. Secret Manager와 service account 운영 방식 결정
8. PG/알림톡/배송조회/외부 재고 공식 문서 확보
9. Storage Blaze 전환 또는 placeholder 지속 여부 결정
10. 정산 수수료, 환불 차감, 지급 승인 정책 결정
11. cart를 Firestore 독립 원장으로 둘지, QR 생성 전 클라이언트 상태로만 둘지 결정
12. settlement preview를 서버 계산으로 둘지, 배치 snapshot으로 둘지 결정

## 다음 1일 작업

1. UI 트랙 상태명과 문서 상태명 대조
2. MVP에 필요한 index 후보만 1차 선별
3. `refund_requests`, `delivery_events`, `pickup_events`를 MVP scope에 포함할지 결정
4. mock scenario catalog를 실제 mock 데이터로 옮길지 승인 여부 판단
5. pseudo-rules를 실제 Rules 테스트 케이스로 쪼갤 범위 선정
6. idempotency key 저장 위치와 unique 제약 후보 선정
7. system_status 원장 채택 여부 결정
8. `/firebase-contract/status`를 브라우저에서 열어 모바일/태블릿/데스크톱 육안 확인
9. Next.js 로컬 docs가 없는 상태를 해결할지 결정
10. `/firebase-contract/*` route hub 전체를 브라우저에서 smoke 확인
11. `/firebase-contract/smoke`와 `/firebase-contract/merge-handoff`가 보고서 내용과 일치하는지 확인

## 다음 3일 작업

1. Firestore pseudo-rules를 Emulator 테스트 케이스 목록으로 변환
2. Repository contract test 문서 초안 작성
3. seed dry-run 검증 checklist를 QA 트랙과 연결
4. QR token/short_code/order_no unique 정책 결정
5. 개인정보/주문정보 보관 정책 초안 검토
6. partial failure 보상 큐 설계 여부 결정
7. financial_events 별도 원장 채택 여부 결정

## 다음 5일 작업

1. dev/prod 분리 결정
2. Emulator 도입 여부 결정
3. Secret Manager 이름 규칙과 IAM 접근 주체 승인
4. PG test key/callback/cancel/partial cancel 문서 확보
5. 알림톡 템플릿과 배송조회 provider 후보 확보
6. rollback feature flag 전략 승인
7. App Check 적용 범위 결정

## 다음 10일 작업

1. Firebase dev adapter 작성 여부 승인
2. production adapter 차단 gate 점검
3. Storage Blaze 비용/권한/파일 타입 정책 승인
4. 외부 명품몰 재고 API 테스트 계정과 rate limit 확보
5. 운영 전 약관/개인정보/비회원 주문조회 정책 승인
6. contract test와 seed dry-run을 CI/QA 문서에 연결
7. reconciliation report 설계 승인

## merge 전 확인

- 공용 `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md`가 변경되지 않았는지 확인
- 실제 Firebase 설정 파일이 생기지 않았는지 확인
- UI 트랙과 충돌 가능한 코드 파일을 수정하지 않았는지 확인
- 문서 인코딩이 UTF-8로 정상 표시되는지 확인
- 추가 상태 UI 계약이 UI 트랙 mock 화면의 상태명과 충돌하지 않는지 확인
- `paid_mock`과 실제 `paid` 상태가 UI에서 혼동되지 않는지 확인
- `mock_tid`와 실제 PG TID가 같은 필드로 표시되지 않는지 확인
- 상태 대시보드가 실제 Firebase/PG 연결처럼 보이지 않는지 확인
- preview hub 카드가 실제 실행 버튼처럼 보이지 않는지 확인
