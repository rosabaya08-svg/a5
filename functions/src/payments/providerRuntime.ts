import {
  isLegacyInnopayEnabled,
  isLegacyInnopayProviderName,
  isPayupProviderName,
  legacyInnopayBlockedMessage,
} from "./providerPolicy";

export type PgServerReadiness = {
  provider: string;
  environment: "test" | "production";
  readyForAdapter: boolean;
  missingKeys: string[];
  secretKeysExpected: string[];
  apiBaseUrl?: string;
  confirmUrl?: string;
  cancelUrl?: string;
  statusUrl?: string;
  webhookUrl?: string;
  webhookSignatureHeader: string;
  webhookSignatureAlgorithm: "sha256" | "sha512";
  message: string;
};

const requiredSecretKeys = ["PG_SECRET_KEY", "PG_WEBHOOK_SECRET"] as const;
const payupTestBaseUrl = "https://standard.testpayup.co.kr";
const payupProductionBaseUrl = "https://standard.payup.co.kr";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function joinUrl(base: string, path: string): string {
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function readEndpoint(provider: string, key: "confirm" | "cancel" | "status"): string {
  const upper = key.toUpperCase();
  const providerUpper = provider.trim().toUpperCase();
  const innopayMode = isInnopayRestApiMode(provider);
  const payupMode = isPayupProvider(provider);
  const legacyInnopayAllowed = isLegacyInnopayEnabled();
  const direct =
    readEnv(`PG_${upper}_URL`) ||
    readEnv(`${providerUpper}_${upper}_URL`) ||
    (legacyInnopayAllowed ? readEnv(`INFINY_${upper}_URL`) : "");

  if (direct) return direct;
  if (payupMode) {
    if (key === "confirm") return joinUrl(readPayupApiBaseUrl(), "/api/v1/payment");
    if (key === "cancel") return joinUrl(readPayupApiBaseUrl(), "/api/v1/cancel");
    return "";
  }
  if (innopayMode) {
    if (key === "cancel") return joinUrl(readInnopayApiBaseUrl(), "/api/cancelApi");
    if (key === "status") return joinUrl(readInnopayApiBaseUrl(), "/v1/transactions");
    return "";
  }

  const base =
    readEnv("PG_API_BASE_URL") ||
    readEnv(`${providerUpper}_API_BASE_URL`) ||
    (legacyInnopayAllowed ? readEnv("INFINY_API_BASE_URL") : "");
  const path = readEnv(`PG_${upper}_PATH`) || readEnv(`${providerUpper}_${upper}_PATH`) || `/payments/${key}`;

  return joinUrl(base, path);
}

export function getPgServerReadiness(): PgServerReadiness {
  const provider = readEnv("PG_PROVIDER") || readEnv("NEXT_PUBLIC_PG_PROVIDER") || "mock";
  const normalizedProvider = provider.trim().toLowerCase();
  const smsApiMode = isInnopaySmsApiMode(provider);
  const payupMode = isPayupProvider(provider);
  const legacyInnopayBlocked = isLegacyInnopayProviderName(provider) && !isLegacyInnopayEnabled();
  const apiBaseUrl = payupMode ? readPayupApiBaseUrl() : smsApiMode ? readInnopayApiBaseUrl() : readEnv("PG_API_BASE_URL");
  const confirmUrl = readEndpoint(provider, "confirm");
  const cancelUrl = readEndpoint(provider, "cancel");
  const statusUrl = readEndpoint(provider, "status");
  const webhookUrl = readEnv("PAYMENT_WEBHOOK_URL");
  const missingKeys: string[] = legacyInnopayBlocked
    ? ["A5_ENABLE_LEGACY_INNOPAY disabled"]
    : normalizedProvider === "mock"
    ? []
    : payupMode
      ? [
          !apiBaseUrl ? "PAYUP_API_BASE_URL or PG_API_BASE_URL" : "",
        ].filter(Boolean)
    : smsApiMode
      ? [
          !isInnopayRealCallEnabled() ? "INNOPAY_SMS_API_ENABLED, INNOPAY_VBANK_API_ENABLED, or INNOPAY_REAL_CALLS_ENABLED" : "",
        ].filter(Boolean)
      : [
        ...requiredSecretKeys.filter((key) => !readEnv(key)),
        !webhookUrl ? "PAYMENT_WEBHOOK_URL" : "",
        !apiBaseUrl && !confirmUrl ? "PG_API_BASE_URL or PG_CONFIRM_URL" : "",
      ].filter(Boolean);

  const readyForAdapter = normalizedProvider !== "mock" && missingKeys.length === 0;
  const webhookSignatureAlgorithm = readEnv("PG_WEBHOOK_SIGNATURE_ALGORITHM") === "sha512" ? "sha512" : "sha256";

  return {
    provider,
    environment: readEnv("PG_ENVIRONMENT") === "production" ? "production" : "test",
    readyForAdapter,
    missingKeys,
    secretKeysExpected: ["PG_SECRET_KEY", "PG_WEBHOOK_SECRET"],
    apiBaseUrl,
    confirmUrl,
    cancelUrl,
    statusUrl,
    webhookUrl,
    webhookSignatureHeader: readEnv("PG_WEBHOOK_SIGNATURE_HEADER") || "x-pg-signature",
    webhookSignatureAlgorithm,
    message: legacyInnopayBlocked
      ? legacyInnopayBlockedMessage()
      : readyForAdapter
      ? payupMode
      ? "Payup standard API mode is enabled. Company merchant credentials are checked per payment intent."
        : smsApiMode
        ? "InnoPay REST API mode is enabled. The server can call documented /api/* endpoints and transaction lookup."
        : "PG server keys and confirm endpoint are present. Real provider adapter can call the configured PG."
      : payupMode
      ? "Payup standard API base URL is missing."
        : smsApiMode
        ? "InnoPay REST API mode is blocked until INNOPAY_SMS_API_ENABLED, INNOPAY_VBANK_API_ENABLED, or INNOPAY_REAL_CALLS_ENABLED is true."
        : "PG server keys, webhook URL, confirm endpoint, or provider mode is not ready for real PG calls.",
  };
}

export function isInnopaySmsApiMode(providerName?: string): boolean {
  return isInnopayRestApiMode(providerName);
}

export function isPayupProvider(providerName?: string): boolean {
  return isPayupProviderName(providerName || readEnv("PG_PROVIDER") || readEnv("NEXT_PUBLIC_PG_PROVIDER") || "");
}

export function isInnopayRestApiMode(providerName?: string): boolean {
  const provider = (providerName || readEnv("PG_PROVIDER") || readEnv("NEXT_PUBLIC_PG_PROVIDER") || "").trim().toLowerCase();
  if (!isLegacyInnopayEnabled()) return false;
  const mode = readEnv("INNOPAY_PAYMENT_MODE").toLowerCase();
  const base = readInnopayApiBaseUrl().toLowerCase();

  return isLegacyInnopayProviderName(provider) &&
    (
      mode === "sms" ||
      mode === "vbank" ||
      mode === "rest" ||
      mode === "innopay" ||
      mode === "webview" ||
      mode === "tpay" ||
      mode === "direct" ||
      base.includes("api.innopay.co.kr") ||
      readEnv("INNOPAY_SMS_API_ENABLED").toLowerCase() === "true" ||
      readEnv("INNOPAY_REAL_CALLS_ENABLED").toLowerCase() === "true"
    );
}

export function isInnopayRealCallEnabled(): boolean {
  return readEnv("INNOPAY_SMS_API_ENABLED").toLowerCase() === "true" ||
    readEnv("INNOPAY_VBANK_API_ENABLED").toLowerCase() === "true" ||
    readEnv("INNOPAY_REAL_CALLS_ENABLED").toLowerCase() === "true";
}

export function readInnopayApiBaseUrl(): string {
  if (!isLegacyInnopayEnabled()) return "";
  return readEnv("INNOPAY_API_BASE_URL") || readEnv("PG_API_BASE_URL") || readEnv("INFINY_API_BASE_URL") || "https://api.innopay.co.kr";
}

export function readPayupApiBaseUrl(): string {
  const explicit = readEnv("PAYUP_API_BASE_URL") || readEnv("PG_API_BASE_URL");
  if (explicit) return explicit;
  return readEnv("PAYUP_ENVIRONMENT") === "production" || readEnv("PG_ENVIRONMENT") === "production"
    ? payupProductionBaseUrl
    : payupTestBaseUrl;
}

export function getPgAdapterHandoffPlan(): string[] {
  return [
    "Use Payup access-token approval/cancel APIs only inside Firebase Functions or another server runtime.",
    "Call provider.ready or payment prepare only after server amount recalculation.",
    "Resolve the active company merchantId from companies/{companyId}; do not rely on one global MID for seller payments.",
    "Do not store cardNo, cardPw, birthday, or raw Payup request payloads in Firestore, browser storage, logs, or analytics.",
    "Verify provider responses and amount equality before any Firestore status transition.",
    "Keep cancel/refund behind manual approval and settlement hold rules.",
  ];
}
