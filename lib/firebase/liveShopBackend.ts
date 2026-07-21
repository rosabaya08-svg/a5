import type { CartItemSnapshot, Company, DeliveryMethod, Product, ProductOption, QrPaymentSession, QrPickupLocation } from "@/types/commerce";

export type BackendResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      details?: unknown;
      httpStatus?: number;
    };

export type BackendOrder = {
  orderNo: string;
  qrSession: QrPaymentSession;
  customerName: string;
  customerPhoneMasked: string;
  createdAt: string;
  paidAt: string;
  status: "paid" | "ready_for_pickup";
};

type CreateQrSessionResponse = {
  ok: true;
  qrSessionId: string;
  shortCode: string;
  status: QrPaymentSession["status"];
  expiresAt: string;
  qrDisplayExpiresAt?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  scopeRepaired?: boolean;
  totalAmount: number;
  items?: CartItemSnapshot[];
  amountMismatch?: {
    clientAmount: number;
    serverAmount: number;
  } | null;
  paymentUrl: string;
  customerUrl: string;
  pickupLocation?: QrPickupLocation;
  source: "firebase_functions_qr_create";
  message: string;
};

type LookupQrSessionResponse = {
  ok: true;
  session: QrPaymentSession;
  source: "firebase_functions_qr_lookup";
};

type ApprovePaymentResponse = {
  ok: true;
  order: BackendOrder;
};

const backendTimeoutMs = 8000;
const defaultFunctionsProjectId = "a5-closed-mall";
const defaultFunctionsRegion = "asia-northeast3";

function inferFunctionsBaseUrl() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || defaultFunctionsProjectId;
  return `https://${defaultFunctionsRegion}-${projectId}.cloudfunctions.net`;
}

function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ??
    process.env.NEXT_PUBLIC_A5_BACKEND_URL ??
    ""
  ).replace(/\/$/, "");
}

function getFunctionsBaseUrl() {
  return (process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? inferFunctionsBaseUrl()).replace(/\/$/, "");
}

function firebaseFunctionPath(path: string) {
  if (path === "/qr/create") return "/qrCreate";
  if (path === "/qr/lookup") return "/qrLookup";
  if (path === "/guest-shop/claim") return "/guestShopClaim";
  if (path === "/guest-shop/lookup") return "/guestShopLookup";
  if (path === "/guest-shop/cart/save") return "/guestShopCartSave";
  if (path === "/guest-shop/cart/lookup") return "/guestShopCartLookup";
  if (path === "/guest-shop/products") return "/guestShopProducts";
  if (path === "/guest-shop/product-detail") return "/guestShopProductDetail";
  if (path === "/storefront/company-summaries") return "/storefrontCompanySummaries";
  if (path === "/guest-order/lookup") return "/guestOrderLookup";
  return "";
}

function isFirebaseFunctionsBaseUrl(url: string) {
  return /\.cloudfunctions\.net$/.test(url) || url.includes(".cloudfunctions.net/");
}

function resolveBackendUrl(path: string) {
  const baseUrl = getBackendBaseUrl();
  const functionPath = firebaseFunctionPath(path);

  if (baseUrl && functionPath && isFirebaseFunctionsBaseUrl(baseUrl)) {
    return `${baseUrl}${functionPath}`;
  }

  if (baseUrl) {
    return `${baseUrl}${path}`;
  }

  const functionsBaseUrl = getFunctionsBaseUrl();

  if (functionsBaseUrl && functionPath) {
    return `${functionsBaseUrl}${functionPath}`;
  }

  return "";
}

function asBackendErrorBody(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function parseBackendError(value: unknown, httpStatus: number) {
  const body = asBackendErrorBody(value);
  const nestedError = asBackendErrorBody(body.error);
  const code = readString(nestedError.code ?? body.code);
  const message =
    readString(nestedError.message ?? body.message ?? body.error) ||
    (Object.keys(nestedError).length ? "Firebase function returned an error." : `HTTP ${httpStatus}`);
  const details = nestedError.details ?? body.details;

  if (!details) {
    return {
      code,
      details,
      httpStatus,
      message: code ? `${code}: ${message}` : message,
    };
  }

  try {
    return {
      code,
      details,
      httpStatus,
      message: `${code ? `${code}: ` : ""}${message} (${JSON.stringify(details).slice(0, 240)})`,
    };
  } catch {
    return {
      code,
      details,
      httpStatus,
      message: code ? `${code}: ${message}` : message,
    };
  }
}

async function postBackend<T>(path: string, payload: Record<string, unknown>, options: { guestShopEntryToken?: string } = {}): Promise<BackendResult<T>> {
  const url = resolveBackendUrl(path);

  if (!url) {
    return { ok: false, error: "Backend URL missing" };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), backendTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Client": "tablet-storefront",
        ...(options.guestShopEntryToken ? { "X-A5-Guest-Shop-Token": options.guestShopEntryToken } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      const parsed = parseBackendError(data, response.status);
      return { ok: false, error: parsed.message, code: parsed.code, details: parsed.details, httpStatus: parsed.httpStatus };
    }

    return { ok: true, data: data as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Backend request failed",
      code: "BACKEND_REQUEST_FAILED",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function createBackendQrSession(input: {
  cartId: string;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  deliveryMethod: DeliveryMethod;
  items: CartItemSnapshot[];
  totalAmountHint: number;
  pickupLocation?: QrPickupLocation;
}) {
  const result = await postBackend<CreateQrSessionResponse>("/qr/create", {
    cartId: input.cartId,
    nurseryId: input.nurseryId,
    roomId: input.roomId,
    tabletId: input.tabletId,
    deliveryMethod: input.deliveryMethod,
    pickupLocation: input.pickupLocation,
    items: input.items,
    clientAmount: input.totalAmountHint,
  });

  if (!result.ok) return result;

  const now = new Date().toISOString();
  const serverItems = Array.isArray(result.data.items) && result.data.items.length > 0 ? result.data.items : input.items;
  const session: QrPaymentSession = {
    id: result.data.qrSessionId,
    shortCode: result.data.shortCode,
    type: "purchase",
    status: result.data.status,
    nurseryId: result.data.nurseryId || input.nurseryId,
    roomId: result.data.roomId || input.roomId,
    tabletId: result.data.tabletId || input.tabletId,
    cartId: input.cartId,
    createdAt: now,
    expiresAt: result.data.expiresAt,
    qrDisplayExpiresAt: result.data.qrDisplayExpiresAt,
    deliveryMethod: input.deliveryMethod,
    totalAmount: result.data.totalAmount,
    items: serverItems,
    pickupLocation: result.data.pickupLocation ?? input.pickupLocation,
  };

  return { ok: true as const, session, customerUrl: result.data.customerUrl, paymentUrl: result.data.paymentUrl };
}

export async function readBackendQrSessionByShortCode(shortCode: string) {
  const result = await postBackend<LookupQrSessionResponse>("/qr/lookup", { shortCode });
  return result.ok ? { ok: true as const, session: result.data.session } : result;
}

export async function claimBackendGuestShopSession(input: string | { shortCode?: string; qrSessionId?: string; source?: "checkout_more_products" | "payment_success_more_products" }) {
  const payload = typeof input === "string" ? { shortCode: input } : input;
  return postBackend<{
    ok: true;
    guestShopSessionId: string;
    entryToken: string;
    qrSessionId: string;
    shortCode: string;
    expiresAt: string;
    shopUrl: string;
  }>("/guest-shop/claim", payload);
}

export async function readBackendGuestShopSession(sessionId: string, entryToken?: string) {
  return postBackend<{
    ok: true;
    session: QrPaymentSession & {
      qrSessionId: string;
    };
  }>("/guest-shop/lookup", { sessionId }, { guestShopEntryToken: entryToken });
}

export async function saveBackendGuestShopCart(input: {
  sessionId: string;
  entryToken?: string;
  items: CartItemSnapshot[];
  clientAmount: number;
}) {
  return postBackend<{
    ok: true;
    guestShopSessionId: string;
    items: CartItemSnapshot[];
    totalAmount: number;
    updatedAt: string;
  }>("/guest-shop/cart/save", {
    sessionId: input.sessionId,
    items: input.items,
    clientAmount: input.clientAmount,
  }, { guestShopEntryToken: input.entryToken });
}

export async function readBackendGuestShopCart(sessionId: string, entryToken?: string) {
  return postBackend<{
    ok: true;
    guestShopSessionId: string;
    items: CartItemSnapshot[];
    totalAmount: number;
    updatedAt?: string;
  }>("/guest-shop/cart/lookup", { sessionId }, { guestShopEntryToken: entryToken });
}

export async function readBackendGuestShopProducts(sessionId: string, entryToken?: string) {
  return postBackend<{
    ok: true;
    products: Product[];
    source: string;
  }>("/guest-shop/products", { sessionId }, { guestShopEntryToken: entryToken });
}

export async function readBackendGuestShopProductDetail(input: {
  sessionId: string;
  entryToken?: string;
  productId: string;
}) {
  return postBackend<{
    ok: true;
    product: Product;
    options: ProductOption[];
    source: string;
  }>("/guest-shop/product-detail", input, { guestShopEntryToken: input.entryToken });
}

export async function readBackendCompanies(): Promise<BackendResult<{ companies: Company[]; source: "firestore_companies" }>> {
  const result = await postBackend<{
    ok: true;
    companies: Company[];
    source: "firestore_safe_company_summary";
  }>("/storefront/company-summaries", {});

  return result.ok
    ? { ok: true, data: { companies: result.data.companies, source: "firestore_companies" } }
    : result;
}

export async function approveBackendMockPayment(input: {
  shortCode: string;
  customerName: string;
  customerPhoneMasked: string;
}) {
  const result = await postBackend<ApprovePaymentResponse>("/payments/mock-approve", input);
  return result.ok ? { ok: true as const, order: result.data.order } : result;
}
