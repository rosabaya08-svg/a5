import type { PaymentEnvironment } from "@/types/payment";
import type { ProviderReadiness } from "@/lib/payments/types";

const requiredPublicPgKeys = [
  "PG_PROVIDER",
  "PG_ENVIRONMENT",
  "PG_CLIENT_KEY",
  "NEXT_PUBLIC_PG_PROVIDER",
  "NEXT_PUBLIC_PG_CLIENT_KEY",
  "NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL",
  "NEXT_PUBLIC_PG_CHANNEL_KEY",
  "NEXT_PUBLIC_PG_MERCHANT_ID",
  "PG_MERCHANT_ID",
  "PG_CHANNEL_KEY",
  "PG_SUCCESS_URL",
  "PG_FAIL_URL",
  "PG_WEBHOOK_URL",
] as const;

const optionalPublicPgKeys = ["NEXT_PUBLIC_PG_SCRIPT_URL"] as const;
const secretPgKeys = ["PG_SECRET_KEY", "PG_WEBHOOK_SECRET"] as const;

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getPaymentEnvironment(): PaymentEnvironment {
  return readEnv("PG_ENVIRONMENT") === "production" ? "production" : "test";
}

export function getPaymentConfigSummary() {
  const provider = readEnv("PG_PROVIDER") || readEnv("NEXT_PUBLIC_PG_PROVIDER") || "mock";
  const missingPublic = requiredPublicPgKeys.filter((key) => !readEnv(key));
  const missingSecret = secretPgKeys.filter((key) => !readEnv(key));
  const publicClientReady = Boolean(
    provider !== "mock" &&
      (readEnv("NEXT_PUBLIC_PG_CLIENT_KEY") || readEnv("PG_CLIENT_KEY")) &&
      (readEnv("NEXT_PUBLIC_PG_CHANNEL_KEY") || readEnv("PG_CHANNEL_KEY") || readEnv("NEXT_PUBLIC_PG_MERCHANT_ID") || readEnv("PG_MERCHANT_ID")) &&
      (readEnv("NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL") || readEnv("NEXT_PUBLIC_A5_BACKEND_URL")),
  );
  const serverConfirmReady = Boolean(
    provider !== "mock" &&
      readEnv("PG_SECRET_KEY") &&
      readEnv("PG_WEBHOOK_SECRET") &&
      readEnv("PG_MERCHANT_ID") &&
      readEnv("PG_CHANNEL_KEY"),
  );

  return {
    provider,
    environment: getPaymentEnvironment(),
    publicKeys: requiredPublicPgKeys,
    optionalPublicKeys: optionalPublicPgKeys,
    secretKeys: secretPgKeys,
    missingPublic,
    missingSecret,
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
      blockers: ["PG사 확정", "테스트 MID/KEY 수령", "Firebase Functions confirm endpoint 배포 승인"],
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
      "Cloudflare Pages static export에서는 secret confirm 불가",
      "Firebase Functions 배포와 Secret Manager 등록 필요",
    ],
  };
}
