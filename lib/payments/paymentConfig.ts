import type { PaymentEnvironment } from "@/types/payment";
import type { ProviderReadiness } from "@/lib/payments/types";

const requiredPublicPgKeys = [
  "NEXT_PUBLIC_PG_PROVIDER",
  "NEXT_PUBLIC_PG_CLIENT_KEY",
  "NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL",
  "NEXT_PUBLIC_PAYMENT_SUCCESS_URL",
  "NEXT_PUBLIC_PAYMENT_FAIL_URL",
] as const;

const optionalPublicPgKeys = [
  "NEXT_PUBLIC_PG_CHANNEL_KEY",
  "NEXT_PUBLIC_PG_MERCHANT_ID",
  "NEXT_PUBLIC_PG_SCRIPT_URL",
] as const;

const serverPgKeys = ["PG_SECRET_KEY", "PG_MERCHANT_ID", "PG_CHANNEL_KEY", "PG_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_URL"] as const;

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getPaymentEnvironment(): PaymentEnvironment {
  return readEnv("PG_ENVIRONMENT") === "production" || readEnv("NEXT_PUBLIC_PG_ENVIRONMENT") === "production"
    ? "production"
    : "test";
}

export function getPaymentConfigSummary() {
  const provider = readEnv("NEXT_PUBLIC_PG_PROVIDER") || readEnv("PG_PROVIDER") || "mock";
  const missingPublic = requiredPublicPgKeys.filter((key) => !readEnv(key));
  const missingServer = serverPgKeys.filter((key) => !readEnv(key));
  const publicClientReady = provider !== "mock" && missingPublic.length === 0;
  const serverConfirmReady = provider !== "mock" && missingServer.length === 0;

  return {
    provider,
    environment: getPaymentEnvironment(),
    publicKeys: requiredPublicPgKeys,
    optionalPublicKeys: optionalPublicPgKeys,
    serverKeys: serverPgKeys,
    missingPublic,
    missingSecret: missingServer,
    publicClientReady,
    serverConfirmReady,
    isContractReady: publicClientReady && serverConfirmReady,
  };
}

export function getPaymentRuntimeReadiness(): ProviderReadiness {
  const summary = getPaymentConfigSummary();
  const missingKeys = [...summary.missingPublic, ...summary.missingSecret];

  if (summary.provider === "mock") {
    return {
      provider: "mock",
      ready: true,
      mode: "mock",
      label: "현재 mock 결제만 활성",
      missingKeys,
      blockers: ["PG사 확정", "테스트 MID/KEY 수령", "Functions confirm endpoint 환경변수 등록"],
    };
  }

  return {
    provider: "pg_skeleton",
    ready: summary.isContractReady,
    mode: summary.isContractReady ? "contract_ready" : "keys_missing",
    label: summary.isContractReady ? "PG 키 입력 대기 구조 준비" : "PG 키 또는 서버 endpoint 미완료",
    missingKeys,
    blockers: [
      "실제 PG SDK/provider 확정 필요",
      "PG_SECRET_KEY는 프론트/Cloudflare Pages에 노출 금지",
      "Firebase Functions runtime env 또는 Secret Manager 등록 필요",
    ],
  };
}
