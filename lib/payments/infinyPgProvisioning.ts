import type { PgMerchantStatus, PgProvider } from "@/types/commerce";

export const INFINY_PG_SETTINGS_STORAGE_KEY = "a5.admin.infiny-pg-settings";
export const A5_PUBLIC_BASE_URL = "https://a5-closed-mall.pages.dev";
export const A5_FIREBASE_FUNCTIONS_BASE_URL = "https://asia-northeast3-a5-closed-mall.cloudfunctions.net";
export const A5_PAYMENT_WEBHOOK_URL = `${A5_FIREBASE_FUNCTIONS_BASE_URL}/paymentsWebhook`;

export type InfinyPgRuntimeConfig = {
  provider: PgProvider;
  environment: "test" | "production";
  clientKey: string;
  channelKey: string;
  merchantId: string;
  apiBaseUrl: string;
  confirmUrl: string;
  cancelUrl: string;
  statusUrl: string;
  scriptUrl: string;
  requestFunctionName: string;
  successUrl: string;
  failUrl: string;
  webhookUrl: string;
  webhookSignatureHeader: string;
  webhookSignatureAlgorithm: "sha256" | "sha512";
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
  merchantSerialNo: string;
  moduleKey: string;
  terminalId: string;
  secretKeyRef: string;
  merchantPasswordRef: string;
  signKeyRef: string;
  webhookSecretRef: string;
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
  credentialReadyCount: number;
};

export const defaultInfinyPgRuntimeConfig: InfinyPgRuntimeConfig = {
  provider: "infiny",
  environment: "test",
  clientKey: "",
  channelKey: "",
  merchantId: "",
  apiBaseUrl: "",
  confirmUrl: "",
  cancelUrl: "",
  statusUrl: "",
  scriptUrl: "",
  requestFunctionName: "INNOPAY.requestPayment",
  successUrl: `${A5_PUBLIC_BASE_URL}/q/live?code={shortCode}&paymentResult=success`,
  failUrl: `${A5_PUBLIC_BASE_URL}/q/live?code={shortCode}&paymentResult=failed`,
  webhookUrl: A5_PAYMENT_WEBHOOK_URL,
  webhookSignatureHeader: "x-pg-signature",
  webhookSignatureAlgorithm: "sha256",
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
    `NEXT_PUBLIC_PG_REQUEST_FUNCTION=${runtime.requestFunctionName}`,
    `NEXT_PUBLIC_PAYMENT_SUCCESS_URL=${runtime.successUrl}`,
    `NEXT_PUBLIC_PAYMENT_FAIL_URL=${runtime.failUrl}`,
    `NEXT_PUBLIC_PAYMENT_API_BASE_URL=${runtime.apiBaseUrl}`,
    "",
    "# Server values",
    `PG_PROVIDER=${runtime.provider}`,
    `PG_ENVIRONMENT=${runtime.environment}`,
    `PG_API_BASE_URL=${runtime.apiBaseUrl}`,
    `INFINY_API_BASE_URL=${runtime.apiBaseUrl}`,
    `INFINY_CONFIRM_URL=${runtime.confirmUrl}`,
    `INFINY_CANCEL_URL=${runtime.cancelUrl}`,
    `INFINY_STATUS_URL=${runtime.statusUrl}`,
    `PG_CHANNEL_KEY=${runtime.channelKey}`,
    `PAYMENT_WEBHOOK_URL=${runtime.webhookUrl}`,
    `PG_WEBHOOK_SIGNATURE_HEADER=${runtime.webhookSignatureHeader}`,
    `PG_WEBHOOK_SIGNATURE_ALGORITHM=${runtime.webhookSignatureAlgorithm}`,
    `PG_SECRET_KEY=<Secret Manager: ${runtime.secretKeyRef || "등록 필요"}>`,
    `PG_WEBHOOK_SECRET=<Secret Manager: ${runtime.webhookSecretRef || "등록 필요"}>`,
    "",
    "# 기업별 MID는 companies/{companyId}.pg_merchant_id 로 저장합니다.",
    "# 기업별 상세 발급값은 company_pg_credentials/{companyId}에 마스킹/참조값으로 저장합니다.",
    "# 비밀번호, signKey, webhook secret 원문은 Firestore에 저장하지 말고 Secret Manager 참조명만 기록합니다.",
    "# 대표/플랫폼 MID가 별도로 발급된 경우에만 참고값으로 관리합니다.",
    `OPTIONAL_PLATFORM_MERCHANT_ID=${runtime.merchantId}`,
  ].join("\n");
}

export function evaluateInfinyPgProvisioning(
  runtime: InfinyPgRuntimeConfig,
  merchants: InfinyMerchantConfig[] = [],
): InfinyPgProvisioningReadiness {
  const credentialReadyCount = merchants.filter((merchant) =>
    Boolean(
      merchant.merchantId.trim() &&
        merchant.merchantSerialNo.trim() &&
        merchant.moduleKey.trim() &&
        merchant.secretKeyRef.trim() &&
        merchant.merchantPasswordRef.trim() &&
        merchant.signKeyRef.trim() &&
        merchant.webhookSecretRef.trim(),
    ),
  ).length;
  const activeMerchantCount = merchants.filter((merchant) =>
    Boolean(
      merchant.merchantId.trim() &&
        merchant.moduleKey.trim() &&
        merchant.merchantSerialNo.trim() &&
        merchant.secretKeyRef.trim() &&
        merchant.merchantPasswordRef.trim() &&
        merchant.signKeyRef.trim() &&
        merchant.webhookSecretRef.trim() &&
        merchant.merchantStatus === "active",
    ),
  ).length;
  const blockedMerchantCount = Math.max(merchants.length - activeMerchantCount, 0);
  const blockers = [
    !runtime.clientKey ? "공개 client key 입력 필요" : "",
    !runtime.channelKey ? "channel key 입력 필요" : "",
    !runtime.apiBaseUrl ? "결제 API base URL 입력 필요" : "",
    !runtime.confirmUrl && !runtime.apiBaseUrl ? "결제 승인 confirm endpoint 입력 필요" : "",
    !runtime.cancelUrl && !runtime.apiBaseUrl ? "결제 취소 cancel endpoint 입력 필요" : "",
    !runtime.statusUrl && !runtime.apiBaseUrl ? "결제 상태 status endpoint 입력 필요" : "",
    !runtime.scriptUrl ? "브라우저 SDK Script URL 입력 필요" : "",
    !runtime.requestFunctionName ? "브라우저 결제 호출 함수명 입력 필요" : "",
    !runtime.successUrl ? "결제 성공 URL 입력 필요" : "",
    !runtime.failUrl ? "결제 실패 URL 입력 필요" : "",
    !runtime.webhookUrl ? "결제 webhook URL 입력 필요" : "",
    !runtime.webhookSignatureHeader ? "Webhook 서명 헤더명 입력 필요" : "",
    !runtime.secretKeyRef ? "PG_SECRET_KEY Secret Manager 참조 등록 필요" : "",
    !runtime.webhookSecretRef ? "PG_WEBHOOK_SECRET Secret Manager 참조 등록 필요" : "",
    !runtime.officialModuleReceived ? "인피니 공식 모듈/SDK 수령 확인 필요" : "",
    !runtime.officialDocsReviewed ? "인피니 공식 문서 검토 필요" : "",
    !runtime.amountRecalculationEnabled ? "서버 금액 재계산 필수" : "",
    !runtime.webhookSignatureEnabled ? "Webhook 서명 검증 필수" : "",
    merchants.length > 0 && credentialReadyCount === 0 ? "MID, 시리얼, 모듈키, Secret 참조가 입력된 기업 1개 이상 필요" : "",
    merchants.length > 0 && activeMerchantCount === 0 ? "운영 가능한 기업별 PG 발급값 1개 이상 필요" : "",
  ].filter(Boolean);

  return {
    ready: blockers.length === 0,
    blockers,
    activeMerchantCount,
    blockedMerchantCount,
    credentialReadyCount,
  };
}
