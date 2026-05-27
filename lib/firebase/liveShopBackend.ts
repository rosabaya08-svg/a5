import type { CartItemSnapshot, DeliveryMethod, QrPaymentSession, QrPickupLocation } from "@/types/commerce";

export type BackendResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
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
  totalAmount: number;
  paymentUrl: string;
  customerUrl: string;
  pickupLocation?: QrPickupLocation;
  source: "firebase_functions_qr_create";
  message: string;
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

async function postBackend<T>(path: string, payload: Record<string, unknown>): Promise<BackendResult<T>> {
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
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = (await response.json()) as T & { error?: string; message?: string };

    if (!response.ok) {
      return { ok: false, error: data.message ?? data.error ?? `HTTP ${response.status}` };
    }

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Backend request failed" };
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
  const session: QrPaymentSession = {
    id: result.data.qrSessionId,
    shortCode: result.data.shortCode,
    type: "purchase",
    status: result.data.status,
    nurseryId: input.nurseryId,
    roomId: input.roomId,
    tabletId: input.tabletId,
    cartId: input.cartId,
    createdAt: now,
    expiresAt: result.data.expiresAt,
    deliveryMethod: input.deliveryMethod,
    totalAmount: result.data.totalAmount,
    items: input.items,
    pickupLocation: result.data.pickupLocation ?? input.pickupLocation,
  };

  return { ok: true as const, session, customerUrl: result.data.customerUrl, paymentUrl: result.data.paymentUrl };
}

export async function approveBackendMockPayment(input: {
  shortCode: string;
  customerName: string;
  customerPhoneMasked: string;
}) {
  const result = await postBackend<ApprovePaymentResponse>("/payments/mock-approve", input);
  return result.ok ? { ok: true as const, order: result.data.order } : result;
}
