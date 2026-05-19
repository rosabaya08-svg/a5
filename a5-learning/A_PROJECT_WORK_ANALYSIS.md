# A Project Work Analysis

작성일: 2026-05-18

## 0. 현재 분석 범위

현재 `C:\a5`에는 Next.js 프로젝트 코드, `AGENTS.md`, 최종 ZIP 문서팩, Firebase 설정 파일이 없습니다.

따라서 이 문서는 업로드된 DOCX 6개와 추출 텍스트를 기준으로 한 **문서 기반 업무 분석**입니다. 실제 A 프로젝트 원본 코드 분석, 설치 상태 점검, Firebase 기존/신규 판단, 파일 유지/수정/신규 생성 판단은 원본 프로젝트 파일이 들어온 뒤 별도 보고서로 수행해야 합니다.

확인된 입력 문서:

- `codex_final_master_learning_directive_v1.docx`
- `sanho_closed_mall_uiux_master_v1.docx`
- `fast25_ai_automation_shoppingmall_plan_v1.docx`
- `codex_nextjs_harness_project_documentation_v2.docx`
- `codex_nextjs_error_review_guardrails_v3.docx`
- `codex_nextjs_coding_documentation_v1-1.docx`
- `codex_nextjs_coding_documentation_v1-2.docx`

중복 확인:

- `codex_nextjs_coding_documentation_v1-1.docx`와 `codex_nextjs_coding_documentation_v1-2.docx`는 SHA-256 기준 완전 동일한 중복본입니다.

## 1. 사업/업무 한 줄 정의

산후조리원 객실 태블릿에서만 상품을 탐색하고 장바구니를 만든 뒤 QR 또는 조르기 링크로 비회원 결제를 유도하며, 입점 기업은 상품/재고/배송/매출/입금을 관리하고 최고관리자는 전체 권한, 주문, 결제, 정산, 알림, 외부 API, 보안을 통제하는 **폐쇄몰형 기업 입점 커머스**입니다.

최신 작업 기준:

- `codex_final_master_learning_directive_v1.docx`를 최종 업로드용 작업 지시서로 본다.
- Codex는 바로 코딩하지 않고 `AGENTS.md`, `00_README_FIRST.md`, 프로젝트 원본 파일, Firebase/설치 상태를 먼저 감사한다.
- 대표님 승인 전까지 생성 단계로 넘어가지 않는다.

## 2. 핵심 업무 목표

1. 산후조리원 태블릿 전용 폐쇄몰 쇼핑 흐름을 만든다.
2. 고객은 회원가입 없이 QR/조르기 링크로 결제 또는 주문조회에 진입한다.
3. 기업 Admin은 상품 등록, 가격비교 표시, 이미지/GIF, 옵션/재고, 주문/배송, 매출/입금 현황을 처리한다.
4. 산후조리원 Admin은 객실, 태블릿, 현장수령, QR 이력을 관리한다.
5. 최고관리자는 입점사, 조리원, 상품 승인, 주문, QR, 결제, 취소/환불, 정산, 알림, 외부 API, 보안 로그를 통제한다.
6. PG, 알림톡, 배송조회, 외부 재고 API는 운영 계약/키/공식 문서 확보 전까지 mock/test adapter로만 처리한다.

## 3. 업무 주체와 책임

### 최고관리자

- 입점사 승인/관리
- 산후조리원/객실/태블릿 관리
- 상품 승인
- 전체 주문/결제/취소/환불/정산 관리
- 정책 설정
- 알림톡/외부 API/보안 감사 로그 확인
- 운영 체크리스트 관리

### 기업 Admin

- 상품 등록/수정/승인요청
- 가격비교/AI분석 표시값 입력
- 이미지/GIF 업로드
- 옵션/재고 관리
- 외부 재고 코드 매핑
- 주문 확인, 송장 입력, 현장수령 처리
- 취소/환불 요청 검토
- 매출/입금 현황 확인

### 산후조리원 Admin

- 조리원 가입/로그인
- 객실 관리
- 태블릿 관리
- 현장수령 주문 확인
- 객실별 QR 이력 확인
- 조리원 주문 이력 확인

### 태블릿 사용자

- 태블릿 활성화
- 상품 목록/상세 탐색
- 장바구니 구성
- 수령방식 선택
- 구매하기 QR 생성
- 조르기 QR 생성

### 고객/결제자

- QR 랜딩 진입
- 상품 요약 확인
- 수령정보 입력
- 결제자 정보 입력
- 간편결제 진행
- 결제 성공/실패 확인
- 비회원 주문조회
- 주문 상세 조회
- 환불 요청

### 외부 시스템

- PG: 결제 승인, 취소, 부분취소, TID 관리
- 카카오 알림톡/SMS: 주문/결제/배송/환불 알림
- 배송조회: 송장 기반 배송 상태 조회
- 외부 재고 API: 외부 명품쇼핑몰 재고량 동기화

## 4. 핵심 업무 흐름

### 4.1 상품 등록/승인 흐름

1. 기업 Admin이 상품 기본정보, 가격, 이미지/GIF, 옵션/재고, 배송/환불 정보를 입력한다.
2. 가격비교/AI분석은 실제 AI 판단이 아니라 원가, 플랫폼 최저가, 폐쇄몰 가격 비교값으로 생성한다.
3. 필수값, 가격 음수, 이미지 누락, 배송/수령 방식 누락을 검증한다.
4. 임시저장 상태는 `draft`, 승인요청 상태는 `pending_approval`로 관리한다.
5. 최고관리자가 상품을 검수하고 승인하면 `approved`가 된다.
6. 승인 후 핵심 가격 변경은 재승인 대상으로 본다.

### 4.2 태블릿 쇼핑/QR 생성 흐름

1. 태블릿은 인증된 기기/객실/조리원 컨텍스트에서만 폐쇄몰에 접근한다.
2. 일반 브라우저 직접 도메인 접속은 차단 또는 안내 페이지로 처리한다.
3. 태블릿 사용자는 상품을 장바구니에 담고 수령방식을 선택한다.
4. 구매하기 또는 조르기를 선택하면 QR 세션이 생성된다.
5. QR 세션에는 `nursery_id`, `room_id`, `tablet_id`, `cart_id`, `qr_session_id`, 상품 snapshot, 만료 시간이 저장되어야 한다.
6. QR은 2~3시간 만료, 1회성 사용, 재사용 차단이 필수다.

### 4.3 QR/비회원 결제 흐름

1. 고객 또는 결제자가 QR/조르기 링크로 진입한다.
2. 만료 여부와 사용 여부를 먼저 검증한다.
3. 상품 요약, 수령정보, 결제자 정보를 입력한다.
4. 프론트 금액은 신뢰하지 않고 서버에서 상품 snapshot과 정책 기준으로 재계산한다.
5. PG 테스트 adapter에서 결제 승인/실패를 처리한다.
6. 실제 PG 운영 연결은 계약, 테스트키, 운영키, 공식 문서, 사람 승인 전까지 금지한다.
7. 결제 성공 후 QR 재사용을 차단하고 주문/결제 원장을 기록한다.

### 4.4 주문/배송/현장수령 흐름

1. 결제 승인 후 주문 원장이 생성되고 입점사별 `order_items`가 분리된다.
2. 기업 Admin은 주문 목록과 상세를 확인한다.
3. 택배배송은 송장 입력 후 배송 이벤트를 기록한다.
4. 현장수령은 조리원/기업 처리 상태를 기록한다.
5. 비회원 고객은 주문조회 인증 정책에 따라 주문 상세를 확인한다.

### 4.5 취소/환불 흐름

1. 고객 또는 기업 Admin에서 취소/환불 요청이 생성된다.
2. 기업 Admin은 요청 사유와 기업 의견을 등록한다.
3. 최고관리자가 금액 검산 후 최종 승인한다.
4. PG 취소/부분취소, 재고 복구, 정산 차감은 운영 위험 영역이다.
5. 운영 환불/부분취소는 Codex 자동 실행 금지이며, 테스트 케이스와 검토표까지만 자동화한다.

### 4.6 정산/입금 흐름

1. 정산 기준은 `orders` 총액이 아니라 `order_items` 기준이다.
2. 입점사별 수수료, 취소/환불 차감, 배송비 정책을 반영해야 한다.
3. 정산 계산 초안과 검산표는 생성 가능하다.
4. 정산 확정, 지급 완료, 실제 입금 처리는 사람 승인 영역이다.

## 5. 데이터 원장 기준

필수 원장:

- `products`, `product_options`
- `inventory_movements`
- `carts`, `cart_items`
- `qr_payment_sessions`
- `orders`, `order_items`
- `payments`
- `delivery_events`, `pickup_events`
- `settlements`, `payouts`
- `notification_logs`
- `audit_logs`

삭제 금지/보존 원칙:

- 주문 생성 시 상품명, 옵션, 가격은 snapshot으로 저장한다.
- PG 결제 승인 전 `orders`를 확정하지 않는다.
- 결제 승인, QR 사용 처리, 재고 차감은 트랜잭션 또는 보상 로직으로 처리한다.
- 대시보드는 전체 원장 직접 합산이 아니라 summary 컬렉션을 사용한다.
- 목록은 커서 페이지네이션과 상태/날짜/company_id/nursery_id 필터를 기본값으로 둔다.
- 권한, 금액, 상태 변경은 `audit_logs`에 남긴다.

## 6. 업무 우선순위

### 0순위: 분석/보존

- 원본 프로젝트 파일 보존
- Git 상태 확인
- 기존 파일 삭제/대량 덮어쓰기 금지
- 문서팩 배치 후 `AGENTS.md`와 `00_README_FIRST.md` 우선 읽기

### 1순위: 규칙/계약 문서

- `AGENTS.md`
- `PROJECT_RULES.md`
- `DB_SCHEMA.md`
- `STATUS_MODEL.md`
- `SECURITY_POLICY.md`
- `AUTO_MODE_POLICY.md`
- `BLOCKERS.md`
- `NEXT_TASKS.md`
- `AUTO_REPORT.md`

### 2순위: 구조/권한/상태 모델

- role, company_id, nursery_id, room_id, tablet_id, qr_session_id 기준 확정
- QR/Order/Payment/Settlement 상태 전이 확정
- 불가능한 상태 이동 차단

### 3순위: mock 기반 UI

- 최고관리자 UI
- 기업 Admin UI
- 산후조리원 Admin UI
- 태블릿 폐쇄몰 UI
- QR/비회원 결제 UI

### 4순위: mock/test adapter

- PG mock/test adapter
- 알림톡 mock adapter
- 배송조회 mock/URL adapter
- 외부 재고 mock adapter

### 5순위: 검증/QA

- lint/build/test
- Browser smoke test
- 권한 격리 검증
- QR 만료/재사용/동시 결제 검증
- 서버 금액 재계산 검증
- order_items 기준 정산 검산

## 7. 자동화 등급

### A등급: 자동 생성 가능

- 문서 생성/정리
- Next.js 화면 생성
- 기본 CRUD 초안
- mock 데이터
- mock API
- 테스트 초안
- UI 오류 수정
- 보고서 작성

조건:

- 개발 브랜치/worktree 내부
- 허용 파일/폴더 안에서만 작업
- 결제/환불/정산/보안/배포/Secret 영역 진입 시 즉시 중단

### B등급: 부분자동

- QR 세션 초안
- 권한 rules 초안
- PG test adapter
- 알림톡/배송조회/외부 재고 adapter interface
- 정산 계산 초안

조건:

- schema/interface/mock/test/risk report까지만 가능
- deep fix 금지
- 금액/권한/외부 API 문서 불확실 시 `BLOCKERS.md` 기록

### C등급: 자동 실행 금지

- PG 운영 MID/KEY 등록
- 실결제
- 운영 환불/부분취소
- 정산 지급
- 운영 배포
- 운영 DB 삭제/마이그레이션
- Secret Key 변경 또는 코드 노출
- 개인정보/약관/법무 최종 판단

처리:

- 코드 작성 금지
- 체크리스트, 필요 문서, 승인 절차, 재개 조건만 작성

## 8. 주요 리스크

1. Codex가 기존 A 프로젝트 원본을 무시하고 새로 생성할 위험
2. UI 작업 중 결제/정산/보안 파일까지 수정하는 방향 이탈 위험
3. 공식 문서 없는 PG/배송/재고/알림 API를 추측 구현하는 위험
4. mock adapter를 운영 연동처럼 설명하는 위험
5. 테스트 미실행 또는 실패를 성공으로 보고하는 위험
6. Firestore Rules가 서버 SDK/Cloud Functions 접근까지 막는다고 오해하는 위험
7. QR 재사용, 동시 결제, 만료 후 접근 허용 위험
8. 프론트 금액 위변조를 서버에서 재계산하지 않는 위험
9. 정산을 `orders` 총액 기준으로 처리하는 위험
10. Secret Key가 프론트 코드나 저장소에 노출되는 위험

## 9. 반드시 필요한 게이트

### Gate 0: 문서/정책

통과 조건:

- `AGENTS.md`, `PROJECT_RULES.md`, `DB_SCHEMA.md`, `STATUS_MODEL.md`, `SECURITY_POLICY.md`, `AUTO_MODE_POLICY.md` 준비

통과 전 금지:

- QR/PG/정산 개발

### Gate 1: 권한

통과 조건:

- role, company_id, nursery_id, tablet_id 격리 설계

통과 전 금지:

- 주문/결제 개발

### Gate 2: 폐쇄몰

통과 조건:

- 태블릿 인증, 일반 접속 차단, QR 접근 설계

통과 전 금지:

- 고객 QR 결제 연결

### Gate 3: QR

통과 조건:

- 만료, 재사용 차단, 출처 저장, 서버 금액 재계산

통과 전 금지:

- PG 연결

### Gate 4: PG 테스트

통과 조건:

- prepare/approve/cancel/partial cancel 테스트, TID 저장 검증

통과 전 금지:

- 운영 MID 전환

### Gate 5: 주문/배송/알림

통과 조건:

- 주문 snapshot, 재고 이동, 배송 이벤트, 알림 로그

통과 전 금지:

- 운영 알림 발송

### Gate 6: 정산

통과 조건:

- `order_items` 기준 정산 계산, 취소/환불 차감 검산

통과 전 금지:

- 지급 완료 처리

## 10. 최초로 생성해야 할 보고서

원본 A 프로젝트가 들어오면 Codex는 바로 코딩하지 않고 아래 보고서를 먼저 작성해야 합니다.

- `A_PROJECT_FILE_INVENTORY.md`
- `A_PROJECT_ARCHITECTURE_MAP.md`
- `A_PROJECT_GAP_ANALYSIS.md`
- `A_PROJECT_RISK_REGISTER.md`
- `A_PROJECT_FIREBASE_REPORT.md`
- `INSTALLATION_STATUS_REPORT.md`
- `MIGRATION_OR_REBUILD_PLAN.md`

현재는 원본 프로젝트 파일이 없으므로 위 보고서는 아직 작성할 수 없습니다.

## 11. 현재 BLOCKERS

1. 최종 DOCX 지시서 `codex_final_master_learning_directive_v1.docx`는 있음
2. 최종 ZIP 문서팩은 현재 `C:\a5`에 없음
3. `AGENTS.md`와 `00_README_FIRST.md`가 현재 `C:\a5`에 없음
4. A 프로젝트 원본 코드가 현재 `C:\a5`에 없음
5. `package.json`, Next.js 설정, Firebase 설정 파일이 현재 `C:\a5`에 없음
6. Firebase 보고서 명칭이 `A_PROJECT_FIREBASE_REPORT.md`와 `FIREBASE_DECISION_REPORT.md`로 섞여 있어 정리 필요
7. 기존 Firebase 프로젝트의 Owner/IAM/운영 데이터 여부 확인 불가
8. PG 계약사, 테스트 MID/KEY, 운영 MID/KEY 확인 불가
9. 카카오 알림톡 발송 대행사와 템플릿 승인 상태 확인 불가
10. 외부 재고 API 공식 문서/테스트 계정 확인 불가
11. 배송조회 API 또는 택배사 URL 방식 결정 필요
12. 정산 정책, 수수료율, 환불 차감 기준 확정 필요
13. 개인정보/약관/비회원 주문조회 인증 정책 확정 필요

## 12. 다음 작업 후보

1. 최종 ZIP 문서팩을 `C:\a5` 또는 실제 A 프로젝트 루트에 배치하고 압축 해제
2. A 프로젝트 원본 코드/폴더를 `C:\a5` 아래 또는 명확한 루트 경로로 제공
3. `AGENTS.md`와 `00_README_FIRST.md`를 기준으로 읽기 전용 파일 인벤토리 작성
4. `A_PROJECT_FILE_INVENTORY.md` 작성
5. `A_PROJECT_ARCHITECTURE_MAP.md` 작성
6. `A_PROJECT_GAP_ANALYSIS.md` 작성
7. `A_PROJECT_FIREBASE_REPORT.md` 작성
8. 대표님 승인 후 A등급 문서/화면/mock 작업부터 시작
