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
  returnCode: string;
  successUrl: string;
  failUrl: string;
  readyEndpoint: string;
  confirmEndpoint: string;
};

export type PgRuntimeOverride = {
  provider?: string;
  environment?: "test" | "production";
  clientKey?: string;
  channelKey?: string;
  scriptUrl?: string;
  globalName?: string;
  requestFunctionName?: string;
  requestMethod?: string;
  successUrl?: string;
  failUrl?: string;
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
  requestPayment: (payload: PgCheckoutPayload) => Promise<PgModulePaymentResult>;
};

export type PgModulePaymentResult = {
  ok: boolean;
  status?: string;
  message?: string;
  paymentKey?: string;
  transactionId?: string;
  receiptUrl?: string;
};

declare global {
  interface Window {
    A5PgProvider?: PgBrowserProvider;
    [key: string]: unknown;
  }
}

const publicPgEnv = {
  provider: process.env.NEXT_PUBLIC_PG_PROVIDER?.trim() ?? "",
  environment: process.env.NEXT_PUBLIC_PG_ENVIRONMENT?.trim() || "test",
  clientKey: process.env.NEXT_PUBLIC_PG_CLIENT_KEY?.trim() ?? "",
  channelKey: process.env.NEXT_PUBLIC_PG_CHANNEL_KEY?.trim() ?? "",
  merchantId: process.env.NEXT_PUBLIC_PG_MERCHANT_ID?.trim() ?? "",
  scriptUrl: process.env.NEXT_PUBLIC_PG_SCRIPT_URL?.trim() ?? "",
  globalName: process.env.NEXT_PUBLIC_PG_GLOBAL_NAME?.trim() ?? "",
  requestMethod: process.env.NEXT_PUBLIC_PG_REQUEST_METHOD?.trim() || process.env.NEXT_PUBLIC_PG_REQUEST_FUNCTION?.trim() || "",
  successUrl: process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL?.trim() ?? "",
  failUrl: process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL?.trim() ?? "",
};

let pgScriptPromise: { scriptUrl: string; promise: Promise<void> } | undefined;

function resolvePgEnv(runtimeConfig?: PgRuntimeOverride) {
  return {
    provider: runtimeConfig?.provider?.trim() || publicPgEnv.provider,
    environment: runtimeConfig?.environment || publicPgEnv.environment,
    clientKey: runtimeConfig?.clientKey?.trim() || publicPgEnv.clientKey,
    channelKey: runtimeConfig?.channelKey?.trim() || publicPgEnv.channelKey,
    merchantId: publicPgEnv.merchantId,
    scriptUrl: runtimeConfig?.scriptUrl?.trim() || publicPgEnv.scriptUrl,
    globalName: runtimeConfig?.globalName?.trim() || publicPgEnv.globalName,
    requestMethod: runtimeConfig?.requestFunctionName?.trim() || runtimeConfig?.requestMethod?.trim() || publicPgEnv.requestMethod,
    successUrl: runtimeConfig?.successUrl?.trim() || publicPgEnv.successUrl,
    failUrl: runtimeConfig?.failUrl?.trim() || publicPgEnv.failUrl,
  };
}

export function buildPgCheckoutPayload(input: {
  orderNo: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerPhoneMasked: string;
  qrSessionId: string;
  returnCode?: string;
  merchantId?: string;
  moduleKey?: string;
  runtimeConfig?: PgRuntimeOverride;
}): PgCheckoutPayload {
  const endpoints = getPaymentEndpointReadiness();
  const pgEnv = resolvePgEnv(input.runtimeConfig);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const returnCode = input.returnCode || input.qrSessionId;
  const successUrl = pgEnv.successUrl || `${origin}/q/${returnCode}/success`;
  const failUrl = pgEnv.failUrl || `${origin}/q/${returnCode}/failed`;

  return {
    provider: pgEnv.provider || "unselected",
    environment: pgEnv.environment === "production" ? "production" : "test",
    clientKey: pgEnv.clientKey,
    channelKey: input.moduleKey || pgEnv.channelKey,
    merchantId: input.merchantId || pgEnv.merchantId,
    orderNo: input.orderNo,
    orderName: input.orderName,
    amount: input.amount,
    currency: "KRW",
    customerName: input.customerName,
    customerPhoneMasked: input.customerPhoneMasked,
    qrSessionId: input.qrSessionId,
    returnCode,
    successUrl: applyReturnUrlTemplate(successUrl, { ...input, returnCode }),
    failUrl: applyReturnUrlTemplate(failUrl, { ...input, returnCode }),
    readyEndpoint: endpoints.endpoints.ready,
    confirmEndpoint: endpoints.endpoints.confirm,
  };
}

export function getPgBridgeStatus(runtimeConfig?: PgRuntimeOverride): PgBridgeStatus {
  const endpoints = getPaymentEndpointReadiness();
  const pgEnv = resolvePgEnv(runtimeConfig);
  const missing = [
    !pgEnv.provider ? "NEXT_PUBLIC_PG_PROVIDER or Firestore pg_provider_settings.provider" : "",
    !pgEnv.clientKey ? "NEXT_PUBLIC_PG_CLIENT_KEY or Firestore pg_provider_settings.public_client_key" : "",
    !pgEnv.scriptUrl ? "NEXT_PUBLIC_PG_SCRIPT_URL or Firestore pg_provider_settings.script_url" : "",
    !pgEnv.successUrl ? "NEXT_PUBLIC_PAYMENT_SUCCESS_URL or Firestore pg_provider_settings.success_url" : "",
    !pgEnv.failUrl ? "NEXT_PUBLIC_PAYMENT_FAIL_URL or Firestore pg_provider_settings.fail_url" : "",
    ...endpoints.missing,
  ].filter(Boolean);
  const moduleLoaded = typeof window !== "undefined" && Boolean(resolveBrowserProvider(pgEnv));

  return {
    configured: missing.length === 0,
    moduleLoaded,
    provider: pgEnv.provider || "unselected",
    missing,
    scriptUrl: pgEnv.scriptUrl,
    message: moduleLoaded
      ? "PG 브라우저 모듈이 로드되었습니다. 실제 요청은 서버 승인 단계에서 계속 차단됩니다."
      : "PG 브라우저 모듈이 아직 로드되지 않았습니다. PG사 확정 후 공식 스크립트/모듈을 추가해야 합니다.",
  };
}

export async function requestPgModulePayment(payload: PgCheckoutPayload, runtimeConfig?: PgRuntimeOverride): Promise<PgModulePaymentResult> {
  const pgEnv = resolvePgEnv(runtimeConfig);
  const loadResult = await loadPgBrowserModule(runtimeConfig);
  if (!loadResult.ok) return loadResult;

  const provider = resolveBrowserProvider(pgEnv);

  if (!provider) {
    return {
      ok: false,
      status: "module_missing",
      message: "PG 브라우저 모듈은 로드되었지만 결제 호출 함수를 찾지 못했습니다. 관리자 PG 설정의 호출 함수명을 확인해 주세요.",
    };
  }

  try {
    return normalizeModuleResult(await provider.requestPayment(payload));
  } catch (error) {
    return {
      ok: false,
      status: "module_request_failed",
      message: error instanceof Error ? error.message : "PG 결제창 호출에 실패했습니다.",
    };
  }
}

function resolveBrowserProvider(pgEnv = resolvePgEnv()): PgBrowserProvider | undefined {
  if (typeof window === "undefined") return undefined;
  if (typeof window.A5PgProvider?.requestPayment === "function") return window.A5PgProvider;

  const functionPaths = [
    pgEnv.requestMethod,
    pgEnv.globalName && pgEnv.requestMethod ? `${pgEnv.globalName}.${pgEnv.requestMethod}` : "",
    pgEnv.globalName ? `${pgEnv.globalName}.requestPayment` : "",
    "INNOPAY.requestPayment",
    "INNOPAY.pay",
    "Innopay.requestPayment",
    "INFINY.requestPayment",
    "infiny.requestPayment",
    "requestPayment",
  ].filter(Boolean);

  for (const path of functionPaths) {
    const resolved = resolveFunctionPath(window, path);
    if (resolved) {
      return {
        requestPayment: (payload) => Promise.resolve(resolved.fn.call(resolved.owner, payload) as ReturnType<PgBrowserProvider["requestPayment"]>),
      };
    }
  }

  return undefined;
}

export async function loadPgBrowserModule(runtimeConfig?: PgRuntimeOverride): Promise<PgModulePaymentResult> {
  const pgEnv = resolvePgEnv(runtimeConfig);

  if (typeof window === "undefined" || resolveBrowserProvider(pgEnv)) {
    return { ok: true, status: "module_loaded", message: "PG 브라우저 모듈이 준비되었습니다." };
  }

  if (!pgEnv.scriptUrl) {
    return { ok: false, status: "script_url_missing", message: "PG 스크립트 URL이 설정되지 않았습니다." };
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[data-a5-pg-script="${pgEnv.provider || "pg"}"]`);
  if (existing?.dataset.loaded === "true") {
    return resolveBrowserProvider(pgEnv)
      ? { ok: true, status: "module_loaded", message: "PG 브라우저 모듈이 준비되었습니다." }
      : { ok: false, status: "request_function_missing", message: "PG 스크립트는 로드되었지만 결제 호출 함수를 찾지 못했습니다." };
  }

  if (pgScriptPromise?.scriptUrl !== pgEnv.scriptUrl) pgScriptPromise = undefined;

  pgScriptPromise ??= {
    scriptUrl: pgEnv.scriptUrl,
    promise: new Promise<void>((resolve, reject) => {
      const script = existing ?? document.createElement("script");
      script.src = pgEnv.scriptUrl;
      script.async = true;
      script.dataset.a5PgScript = pgEnv.provider || "pg";
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error("PG browser script failed to load."));

      if (!existing) document.head.appendChild(script);
    }),
  };

  try {
    await pgScriptPromise.promise;
  } catch (error) {
    return {
      ok: false,
      status: "script_load_failed",
      message: error instanceof Error ? error.message : "PG 브라우저 스크립트 로드에 실패했습니다.",
    };
  }

  return resolveBrowserProvider(pgEnv)
    ? { ok: true, status: "module_loaded", message: "PG 브라우저 모듈이 준비되었습니다." }
    : { ok: false, status: "request_function_missing", message: "PG 스크립트는 로드되었지만 결제 호출 함수를 찾지 못했습니다." };
}

function resolveFunctionPath(root: Window, path: string): { owner: unknown; fn: (...args: unknown[]) => unknown } | undefined {
  const parts = path.split(".").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return undefined;

  let owner: unknown = root;
  let current: unknown = root;

  for (const part of parts) {
    owner = current;
    current = (current as Record<string, unknown> | undefined)?.[part];
  }

  return typeof current === "function" ? { owner, fn: current as (...args: unknown[]) => unknown } : undefined;
}

function normalizeModuleResult(value: unknown): PgModulePaymentResult {
  if (typeof value !== "object" || value === null) {
    return { ok: true, status: "requested", message: "PG 결제창 요청이 전달되었습니다." };
  }

  const data = value as Record<string, unknown>;
  const ok = data.ok !== false && data.success !== false && data.status !== "failed";

  return {
    ok,
    status: String(data.status ?? (ok ? "requested" : "failed")),
    message: typeof data.message === "string" ? data.message : ok ? "PG 결제창 요청이 전달되었습니다." : "PG 결제창 요청에 실패했습니다.",
    paymentKey: readString(data.paymentKey ?? data.payment_key ?? data.payToken),
    transactionId: readString(data.transactionId ?? data.transaction_id ?? data.tid ?? data.TID),
    receiptUrl: readString(data.receiptUrl ?? data.receipt_url),
  };
}

function applyReturnUrlTemplate(url: string, input: { qrSessionId: string; returnCode: string; orderNo: string }) {
  return url
    .replaceAll("{shortCode}", encodeURIComponent(input.returnCode))
    .replaceAll("{qrSessionId}", encodeURIComponent(input.qrSessionId))
    .replaceAll("{orderNo}", encodeURIComponent(input.orderNo));
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
