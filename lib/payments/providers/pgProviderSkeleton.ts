import type { PaymentCancellationInput, PaymentIntent, PaymentIntentInput, PaymentRequestResult, PaymentWebhookEvent } from "@/types/payment";
import type { PaymentProvider } from "@/lib/payments/types";
import { getPaymentRuntimeReadiness } from "@/lib/payments/paymentConfig";

function blocked(message: string): PaymentRequestResult {
  return {
    ok: false,
    provider: "pg_skeleton",
    status: "failed",
    message,
  };
}

export const pgProviderSkeleton: PaymentProvider = {
  id: "pg_skeleton",
  displayName: "PG Provider Skeleton",

  getReadiness: getPaymentRuntimeReadiness,

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    return {
      ...input,
      id: `pg-intent-${input.orderNo}`,
      provider: "pg_skeleton",
      status: "ready",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      serverRecalculationRequired: true,
      message: "PG intent contract is prepared. Real SDK/API call is intentionally blocked.",
    };
  },

  async requestPayment(): Promise<PaymentRequestResult> {
    return blocked("PG SDK/module is not imported until provider, test keys, and server confirm endpoint are approved.");
  },

  async confirmPayment(): Promise<PaymentRequestResult> {
    return blocked("Real PG confirm must run on a server with secret keys after amount recalculation.");
  },

  async handleWebhook(_event: PaymentWebhookEvent): Promise<PaymentRequestResult> {
    return blocked("PG webhook handler requires server runtime and webhook secret validation.");
  },

  async cancelPayment(_input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    return blocked("Real PG cancellation is blocked until refund policy and settlement hold rules are approved.");
  },

  async refundPayment(_input: PaymentCancellationInput): Promise<PaymentRequestResult> {
    return {
      ok: false,
      provider: "pg_skeleton",
      status: "refund_blocked",
      message: "Refund is a C-grade operational risk and remains blocked before approval.",
    };
  },
};
