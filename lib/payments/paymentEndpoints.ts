export type PaymentFunctionKey =
  | "ready"
  | "startInnopaySms"
  | "syncInnopaySms"
  | "startInnopayVbank"
  | "innopayVbankNoti"
  | "confirm"
  | "webhook"
  | "cancel"
  | "status"
  | "diagnostics"
  | "adminPgCredentialSave"
  | "adminPgConnectionTest"
  | "adminPgActivation"
  | "companySignupReview";

const functionNames: Record<PaymentFunctionKey, string> = {
  ready: "paymentsReady",
  startInnopaySms: "paymentsStartInnopaySms",
  syncInnopaySms: "paymentsSyncInnopaySms",
  startInnopayVbank: "paymentsStartInnopayVbank",
  innopayVbankNoti: "paymentsInnopayVbankNoti",
  confirm: "paymentsConfirm",
  webhook: "paymentsWebhook",
  cancel: "paymentsCancel",
  status: "paymentsStatus",
  diagnostics: "paymentsDiagnostics",
  adminPgCredentialSave: "adminPgCredentialSave",
  adminPgConnectionTest: "adminPgConnectionTest",
  adminPgActivation: "adminPgActivation",
  companySignupReview: "companySignupReview",
};

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPaymentFunctionsBaseUrl() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "";
  const inferredFirebaseFunctionsUrl = projectId ? `https://asia-northeast3-${projectId}.cloudfunctions.net` : "";

  return trimSlash(
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_A5_BACKEND_URL?.trim() ||
      inferredFirebaseFunctionsUrl ||
      "",
  );
}

export function getPaymentFunctionUrl(key: PaymentFunctionKey) {
  const baseUrl = getPaymentFunctionsBaseUrl();
  return baseUrl ? `${baseUrl}/${functionNames[key]}` : "";
}

export function getPaymentEndpointReadiness() {
  const baseUrl = getPaymentFunctionsBaseUrl();

  return {
    ready: Boolean(baseUrl),
    baseUrl,
    endpoints: {
      ready: getPaymentFunctionUrl("ready"),
      startInnopaySms: getPaymentFunctionUrl("startInnopaySms"),
      syncInnopaySms: getPaymentFunctionUrl("syncInnopaySms"),
      startInnopayVbank: getPaymentFunctionUrl("startInnopayVbank"),
      innopayVbankNoti: getPaymentFunctionUrl("innopayVbankNoti"),
      confirm: getPaymentFunctionUrl("confirm"),
      webhook: getPaymentFunctionUrl("webhook"),
      cancel: getPaymentFunctionUrl("cancel"),
      status: getPaymentFunctionUrl("status"),
      diagnostics: getPaymentFunctionUrl("diagnostics"),
      adminPgCredentialSave: getPaymentFunctionUrl("adminPgCredentialSave"),
      adminPgConnectionTest: getPaymentFunctionUrl("adminPgConnectionTest"),
      adminPgActivation: getPaymentFunctionUrl("adminPgActivation"),
      companySignupReview: getPaymentFunctionUrl("companySignupReview"),
    },
    missing: baseUrl ? [] : ["NEXT_PUBLIC_PAYMENT_API_BASE_URL or NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  };
}
