import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { canUseCredentialVault, encryptCredential, type EncryptedCredential } from "./credentialCrypto";
import { getPgServerReadiness, isInnopaySmsApiMode } from "./providerRuntime";
import {
  readObjectBody,
  requirePost,
  sendJson,
  type CompanyMerchantProfile,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentProviderId,
} from "./types";

type AdminPgCredentialRequest = {
  companyId: string;
  companyName?: string;
  provider?: PaymentProviderId;
  environment?: "test" | "production";
  mid?: string;
  merchantId?: string;
  merchantSerialNo?: string;
  moduleKey?: string;
  terminalId?: string;
  secretKeyRef?: string;
  merchantPasswordRef?: string;
  signKeyRef?: string;
  webhookSecretRef?: string;
  secretKey?: string;
  merchantPassword?: string;
  signKey?: string;
  webhookSecret?: string;
  status?: CompanyMerchantProfile["merchantStatus"];
  runtimeSettings?: AdminPgRuntimeSettingsRequest;
};

type AdminPgRuntimeSettingsRequest = {
  apiBaseUrl?: string;
  paymentMode?: "sms" | "vbank" | "rest";
  smsEnabled?: boolean;
  vbankEnabled?: boolean;
  realCallsEnabled?: boolean;
  smsSvcPrdtCd?: "03" | "04";
  vbankNotiUrl?: string;
  documentedEndpoints?: unknown[];
};

type AdminPgActivationRequest = {
  companyId: string;
  action?: "activate" | "pause" | "block";
};

const allowedProviders: PaymentProviderId[] = ["mock", "pg_contract", "infiny", "toss", "portone", "kcp", "nice"];
const allowedStatuses: CompanyMerchantProfile["merchantStatus"][] = ["not_applied", "in_review", "mid_issued", "active", "blocked"];
const masterAdminEmail = "rosabaya08@gmail.com";

export async function adminPgCredentialSaveHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  if (!(await requireSuperAdmin(request, response))) return;

  const body = readObjectBody<AdminPgCredentialRequest>(request);
  const companyId = text(body.companyId);

  if (!companyId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ADMIN_PG_COMPANY_ID_REQUIRED",
        message: "companyId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const now = new Date().toISOString();
  const db = getAdminDb();
  const existingSnapshot = await db.collection("company_pg_credentials").doc(companyId).get();
  const existingCredential = existingSnapshot.data() ?? {};
  const bodyRecord = body as Record<string, unknown>;
  const provider = allowedProviders.includes(body.provider as PaymentProviderId) ? (body.provider as PaymentProviderId) : "infiny";
  const merchantId = firstText(body.mid, body.merchantId, bodyRecord.merchant_id, bodyRecord.pg_merchant_id, bodyRecord.infiny_mid);
  const merchantSerialNo = firstText(body.merchantSerialNo, bodyRecord.merchant_serial_no, bodyRecord.serialNo, bodyRecord.serial_no, bodyRecord.serialNumber);
  const moduleKey = firstText(body.moduleKey, bodyRecord.module_key, bodyRecord.pg_module_key, bodyRecord.infiny_module_key, bodyRecord.channelKey, bodyRecord.channel_key);
  const terminalId = firstText(body.terminalId, bodyRecord.terminal_id, bodyRecord.tid, bodyRecord.terminalNo);
  const secretKeyRef = firstText(body.secretKeyRef, bodyRecord.secret_key_ref, bodyRecord.pgSecretKeyRef);
  const merchantPasswordRef = firstText(body.merchantPasswordRef, bodyRecord.merchant_password_ref, bodyRecord.password_ref, bodyRecord.merchantPwdRef);
  const signKeyRef = firstText(body.signKeyRef, bodyRecord.sign_key_ref, bodyRecord.hashKeyRef, bodyRecord.signatureKeyRef);
  const webhookSecretRef = firstText(body.webhookSecretRef, bodyRecord.webhook_secret_ref, bodyRecord.webhookKeyRef);
  const rawSecretKey = firstText(body.secretKey, bodyRecord.secret_key, bodyRecord.pgSecretKey, bodyRecord.apiKey, bodyRecord.issuedSecretKey);
  const rawMerchantPassword = firstText(body.merchantPassword, bodyRecord.merchant_password, bodyRecord.password, bodyRecord.merchantPwd);
  const rawSignKey = firstText(body.signKey, bodyRecord.sign_key, bodyRecord.hashKey, bodyRecord.signatureKey);
  const rawWebhookSecret = firstText(body.webhookSecret, bodyRecord.webhook_secret, bodyRecord.webhookKey);
  const effectiveMerchantId = merchantId || text(existingCredential.mid ?? existingCredential.merchant_id ?? existingCredential.merchantId);
  const effectiveMerchantSerialNo = merchantSerialNo || text(existingCredential.merchant_serial_no ?? existingCredential.merchantSerialNo);
  const effectiveModuleKey = moduleKey || text(existingCredential.module_key ?? existingCredential.moduleKey);
  const effectiveTerminalId = terminalId || text(existingCredential.terminal_id ?? existingCredential.terminalId);
  let encryptedSecretKey: EncryptedCredential | undefined;
  let encryptedMerchantPassword: EncryptedCredential | undefined;
  let encryptedSignKey: EncryptedCredential | undefined;
  let encryptedWebhookSecret: EncryptedCredential | undefined;

  try {
    encryptedSecretKey = encryptCredential(rawSecretKey);
    encryptedMerchantPassword = encryptCredential(rawMerchantPassword);
    encryptedSignKey = encryptCredential(rawSignKey);
    encryptedWebhookSecret = encryptCredential(rawWebhookSecret);
  } catch (error) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_PG_CREDENTIAL_VAULT_REQUIRED",
        message: error instanceof Error ? error.message : "PG credential encryption key is required.",
        httpStatus: 409,
      },
    });
    return;
  }

  const effectiveSecretKeyRef = secretKeyRef || text(existingCredential.secret_key_ref);
  const effectiveMerchantPasswordRef = merchantPasswordRef || text(existingCredential.merchant_password_ref);
  const effectiveSignKeyRef = signKeyRef || text(existingCredential.sign_key_ref);
  const effectiveWebhookSecretRef = webhookSecretRef || text(existingCredential.webhook_secret_ref);
  const hasSecretKey = Boolean(encryptedSecretKey || isEncryptedCredentialShape(existingCredential.encrypted_secret_key) || effectiveSecretKeyRef);
  const hasMerchantPassword = Boolean(encryptedMerchantPassword || isEncryptedCredentialShape(existingCredential.encrypted_merchant_password) || effectiveMerchantPasswordRef);
  const hasSignKey = Boolean(encryptedSignKey || isEncryptedCredentialShape(existingCredential.encrypted_sign_key) || effectiveSignKeyRef);
  const hasWebhookSecret = Boolean(encryptedWebhookSecret || isEncryptedCredentialShape(existingCredential.encrypted_webhook_secret) || effectiveWebhookSecretRef);
  const smsApiMode = isInnopaySmsApiMode(provider);
  const existingStatus = allowedStatuses.includes(existingCredential.status as CompanyMerchantProfile["merchantStatus"])
    ? (existingCredential.status as CompanyMerchantProfile["merchantStatus"])
    : allowedStatuses.includes(existingCredential.credential_status as CompanyMerchantProfile["merchantStatus"])
      ? (existingCredential.credential_status as CompanyMerchantProfile["merchantStatus"])
      : undefined;
  const incomingHasAnyCredentialValue = Boolean(
    merchantId ||
      merchantSerialNo ||
      moduleKey ||
      terminalId ||
      secretKeyRef ||
      merchantPasswordRef ||
      signKeyRef ||
      webhookSecretRef ||
      rawSecretKey ||
      rawMerchantPassword ||
      rawSignKey ||
      rawWebhookSecret,
  );
  const requestedStatus = allowedStatuses.includes(body.status as CompanyMerchantProfile["merchantStatus"])
    ? (body.status as CompanyMerchantProfile["merchantStatus"])
    : existingStatus ?? "mid_issued";
  const credentialReady = smsApiMode
    ? Boolean(effectiveMerchantId)
    : Boolean(effectiveMerchantId && effectiveMerchantSerialNo && effectiveModuleKey && hasSecretKey && hasMerchantPassword && hasSignKey && hasWebhookSecret);
  const protectedRequestedStatus = requestedStatus === "not_applied" && existingStatus === "active" && !incomingHasAnyCredentialValue ? "active" : requestedStatus;
  const status = protectedRequestedStatus === "active" && !credentialReady ? "mid_issued" : protectedRequestedStatus;
  const encryptedCredentialStored = Boolean(
    encryptedSecretKey ||
      encryptedMerchantPassword ||
      encryptedSignKey ||
      encryptedWebhookSecret ||
      isEncryptedCredentialShape(existingCredential.encrypted_secret_key) ||
      isEncryptedCredentialShape(existingCredential.encrypted_merchant_password) ||
      isEncryptedCredentialShape(existingCredential.encrypted_sign_key) ||
      isEncryptedCredentialShape(existingCredential.encrypted_webhook_secret),
  );
  const credentialDoc = {
    company_id: companyId,
    company_name: text(body.companyName) || companyId,
    provider,
    environment: body.environment === "production" ? "production" : "test",
    mid: effectiveMerchantId || null,
    merchant_id: effectiveMerchantId || null,
    merchant_id_masked: maskValue(effectiveMerchantId, "MID 대기"),
    merchant_serial_no: effectiveMerchantSerialNo || null,
    merchant_serial_no_masked: maskValue(effectiveMerchantSerialNo, "시리얼 대기"),
    module_key: effectiveModuleKey || null,
    module_key_masked: maskValue(effectiveModuleKey, "모듈키 대기"),
    terminal_id: effectiveTerminalId || null,
    terminal_id_masked: maskValue(effectiveTerminalId, "터미널 대기"),
    merchantId: effectiveMerchantId || null,
    merchantSerialNo: effectiveMerchantSerialNo || null,
    moduleKey: effectiveModuleKey || null,
    terminalId: effectiveTerminalId || null,
    secret_key_ref: effectiveSecretKeyRef || null,
    secret_key_ref_masked: maskValue(effectiveSecretKeyRef, "Secret 참조 대기"),
    ...(encryptedSecretKey ? { encrypted_secret_key: encryptedSecretKey } : {}),
    merchant_password_ref: effectiveMerchantPasswordRef || null,
    merchant_password_ref_masked: maskValue(effectiveMerchantPasswordRef, "비밀번호 참조 대기"),
    ...(encryptedMerchantPassword ? { encrypted_merchant_password: encryptedMerchantPassword } : {}),
    sign_key_ref: effectiveSignKeyRef || null,
    sign_key_ref_masked: maskValue(effectiveSignKeyRef, "SignKey 참조 대기"),
    ...(encryptedSignKey ? { encrypted_sign_key: encryptedSignKey } : {}),
    webhook_secret_ref: effectiveWebhookSecretRef || null,
    webhook_secret_ref_masked: maskValue(effectiveWebhookSecretRef, "Webhook Secret 참조 대기"),
    ...(encryptedWebhookSecret ? { encrypted_webhook_secret: encryptedWebhookSecret } : {}),
    credential_ready: credentialReady,
    credential_status: status,
    status,
    raw_secret_stored: false,
    encrypted_secret_stored: encryptedCredentialStored,
    secret_storage_policy: encryptedCredentialStored
      ? "firebase_functions_encrypted_firestore_vault"
      : "secret_manager_reference_only",
    vault_ready: canUseCredentialVault(),
    updated_at: FieldValue.serverTimestamp(),
  };
  const runtimeSettingsDoc = normalizeInnopayRuntimeSettings(body.runtimeSettings, provider);

  await db.runTransaction(async (transaction) => {
    if (runtimeSettingsDoc) {
      transaction.set(db.collection("pg_provider_settings").doc("infiny"), runtimeSettingsDoc, { merge: true });
    }

    transaction.set(db.collection("company_pg_credentials").doc(companyId), credentialDoc, { merge: true });
    transaction.set(
      db.collection("companies").doc(companyId),
      {
        company_id: companyId,
        name: text(body.companyName) || companyId,
        pg_provider: provider,
        pg_merchant_id: effectiveMerchantId || null,
        pg_module_key: effectiveModuleKey || null,
        pg_merchant_status: status,
        infiny_mid: effectiveMerchantId || null,
        infiny_module_key: effectiveModuleKey || null,
        infiny_mid_status: status,
        pg_profile: {
          provider,
          providerLabel: provider === "infiny" ? "인피니 PG" : provider,
          merchantId: effectiveMerchantId || null,
          merchantIdMasked: maskValue(effectiveMerchantId, "MID 대기"),
          merchantSerialNoStored: Boolean(effectiveMerchantSerialNo),
          merchantSerialNoMasked: maskValue(effectiveMerchantSerialNo, "시리얼 대기"),
          moduleKey: effectiveModuleKey || null,
          moduleKeyMasked: maskValue(effectiveModuleKey, "모듈키 대기"),
          terminalIdStored: Boolean(effectiveTerminalId),
          terminalIdMasked: maskValue(effectiveTerminalId, "터미널 대기"),
          secretKeyRefMasked: maskValue(effectiveSecretKeyRef, "Secret 참조 대기"),
          merchantPasswordRefMasked: maskValue(effectiveMerchantPasswordRef, "비밀번호 참조 대기"),
          signKeyRefMasked: maskValue(effectiveSignKeyRef, "SignKey 참조 대기"),
          webhookSecretRefMasked: maskValue(effectiveWebhookSecretRef, "Webhook Secret 참조 대기"),
          credentialRefsStored: Boolean(effectiveSecretKeyRef || effectiveMerchantPasswordRef || effectiveSignKeyRef || effectiveWebhookSecretRef),
          encryptedCredentialStored,
          merchantStatus: status,
          credentialReady,
          adminManaged: true,
          companyEditable: false,
          settlementOwner: "infiny",
          settlementExecutionBlocked: true,
        },
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(db.collection("payment_audit_logs").doc(), {
      actorType: "SUPER_ADMIN",
      action: "admin_pg_credential_save",
      targetType: "company_pg_credentials",
      targetId: companyId,
      after: redactCredentialDocument(credentialDoc),
      createdAt: now,
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection("audit_logs").doc(), {
      ...toAuditLogDocument(
        createAuditLogDraft({
          action: "admin_pg_credential_save",
          target: companyId,
          severity: credentialReady ? "info" : "warning",
          message: encryptedCredentialStored
            ? "Company PG credentials were stored in the encrypted Firebase Functions vault."
            : "Company PG credential references were saved without raw secret values.",
        }),
      ),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    companyId,
    credentialReady,
    status,
    rawSecretStored: false,
    message: credentialReady
      ? "기업별 PG 발급값 참조가 저장되었습니다. 연결 테스트 후 운영 활성화할 수 있습니다."
      : "저장했습니다. MID, 시리얼, 모듈키, Secret 참조값을 모두 채워야 운영 활성화가 가능합니다.",
  });
}

export async function adminPgConnectionTestHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  if (!(await requireSuperAdmin(request, response))) return;

  const body = readObjectBody<AdminPgActivationRequest>(request);
  const companyId = text(body.companyId);

  if (!companyId) {
    sendJson(response, 400, { ok: false, error: { code: "ADMIN_PG_COMPANY_ID_REQUIRED", message: "companyId is required.", httpStatus: 400 } });
    return;
  }

  const credentialSnapshot = await getAdminDb().collection("company_pg_credentials").doc(companyId).get();
  const credential = credentialSnapshot.data() ?? {};
  const runtimeReadiness = await readFirestorePgRuntimeReadiness();
  const pgReadiness = getPgServerReadiness();
  const smsApiMode = isInnopaySmsApiMode(String(credential.provider ?? "infiny"));
  const blockers = [
    ...runtimeReadiness.blockers,
    !text(credential.mid ?? credential.merchant_id) ? "company MID" : "",
    !smsApiMode && !text(credential.merchant_serial_no) ? "merchant serial number" : "",
    !smsApiMode && !text(credential.module_key) ? "module key" : "",
    !smsApiMode && !hasCredential(credential.encrypted_secret_key, credential.secret_key_ref) ? "secret key" : "",
    !smsApiMode && !hasCredential(credential.encrypted_merchant_password, credential.merchant_password_ref) ? "merchant password" : "",
    !hasCredential(credential.encrypted_sign_key, credential.sign_key_ref) ? "sign key" : "",
    !smsApiMode && !hasCredential(credential.encrypted_webhook_secret, credential.webhook_secret_ref) ? "webhook secret" : "",
  ].filter(Boolean);
  const ready = blockers.length === 0;

  await getAdminDb().collection("company_pg_credentials").doc(companyId).set(
    {
      last_connection_test_at: new Date().toISOString(),
      last_connection_test_status: ready ? "passed" : "failed",
      last_connection_test_blockers: blockers,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  sendJson(response, ready ? 200 : 409, {
    ok: ready,
    companyId,
    pgReadiness: { ...pgReadiness, firestoreRuntime: runtimeReadiness },
    blockers,
    message: ready ? "PG 연결 준비 조건을 통과했습니다." : "PG 연결 준비 조건이 부족합니다.",
  });
}

export async function adminPgActivationHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  if (!(await requireSuperAdmin(request, response))) return;

  const body = readObjectBody<AdminPgActivationRequest>(request);
  const companyId = text(body.companyId);
  const action = body.action ?? "activate";

  if (!companyId) {
    sendJson(response, 400, { ok: false, error: { code: "ADMIN_PG_COMPANY_ID_REQUIRED", message: "companyId is required.", httpStatus: 400 } });
    return;
  }

  const db = getAdminDb();
  const credentialSnapshot = await db.collection("company_pg_credentials").doc(companyId).get();
  const credential = credentialSnapshot.data() ?? {};
  const runtimeReadiness = await readFirestorePgRuntimeReadiness();
  const smsApiMode = isInnopaySmsApiMode(String(credential.provider ?? "infiny"));
  const canActivate = Boolean(
    text(credential.mid ?? credential.merchant_id) &&
      (smsApiMode || text(credential.merchant_serial_no)) &&
      (smsApiMode || text(credential.module_key)) &&
      (smsApiMode || hasCredential(credential.encrypted_secret_key, credential.secret_key_ref)) &&
      (smsApiMode || hasCredential(credential.encrypted_merchant_password, credential.merchant_password_ref)) &&
      hasCredential(credential.encrypted_sign_key, credential.sign_key_ref) &&
      (smsApiMode || hasCredential(credential.encrypted_webhook_secret, credential.webhook_secret_ref)) &&
      runtimeReadiness.ready,
  );

  if (action === "activate" && !canActivate) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_PG_ACTIVATION_BLOCKED",
        message: "MID, serial number, module key, Secret values, and Infiny runtime endpoints are required before activation.",
        httpStatus: 409,
        details: { runtimeBlockers: runtimeReadiness.blockers },
      },
    });
    return;
  }

  const status: CompanyMerchantProfile["merchantStatus"] = action === "activate" ? "active" : action === "block" ? "blocked" : "mid_issued";
  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("company_pg_credentials").doc(companyId), { status, credential_status: status, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(db.collection("companies").doc(companyId), { pg_merchant_status: status, infiny_mid_status: status, merchantStatus: status, "pg_profile.merchantStatus": status, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(db.collection("payment_audit_logs").doc(), {
      actorType: "SUPER_ADMIN",
      action: `admin_pg_${action}`,
      targetType: "company_pg_credentials",
      targetId: companyId,
      after: { status },
      createdAt: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    companyId,
    status,
    message: action === "activate" ? "기업 PG 결제를 운영 활성화했습니다." : "기업 PG 상태를 변경했습니다.",
  });
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "";
}

function normalizeInnopayRuntimeSettings(input: AdminPgRuntimeSettingsRequest | undefined, provider: PaymentProviderId) {
  if (!input || provider !== "infiny") return undefined;

  const apiBaseUrl = text(input.apiBaseUrl) || "https://api.innopay.co.kr";
  const paymentMode = input.paymentMode === "vbank" || input.paymentMode === "rest" ? input.paymentMode : "sms";
  const smsSvcPrdtCd = input.smsSvcPrdtCd === "04" ? "04" : "03";
  const documentedEndpoints = Array.isArray(input.documentedEndpoints) ? input.documentedEndpoints.slice(0, 20) : [];

  return {
    provider: "infiny",
    environment: "test",
    mode: "innopay_rest",
    status: input.realCallsEnabled ? "active" : "draft",
    api_base_url: apiBaseUrl,
    apiBaseUrl,
    payment_mode: paymentMode,
    innopay_sms_api_enabled: Boolean(input.smsEnabled),
    innopay_vbank_api_enabled: Boolean(input.vbankEnabled),
    innopay_real_calls_enabled: Boolean(input.realCallsEnabled),
    sms_svc_prdt_cd: smsSvcPrdtCd,
    vbank_noti_url: text(input.vbankNotiUrl),
    documented_endpoints: documentedEndpoints,
    raw_secret_stored: false,
    secret_storage_policy: "functions_encrypted_vault_or_secret_manager",
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function readFirestorePgRuntimeReadiness(): Promise<{ ready: boolean; blockers: string[] }> {
  try {
    const db = getAdminDb();
    const [providerSnapshot, legacySnapshot] = await Promise.all([
      db.collection("pg_provider_settings").doc("infiny").get(),
      db.collection("pg_gateway_settings").doc("infiny-pg-runtime").get(),
    ]);
    const data = {
      ...(legacySnapshot.exists ? legacySnapshot.data() ?? {} : {}),
      ...(providerSnapshot.exists ? providerSnapshot.data() ?? {} : {}),
    };
    const provider = text(data.provider) || text(process.env.PG_PROVIDER) || "infiny";
    const smsApiMode = isInnopaySmsApiMode(provider);
    const hasConfirmEndpoint = Boolean(text(data.confirm_url ?? data.confirmUrl) || text(data.api_base_url ?? data.apiBaseUrl));
    const blockers = [
      !provider ? "PG provider" : "",
      !smsApiMode && !text(data.public_client_key ?? data.client_key ?? data.publicClientKey) ? "public client key" : "",
      !smsApiMode && !text(data.channel_key ?? data.channelKey) ? "channel key" : "",
      !smsApiMode && !text(data.script_url ?? data.scriptUrl) ? "browser SDK script URL" : "",
      !smsApiMode && !text(data.request_function_name ?? data.requestFunctionName ?? data.request_method ?? data.requestMethod) ? "browser payment function name" : "",
      !smsApiMode && !hasConfirmEndpoint ? "Infiny confirm endpoint or API base URL" : "",
      !smsApiMode && !text(data.webhook_url ?? data.webhookUrl) ? "A5 webhook URL" : "",
      !smsApiMode && !text(data.success_url ?? data.successUrl) ? "success URL" : "",
      !smsApiMode && !text(data.fail_url ?? data.failUrl) ? "fail URL" : "",
    ].filter(Boolean);

    return { ready: blockers.length === 0, blockers };
  } catch (error) {
    return {
      ready: false,
      blockers: [error instanceof Error ? error.message : "Firestore PG runtime settings read failed"],
    };
  }
}

function hasCredential(encrypted: unknown, reference: unknown): boolean {
  return Boolean(isEncryptedCredentialShape(encrypted) || text(reference));
}

function isEncryptedCredentialShape(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { version?: unknown; iv?: unknown; authTag?: unknown; ciphertext?: unknown };
  return candidate.version === "aes-256-gcm:v1" &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.ciphertext === "string";
}

function redactCredentialDocument<T extends Record<string, unknown>>(document: T): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(document)) {
    redacted[key] = key.startsWith("encrypted_") && isEncryptedCredentialShape(value) ? "[encrypted]" : value;
  }

  return redacted;
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<boolean> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "ADMIN_PG_AUTH_REQUIRED",
        message: "Firebase ID token is required.",
        httpStatus: 401,
      },
    });
    return false;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;

    if (allowed) return true;
  } catch {
    // Fall through to a generic denial so token details are not exposed.
  }

  sendJson(response, 403, {
    ok: false,
    error: {
      code: "ADMIN_PG_FORBIDDEN",
      message: "SUPER_ADMIN permission is required.",
      httpStatus: 403,
    },
  });
  return false;
}

function maskValue(value: string, fallback: string) {
  if (!value) return fallback;
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}-${"*".repeat(Math.max(value.length - 8, 4))}-${value.slice(-4)}`;
}
