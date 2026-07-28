import { createHash } from "crypto";

export type PayupEnvironment = "test" | "production";

export type PayupCardInput = {
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

export type PayupApprovalInput = {
  merchantId: string;
  environment?: PayupEnvironment;
  apiCertKey: string;
  orderNumber: string;
  amount: number;
  itemName: string;
  userName: string;
  card: PayupCardInput;
};

export type PayupStandardApprovalInput = {
  merchantId: string;
  environment?: PayupEnvironment;
  apiKey: string;
  transactionId: string;
  orderNumber: string;
  amount: number;
};

export type PayupCancelInput = {
  merchantId: string;
  environment?: PayupEnvironment;
  apiKey?: string;
  apiCertKey?: string;
  transactionId: string;
  cancelReason?: string;
  cancelAmount?: number;
  partial?: boolean;
};

export type PayupApiResult = {
  ok: boolean;
  code: string;
  message: string;
  transactionId?: string;
  paymentKey?: string;
  receiptUrl?: string;
  amount?: number;
  rawMasked: Record<string, unknown>;
};

type PayupTokenResult = {
  ok: boolean;
  code: string;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  rawMasked: Record<string, unknown>;
};

const payupTestBaseUrl = "https://standard.testpayup.co.kr";
const payupProductionBaseUrl = "https://standard.payup.co.kr";
const payupLegacyKeyinTestBaseUrl = "https://api.testpayup.co.kr";
const payupLegacyKeyinProductionBaseUrl = "https://api.payup.co.kr";
const tokenRefreshSkewMs = 60 * 1000;
const tokenCache = new Map<string, { accessToken: string; refreshToken?: string; expiresAt: number }>();

export function readPayupApiBaseUrl(environment?: PayupEnvironment): string {
  if (environment) return environment === "production" ? payupProductionBaseUrl : payupTestBaseUrl;
  const explicit = readEnv("PAYUP_API_BASE_URL") || readEnv("PG_API_BASE_URL");
  if (explicit) return trimSlash(explicit);
  return readPayupEnvironment() === "production" ? payupProductionBaseUrl : payupTestBaseUrl;
}

function readPayupLegacyKeyinApiBaseUrl(environment?: PayupEnvironment): string {
  if (environment) return environment === "production" ? payupLegacyKeyinProductionBaseUrl : payupLegacyKeyinTestBaseUrl;
  const explicit = readEnv("PAYUP_KEYIN_API_BASE_URL");
  if (explicit) return trimSlash(explicit);
  return readPayupEnvironment() === "production" ? payupLegacyKeyinProductionBaseUrl : payupLegacyKeyinTestBaseUrl;
}

function readPayupEnvironment(): PayupEnvironment {
  return readEnv("PAYUP_ENVIRONMENT") === "production" || readEnv("PG_ENVIRONMENT") === "production"
    ? "production"
    : "test";
}

export function buildPayupApprovalSignature(input: {
  merchantId: string;
  orderNumber: string;
  amount: string | number;
  apiCertKey: string;
  timestamp: string;
}): string {
  return sha256Hex(`${input.merchantId}|${input.orderNumber}|${input.amount}|${input.apiCertKey}|${input.timestamp}`);
}

export function buildPayupCancelSignature(input: {
  merchantId: string;
  transactionId: string;
  apiCertKey: string;
}): string {
  return sha256Hex(`${input.merchantId}|${input.transactionId}|${input.apiCertKey}`);
}

export async function requestPayupKeyinApproval(input: PayupApprovalInput): Promise<PayupApiResult> {
  const validationError = validatePayupApprovalInput(input);
  if (validationError) {
    return {
      ok: false,
      code: "PAYUP_INPUT_INVALID",
      message: validationError,
      rawMasked: {},
    };
  }

  const timestamp = buildTimestamp();
  const amount = String(Math.trunc(input.amount));
  const body = compactRecord({
    orderNumber: input.orderNumber,
    cardNo: digits(input.card.cardNo),
    expireMonth: twoDigits(input.card.expireMonth),
    expireYear: twoDigits(input.card.expireYear),
    birthday: digits(input.card.birthday),
    cardPw: digits(input.card.cardPw),
    amount,
    quota: normalizeQuota(input.card.quota),
    itemName: input.itemName,
    userName: input.card.userName || input.userName,
    signature: buildPayupApprovalSignature({
      merchantId: input.merchantId,
      orderNumber: input.orderNumber,
      amount,
      apiCertKey: input.apiCertKey,
      timestamp,
    }),
    timestamp,
    mobileNumber: digits(input.card.mobileNumber),
    kakaoSend: input.card.kakaoSend,
    userEmail: input.card.userEmail,
    taxFlag: input.card.taxFlag,
    taxAmount: input.card.taxAmount,
    freeAmount: input.card.freeAmount,
    userId: input.card.userId,
  });

  return callPayupApi(`${readPayupLegacyKeyinApiBaseUrl(input.environment)}/v2/api/payment/${encodeURIComponent(input.merchantId)}/keyin`, body);
}

export async function requestPayupStandardApproval(input: PayupStandardApprovalInput): Promise<PayupApiResult> {
  const validationError = validatePayupStandardApprovalInput(input);
  if (validationError) {
    return {
      ok: false,
      code: "PAYUP_INPUT_INVALID",
      message: validationError,
      rawMasked: {},
    };
  }

  const token = await requestPayupAccessToken({ merchantId: input.merchantId, apiKey: input.apiKey, environment: input.environment });
  if (!token.ok || !token.accessToken) {
    return {
      ok: false,
      code: token.code || "PAYUP_ACCESS_TOKEN_FAILED",
      message: `Payup access token failed: ${token.message}`,
      rawMasked: token.rawMasked,
    };
  }

  const amount = String(Math.trunc(input.amount));
  const body = {
    merchantId: input.merchantId,
    transactionId: input.transactionId,
    amount,
    orderNumber: input.orderNumber,
  };

  return callPayupApi(`${readPayupApiBaseUrl(input.environment)}/api/v1/payment`, body, {
    Authorization: token.accessToken,
  });
}

export async function requestPayupCancel(input: PayupCancelInput): Promise<PayupApiResult> {
  const apiKey = input.apiKey || input.apiCertKey;
  if (!input.merchantId || !apiKey || !input.transactionId) {
    return {
      ok: false,
      code: "PAYUP_CANCEL_INPUT_INVALID",
      message: "merchantId, apiKey, and transactionId are required.",
      rawMasked: {},
    };
  }

  const token = await requestPayupAccessToken({ merchantId: input.merchantId, apiKey, environment: input.environment });
  if (!token.ok || !token.accessToken) {
    return {
      ok: false,
      code: token.code || "PAYUP_ACCESS_TOKEN_FAILED",
      message: `Payup access token failed: ${token.message}`,
      rawMasked: token.rawMasked,
    };
  }

  const partial = input.partial === true && Number.isFinite(input.cancelAmount) && Number(input.cancelAmount) > 0;
  const body = partial
    ? {
        transactionId: input.transactionId,
        cancelAmount: String(Math.trunc(Number(input.cancelAmount))),
        cancelReason: input.cancelReason || "A5 payment partial cancel",
      }
    : {
        transactionId: input.transactionId,
        cancelReason: input.cancelReason || "A5 payment cancel",
      };
  const endpoint = partial ? "/api/v1/partCancel" : "/api/v1/cancel";

  return callPayupApi(`${readPayupApiBaseUrl(input.environment)}${endpoint}`, body, {
    Authorization: token.accessToken,
  });
}

export async function verifyPayupConnection(input: {
  merchantId: string;
  apiKey: string;
  environment: PayupEnvironment;
}): Promise<{ ok: boolean; code: string; message: string; environment: PayupEnvironment }> {
  const token = await requestPayupAccessToken(input);
  return {
    ok: token.ok,
    code: token.code,
    message: token.message,
    environment: input.environment,
  };
}

async function requestPayupAccessToken(input: { merchantId: string; apiKey: string; environment?: PayupEnvironment }): Promise<PayupTokenResult> {
  if (!input.merchantId || !input.apiKey) {
    return {
      ok: false,
      code: "PAYUP_AUTH_INPUT_INVALID",
      message: "merchantId and apiKey are required.",
      rawMasked: {},
    };
  }

  const apiBaseUrl = readPayupApiBaseUrl(input.environment);
  const cacheKey = `${apiBaseUrl}::${input.merchantId}::${input.apiKey.slice(-6)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt - tokenRefreshSkewMs > Date.now()) {
    return {
      ok: true,
      code: "0000",
      message: "Payup access token cache hit.",
      accessToken: cached.accessToken,
      refreshToken: cached.refreshToken,
      expiresAt: cached.expiresAt,
      rawMasked: {},
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/v1/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        merchantId: input.merchantId,
        apiKey: input.apiKey,
      }),
    });
    const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const data = asRecord(raw.data);
    const code = text(raw.messageCode ?? raw.responseCode ?? raw.resultCode ?? raw.code) || `HTTP_${response.status}`;
    const message = text(raw.message ?? raw.responseMsg ?? raw.resultMsg) || response.statusText;
    const accessToken = text(data.accessToken ?? raw.accessToken);
    const refreshToken = text(data.refreshToken ?? raw.refreshToken);
    const validitySeconds = numberValue(data.accessTokenValidityInSec ?? raw.accessTokenValidityInSec) ?? 3600;
    const ok = response.ok && text(raw.status).toUpperCase() === "SUCCESS" && code === "0000" && Boolean(accessToken);
    const expiresAt = Date.now() + Math.max(validitySeconds - 60, 60) * 1000;

    if (ok) {
      tokenCache.set(cacheKey, { accessToken, refreshToken, expiresAt });
    }

    return {
      ok,
      code,
      message,
      accessToken,
      refreshToken,
      expiresAt,
      rawMasked: maskPayupPayload(raw),
    };
  } catch (error) {
    return {
      ok: false,
      code: "PAYUP_ACCESS_TOKEN_CALL_FAILED",
      message: error instanceof Error ? error.message : "Unknown Payup access token error.",
      rawMasked: {},
    };
  }
}

async function callPayupApi(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<PayupApiResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
      body: JSON.stringify(body),
    });
    const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const data = asRecord(raw.data);
    const code = text(data.responseCode ?? raw.responseCode ?? raw.messageCode ?? raw.resultCode ?? raw.resultCd ?? raw.code ?? raw.resCd);
    const message = text(data.responseMsg ?? raw.responseMsg ?? raw.message ?? raw.resultMsg ?? raw.resMsg) || response.statusText;
    const amount = numberValue(data.amount ?? data.cancelAmount ?? raw.amount ?? raw.approvalAmount ?? raw.paidAmount ?? raw.pgApprovalAmt);
    const transactionId = text(data.transactionId ?? raw.transactionId ?? raw.transaction_id ?? raw.tid ?? raw.pgTid ?? raw.authNumber);
    const cancelTransactionId = text(data.partTransactionId ?? data.cancelTransactionId ?? raw.partTransactionId ?? raw.cancelTransactionId);
    const paymentKey = text(raw.paymentKey ?? raw.payment_key ?? data.authNumber ?? data.transactionId ?? cancelTransactionId ?? transactionId);
    const receiptUrl = text(data.receiptUrl ?? raw.receiptUrl ?? raw.receipt_url ?? raw.receiptURL);
    const status = text(raw.status).toUpperCase();
    const ok = response.ok && code === "0000" && (!status || status === "SUCCESS");

    return {
      ok,
      code: code || `HTTP_${response.status}`,
      message: message || (ok ? "Payup approval succeeded." : "Payup approval failed."),
      transactionId: cancelTransactionId || transactionId,
      paymentKey,
      receiptUrl,
      amount,
      rawMasked: maskPayupPayload(raw),
    };
  } catch (error) {
    return {
      ok: false,
      code: "PAYUP_API_CALL_FAILED",
      message: error instanceof Error ? error.message : "Unknown Payup API call error.",
      rawMasked: {},
    };
  }
}

function validatePayupApprovalInput(input: PayupApprovalInput): string {
  if (!input.merchantId) return "Payup merchantId is required.";
  if (!input.apiCertKey) return "Payup apiCertKey is required.";
  if (!input.orderNumber) return "Payup orderNumber is required.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) return "Payup amount must be greater than zero.";
  if (!digits(input.card.cardNo)) return "Payup cardNo is required.";
  if (!twoDigits(input.card.expireMonth)) return "Payup expireMonth is required.";
  if (!twoDigits(input.card.expireYear)) return "Payup expireYear is required.";
  if (!digits(input.card.birthday)) return "Payup birthday is required.";
  if (!digits(input.card.cardPw)) return "Payup cardPw is required.";
  return "";
}

function validatePayupStandardApprovalInput(input: PayupStandardApprovalInput): string {
  if (!input.merchantId) return "Payup merchantId is required.";
  if (!input.apiKey) return "Payup apiKey is required.";
  if (!input.transactionId) return "Payup transactionId is required.";
  if (!input.orderNumber) return "Payup orderNumber is required.";
  if (!Number.isFinite(input.amount) || input.amount <= 0) return "Payup amount must be greater than zero.";
  return "";
}

function buildTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function compactRecord(record: Record<string, unknown>): Record<string, string> {
  const compacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const stringValue = typeof value === "string" ? value.trim() : "";
    if (stringValue) compacted[key] = stringValue;
  }
  return compacted;
}

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function twoDigits(value: unknown): string {
  const valueDigits = digits(value);
  if (!valueDigits) return "";
  return valueDigits.slice(-2).padStart(2, "0");
}

function normalizeQuota(value: unknown): string {
  const valueDigits = digits(value);
  if (!valueDigits || valueDigits === "0") return "00";
  return valueDigits.slice(-2).padStart(2, "0");
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function maskPayupPayload(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    masked[key] = /card|secret|key|password|cert|birthday|pw|signature/i.test(key) ? "[masked]" : value;
  }
  return masked;
}
