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
  infiny: "infiny",
  infini: "infiny",
  infinypg: "infiny",
  infinipg: "infiny",
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
  if (candidate === "infiny" || candidate === "toss" || candidate === "portone" || candidate === "kcp" || candidate === "nice") return candidate;
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
      label: "모의/테스트 베타 결제 흐름",
      missingKeys,
      publicKeys: summary.publicKeys,
      serverKeys: summary.serverKeys,
      blockers: ["PG 결제사 미선택", "PG 공식 문서/키 미수령", "실제 승인/취소/환불 호출 금지"],
      handoff: ["실제 PG사가 선택될 때까지 모의 결제사를 유지합니다.", "승인 전 서버 금액 재계산을 유지합니다."],
    };
  }

  if (summary.candidate === "unknown") {
    return {
      provider: "pg_skeleton",
      candidate: "unknown",
      ready: false,
      mode: "blocked",
    label: "지원 후보가 아닌 PG 결제사",
      missingKeys,
      publicKeys: summary.publicKeys,
      serverKeys: summary.serverKeys,
      blockers: ["NEXT_PUBLIC_PG_PROVIDER는 infiny, toss, portone, kcp, nice 중 하나여야 합니다."],
    handoff: ["어댑터 내부 구현 전 PG사와 결제사 이름을 확인합니다."],
    };
  }

  return {
    provider: toPaymentProviderId(summary.candidate),
    candidate: summary.candidate,
    ready: summary.isContractReady,
    mode: summary.isContractReady ? "contract_ready" : "keys_missing",
    label: summary.isContractReady ? "공식 모듈 연결용 PG 어댑터 슬롯 준비" : "PG 키 또는 엔드포인트 값 누락",
    missingKeys,
    publicKeys: summary.publicKeys,
    serverKeys: summary.serverKeys,
    blockers: [
      "공식 문서 검토 전까지 실제 PG SDK/API import는 금지입니다.",
      "PG_SECRET_KEY와 PG_WEBHOOK_SECRET은 Functions runtime 또는 Secret Manager에만 보관해야 합니다.",
      "실제 취소/환불/정산은 계속 차단됩니다.",
    ],
    handoff: [
      `공식 sandbox 문서 수령 후에만 ${summary.candidate} 어댑터 분기를 구현합니다.`,
      "브라우저 공개 키는 Cloudflare Pages에만 둡니다.",
      "서버 비밀값은 static export와 Git에서 제외합니다.",
    ],
  };
}
