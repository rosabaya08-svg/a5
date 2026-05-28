import { sendJson, type HttpRequestLike, type HttpResponseLike } from "./types";
import { canUseCredentialVault } from "./credentialCrypto";
import { getAdminDb } from "../firebaseAdmin";
import { getProviderAdapterSlot } from "./providerAdapter";
import { getFirebasePaymentModuleContract } from "./moduleContract";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import { readInnopayRuntimeSettings } from "./innopayRuntime";

const publicKeys = [
  "NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL",
  "NEXT_PUBLIC_A5_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_PG_PROVIDER",
  "NEXT_PUBLIC_PG_ENVIRONMENT",
  "NEXT_PUBLIC_PG_CLIENT_KEY",
  "NEXT_PUBLIC_PG_GLOBAL_NAME",
  "NEXT_PUBLIC_PG_REQUEST_METHOD",
  "NEXT_PUBLIC_PG_SCRIPT_URL",
  "NEXT_PUBLIC_PG_REQUEST_FUNCTION",
  "NEXT_PUBLIC_PAYMENT_SUCCESS_URL",
  "NEXT_PUBLIC_PAYMENT_FAIL_URL",
  "NEXT_PUBLIC_PAYMENT_API_BASE_URL",
] as const;

const serverKeys = [
  "PG_PROVIDER",
  "PG_ENVIRONMENT",
  "PG_SECRET_KEY",
  "PG_CREDENTIAL_ENCRYPTION_KEY",
  "PG_MERCHANT_ID",
  "PG_CHANNEL_KEY",
  "PG_WEBHOOK_SECRET",
  "PAYMENT_WEBHOOK_URL",
  "PG_API_BASE_URL",
  "PG_CONFIRM_URL",
  "PG_CANCEL_URL",
  "PG_STATUS_URL",
  "INFINY_CONFIRM_URL",
  "INFINY_API_BASE_URL",
  "INFINY_CANCEL_URL",
  "INFINY_STATUS_URL",
  "INNOPAY_API_BASE_URL",
  "INNOPAY_PAYMENT_MODE",
  "INNOPAY_SMS_API_ENABLED",
  "INNOPAY_VBANK_API_ENABLED",
  "INNOPAY_REAL_CALLS_ENABLED",
  "INNOPAY_DEFAULT_MID",
  "INNOPAY_DEFAULT_MERCHANT_KEY",
  "INNOPAY_DEFAULT_LICENSE_KEY",
  "INNOPAY_DEFAULT_CANCEL_PWD",
  "INNOPAY_SMS_SVC_PRDT_CD",
  "PG_WEBHOOK_SIGNATURE_HEADER",
  "PG_WEBHOOK_SIGNATURE_ALGORITHM",
] as const;

type FirestoreCredentialSummary = {
  companyId: string;
  companyName: string;
  provider: string;
  status: string;
  environment: string;
  midMasked: string;
  hasMid: boolean;
  hasMerchantKey: boolean;
  hasLicenseKey: boolean;
  hasCancelPwd: boolean;
  hasWebhookSecret: boolean;
  smsStartReady: boolean;
  smsConfirmReady: boolean;
  vbankReady: boolean;
  cancelReady: boolean;
};

type FirestoreInnopayDiagnostics = {
  runtime: {
    exists: boolean;
    provider: string;
    status: string;
    apiBaseUrl: string;
    paymentMode: string;
    smsEnabled: boolean;
    vbankEnabled: boolean;
    realCallsEnabled: boolean;
    smsSvcPrdtCd: string;
  };
  credentials: {
    total: number;
    active: number;
    activeMidCount: number;
    smsStartReadyCount: number;
    smsConfirmReadyCount: number;
    vbankReadyCount: number;
    cancelReadyCount: number;
    rows: FirestoreCredentialSummary[];
  };
  readiness: {
    readyForSmsStart: boolean;
    readyForSmsConfirm: boolean;
    readyForVbank: boolean;
    readyForCancel: boolean;
    realPgCanBeCalled: boolean;
    missing: string[];
  };
};

function presence(keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, Boolean(process.env[key]?.trim())]));
}

export async function paymentsDiagnosticsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for payment diagnostics.",
        httpStatus: 405,
      },
    });
    return;
  }

  const readiness = getPgServerReadiness();
  const firestoreInnopay = await readFirestoreInnopayDiagnostics();
  const contract = getFirebasePaymentModuleContract(readiness);
  const effectiveProvider = firestoreInnopay.runtime.provider || readiness.provider;
  const realPgCanBeCalled = readiness.readyForAdapter || firestoreInnopay.readiness.realPgCanBeCalled;
  const adapterSlot = getProviderAdapterSlot(effectiveProvider);

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions",
    pgReadiness: readiness,
    firestoreInnopay,
    publicKeyPresence: presence(publicKeys),
    serverKeyPresence: presence(serverKeys),
    realPgCanBeCalled,
    credentialVaultReady: canUseCredentialVault(),
    adapterSlot: {
      ...adapterSlot,
      enabled: realPgCanBeCalled && adapterSlot.candidate !== "unknown",
      blockedOperations: realPgCanBeCalled ? ["real_settlement"] : adapterSlot.blockedOperations,
    },
    paymentModuleContract: contract,
    handoff: getPgAdapterHandoffPlan(),
    message: realPgCanBeCalled
      ? "A real PG path is enabled. Each payment still requires a matching active company credential and server amount validation."
      : `Real PG remains blocked: ${firestoreInnopay.readiness.missing.join(", ") || readiness.missingKeys.join(", ") || "provider/runtime readiness is incomplete"}.`,
  });
}

async function readFirestoreInnopayDiagnostics(): Promise<FirestoreInnopayDiagnostics> {
  const db = getAdminDb();
  const [runtimeSnapshot, runtime, credentialSnapshot] = await Promise.all([
    db.collection("pg_provider_settings").doc("infiny").get(),
    readInnopayRuntimeSettings(db),
    db.collection("company_pg_credentials").limit(100).get(),
  ]);
  const runtimeData = runtimeSnapshot.data() ?? {};
  const provider = text(runtimeData.provider) || "infiny";
  const status = text(runtimeData.status) || (runtime.realCallsEnabled ? "active" : "draft");
  const rows = credentialSnapshot.docs
    .map((doc) => summarizeCredential(doc.id, doc.data()))
    .filter((row) => row.provider === "infiny" || row.provider === "infini" || row.provider === "innopay");
  const active = rows.filter((row) => row.status === "active");
  const smsStartReadyCount = rows.filter((row) => row.smsStartReady).length;
  const smsConfirmReadyCount = rows.filter((row) => row.smsConfirmReady).length;
  const vbankReadyCount = rows.filter((row) => row.vbankReady).length;
  const cancelReadyCount = rows.filter((row) => row.cancelReady).length;
  const missing = [
    !runtimeSnapshot.exists ? "pg_provider_settings/infiny" : "",
    !runtime.apiBaseUrl ? "InnoPay API base URL" : "",
    !runtime.smsEnabled && !runtime.vbankEnabled ? "SMS or vbank API enabled flag" : "",
    !runtime.realCallsEnabled ? "real PG call switch" : "",
    active.length === 0 ? "active company PG credential" : "",
    active.every((row) => !row.hasMid) ? "active company MID" : "",
    runtime.smsEnabled && smsStartReadyCount === 0 ? "SMS start-ready MID" : "",
    runtime.smsEnabled && smsConfirmReadyCount === 0 ? "Merchant-Key for SMS transaction lookup" : "",
    runtime.vbankEnabled && vbankReadyCount === 0 ? "licenseKey for vbank API" : "",
    cancelReadyCount === 0 ? "cancelPwd for cancelApi" : "",
  ].filter(Boolean);

  const readyForSmsStart = runtime.smsEnabled && runtime.realCallsEnabled && smsStartReadyCount > 0;
  const readyForSmsConfirm = runtime.smsEnabled && runtime.realCallsEnabled && smsConfirmReadyCount > 0;
  const readyForVbank = runtime.vbankEnabled && runtime.realCallsEnabled && vbankReadyCount > 0;
  const readyForCancel = runtime.realCallsEnabled && cancelReadyCount > 0;

  return {
    runtime: {
      exists: runtimeSnapshot.exists,
      provider,
      status,
      apiBaseUrl: runtime.apiBaseUrl,
      paymentMode: runtime.paymentMode,
      smsEnabled: runtime.smsEnabled,
      vbankEnabled: runtime.vbankEnabled,
      realCallsEnabled: runtime.realCallsEnabled,
      smsSvcPrdtCd: runtime.smsSvcPrdtCd,
    },
    credentials: {
      total: rows.length,
      active: active.length,
      activeMidCount: active.filter((row) => row.hasMid).length,
      smsStartReadyCount,
      smsConfirmReadyCount,
      vbankReadyCount,
      cancelReadyCount,
      rows,
    },
    readiness: {
      readyForSmsStart,
      readyForSmsConfirm,
      readyForVbank,
      readyForCancel,
      realPgCanBeCalled: readyForSmsStart || readyForSmsConfirm || readyForVbank || readyForCancel,
      missing,
    },
  };
}

function summarizeCredential(companyId: string, data: Record<string, unknown>): FirestoreCredentialSummary {
  const provider = text(data.provider) || "infiny";
  const status = text(data.credential_status ?? data.status) || "not_applied";
  const mid = text(data.mid ?? data.merchant_id ?? data.merchantId);
  const hasMerchantKey = hasCredential(data.encrypted_sign_key, data.sign_key_ref);
  const hasLicenseKey = hasCredential(data.encrypted_secret_key, data.secret_key_ref);
  const hasCancelPwd = hasCredential(data.encrypted_merchant_password, data.merchant_password_ref);
  const hasWebhookSecret = hasCredential(data.encrypted_webhook_secret, data.webhook_secret_ref);
  const active = status === "active";

  return {
    companyId,
    companyName: text(data.company_name ?? data.companyName) || companyId,
    provider,
    status,
    environment: text(data.environment) || "test",
    midMasked: maskValue(mid),
    hasMid: Boolean(mid),
    hasMerchantKey,
    hasLicenseKey,
    hasCancelPwd,
    hasWebhookSecret,
    smsStartReady: active && Boolean(mid),
    smsConfirmReady: active && Boolean(mid && hasMerchantKey),
    vbankReady: active && Boolean(mid && hasLicenseKey),
    cancelReady: active && Boolean(mid && hasCancelPwd),
  };
}

function hasCredential(encrypted: unknown, reference: unknown): boolean {
  return isEncryptedCredentialShape(encrypted) || Boolean(text(reference));
}

function isEncryptedCredentialShape(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { version?: unknown; iv?: unknown; authTag?: unknown; ciphertext?: unknown };
  return candidate.version === "aes-256-gcm:v1" &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.ciphertext === "string";
}

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}-${"*".repeat(Math.max(value.length - 8, 4))}-${value.slice(-4)}`;
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
