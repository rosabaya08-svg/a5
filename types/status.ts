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
  | "refunded"
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
  draft: "임시저장",
  pending_approval: "승인요청",
  approved: "승인완료",
  rejected: "반려",
  suspended: "판매중지",
  archived: "보관",
};

export const qrSessionStatusLabels: Record<QrSessionStatus, string> = {
  active: "사용 가능",
  paid: "결제 완료",
  expired: "만료",
  cancelled: "취소",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "결제 대기",
  paid: "결제 완료",
  preparing: "상품 준비",
  shipping: "배송 중",
  ready_for_pickup: "현장수령 준비",
  delivered: "배송 완료",
  picked_up: "현장수령 완료",
  refund_requested: "환불 요청",
  refund_reviewed: "환불 검토",
  refund_approved_mock: "mock 환불 승인",
  refund_rejected: "환불 반려",
  refunded: "환불 완료",
  cancelled: "취소",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  ready: "결제 준비",
  approved_mock: "mock 승인",
  failed_mock: "mock 실패",
  cancel_requested: "취소 요청",
  cancelled_mock: "mock 취소",
};

export const settlementStatusLabels: Record<SettlementStatus, string> = {
  draft: "계산 초안",
  review: "검산 중",
  confirmed_mock: "mock 확정",
  payout_blocked: "지급 보류",
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
  refunded: "green",
  ready: "neutral",
  approved_mock: "green",
  failed_mock: "red",
  cancel_requested: "amber",
  cancelled_mock: "neutral",
  review: "purple",
  confirmed_mock: "green",
  payout_blocked: "red",
};
