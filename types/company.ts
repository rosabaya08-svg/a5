export type CompanyProductStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "needs_reapproval"
  | "suspended";

export type CompanyOrderStatus =
  | "paid"
  | "preparing"
  | "invoice_pending"
  | "shipping"
  | "ready_for_pickup"
  | "picked_up"
  | "refund_requested"
  | "cancelled";

export type CompanyDeliveryMethod = "delivery" | "pickup";

export type CompanySettlementStatus =
  | "draft"
  | "review"
  | "confirmed_mock"
  | "payout_scheduled_mock"
  | "paid_mock"
  | "payout_blocked"
  | "blocked_real_payout";

export type CompanyRefundStatus =
  | "requested"
  | "company_review"
  | "admin_review"
  | "approved_mock"
  | "rejected_mock";

export type CompanyInventoryMovementType =
  | "initial"
  | "order_reserved"
  | "order_reserved_mock"
  | "order_confirmed_mock"
  | "manual_adjustment_mock"
  | "cancel_restore_mock"
  | "refund_restored"
  | "external_sync_mock"
  | "external_sync_mock_blocked";

export type CompanyKpiTone = "green" | "blue" | "amber" | "red" | "purple" | "neutral";

export type CompanyRiskSeverity = "high" | "medium" | "low";

export type CompanyRiskStatus = "open" | "watching" | "blocked" | "resolved_mock";

export type CompanyProfile = {
  id: string;
  name: string;
  managerName: string;
  managerEmail: string;
  status: "approved" | "pending" | "suspended";
  commissionRate: number;
  settlementAccountMasked: string;
  defaultReturnPolicy: string;
};

export type CompanyKpi = {
  label: string;
  value: string;
  helper: string;
  tone?: CompanyKpiTone;
};

export type CompanyProduct = {
  id: string;
  companyId: string;
  name: string;
  brand?: string;
  category: string;
  status: CompanyProductStatus;
  normalPrice: number;
  closedMallPrice: number;
  platformLowestPrice: number;
  priceComparisonStatus?: "valid_mock" | "needs_update" | "blocked_external_check";
  stockTotal: number;
  imagePlaceholder: string;
  description?: string;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  refundGuide?: string;
  externalProductCode?: string;
  approvalRequestedAt?: string;
  rejectionReason?: string;
  reapprovalReason?: string;
  storageState: "placeholder_only" | "mock_uploaded";
};

export type CompanyProductOption = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  stock: number;
  safetyStock: number;
  priceDelta: number;
  saleState?: "on_sale" | "out_of_stock" | "sales_suspended";
  externalSkuCode?: string;
  externalMappingStatus: "mapped_mock" | "needs_mapping" | "blocked_external_api";
};

export type CompanyInventoryMovement = {
  id: string;
  productId: string;
  optionId: string;
  type: CompanyInventoryMovementType;
  quantity: number;
  memo: string;
  createdAt: string;
};

export type CompanyOrderLine = {
  id: string;
  orderId: string;
  orderNo: string;
  productId: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  settlementAmount: number;
  deliveryMethod: CompanyDeliveryMethod;
  deliveryStatus: CompanyOrderStatus;
  invoiceNo?: string;
  pickupCode?: string;
};

export type CompanyOrder = {
  id: string;
  orderNo: string;
  customerNameMasked: string;
  customerPhoneMasked: string;
  nurseryName: string;
  roomName: string;
  status: CompanyOrderStatus;
  deliveryMethod: CompanyDeliveryMethod;
  orderedAt: string;
  paidAt?: string;
  totalAmount: number;
};

export type CompanySettlement = {
  id: string;
  period: string;
  status: CompanySettlementStatus;
  grossAmount: number;
  commissionAmount: number;
  refundHoldAmount: number;
  payoutAmount: number;
  scheduledPayoutDate?: string;
};

export type CompanyPayout = {
  id: string;
  settlementId: string;
  status: "scheduled_mock" | "paid_mock" | "blocked_real_payout";
  amount: number;
  bankAccountMasked: string;
  scheduledAt: string;
  blockedReason?: string;
};

export type CompanyRefundRequest = {
  id: string;
  orderNo: string;
  productName: string;
  requesterMasked: string;
  reason: string;
  status: CompanyRefundStatus;
  requestedAt: string;
  refundAmount: number;
  companyReviewMemo: string;
};

export type CompanyExternalInventoryMapping = {
  id: string;
  productId: string;
  optionId: string;
  externalProductId: string;
  externalSku: string;
  lastSyncStatus: "mapped_mock" | "needs_mapping" | "external_sync_mock_blocked" | "stale_mock";
  blockedReason: string;
  lastSyncAt?: string;
};

export type CompanyDeliveryEvent = {
  id: string;
  orderLineId: string;
  orderNo: string;
  courierName: string;
  invoiceNo: string;
  status: "invoice_ready_mock" | "tracking_blocked" | "shipping_mock" | "delivered_mock";
  occurredAt: string;
  memo: string;
};

export type CompanyPickupEvent = {
  id: string;
  orderLineId: string;
  orderNo: string;
  nurseryName: string;
  roomName: string;
  customerNameMasked: string;
  productName: string;
  status: "waiting" | "picked_up_mock" | "cancelled_mock";
  handledBy: string;
  handledAt?: string;
};

export type CompanyUserAccess = {
  id: string;
  companyId: string;
  name: string;
  emailMasked: string;
  role: "COMPANY_ADMIN" | "COMPANY_STAFF_VIEWER" | "COMPANY_STAFF_OPERATOR";
  status: "active_mock" | "invited_mock" | "suspended_mock";
  lastSeenAt?: string;
  permissionSummary: string;
};

export type CompanySalesBreakdown = {
  id: string;
  label: string;
  group: "period" | "product" | "nursery" | "order_status";
  orderCount: number;
  grossAmount: number;
  payoutEstimate: number;
};

export type CompanyPriceChange = {
  id: string;
  productId: string;
  beforePrice: number;
  afterPrice: number;
  status: "draft_mock" | "needs_reapproval" | "approved_mock" | "rejected_mock";
  requestedAt: string;
  reason: string;
};

export type CompanyNotificationSetting = {
  id: string;
  channel: "email_mock" | "sms_mock" | "alimtalk_blocked" | "dashboard_only";
  event: "product_approval" | "order_created" | "delivery_waiting" | "refund_requested" | "payout_ready";
  enabledMock: boolean;
  blockedReason?: string;
};

export type CompanyAuditLog = {
  id: string;
  actor: string;
  role: "COMPANY_ADMIN" | "COMPANY_STAFF_OPERATOR" | "SYSTEM_MOCK";
  action: string;
  targetType: "product" | "order" | "inventory" | "settlement" | "refund" | "user";
  targetId: string;
  createdAt: string;
  message: string;
};

export type CompanyDailySales = {
  date: string;
  orderCount: number;
  grossAmount: number;
  payoutEstimate: number;
};

export type CompanyRiskItem = {
  id: string;
  title: string;
  severity: CompanyRiskSeverity;
  status: CompanyRiskStatus;
  owner: string;
  surface: "product" | "inventory" | "delivery" | "settlement" | "refund" | "integration";
  detail: string;
};

export type CompanyFilterPreset = {
  id: string;
  label: string;
  target: "products" | "orders" | "inventory" | "settlements" | "refunds";
  query: string;
  sort: string;
  resultCount: number;
};

export type CompanyDetailEvent = {
  id: string;
  targetId: string;
  label: string;
  status: "done" | "current" | "blocked" | "next";
  at: string;
  detail: string;
};

export type CompanyEmptyStateSpec = {
  id: string;
  surface: string;
  title: string;
  description: string;
  recovery: string;
};

export type CompanyErrorStateSpec = {
  id: string;
  surface: string;
  title: string;
  description: string;
  blockedBy: string;
};

export type CompanyWorkQueueItem = {
  day: string;
  title: string;
  status: "done_mock" | "blocked" | "next";
  detail: string;
};
