export type StatusTone = "complete" | "progress" | "blocked" | "mock";

export type StatusMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
};

export type StatusListItem = {
  id: string;
  title: string;
  detail: string;
  tone: StatusTone;
};

export type SmokeRoute = {
  id: string;
  route: string;
  purpose: string;
  status: "manual_pending" | "preview_ready" | "blocked";
};

export type IntegrationStatus = {
  id: string;
  name: string;
  state: "connected_beta" | "deployed_mock" | "mock_only" | "blocker" | "held";
  summary: string;
  requiredBeforeLive: string;
  tone: StatusTone;
};

export type FileGroup = {
  id: string;
  label: string;
  path: string;
  count: number;
  purpose: string;
  tone: StatusTone;
};

export type WorktreePort = {
  id: string;
  track: string;
  port: number;
  folder: string;
  purpose: string;
};

export type WorktreeRouteStatus = {
  id: string;
  track: string;
  port: number;
  statusRoute: string;
  keyRoutes: string[];
  routeState: "ready_for_manual_smoke" | "not_started_locally" | "blocked";
  note: string;
};

export type Route404Status = {
  id: string;
  route: string;
  previousState: "unknown" | "was_404" | "not_checked";
  currentState: "expected_200" | "manual_pending" | "blocked";
  evidence: string;
};

export type StateCoverage = {
  id: string;
  label: string;
  covered: boolean;
  detail: string;
};

export type ProgressEvent = {
  id: string;
  label: string;
  detail: string;
  state: "completed" | "deferred" | "blocked";
};

export const statusDashboard = {
  track: "my-app",
  route: "/mock-ui/status",
  folder: "C:\\Users\\djfhl\\Desktop\\my-app",
  mode: "파이어베이스 베타 / PG 준비",
  liveWarning: "파이어스토어, 스토리지 베타 규칙, 시드 데이터, 결제 함수가 연결되어 있습니다. 실제 PG/정산/외부 API는 계속 차단되어 있습니다.",
  progressPercent: 99,
  generatedMajorFileCount: 166,
  generatedRouteCount: 94,
  generatedComponentCount: 52,
  generatedDataAndTypeCount: 23,
  reportCount: 17,
};

export const statusMetrics: StatusMetric[] = [
  {
    id: "metric-progress",
    label: "베타 구현 진행률",
    value: "99%",
    helper: "파이어스토어 커머스, CMS 시드, 스토리지 베타 규칙, 배포된 결제 함수가 연결되어 있습니다. PG사 키가 마지막 관문입니다.",
    tone: "progress",
  },
  {
    id: "metric-files",
    label: "주요 파일",
    value: "166",
    helper: "앱 경로, 파이어베이스 저장소 계층, 함수, 시드 스크립트, 보고서, 베타 CMS 연동 파일입니다.",
    tone: "complete",
  },
  {
    id: "metric-routes",
    label: "미리보기 경로",
    value: "94",
    helper: "마지막 빌드 점검에서 정적 내보내기 경로 94개가 생성되었습니다.",
    tone: "mock",
  },
  {
    id: "metric-blockers",
    label: "남은 차단 항목",
    value: "4",
    helper: "실제 PG사 키, 알림톡, 배송조회, 외부 재고 연동은 계속 차단되어 있습니다.",
    tone: "blocked",
  },
];

export const generatedFileGroups: FileGroup[] = [
  {
    id: "group-home",
    label: "홈 런처",
    path: "app/page.tsx",
    count: 1,
    purpose: "localhost:3000 첫 화면에서 생성 결과 카드로 이동합니다.",
    tone: "complete",
  },
  {
    id: "group-preview-routes",
    label: "미리보기 경로",
    path: "app/mock-ui/**",
    count: 12,
    purpose: "상태, 허브, 쇼핑몰, 상세, 결제, 세션, 고객 여정, 운영, 품질 점검, 분석 미리보기입니다.",
    tone: "complete",
  },
  {
    id: "group-storefront",
    label: "폐쇄몰 쇼핑 화면",
    path: "components/storefront/**",
    count: 2,
    purpose: "한산연 스타일 태블릿몰, 상품 상세, 장바구니, QR, 결제, 비회원 주문 경험입니다.",
    tone: "complete",
  },
  {
    id: "group-marketing-admin",
    label: "마케팅 관리자 화면",
    path: "components/marketing/**",
    count: 1,
    purpose: "관리자/기업 배너, 영상, 브랜드, 기획전, 상품 미리보기 운영 화면입니다.",
    tone: "complete",
  },
  {
    id: "group-track-components",
    label: "트랙 대시보드 컴포넌트",
    path: "components/my-app/**",
    count: 1,
    purpose: "브라우저 확인용 로컬 상태 대시보드 컴포넌트입니다.",
    tone: "complete",
  },
  {
    id: "group-shared-components",
    label: "미리보기 UI 컴포넌트",
    path: "components/ui/**",
    count: 33,
    purpose: "카드, 배지, 경로 지도, 결제, 생명주기, 분석, 준비도 미리보기 컴포넌트입니다.",
    tone: "complete",
  },
  {
    id: "group-track-data",
    label: "트랙 상태 데이터",
    path: "data/my-app/**",
    count: 1,
    purpose: "실시간 조회 없이 표시하는 정적 상태 대시보드 데이터입니다.",
    tone: "complete",
  },
  {
    id: "group-reports",
    label: "트랙별 보고서",
    path: "reports/my-app/**",
    count: 17,
    purpose: "경로 목록, 화면 점검 계획, 병합 인수인계, 차단 항목, 다음 작업, 커밋 후보입니다.",
    tone: "progress",
  },
];

export const worktreePorts: WorktreePort[] = [
  {
    id: "port-admin",
    track: "최고관리자",
    port: 3001,
    folder: "my-app-admin",
    purpose: "최고관리자 화면과 운영 검토입니다.",
  },
  {
    id: "port-company",
    track: "기업 관리자",
    port: 3002,
    folder: "my-app-company",
    purpose: "기업 상품, 재고, 주문, 입금 화면입니다.",
  },
  {
    id: "port-nursery",
    track: "조리원 관리자",
    port: 3003,
    folder: "my-app-nursery",
    purpose: "조리원 객실, 태블릿, 현장수령, QR 이력 화면입니다.",
  },
  {
    id: "port-tablet-qr",
    track: "태블릿/QR",
    port: 3004,
    folder: "my-app-tablet-qr",
    purpose: "태블릿 폐쇄몰, 고객 QR, 결제, 비회원 조회 화면입니다.",
  },
  {
    id: "port-firebase-contract",
    track: "파이어베이스 계약",
    port: 3005,
    folder: "my-app-firebase-contract",
    purpose: "파이어베이스 계약, 스키마, 규칙, 서버 로직 문서입니다.",
  },
  {
    id: "port-qa",
    track: "품질 점검",
    port: 3006,
    folder: "my-app-qa",
    purpose: "품질 점검 목록, 경로 점검 계획, 병합 계획, 출시 준비도입니다.",
  },
];

export const worktreeRouteStatuses: WorktreeRouteStatus[] = [
  {
    id: "wt-my-app",
    track: "my-app",
    port: 3000,
    statusRoute: "/mock-ui/status",
    keyRoutes: ["/", "/products", "/mock-ui/status", "/mock-ui/smoke", "/mock-ui/merge"],
    routeState: "ready_for_manual_smoke",
    note: "이 작업 폴더에서 메인 런처와 경로 목록을 확인할 수 있습니다.",
  },
  {
    id: "wt-admin",
    track: "admin",
    port: 3001,
    statusRoute: "/admin/status",
    keyRoutes: ["/admin/dashboard", "/admin/status", "/admin/companies", "/admin/orders"],
    routeState: "ready_for_manual_smoke",
    note: "최고관리자 기능 브랜치가 푸시되었습니다. 해당 작업 폴더를 따로 실행해 브라우저에서 확인합니다.",
  },
  {
    id: "wt-company",
    track: "company",
    port: 3002,
    statusRoute: "/company/status",
    keyRoutes: ["/company/dashboard", "/company/status", "/company/products", "/company/orders"],
    routeState: "ready_for_manual_smoke",
    note: "기업 관리자 기능 브랜치가 푸시되었습니다. 해당 작업 폴더를 따로 실행해 브라우저에서 확인합니다.",
  },
  {
    id: "wt-nursery",
    track: "nursery",
    port: 3003,
    statusRoute: "/nursery/status",
    keyRoutes: ["/nursery/dashboard", "/nursery/status", "/nursery/rooms", "/nursery/tablets"],
    routeState: "ready_for_manual_smoke",
    note: "조리원 관리자 기능 브랜치가 푸시되었습니다. 해당 작업 폴더를 따로 실행해 브라우저에서 확인합니다.",
  },
  {
    id: "wt-tablet-qr",
    track: "tablet-qr",
    port: 3004,
    statusRoute: "/tablet/status",
    keyRoutes: ["/tablet/products", "/tablet/cart", "/tablet/qr", "/q/SANHO701", "/orders/guest"],
    routeState: "ready_for_manual_smoke",
    note: "태블릿/QR 기능 브랜치가 푸시되었습니다. 해당 작업 폴더를 따로 실행해 브라우저에서 확인합니다.",
  },
  {
    id: "wt-firebase-contract",
    track: "firebase-contract",
    port: 3005,
    statusRoute: "/firebase-contract/status",
    keyRoutes: ["/firebase-contract", "/firebase-contract/status", "/firebase-contract/schema"],
    routeState: "ready_for_manual_smoke",
    note: "계약 브랜치는 문서/스텁 전용이며, 파이어베이스 SDK 연결은 기대하지 않습니다.",
  },
  {
    id: "wt-qa",
    track: "qa",
    port: 3006,
    statusRoute: "/qa/status",
    keyRoutes: ["/qa/status", "/qa/routes", "/qa/smoke", "/qa/handoff"],
    routeState: "ready_for_manual_smoke",
    note: "품질 점검 브랜치가 푸시되었습니다. 해당 작업 폴더를 따로 실행해 브라우저에서 확인합니다.",
  },
];

export const generatedScreens: StatusListItem[] = [
  {
    id: "screen-hub",
    title: "/mock-ui",
    detail: "공통 UI 상태와 경로 목록을 확인하는 미리보기 허브입니다.",
    tone: "complete",
  },
  {
    id: "screen-storefront",
    title: "/mock-ui/storefront",
    detail: "폐쇄몰 배너, 카테고리, 혜택, 상품 카드, 가격 비교 레이어입니다.",
    tone: "complete",
  },
  {
    id: "screen-detail",
    title: "/mock-ui/detail",
    detail: "상품, QR 세션, 주문 타임라인 상세 미리보기입니다.",
    tone: "complete",
  },
  {
    id: "screen-checkout",
    title: "/mock-ui/checkout",
    detail: "QR 결제 요약과 비회원 주문조회 미리보기입니다.",
    tone: "complete",
  },
  {
    id: "screen-session",
    title: "/mock-ui/session",
    detail: "QR 생명주기, 태블릿 출처, 결제자 전달 미리보기입니다.",
    tone: "complete",
  },
  {
    id: "screen-journey",
    title: "/mock-ui/journey",
    detail: "태블릿에서 QR 결제까지 전체 고객 흐름도입니다.",
    tone: "complete",
  },
  {
    id: "screen-operations",
    title: "/mock-ui/operations",
    detail: "승인 대기열, 연동 게이트, 경로 점검표입니다.",
    tone: "complete",
  },
  {
    id: "screen-qa",
    title: "/mock-ui/qa",
    detail: "수동 병합 계획, 다음 날 체크리스트, 출시 준비도입니다.",
    tone: "complete",
  },
  {
    id: "screen-analytics",
    title: "/mock-ui/analytics",
    detail: "매출, 위험 분포, 정산 가시성 미리보기입니다.",
    tone: "complete",
  },
  {
    id: "screen-status",
    title: "/mock-ui/status",
    detail: "브라우저 확인용 로컬 상태 대시보드입니다.",
    tone: "progress",
  },
  {
    id: "screen-smoke",
    title: "/mock-ui/smoke",
    detail: "수동 클릭 확인용 화면 점검 체크리스트입니다.",
    tone: "progress",
  },
  {
    id: "screen-merge",
    title: "/mock-ui/merge",
    detail: "병렬 작업 폴더 검토용 병합 인수인계 보드입니다.",
    tone: "progress",
  },
];

export const completedItems: StatusListItem[] = [
  {
    id: "done-ui-states",
    title: "빈 상태/로딩/오류/위험 UI 패턴",
    detail: "상태 패널, 위험 배지, 경로 카드, 체크리스트 카드, 차단 패널을 확인할 수 있습니다.",
    tone: "complete",
  },
  {
    id: "done-storefront",
    title: "폐쇄몰 쇼핑 화면 미리보기",
    detail: "실제 고객 경로를 건드리지 않고 태블릿/고객 쇼핑 구조를 확인합니다.",
    tone: "complete",
  },
  {
    id: "done-qr",
    title: "QR 및 비회원 결제 미리보기",
    detail: "결제 요약, 결제자 전달, QR 생명주기, 비회원 조회 화면을 확인합니다.",
    tone: "complete",
  },
  {
    id: "done-ops",
    title: "운영 및 품질 점검 미리보기",
    detail: "승인 대기열, 연동 게이트, 수동 체크리스트, 병합 계획, 출시 준비도를 화면에서 확인합니다.",
    tone: "complete",
  },
  {
    id: "done-reports",
    title: "트랙별 보고서",
    detail: "공용 보고서 충돌을 피하기 위해 reports/my-app 아래에 보고서를 유지합니다.",
    tone: "complete",
  },
];

export const blockedItems: StatusListItem[] = [
  {
    id: "block-firebase",
    title: "파이어베이스 운영 보강",
    detail: "파이어스토어, 스토리지 베타 규칙, 시드 데이터, 함수가 연결되어 있습니다. App Check 강제, Auth Claims, 운영 IAM 보강이 남아 있습니다.",
    tone: "progress",
  },
  {
    id: "block-pg",
    title: "PG 결제",
    detail: "실제 승인, 환불, 취소, 정산, 지급 코드는 아직 차단되어 있습니다.",
    tone: "blocked",
  },
  {
    id: "block-alimtalk",
    title: "알림톡",
    detail: "공식 템플릿, 발송 계정, 키 승인이 필요합니다.",
    tone: "blocked",
  },
  {
    id: "block-delivery",
    title: "배송조회",
    detail: "택배사 API 계정과 승인된 운영 키가 없습니다.",
    tone: "blocked",
  },
  {
    id: "block-inventory",
    title: "외부 재고 API",
    detail: "외부 재고 공급사 계약과 API 키가 아직 차단되어 있습니다.",
    tone: "blocked",
  },
  {
    id: "block-storage",
    title: "파이어베이스 스토리지 운영 정책",
    detail: "스토리지 버킷과 베타 CMS 업로드 규칙은 활성화되었습니다. 운영 검수, 파일 검토, 역할 기반 업로드 승인이 남아 있습니다.",
    tone: "progress",
  },
];

export const integrationStatuses: IntegrationStatus[] = [
  {
    id: "integration-firebase",
    name: "파이어베이스",
    state: "connected_beta",
    summary: "상품, QR, 주문, 주문상품, CMS 시드, 스토리지 베타 규칙, 결제 함수가 연결되어 있습니다.",
    requiredBeforeLive: "App Check 강제, Auth Claims, 운영 IAM 검토, 개발/운영 분리가 필요합니다.",
    tone: "complete",
  },
  {
    id: "integration-pg",
    name: "PG",
    state: "deployed_mock",
    summary: "파이어베이스 함수의 결제 준비/승인/웹훅/취소 엔드포인트가 배포되어 베타 문서를 기록합니다.",
    requiredBeforeLive: "공식 PG 문서, 키, PG사 어댑터, 웹훅 서명 검증, 환불 정책, 정산 보류 규칙이 필요합니다.",
    tone: "progress",
  },
  {
    id: "integration-alimtalk",
    name: "알림톡",
    state: "blocker",
    summary: "발송 계정, 템플릿 승인, 발신 프로필, 키가 없습니다.",
    requiredBeforeLive: "승인된 메시지 템플릿, 제공사 계약, 비밀값 관리 계획이 필요합니다.",
    tone: "blocked",
  },
  {
    id: "integration-delivery",
    name: "배송조회",
    state: "blocker",
    summary: "배송 상태 라벨은 현재 정적 표시 데이터입니다.",
    requiredBeforeLive: "택배사 API 계정, 공식 문서, 운영 키, 재시도/실패 정책이 필요합니다.",
    tone: "blocked",
  },
  {
    id: "integration-inventory",
    name: "외부 재고 API",
    state: "blocker",
    summary: "외부 재고 동기화는 호출하지 않습니다. 재고 부족은 화면 표시 상태입니다.",
    requiredBeforeLive: "제휴 계약, 공식 API 문서, 키, 호출 제한, 대사 정책이 필요합니다.",
    tone: "blocked",
  },
  {
    id: "integration-storage",
    name: "파이어베이스 스토리지",
    state: "connected_beta",
    summary: "스토리지 버킷이 초기화되었고 이미지/영상/GIF 경로의 베타 CMS 업로드 규칙이 배포되었습니다.",
    requiredBeforeLive: "운영자 미디어 검수, 바이러스/유해 콘텐츠 검사, 역할 기반 업로드, 최종 운영 정책이 필요합니다.",
    tone: "complete",
  },
];

export const nextTasks: StatusListItem[] = [
  {
    id: "next-1",
    title: "수동 git 상태 확인",
    detail: "다음 근무일에 스테이징 전에 작업 폴더 상태를 확인합니다.",
    tone: "progress",
  },
  {
    id: "next-2",
    title: "origin/main 수동 동기화",
    detail: "작업 폴더 병합 결과를 검토하기 전에 기준 브랜치를 갱신합니다.",
    tone: "progress",
  },
  {
    id: "next-3",
    title: "수동 lint",
    detail: "무인 작업 제한이 해제된 뒤 실행합니다.",
    tone: "progress",
  },
  {
    id: "next-4",
    title: "수동 build",
    detail: "lint와 파일 검토 후 실행합니다.",
    tone: "progress",
  },
  {
    id: "next-5",
    title: "/mock-ui 경로 화면 확인",
    detail: "생성된 미리보기 경로를 브라우저에서 육안 확인합니다.",
    tone: "progress",
  },
  {
    id: "next-6",
    title: "생성 컴포넌트 적용 범위 검토",
    detail: "어떤 미리보기 컴포넌트를 실제 태블릿/고객/관리자 경로로 옮길지 결정합니다.",
    tone: "progress",
  },
  {
    id: "next-7",
    title: "금지 파일 없음 확인",
    detail: ".env, 서비스 계정, private key, secret 파일이 Git에 포함되지 않았는지 확인합니다.",
    tone: "progress",
  },
  {
    id: "next-8",
    title: "남은 실연동 차단 항목 검토",
    detail: "파이어베이스 베타는 연결되었습니다. 공식 키/문서 입력 전까지 실제 PG 승인, 환불, 정산, 알림톡, 배송, 외부 재고는 차단합니다.",
    tone: "progress",
  },
  {
    id: "next-9",
    title: "병합 계획",
    detail: "작업 폴더 결과를 비교하고 경로/빌드 검토 후 병합합니다.",
    tone: "progress",
  },
  {
    id: "next-10",
    title: "커밋 후보 확정",
    detail: "수동 점검 후 reports/my-app/COMMIT_CANDIDATE.md를 기준으로 확정합니다.",
    tone: "progress",
  },
];

export const humanChecks: StatusListItem[] = [
  {
    id: "human-folder",
    title: "폴더 매핑 예외",
    detail: "현재 폴더는 my-app입니다. 상태 경로는 안전하게 /mock-ui/status로 설정했습니다.",
    tone: "progress",
  },
  {
    id: "human-encoding",
    title: "기존 한글 인코딩",
    detail: "일부 기존 파일은 터미널 출력에서 한글이 깨져 보일 수 있습니다. 직접 수정 파일은 수동 검토가 필요합니다.",
    tone: "progress",
  },
  {
    id: "human-validation",
    title: "이번 배치 검증 완료",
    detail: "빌드와 lint가 통과했습니다. 이미지 관련 경고는 차단 항목이 아닙니다.",
    tone: "complete",
  },
  {
    id: "human-live",
    title: "실연동 승인",
    detail: "파이어베이스/PG/스토리지/API 운영 전환은 별도 승인과 공식 키/문서가 필요합니다.",
    tone: "blocked",
  },
];

export const smokeRoutes: SmokeRoute[] = [
  { id: "route-status", route: "/mock-ui/status", purpose: "로컬 상태 대시보드", status: "preview_ready" },
  { id: "route-products", route: "/products", purpose: "고객 상품 목록 별칭 경로", status: "preview_ready" },
  { id: "route-hub", route: "/mock-ui", purpose: "미리보기 허브", status: "preview_ready" },
  { id: "route-smoke", route: "/mock-ui/smoke", purpose: "화면 점검 체크리스트", status: "preview_ready" },
  { id: "route-merge", route: "/mock-ui/merge", purpose: "병합 인수인계 보드", status: "preview_ready" },
  { id: "route-storefront", route: "/mock-ui/storefront", purpose: "폐쇄몰 쇼핑 화면", status: "preview_ready" },
  { id: "route-detail", route: "/mock-ui/detail", purpose: "상품/QR/주문 상세", status: "preview_ready" },
  { id: "route-checkout", route: "/mock-ui/checkout", purpose: "결제와 비회원 조회", status: "preview_ready" },
  { id: "route-session", route: "/mock-ui/session", purpose: "QR 생명주기와 기기 출처", status: "preview_ready" },
  { id: "route-journey", route: "/mock-ui/journey", purpose: "고객 전체 여정", status: "preview_ready" },
  { id: "route-operations", route: "/mock-ui/operations", purpose: "운영 보드", status: "preview_ready" },
  { id: "route-qa", route: "/mock-ui/qa", purpose: "품질 점검과 병합 준비", status: "preview_ready" },
  { id: "route-analytics", route: "/mock-ui/analytics", purpose: "분석과 정산 가시성", status: "preview_ready" },
  { id: "route-admin-banners", route: "/admin/marketing/banners", purpose: "관리자 배너 관리", status: "preview_ready" },
  { id: "route-admin-videos", route: "/admin/marketing/videos", purpose: "관리자 영상 관리", status: "preview_ready" },
  { id: "route-admin-brands", route: "/admin/brands", purpose: "관리자 브랜드 로고 관리", status: "preview_ready" },
  { id: "route-admin-home-editor", route: "/admin/home-editor", purpose: "관리자 쇼핑 홈 편집", status: "preview_ready" },
  { id: "route-admin-exhibitions", route: "/admin/exhibitions", purpose: "관리자 기획전 관리", status: "preview_ready" },
  { id: "route-company-preview", route: "/company/products/preview", purpose: "기업 상품 상세 미리보기", status: "preview_ready" },
  { id: "route-company-banner-ads", route: "/company/ads/banners", purpose: "기업 배너 광고 제출", status: "preview_ready" },
  { id: "route-company-video-ads", route: "/company/ads/videos", purpose: "기업 영상 광고 제출", status: "preview_ready" },
  { id: "route-company-brand", route: "/company/brand", purpose: "기업 브랜드관", status: "preview_ready" },
  { id: "route-company-exhibitions", route: "/company/exhibitions", purpose: "기업 기획전 참여 신청", status: "preview_ready" },
  { id: "route-admin-dashboard", route: "/admin/dashboard", purpose: "관리자 대시보드", status: "manual_pending" },
  { id: "route-company-dashboard", route: "/company/dashboard", purpose: "기업 대시보드", status: "manual_pending" },
  { id: "route-company-products", route: "/company/products", purpose: "기업 상품 관리", status: "manual_pending" },
  { id: "route-nursery-dashboard", route: "/nursery/dashboard", purpose: "조리원 대시보드", status: "manual_pending" },
  { id: "route-nursery-rooms", route: "/nursery/rooms", purpose: "조리원 객실 관리", status: "manual_pending" },
  { id: "route-tablet-products", route: "/tablet/products", purpose: "쇼핑몰형 태블릿 상품 목록", status: "preview_ready" },
  { id: "route-tablet-product-detail", route: "/tablet/products/product-care-kit", purpose: "쇼핑몰형 상품 상세", status: "preview_ready" },
  { id: "route-tablet-home", route: "/tablet", purpose: "태블릿 홈", status: "manual_pending" },
  { id: "route-tablet-cart", route: "/tablet/cart", purpose: "장바구니와 QR 생성", status: "preview_ready" },
  { id: "route-tablet-qr", route: "/tablet/qr", purpose: "태블릿 QR", status: "manual_pending" },
  { id: "route-customer-qr", route: "/q/SANHO701", purpose: "모바일 고객 QR 랜딩", status: "preview_ready" },
  { id: "route-customer-status", route: "/q/SANHO701/status", purpose: "QR 상태 확인", status: "preview_ready" },
  { id: "route-guest-lookup", route: "/orders/guest", purpose: "비회원 조회 입력", status: "manual_pending" },
  { id: "route-customer-checkout", route: "/q/SANHO701/checkout", purpose: "고객 결제 화면", status: "manual_pending" },
  { id: "route-guest-order", route: "/orders/guest/A5-20260519-001", purpose: "비회원 주문 상세", status: "manual_pending" },
  { id: "route-guest-refund", route: "/orders/guest/A5-20260519-001/refund", purpose: "비회원 환불 요청", status: "preview_ready" },
];

export const route404Statuses: Route404Status[] = [
  {
    id: "404-products",
    route: "/products",
    previousState: "was_404",
    currentState: "expected_200",
    evidence: "app/products/page.tsx를 생성하고 /tablet/products의 상품 목록 화면을 재사용했습니다.",
  },
  {
    id: "404-tablet-products",
    route: "/tablet/products",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "브라우저 화면 점검에서 폐쇄몰 상품 홈이 정상 로드되었습니다.",
  },
  {
    id: "404-tablet-cart",
    route: "/tablet/cart",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "브라우저 화면 점검에서 장바구니 모의 화면이 404 없이 로드되었습니다.",
  },
  {
    id: "404-tablet-qr",
    route: "/tablet/qr",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "기존 경로이며 브라우저 화면 점검은 아직 대기 중입니다.",
  },
  {
    id: "404-q-landing",
    route: "/q/SANHO701",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "브라우저 화면 점검에서 모바일 QR 랜딩 화면이 404 없이 로드되었습니다.",
  },
  {
    id: "404-q-checkout",
    route: "/q/SANHO701/checkout",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "기존 동적 결제 경로이며 브라우저 화면 점검은 아직 대기 중입니다.",
  },
  {
    id: "404-orders-guest",
    route: "/orders/guest",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "기존 비회원 조회 경로이며 브라우저 화면 점검은 아직 대기 중입니다.",
  },
  {
    id: "404-orders-detail",
    route: "/orders/guest/A5-20260519-001",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "기존 비회원 주문 상세 경로이며 브라우저 화면 점검은 아직 대기 중입니다.",
  },
  {
    id: "404-q-status",
    route: "/q/SANHO701/status",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "브라우저 화면 점검에서 QR 상태 모의 화면이 404 없이 로드되었습니다.",
  },
  {
    id: "404-guest-refund",
    route: "/orders/guest/A5-20260519-001/refund",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "브라우저 화면 점검에서 비회원 환불 요청 모의 화면이 404 없이 로드되었습니다.",
  },
  {
    id: "404-admin-banners",
    route: "/admin/marketing/banners",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "브라우저 화면 점검에서 관리자 배너 관리 경로가 404 없이 로드되었습니다.",
  },
  {
    id: "404-company-preview",
    route: "/company/products/preview",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "브라우저 화면 점검에서 기업 상품 미리보기 경로가 404 없이 로드되었습니다.",
  },
  {
    id: "404-company-dashboard",
    route: "/company/dashboard",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "기존 기업 경로이며 브라우저 화면 점검은 아직 대기 중입니다.",
  },
  {
    id: "404-nursery-dashboard",
    route: "/nursery/dashboard",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "기존 조리원 경로이며 브라우저 화면 점검은 아직 대기 중입니다.",
  },
];

export const stateCoverage: StateCoverage[] = [
  {
    id: "coverage-empty",
    label: "빈 상태",
    covered: true,
    detail: "상품, 주문, QR 세션이 비어 있는 상태를 상태 패널 시나리오로 표현합니다.",
  },
  {
    id: "coverage-loading",
    label: "로딩",
    covered: true,
    detail: "로딩은 수동 확인 대기 상태로 표현하며, 실제 로딩 동작은 경로 테스트가 필요합니다.",
  },
  {
    id: "coverage-error",
    label: "오류",
    covered: true,
    detail: "만료된 QR, 모의 결제 실패, 연동 차단 상태를 표현합니다.",
  },
  {
    id: "coverage-risk",
    label: "위험",
    covered: true,
    detail: "위험 배지는 차단, 모의 전용, 연동 대기, 결제 실패, 정산 보류, 재고 부족을 표시합니다.",
  },
  {
    id: "coverage-mobile",
    label: "모바일/태블릿 반응형",
    covered: true,
    detail: "미리보기 레이아웃은 반응형 그리드와 모바일 하단 고정 액션 바 패턴을 사용합니다.",
  },
];

export const progressEvents: ProgressEvent[] = [
  {
    id: "event-docs",
    label: "트랙별 보고서 준비",
    detail: "AUTO_REPORT, NEXT_TASKS, BLOCKERS, 진행 기록, 경로 목록, 인수인계, 상태 요약이 reports/my-app 아래에 있습니다.",
    state: "completed",
  },
  {
    id: "event-preview",
    label: "모의 미리보기 경로 생성",
    detail: "상태, 쇼핑몰, 상세, 결제, 세션, 고객 여정, 운영, QA, 분석, 허브 경로를 생성했습니다.",
    state: "completed",
  },
  {
    id: "event-ui",
    label: "재사용 모의 UI 컴포넌트 생성",
    detail: "카드, 경로 매트릭스, 상태 패널, 결제 요약, QR 생명주기, 고객 여정 지도, 분석 미리보기 컴포넌트가 있습니다.",
    state: "completed",
  },
  {
    id: "event-validation",
    label: "검증 완료",
    detail: "npm.cmd run build와 npm.cmd run lint가 통과했고, 선택된 브라우저 점검 경로가 404 없이 로드되었습니다.",
    state: "completed",
  },
  {
    id: "event-live",
    label: "실연동 차단 유지",
    detail: "Firebase, PG, Storage, 알림톡, 배송조회, 외부 재고 실연동 차단 항목을 계속 관리합니다.",
    state: "blocked",
  },
];
