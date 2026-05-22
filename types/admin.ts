export type AdminTone = "blue" | "green" | "amber" | "red" | "purple" | "slate";

export type AdminMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: AdminTone;
};

export type AdminPeriodKey = "day" | "week" | "month" | "all";

export type AdminPeriodMetricSet = {
  period: AdminPeriodKey;
  label: string;
  metrics: AdminMetric[];
};

export type AdminRisk = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  owner: string;
  detail: string;
};

export type AdminRiskBadgeStatus =
  | "mock_ready"
  | "blocked"
  | "needs_approval"
  | "production_forbidden"
  | "docs_required";

export type AdminCompany = {
  id: string;
  name: string;
  managerName: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  commissionRate: number;
  maskedSettlementAccount: string;
  productCount: number;
  pendingProductCount: number;
  orderCount: number;
  pendingSettlementAmount: number;
  settlementStatus: "normal" | "review" | "blocked";
  lastReviewedAt: string;
};

export type AdminNursery = {
  id: string;
  nurseryId: string;
  name: string;
  address: string;
  region: string;
  managerName: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  roomCount: number;
  tabletCount: number;
  activeQrCount: number;
  pickupWaitingCount: number;
};

export type AdminRoom = {
  id: string;
  nurseryId: string;
  roomId: string;
  roomNumber: string;
  floor: string;
  tabletId?: string;
  recentQrShortCode?: string;
  pickupWaitingOrderCount: number;
  pickupEnabled: boolean;
  status: "active" | "inactive";
};

export type AdminTablet = {
  id: string;
  tabletId: string;
  nurseryId: string;
  roomId: string;
  label: string;
  status: "active" | "inactive" | "maintenance";
  lastSeenAt: string;
  qrCreatedCount: number;
  cartState: "empty" | "active_cart" | "qr_created" | "stale_cart";
  accessState: "closed_mall_allowed" | "blocked" | "needs_check";
  qrSource: string;
};

export type AdminQrSource = {
  id: string;
  qrSessionId: string;
  shortCode: string;
  cartId: string;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  orderNo?: string;
  status: "active" | "paid" | "expired" | "cancelled";
  createdAt: string;
  expiresAt: string;
  sourceMemo: string;
};

export type AdminProductApproval = {
  id: string;
  productId: string;
  companyId: string;
  companyName: string;
  name: string;
  category: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "suspended";
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
  stock: number;
  imagePlaceholderTone: AdminTone;
  rejectReason?: string;
  priceChangedAfterApproval: boolean;
  reapprovalRequired: boolean;
  submittedAt: string;
};

export type AdminOrder = {
  id: string;
  orderNo: string;
  customerMasked: string;
  nurseryId: string;
  roomId: string;
  qrSessionId: string;
  orderStatus: "paid" | "ready_for_pickup" | "shipping" | "refund_requested" | "cancelled";
  paymentStatus: "approved_mock" | "cancel_requested" | "failed_mock";
  deliveryMethod: "delivery" | "pickup";
  totalAmount: number;
  createdAt: string;
};

export type AdminOrderItem = {
  id: string;
  orderId: string;
  orderNo: string;
  companyId: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  deliveryStatus: "invoice_pending" | "invoice_entered" | "in_transit" | "delivered" | "pickup_ready" | "picked_up";
  settlementStatus: "pending" | "confirmed_mock" | "payout_ready_mock" | "blocked_real_payout";
};

export type AdminPayment = {
  id: string;
  paymentId: string;
  orderId: string;
  orderNo: string;
  status: "approved_mock" | "cancel_requested" | "failed_mock";
  amount: number;
  mockTid: string;
  approvedAt?: string;
  failedReason?: string;
  refundReview: "none" | "requested" | "blocked";
};

export type AdminRefundRequest = {
  id: string;
  refundId: string;
  orderId: string;
  orderNo: string;
  paymentId: string;
  companyId: string;
  amount: number;
  status: "requested" | "reviewing" | "approved_mock" | "rejected" | "blocked_real_pg_required";
  type: "full_cancel" | "partial_cancel" | "refund";
  reason: string;
  requestedAt: string;
  blockerNote?: string;
};

export type AdminNotificationLog = {
  id: string;
  event:
    | "order_created"
    | "payment_success"
    | "delivery_started"
    | "refund_requested"
    | "failed_template_missing";
  target: string;
  status: "mock_ready" | "blocked" | "needs_approval" | "production_forbidden" | "docs_required";
  createdAt: string;
  message: string;
};

export type AdminDeliveryEvent = {
  id: string;
  orderNo: string;
  carrier: string;
  status: "invoice_pending" | "invoice_entered" | "in_transit" | "delivered";
  occurredAt: string;
  memo: string;
};

export type AdminPickupEvent = {
  id: string;
  orderNo: string;
  nurseryId: string;
  roomId: string;
  status: "pickup_ready" | "picked_up";
  occurredAt: string;
  memo: string;
};

export type AdminInventorySync = {
  id: string;
  companyId: string;
  externalCode: string;
  productName: string;
  status: "mock_ready" | "official_docs_required" | "secret_required" | "blocked";
  lastCheckedAt: string;
  stockSnapshot: number;
  blocker: string;
};

export type AdminSettlement = {
  id: string;
  period: string;
  companyId: string;
  companyName: string;
  status: "draft" | "review" | "pending" | "confirmed_mock" | "payout_ready_mock" | "payout_blocked" | "blocked_real_payout";
  grossAmount: number;
  commissionAmount: number;
  refundHoldAmount: number;
  payoutAmount: number;
  orderItemCount: number;
};

export type AdminSettlementItem = {
  id: string;
  orderNo: string;
  companyId: string;
  productName: string;
  quantity: number;
  grossAmount: number;
  commissionAmount: number;
  payoutAmount: number;
  refundHold: number;
};

export type AdminExternalIntegration = {
  id: string;
  name: string;
  category: "notification" | "delivery" | "inventory" | "storage" | "payment";
  status: "mock_ready" | "official_docs_required" | "secret_required" | "production_blocked";
  owner: string;
  lastCheckedAt: string;
  blocker: string;
};

export type AdminOperationRisk = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  status: "open" | "watching" | "mock_mitigated";
  owner: string;
  mitigation: string;
};

export type AdminDetailTimelineItem = {
  id: string;
  title: string;
  at: string;
  actor: string;
  detail: string;
  tone?: AdminTone;
};

export type AdminSearchResult = {
  id: string;
  target: "order_no" | "qr_code" | "company" | "nursery" | "room" | "tablet";
  label: string;
  value: string;
  status: string;
  href: string;
};

export type AdminPermissionMatrixRow = {
  id: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "NURSERY_ADMIN" | "TABLET_DEVICE";
  scope: string;
  canView: boolean;
  canMockApprove: boolean;
  canExport: boolean;
  productionAction: "forbidden" | "server_required" | "not_applicable";
};

export type AdminExportPreview = {
  id: string;
  name: string;
  format: "csv" | "xlsx" | "pdf";
  status: "mock_ready" | "needs_approval" | "production_forbidden";
  rows: number;
  blocker: string;
};

export type AdminSlaAgingItem = {
  id: string;
  queue: "company_approval" | "product_approval" | "refund" | "settlement" | "risk";
  target: string;
  ageHours: number;
  severity: "high" | "medium" | "low";
  owner: string;
  nextAction: string;
};

export type AdminDataQualityIssue = {
  id: string;
  area: "qr_source" | "room" | "settlement_account" | "tablet" | "product_price";
  title: string;
  status: "mock_ready" | "blocked" | "needs_approval" | "docs_required";
  count: number;
  resolution: string;
};

export type AdminReleaseReadinessItem = {
  id: string;
  area: string;
  status: "mock_ready" | "blocked" | "needs_approval" | "docs_required";
  owner: string;
  note: string;
};

export type AdminAuditLog = {
  id: string;
  createdAt: string;
  actorRole: "SUPER_ADMIN" | "COMPANY_ADMIN" | "NURSERY_ADMIN" | "TABLET_DEVICE";
  actorName: string;
  action: string;
  target: string;
  riskLevel: "low" | "medium" | "high";
  message: string;
};

export type AdminSecurityLog = {
  id: string;
  createdAt: string;
  source: string;
  severity: "low" | "medium" | "high";
  message: string;
  resolution: string;
};

export type AdminChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  owner: string;
};
