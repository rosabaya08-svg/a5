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
  const direct =
    readEnv(`PG_${upper}_URL`) ||
    readEnv(`${providerUpper}_${upper}_URL`) ||
    readEnv(`INFINY_${upper}_URL`);
  const base = readEnv("PG_API_BASE_URL") || readEnv(`${providerUpper}_API_BASE_URL`) || readEnv("INFINY_API_BASE_URL");
  const path = readEnv(`PG_${upper}_PATH`) || readEnv(`${providerUpper}_${upper}_PATH`) || `/payments/${key}`;

  return direct || joinUrl(base, path);
}

export function getPgServerReadiness(): PgServerReadiness {
  const provider = readEnv("PG_PROVIDER") || readEnv("NEXT_PUBLIC_PG_PROVIDER") || "mock";
  const normalizedProvider = provider.trim().toLowerCase();
  const apiBaseUrl = readEnv("PG_API_BASE_URL") || readEnv("INFINY_API_BASE_URL");
  const confirmUrl = readEndpoint(provider, "confirm");
  const cancelUrl = readEndpoint(provider, "cancel");
  const statusUrl = readEndpoint(provider, "status");
  const webhookUrl = readEnv("PAYMENT_WEBHOOK_URL");
  const missingKeys: string[] = normalizedProvider === "mock"
    ? []
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
    message: readyForAdapter
      ? "PG server keys and confirm endpoint are present. Real provider adapter can call the configured PG."
      : "PG server keys, webhook URL, confirm endpoint, or provider mode is not ready for real PG calls.",
  };
}

export function getPgAdapterHandoffPlan(): string[] {
  return [
    "Create a provider adapter from the PG official SDK/API documentation.",
    "Call provider.ready or payment prepare only after server amount recalculation.",
    "Resolve the active company merchantId from companies/{companyId}; do not rely on one global MID for seller payments.",
    "Call provider.confirm with PG_SECRET_KEY only inside Firebase Functions or another server runtime.",
    "Verify webhook signatures with PG_WEBHOOK_SECRET before any Firestore status transition.",
    "Keep cancel/refund behind manual approval and settlement hold rules.",
  ];
}
