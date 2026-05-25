export type PaymentProviderId = "mock" | "pg_skeleton";

export type PaymentEnvironment = "test" | "production";

export type PaymentIntentStatus =
  | "draft"
  | "ready"
  | "requested"
  | "approved_mock"
  | "approved"
  | "failed"
  | "cancel_requested"
  | "cancelled_mock"
  | "cancelled"
  | "refund_blocked";

export type PaymentIntentInput = {
  orderNo: string;
  qrSessionId: string;
  amount: number;
  currency: "KRW";
  orderName: string;
  customerName: string;
  customerPhoneMasked: string;
  successUrl?: string;
  failUrl?: string;
};

export type PaymentIntent = PaymentIntentInput & {
  id: string;
  provider: PaymentProviderId;
  status: PaymentIntentStatus;
  createdAt: string;
  expiresAt?: string;
  serverRecalculationRequired: true;
  message: string;
};

export type PaymentRequestResult = {
  ok: boolean;
  provider: PaymentProviderId;
  status: PaymentIntentStatus;
  paymentKey?: string;
  transactionId?: string;
  redirectUrl?: string;
  message: string;
};

export type PaymentWebhookEvent = {
  provider: PaymentProviderId;
  eventId: string;
  eventType: string;
  orderNo: string;
  paymentKey?: string;
  transactionId?: string;
  amount: number;
  receivedAt: string;
  rawPayloadBlocked: true;
};

export type PaymentCancellationInput = {
  orderNo: string;
  paymentKey?: string;
  amount: number;
  reason: string;
  requestedBy: "SUPER_ADMIN" | "COMPANY_ADMIN" | "CUSTOMER_GUEST";
};
