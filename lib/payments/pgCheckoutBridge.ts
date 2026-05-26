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
  scriptUrl: process.env.NEXT_PUBLIC_PG_SCRIPT_URL?.trim() ?? "",
  successUrl: process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL?.trim() ?? "",
  failUrl: process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL?.trim() ?? "",
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
    merchantId: "",
    orderNo: input.orderNo,
    orderName: input.orderName,
    amount: input.amount,
    currency: "KRW",
    customerName: input.customerName,
    customerPhoneMasked: input.customerPhoneMasked,
    qrSessionId: input.qrSessionId,
    successUrl: publicPgEnv.successUrl || `${origin}/q/${input.qrSessionId}/success`,
    failUrl: publicPgEnv.failUrl || `${origin}/q/${input.qrSessionId}/failed`,
    readyEndpoint: endpoints.endpoints.ready,
    confirmEndpoint: endpoints.endpoints.confirm,
  };
}

export function getPgBridgeStatus(): PgBridgeStatus {
  const endpoints = getPaymentEndpointReadiness();
  const missing = [
    !publicPgEnv.provider ? "NEXT_PUBLIC_PG_PROVIDER" : "",
    !publicPgEnv.clientKey ? "NEXT_PUBLIC_PG_CLIENT_KEY" : "",
    !publicPgEnv.successUrl ? "NEXT_PUBLIC_PAYMENT_SUCCESS_URL" : "",
    !publicPgEnv.failUrl ? "NEXT_PUBLIC_PAYMENT_FAIL_URL" : "",
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
      ? "PG 브라우저 모듈이 로드되었습니다. 실제 요청은 서버 승인 단계에서 계속 차단됩니다."
      : "PG 브라우저 모듈이 아직 로드되지 않았습니다. PG사 확정 후 공식 스크립트/모듈을 추가해야 합니다.",
  };
}

export async function requestPgModulePayment(payload: PgCheckoutPayload) {
  if (typeof window === "undefined" || typeof window.A5PgProvider?.requestPayment !== "function") {
    return {
      ok: false,
      status: "module_missing",
      message: "PG 브라우저 모듈이 로드되지 않았습니다. 현재 결제는 모의 흐름으로 유지해야 합니다.",
    };
  }

  return window.A5PgProvider.requestPayment(payload);
}
