import type { PgServerReadiness } from "./providerRuntime";

export type FirebasePaymentEndpointContract = {
  name: string;
  method: "GET" | "POST";
  functionName: string;
  owner: "firebase_functions";
  purpose: string;
  realPgRequirement: string;
};

export type FirebasePaymentCollectionContract = {
  collection: string;
  writer: "firebase_functions_admin_sdk";
  clientWrite: "denied";
  readableBy: string[];
  purpose: string;
};

export const firebasePaymentEndpoints: FirebasePaymentEndpointContract[] = [
  {
    name: "Payment ready",
    method: "POST",
    functionName: "paymentsReady",
    owner: "firebase_functions",
    purpose: "Validate QR/cart, recalculate amount from Firestore, and create a payment intent.",
    realPgRequirement: "PG server readiness plus one active company MID/module key.",
  },
  {
    name: "Payment confirm",
    method: "POST",
    functionName: "paymentsConfirm",
    owner: "firebase_functions",
    purpose: "Confirm provider approval, create order/payment ledgers, mark QR paid, and deduct inventory.",
    realPgRequirement: "Provider payment key or transaction id from the browser PG module.",
  },
  {
    name: "Payment webhook",
    method: "POST",
    functionName: "paymentsWebhook",
    owner: "firebase_functions",
    purpose: "Verify provider webhook signature and record idempotent payment events.",
    realPgRequirement: "PG_WEBHOOK_SECRET and provider webhook URL registration.",
  },
  {
    name: "Payment cancel",
    method: "POST",
    functionName: "paymentsCancel",
    owner: "firebase_functions",
    purpose: "Record cancel/refund requests and call configured provider cancel API when ready.",
    realPgRequirement: "Provider payment key, cancel endpoint, PG secret, and refund policy approval.",
  },
  {
    name: "Payment status",
    method: "GET",
    functionName: "paymentsStatus",
    owner: "firebase_functions",
    purpose: "Read safe payment status by paymentIntentId or orderNo without exposing PG secrets.",
    realPgRequirement: "No provider secret is used for local ledger status reads.",
  },
  {
    name: "Payment diagnostics",
    method: "GET",
    functionName: "paymentsDiagnostics",
    owner: "firebase_functions",
    purpose: "Expose non-secret readiness, missing key names, endpoint map, and company MID contract.",
    realPgRequirement: "Used before deployment and after PG key registration.",
  },
];

export const firebasePaymentCollections: FirebasePaymentCollectionContract[] = [
  {
    collection: "payment_intents",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN"],
    purpose: "Prepared server amount, company MID snapshot, and payment intent state.",
  },
  {
    collection: "payments",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN"],
    purpose: "Approved payment ledger with masked provider references.",
  },
  {
    collection: "orders",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN", "NURSERY_ADMIN", "guest order token"],
    purpose: "Order completion ledger. Tablet/customer views must stay date/token limited.",
  },
  {
    collection: "order_items",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN", "COMPANY_ADMIN", "NURSERY_ADMIN", "guest order token"],
    purpose: "Company-scoped line item fulfillment and settlement basis.",
  },
  {
    collection: "payment_events",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN"],
    purpose: "Idempotent provider approval/webhook/cancel event log.",
  },
  {
    collection: "webhook_events",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN"],
    purpose: "Raw provider webhook event receipt, signature state, and duplicate guard.",
  },
  {
    collection: "cancel_requests",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN", "COMPANY_ADMIN", "NURSERY_ADMIN"],
    purpose: "Manual review or provider cancel/refund request queue.",
  },
  {
    collection: "audit_logs",
    writer: "firebase_functions_admin_sdk",
    clientWrite: "denied",
    readableBy: ["SUPER_ADMIN"],
    purpose: "Immutable operational trace for payment state changes.",
  },
];

export const companyMerchantKeyContract = {
  collection: "companies/{companyId}",
  writeOwner: "SUPER_ADMIN approval screen only",
  companyAdminMode: "read-only masked confirmation",
  requiredFields: [
    "pg_provider = infiny",
    "pg_merchant_id or infiny_mid",
    "merchant_serial_no from company_pg_credentials/{companyId}",
    "pg_module_key or infiny_module_key",
    "secret_key_ref from company_pg_credentials/{companyId}",
    "merchant_password_ref from company_pg_credentials/{companyId}",
    "sign_key_ref from company_pg_credentials/{companyId}",
    "webhook_secret_ref from company_pg_credentials/{companyId}",
    "pg_merchant_status = active",
  ],
  optionalFields: ["pg_profile", "pg_channel_key", "infiny_mid_status"],
  rule: "A real payment can start only when the cart contains one company and that company has an active MID/module key.",
};

export const firebasePaymentRuntimeKeys = {
  functionsSecrets: ["PG_SECRET_KEY", "PG_WEBHOOK_SECRET"],
  functionsEnv: [
    "PG_PROVIDER",
    "PG_ENVIRONMENT",
    "PAYMENT_WEBHOOK_URL",
    "PG_API_BASE_URL or PG_CONFIRM_URL",
    "PG_CANCEL_URL or INFINY_CANCEL_URL",
    "PG_STATUS_URL or INFINY_STATUS_URL",
    "PG_WEBHOOK_SIGNATURE_HEADER",
    "PG_WEBHOOK_SIGNATURE_ALGORITHM",
  ],
  nextPublicEnv: [
    "NEXT_PUBLIC_PAYMENT_API_BASE_URL",
    "NEXT_PUBLIC_PG_PROVIDER",
    "NEXT_PUBLIC_PG_CLIENT_KEY",
    "NEXT_PUBLIC_PG_SCRIPT_URL",
    "NEXT_PUBLIC_PG_REQUEST_FUNCTION",
    "NEXT_PUBLIC_PAYMENT_SUCCESS_URL",
    "NEXT_PUBLIC_PAYMENT_FAIL_URL",
  ],
};

export function getFirebasePaymentModuleContract(readiness: PgServerReadiness) {
  return {
    moduleId: "a5-firebase-payment-module",
    ownerRuntime: "Firebase Functions asia-northeast3",
    frontendRuntime: "A5 Pages/Next.js uses public handoff keys only.",
    pgProvider: readiness.provider,
    pgEnvironment: readiness.environment,
    readyForRealPg: readiness.readyForAdapter,
    missingRuntimeKeys: readiness.missingKeys,
    endpoints: firebasePaymentEndpoints,
    serverOwnedCollections: firebasePaymentCollections,
    companyMerchantKeyContract,
    runtimeKeys: firebasePaymentRuntimeKeys,
    guardrails: [
      "Never expose PG_SECRET_KEY, PG_WEBHOOK_SECRET, MID password, serial, or provider admin credentials to Pages/browser code.",
      "Super admin enters approved company MID/module key values; company admin only confirms masked values and status.",
      "One QR/payment intent is limited to one company MID. Split carts by company before payment.",
      "All amount, stock, order, payment, webhook, and cancel ledger writes stay inside Firebase Functions Admin SDK.",
      "Customer/tablet order lookups must expose completed order status only through token/date limited views.",
    ],
  };
}
