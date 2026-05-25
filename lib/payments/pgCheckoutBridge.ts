import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";

export type PgCheckoutPayload = {
  provider: string;
  environment: "test" | "production";
  clientKey: string;
  channelKey: string;
  merchantId: string;
  orderNo: string;
  orderName: string;
  amount: number;
  currency: "KRW";
  customerName: string;
  customerPhoneMasked: string;
  qrSessionId: string;
  successUrl: string;
  failUrl: string;
  readyEndpoint: string;
  confirmEndpoint: string;
};

export type PgBridgeStatus = {
  configured: boolean;
  moduleLoaded: boolean;
  provider: string;
  missing: string[];
  scriptUrl: string;
  message: string;
};

export type PgBrowserProvider = {
  requestPayment: (payload: PgCheckoutPayload) => Promise<{ ok: boolean; message?: string; transactionId?: string }>;
};

declare global {
  interface Window {
    A5PgProvider?: PgBrowserProvider;
  }
}

const publicPgEnv = {
  provider: process.env.NEXT_PUBLIC_PG_PROVIDER?.trim() ?? "",
  environment: process.env.NEXT_PUBLIC_PG_ENVIRONMENT?.trim() || "test",
  clientKey: process.env.NEXT_PUBLIC_PG_CLIENT_KEY?.trim() ?? "",
  channelKey: process.env.NEXT_PUBLIC_PG_CHANNEL_KEY?.trim() ?? "",
  merchantId: process.env.NEXT_PUBLIC_PG_MERCHANT_ID?.trim() ?? "",
  scriptUrl: process.env.NEXT_PUBLIC_PG_SCRIPT_URL?.trim() ?? "",
};

export function buildPgCheckoutPayload(input: {
  orderNo: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerPhoneMasked: string;
  qrSessionId: string;
}): PgCheckoutPayload {
  const endpoints = getPaymentEndpointReadiness();
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return {
    provider: publicPgEnv.provider || "unselected",
    environment: publicPgEnv.environment === "production" ? "production" : "test",
    clientKey: publicPgEnv.clientKey,
    channelKey: publicPgEnv.channelKey,
    merchantId: publicPgEnv.merchantId,
    orderNo: input.orderNo,
    orderName: input.orderName,
    amount: input.amount,
    currency: "KRW",
    customerName: input.customerName,
    customerPhoneMasked: input.customerPhoneMasked,
    qrSessionId: input.qrSessionId,
    successUrl: `${origin}/q/${input.qrSessionId}/success`,
    failUrl: `${origin}/q/${input.qrSessionId}/failed`,
    readyEndpoint: endpoints.endpoints.ready,
    confirmEndpoint: endpoints.endpoints.confirm,
  };
}

export function getPgBridgeStatus(): PgBridgeStatus {
  const endpoints = getPaymentEndpointReadiness();
  const missing = [
    !publicPgEnv.provider ? "NEXT_PUBLIC_PG_PROVIDER" : "",
    !publicPgEnv.clientKey ? "NEXT_PUBLIC_PG_CLIENT_KEY" : "",
    !publicPgEnv.channelKey ? "NEXT_PUBLIC_PG_CHANNEL_KEY" : "",
    !publicPgEnv.merchantId ? "NEXT_PUBLIC_PG_MERCHANT_ID" : "",
    ...endpoints.missing,
  ].filter(Boolean);
  const moduleLoaded = typeof window !== "undefined" && typeof window.A5PgProvider?.requestPayment === "function";

  return {
    configured: missing.length === 0,
    moduleLoaded,
    provider: publicPgEnv.provider || "unselected",
    missing,
    scriptUrl: publicPgEnv.scriptUrl,
    message: moduleLoaded
      ? "PG browser module is loaded. Real request remains gated by server confirm."
      : "PG browser module is not loaded yet. Add the provider script/module after PG confirmation.",
  };
}

export async function requestPgModulePayment(payload: PgCheckoutPayload) {
  if (typeof window === "undefined" || typeof window.A5PgProvider?.requestPayment !== "function") {
    return {
      ok: false,
      status: "module_missing",
      message: "PG browser module is not loaded. Current checkout must stay on mock flow.",
    };
  }

  return window.A5PgProvider.requestPayment(payload);
}
