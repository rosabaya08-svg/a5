export type ProductStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "suspended"
  | "archived";

export type QrSessionStatus = "active" | "paid" | "expired" | "cancelled";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "shipping"
  | "ready_for_pickup"
  | "delivered"
  | "picked_up"
  | "refund_requested"
  | "refund_reviewed"
  | "refund_approved_mock"
  | "refund_rejected"
  | "cancelled";

export type PaymentStatus =
  | "ready"
  | "approved_mock"
  | "failed_mock"
  | "cancel_requested"
  | "cancelled_mock";

export type SettlementStatus =
  | "draft"
  | "review"
  | "confirmed_mock"
  | "payout_blocked";

export type DeliveryStatus =
  | "invoice_pending"
  | "invoice_entered"
  | "in_transit"
  | "delivered"
  | "pickup_ready"
  | "picked_up";

export type StatusTone = "neutral" | "blue" | "green" | "amber" | "red" | "purple";

export const productStatusLabels: Record<ProductStatus, string> = {
  draft: "Draft",
  pending_approval: "Approval pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  archived: "Archived",
};

export const qrSessionStatusLabels: Record<QrSessionStatus, string> = {
  active: "Active",
  paid: "Paid",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Paid",
  preparing: "Preparing",
  shipping: "Shipping",
  ready_for_pickup: "Pickup ready",
  delivered: "Delivered",
  picked_up: "Picked up",
  refund_requested: "Refund requested",
  refund_reviewed: "Refund reviewed",
  refund_approved_mock: "Refund approved mock",
  refund_rejected: "Refund rejected",
  cancelled: "Cancelled",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  ready: "Ready",
  approved_mock: "Approved mock",
  failed_mock: "Failed mock",
  cancel_requested: "Cancel requested",
  cancelled_mock: "Cancelled mock",
};

export const settlementStatusLabels: Record<SettlementStatus, string> = {
  draft: "Draft",
  review: "In review",
  confirmed_mock: "Confirmed mock",
  payout_blocked: "Payout blocked",
};

export const statusToneMap: Record<
  ProductStatus | QrSessionStatus | OrderStatus | PaymentStatus | SettlementStatus,
  StatusTone
> = {
  draft: "neutral",
  pending_approval: "amber",
  approved: "green",
  rejected: "red",
  suspended: "red",
  archived: "neutral",
  active: "blue",
  paid: "green",
  expired: "red",
  cancelled: "neutral",
  pending_payment: "amber",
  preparing: "blue",
  shipping: "purple",
  ready_for_pickup: "blue",
  delivered: "green",
  picked_up: "green",
  refund_requested: "amber",
  refund_reviewed: "purple",
  refund_approved_mock: "green",
  refund_rejected: "red",
  ready: "neutral",
  approved_mock: "green",
  failed_mock: "red",
  cancel_requested: "amber",
  cancelled_mock: "neutral",
  review: "purple",
  confirmed_mock: "green",
  payout_blocked: "red",
};
