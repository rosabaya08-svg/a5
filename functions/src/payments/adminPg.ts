import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { canUseCredentialVault, encryptCredential, type EncryptedCredential } from "./credentialCrypto";
import { getPgServerReadiness } from "./providerRuntime";
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
};

type AdminPgActivationRequest = {
  companyId: string;
  action?: "activate" | "pause" | "block";
};

const allowedProviders: PaymentProviderId[] = ["mock", "pg_contract", "infiny", "toss", "portone", "kcp", "nice"];
const allowedStatuses: CompanyMerchantProfile["merchantStatus"][] = ["not_applied", "in_review", "mid_issued", "active", "blocked"];

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
  const provider = allowedProviders.includes(body.provider as PaymentProviderId) ? (body.provider as PaymentProviderId) : "infiny";
  const merchantId = text(body.mid || body.merchantId);
  const merchantSerialNo = text(body.merchantSerialNo);
  const moduleKey = text(body.moduleKey);
  const terminalId = text(body.terminalId);
  const secretKeyRef = text(body.secretKeyRef);
  const merchantPasswordRef = text(body.merchantPasswordRef);
  const signKeyRef = text(body.signKeyRef);
  const webhookSecretRef = text(body.webhookSecretRef);
  let encryptedSecretKey: EncryptedCredential | undefined;
  let encryptedMerchantPassword: EncryptedCredential | undefined;
  let encryptedSignKey: EncryptedCredential | undefined;
  let encryptedWebhookSecret: EncryptedCredential | undefined;

  try {
    encryptedSecretKey = encryptCredential(body.secretKey);
    encryptedMerchantPassword = encryptCredential(body.merchantPassword);
    encryptedSignKey = encryptCredential(body.signKey);
    encryptedWebhookSecret = encryptCredential(body.webhookSecret);
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

  const hasSecretKey = Boolean(encryptedSecretKey || secretKeyRef);
  const hasMerchantPassword = Boolean(encryptedMerchantPassword || merchantPasswordRef);
  const hasSignKey = Boolean(encryptedSignKey || signKeyRef);
  const hasWebhookSecret = Boolean(encryptedWebhookSecret || webhookSecretRef);
  const requestedStatus = allowedStatuses.includes(body.status as CompanyMerchantProfile["merchantStatus"])
    ? (body.status as CompanyMerchantProfile["merchantStatus"])
    : "mid_issued";
  const credentialReady = Boolean(merchantId && merchantSerialNo && moduleKey && hasSecretKey && hasMerchantPassword && hasSignKey && hasWebhookSecret);
  const status = requestedStatus === "active" && !credentialReady ? "mid_issued" : requestedStatus;
  const credentialDoc = {
    company_id: companyId,
    company_name: text(body.companyName) || companyId,
    provider,
    environment: body.environment === "production" ? "production" : "test",
    mid: merchantId || null,
    merchant_id: merchantId || null,
    merchant_id_masked: maskValue(merchantId, "MID 대기"),
    merchant_serial_no: merchantSerialNo || null,
    merchant_serial_no_masked: maskValue(merchantSerialNo, "시리얼 대기"),
    module_key: moduleKey || null,
    module_key_masked: maskValue(moduleKey, "모듈키 대기"),
    terminal_id: terminalId || null,
    terminal_id_masked: maskValue(terminalId, "터미널 대기"),
    secret_key_ref: secretKeyRef || null,
    secret_key_ref_masked: maskValue(secretKeyRef, "Secret 참조 대기"),
    encrypted_secret_key: encryptedSecretKey ?? null,
    merchant_password_ref: merchantPasswordRef || null,
    merchant_password_ref_masked: maskValue(merchantPasswordRef, "비밀번호 참조 대기"),
    encrypted_merchant_password: encryptedMerchantPassword ?? null,
    sign_key_ref: signKeyRef || null,
    sign_key_ref_masked: maskValue(signKeyRef, "SignKey 참조 대기"),
    encrypted_sign_key: encryptedSignKey ?? null,
    webhook_secret_ref: webhookSecretRef || null,
    webhook_secret_ref_masked: maskValue(webhookSecretRef, "Webhook Secret 참조 대기"),
    encrypted_webhook_secret: encryptedWebhookSecret ?? null,
    credential_ready: credentialReady,
    credential_status: status,
    status,
    raw_secret_stored: false,
    encrypted_secret_stored: Boolean(encryptedSecretKey || encryptedMerchantPassword || encryptedSignKey || encryptedWebhookSecret),
    secret_storage_policy: encryptedSecretKey || encryptedMerchantPassword || encryptedSignKey || encryptedWebhookSecret
      ? "firebase_functions_encrypted_firestore_vault"
      : "secret_manager_reference_only",
    vault_ready: canUseCredentialVault(),
    updated_at: FieldValue.serverTimestamp(),
  };

  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("company_pg_credentials").doc(companyId), credentialDoc, { merge: true });
    transaction.set(
      db.collection("companies").doc(companyId),
      {
        company_id: companyId,
        name: text(body.companyName) || companyId,
        pg_provider: provider,
        pg_merchant_id: merchantId || null,
        pg_module_key: moduleKey || null,
        pg_merchant_status: status,
        infiny_mid: merchantId || null,
        infiny_module_key: moduleKey || null,
        infiny_mid_status: status,
        pg_profile: {
          provider,
          providerLabel: provider === "infiny" ? "인피니 PG" : provider,
          merchantId: merchantId || null,
          merchantIdMasked: maskValue(merchantId, "MID 대기"),
          merchantSerialNoStored: Boolean(merchantSerialNo),
          merchantSerialNoMasked: maskValue(merchantSerialNo, "시리얼 대기"),
          moduleKey: moduleKey || null,
          moduleKeyMasked: maskValue(moduleKey, "모듈키 대기"),
          terminalIdStored: Boolean(terminalId),
          terminalIdMasked: maskValue(terminalId, "터미널 대기"),
          secretKeyRefMasked: maskValue(secretKeyRef, "Secret 참조 대기"),
          merchantPasswordRefMasked: maskValue(merchantPasswordRef, "비밀번호 참조 대기"),
          signKeyRefMasked: maskValue(signKeyRef, "SignKey 참조 대기"),
          webhookSecretRefMasked: maskValue(webhookSecretRef, "Webhook Secret 참조 대기"),
          credentialRefsStored: Boolean(secretKeyRef || merchantPasswordRef || signKeyRef || webhookSecretRef),
          encryptedCredentialStored: Boolean(encryptedSecretKey || encryptedMerchantPassword || encryptedSignKey || encryptedWebhookSecret),
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
          message: "Company PG credential references were saved without raw secret values.",
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
  const pgReadiness = getPgServerReadiness();
  const blockers = [
    ...pgReadiness.missingKeys,
    !text(credential.mid ?? credential.merchant_id) ? "company MID" : "",
    !text(credential.merchant_serial_no) ? "merchant serial number" : "",
    !text(credential.module_key) ? "module key" : "",
    !hasCredential(credential.encrypted_secret_key, credential.secret_key_ref) ? "secret key" : "",
    !hasCredential(credential.encrypted_merchant_password, credential.merchant_password_ref) ? "merchant password" : "",
    !hasCredential(credential.encrypted_sign_key, credential.sign_key_ref) ? "sign key" : "",
    !hasCredential(credential.encrypted_webhook_secret, credential.webhook_secret_ref) ? "webhook secret" : "",
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
    pgReadiness,
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
  const canActivate = Boolean(
    text(credential.mid ?? credential.merchant_id) &&
      text(credential.merchant_serial_no) &&
      text(credential.module_key) &&
      hasCredential(credential.encrypted_secret_key, credential.secret_key_ref) &&
      hasCredential(credential.encrypted_merchant_password, credential.merchant_password_ref) &&
      hasCredential(credential.encrypted_sign_key, credential.sign_key_ref) &&
      hasCredential(credential.encrypted_webhook_secret, credential.webhook_secret_ref),
  );

  if (action === "activate" && !canActivate) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_PG_ACTIVATION_BLOCKED",
        message: "MID, serial number, module key, and Secret references are required before activation.",
        httpStatus: 409,
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
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true;

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
