import type { PaymentEnvironment } from "@/types/payment";
import type { ProviderReadiness } from "@/lib/payments/types";

const publicPgKeys = [
  "PG_PROVIDER",
  "PG_ENVIRONMENT",
  "PG_CLIENT_KEY",
  "NEXT_PUBLIC_PG_PROVIDER",
  "NEXT_PUBLIC_PG_CLIENT_KEY",
  "PG_MERCHANT_ID",
  "PG_CHANNEL_KEY",
  "PG_SUCCESS_URL",
  "PG_FAIL_URL",
  "PG_WEBHOOK_URL",
] as const;

const secretPgKeys = ["PG_SECRET_KEY", "PG_WEBHOOK_SECRET"] as const;

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getPaymentEnvironment(): PaymentEnvironment {
  return readEnv("PG_ENVIRONMENT") === "production" ? "production" : "test";
}

export function getPaymentConfigSummary() {
  const missingPublic = publicPgKeys.filter((key) => !readEnv(key));
  const missingSecret = secretPgKeys.filter((key) => !readEnv(key));

  return {
    provider: readEnv("PG_PROVIDER") || "mock",
    environment: getPaymentEnvironment(),
    publicKeys: publicPgKeys,
    secretKeys: secretPgKeys,
    missingPublic,
    missingSecret,
    isContractReady: missingPublic.length === 0 && missingSecret.length === 0,
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
      label: "현재 mock 결제만 활성화",
      missingKeys,
      blockers: ["PG사 확정", "테스트 MID/KEY 수령", "서버 confirm endpoint 구현"],
    };
  }

  return {
    provider: "pg_skeleton",
    ready: summary.isContractReady,
    mode: summary.isContractReady ? "contract_ready" : "keys_missing",
    label: summary.isContractReady ? "PG 키 입력 대기 구조 준비" : "PG 키와 서버 endpoint 미완성",
    missingKeys,
    blockers: [
      "실제 PG SDK/provider 확정 필요",
      "Cloudflare Pages static export에서는 secret confirm 불가",
      "Functions/Cloud Run/Workers 중 서버 실행 위치 확정 필요",
    ],
  };
}
