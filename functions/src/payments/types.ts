export type Currency = "KRW";
export type PaymentProviderId = "mock" | "pg_contract" | "infiny" | "toss" | "portone" | "kcp" | "nice";
export type PaymentServerMode = "mock_only" | "signature_skeleton_only" | "blocked";

export type PgServerReadinessSnapshot = {
  provider: string;
  environment: "test" | "production";
  readyForAdapter: boolean;
  missingKeys: string[];
  message: string;
};

export type CompanyMerchantProfile = {
  companyId: string;
  companyName: string;
  provider: PaymentProviderId;
  merchantId?: string;
  merchantIdMasked: string;
  merchantSerialNo?: string;
  merchantSerialNoMasked?: string;
  moduleKey?: string;
  moduleKeyMasked: string;
  terminalId?: string;
  terminalIdMasked?: string;
  secretKeyRef?: string;
  merchantPasswordRef?: string;
  signKeyRef?: string;
  webhookSecretRef?: string;
  merchantStatus: "not_applied" | "in_review" | "mid_issued" | "active" | "blocked";
  paymentReady: boolean;
};

export type PgClientRuntimeConfig = {
  provider: PaymentProviderId;
  environment: "test" | "production";
  clientKey?: string;
  channelKey?: string;
  scriptUrl?: string;
  globalName?: string;
  requestFunctionName?: string;
  successUrl?: string;
  failUrl?: string;
};

export type CartItemInput = {
  productId: string;
  optionId?: string;
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
  merchantProfile: CompanyMerchantProfile;
  pgClientConfig?: PgClientRuntimeConfig;
  expiresAt: string;
  firestoreTransactionPlan: string[];
  message: string;
};

export type PaymentConfirmRequest = PaymentReadyRequest & {
  paymentIntentId: string;
  orderNoCandidate?: string;
  mockApprovalRequested?: boolean;
  providerPaymentKey?: string;
  transactionId?: string;
  receiptUrl?: string;
  customerName?: string;
  customerPhoneMasked?: string;
  deliveryMethod?: "pickup" | "delivery";
  receiverAddress?: string;
  receiverAddressDetail?: string;
};

export type PgApproval = {
  provider: PaymentProviderId;
  status: "approved_mock" | "approved";
  mockTid: string;
  paymentKey?: string;
  transactionId?: string;
  receiptUrl?: string;
  realPgCalled?: boolean;
  approvedAt: string;
  message: string;
};

export type PaymentConfirmResponse = {
  ok: boolean;
  provider: PaymentProviderId;
  pgReady: boolean;
  pgReadiness: PgServerReadinessSnapshot;
  approval: PgApproval;
  orderNo: string;
  recalculatedAmount: number;
  merchantProfile?: CompanyMerchantProfile;
  firestoreTransactionPlan: string[];
  message: string;
};

export type PaymentWebhookRequest = {
  provider?: string;
  eventId?: string;
  eventType?: string;
  orderNo?: string;
  paymentIntentId?: string;
  paymentKey?: string;
  transactionId?: string;
  amount?: number;
  status?: string;
};

export type ServerPricedItem = CartItemInput & {
  status: string;
  inventory: number;
  reservedInventory: number;
  availableInventory: number;
  source: "firestore_products";
};

export type OrderCreateRequest = PaymentReadyRequest & {
  payerName?: string;
  payerPhoneMasked?: string;
  deliveryMethod?: "pickup" | "delivery";
};

export type QrCreateRequest = {
  cartId?: string;
  shortCode?: string;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  deliveryMethod?: "pickup" | "delivery";
  pickupLocation?: {
    nurseryName?: string;
    nurseryAddress?: string;
    roomId?: string;
    roomName?: string;
  };
  expiresInMinutes?: number;
  clientAmount?: number;
  currency?: Currency;
  items: CartItemInput[];
};

export type QrExpireRequest = {
  qrSessionId: string;
  reason?: string;
};

export type InventoryRequest = {
  reservationId?: string;
  qrSessionId?: string;
  orderNo?: string;
  paymentIntentId?: string;
  reason?: string;
  items: CartItemInput[];
};

export type PaymentCancelRequest = {
  orderNo: string;
  paymentKey?: string;
  amount: number;
  reason: string;
  requestedBy: "SUPER_ADMIN" | "COMPANY_ADMIN" | "CUSTOMER_GUEST";
};

export type PaymentStatusResponse = {
  ok: boolean;
  source: "firebase_functions";
  paymentIntentId?: string;
  orderNo?: string;
  status?: string;
  amount?: number;
  currency?: Currency;
  provider?: PaymentProviderId;
  message: string;
};

export type ServerPaymentIntent = {
  id: string;
  qrSessionId: string;
  orderNoCandidate: string;
  amount: number;
  currency: Currency;
  provider: PaymentProviderId;
  companyId: string;
  merchantId?: string;
  merchantSerialNo?: string;
  moduleKey?: string;
  terminalId?: string;
  merchantStatus?: CompanyMerchantProfile["merchantStatus"];
  status: "ready" | "ready_mock" | "confirming" | "confirmed" | "confirmed_mock" | "failed" | "cancel_blocked";
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
  query?: Record<string, unknown>;
  get?: (name: string) => string | undefined;
  rawBody?: Buffer | string;
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
        productId: String(candidate.productId ?? (candidate as { product_id?: unknown }).product_id ?? ""),
        optionId: optionalString(candidate.optionId ?? (candidate as { option_id?: unknown }).option_id),
        productName: String(candidate.productName ?? (candidate as { product_name?: unknown }).product_name ?? ""),
        optionName: String(candidate.optionName ?? (candidate as { option_name?: unknown }).option_name ?? "default"),
        unitPrice: Number(candidate.unitPrice ?? (candidate as { unit_price?: unknown }).unit_price ?? 0),
        quantity: Number(candidate.quantity ?? 0),
        companyId: String(candidate.companyId ?? (candidate as { company_id?: unknown }).company_id ?? ""),
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

export function makeQrSessionId(shortCode: string, now = new Date()): string {
  return `qr_${shortCode}_${now.getTime()}`;
}

export function makeShortCode(prefix = "A5", now = new Date()): string {
  return `${prefix}${String(now.getTime()).slice(-6)}`;
}

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}
