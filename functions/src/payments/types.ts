export type Currency = "KRW";
export type PaymentProviderId = "mock" | "pg_contract" | "payup" | "infiny" | "toss" | "portone" | "kcp" | "nice";
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
  businessNo?: string;
  businessNoNormalized?: string;
  provider: PaymentProviderId;
  environment: "test" | "production";
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
  checkoutMode?: string;
  paymentMode?: string;
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
  sellerCompanyId?: string;
  sellerBusinessNo?: string;
  sellerBusinessNoNormalized?: string;
  sellerCompanyName?: string;
  shippingFeePolicy?: ShippingFeePolicy;
};

export type ShippingFeePolicy = {
  mode: "free" | "paid";
  baseFee: number;
  freeThreshold: number;
  remoteAreaEnabled: boolean;
  remoteAreaFee: number;
  islandAreaEnabled: boolean;
  islandAreaFee: number;
};

export type PaymentReadyRequest = {
  qrSessionId: string;
  guestShopSessionId?: string;
  guestShopEntryToken?: string;
  shortCode?: string;
  cartId?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  clientAmount?: number;
  currency?: Currency;
  deliveryMethod?: "pickup" | "delivery";
  receiverAddress?: string;
  receiverAddressDetail?: string;
  items: CartItemInput[];
};

export type PaymentReadyResponse = {
  ok: boolean;
  provider: PaymentProviderId;
  pgReady: boolean;
  checkoutWindowReady?: boolean;
  checkoutWindowBlockers?: string[];
  pgReadiness: PgServerReadinessSnapshot;
  paymentIntentId: string;
  orderNoCandidate: string;
  qrSessionId: string;
  recalculatedAmount: number;
  productSubtotalAmount?: number;
  shippingFee?: number;
  shippingBaseFee?: number;
  shippingRemoteAreaFee?: number;
  shippingAreaType?: "standard" | "remote" | "island";
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
  payupCard?: {
    cardNo?: string;
    expireMonth?: string;
    expireYear?: string;
    birthday?: string;
    cardPw?: string;
    quota?: string;
    userName?: string;
    mobileNumber?: string;
    userEmail?: string;
    kakaoSend?: "Y" | "N";
    taxFlag?: "Y" | "N";
    taxAmount?: string;
    freeAmount?: string;
    userId?: string;
  };
  customerName?: string;
  customerPhone?: string;
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
  orderLookupUrl?: string;
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
  commerceProgramId?: "a5s" | "a5ws" | "a5ls";
  pgOwnerCompanyId?: string;
  supplierBusinessId?: string;
  resellerBusinessId?: string;
  settlementRecipientBusinessId?: string;
  partnerPayoutUnitAmount?: number;
  grossMarginUnitAmount?: number;
  marginContractVersion?: string;
  status: string;
  inventory: number;
  reservedInventory: number;
  availableInventory: number;
  source: "firestore_products" | "mock_products";
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
  companyId?: string;
  paymentKey?: string;
  amount: number;
  reason: string;
  requestedBy: "SUPER_ADMIN" | "COMPANY_ADMIN" | "CUSTOMER_GUEST";
  items?: CartItemInput[];
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
  sellerBusinessNo?: string;
  sellerBusinessNoNormalized?: string;
  sellerCompanyName?: string;
  merchantId?: string;
  merchantSerialNo?: string;
  moduleKey?: string;
  terminalId?: string;
  merchantStatus?: CompanyMerchantProfile["merchantStatus"];
  status: "ready" | "ready_mock" | "sms_requesting" | "pending_payment_link" | "vbank_requesting" | "waiting_deposit" | "confirming" | "confirmed" | "confirmed_mock" | "failed" | "cancel_blocked";
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
  send?: (body: string) => void;
  setHeader?: (name: string, value: string) => void;
  redirect?: (status: number, url: string) => void;
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
      const sellerBusinessNo = optionalString(
        candidate.sellerBusinessNo ??
          (candidate as { seller_business_no?: unknown }).seller_business_no ??
          (candidate as { business_registration_number?: unknown }).business_registration_number ??
          (candidate as { company_business_no?: unknown }).company_business_no,
      );
      return {
        productId: String(candidate.productId ?? (candidate as { product_id?: unknown }).product_id ?? ""),
        optionId: optionalString(candidate.optionId ?? (candidate as { option_id?: unknown }).option_id),
        productName: String(candidate.productName ?? (candidate as { product_name?: unknown }).product_name ?? ""),
        optionName: String(candidate.optionName ?? (candidate as { option_name?: unknown }).option_name ?? "default"),
        unitPrice: Number(candidate.unitPrice ?? (candidate as { unit_price?: unknown }).unit_price ?? 0),
        quantity: Number(candidate.quantity ?? 0),
        companyId: String(candidate.companyId ?? (candidate as { company_id?: unknown }).company_id ?? ""),
        sellerCompanyId: optionalString(
          candidate.sellerCompanyId ??
            (candidate as { seller_company_id?: unknown }).seller_company_id ??
            (candidate as { pg_owner_company_id?: unknown }).pg_owner_company_id,
        ),
        sellerBusinessNo,
        sellerBusinessNoNormalized: normalizeBusinessNoValue(
          candidate.sellerBusinessNoNormalized ??
            (candidate as { seller_business_no_normalized?: unknown }).seller_business_no_normalized ??
            (candidate as { business_registration_number_normalized?: unknown }).business_registration_number_normalized ??
            (candidate as { company_business_no_normalized?: unknown }).company_business_no_normalized ??
            sellerBusinessNo,
        ),
        sellerCompanyName: optionalString(
          candidate.sellerCompanyName ??
            (candidate as { seller_company_name?: unknown }).seller_company_name ??
            (candidate as { company_name?: unknown }).company_name,
        ),
        shippingFeePolicy: normalizeShippingFeePolicyInput(
          candidate.shippingFeePolicy ?? (candidate as { shipping_fee_policy?: unknown }).shipping_fee_policy,
        ),
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

export function makeQrSessionId(shortCode: string): string {
  return `qr-${shortCode}`;
}

export function makeShortCode(prefix = "A5", now = new Date()): string {
  return `${prefix}${String(now.getTime()).slice(-6)}`;
}

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function normalizeBusinessNoValue(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/[^0-9]/g, "");
  return text ? text : undefined;
}

function normalizeShippingFeePolicyInput(value: unknown): ShippingFeePolicy | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const record = value as Record<string, unknown>;
  const mode = record.mode === "paid" ? "paid" : "free";

  return {
    mode,
    baseFee: numericPolicyValue(record.baseFee ?? record.base_fee),
    freeThreshold: numericPolicyValue(record.freeThreshold ?? record.free_threshold),
    remoteAreaEnabled: booleanPolicyValue(record.remoteAreaEnabled ?? record.remote_area_enabled, true),
    remoteAreaFee: numericPolicyValue(record.remoteAreaFee ?? record.remote_area_fee, 3000),
    islandAreaEnabled: booleanPolicyValue(record.islandAreaEnabled ?? record.island_area_enabled, true),
    islandAreaFee: numericPolicyValue(record.islandAreaFee ?? record.island_area_fee, 5000),
  };
}

function numericPolicyValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9]/g, "");
    if (normalized) return Math.max(0, Number(normalized));
  }
  return fallback;
}

function booleanPolicyValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}
