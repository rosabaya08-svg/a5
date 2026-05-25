import type {
  PaymentCancellationInput,
  PaymentIntent,
  PaymentIntentInput,
  PaymentProviderId,
  PaymentRequestResult,
  PaymentWebhookEvent,
} from "@/types/payment";

export type ProviderReadiness = {
  provider: PaymentProviderId;
  ready: boolean;
  mode: "mock" | "keys_missing" | "contract_ready" | "blocked";
  label: string;
  missingKeys: string[];
  blockers: string[];
};

export type PaymentProvider = {
  id: PaymentProviderId;
  displayName: string;
  getReadiness(): ProviderReadiness;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  requestPayment(intent: PaymentIntent): Promise<PaymentRequestResult>;
  confirmPayment(intent: PaymentIntent, providerPayload?: unknown): Promise<PaymentRequestResult>;
  handleWebhook(event: PaymentWebhookEvent): Promise<PaymentRequestResult>;
  cancelPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult>;
  refundPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult>;
};
