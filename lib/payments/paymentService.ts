import type { PaymentIntentInput, PaymentRequestResult } from "@/types/payment";
import type { PaymentProvider, ProviderReadiness } from "@/lib/payments/types";
import { mockPaymentProvider } from "@/lib/payments/providers/mockPaymentProvider";
import { pgProviderSkeleton } from "@/lib/payments/providers/pgProviderSkeleton";
import { getPaymentConfigSummary } from "@/lib/payments/paymentConfig";

export function getActivePaymentProvider(): PaymentProvider {
  const summary = getPaymentConfigSummary();
  return summary.provider === "mock" || !summary.provider ? mockPaymentProvider : pgProviderSkeleton;
}

export function getPaymentReadiness(): ProviderReadiness {
  return getActivePaymentProvider().getReadiness();
}

export async function createCheckoutPreview(input: PaymentIntentInput): Promise<{
  readiness: ProviderReadiness;
  request: PaymentRequestResult;
}> {
  const provider = getActivePaymentProvider();
  const intent = await provider.createPaymentIntent(input);
  const request = await provider.requestPayment(intent);

  return {
    readiness: provider.getReadiness(),
    request,
  };
}
