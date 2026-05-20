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
    title: "No products match this filter",
    description:
      "The closed mall can show a calm empty state while keeping the category and price filters available.",
    tone: "neutral",
    action: { label: "Reset filters", description: "Return to all mock products." },
  },
  {
    id: "empty-orders",
    kind: "empty",
    title: "No guest orders found",
    description:
      "The guest order lookup should explain that order number and masked phone must match the mock record.",
    tone: "info",
  },
  {
    id: "empty-qr",
    kind: "empty",
    title: "No active QR session",
    description:
      "The tablet can guide staff to rebuild a mock cart before generating a new QR payment entry.",
    tone: "warning",
  },
];

export const mockErrorStates: MockUiState[] = [
  {
    id: "expired-qr",
    kind: "expired",
    title: "QR session expired",
    description:
      "The payment entry is closed in mock mode. A new QR session must be generated from the tablet cart.",
    tone: "danger",
    action: { label: "Generate a new mock QR" },
  },
  {
    id: "payment-failed",
    kind: "error",
    title: "Mock payment failed",
    description:
      "No PG call was made. This state is used only to test retry and support messaging before live integration.",
    tone: "danger",
  },
  {
    id: "integration-blocked",
    kind: "blocked",
    title: "Live integration is blocked",
    description:
      "Firebase, PG, Alimtalk, delivery tracking, and external inventory APIs remain disabled until separate approval.",
    tone: "warning",
  },
];

export const riskStatusLabels: Record<RiskStatus, string> = {
  needs_review: "Needs review",
  blocked: "Blocked",
  expired: "Expired",
  payment_failed: "Payment failed",
  settlement_hold: "Settlement hold",
  inventory_low: "Low inventory",
  integration_pending: "Integration pending",
  mock_only: "Mock only",
};

export const commerceFilterGroups: FilterGroup[] = [
  {
    id: "category",
    label: "Category",
    options: [
      { label: "All", value: "all" },
      { label: "Care", value: "care", count: 8 },
      { label: "Gift", value: "gift", count: 6 },
      { label: "Recovery", value: "recovery", count: 5 },
    ],
  },
  {
    id: "fulfillment",
    label: "Fulfillment",
    options: [
      { label: "All", value: "all" },
      { label: "Delivery", value: "delivery", count: 14 },
      { label: "Pickup", value: "pickup", count: 7 },
    ],
  },
  {
    id: "risk",
    label: "State",
    options: [
      { label: "In stock", value: "in_stock", count: 16 },
      { label: "Low inventory", value: "inventory_low", count: 3 },
      { label: "Mock only", value: "mock_only", count: 21 },
    ],
  },
];

export const commerceSortOptions: SortOption[] = [
  { label: "Recommended", value: "recommended", description: "Default closed mall ordering." },
  { label: "Discount high to low", value: "discount_desc" },
  { label: "Price low to high", value: "price_asc" },
  { label: "Newest mock item", value: "created_desc" },
];

export const productDetailMockSections: DetailSection[] = [
  {
    id: "price",
    title: "Price comparison layer",
    description: "A mock-only comparison block that does not call an AI or external price API.",
    fields: [
      { label: "List price", value: "KRW 158,000" },
      { label: "Closed mall price", value: "KRW 119,000" },
      { label: "Displayed discount", value: "25%" },
    ],
  },
  {
    id: "fulfillment",
    title: "Fulfillment options",
    fields: [
      { label: "Delivery", value: "Available" },
      { label: "Nursery pickup", value: "Available for selected rooms" },
      { label: "Stock state", value: "Low inventory mock" },
    ],
  },
  {
    id: "integration",
    title: "Live integration boundary",
    fields: [
      { label: "Firebase", value: "Not connected" },
      { label: "PG", value: "Mock only" },
      { label: "External inventory", value: "Not connected" },
    ],
  },
];

