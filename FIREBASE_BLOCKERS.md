# Firebase Blockers

작성일: 2026-05-20

## 1. 현재 상태

Firebase 프로젝트 `a5-closed-mall`은 생성되었고, Web App 등록, Firestore Database 생성, Authentication 이메일/비밀번호 활성화까지 완료되었다. 다만 현재 저장소에는 실제 Firebase 연결 코드가 없으며, Firestore Rules는 프로덕션 모드 잠금 상태를 유지한다. Storage는 Spark 요금제에서 사용 불가 안내가 표시되어 Blaze 업그레이드 전까지 보류한다.

## 2. 차단 항목

| ID | Blocker | 필요 조치 |
| --- | --- | --- |
| FB-001 | Firebase config 코드 미작성 상태 유지 | Firebase 연결 승인 전 config 삽입 금지 |
| FB-002 | `.env` 없음 | `.env`, `.env.local`, `.env.production` 생성 금지 |
| FB-003 | service account 없음 | service account/private key 생성 금지 |
| FB-004 | Firestore Database 생성 완료, Rules 잠금 상태 | 실제 연결 전 관리자/기업/조리원/태블릿/고객 QR 권한 설계 필요 |
| FB-005 | Storage Spark 요금제 사용 불가 | Blaze 업그레이드 전까지 보류, 상품 이미지/GIF는 mock placeholder 유지 |
| FB-006 | Auth 이메일/비밀번호 활성화, Custom Claims 미적용 | 관리자/기업/조리원 계정용 claims와 계정 승인 절차 필요 |
| FB-007 | PG 공식 문서/키 없음 | PG test/prod MID/KEY, callback 검증 문서 확보 필요 |
| FB-008 | 알림톡 정보 없음 | 발송사, 발신 프로필, 템플릿 승인 코드 필요 |
| FB-009 | 배송조회 API 미정 | 공식 API 또는 URL 방식 결정 필요 |
| FB-010 | 외부 재고 API 미정 | 공식 규격서, 테스트 계정, rate limit 필요 |
| FB-011 | 비회원 주문조회 인증 정책 미정 | 주문번호/휴대폰/토큰 방식과 개인정보 노출 범위 승인 필요 |
| FB-012 | 정산 정책 미정 | 수수료율, 환불 차감, 지급일, 세무/증빙 정책 필요 |
| FB-013 | dev/prod 분리 미확정 | 실고객/실결제 전 분리 필요 |
| FB-014 | Web App config 미반영 | config를 코드나 `.env`에 복사하지 않음 |
| FB-015 | 고객 로그인 미구현 | 고객은 비회원 QR 흐름 유지, 고객 Auth는 아직 만들지 않음 |
| FB-016 | Storage 실연동 승인 필요 | 입점사 상품 등록 기능 구현 전 별도 승인 필요 |
| FB-017 | Firebase SDK 설치 완료 | Web SDK는 products read 용도로 설치됨. orders/payments/qr_sessions write는 금지 |
| FB-018 | Storage Blaze 전환 필요 여부 미승인 | 상품 이미지/GIF 실제 업로드 전 요금제와 비용 승인 필요 |
| FB-019 | PG 공식 문서/키 미확보 유지 | 테스트 MID/KEY, 운영 MID/KEY, callback 검증, 취소/부분취소 문서 필요 |
| FB-020 | 알림톡 템플릿 미승인 유지 | 발송 대행사, 발신 프로필, 주문/결제/배송/환불 템플릿 코드 필요 |
| FB-021 | 배송조회 API 미확보 유지 | 택배사 코드, 송장조회 API, rate limit, 장애 응답 문서 필요 |
| FB-022 | 외부 재고 API 미확보 유지 | 외부 쇼핑몰 상품코드 매핑, 테스트 계정, 동기화 정책 필요 |

## 3. Firebase 연결 전 체크리스트

1. `FIREBASE_DECISION_REPORT.md` 승인
2. `FIREBASE_ARCHITECTURE_PLAN.md` 승인
3. `FIRESTORE_SCHEMA_PLAN.md` 승인
4. Firestore Rules 권한 매트릭스 승인
5. `AUTH_CLAIMS_PLAN.md` 승인
6. `STORAGE_RULES_PLAN.md` 승인 및 Storage 보류 정책 승인
7. `FUNCTIONS_SERVER_LOGIC_PLAN.md` 승인
8. 개발용 Firebase config를 어디에 둘지 결정
9. `.env` 생성 여부와 관리 방식 승인
10. Secret Manager 사용 정책 승인
11. dev/prod 분리 시점 승인
12. 고객은 비회원 QR 흐름으로 유지할지 재확인
13. PG/알림톡/배송조회/외부 재고 API 공식 문서와 키 확보
14. Storage Blaze 전환 필요성과 비용 승인

## 4. mock/test 베타에서 실제 Firebase로 넘어가는 로드맵

| 단계 | 작업 | 산출물 |
| --- | --- | --- |
| 1 | 설계 보고서 승인 | 현재 7개 Firebase 보고서 |
| 2 | dev Firebase 연결 방식 결정 | config/.env/secret 관리 정책 |
| 3 | Firestore schema와 mock 데이터 매핑 | migration seed plan |
| 4 | Auth Claims dev 테스트 계획 | 역할별 테스트 계정 목록 |
| 5 | Firestore Rules 권한 설계 | rules draft 전 권한 매트릭스, 테스트 케이스 |
| 6 | Cloud Functions 초안 | QR/결제 prepare/mock boundary |
| 7 | mock adapter와 dev adapter 병렬 운용 | feature flag plan |
| 8 | dev QA | 권한, QR, 금액 재계산, 주문 snapshot 검증 |
| 9 | prod 분리 판단 | 실고객/실결제 전 승인 |
| 10 | Storage 연동 승인 판단 | Blaze 요금제, 상품 이미지/GIF 업로드, 입점사 상품 등록 전 별도 승인 |

## 5. 계속 금지

- 실제 secret 값 삽입
- `.env.local` 실제 값 생성/커밋
- Secret Key 생성
- service account 생성
- products 외 실제 Firestore write 연결
- 실제 Firebase Auth 연결 코드 작성
- Firebase Storage SDK 연결
- Storage Blaze 업그레이드 지시
- PG 운영/테스트 키 삽입
- 알림톡 실제 발송
- 배송조회 실제 API 호출
- 외부 재고 실제 API 호출
- 실제 PG 승인/취소/환불/정산 연결
- deploy
- 기존 mock UI 삭제

## 6. 2026-05-25 추가 Blockers

- PG사 테스트/운영 키, callback 검증 방식, 취소/부분취소 문서 미확보
- PG secret을 실행할 서버 runtime 미확정
- 관리자 계정 초대/Custom Claims 서버 로직 미구현
- 기업 서류/상품 이미지/영상 업로드는 Storage Blaze와 보안 규칙 승인 전까지 보류
- 조리원 A4 연동 API/외부 ID 매핑 승인 전까지 실제 sync 금지
