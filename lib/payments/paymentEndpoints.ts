export type PaymentFunctionKey =
  | "ready"
  | "confirm"
  | "webhook"
  | "cancel"
  | "status"
  | "diagnostics"
  | "adminPgCredentialSave"
  | "adminPgConnectionTest"
  | "adminPgActivation";

const functionNames: Record<PaymentFunctionKey, string> = {
  ready: "paymentsReady",
  confirm: "paymentsConfirm",
  webhook: "paymentsWebhook",
  cancel: "paymentsCancel",
  status: "paymentsStatus",
  diagnostics: "paymentsDiagnostics",
  adminPgCredentialSave: "adminPgCredentialSave",
  adminPgConnectionTest: "adminPgConnectionTest",
  adminPgActivation: "adminPgActivation",
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
      confirm: getPaymentFunctionUrl("confirm"),
      webhook: getPaymentFunctionUrl("webhook"),
      cancel: getPaymentFunctionUrl("cancel"),
      status: getPaymentFunctionUrl("status"),
      diagnostics: getPaymentFunctionUrl("diagnostics"),
      adminPgCredentialSave: getPaymentFunctionUrl("adminPgCredentialSave"),
      adminPgConnectionTest: getPaymentFunctionUrl("adminPgConnectionTest"),
      adminPgActivation: getPaymentFunctionUrl("adminPgActivation"),
    },
    missing: baseUrl ? [] : ["NEXT_PUBLIC_PAYMENT_API_BASE_URL or NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  };
}
