export type Currency = "KRW";
export type PaymentProviderId = "mock" | "pg_contract";
export type PaymentServerMode = "mock_only" | "signature_skeleton_only" | "blocked";

export type PgServerReadinessSnapshot = {
  provider: string;
  environment: "test" | "production";
  readyForAdapter: boolean;
  missingKeys: string[];
  message: string;
};

export type CartItemInput = {
  productId: string;
  productName: string;
  optionName: string;
  unitPrice: number;
  quantity: number;
  companyId: string;
};

export type PaymentReadyRequest = {
  qrSessionId: string;
  shortCode?: string;
  cartId?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  clientAmount?: number;
  currency?: Currency;
  items: CartItemInput[];
};

export type PaymentReadyResponse = {
  ok: boolean;
  provider: PaymentProviderId;
  pgReady: boolean;
  pgReadiness: PgServerReadinessSnapshot;
  paymentIntentId: string;
  orderNoCandidate: string;
  qrSessionId: string;
  recalculatedAmount: number;
  currency: Currency;
  expiresAt: string;
  firestoreTransactionPlan: string[];
  message: string;
};

export type PaymentConfirmRequest = PaymentReadyRequest & {
  paymentIntentId: string;
  orderNoCandidate?: string;
  mockApprovalRequested?: boolean;
};

export type MockPgApproval = {
  provider: PaymentProviderId;
  status: "approved_mock";
  mockTid: string;
  approvedAt: string;
  message: string;
};

export type PaymentConfirmResponse = {
  ok: boolean;
  provider: PaymentProviderId;
  pgReady: boolean;
  pgReadiness: PgServerReadinessSnapshot;
  approval: MockPgApproval;
  orderNo: string;
  recalculatedAmount: number;
  firestoreTransactionPlan: string[];
  message: string;
};

export type PaymentWebhookRequest = {
  provider?: string;
  eventId?: string;
  eventType?: string;
  orderNo?: string;
  paymentKey?: string;
  transactionId?: string;
  amount?: number;
};

export type PaymentCancelRequest = {
  orderNo: string;
  paymentKey?: string;
  amount: number;
  reason: string;
  requestedBy: "SUPER_ADMIN" | "COMPANY_ADMIN" | "CUSTOMER_GUEST";
};

export type ServerPaymentIntent = {
  id: string;
  qrSessionId: string;
  orderNoCandidate: string;
  amount: number;
  currency: Currency;
  provider: PaymentProviderId;
  status: "ready_mock" | "confirmed_mock" | "cancel_blocked";
  createdAt: string;
  expiresAt: string;
};

export type PaymentServerError = {
  code: string;
  message: string;
  httpStatus: number;
  details?: unknown;
};

export type HttpRequestLike = {
  method?: string;
  body?: unknown;
  get?: (name: string) => string | undefined;
};

export type HttpResponseLike = {
  status: (code: number) => HttpResponseLike;
  json: (body: unknown) => void;
};

export function readObjectBody<T extends object>(request: HttpRequestLike): Partial<T> {
  return typeof request.body === "object" && request.body !== null ? (request.body as Partial<T>) : {};
}

export function sendJson(response: HttpResponseLike, status: number, body: unknown): void {
  response.status(status).json(body);
}

export function requirePost(request: HttpRequestLike, response: HttpResponseLike): boolean {
  if (request.method === "POST") return true;

  sendJson(response, 405, {
    ok: false,
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST for payment server functions.",
      httpStatus: 405,
    } satisfies PaymentServerError,
  });
  return false;
}

export function normalizeCartItems(value: unknown): CartItemInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const candidate = typeof item === "object" && item !== null ? (item as Partial<CartItemInput>) : {};
      return {
        productId: String(candidate.productId ?? ""),
        productName: String(candidate.productName ?? ""),
        optionName: String(candidate.optionName ?? "default"),
        unitPrice: Number(candidate.unitPrice ?? 0),
        quantity: Number(candidate.quantity ?? 0),
        companyId: String(candidate.companyId ?? ""),
      };
    })
    .filter((item) => item.productId && item.productName && item.unitPrice >= 0 && item.quantity > 0);
}

export function calculateItemsAmount(items: CartItemInput[]): number {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function makeOrderNo(now = new Date()): string {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `A5-${ymd}-${String(now.getTime()).slice(-5)}`;
}

export function makePaymentIntentId(qrSessionId: string, now = new Date()): string {
  return `pi_${qrSessionId}_${now.getTime()}`;
}
