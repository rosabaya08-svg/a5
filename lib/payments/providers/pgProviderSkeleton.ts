import type {
  PaymentCancellationInput,
  PaymentIntent,
  PaymentIntentInput,
  PaymentProviderCandidate,
  PaymentRequestResult,
  PaymentWebhookEvent,
} from "@/types/payment";
import type { PaymentProvider } from "@/lib/payments/types";
import {
  getPaymentConfigSummary,
  getPaymentRuntimeReadiness,
  toPaymentProviderId,
} from "@/lib/payments/paymentConfig";

function blocked(candidate: PaymentProviderCandidate, adapterAction: PaymentRequestResult["adapterAction"], message: string): PaymentRequestResult {
  return {
    ok: false,
    provider: toPaymentProviderId(candidate),
    providerCandidate: candidate,
    status: adapterAction === "refundPayment" ? "refund_blocked" : "failed",
    realPgCalled: false,
    adapterAction,
    message,
  };
}

function currentCandidate(): PaymentProviderCandidate {
  return getPaymentConfigSummary().candidate;
}

export const pgProviderSkeleton: PaymentProvider = {
  id: "pg_skeleton",
  candidate: "unknown",
  displayName: "PG 결제사 어댑터 슬롯",
  capabilities: {
    createPaymentIntent: true,
    requestPayment: true,
    confirmPayment: true,
    handleWebhook: true,
    cancelPayment: true,
    refundPayment: true,
    realPgCallsEnabled: false,
  },

  getReadiness: getPaymentRuntimeReadiness,

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    const summary = getPaymentConfigSummary();

    return {
      ...input,
      id: `pg-intent-${summary.candidate}-${input.orderNo}`,
      provider: toPaymentProviderId(summary.candidate),
      providerCandidate: summary.candidate,
      status: "ready",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      successUrl: input.successUrl || summary.successUrl,
      failUrl: input.failUrl || summary.failUrl,
      paymentApiBaseUrl: input.paymentApiBaseUrl || summary.paymentApiBaseUrl,
      serverRecalculationRequired: true,
      message: "PG intent contract is prepared. Real SDK/API calls are intentionally blocked until official provider docs are applied.",
    };
  },

  async requestPayment(intent: PaymentIntent): Promise<PaymentRequestResult> {
    const candidate = intent.providerCandidate ?? currentCandidate();
    return blocked(
      candidate,
      "requestPayment",
      `PG browser module request slot is ready for ${candidate}. Importing or opening the real SDK is still blocked.`,
    );
  },

  async confirmPayment(intent: PaymentIntent): Promise<PaymentRequestResult> {
    const candidate = intent.providerCandidate ?? currentCandidate();
    return blocked(
      candidate,
      "confirmPayment",
      `Real ${candidate} confirm must run inside Firebase Functions after amount recalculation and PG_SECRET_KEY injection.`,
    );
  },

  async handleWebhook(event: PaymentWebhookEvent): Promise<PaymentRequestResult> {
    return blocked(
      event.providerCandidate ?? currentCandidate(),
      "handleWebhook",
      "Webhook handler slot is ready, but real signature verification requires PG_WEBHOOK_SECRET and official algorithm.",
    );
  },

  async cancelPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    void input;
    return blocked(
      currentCandidate(),
      "cancelPayment",
      "Real PG cancellation is blocked until refund policy and settlement hold rules are approved.",
    );
  },

  async refundPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    void input;
    return blocked(
      currentCandidate(),
      "refundPayment",
      "Refund is a high-risk operation and remains interface-only until approval.",
    );
  },
};
