# my-app 다음 작업

## 우선순위

1. `my-app` 트랙에서 수행할 세부 작업 범위를 확정한다.
2. 병렬 worktree 방식이라면 `my-app` 트랙이 담당할 파일 범위를 다른 트랙과 겹치지 않게 지정한다.
3. mock/test 베타 파일 생성이 필요한 경우 허용 수정 범위를 먼저 명시한다.
4. 검증이 필요한 단계에서는 별도 승인 또는 새 지시로 `npm run lint`, `npm run build` 허용 여부를 정한다.
5. 모든 작업 종료 후에만 커밋 후보 명령을 검토한다.

## 권장 트랙 분리

- `admin`: 최고관리자 화면
- `company`: 입점사 Admin 화면
- `nursery`: 산후조리원 Admin 화면
- `tablet-qr`: 태블릿 폐쇄몰, 고객 QR, 비회원 주문조회
- `firebase-contract`: Firebase 연결 전 설계 문서
- `qa`: QA, smoke checklist, merge plan
- `my-app`: 공통 통합 기준, 보고서, 최종 정리

## 다음 입력에 포함하면 좋은 정보

- 트랙명
- 허용 수정 범위
- 금지 수정 범위
- 1일차부터 5일차까지 작업 큐
- 보고서 위치
- 검증 실행 여부

## 추가 고도화 실행 큐

1. 빈 상태 UI 기준을 각 도메인별로 적용한다.
   - 상품 없음
   - 주문 없음
   - QR 세션 없음
   - 정산 내역 없음
   - 검색 결과 없음

2. 오류 상태 UI 기준을 각 도메인별로 적용한다.
   - mock 데이터 조회 실패
   - QR 만료
   - 결제 mock 실패
   - 주문번호/휴대폰 불일치
   - 권한 부족 mock

3. 위험 상태 배지 기준을 통일한다.
   - `blocked`
   - `expired`
   - `needs_review`
   - `payment_failed`
   - `settlement_hold`
   - `inventory_low`

4. 필터/검색/정렬 UI를 화면별로 보강한다.
   - 관리자: 기간, 상태, 입점사, 조리원, 결제 상태
   - 기업: 승인 상태, 재고 상태, 배송 상태
   - 조리원: 객실, 태블릿, 현장수령 상태
   - 고객/태블릿: 카테고리, 가격대, 수령방식, 재고 상태

5. 상세 페이지 mock을 우선 추가한다.
   - 상품 상세
   - 주문 상세
   - QR 세션 상세
   - 입점사 상세
   - 조리원/객실/태블릿 상세

6. 모바일/태블릿 반응형 기준을 보강한다.
   - 태블릿 상품 목록은 2~3열 카드 중심
   - 모바일 QR 결제 화면은 단일 컬럼 중심
   - 관리자 표는 모바일에서 카드형 요약으로 전환

7. mock 데이터를 확장한다.
   - 정상 상태뿐 아니라 실패, 만료, 승인대기, 반려, 품절, 재고부족 상태 포함
   - 가격 비교 표시용 정상가/폐쇄몰가/할인율 조합 확대
   - QR 세션 만료/사용완료/취소 케이스 확대

## my-app 트랙 권장 역할

- 공통 문서와 통합 큐 관리
- 병렬 트랙 merge 전후의 충돌 체크리스트 관리
- 실제 구현은 각 기능 트랙에서 수행
- 기능 트랙 결과가 모인 뒤 최종 보고서 통합

## 다음 추가 고도화 후보

1. `/mock-ui` preview를 실제 각 도메인 화면에 연결할지 검토한다.
2. `components/ui/StatePanel.tsx`를 기존 `EmptyState.tsx` 대체 후보로 통합할지 검토한다.
3. `RiskStatusBadge`와 기존 `StatusBadge`의 역할을 분리한다.
   - `StatusBadge`: 도메인 상태
   - `RiskStatusBadge`: 위험/운영 차단/연동 대기 상태
4. `MockMallProductCard`를 태블릿 상품 카드의 차세대 버전으로 이식한다.
5. `MockQrSessionCard`를 `/tablet/qr`, `/q/[code]` 흐름의 요약 카드로 이식한다.
6. `MockOrderTimeline`을 비회원 주문 상세 화면에 이식한다.
7. mock 데이터가 실제 `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts`와 겹치는지 정리한다.
8. 금지 지시가 해제되면 `npm run lint`, `npm run build`를 실행해 새 파일 타입 검증을 수행한다.

## 검증 재개 시 우선 확인 라우트

- `/mock-ui`
- `/mock-ui/detail`
- `/tablet/products`
- `/tablet/cart`
- `/tablet/qr`
- `/q/SANHO701`
- `/orders/guest/A5-20260519-001`
## 추가 이식 후보

1. `MockCheckoutSummary`를 `/q/[code]/checkout`에 이식한다.
2. `MockMobileActionBar`를 `/tablet/cart`, `/tablet/qr`, `/q/[code]/checkout`의 주요 CTA 영역에 이식한다.
3. `MockGuestOrderLookup`을 `/orders/guest`에 이식한다.
4. `MockOrderTimeline`을 `/orders/guest/[orderNo]`에 이식한다.
5. 고객-facing 라우트에서 공통 메시지를 통일한다.
   - `Mock only`
   - `No live PG call`
   - `No Firebase connection`
   - `No customer login required`
6. 실제 화면 이식 전 기존 파일의 한글 인코딩 상태를 확인한다.
7. 검증 금지 지시가 해제되면 `/mock-ui/checkout`을 smoke 확인 목록에 추가한다.
## 다음 검증 재개 조건

1. 사용자가 `npm run lint` 실행을 다시 허용한다.
2. 사용자가 `npm run build` 실행을 다시 허용한다.
3. preview route smoke 확인이 허용되면 `/mock-ui`, `/mock-ui/detail`, `/mock-ui/checkout` 순서로 확인한다.
4. 검증 실패가 있으면 실제 Firebase 연결 없이 새 mock UI 파일 범위에서만 수정한다.
## operations board 이식 후보

1. `MockMetricGrid`를 관리자 dashboard KPI preview에 이식한다.
2. `MockApprovalQueue`를 상품 승인, 환불 검토, Storage 승인 대기 화면에 이식한다.
3. `MockIntegrationGateList`를 Firebase/PG/Storage/배송조회 blocker 안내 화면에 이식한다.
4. `MockRouteSmokeMatrix`를 QA checklist 문서 또는 QA 화면에 이식한다.
5. 검증 허용 시 `/mock-ui/operations`를 smoke 확인 목록에 추가한다.
## QA preview 이식 후보

1. `/mock-ui/qa`를 다음 출근일 수동 점검 보조 화면으로 확인한다.
2. `MockMergePlanBoard`의 merge order를 실제 worktree 결과에 맞게 업데이트한다.
3. `MockManualChecklist`의 명령은 사람이 직접 터미널에서 실행한다.
4. `MockReleaseReadiness`는 운영 전환 gate 문서와 비교해 갱신한다.
5. lint/build 허용 후 새 preview 라우트 전체를 검증한다.
## storefront preview 이식 후보

1. `/mock-ui/storefront`를 기준으로 `/tablet/products` 상단 배너를 개선한다.
2. `MockStoreHero`를 태블릿 홈 또는 상품 목록의 session banner 후보로 검토한다.
3. `MockCategoryRail`을 상품 카테고리 탐색 UI 후보로 검토한다.
4. `MockStoreBenefitStrip`을 배송/현장수령/가격비교 안내 영역으로 검토한다.
5. `MockPriceLayerPanel`을 실제 AI가 아닌 가격 비교 안내 layer로 유지한다.
## session lifecycle 이식 후보

1. `MockSessionLifecycleBoard`를 `/tablet/qr` 또는 `/q/[code]`의 내부 QA preview로 활용한다.
2. `MockDeviceContextPanel`을 조리원/태블릿 관리 화면의 source tracking UI 후보로 검토한다.
3. `MockPayerHandoffCard`를 구매 QR/조르기 QR 분기 안내 카드로 이식한다.
4. 실제 서버 로직 전환 시 QR 생성/만료/사용완료 차단은 Cloud Functions 계획과 대조한다.
5. 검증 허용 시 `/mock-ui/session`을 smoke 확인 목록에 추가한다.
## analytics preview 이식 후보

1. `MockAnalyticsTiles`를 관리자/기업 dashboard KPI 후보로 검토한다.
2. `MockRiskDistribution`을 운영 위험 상태 요약 영역으로 검토한다.
3. `MockSettlementPreview`는 정산 지급 기능이 아니라 preview-only table로만 유지한다.
4. 실제 정산/환불/입금 처리는 PG 및 회계 정책 승인 전까지 계속 차단한다.
5. 검증 허용 시 `/mock-ui/analytics`를 smoke 확인 목록에 추가한다.
## preview route index 확인 후보

1. 검증 허용 시 `/mock-ui`에서 route card들이 렌더링되는지 확인한다.
2. 각 route card가 `/mock-ui/storefront`, `/mock-ui/detail`, `/mock-ui/checkout`, `/mock-ui/session`, `/mock-ui/operations`, `/mock-ui/qa`, `/mock-ui/analytics`로 연결되는지 수동 확인한다.
3. 실제 고객/관리자 화면으로 이식하기 전 preview route별 우선순위를 정한다.
## journey preview 이식 후보

1. `/mock-ui/journey`를 기준으로 tablet/QR/customer guest route 간 흐름을 점검한다.
2. `MockJourneyMap`의 route candidate를 실제 화면 smoke checklist와 연결한다.
3. `MockDecisionLedger`를 Firebase/PG 전환 전 위험 의사결정 문서와 대조한다.
4. 금액 재계산, 재고 차감, QR 만료는 실제 연결 전 Cloud Functions 계획과 반드시 맞춘다.
5. 검증 허용 시 `/mock-ui/journey`를 smoke 확인 목록에 추가한다.
## route index 문서 활용

1. 다음 출근일 `reports/my-app/MOCK_UI_ROUTE_INDEX.md`의 route 목록을 기준으로 smoke 확인한다.
2. 검증 전에는 여전히 `npm run lint`, `npm run build`가 무인 모드에서 금지였음을 확인한다.
3. preview route 중 실제 화면에 이식할 우선순위를 정한다.
4. route별 live integration status를 확인하고 운영 연동 항목은 계속 BLOCKERS로 유지한다.
## next working day handoff

1. `reports/my-app/NEXT_WORKDAY_HANDOFF.md`를 먼저 확인한다.
2. 수동으로 workspace 상태와 최신 main 반영 여부를 확인한다.
3. lint/build를 수동 실행하기 전 금지 파일 생성 여부를 먼저 확인한다.
4. mock preview routes를 smoke 확인한 뒤 실제 tablet/customer/admin 화면 이식 범위를 결정한다.
