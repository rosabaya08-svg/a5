import type { DashboardMetric } from "./commerce";

export type NurseryRoomLifecycleStatus =
  | "active"
  | "inactive"
  | "editing"
  | "duplicate_review"
  | "maintenance"
  | "blocked";
export type NurseryTabletAccessStatus = "allowed_mock" | "blocked_browser_mock" | "needs_pairing";
export type NurseryPickupEventStatus = "ready" | "completed" | "exception";
export type NurseryDeliveryEventStatus = "label_created" | "shipping" | "delivered" | "blocked";
export type NurseryQrReviewStatus = "active" | "used" | "expired" | "canceled" | "payment_failed";
export type NurseryRiskLevel = "critical" | "warning" | "attention" | "ok";
export type NurseryStateKind = "empty" | "error" | "loading" | "ready";

export type NurseryScopeFilter = {
  id: string;
  label: string;
  value: string;
  helper: string;
};

export type NurseryDashboardSummary = DashboardMetric & {
  id: string;
};

export type NurseryRoomWorkflow = {
  id: string;
  roomId: string;
  roomNumber: string;
  floor: string;
  status: NurseryRoomLifecycleStatus;
  pickupEnabled: boolean;
  linkedTabletId?: string;
  activeQrCount: number;
  recentOrderNo: string;
  duplicateGuard: string;
  pendingAction: string;
  lastEditedAt: string;
};

export type NurseryTabletWorkflow = {
  id: string;
  tabletId: string;
  roomId: string;
  status: "active" | "inactive" | "maintenance";
  accessStatus: NurseryTabletAccessStatus;
  lastSeenAt: string;
  closedMallAccess: string;
  browserBlockMode: string;
  qrGeneratedCount: number;
  cartState: string;
  operatorNote: string;
};

export type NurseryPickupEvent = {
  id: string;
  orderNo: string;
  roomId: string;
  customerName: string;
  productSummary: string;
  status: NurseryPickupEventStatus;
  requestedAt: string;
  completedAt?: string;
  handledBy: string;
  actionLabel: string;
};

export type NurseryDeliveryEvent = {
  id: string;
  orderNo: string;
  roomId: string;
  customerName: string;
  productSummary: string;
  status: NurseryDeliveryEventStatus;
  carrierMock: string;
  trackingNoMasked: string;
  requestedAt: string;
  updatedAt: string;
  blockerNote: string;
};

export type NurseryQrReviewRow = {
  id: string;
  shortCode: string;
  qrSessionId: string;
  roomId: string;
  tabletId: string;
  status: NurseryQrReviewStatus;
  expiresAt: string;
  amount: number;
  source: string;
};

export type NurseryOrderHistoryRow = {
  id: string;
  orderNo: string;
  roomId: string;
  customerName: string;
  deliveryMethod: "pickup" | "delivery";
  status: string;
  amount: number;
  sourceQr: string;
  createdAt: string;
};

export type NurseryOperationNote = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  tone: "neutral" | "blue" | "green" | "amber" | "red" | "purple";
};

export type NurseryMockControlField = {
  id: string;
  label: string;
  value: string;
  helper: string;
};

export type NurseryMockControl = {
  id: string;
  title: string;
  description: string;
  fields: NurseryMockControlField[];
  primaryAction: string;
  secondaryAction?: string;
};

export type NurseryRiskStatus = {
  id: string;
  title: string;
  target: string;
  level: NurseryRiskLevel;
  detail: string;
  route: string;
};

export type NurserySearchPreset = {
  id: string;
  label: string;
  query: string;
  scope: string;
  sort: string;
  helper: string;
};

export type NurseryStateScenario = {
  id: string;
  title: string;
  state: NurseryStateKind;
  description: string;
  recoveryAction: string;
  targetRoute: string;
};

export type NurseryDetailFact = {
  label: string;
  value: string;
};

export type NurseryDetailTimelineItem = {
  label: string;
  at: string;
  detail: string;
};

export type NurseryDetailRecord = {
  id: string;
  kind: "room" | "tablet" | "pickup" | "qr" | "order";
  title: string;
  subtitle: string;
  statusLabel: string;
  riskLevel: NurseryRiskLevel;
  facts: NurseryDetailFact[];
  timeline: NurseryDetailTimelineItem[];
  blockedActions: string[];
};

export type NurseryBulkRoomPreview = {
  id: string;
  roomNumber: string;
  roomIdPreview: string;
  prefix: string;
  duplicateWarning: string;
  linkedTabletPreview: string;
  action: string;
};

export type NurseryTabletAccessRow = {
  id: string;
  tabletId: string;
  roomId: string;
  sessionId: string;
  browserPolicy: string;
  roomBoundState: string;
  cartState: string;
  expiresAt: string;
  riskLevel: NurseryRiskLevel;
};

export type NurseryPickupAuditLog = {
  id: string;
  orderNo: string;
  actor: string;
  action: string;
  at: string;
  detail: string;
};

export type NurseryOrderItemSnapshot = {
  id: string;
  orderNo: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  pickupStatus: string;
};

export type NurseryRoomOrderStat = {
  id: string;
  roomId: string;
  roomNumber: string;
  orderCount: number;
  pickupCount: number;
  activeQrCount: number;
  lastOrderNo: string;
  riskLevel: NurseryRiskLevel;
};

export type NurseryTabletQrStat = {
  id: string;
  tabletId: string;
  roomId: string;
  qrCreated: number;
  qrExpired: number;
  qrUsed: number;
  paymentFailed: number;
  cartState: string;
  riskLevel: NurseryRiskLevel;
};

export type NurseryUnifiedSearchResult = {
  id: string;
  type: "room" | "tablet" | "order" | "qr" | "pickup";
  keyword: string;
  title: string;
  status: string;
  route: string;
  helper: string;
};

export type NurseryPaginationSnapshot = {
  id: string;
  label: string;
  page: number;
  pageSize: number;
  total: number;
  sort: string;
  filter: string;
};
