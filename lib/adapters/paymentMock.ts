import type { PaymentStatus } from "@/types/status";

export type PaymentMockRequest = {
  orderNo: string;
  amount: number;
  qrSessionId: string;
};

export type PaymentMockResult = {
  status: PaymentStatus;
  mockTid: string;
  approvedAt?: string;
  message: string;
};

export function approvePaymentMock(request: PaymentMockRequest): PaymentMockResult {
  return {
    status: "approved_mock",
    mockTid: `MOCK-${request.orderNo}-${request.qrSessionId}`,
    approvedAt: new Date("2026-05-19T16:30:00+09:00").toISOString(),
    message: `${request.amount} KRW mock approval only. No PG request was sent.`,
  };
}

export function failPaymentMock(request: PaymentMockRequest): PaymentMockResult {
  return {
    status: "failed_mock",
    mockTid: `MOCK-FAILED-${request.orderNo}`,
    message: `${request.qrSessionId} mock failure. No PG request was sent.`,
  };
}

export function cancelPaymentMock(orderNo: string): PaymentMockResult {
  return {
    status: "cancelled_mock",
    mockTid: `MOCK-CANCEL-${orderNo}`,
    message: "Mock cancellation only. Real refund or partial cancellation is blocked.",
  };
}
