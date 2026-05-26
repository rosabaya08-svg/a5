import type { PgMerchantStatus, PgProvider } from "@/types/commerce";

export const INFINY_PG_SETTINGS_STORAGE_KEY = "a5.admin.infiny-pg-settings";

export type InfinyPgRuntimeConfig = {
  provider: PgProvider;
  environment: "test" | "production";
  clientKey: string;
  channelKey: string;
  merchantId: string;
  apiBaseUrl: string;
  scriptUrl: string;
  successUrl: string;
  failUrl: string;
  webhookUrl: string;
  secretKeyRef: string;
  webhookSecretRef: string;
  splitSettlementEnabled: boolean;
  officialModuleReceived: boolean;
  officialDocsReviewed: boolean;
  amountRecalculationEnabled: boolean;
  webhookSignatureEnabled: boolean;
};

export type InfinyMerchantConfig = {
  companyId: string;
  companyName: string;
  companyStatus?: "pending" | "approved" | "suspended";
  merchantId: string;
  merchantStatus: PgMerchantStatus;
};

export type InfinyPgProvisioningState = {
  id: string;
  runtime: InfinyPgRuntimeConfig;
  merchants: InfinyMerchantConfig[];
  updatedAt: string;
};

export type InfinyPgProvisioningReadiness = {
  ready: boolean;
  blockers: string[];
  activeMerchantCount: number;
  blockedMerchantCount: number;
};

export const defaultInfinyPgRuntimeConfig: InfinyPgRuntimeConfig = {
  provider: "infiny",
  environment: "test",
  clientKey: "",
  channelKey: "",
  merchantId: "",
  apiBaseUrl: "",
  scriptUrl: "",
  successUrl: "https://with-commerce.pages.dev/payment/success",
  failUrl: "https://with-commerce.pages.dev/payment/fail",
  webhookUrl: "",
  secretKeyRef: "",
  webhookSecretRef: "",
  splitSettlementEnabled: false,
  officialModuleReceived: false,
  officialDocsReviewed: false,
  amountRecalculationEnabled: true,
  webhookSignatureEnabled: false,
};

export function buildPgEnvTemplate(runtime: InfinyPgRuntimeConfig) {
  return [
    "# Browser/public values",
    `NEXT_PUBLIC_PG_PROVIDER=${runtime.provider}`,
    `NEXT_PUBLIC_PG_ENVIRONMENT=${runtime.environment}`,
    `NEXT_PUBLIC_PG_CLIENT_KEY=${runtime.clientKey}`,
    `NEXT_PUBLIC_PG_CHANNEL_KEY=${runtime.channelKey}`,
    `NEXT_PUBLIC_PG_SCRIPT_URL=${runtime.scriptUrl}`,
    `NEXT_PUBLIC_PAYMENT_SUCCESS_URL=${runtime.successUrl}`,
    `NEXT_PUBLIC_PAYMENT_FAIL_URL=${runtime.failUrl}`,
    `NEXT_PUBLIC_PAYMENT_API_BASE_URL=${runtime.apiBaseUrl}`,
    "",
    "# Server values",
    `PG_PROVIDER=${runtime.provider}`,
    `PG_ENVIRONMENT=${runtime.environment}`,
    `PG_CHANNEL_KEY=${runtime.channelKey}`,
    `PAYMENT_WEBHOOK_URL=${runtime.webhookUrl}`,
    `PG_SECRET_KEY=<Secret Manager: ${runtime.secretKeyRef || "등록 필요"}>`,
    `PG_WEBHOOK_SECRET=<Secret Manager: ${runtime.webhookSecretRef || "등록 필요"}>`,
    "",
    "# 기업별 MID는 companies/{companyId}.pg_merchant_id 로 저장합니다.",
    "# 대표/플랫폼 MID가 별도로 발급된 경우에만 참고값으로 관리합니다.",
    `OPTIONAL_PLATFORM_MERCHANT_ID=${runtime.merchantId}`,
  ].join("\n");
}

export function evaluateInfinyPgProvisioning(
  runtime: InfinyPgRuntimeConfig,
  merchants: InfinyMerchantConfig[] = [],
): InfinyPgProvisioningReadiness {
  const activeMerchantCount = merchants.filter((merchant) => merchant.merchantId.trim() && merchant.merchantStatus === "active").length;
  const blockedMerchantCount = merchants.filter((merchant) => !merchant.merchantId.trim() || merchant.merchantStatus !== "active").length;
  const blockers = [
    !runtime.clientKey ? "공개 client key 입력 필요" : "",
    !runtime.channelKey ? "channel key 입력 필요" : "",
    !runtime.apiBaseUrl ? "결제 API base URL 입력 필요" : "",
    !runtime.successUrl ? "결제 성공 URL 입력 필요" : "",
    !runtime.failUrl ? "결제 실패 URL 입력 필요" : "",
    !runtime.webhookUrl ? "결제 webhook URL 입력 필요" : "",
    !runtime.secretKeyRef ? "PG_SECRET_KEY Secret Manager 참조 등록 필요" : "",
    !runtime.webhookSecretRef ? "PG_WEBHOOK_SECRET Secret Manager 참조 등록 필요" : "",
    !runtime.officialModuleReceived ? "인피니 공식 모듈/SDK 수령 확인 필요" : "",
    !runtime.officialDocsReviewed ? "인피니 공식 문서 검토 필요" : "",
    !runtime.amountRecalculationEnabled ? "서버 금액 재계산 필수" : "",
    !runtime.webhookSignatureEnabled ? "Webhook 서명 검증 필수" : "",
    merchants.length > 0 && activeMerchantCount === 0 ? "운영 가능한 기업별 MID 1개 이상 필요" : "",
  ].filter(Boolean);

  return {
    ready: blockers.length === 0,
    blockers,
    activeMerchantCount,
    blockedMerchantCount,
  };
}
