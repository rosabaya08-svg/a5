import type { CartItemInput } from "../payments/types";

export type OrderSnapshotInput = {
  orderNo: string;
  qrSessionId: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  items: CartItemInput[];
  totalAmount: number;
  paidAt: string;
};

export type OrderItemSnapshot = CartItemInput & {
  lineTotal: number;
  qrSessionId: string;
  orderNo: string;
};

export type OrderSnapshotDraft = {
  orderNo: string;
  qrSessionId: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  totalAmount: number;
  paidAt: string;
  status: "paid_mock";
  items: OrderItemSnapshot[];
  writePlan: string[];
};

export function createOrderSnapshotDraft(input: OrderSnapshotInput): OrderSnapshotDraft {
  return {
    orderNo: input.orderNo,
    qrSessionId: input.qrSessionId,
    nurseryId: input.nurseryId,
    roomId: input.roomId,
    tabletId: input.tabletId,
    totalAmount: input.totalAmount,
    paidAt: input.paidAt,
    status: "paid_mock",
    items: input.items.map((item) => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
      qrSessionId: input.qrSessionId,
      orderNo: input.orderNo,
    })),
    writePlan: [
      "Set orders/{orderNo} with paid status and payment snapshot.",
      "Set order_items/{orderNo}-{lineNo} per item for company settlement.",
      "Update qr_payment_sessions/{qrSessionId} to paid and one-time used.",
      "Append payments/{paymentIntentId} and audit_logs/{autoId}.",
    ],
  };
}
