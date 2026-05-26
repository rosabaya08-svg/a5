import type {
  PaymentCancellationInput,
  PaymentIntent,
  PaymentIntentInput,
  PaymentRequestResult,
  PaymentWebhookEvent,
} from "@/types/payment";
import type { PaymentProvider, ProviderReadiness } from "@/lib/payments/types";
import { mockPaymentProvider } from "@/lib/payments/providers/mockPaymentProvider";
import { pgProviderSkeleton } from "@/lib/payments/providers/pgProviderSkeleton";
import { getPaymentConfigSummary } from "@/lib/payments/paymentConfig";

export function getActivePaymentProvider(): PaymentProvider {
  const summary = getPaymentConfigSummary();
  return summary.candidate === "mock" ? mockPaymentProvider : pgProviderSkeleton;
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

export async function createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
  return getActivePaymentProvider().createPaymentIntent(input);
}

export async function requestPayment(intent: PaymentIntent): Promise<PaymentRequestResult> {
  return getActivePaymentProvider().requestPayment(intent);
}

export async function confirmPayment(intent: PaymentIntent, providerPayload?: unknown): Promise<PaymentRequestResult> {
  return getActivePaymentProvider().confirmPayment(intent, providerPayload);
}

export async function handleWebhook(event: PaymentWebhookEvent): Promise<PaymentRequestResult> {
  return getActivePaymentProvider().handleWebhook(event);
}

export async function cancelPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
  return getActivePaymentProvider().cancelPayment(input);
}

export async function refundPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult> {
  return getActivePaymentProvider().refundPayment(input);
}
