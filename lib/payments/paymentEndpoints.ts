export type PaymentFunctionKey = "ready" | "confirm" | "webhook" | "cancel" | "status";

const functionNames: Record<PaymentFunctionKey, string> = {
  ready: "paymentsReady",
  confirm: "paymentsConfirm",
  webhook: "paymentsWebhook",
  cancel: "paymentsCancel",
  status: "paymentsStatus",
};

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPaymentFunctionsBaseUrl() {
  return trimSlash(
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_A5_BACKEND_URL?.trim() ||
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
    },
    missing: baseUrl ? [] : ["NEXT_PUBLIC_PAYMENT_API_BASE_URL"],
  };
}
