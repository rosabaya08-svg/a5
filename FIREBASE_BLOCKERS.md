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

- Firebase config 코드 삽입
- `.env` 생성
- Secret Key 생성
- service account 생성
- 실제 Firestore 연결
- 실제 Firebase Auth 연결 코드 작성
- Firebase Storage SDK 연결
- Storage Blaze 업그레이드 지시
- PG 운영/테스트 키 삽입
- 알림톡 실제 발송
- 배송조회 실제 API 호출
- 외부 재고 실제 API 호출
- 실제 PG 연결
- deploy
- 기존 mock UI 삭제

## 6. 5일 베타 추가 차단 항목

| ID | Blocker | 필요한 결정 |
| --- | --- | --- |
| FB-023 | Firestore Rules 초안이 문서 단계에 머무름 | Emulator 테스트 여부와 일정 결정 |
| FB-024 | App Check 적용 범위 미정 | 태블릿/고객 QR/관리자 웹 각각 적용 여부 결정 |
| FB-025 | Server SDK IAM 최소 권한 설계 미정 | Functions별 service account 분리 여부 결정 |
| FB-026 | QR token 생성/해시 알고리즘 미정 | 원문 token 생성 규칙, 길이, 만료 정책 결정 |
| FB-027 | 주문번호와 short code unique 보장 방식 미정 | transaction, counter, random retry 중 선택 |
| FB-028 | 태블릿 인증 방식 미정 | 등록 코드, device token, 제한 Auth 계정 중 선택 |
| FB-029 | guest 주문조회 인증 방식 미정 | 주문번호+휴대폰 hash, QR token 재사용, 별도 lookup token 중 선택 |
| FB-030 | 정산 수수료와 환불 차감 정책 미정 | 입점사별 수수료, 환불 후 정산 재계산 기준 결정 |
| FB-031 | 실제 상품 이미지/GIF 저장 방식 미정 | Storage Blaze 전환, 외부 CDN, placeholder 지속 중 선택 |
| FB-032 | mock seed 기준 데이터 일부 부족 | companies, nurseries, rooms, tablets, policies mock 원장 보강 필요 |

## 7. 질문 대신 기록한 결정 필요 사항

무인 파일 생성 모드 지시에 따라 질문하지 않고 아래 항목을 차단 목록으로 남긴다.

- 태블릿 인증은 현재 `TABLET_DEVICE` claims 계약만 정의하고, 발급 방식은 미정으로 둔다.
- 고객/보호자는 Auth 계정을 만들지 않는 방향을 기본값으로 둔다.
- PG, 환불, 정산 지급은 mock 상태와 문서 gate까지만 유지한다.
- Firestore Rules는 실제 파일이 아니라 문서 초안만 유지한다.
- Firebase Emulator는 유용하지만, 설정 파일 생성은 금지 항목으로 유지한다.

## 8. 실제 Firebase 연결 전 go/no-go 체크리스트

아래 항목이 모두 `GO`가 되기 전에는 Firebase SDK import, config 삽입, Rules 파일 생성, deploy를 진행하지 않는다.

| 항목 | GO 기준 | 현재 상태 |
| --- | --- | --- |
| Firestore schema | 필수 컬렉션, 필드, 인덱스 후보 승인 | 문서 보강 완료, 승인 필요 |
| Auth claims | role/scope, 발급/회수 절차 승인 | 문서 보강 완료, 승인 필요 |
| Rules matrix | SUPER/COMPANY/NURSERY/TABLET/guest 접근 범위 승인 | 문서 초안, 파일 생성 금지 |
| QR token | 생성, hash, 만료, 1회 사용 정책 승인 | 결정 필요 |
| 주문번호/short code | unique 보장 방식 승인 | 결정 필요 |
| Payment | PG test key, callback 검증 문서 확보 | 미확보 |
| Secret Manager | secret 목록과 접근 주체 승인 | 후보만 있음 |
| IAM | service account 최소 권한 설계 승인 | 미정 |
| Storage | Blaze/비용/권한/업로드 정책 승인 | 보류 |
| 개인정보 | 비회원 주문조회 인증과 노출 범위 승인 | 미정 |
| QA | mock contract test와 Rules test 계획 승인 | 후보만 있음 |

## 9. dev/prod 분리 시점

| 시점 | 판단 |
| --- | --- |
| 현재 mock/test 베타 | Firebase 연결 금지, 단일 mock 계약 유지 |
| dev adapter 작성 직전 | dev Firebase project 또는 Emulator 사용 여부 결정 |
| PG test key 확보 후 | dev project에서 결제 prepare/callback 검증 후보 |
| 실제 고객 QR 배포 전 | prod Firebase project 분리 필수 |
| 실제 결제/환불/정산 전 | prod Secret, IAM, audit, backup, 비용 승인 필수 |

운영 데이터, 운영 PG key, 운영 알림톡, 실제 배송조회, 외부 재고 API는 dev 검증 없이 prod에 직접 붙이지 않는다.

## 10. Firebase Emulator 검토

Emulator를 도입하면 아래 항목을 먼저 검증한다. 단, 현재 작업에서는 Emulator 설정 파일을 만들지 않는다.

| 검토 항목 | 목적 |
| --- | --- |
| Auth Emulator | `SUPER_ADMIN`, `COMPANY_ADMIN`, `NURSERY_ADMIN`, `TABLET_DEVICE` claims 테스트 |
| Firestore Emulator | Rules matrix와 scope 차단 테스트 |
| Functions Emulator | QR 생성/만료, 결제 준비, 주문 확정 transaction 검증 |
| Seed dry-run | mock 데이터 변환과 참조 무결성 검증 |
| Contract test | mock repository와 dev adapter의 반환 계약 비교 |

Emulator 도입 결정 후에도 `.env`, Firebase config, rules 파일은 별도 승인 작업에서 생성한다.

## 11. Batch 14 dev/prod 분리 의사결정표

현재 `a5-closed-mall` 단일 프로젝트가 준비되어 있으나, 운영 전에는 dev/prod 분리 여부를 다시 결정해야 한다.

| 조건 | 단일 프로젝트 유지 가능 | dev/prod 분리 필수 |
| --- | --- | --- |
| mock UI만 사용 | 가능 | 선택 |
| Firebase SDK dev 연결 | 가능하지만 권장하지 않음 | 권장 |
| 실제 고객 QR 배포 | 불가 | 필수 |
| PG test key 연결 | dev project 권장 | prod와 분리 |
| PG prod key 연결 | 불가 | 필수 |
| 알림톡/SMS 실제 발송 | 불가 | 필수 |
| Storage 실제 업로드 | 제한적 가능 | 운영 전 분리 권장 |
| 외부 재고 API 동기화 | dev test만 가능 | 운영 전 분리 필수 |

결론: 현재는 단일 프로젝트로 문서/Mock 베타를 유지하고, 실제 고객/결제/알림/재고가 닿기 전 dev/prod를 분리한다.

## 12. Batch 15 Emulator 가능/불가능 항목

| 항목 | Emulator 가능 | Emulator 불가능 또는 한계 |
| --- | --- | --- |
| Auth claims | role/scope 테스트 가능 | 실제 운영자 초대/계정 정책 검증 한계 |
| Firestore Rules | read/write scope 테스트 가능 | 서버 SDK 우회/IAM 위험은 별도 검토 |
| Functions | QR 생성/만료/주문 transaction 흐름 검증 가능 | PG/알림/배송/외부재고 실제 provider 검증 불가 |
| Seed | dry-run과 참조 무결성 검증 가능 | 운영 데이터 마이그레이션 검증 아님 |
| Storage | 권한 흐름 일부 검토 가능 | Blaze 비용/운영 업로드 트래픽 검증 아님 |
| App Check | 로컬 검토 제한적 | 운영 abuse 방지 효과 검증 한계 |

Emulator를 쓰더라도 실제 설정 파일 생성은 별도 승인 후 진행한다.

## 13. Batch 16 이후 추가 blockers

| ID | Blocker | 안전한 현재 처리 |
| --- | --- | --- |
| FB-033 | `payouts` 실제 지급 정책 미정 | `paid_mock` 또는 `blocked` 문서 상태만 사용 |
| FB-034 | `notification_logs` provider ID 미정 | provider_message_id 비움 |
| FB-035 | PG callback URL 미정 | callback route 생성 금지 |
| FB-036 | PG cancel/partial cancel 문서 미확보 | 환불 요청 mock만 유지 |
| FB-037 | 배송조회 carrier code 표준 미정 | mock carrier code만 사용 |
| FB-038 | 외부 재고 external_sku 매핑 미정 | `external_sku` 후보만 문서화 |
| FB-039 | Storage 증빙 파일 보존 기간 미정 | 증빙 업로드 금지 |
| FB-040 | Rules helper 실제 문법 검증 전 | rules 파일 생성 금지 |

## 14. Batch 33 서버 SDK 우회 위험 통제

서버 SDK와 Cloud Functions는 Firestore Rules를 우회할 수 있다. 따라서 Rules 작성만으로 보안이 끝나지 않는다.

| 통제 항목 | 필요 조치 | 현재 상태 |
| --- | --- | --- |
| IAM | 기능별 최소 권한 service account 후보 | 미정, service account 생성 금지 |
| Cloud Functions 검증 | 모든 mutation에서 claims/scope/amount/status 재검증 | 문서화 완료, 코드 없음 |
| audit log | 금액/권한/상태 변경 append-only | 문서화 완료 |
| App Check | 공개 client abuse 완화 | 적용 범위 미정 |
| Secret Manager | key를 코드/파일에 넣지 않음 | 이름만 정의 |
| Emulator/Tests | Rules와 server validation 시나리오 검증 | 설정 파일 생성 금지 |

## 15. Batch 36 Secret Manager 확정 항목

| 분류 | Secret 후보 | 우선순위 | 주의 |
| --- | --- | --- | --- |
| PG | `PG_TEST_MID`, `PG_TEST_SECRET`, `PG_PROD_MID`, `PG_PROD_SECRET` | high | 값 생성/문서 기록 금지 |
| 알림톡/SMS | `ALIMTALK_API_KEY`, `ALIMTALK_SENDER_KEY`, `SMS_API_KEY` | high | 템플릿 승인 전 사용 금지 |
| 배송 | `DELIVERY_API_KEY` | medium | 공식 문서 전 사용 금지 |
| 외부 재고 | `EXTERNAL_INVENTORY_API_KEY`, `EXTERNAL_INVENTORY_API_SECRET` | medium | rate limit/장애 정책 필요 |
| 내부 서명 | `APP_INTERNAL_SIGNING_SECRET` | high | QR/order token 서명용, 생성 금지 |
| Firebase Admin | Admin credential 또는 workload identity | high | private key 파일 생성 금지, 가능하면 keyless 권장 |

## 16. Batch 37 Storage Blaze 전환 조건

| 대상 | 조건 | blocker |
| --- | --- | --- |
| 상품 이미지 | 입점사 업로드, 썸네일/원본 분리, 파일 타입 제한 | Blaze 비용/권한 미승인 |
| 상품 GIF/동영상 | 용량 제한, 검수, CDN 전략 | 비용/저작권/성능 검토 필요 |
| 환불 증빙 | 개인정보 포함 가능성, 접근 제한 | 보존 기간/삭제 정책 필요 |
| 정산 파일 | 회계/세무 민감정보 | SUPER_ADMIN 제한, 다운로드 감사 필요 |
| 사업자 서류 | 입점 심사 자료 | 암호화/접근 감사 필요 |

허용 파일 타입 후보: `jpg`, `png`, `webp`, 제한적 `gif`, PDF 증빙 후보. 실제 Storage Rules 파일은 만들지 않는다.

## 17. Batch 38 dev/prod 분리 조건 재정리

| 이벤트 | 분리 필요성 |
| --- | --- |
| mock UI/문서만 | 분리 불필요 |
| Emulator 테스트 | 분리 불필요, 로컬 |
| dev Firebase SDK 연결 | dev project 권장 |
| PG test key 연결 | dev project 필수 권장 |
| 고객 QR 외부 공유 | prod 분리 전 금지 |
| 운영 PG/알림톡/배송/재고 연결 | prod 분리 필수 |
| 개인정보 저장 | prod 보안/약관/보관 정책 승인 필수 |

## 18. Batch 39 Emulator 가능/불가능 항목 확장

| 영역 | 가능 | 불가능/한계 |
| --- | --- | --- |
| Auth | claims payload 테스트 | 운영 초대/비밀번호 정책 완전 검증 |
| Firestore | Rules, index 후보, transaction 일부 | 서버 SDK IAM 우회 검증 |
| Functions | QR/order/payment mock 흐름 | 실제 PG webhook |
| Storage | 기본 read/write 권한 후보 | Blaze 비용/운영 트래픽 |
| PG | mock callback 시뮬레이션 | 실제 승인/취소/부분취소 |
| 알림톡/SMS | notification log 생성 | 실제 발송/템플릿 승인 |
| 배송조회 | mock status batch | 실제 carrier API |
| 외부 재고 | mock sync failure | 실제 rate limit/장애 응답 |

## 19. Batch 41 운영 전 승인 체크리스트

| 항목 | 승인 주체 후보 | 상태 |
| --- | --- | --- |
| PG 테스트키/운영키 | 대표/결제 담당 | 미확보 |
| 알림톡 템플릿 | 운영/마케팅 | 미승인 |
| 배송조회 문서 | 운영/개발 | 미확보 |
| 외부 재고 API 문서 | 제휴/개발 | 미확보 |
| Blaze 비용 | 대표 | 미승인 |
| 개인정보 처리 | 법무/개인정보 담당 | 미검토 |
| 약관/비회원 주문조회 | 법무/운영 | 미검토 |
| dev/prod 분리 | 대표/개발 | 미결정 |
| IAM/Secret 정책 | 개발/보안 | 미결정 |

## 20. Batch 45 BLOCKERS 등급 재분류

| 등급 | 항목 | 처리 원칙 |
| --- | --- | --- |
| C등급 | 실제 PG, 운영 환불, 정산 지급, 운영 배포, Secret 생성, service account/private key | 사람 승인 전 금지 |
| B등급 | schema, Rules 초안, mock/test adapter, Emulator 계획, seed dry-run | 문서/테스트 후보까지 가능 |
| A등급 | UI mock, report, 상태 배지, 빈/오류 상태, mock scenario | 병렬 생성 가능 |

## 21. Batch 46 우선순위별 최신 blockers

### High

- 실제 PG key/callback/cancel/partial cancel 문서 미확보
- Secret Manager/IAM/service account 정책 미승인
- dev/prod 분리 미결정
- 개인정보/약관/비회원 주문조회 정책 미검토
- Storage Blaze 비용/권한 미승인

### Medium

- 배송조회 API와 carrier code 미확보
- 외부 재고 API, external_sku 매핑, rate limit 미확보
- 알림톡 템플릿/발송사 API 미승인
- Emulator 도입 여부 미정
- settlement/payout 운영 정책 미정

### Low

- mock scenario 실제 데이터화 미완료
- 상세 페이지 related/timeline DTO 확정 필요
- 검색 prefix key 또는 별도 검색 서비스 결정 필요
- UI 트랙 상태명과 문서 상태명 대조 필요

## 22. Batch 68 추가 고도화 blockers

| 우선순위 | Blocker | 안전 처리 |
| --- | --- | --- |
| high | idempotency key 실제 저장 위치 미정 | 문서 후보만 유지 |
| high | payment/order partial failure 보상 큐 미정 | 운영 PG 전환 금지 |
| high | QR token rate limit 정책 미정 | guest flow는 mock만 |
| medium | system_status 원장 실제 생성 여부 미정 | 문서 후보만 유지 |
| medium | financial_events 별도 컬렉션 채택 여부 미정 | audit_logs와 후보 구분만 |
| medium | contract test 파일 생성 시점 미정 | 문서 acceptance만 |
| low | DTO versioning 실제 타입 생성 미정 | 문서 후보만 |

## 23. Batch 69 추가 no-go 조건

- Secret-like 값이 문서나 mock 데이터에 포함되면 작업 중단
- `mock_tid`를 실제 PG TID처럼 사용하는 UI가 발견되면 수정 필요
- `orders.total_amount`로 company settlement를 계산하는 코드가 발견되면 차단
- CUSTOMER_GUEST가 list query를 수행하는 구조가 발견되면 차단
- server SDK mutation에 audit log가 없는 설계는 차단
- Storage 원본 파일 공개 URL을 직접 저장하는 설계는 차단

## 24. Batch 70 handoff checklist

| 인계 항목 | 확인 |
| --- | --- |
| 문서만 수정 | Firebase 설정/Rules 파일 없음 |
| reports 업데이트 | AUTO_REPORT/NEXT_TASKS/BLOCKERS/UNATTENDED_PROGRESS/COMMIT_CANDIDATE |
| C등급 차단 | PG/환불/정산/Secret/deploy 금지 유지 |
| UI 트랙 대조 | 상태명/DTO/mock scenario 비교 필요 |
| QA 트랙 대조 | contract test, dry-run, pseudo-rules test 연결 필요 |
