export type PaymentFunctionKey =
  | "ready"
  | "startInnopaySms"
  | "syncInnopaySms"
  | "startInnopayVbank"
  | "innopayVbankNoti"
  | "confirm"
  | "returnTrace"
  | "webhook"
  | "cancel"
  | "status"
  | "diagnostics"
  | "a5LinkageDiagnostics"
  | "adminA5sCustomerMonitor"
  | "logMonitor"
  | "adminPgCredentialSave"
  | "adminPgCredentialList"
  | "adminA5sPgCredentialSave"
  | "adminProgramPgRead"
  | "adminProgramPgSave"
  | "adminProgramPgConnectionTest"
  | "adminProgramPartnerSave"
  | "adminPgConnectionTest"
  | "adminPgActivation"
  | "cmsUploadFile"
  | "commerceLiveRead"
  | "companyBetaAuthToken"
  | "companyAccountSecurity"
  | "companyProductUpsert"
  | "companyProductLifecycle"
  | "companySignupSubmit"
  | "companySignupReview"
  | "adminProductReview"
  | "adminProductModeration"
  | "publishStorefrontSnapshot"
  | "adminCancelRequestReview"
  | "analyticsRecordVisit"
  | "analyticsSummary"
  | "companyOrderDeliveryUpdate"
  | "companyOrderOperations"
  | "guestClaimSubmit"
  | "guestOrderContactsRead"
  | "companyIntegrationEventRetry"
  | "integrationEventDelivery"
  | "qrCreate"
  | "qrLookup"
  | "guestShopClaim"
  | "guestShopLookup"
  | "guestShopCartSave"
  | "guestShopCartLookup"
  | "guestShopProducts"
  | "guestShopProductDetail"
  | "guestOrderLookup";

const functionNames: Record<PaymentFunctionKey, string> = {
  ready: "paymentsReady",
  startInnopaySms: "paymentsStartInnopaySms",
  syncInnopaySms: "paymentsSyncInnopaySms",
  startInnopayVbank: "paymentsStartInnopayVbank",
  innopayVbankNoti: "paymentsInnopayVbankNoti",
  confirm: "paymentsConfirm",
  returnTrace: "paymentsReturnTrace",
  webhook: "paymentsWebhook",
  cancel: "paymentsCancel",
  status: "paymentsStatus",
  diagnostics: "paymentsDiagnostics",
  a5LinkageDiagnostics: "a5LinkageDiagnostics",
  adminA5sCustomerMonitor: "adminA5sCustomerMonitor",
  logMonitor: "paymentsLogMonitor",
  adminPgCredentialSave: "adminPgCredentialSave",
  adminPgCredentialList: "adminPgCredentialList",
  adminA5sPgCredentialSave: "adminA5sPgCredentialSave",
  adminProgramPgRead: "adminProgramPgRead",
  adminProgramPgSave: "adminProgramPgSave",
  adminProgramPgConnectionTest: "adminProgramPgConnectionTest",
  adminProgramPartnerSave: "adminProgramPartnerSave",
  adminPgConnectionTest: "adminPgConnectionTest",
  adminPgActivation: "adminPgActivation",
  cmsUploadFile: "cmsUploadFile",
  commerceLiveRead: "commerceLiveRead",
  companyBetaAuthToken: "companyBetaAuthToken",
  companyAccountSecurity: "companyAccountSecurity",
  companyProductUpsert: "companyProductUpsert",
  companyProductLifecycle: "companyProductLifecycle",
  companySignupSubmit: "companySignupSubmit",
  companySignupReview: "companySignupReview",
  adminProductReview: "adminProductReview",
  adminProductModeration: "adminProductModeration",
  publishStorefrontSnapshot: "adminStorefrontSnapshotPublish",
  adminCancelRequestReview: "adminCancelRequestReview",
  analyticsRecordVisit: "analyticsRecordVisit",
  analyticsSummary: "analyticsSummary",
  companyOrderDeliveryUpdate: "companyOrderDeliveryUpdate",
  companyOrderOperations: "companyOrderOperations",
  guestClaimSubmit: "guestClaimSubmit",
  guestOrderContactsRead: "guestOrderContactsRead",
  companyIntegrationEventRetry: "companyIntegrationEventRetry",
  integrationEventDelivery: "integrationEventDelivery",
  qrCreate: "qrCreate",
  qrLookup: "qrLookup",
  guestShopClaim: "guestShopClaim",
  guestShopLookup: "guestShopLookup",
  guestShopCartSave: "guestShopCartSave",
  guestShopCartLookup: "guestShopCartLookup",
  guestShopProducts: "guestShopProducts",
  guestShopProductDetail: "guestShopProductDetail",
  guestOrderLookup: "guestOrderLookup",
};

const productionPaymentFunctionsBaseUrl = "https://asia-northeast3-a5-closed-mall.cloudfunctions.net";

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPaymentFunctionsBaseUrl() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "";
  const inferredFirebaseFunctionsUrl = projectId ? `https://asia-northeast3-${projectId}.cloudfunctions.net` : "";
  const productionFallback = process.env.NODE_ENV === "production" ? productionPaymentFunctionsBaseUrl : "";

  return trimSlash(
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_A5_BACKEND_URL?.trim() ||
      inferredFirebaseFunctionsUrl ||
      productionFallback ||
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
      returnTrace: getPaymentFunctionUrl("returnTrace"),
      webhook: getPaymentFunctionUrl("webhook"),
      cancel: getPaymentFunctionUrl("cancel"),
      status: getPaymentFunctionUrl("status"),
      diagnostics: getPaymentFunctionUrl("diagnostics"),
      a5LinkageDiagnostics: getPaymentFunctionUrl("a5LinkageDiagnostics"),
      adminA5sCustomerMonitor: getPaymentFunctionUrl("adminA5sCustomerMonitor"),
      logMonitor: getPaymentFunctionUrl("logMonitor"),
      adminPgCredentialSave: getPaymentFunctionUrl("adminPgCredentialSave"),
      adminPgCredentialList: getPaymentFunctionUrl("adminPgCredentialList"),
      adminA5sPgCredentialSave: getPaymentFunctionUrl("adminA5sPgCredentialSave"),
      adminProgramPgRead: getPaymentFunctionUrl("adminProgramPgRead"),
      adminProgramPgSave: getPaymentFunctionUrl("adminProgramPgSave"),
      adminProgramPgConnectionTest: getPaymentFunctionUrl("adminProgramPgConnectionTest"),
      adminProgramPartnerSave: getPaymentFunctionUrl("adminProgramPartnerSave"),
      adminPgConnectionTest: getPaymentFunctionUrl("adminPgConnectionTest"),
      adminPgActivation: getPaymentFunctionUrl("adminPgActivation"),
      cmsUploadFile: getPaymentFunctionUrl("cmsUploadFile"),
      commerceLiveRead: getPaymentFunctionUrl("commerceLiveRead"),
      companyBetaAuthToken: getPaymentFunctionUrl("companyBetaAuthToken"),
      companyAccountSecurity: getPaymentFunctionUrl("companyAccountSecurity"),
      companyProductUpsert: getPaymentFunctionUrl("companyProductUpsert"),
      companyProductLifecycle: getPaymentFunctionUrl("companyProductLifecycle"),
      companySignupSubmit: getPaymentFunctionUrl("companySignupSubmit"),
      companySignupReview: getPaymentFunctionUrl("companySignupReview"),
      adminProductReview: getPaymentFunctionUrl("adminProductReview"),
      adminProductModeration: getPaymentFunctionUrl("adminProductModeration"),
      publishStorefrontSnapshot: getPaymentFunctionUrl("publishStorefrontSnapshot"),
      adminCancelRequestReview: getPaymentFunctionUrl("adminCancelRequestReview"),
      analyticsRecordVisit: getPaymentFunctionUrl("analyticsRecordVisit"),
      analyticsSummary: getPaymentFunctionUrl("analyticsSummary"),
      companyOrderDeliveryUpdate: getPaymentFunctionUrl("companyOrderDeliveryUpdate"),
      companyOrderOperations: getPaymentFunctionUrl("companyOrderOperations"),
      guestClaimSubmit: getPaymentFunctionUrl("guestClaimSubmit"),
      guestOrderContactsRead: getPaymentFunctionUrl("guestOrderContactsRead"),
      companyIntegrationEventRetry: getPaymentFunctionUrl("companyIntegrationEventRetry"),
      integrationEventDelivery: getPaymentFunctionUrl("integrationEventDelivery"),
      qrCreate: getPaymentFunctionUrl("qrCreate"),
      qrLookup: getPaymentFunctionUrl("qrLookup"),
      guestShopClaim: getPaymentFunctionUrl("guestShopClaim"),
      guestShopLookup: getPaymentFunctionUrl("guestShopLookup"),
      guestShopCartSave: getPaymentFunctionUrl("guestShopCartSave"),
      guestShopCartLookup: getPaymentFunctionUrl("guestShopCartLookup"),
      guestShopProducts: getPaymentFunctionUrl("guestShopProducts"),
      guestShopProductDetail: getPaymentFunctionUrl("guestShopProductDetail"),
      guestOrderLookup: getPaymentFunctionUrl("guestOrderLookup"),
    },
    missing: baseUrl ? [] : ["NEXT_PUBLIC_PAYMENT_API_BASE_URL or NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  };
}
