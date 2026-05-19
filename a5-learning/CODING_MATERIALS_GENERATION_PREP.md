# Coding Materials Generation Prep

작성일: 2026-05-18

## 0. 상태

`codex_final_master_learning_directive_v1.docx`까지 분석 완료.

현재 단계는 **코딩 전 준비 단계**입니다. 이 문서는 실제 구현 파일을 만들기 위한 준비표이며, 앱 코드/라우트/컴포넌트/API/Firebase 설정을 생성하지 않습니다.

## 1. 새로 반영한 최종 지시서

원본:

- `C:\a5\codex_final_master_learning_directive_v1.docx`

분석용 추출본:

- `C:\a5\.codex_docx_text\codex_final_master_learning_directive_v1.txt`

SHA-256:

- `43E51FB5619FD746887202BA8375D3532A17ACFA2ECB819375A4C34E37893A91`

핵심 반영 내용:

- Codex는 구현 에이전트지만 처음부터 구현하지 않는다.
- 먼저 `AGENTS.md`와 `00_README_FIRST.md`를 읽는다.
- 현재 A 프로젝트 원본 파일을 스캔한다.
- 기존 파일과 문서팩 요구사항을 교차 분석한다.
- Firebase 기존/신규 사용 여부를 보고서로 판단한다.
- 설치 상태를 점검한다.
- 위험 항목은 `BLOCKERS.md`로 분리한다.
- 대표님 승인 후에만 기능별 생성 단계로 넘어간다.

## 2. 문서 우선순위

현재 기준으로 코딩 자료 생성 시 참조 우선순위는 아래 순서로 둔다.

1. `codex_final_master_learning_directive_v1.docx`
2. `codex_nextjs_error_review_guardrails_v3.docx`
3. `codex_nextjs_harness_project_documentation_v2.docx`
4. `sanho_closed_mall_uiux_master_v1.docx`
5. `fast25_ai_automation_shoppingmall_plan_v1.docx`
6. `codex_nextjs_coding_documentation_v1-1.docx` / `v1-2.docx`

참고:

- `v1-1`과 `v1-2`는 동일한 중복본이다.
- `sanho` 문서는 기능/화면 원천이다.
- `guardrails v3`는 자동화 안전 기준이다.
- `final directive v1`은 Codex 업로드용 최종 작업 흐름 기준이다.

## 3. 현재 작업 금지선

지금은 아래 작업을 하지 않는다.

- Next.js 프로젝트 생성
- 앱 라우트 생성
- React 컴포넌트 생성
- API route/server action 생성
- Firebase 설정 파일 생성
- Firestore rules 작성
- `.env` 또는 Secret 관련 파일 작성
- PG/알림톡/배송/외부 재고 adapter 코드 작성
- 기존 파일 삭제 또는 덮어쓰기
- 운영 배포

허용되는 작업:

- 문서 분석
- 코딩 자료 생성 준비 문서 작성
- 생성 대상 파일 목록 정리
- 보고서 템플릿 설계
- 승인 전 체크리스트 작성
- 충돌/불명확 항목 정리

## 4. 코딩 자료 생성 전 필요한 입력

실제 코딩 자료를 생성하려면 아래 중 하나가 필요하다.

### 선택 A: 최종 ZIP 문서팩

필요 파일:

- `codex_final_master_docs_pack_v1.zip`

예상 구성:

- `00_README_FIRST.md`
- `AGENTS.md`
- `01_PROJECT_CONTEXT_MASTER.md`
- `02_A_PROJECT_AUDIT_PROTOCOL.md`
- `03_INSTALLATION_PRIORITY.md`
- `04_FIREBASE_DECISION_MATRIX.md`
- `05_WORKFLOW_PRIORITY.md`
- `06_AUTOMATION_POLICY.md`
- `07_CODEX_MASTER_PROMPTS.md`
- `08_PROGRAM_MODULE_MAP.md`
- `09_EXTERNAL_INTEGRATION_BLOCKERS.md`
- `10_VALIDATION_AND_QA_GATES.md`
- `REPORT_TEMPLATES.md`
- `SAFE_MODES.md`
- `MASTER_CONCATENATED.md`

현재 상태:

- ZIP 파일은 아직 `C:\a5`에 없음.

### 선택 B: A 프로젝트 원본 폴더

필요 파일/폴더 예시:

- `.git`
- `package.json`
- `app` 또는 `pages`
- `components`
- `lib`
- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `functions`
- `.env.example`
- 기존 문서/README

현재 상태:

- A 프로젝트 원본 코드 폴더는 아직 `C:\a5`에 없음.

## 5. 최초 생성해야 할 분석 보고서

원본 프로젝트가 들어오면 바로 코딩하지 않고 아래 보고서부터 만든다.

1. `A_PROJECT_FILE_INVENTORY.md`
2. `A_PROJECT_ARCHITECTURE_MAP.md`
3. `A_PROJECT_GAP_ANALYSIS.md`
4. `A_PROJECT_RISK_REGISTER.md`
5. `A_PROJECT_FIREBASE_REPORT.md`
6. `INSTALLATION_STATUS_REPORT.md`
7. `MIGRATION_OR_REBUILD_PLAN.md`
8. `BLOCKERS.md`

## 6. 보고서 명칭 정리 필요

최종 지시서 내부에서 Firebase 보고서 명칭이 일부 섞여 있다.

등장 명칭:

- `A_PROJECT_FIREBASE_REPORT.md`
- `FIREBASE_DECISION_REPORT.md`

권장 정리:

- 기본 보고서: `A_PROJECT_FIREBASE_REPORT.md`
- 내부 필수 섹션: `Firebase Decision`
- 결정값은 아래 중 하나로 기록:
  - `USE_EXISTING_FOR_DEV_ONLY`
  - `CREATE_NEW_DEV_AND_PROD`
  - `CREATE_NEW_DEV_STAGING_PROD`
  - `BLOCKED_NEED_OWNER_PERMISSION`
  - `BLOCKED_SECRETS_EXPOSED`

호환이 필요하면 `FIREBASE_DECISION_REPORT.md`는 같은 내용을 담은 별도 보고서 또는 `A_PROJECT_FIREBASE_REPORT.md`를 참조하는 짧은 문서로 생성한다.

## 7. 코딩 자료 생성 순서 초안

대표님 승인 전에는 1~3단계까지만 진행한다.

### 1단계: 학습/감사 자료

- `00_README_FIRST.md`
- `AGENTS.md`
- `PROJECT_RULES.md`
- `DB_SCHEMA.md`
- `STATUS_MODEL.md`
- `SECURITY_POLICY.md`
- `AUTO_MODE_POLICY.md`

### 2단계: A 프로젝트 분석 보고서 템플릿

- `A_PROJECT_FILE_INVENTORY.md`
- `A_PROJECT_ARCHITECTURE_MAP.md`
- `A_PROJECT_GAP_ANALYSIS.md`
- `A_PROJECT_RISK_REGISTER.md`
- `A_PROJECT_FIREBASE_REPORT.md`
- `INSTALLATION_STATUS_REPORT.md`
- `MIGRATION_OR_REBUILD_PLAN.md`

### 3단계: 승인 대기 자료

- `BLOCKERS.md`
- `NEXT_TASKS.md`
- `APPROVAL_QUEUE.md`
- `REPORT_TEMPLATES.md`
- `SAFE_MODES.md`

### 4단계: 승인 후 1차 생성 자료

아직 실행하지 않는다.

- Next.js 폴더 구조
- 관리자 기본 라우팅
- mock 데이터 구조
- UI shell
- 테스트 초안

## 8. 코딩 자료에 반드시 반영할 업무 범위

### 최고관리자

- 대시보드
- 입점사 관리
- 산후조리원 관리
- 객실/태블릿 관리
- 상품 승인
- 전체 주문/QR/결제/취소/환불/배송/매출/정산/입금 관리
- 알림톡 로그
- 외부 API 로그
- 보안 감사 로그
- 정책 설정
- 운영 체크리스트

### 기업 Admin

- 상품 등록
- 가격비교/AI분석 표시값
- 이미지/GIF 관리
- 옵션/재고 관리
- 외부 재고 코드 매핑
- 주문/배송/현장수령
- 취소/환불 요청
- 매출/입금
- 문의/알림/설정

### 산후조리원 Admin

- 가입/로그인
- 대시보드
- 객실 관리
- 태블릿 관리
- 현장수령 주문
- 객실별 QR 이력
- 조리원 주문 이력
- 설정

### 태블릿 폐쇄몰

- 태블릿 활성화
- 홈
- 상품 목록
- 상품 상세
- 가격비교 팝업
- 장바구니
- 수령방식 선택
- 구매하기 QR
- 조르기 QR
- QR 만료

### QR/비회원

- QR 랜딩
- 상품 요약
- 수령정보 입력
- 조르기 공유
- 결제자 정보
- mock 간편결제
- 결제 성공/실패
- 비회원 주문조회
- 주문 상세
- 환불 요청

## 9. 코딩 자료에 반드시 반영할 데이터 원장

- `products`
- `product_options`
- `inventory_movements`
- `carts`
- `cart_items`
- `qr_payment_sessions`
- `orders`
- `order_items`
- `payments`
- `delivery_events`
- `pickup_events`
- `settlements`
- `payouts`
- `notification_logs`
- `audit_logs`
- `system_status`
- `policies`

원칙:

- 주문 생성 시 상품/옵션/가격 snapshot 저장
- PG 승인 전 주문 확정 금지
- QR 2~3시간 만료
- QR 1회성 사용
- 결제 완료 후 QR 재사용 차단
- 동일 QR 동시 결제 방지
- 프론트 금액 신뢰 금지, 서버 재계산
- 정산은 `orders` 총액이 아니라 `order_items` 기준
- 권한/금액/상태 변경은 감사 로그 기록

## 10. 외부 연동 BLOCKERS

코드 생성 전 아래는 모두 차단 항목이다.

- PG 운영 MID/KEY
- 실결제
- 실환불
- 운영 부분취소
- 정산 지급
- 카카오 알림톡 템플릿 승인
- 배송조회 운영 API
- 외부 재고 운영 API
- Secret Key 변경
- 운영 DB 접근
- 운영 배포

Codex 허용 대체 작업:

- mock adapter
- interface 초안
- 테스트 시나리오
- 필요 문서/키/계약 목록
- 승인 체크리스트
- BLOCKERS 기록

## 11. 준비 완료 기준

코딩 자료 생성 준비가 완료되려면 아래가 충족되어야 한다.

- 최종 지시서 분석 완료
- 기존 DOCX 6개 분석 완료
- 문서 우선순위 확정
- 금지 영역 확정
- 최초 보고서 목록 확정
- Firebase 보고서 명칭 정리
- 원본 A 프로젝트 또는 최종 ZIP 문서팩 입력 대기

현재 상태:

- 문서 분석과 준비 문서 작성은 완료
- 실제 코딩 자료 생성은 원본 프로젝트 또는 최종 ZIP이 들어온 뒤 진행
- 앱 코딩은 아직 시작하지 않음

