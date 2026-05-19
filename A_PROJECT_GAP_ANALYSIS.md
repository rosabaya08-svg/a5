# A Project Gap Analysis

작성일: 2026-05-19

## 1. 기준 문서

이번 gap 분석은 `a5-learning` 폴더의 문서와 현재 프로젝트 파일 스캔 결과를 기준으로 작성했다.

주요 기준:

- `codex_final_master_learning_directive_v1.docx`
- `A_PROJECT_WORK_ANALYSIS.md`
- `CODING_MATERIALS_GENERATION_PREP.md`
- `sanho_closed_mall_uiux_master_v1.docx`
- `fast25_ai_automation_shoppingmall_plan_v1.docx`
- `codex_nextjs_harness_project_documentation_v2.docx`
- `codex_nextjs_error_review_guardrails_v3.docx`
- `codex_nextjs_coding_documentation_v1-1.docx`

## 2. 프로젝트 요구사항 요약

문서 기준 프로젝트는 산후조리원 객실 태블릿에서만 상품을 탐색하고 장바구니를 구성한 뒤, 고객 또는 보호자가 QR/조르기 링크를 통해 비회원 간편결제를 수행하는 폐쇄몰형 기업 입점 커머스다.

핵심 요구사항:

- 태블릿 전용 폐쇄몰 상품 탐색
- 일반 브라우저 직접 접속 제한 또는 안내 처리
- QR/조르기 링크 기반 비회원 결제 흐름
- QR 세션 2~3시간 만료, 1회성 사용, 재사용 차단
- 비회원 주문조회
- 입점 기업 Admin: 상품, 옵션, 재고, 주문, 배송, 매출, 입금 현황 관리
- 산후조리원 Admin: 객실, 태블릿, 현장수령, QR 이력 관리
- 최고관리자: 입점사, 조리원, 상품 승인, 주문, 결제, 취소/환불, 정산, 알림, 외부 API, 보안 로그 통제
- 상품/주문/결제/정산 원장 구조와 audit log 보존
- 결제 금액은 프론트 값을 신뢰하지 않고 서버에서 재계산
- 정산은 `orders` 총액이 아니라 `order_items` 기준
- PG, 알림톡, 배송조회, 외부 재고 API는 공식 문서/계약/키 확보 전까지 mock/test adapter만 허용
- 실결제, 운영 환불, 운영 부분취소, 정산 지급, 운영 배포, Secret 생성/노출 금지

## 3. 현재 구현 상태 요약

현재 프로젝트는 Next.js App Router 기본 구조에 가까우며, 실제 도메인 기능 구현은 확인되지 않았다.

확인된 구현:

- Next.js 16.2.6 프로젝트 구조
- 기본 `app/layout.tsx`
- 단순 설치 성공 화면 `app/page.tsx`
- 기본 public SVG 자산
- `a5-learning` 문서팩
- Git 저장소와 origin remote

확인되지 않은 구현:

- 관리자/기업/조리원/태블릿/QR 라우트
- Firebase 설정/권한/rules
- 인증/권한 모델
- 상품/장바구니/QR/주문/결제/정산 데이터 모델
- mock adapter
- 테스트/QA 구조
- 운영 연동 구성

## 4. 요구사항 대비 Gap

| 영역 | 문서상 요구 | 현재 상태 | Gap |
| --- | --- | --- | --- |
| 프로젝트 규칙 | 최종 문서팩 기반 `AGENTS.md`, 정책 문서 우선 | 최소 Next.js AGENTS만 존재 | 업무/보안/자동화 정책 문서 미구성 |
| App Router 구조 | `/admin`, `/company`, `/nursery`, `/tablet`, `/qr` 영역 분리 | 기본 `app/page.tsx`만 존재 | 라우트/모듈 구조 미구현 |
| 최고관리자 | 입점사, 조리원, 상품 승인, 주문/결제/정산/로그 통제 | 없음 | 전체 관리자 UI/데이터 구조 부재 |
| 기업 Admin | 상품/재고/주문/배송/매출/입금 관리 | 없음 | 기업 Admin 기능 부재 |
| 산후조리원 Admin | 객실/태블릿/현장수령/QR 이력 관리 | 없음 | 조리원 Admin 기능 부재 |
| 태블릿 폐쇄몰 | 인증된 태블릿에서만 상품 탐색 | 없음 | 태블릿 인증/상품/장바구니 부재 |
| QR/조르기 | 2~3시간 만료, 1회성, 출처 저장 | 없음 | QR 세션 모델/화면/검증 부재 |
| 비회원 주문조회 | 주문번호/휴대폰 등 최소 인증 | 없음 | 주문조회 정책 및 화면 부재 |
| Firebase | 환경 분리, Auth, Firestore, Rules, Storage 검토 | 관련 파일 없음 | Firebase 사용 여부 판단 필요 |
| 외부 API | mock/test adapter 우선 | 없음 | mock adapter 구조 부재 |
| 결제/정산 | 운영 실행 금지, mock/검산표 우선 | 없음 | 아직 구현 전이라 안전하지만 구조 부재 |
| 테스트 | lint/build/test/browser smoke | 이번 점검에서 미실행 | 검증 루프 미구성 |

## 5. 우선 해소해야 할 문서 Gap

`a5-learning` 문서 기준으로 구현 전 먼저 준비할 문서가 부족하다.

- `PROJECT_RULES.md`
- `DB_SCHEMA.md`
- `STATUS_MODEL.md`
- `SECURITY_POLICY.md`
- `AUTO_MODE_POLICY.md`
- `A_PROJECT_ARCHITECTURE_MAP.md`
- `A_PROJECT_FIREBASE_REPORT.md` 또는 `FIREBASE_DECISION_REPORT.md`
- `MIGRATION_OR_REBUILD_PLAN.md`
- `NEXT_TASKS.md`
- `AUTO_REPORT.md`

## 6. 현재 단계 결론

현재 프로젝트는 설치 확인용 Next.js 골격이며, `a5-learning` 요구사항을 실제 앱 구조로 옮기기 전의 감사 단계에 있다. 다음 단계는 구현이 아니라 Firebase 결정, 도메인 문서 확정, 라우트/데이터/권한 설계 승인이다.
