"use client";

import { getFirebaseAppCheckToken } from "@/lib/firebase/appCheckClient";

export type PayupOrderResponse = {
  ok: true;
  provider: "payup";
  paymentSessionId: string;
  orderNumber: string;
  amount: number;
  userAgent: "WM" | "WP";
  formAction: string;
  pcScriptUrl: string;
  fields: Record<string, string>;
  clientToken: string;
};

export type PayupApprovalResponse = {
  ok: true;
  provider: "payup";
  paymentSessionId?: string;
  orderNumber: string;
  transactionId: string;
  amount: number;
  duplicate: boolean;
};

export type PayupStatusResponse = {
  ok: true;
  paymentSessionId: string;
  status: string;
  orderNumber?: string;
  transactionIdMasked?: string;
  amount: number;
  updatedAt?: string;
};

export type PayupQrCreateResponse = {
  ok: true;
  provider: "payup";
  qrSessionId: string;
  shortCode: string;
  status: "active";
  totalAmount: number;
  expiresAt: string;
  itemCount: number;
  subMerchantCount: number;
  customerPath: string;
  session: import("@/types/commerce").QrPaymentSession;
};

type ErrorBody = {
  message?: string;
  error?: string | { code?: string; message?: string };
};

function functionsBaseUrl() {
  return (process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ?? "").replace(/\/$/, "");
}

async function optionalFirebaseToken() {
  try {
    const { getFirebaseAuthClient } = await import("@/lib/firebase/client");
    return (await getFirebaseAuthClient()?.currentUser?.getIdToken()) ?? "";
  } catch {
    return "";
  }
}

async function postPublic<T>(functionName: string, payload: Record<string, unknown>, options: { includeAuth?: boolean } = {}): Promise<T> {
  const baseUrl = functionsBaseUrl();
  if (!baseUrl) throw new Error("PayUp 결제 서버 주소가 설정되지 않았습니다.");
  const [token, appCheckToken] = await Promise.all([
    options.includeAuth ? optionalFirebaseToken() : Promise.resolve(""),
    getFirebaseAppCheckToken(),
  ]);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${baseUrl}/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await response.json()) as T & ErrorBody;
    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : body.error?.message ?? body.message ?? `HTTP ${response.status}`;
      throw new Error(message);
    }
    return body;
  } finally {
    window.clearTimeout(timer);
  }
}

export function requestPayupOrder(payload: {
  shortCode: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  receiver: {
    deliveryMethod: "pickup" | "delivery";
    address: string;
    addressDetail: string;
  };
  userAgent: "WM" | "WP";
}) {
  return postPublic<PayupOrderResponse>("payupPaymentOrder", payload);
}

export function approvePayupPayment(payload: { paymentSessionId: string; clientToken: string; authData: Record<string, string> }) {
  return postPublic<PayupApprovalResponse>("payupPaymentApprove", payload);
}

export function abortPayupPayment(payload: { paymentSessionId: string; clientToken: string; reason: string }) {
  return postPublic<{ ok: true; paymentSessionId: string; status: string }>("payupPaymentAbort", payload);
}

export function readPayupPaymentStatus(payload: { paymentSessionId?: string; clientToken?: string; shortCode?: string }) {
  return postPublic<PayupStatusResponse>("payupPaymentStatus", payload);
}

export function createPayupQrSession(payload: {
  cartId: string;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  deliveryMethod: "pickup" | "delivery";
  pickupLocation?: Record<string, unknown>;
  items: import("@/types/commerce").CartItemSnapshot[];
  clientAmount: number;
}) {
  return postPublic<PayupQrCreateResponse>("payupQrCreate", payload, { includeAuth: true });
}
