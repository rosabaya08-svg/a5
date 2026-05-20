# Firebase Blockers

작성일: 2026-05-20

## 1. 현재 상태

Firebase 프로젝트 `a5-closed-mall`은 생성되었지만 현재 저장소에는 실제 Firebase 연결 코드가 없다. 이번 단계에서는 설계 보고서만 작성한다.

## 2. 차단 항목

| ID | Blocker | 필요 조치 |
| --- | --- | --- |
| FB-001 | Firebase config 코드 미작성 상태 유지 | Firebase 연결 승인 전 config 삽입 금지 |
| FB-002 | `.env` 없음 | `.env`, `.env.local`, `.env.production` 생성 금지 |
| FB-003 | service account 없음 | service account/private key 생성 금지 |
| FB-004 | Firestore Rules 미작성 | 권한 매트릭스 확정 후 rules 초안 작성 |
| FB-005 | Storage Rules 미작성 | 파일 경로/용량/권한 정책 확정 후 rules 초안 작성 |
| FB-006 | Auth Custom Claims 미적용 | 관리자 서버 로직과 계정 승인 절차 필요 |
| FB-007 | PG 공식 문서/키 없음 | PG test/prod MID/KEY, callback 검증 문서 확보 필요 |
| FB-008 | 알림톡 정보 없음 | 발송사, 발신 프로필, 템플릿 승인 코드 필요 |
| FB-009 | 배송조회 API 미정 | 공식 API 또는 URL 방식 결정 필요 |
| FB-010 | 외부 재고 API 미정 | 공식 규격서, 테스트 계정, rate limit 필요 |
| FB-011 | 비회원 주문조회 인증 정책 미정 | 주문번호/휴대폰/토큰 방식과 개인정보 노출 범위 승인 필요 |
| FB-012 | 정산 정책 미정 | 수수료율, 환불 차감, 지급일, 세무/증빙 정책 필요 |
| FB-013 | dev/prod 분리 미확정 | 실고객/실결제 전 분리 필요 |

## 3. Firebase 연결 전 체크리스트

1. `FIREBASE_DECISION_REPORT.md` 승인
2. `FIREBASE_ARCHITECTURE_PLAN.md` 승인
3. `FIRESTORE_SCHEMA_PLAN.md` 승인
4. `AUTH_CLAIMS_PLAN.md` 승인
5. `STORAGE_RULES_PLAN.md` 승인
6. `FUNCTIONS_SERVER_LOGIC_PLAN.md` 승인
7. 개발용 Firebase config를 어디에 둘지 결정
8. `.env` 생성 여부와 관리 방식 승인
9. Secret Manager 사용 정책 승인
10. dev/prod 분리 시점 승인

## 4. mock/test 베타에서 실제 Firebase로 넘어가는 로드맵

| 단계 | 작업 | 산출물 |
| --- | --- | --- |
| 1 | 설계 보고서 승인 | 현재 7개 Firebase 보고서 |
| 2 | dev Firebase 연결 방식 결정 | config/.env/secret 관리 정책 |
| 3 | Firestore schema와 mock 데이터 매핑 | migration seed plan |
| 4 | Auth Claims dev 테스트 계획 | 역할별 테스트 계정 목록 |
| 5 | Firestore/Storage Rules 초안 | rules draft, 테스트 케이스 |
| 6 | Cloud Functions 초안 | QR/결제 prepare/mock boundary |
| 7 | mock adapter와 dev adapter 병렬 운용 | feature flag plan |
| 8 | dev QA | 권한, QR, 금액 재계산, 주문 snapshot 검증 |
| 9 | prod 분리 판단 | 실고객/실결제 전 승인 |

## 5. 계속 금지

- Firebase config 코드 삽입
- `.env` 생성
- Secret Key 생성
- service account 생성
- 실제 Firestore 연결
- 실제 PG 연결
- deploy
- 기존 mock UI 삭제
