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
| FB-017 | Firebase SDK 미설치 | `npm install firebase` 금지, 연결 단계 전까지 mock 유지 |

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

- Firebase config 코드 삽입
- `.env` 생성
- Secret Key 생성
- service account 생성
- 실제 Firestore 연결
- 실제 Firebase Auth 연결 코드 작성
- Firebase Storage SDK 연결
- Storage Blaze 업그레이드 지시
- 실제 PG 연결
- deploy
- 기존 mock UI 삭제
