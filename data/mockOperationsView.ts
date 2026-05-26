import type {
  ApprovalQueueItem,
  IntegrationGate,
  OperationMetric,
  SmokeRouteCandidate,
} from "@/types/mockOperationsView";

export const operationMetrics: OperationMetric[] = [
  {
    id: "metric-admin-orders",
    label: "관리자 주문 상태",
    value: "12",
    helper: "결제 완료, 실패, 현장수령, 환불 요청, 정산 보류 모의 상태입니다.",
    track: "admin",
    riskStatuses: ["mock_only"],
  },
  {
    id: "metric-company-products",
    label: "기업 상품 상태",
    value: "9",
    helper: "초안, 승인 대기, 반려, 승인, 판매 중지, 재고 부족 상태입니다.",
    track: "company",
    riskStatuses: ["needs_review", "mock_only"],
  },
  {
    id: "metric-nursery-tablets",
    label: "조리원 기기 상태",
    value: "6",
    helper: "활성, 비활성, 점검, QR 출처 추적 상태입니다.",
    track: "nursery",
    riskStatuses: ["mock_only"],
  },
  {
    id: "metric-qr-sessions",
    label: "QR 세션 유형",
    value: "8",
    helper: "활성, 만료, 결제 완료, 취소, 조르기 결제 모의 흐름입니다.",
    track: "tablet_qr",
    riskStatuses: ["integration_pending", "mock_only"],
  },
];

export const approvalQueueItems: ApprovalQueueItem[] = [
  {
    id: "approval-product-001",
    title: "프리미엄 회복 키트 승인",
    owner: "기업 관리자",
    track: "company",
    statusLabel: "승인 대기",
    requestedAt: "2026-05-20 19:40",
    riskStatuses: ["needs_review", "mock_only"],
  },
  {
    id: "approval-refund-001",
    title: "환불 요청 검토",
    owner: "최고관리자",
    track: "admin",
    statusLabel: "검토 전용",
    requestedAt: "2026-05-20 20:10",
    riskStatuses: ["blocked", "mock_only"],
  },
  {
    id: "approval-storage-001",
    title: "Storage 업그레이드 결정",
    owner: "Firebase 소유자",
    track: "firebase_contract",
    statusLabel: "승인 필요",
    requestedAt: "2026-05-20 21:00",
    riskStatuses: ["integration_pending", "blocked"],
  },
];

export const integrationGates: IntegrationGate[] = [
  {
    id: "gate-firebase",
    name: "Firebase 연결",
    currentState: "approval_needed",
    blocker: "Firestore 규칙이 잠겨 있으며 설정 파일 생성은 검토가 필요합니다.",
    nextSafeStep: "SDK import 전 저장소 계약과 규칙 계획을 확정합니다.",
    riskStatuses: ["blocked", "integration_pending"],
  },
  {
    id: "gate-pg",
    name: "PG 결제",
    currentState: "docs_needed",
    blocker: "공식 PG 문서, 테스트 키, 환불 정책, 정산 흐름이 아직 승인되지 않았습니다.",
    nextSafeStep: "결제 어댑터는 모의 모드로 유지하고 실연동 인계 조건을 문서화합니다.",
    riskStatuses: ["blocked", "payment_failed"],
  },
  {
    id: "gate-storage",
    name: "Firebase Storage",
    currentState: "blocked",
    blocker: "Storage 사용을 위해 요금제와 규칙 검토가 필요합니다.",
    nextSafeStep: "상품 등록 정책 승인 전까지 상품 미디어는 임시 소재를 사용합니다.",
    riskStatuses: ["blocked", "integration_pending"],
  },
  {
    id: "gate-delivery",
    name: "배송조회",
    currentState: "mock_ready",
    blocker: "택배사 API 계정 또는 운영 키가 승인되지 않았습니다.",
    nextSafeStep: "배송 상태는 모의 상태 라벨로만 유지합니다.",
    riskStatuses: ["mock_only", "integration_pending"],
  },
];

export const smokeRouteCandidates: SmokeRouteCandidate[] = [
  {
    id: "route-mock-ui",
    route: "/mock-ui",
    area: "qa",
    purpose: "공통 상태, 필터, 상세 미리보기입니다.",
    expectedState: "preview",
    riskStatuses: ["mock_only"],
  },
  {
    id: "route-mock-detail",
    route: "/mock-ui/detail",
    area: "qa",
    purpose: "상품, QR, 주문 상세 모의 미리보기입니다.",
    expectedState: "preview",
    riskStatuses: ["mock_only"],
  },
  {
    id: "route-mock-checkout",
    route: "/mock-ui/checkout",
    area: "tablet_qr",
    purpose: "QR 결제와 비회원 조회 미리보기입니다.",
    expectedState: "preview",
    riskStatuses: ["mock_only", "integration_pending"],
  },
  {
    id: "route-mock-operations",
    route: "/mock-ui/operations",
    area: "admin",
    purpose: "운영, 승인, 차단선, 화면 점검 경로 매트릭스입니다.",
    expectedState: "preview",
    riskStatuses: ["mock_only"],
  },
];
