import type { PaymentIntent, PaymentIntentInput, PaymentRequestResult, PaymentWebhookEvent } from "@/types/payment";
import type { PaymentCancellationInput } from "@/types/payment";
import type { PaymentProvider, ProviderReadiness } from "@/lib/payments/types";

function isoNow() {
  return new Date().toISOString();
}

export const mockPaymentProvider: PaymentProvider = {
  id: "mock",
  displayName: "A5 Mock Payment",

  getReadiness(): ProviderReadiness {
    return {
      provider: "mock",
      ready: true,
      mode: "mock",
      label: "mock/test beta 결제 흐름",
      missingKeys: [],
      blockers: ["실제 PG 승인, 취소, 환불, 웹훅은 실행하지 않음"],
    };
  },

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    return {
      ...input,
      id: `mock-intent-${input.orderNo}`,
      provider: "mock",
      status: "ready",
      createdAt: isoNow(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      serverRecalculationRequired: true,
      message: "Mock intent only. Server must recalculate amount before real PG confirm.",
    };
  },

  async requestPayment(intent: PaymentIntent): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      status: "requested",
      transactionId: `MOCK-REQ-${intent.orderNo}`,
      message: "Mock payment request prepared. No PG module was opened.",
    };
  },

  async confirmPayment(intent: PaymentIntent): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      status: "approved_mock",
      paymentKey: `MOCK-PAYMENT-${intent.orderNo}`,
      transactionId: `MOCK-TID-${intent.orderNo}`,
      message: "Mock approval only. No money movement occurred.",
    };
  },

  async handleWebhook(event: PaymentWebhookEvent): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      status: "approved_mock",
      transactionId: event.transactionId,
      paymentKey: event.paymentKey,
      message: "Mock webhook accepted for contract testing only.",
    };
  },

  async cancelPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    return {
      ok: true,
      provider: "mock",
      status: "cancelled_mock",
      transactionId: `MOCK-CANCEL-${input.orderNo}`,
      message: "Mock cancellation only. Real PG cancellation is blocked.",
    };
  },

  async refundPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    return {
      ok: false,
      provider: "mock",
      status: "refund_blocked",
      transactionId: `MOCK-REFUND-BLOCKED-${input.orderNo}`,
      message: "Refund is blocked until PG policy, settlement hold, and approval flow are confirmed.",
    };
  },
};
