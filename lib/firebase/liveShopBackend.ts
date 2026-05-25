import type { CartItemSnapshot, DeliveryMethod, QrPaymentSession } from "@/types/commerce";

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
  session: QrPaymentSession;
};

type ApprovePaymentResponse = {
  ok: true;
  order: BackendOrder;
};

const backendTimeoutMs = 8000;

function getBackendBaseUrl() {
  return (process.env.NEXT_PUBLIC_A5_BACKEND_URL ?? "").replace(/\/$/, "");
}

async function postBackend<T>(path: string, payload: Record<string, unknown>): Promise<BackendResult<T>> {
  const baseUrl = getBackendBaseUrl();

  if (!baseUrl) {
    return { ok: false, error: "Backend URL missing" };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), backendTimeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
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
}) {
  const result = await postBackend<CreateQrSessionResponse>("/qr-sessions", input);
  return result.ok ? { ok: true as const, session: result.data.session } : result;
}

export async function approveBackendMockPayment(input: {
  shortCode: string;
  customerName: string;
  customerPhoneMasked: string;
}) {
  const result = await postBackend<ApprovePaymentResponse>("/payments/mock-approve", input);
  return result.ok ? { ok: true as const, order: result.data.order } : result;
}
