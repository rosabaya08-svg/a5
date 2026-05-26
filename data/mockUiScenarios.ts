import type {
  DetailSection,
  FilterGroup,
  MockUiState,
  RiskStatus,
  SortOption,
} from "@/types/mockUi";

export const mockEmptyStates: MockUiState[] = [
  {
    id: "empty-products",
    kind: "empty",
    title: "조건에 맞는 상품이 없습니다",
    description:
      "폐쇄몰은 카테고리와 가격 필터를 유지하면서 차분한 빈 상태를 보여줄 수 있습니다.",
    tone: "neutral",
    action: { label: "필터 초기화", description: "전체 모의 상품으로 돌아갑니다." },
  },
  {
    id: "empty-orders",
    kind: "empty",
    title: "비회원 주문을 찾을 수 없습니다",
    description:
      "비회원 주문조회는 주문번호와 휴대폰번호가 모의 기록과 일치해야 한다고 안내해야 합니다.",
    tone: "info",
  },
  {
    id: "empty-qr",
    kind: "empty",
    title: "활성 QR 세션이 없습니다",
    description:
      "태블릿은 새 QR 결제 진입을 만들기 전에 모의 장바구니를 다시 구성하도록 안내할 수 있습니다.",
    tone: "warning",
  },
];

export const mockErrorStates: MockUiState[] = [
  {
    id: "expired-qr",
    kind: "expired",
    title: "QR 세션이 만료되었습니다",
    description:
      "결제 진입이 모의 모드에서 닫혔습니다. 태블릿 장바구니에서 새 QR 세션을 생성해야 합니다.",
    tone: "danger",
    action: { label: "새 모의 QR 생성" },
  },
  {
    id: "payment-failed",
    kind: "error",
    title: "모의 결제가 실패했습니다",
    description:
      "PG 호출은 실행되지 않았습니다. 이 상태는 실연동 전 재시도와 고객 안내 문구를 점검하기 위한 용도입니다.",
    tone: "danger",
  },
  {
    id: "integration-blocked",
    kind: "blocked",
    title: "실연동이 차단되어 있습니다",
    description:
      "별도 승인 전까지 Firebase, PG, 알림톡, 배송조회, 외부 재고 API는 비활성 상태입니다.",
    tone: "warning",
  },
];

export const riskStatusLabels: Record<RiskStatus, string> = {
  needs_review: "검토 필요",
  blocked: "차단",
  expired: "만료",
  payment_failed: "결제 실패",
  settlement_hold: "정산 보류",
  inventory_low: "재고 부족",
  integration_pending: "연동 대기",
  mock_only: "모의 전용",
};

export const commerceFilterGroups: FilterGroup[] = [
  {
    id: "category",
    label: "카테고리",
    options: [
      { label: "전체", value: "all" },
      { label: "케어", value: "care", count: 8 },
      { label: "선물", value: "gift", count: 6 },
      { label: "회복", value: "recovery", count: 5 },
    ],
  },
  {
    id: "fulfillment",
    label: "수령 방식",
    options: [
      { label: "전체", value: "all" },
      { label: "택배배송", value: "delivery", count: 14 },
      { label: "현장수령", value: "pickup", count: 7 },
    ],
  },
  {
    id: "risk",
    label: "상태",
    options: [
      { label: "재고 있음", value: "in_stock", count: 16 },
      { label: "재고 부족", value: "inventory_low", count: 3 },
      { label: "모의 전용", value: "mock_only", count: 21 },
    ],
  },
];

export const commerceSortOptions: SortOption[] = [
  { label: "추천순", value: "recommended", description: "폐쇄몰 기본 노출 순서입니다." },
  { label: "할인율 높은순", value: "discount_desc" },
  { label: "낮은 가격순", value: "price_asc" },
  { label: "최신 모의 상품순", value: "created_desc" },
];

export const productDetailMockSections: DetailSection[] = [
  {
    id: "price",
    title: "가격 비교 레이어",
    description: "AI 또는 외부 가격 API를 호출하지 않는 모의 전용 비교 블록입니다.",
    fields: [
      { label: "정상가", value: "158,000원" },
      { label: "폐쇄몰가", value: "119,000원" },
      { label: "표시 할인율", value: "25%" },
    ],
  },
  {
    id: "fulfillment",
    title: "수령 방식",
    fields: [
      { label: "택배배송", value: "가능" },
      { label: "조리원 현장수령", value: "선택 객실 가능" },
      { label: "재고 상태", value: "재고 부족 모의 상태" },
    ],
  },
  {
    id: "integration",
    title: "실연동 차단선",
    fields: [
      { label: "Firebase", value: "미연결" },
      { label: "PG", value: "모의 전용" },
      { label: "외부 재고", value: "미연결" },
    ],
  },
];
