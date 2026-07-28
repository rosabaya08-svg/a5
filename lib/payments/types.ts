import type {
  PaymentCancellationInput,
  PaymentIntent,
  PaymentIntentInput,
  PaymentProviderCandidate,
  PaymentProviderId,
  PaymentRequestResult,
  PaymentWebhookEvent,
} from "@/types/payment";

export type ProviderReadiness = {
  provider: PaymentProviderId;
  candidate: PaymentProviderCandidate;
  ready: boolean;
  mode: "mock" | "keys_missing" | "contract_ready" | "blocked";
  label: string;
  missingKeys: string[];
  blockers: string[];
  publicKeys: readonly string[];
  serverKeys: readonly string[];
  handoff: string[];
};

export type PaymentProviderCapabilities = {
  createPaymentIntent: true;
  requestPayment: true;
  confirmPayment: true;
  handleWebhook: true;
  cancelPayment: true;
  refundPayment: true;
  realPgCallsEnabled: false;
};

export type PaymentProvider = {
  id: PaymentProviderId;
  candidate: PaymentProviderCandidate;
  displayName: string;
  capabilities: PaymentProviderCapabilities;
  getReadiness(): ProviderReadiness;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  requestPayment(intent: PaymentIntent): Promise<PaymentRequestResult>;
  confirmPayment(intent: PaymentIntent, providerPayload?: unknown): Promise<PaymentRequestResult>;
  handleWebhook(event: PaymentWebhookEvent): Promise<PaymentRequestResult>;
  cancelPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult>;
  refundPayment(input: PaymentCancellationInput): Promise<PaymentRequestResult>;
};
