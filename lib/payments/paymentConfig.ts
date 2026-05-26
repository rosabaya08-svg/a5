import type { PaymentEnvironment, PaymentProviderCandidate, PaymentProviderId } from "@/types/payment";
import type { ProviderReadiness } from "@/lib/payments/types";

export const requiredPublicPgKeys = [
  "NEXT_PUBLIC_PG_PROVIDER",
  "NEXT_PUBLIC_PG_CLIENT_KEY",
  "NEXT_PUBLIC_PAYMENT_SUCCESS_URL",
  "NEXT_PUBLIC_PAYMENT_FAIL_URL",
  "NEXT_PUBLIC_PAYMENT_API_BASE_URL",
] as const;

export const optionalPublicPgKeys = ["NEXT_PUBLIC_PG_CHANNEL_KEY"] as const;

export const requiredServerPgKeys = [
  "PG_SECRET_KEY",
  "PG_MERCHANT_ID",
  "PG_CHANNEL_KEY",
  "PG_WEBHOOK_SECRET",
  "PAYMENT_WEBHOOK_URL",
] as const;

const providerAliases: Record<string, PaymentProviderCandidate> = {
  mock: "mock",
  toss: "toss",
  tosspayments: "toss",
  portone: "portone",
  iamport: "portone",
  kcp: "kcp",
  nice: "nice",
  nicepay: "nice",
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getPaymentEnvironment(): PaymentEnvironment {
  return readEnv("PG_ENVIRONMENT") === "production" || readEnv("NEXT_PUBLIC_PG_ENVIRONMENT") === "production"
    ? "production"
    : "test";
}

export function resolvePaymentProviderCandidate(value?: string): PaymentProviderCandidate {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
  return providerAliases[normalized] ?? "unknown";
}

export function toPaymentProviderId(candidate: PaymentProviderCandidate): PaymentProviderId {
  if (candidate === "toss" || candidate === "portone" || candidate === "kcp" || candidate === "nice") return candidate;
  return candidate === "mock" ? "mock" : "pg_skeleton";
}

export function getPaymentConfigSummary() {
  const rawProvider = readEnv("NEXT_PUBLIC_PG_PROVIDER") || readEnv("PG_PROVIDER") || "mock";
  const candidate = resolvePaymentProviderCandidate(rawProvider);
  const provider = toPaymentProviderId(candidate);
  const missingPublic = requiredPublicPgKeys.filter((key) => !readEnv(key));
  const missingServer = requiredServerPgKeys.filter((key) => !readEnv(key));
  const publicClientReady = candidate !== "mock" && candidate !== "unknown" && missingPublic.length === 0;
  const serverConfirmReady = candidate !== "mock" && candidate !== "unknown" && missingServer.length === 0;

  return {
    rawProvider,
    provider,
    candidate,
    environment: getPaymentEnvironment(),
    publicKeys: requiredPublicPgKeys,
    optionalPublicKeys: optionalPublicPgKeys,
    serverKeys: requiredServerPgKeys,
    missingPublic,
    missingSecret: missingServer,
    publicClientReady,
    serverConfirmReady,
    isContractReady: publicClientReady && serverConfirmReady,
    paymentApiBaseUrl: readEnv("NEXT_PUBLIC_PAYMENT_API_BASE_URL") || readEnv("NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL"),
    successUrl: readEnv("NEXT_PUBLIC_PAYMENT_SUCCESS_URL"),
    failUrl: readEnv("NEXT_PUBLIC_PAYMENT_FAIL_URL"),
  };
}

export function getPaymentRuntimeReadiness(): ProviderReadiness {
  const summary = getPaymentConfigSummary();
  const missingKeys = [...summary.missingPublic, ...summary.missingSecret];

  if (summary.candidate === "mock") {
    return {
      provider: "mock",
      candidate: "mock",
      ready: true,
      mode: "mock",
      label: "mock/test beta 결제 흐름",
      missingKeys,
      publicKeys: summary.publicKeys,
      serverKeys: summary.serverKeys,
      blockers: ["PG provider 미선택", "PG 공식 문서/키 미수령", "실제 승인/취소/환불 호출 금지"],
      handoff: ["Use mock provider until a real PG provider is selected.", "Keep server amount recalculation before confirm."],
    };
  }

  if (summary.candidate === "unknown") {
    return {
      provider: "pg_skeleton",
      candidate: "unknown",
      ready: false,
      mode: "blocked",
      label: "지원 후보가 아닌 PG provider",
      missingKeys,
      publicKeys: summary.publicKeys,
      serverKeys: summary.serverKeys,
      blockers: ["NEXT_PUBLIC_PG_PROVIDER must be one of toss, portone, kcp, nice."],
      handoff: ["Confirm provider name with the PG company before implementing adapter internals."],
    };
  }

  return {
    provider: toPaymentProviderId(summary.candidate),
    candidate: summary.candidate,
    ready: summary.isContractReady,
    mode: summary.isContractReady ? "contract_ready" : "keys_missing",
    label: summary.isContractReady ? "PG adapter slot ready for official module" : "PG key or endpoint values missing",
    missingKeys,
    publicKeys: summary.publicKeys,
    serverKeys: summary.serverKeys,
    blockers: [
      "Actual PG SDK/API import is still prohibited until official docs are reviewed.",
      "PG_SECRET_KEY and PG_WEBHOOK_SECRET must stay in Functions runtime or Secret Manager.",
      "Real cancel/refund/settlement remains blocked.",
    ],
    handoff: [
      `Implement the ${summary.candidate} adapter branch only after official sandbox docs arrive.`,
      "Keep browser keys in Cloudflare Pages only.",
      "Keep server secrets out of static export and Git.",
    ],
  };
}
