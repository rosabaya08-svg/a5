# my-app BLOCKERS

## 현재 보류 항목

1. 세부 트랙명이 명시되지 않아 현재 폴더명을 기준으로 `my-app` 트랙으로 해석함.
2. 구체적인 생성 대상 파일, 허용 수정 범위, 작업 큐가 제공되지 않아 앱 코드 생성은 진행하지 않음.
3. 사용자 지시에 따라 `npm run lint`, `npm run build`, git 명령은 실행하지 않음.
4. 실제 Firebase 연결, Firestore/Auth 연결, PG/환불/정산/알림톡/배송조회/외부 재고 API 연결은 금지 상태를 유지함.

## 다음 진행 전 필요한 결정

- `my-app` 트랙을 공통 통합/문서 트랙으로 사용할지, 특정 기능 트랙으로 사용할지 결정 필요
- 병렬 worktree와 병합할 경우 `my-app`에서 수정해도 되는 파일 범위 결정 필요
- 검증 명령을 끝까지 금지할지, 최종 단계에서만 허용할지 결정 필요

## 추가 진행 중 유지된 차단 사항

1. `DAY 1~DAY 5`의 세부 작업 큐가 현재 `my-app` 트랙에 직접 제공되지 않음.
2. 공용 보고서 수정 금지 지시가 있어 루트의 `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md`는 갱신하지 않음.
3. `npm run lint`, `npm run build`가 금지되어 실제 빌드 검증은 수행하지 않음.
4. git 명령 전체가 금지되어 변경 상태 확인, 스테이징, 커밋은 수행하지 않음.
5. Firebase 연결 및 설정 파일 생성이 금지되어 실제 Firebase 전환 작업은 수행하지 않음.
6. 실제 PG, 환불, 정산, 알림톡, 배송조회, 외부 재고 API 연결은 계속 차단 상태임.

## 안전하게 다음으로 넘긴 항목

- 앱 코드 직접 수정은 세부 트랙과 허용 수정 범위가 명확해질 때까지 보류
- 검증 명령은 금지 지시가 해제되거나 최종 단계 허용 지시가 있을 때까지 보류
- 운영 연동 후보는 모두 문서/계약/stub 단계로만 유지

## 추가 생성 후 남은 차단 사항

1. `npm run lint`와 `npm run build`가 명시적으로 금지되어 새 TypeScript/TSX 파일의 자동 검증은 수행하지 못함.
2. `/mock-ui`, `/mock-ui/detail`은 preview 라우트이며 실제 고객/관리자 화면에 아직 연결하지 않음.
3. 기존 일부 파일의 한글 출력이 터미널에서 깨져 보여 직접 수정 시 위험이 있어, 이번 배치에서는 기존 페이지 파일 수정 대신 새 파일 추가만 수행함.
4. 실제 Firebase/PG/알림톡/배송조회/외부 재고 API 연결은 계속 금지 상태임.
5. 향후 실제 화면 이식 전에는 기존 `components/pages/*` 파일의 인코딩과 빌드 상태 확인이 필요함.
## QR checkout / guest lookup 추가 후 차단 사항

1. 새 `/mock-ui/checkout` preview 라우트는 아직 실제 `/q/[code]/checkout`, `/orders/guest` 화면에 연결하지 않음.
2. 결제 CTA는 버튼 mock이며 실제 PG 요청, 주문 생성, 환불, 정산 처리는 수행하지 않음.
3. 비회원 주문조회 form은 정적 mock UI이며 실제 고객 개인정보 검증 또는 저장을 수행하지 않음.
4. `npm run lint`, `npm run build`가 금지되어 새 컴포넌트 자동 검증은 수행하지 않음.
## 금지 패턴 검색 후 메모

1. 금지된 Firebase SDK import는 새 mock UI 범위에서 발견되지 않음.
2. `.env` 또는 Secret Key 생성은 수행하지 않음.
3. `PG` 문자열은 실제 연동이 아니라 차단/미연동 안내 문구로만 사용됨.
4. lint/build가 금지되어 타입 안정성은 다음 검증 허용 시 확인 필요.
## operations board 추가 후 차단 사항

1. `/mock-ui/operations`는 preview 전용이며 실제 관리자 승인/반려/정산/환불 액션을 수행하지 않음.
2. `MockIntegrationGateList`는 연결 차단 안내만 제공하며 Firebase, PG, Storage, 배송조회 API를 호출하지 않음.
3. `MockRouteSmokeMatrix`는 수동 확인 후보 목록이며 실제 smoke test 실행은 수행하지 않음.
4. lint/build 금지 때문에 새 operations 파일의 타입 검증은 다음 수동 단계로 보류함.
## QA preview 추가 후 차단 사항

1. `/mock-ui/qa`는 수동 절차 안내 화면이며 실제 git/npm 명령을 실행하지 않음.
2. worktree merge 충돌 여부는 실제 각 worktree 상태를 읽지 않았으므로 다음 출근일 사람이 확인해야 함.
3. release readiness 항목은 mock/static 기준이며 운영 승인으로 해석하면 안 됨.
4. lint/build 금지 때문에 새 QA 파일의 타입 검증은 다음 수동 단계로 보류함.
## storefront preview 추가 후 차단 사항

1. `/mock-ui/storefront`는 정적 preview이며 실제 장바구니 변경이나 QR 생성 액션을 수행하지 않음.
2. 가격 비교 layer는 실제 AI/외부 가격 API가 아니라 mock 안내 문구로만 구성됨.
3. 상품 이미지/미디어는 Firebase Storage가 금지되어 placeholder-style UI만 사용함.
4. lint/build 금지 때문에 새 storefront 파일의 타입 검증은 다음 수동 단계로 보류함.
## session lifecycle preview 추가 후 차단 사항

1. `/mock-ui/session`은 정적 preview이며 실제 QR session document를 생성하지 않음.
2. 결제 성공/실패/만료 상태는 UI 상태만 표시하며 PG 또는 서버 검증을 수행하지 않음.
3. 태블릿 출처 추적은 mock 데이터이며 실제 기기 인증 또는 App Check를 수행하지 않음.
4. lint/build 금지 때문에 새 session 파일의 타입 검증은 다음 수동 단계로 보류함.
## analytics preview 추가 후 차단 사항

1. `/mock-ui/analytics`는 정적 preview이며 실제 매출, 정산, 환불, 입금 처리를 수행하지 않음.
2. 정산 금액은 mock visibility 데이터이며 회계/세무/입금 데이터로 사용하면 안 됨.
3. PG 실연동, 환불 정책, 정산 정책, 입금 계좌 검증이 승인되기 전까지 payout은 계속 차단 상태임.
4. lint/build 금지 때문에 새 analytics 파일의 타입 검증은 다음 수동 단계로 보류함.
## preview route index 추가 후 차단 사항

1. `/mock-ui` route index는 Next `Link`를 사용하지만 실제 smoke 확인은 수행하지 않음.
2. lint/build 금지 때문에 새 route index 파일의 타입 검증은 다음 수동 단계로 보류함.
3. preview route들은 실제 서비스 IA가 아니라 mock/test 검토 허브로만 사용해야 함.
## journey preview 추가 후 차단 사항

1. `/mock-ui/journey`는 흐름 설명용 preview이며 실제 주문, 결제, 환불, 정산을 생성하지 않음.
2. route candidate는 수동 smoke 후보이며 dev server 실행이나 브라우저 확인은 수행하지 않음.
3. 금액 재계산, 재고 차감, QR 만료 처리는 실제 Cloud Functions 구현 전까지 mock decision으로만 유지함.
4. lint/build 금지 때문에 새 journey 파일의 타입 검증은 다음 수동 단계로 보류함.
