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

export type PaymentMockReadiness = {
  mode: "mock_only";
  pgReady: false;
  serverConfirmRequired: true;
  blockers: string[];
};

export function getPaymentMockReadiness(): PaymentMockReadiness {
  return {
    mode: "mock_only",
    pgReady: false,
    serverConfirmRequired: true,
    blockers: [
      "PG provider and test keys required",
      "서버 금액 재계산 엔드포인트 필요",
      "Webhook signature verification required",
      "Refund and settlement approval policy required",
    ],
  };
}

export function approvePaymentMock(request: PaymentMockRequest): PaymentMockResult {
  return {
    status: "approved_mock",
    mockTid: `MOCK-${request.orderNo}-${request.qrSessionId}`,
    approvedAt: new Date("2026-05-19T16:30:00+09:00").toISOString(),
    message: `${request.amount} KRW 모의 승인만 처리되었습니다. 실제 PG 요청은 전송되지 않았습니다.`,
  };
}

export function failPaymentMock(request: PaymentMockRequest): PaymentMockResult {
  return {
    status: "failed_mock",
    mockTid: `MOCK-FAILED-${request.orderNo}`,
    message: `${request.qrSessionId} 모의 실패입니다. 실제 PG 요청은 전송되지 않았습니다.`,
  };
}

export function cancelPaymentMock(orderNo: string): PaymentMockResult {
  return {
    status: "cancelled_mock",
    mockTid: `MOCK-CANCEL-${orderNo}`,
    message: "모의 취소만 처리되었습니다. 실제 환불 또는 부분 취소는 차단되어 있습니다.",
  };
}
