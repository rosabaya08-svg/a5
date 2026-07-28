import type { PaymentCancellationInput, PaymentIntent, PaymentIntentInput, PaymentRequestResult, PaymentWebhookEvent } from "@/types/payment";
import type { PaymentProvider, ProviderReadiness } from "@/lib/payments/types";

function isoNow() {
  return new Date().toISOString();
}

export const mockPaymentProvider: PaymentProvider = {
  id: "mock",
  candidate: "mock",
  displayName: "A5 모의 결제",
  capabilities: {
    createPaymentIntent: true,
    requestPayment: true,
    confirmPayment: true,
    handleWebhook: true,
    cancelPayment: true,
    refundPayment: true,
    realPgCallsEnabled: false,
  },

  getReadiness(): ProviderReadiness {
    return {
      provider: "mock",
      candidate: "mock",
      ready: true,
      mode: "mock",
      label: "모의/테스트 베타 결제 흐름",
      missingKeys: [],
      publicKeys: [],
      serverKeys: [],
      blockers: ["실제 PG 승인, 취소, 환불, 정산은 실행하지 않음"],
      handoff: ["PG 결제사 확정 전까지 모의 결제사를 유지합니다."],
    };
  },

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    return {
      ...input,
      id: `mock-intent-${input.orderNo}`,
      provider: "mock",
      providerCandidate: "mock",
      status: "ready",
      createdAt: isoNow(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      serverRecalculationRequired: true,
      message: "모의 결제 의도만 생성됩니다. 실제 PG 승인 전에는 서버에서 금액을 반드시 재계산해야 합니다.",
    };
  },

  async requestPayment(intent: PaymentIntent): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      providerCandidate: "mock",
      status: "requested",
      transactionId: `MOCK-REQ-${intent.orderNo}`,
      realPgCalled: false,
      adapterAction: "requestPayment",
      message: "모의 결제 요청이 준비되었습니다. 실제 PG 모듈은 열리지 않았습니다.",
    };
  },

  async confirmPayment(intent: PaymentIntent): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      providerCandidate: "mock",
      status: "approved_mock",
      paymentKey: `MOCK-PAYMENT-${intent.orderNo}`,
      transactionId: `MOCK-TID-${intent.orderNo}`,
      realPgCalled: false,
      adapterAction: "confirmPayment",
      message: "모의 승인만 처리되었습니다. 실제 금전 이동은 발생하지 않았습니다.",
    };
  },

  async handleWebhook(event: PaymentWebhookEvent): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      providerCandidate: "mock",
      status: "approved_mock",
      transactionId: event.transactionId,
      paymentKey: event.paymentKey,
      realPgCalled: false,
      adapterAction: "handleWebhook",
      message: "계약 테스트용 모의 웹훅만 수락되었습니다.",
    };
  },

  async cancelPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      providerCandidate: "mock",
      status: "cancelled_mock",
      transactionId: `MOCK-CANCEL-${input.orderNo}`,
      realPgCalled: false,
      adapterAction: "cancelPayment",
      message: "모의 취소만 처리되었습니다. 실제 PG 취소는 차단되어 있습니다.",
    };
  },

  async refundPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    return {
      ok: false,
      provider: "mock",
      providerCandidate: "mock",
      status: "refund_blocked",
      transactionId: `MOCK-REFUND-BLOCKED-${input.orderNo}`,
      realPgCalled: false,
      adapterAction: "refundPayment",
      message: "PG 정책, 정산 보류, 승인 흐름이 확정될 때까지 환불은 차단됩니다.",
    };
  },
};
