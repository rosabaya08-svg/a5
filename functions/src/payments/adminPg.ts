import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { canUseCredentialVault, decryptCredential, encryptCredential, type EncryptedCredential } from "./credentialCrypto";
import { getPgServerReadiness, isInnopaySmsApiMode, isPayupProvider, readPayupApiBaseUrl } from "./providerRuntime";
import { isLegacyInnopayEnabled } from "./providerPolicy";
import { verifyPayupConnection } from "./payupClient";
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
  businessNo?: string;
  businessRegistrationNumber?: string;
  representativeName?: string;
  managerName?: string;
  publicContactPhone?: string;
  publicEmail?: string;
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
  paymentMode?: "sms" | "vbank" | "rest" | "webview" | "tpay" | "direct";
  smsEnabled?: boolean;
  vbankEnabled?: boolean;
  realCallsEnabled?: boolean;
  smsSvcPrdtCd?: "03" | "04";
  vbankNotiUrl?: string;
  scriptUrl?: string;
  globalName?: string;
  requestFunctionName?: string;
  successUrl?: string;
  failUrl?: string;
  documentedEndpoints?: unknown[];
};

type AdminPgActivationRequest = {
  companyId: string;
  action?: "activate" | "pause" | "block";
};

type AdminPgCredentialListRequest = {
  companyId?: string;
};

type AdminA5sPgCredentialRequest = {
  channel?: "a5s" | "a5ws" | "a5ls";
  sellerId: string;
  merchantId?: string;
  merchantName?: string;
  representativeName?: string;
  businessNo?: string;
  openedAt?: string;
  services?: string[];
  environment?: "test" | "production";
  authKey?: string;
  authKeyRef?: string;
  status?: CompanyMerchantProfile["merchantStatus"];
};

const allowedStatuses: CompanyMerchantProfile["merchantStatus"][] = ["not_applied", "in_review", "mid_issued", "active", "blocked"];
const masterAdminEmail = "rosabaya08@gmail.com";
const taxableMerchantPolicy = {
  taxation_type: "taxable",
  tax_type: "taxable",
  pg_taxation_type: "taxable",
  tax_free_enabled: false,
  is_tax_free_merchant: false,
  tax_free_amt: 0,
  duty_free_amt: 0,
} as const;

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
  const existingCompanySnapshot = await db.collection("companies").doc(companyId).get();
  const existingCompany = existingCompanySnapshot.data() ?? {};
  if (!existingCompanySnapshot.exists) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_PG_COMPANY_PROFILE_REQUIRED",
        message: "The company profile must be registered before PG credentials can be saved.",
        httpStatus: 409,
      },
    });
    return;
  }
  const companyName = firstHealthyText(
    existingCompany.name,
    existingCompany.companyName,
    existingCompany.company_name,
    existingCompany.brand_name,
    existingCompany.brandName,
  );
  if (!companyName) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_PG_COMPANY_NAME_INVALID",
        message: "The registered company name is missing or corrupted. Repair the company profile before saving PG credentials.",
        httpStatus: 409,
      },
    });
    return;
  }
  const bodyRecord = body as Record<string, unknown>;
  if (body.provider === "mock") {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ADMIN_PG_MOCK_PROVIDER_DISABLED",
        message: "Mock PG provider cannot be saved from the A5 mall Payup settings.",
        httpStatus: 400,
      },
    });
    return;
  }
  if (body.provider && body.provider !== "payup" && body.provider !== "pg_contract") {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ADMIN_A5MALL_PAYUP_ONLY",
        message: "A5 mall uses company-contracted Payup credentials only.",
        httpStatus: 400,
      },
    });
    return;
  }
  const provider: PaymentProviderId = "payup";
  const businessNo = firstText(
    existingCompany.business_registration_number,
    existingCompany.businessRegistrationNumber,
    existingCompany.business_no,
    existingCompany.businessNo,
  );
  const normalizedBusinessNo = normalizeBusinessNo(businessNo);
  const representativeName = firstHealthyText(
    existingCompany.representative_name,
    existingCompany.representativeName,
    existingCredential.representative_name,
    existingCredential.representativeName,
  );
  const managerName = firstHealthyText(
    existingCompany.manager_name,
    existingCompany.managerName,
    existingCredential.manager_name,
    existingCredential.managerName,
  );
  const publicContactPhone = firstHealthyText(
    existingCompany.public_contact_phone,
    existingCompany.publicContactPhone,
    existingCompany.cs_phone,
    existingCompany.csPhone,
    existingCompany.manager_phone,
    existingCompany.managerPhone,
    existingCompany.contact_phone,
    existingCompany.contactPhone,
    existingCredential.public_contact_phone,
    existingCredential.publicContactPhone,
    existingCredential.manager_phone,
    existingCredential.managerPhone,
  );
  const publicEmail = firstHealthyText(
    existingCompany.public_email,
    existingCompany.publicEmail,
    existingCompany.manager_email,
    existingCompany.managerEmail,
    existingCompany.contact_email,
    existingCompany.contactEmail,
    existingCredential.public_email,
    existingCredential.publicEmail,
    existingCredential.manager_email,
    existingCredential.managerEmail,
  );
  const environment =
    body.environment === "production" || body.environment === "test"
      ? body.environment
      : existingCredential.environment === "production"
        ? "production"
        : "test";
  const merchantId = firstText(body.mid, body.merchantId, bodyRecord.merchant_id, bodyRecord.pg_merchant_id, bodyRecord.payup_mid, bodyRecord.infiny_mid);
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
  const payupMode = isPayupProvider(provider);
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
  const credentialReady = payupMode
    ? Boolean(effectiveMerchantId && hasSecretKey)
    : smsApiMode
      ? Boolean(effectiveMerchantId && hasSignKey)
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
    company_name: companyName,
    companyName,
    business_registration_number: businessNo || null,
    businessRegistrationNumber: businessNo || null,
    business_registration_number_normalized: normalizedBusinessNo || null,
    businessRegistrationNumberNormalized: normalizedBusinessNo || null,
    representative_name: representativeName || null,
    representativeName: representativeName || null,
    manager_name: managerName || null,
    managerName: managerName || null,
    public_contact_phone: publicContactPhone || null,
    publicContactPhone: publicContactPhone || null,
    public_email: publicEmail || null,
    publicEmail: publicEmail || null,
    provider,
    environment,
    mid: effectiveMerchantId || null,
    merchant_id: effectiveMerchantId || null,
    merchant_id_masked: maskValue(effectiveMerchantId, "MID 미입력"),
    merchant_serial_no: effectiveMerchantSerialNo || null,
    merchant_serial_no_masked: maskValue(effectiveMerchantSerialNo, "일련번호 미입력"),
    module_key: effectiveModuleKey || null,
    module_key_masked: maskValue(effectiveModuleKey, "모듈키 미입력"),
    terminal_id: effectiveTerminalId || null,
    terminal_id_masked: maskValue(effectiveTerminalId, "터미널 ID 미입력"),
    merchantId: effectiveMerchantId || null,
    merchantSerialNo: effectiveMerchantSerialNo || null,
    moduleKey: effectiveModuleKey || null,
    terminalId: effectiveTerminalId || null,
    secret_key_ref: effectiveSecretKeyRef || null,
    secret_key_ref_masked: maskValue(effectiveSecretKeyRef, "Secret 참조 미입력"),
    ...(encryptedSecretKey ? { encrypted_secret_key: encryptedSecretKey } : {}),
    merchant_password_ref: effectiveMerchantPasswordRef || null,
    merchant_password_ref_masked: maskValue(effectiveMerchantPasswordRef, "비밀번호 참조 미입력"),
    ...(encryptedMerchantPassword ? { encrypted_merchant_password: encryptedMerchantPassword } : {}),
    sign_key_ref: effectiveSignKeyRef || null,
    sign_key_ref_masked: maskValue(effectiveSignKeyRef, "SignKey 참조 미입력"),
    ...(encryptedSignKey ? { encrypted_sign_key: encryptedSignKey } : {}),
    webhook_secret_ref: effectiveWebhookSecretRef || null,
    webhook_secret_ref_masked: maskValue(effectiveWebhookSecretRef, "Webhook Secret 참조 미입력"),
    ...(encryptedWebhookSecret ? { encrypted_webhook_secret: encryptedWebhookSecret } : {}),
    credential_ready: credentialReady,
    credential_status: status,
    status,
    raw_secret_stored: false,
    encrypted_secret_stored: encryptedCredentialStored,
    secret_storage_policy: encryptedCredentialStored
      ? "firebase_functions_encrypted_firestore_vault"
      : "secret_manager_reference_only",
    ...taxableMerchantPolicy,
    vault_ready: canUseCredentialVault(),
    profile_snapshot_source: "companies",
    updated_at: FieldValue.serverTimestamp(),
  };
  const runtimeSettingsDoc = normalizePgRuntimeSettings(body.runtimeSettings, provider);

  await db.runTransaction(async (transaction) => {
    if (runtimeSettingsDoc) {
      transaction.set(db.collection("pg_provider_settings").doc("payup"), runtimeSettingsDoc, { merge: true });
    }

    transaction.set(db.collection("company_pg_credentials").doc(companyId), credentialDoc, { merge: true });
    transaction.set(
      db.collection("companies").doc(companyId),
      {
        company_id: companyId,
        pg_provider: provider,
        pg_merchant_id: effectiveMerchantId || null,
        pg_module_key: effectiveModuleKey || null,
        pg_merchant_status: status,
        payup_mid: provider === "payup" ? effectiveMerchantId || null : null,
        payup_mid_status: provider === "payup" ? status : null,
        ...taxableMerchantPolicy,
        pg_profile: {
          provider,
          providerLabel: provider === "payup" ? "Payup PG" : provider,
          merchantId: effectiveMerchantId || null,
          merchantIdMasked: maskValue(effectiveMerchantId, "MID 미입력"),
          merchantSerialNoStored: Boolean(effectiveMerchantSerialNo),
          merchantSerialNoMasked: maskValue(effectiveMerchantSerialNo, "일련번호 미입력"),
          moduleKey: effectiveModuleKey || null,
          moduleKeyMasked: maskValue(effectiveModuleKey, "모듈키 미입력"),
          terminalIdStored: Boolean(effectiveTerminalId),
          terminalIdMasked: maskValue(effectiveTerminalId, "터미널 ID 미입력"),
          secretKeyRefMasked: maskValue(effectiveSecretKeyRef, "Secret 참조 미입력"),
          merchantPasswordRefMasked: maskValue(effectiveMerchantPasswordRef, "비밀번호 참조 미입력"),
          signKeyRefMasked: maskValue(effectiveSignKeyRef, "SignKey 참조 미입력"),
          webhookSecretRefMasked: maskValue(effectiveWebhookSecretRef, "Webhook Secret 참조 미입력"),
          credentialRefsStored: Boolean(effectiveSecretKeyRef || effectiveMerchantPasswordRef || effectiveSignKeyRef || effectiveWebhookSecretRef),
          encryptedCredentialStored,
          merchantStatus: status,
          credentialReady,
          taxationType: "taxable",
          taxFreeEnabled: false,
          adminManaged: true,
          companyEditable: false,
          settlementOwner: provider === "payup" ? "payup" : "manual",
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
      ? "기업별 PG 인증정보가 암호화 저장되었습니다. 연결 확인 후 운영하세요."
      : "기본 PG 정보는 저장되었지만 MID와 인증키를 모두 확인해야 사용할 수 있습니다.",
  });
}

export async function adminPgCredentialListHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  if (!(await requireSuperAdmin(request, response))) return;

  const body = readObjectBody<AdminPgCredentialListRequest>(request);
  const requestedCompanyId = text(body.companyId);
  const db = getAdminDb();
  const companySnapshots = requestedCompanyId
    ? [await db.collection("companies").doc(requestedCompanyId).get()]
    : (await db.collection("companies").limit(1000).get()).docs;
  const existingCompanies = companySnapshots.filter((snapshot) => snapshot.exists);

  if (requestedCompanyId && existingCompanies.length === 0) {
    sendJson(response, 404, {
      ok: false,
      error: { code: "ADMIN_PG_COMPANY_NOT_FOUND", message: "Registered company was not found.", httpStatus: 404 },
    });
    return;
  }

  const rows = await Promise.all(
    existingCompanies.map(async (companySnapshot) => {
      const companyId = companySnapshot.id;
      const company = companySnapshot.data() ?? {};
      const credentialSnapshot = await db.collection("company_pg_credentials").doc(companyId).get();
      const credential = credentialSnapshot.data() ?? {};
      const pgProfile = asRecord(company.pg_profile ?? company.pgProfile);
      const businessNo = normalizeBusinessNo(firstText(
        company.business_registration_number_normalized,
        company.businessRegistrationNumberNormalized,
        company.business_registration_number,
        company.businessRegistrationNumber,
        company.business_no,
        company.businessNo,
        credential.business_registration_number_normalized,
        credential.businessRegistrationNumberNormalized,
        credential.business_registration_number,
        credential.businessRegistrationNumber,
      )) || normalizeBusinessNo(companyId.replace(/^business-/, ""));
      const companyName = firstHealthyText(
        company.name,
        company.companyName,
        company.company_name,
        company.brand_name,
        company.brandName,
        credential.company_name,
        credential.companyName,
      );
      const merchantId = firstText(
        credential.mid,
        credential.merchant_id,
        credential.merchantId,
        company.payup_mid,
        company.pg_merchant_id,
        company.merchant_id,
        pgProfile.merchantId,
        pgProfile.merchant_id,
      );
      const provider = firstText(credential.provider, company.pg_provider, pgProfile.provider, "payup");
      const environment = credential.environment === "production" ? "production" : "test";
      const status = allowedStatuses.includes(credential.status as CompanyMerchantProfile["merchantStatus"])
        ? (credential.status as CompanyMerchantProfile["merchantStatus"])
        : allowedStatuses.includes(credential.credential_status as CompanyMerchantProfile["merchantStatus"])
          ? (credential.credential_status as CompanyMerchantProfile["merchantStatus"])
          : "not_applied";
      const encryptedSecretStored = Boolean(
        credential.encrypted_secret_stored === true ||
          isEncryptedCredentialShape(credential.encrypted_secret_key) ||
          isEncryptedCredentialShape(credential.encrypted_auth_key),
      );
      const secretReferenceStored = Boolean(text(credential.secret_key_ref ?? credential.auth_key_ref));
      const [paymentIntents, payments, orders] = await Promise.all([
        countCompanyDocuments(db, "payment_intents", companyId),
        countCompanyDocuments(db, "payments", companyId),
        countCompanyDocuments(db, "orders", companyId),
      ]);

      return {
        companyId,
        companyName: companyName || "업체명 확인 전",
        businessNo,
        representativeName: firstHealthyText(
          company.representative_name,
          company.representativeName,
          credential.representative_name,
          credential.representativeName,
        ),
        managerName: firstHealthyText(
          company.manager_name,
          company.managerName,
          credential.manager_name,
          credential.managerName,
        ) || "확인 전",
        contactPhone: firstHealthyText(
          company.public_contact_phone, company.publicContactPhone,
          company.cs_phone, company.csPhone,
          company.manager_phone, company.managerPhone,
          company.contact_phone, company.contactPhone,
          credential.public_contact_phone, credential.publicContactPhone,
          credential.manager_phone, credential.managerPhone,
        ),
        contactEmail: firstHealthyText(
          company.public_email, company.publicEmail,
          company.manager_email, company.managerEmail,
          company.contact_email, company.contactEmail,
          credential.public_email, credential.publicEmail,
          credential.manager_email, credential.managerEmail,
        ),
        provider,
        environment,
        merchantId,
        merchantIdMasked: firstText(credential.merchant_id_masked, pgProfile.merchantIdMasked) || maskValue(merchantId, "MID \uBBF8\uC785\uB825"),
        status,
        credentialReady: credential.credential_ready === true,
        encryptedSecretStored,
        secretReferenceStored,
        vaultReady: credential.vault_ready === true,
        rawSecretStored: false,
        credentialStorageLabel: encryptedSecretStored
          ? "\uC554\uD638\uD654 \uC800\uC7A5\uB428"
          : secretReferenceStored
            ? "Secret \uCC38\uC870 \uC800\uC7A5\uB428"
            : "\uC778\uC99D\uD0A4 \uBBF8\uC800\uC7A5",
        lastConnectionTest: {
          status: firstText(credential.last_connection_test_status) || "not_tested",
          providerCalled: credential.last_connection_test_provider_called === true,
          environment: firstText(credential.last_connection_test_environment),
          code: safeConnectionCode(credential.last_connection_test_code),
          testedAt: dateValue(credential.last_connection_test_at),
          blockerCount: Array.isArray(credential.last_connection_test_blockers) ? credential.last_connection_test_blockers.length : 0,
        },
        transactions: { paymentIntents, payments, orders, total: paymentIntents + payments + orders },
        updatedAt: dateValue(credential.updated_at ?? company.updated_at),
      };
    }),
  );

  rows.sort((left, right) => left.companyName.localeCompare(right.companyName, "ko"));
  const now = new Date().toISOString();
  await db.collection("payment_audit_logs").add({
    actorType: "SUPER_ADMIN",
    action: "admin_pg_credential_list",
    targetType: "company_pg_credentials",
    targetId: requestedCompanyId || "*",
    after: { rowCount: rows.length, secretsReturned: false },
    createdAt: now,
    created_at: now,
    updated_at: FieldValue.serverTimestamp(),
  });

  sendJson(response, 200, { ok: true, rows, count: rows.length, secretsReturned: false, generatedAt: now });
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
  const provider = String(credential.provider ?? "payup");
  const smsApiMode = isInnopaySmsApiMode(provider);
  const payupMode = isPayupProvider(provider);
  const environment = credential.environment === "production" ? "production" : "test";
  const merchantId = text(credential.mid ?? credential.merchant_id);
  let payupApiKey = "";
  if (payupMode) {
    try {
      payupApiKey = decryptCredential(credential.encrypted_secret_key) ?? decryptCredential(credential.encrypted_auth_key) ?? "";
    } catch {
      payupApiKey = "";
    }
  }

  const blockers = [
    ...(payupMode ? [] : runtimeReadiness.blockers),
    !merchantId ? "company MID" : "",
    !payupMode && !smsApiMode && !text(credential.merchant_serial_no) ? "merchant serial number" : "",
    !payupMode && !smsApiMode && !text(credential.module_key) ? "module key" : "",
    payupMode && !payupApiKey ? "decrypted company Payup API key" : "",
    !payupMode && !hasCredential(credential.encrypted_secret_key, credential.secret_key_ref) ? "PG secret key" : "",
    !payupMode && !smsApiMode && !hasCredential(credential.encrypted_merchant_password, credential.merchant_password_ref) ? "merchant password" : "",
    !payupMode && !hasCredential(credential.encrypted_sign_key, credential.sign_key_ref) ? "sign key" : "",
    !payupMode && !smsApiMode && !hasCredential(credential.encrypted_webhook_secret, credential.webhook_secret_ref) ? "webhook secret" : "",
  ].filter(Boolean);

  let payupConnection: Awaited<ReturnType<typeof verifyPayupConnection>> | undefined;
  if (payupMode && blockers.length === 0) {
    payupConnection = await verifyPayupConnection({ merchantId, apiKey: payupApiKey, environment });
    if (!payupConnection.ok) blockers.push(`Payup authentication failed (${payupConnection.code})`);
  }
  const ready = blockers.length === 0 && (payupMode ? payupConnection?.ok === true : true);
  const connectionCode = payupConnection?.code ?? (ready ? "CONFIG_READY" : "CONFIG_BLOCKED");

  await getAdminDb().collection("company_pg_credentials").doc(companyId).set(
    {
      last_connection_test_at: new Date().toISOString(),
      last_connection_test_status: ready ? "passed" : "failed",
      last_connection_test_blockers: blockers,
      last_connection_test_provider_called: Boolean(payupConnection),
      last_connection_test_environment: environment,
      last_connection_test_code: connectionCode,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  sendJson(response, ready ? 200 : 409, {
    ok: ready,
    companyId,
    environment,
    connection: {
      providerCalled: Boolean(payupConnection),
      code: connectionCode,
    },
    pgReadiness: { ...pgReadiness, firestoreRuntime: runtimeReadiness },
    blockers,
    message: ready ? "PayUp 연결 확인을 통과했습니다." : "PayUp 연결 확인에 실패했습니다.",
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
  const provider = String(credential.provider ?? "payup");
  const smsApiMode = isInnopaySmsApiMode(provider);
  const payupMode = isPayupProvider(provider);
  const canActivate = Boolean(
    text(credential.mid ?? credential.merchant_id) &&
      (payupMode || smsApiMode || text(credential.merchant_serial_no)) &&
      (payupMode || smsApiMode || text(credential.module_key)) &&
      hasCredential(credential.encrypted_secret_key, credential.secret_key_ref) &&
      (payupMode || smsApiMode || hasCredential(credential.encrypted_merchant_password, credential.merchant_password_ref)) &&
      (payupMode || hasCredential(credential.encrypted_sign_key, credential.sign_key_ref)) &&
      (payupMode || smsApiMode || hasCredential(credential.encrypted_webhook_secret, credential.webhook_secret_ref)) &&
      runtimeReadiness.ready,
  );

  if (action === "activate" && !canActivate) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_PG_ACTIVATION_BLOCKED",
        message: "MID, Payup API credential, and runtime settings are required before activation.",
        httpStatus: 409,
        details: { runtimeBlockers: runtimeReadiness.blockers },
      },
    });
    return;
  }

  const status: CompanyMerchantProfile["merchantStatus"] = action === "activate" ? "active" : action === "block" ? "blocked" : "mid_issued";
  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("company_pg_credentials").doc(companyId), { status, credential_status: status, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(db.collection("companies").doc(companyId), { pg_merchant_status: status, payup_mid_status: status, merchantStatus: status, "pg_profile.merchantStatus": status, updated_at: FieldValue.serverTimestamp() }, { merge: true });
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
    message: action === "activate" ? "기업 PG 결제 상태를 사용 가능으로 변경했습니다." : "기업 PG 상태를 변경했습니다.",
  });
}

export async function adminA5sPgCredentialSaveHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  if (!(await requireSuperAdmin(request, response))) return;

  const body = readObjectBody<AdminA5sPgCredentialRequest>(request);
  const requestedChannel = text(body.channel);
  const channel = requestedChannel === "a5ws" || requestedChannel === "a5ls" ? requestedChannel : "a5s";
  const sellerId = normalizeDocumentId(text(body.sellerId || body.merchantId));
  const merchantId = text(body.merchantId || body.sellerId);
  const merchantName = text(body.merchantName) || sellerId;
  const representativeName = text(body.representativeName);
  const businessNo = normalizeBusinessNo(text(body.businessNo));
  const openedAt = text(body.openedAt);
  const services = Array.isArray(body.services)
    ? body.services.map((service) => text(service)).filter(Boolean).slice(0, 10)
    : [];
  const environment = body.environment === "test" ? "test" : "production";
  const authKeyRef = text(body.authKeyRef);
  const rawAuthKey = text(body.authKey);

  if (!sellerId || !merchantId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ADMIN_CHANNEL_PG_MERCHANT_REQUIRED",
        message: "sellerId and merchantId are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const existingSnapshot = await db.collection("a5s_pg_credentials").doc(sellerId).get();
  const existingCredential = existingSnapshot.data() ?? {};
  let encryptedAuthKey: EncryptedCredential | undefined;

  try {
    encryptedAuthKey = encryptCredential(rawAuthKey);
  } catch (error) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_CHANNEL_PG_CREDENTIAL_VAULT_REQUIRED",
        message: error instanceof Error ? error.message : "PG credential encryption key is required.",
        httpStatus: 409,
      },
    });
    return;
  }

  const existingEncrypted = isEncryptedCredentialShape(existingCredential.encrypted_auth_key);
  const effectiveAuthKeyRef = authKeyRef || text(existingCredential.auth_key_ref);
  const credentialReady = Boolean(merchantId && (encryptedAuthKey || existingEncrypted || effectiveAuthKeyRef));
  const requestedStatus = allowedStatuses.includes(body.status as CompanyMerchantProfile["merchantStatus"])
    ? (body.status as CompanyMerchantProfile["merchantStatus"])
    : credentialReady
      ? "active"
      : "mid_issued";
  const status = requestedStatus === "active" && !credentialReady ? "mid_issued" : requestedStatus;
  const now = new Date().toISOString();
  const sourceProject = channel === "a5s" ? "a5s-mall" : channel;

  const credentialDoc = {
    seller_id: sellerId,
    company_id: sellerId,
    store_id: sellerId,
    provider: "payup",
    pg_provider: "payup",
    environment,
    merchant_id: merchantId,
    merchantId,
    mid: merchantId,
    merchant_id_masked: maskValue(merchantId, "MID 미입력"),
    merchant_name: merchantName,
    company_name: merchantName,
    representative_name: representativeName || null,
    business_registration_number: businessNo || null,
    businessRegistrationNumber: businessNo || null,
    opened_at: openedAt || null,
    services,
    auth_key_ref: effectiveAuthKeyRef || null,
    auth_key_ref_masked: maskValue(effectiveAuthKeyRef, "인증키 참조 미입력"),
    ...(encryptedAuthKey ? { encrypted_auth_key: encryptedAuthKey } : {}),
    credential_ready: credentialReady,
    credential_status: status,
    status,
    raw_secret_stored: false,
    encrypted_secret_stored: Boolean(encryptedAuthKey || existingEncrypted),
    secret_storage_policy: Boolean(encryptedAuthKey || existingEncrypted)
      ? "firebase_functions_encrypted_firestore_vault"
      : "secret_manager_reference_only",
    channel,
    commerce_channel: channel,
    source_site: channel,
    source_project: sourceProject,
    updated_at: FieldValue.serverTimestamp(),
  };

  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("a5s_pg_credentials").doc(sellerId), credentialDoc, { merge: true });
    transaction.set(
      db.collection("a5s_companies").doc(sellerId),
      {
        id: sellerId,
        seller_id: sellerId,
        company_id: sellerId,
        merchant_id: merchantId,
        merchant_name: merchantName,
        name: merchantName,
        representative_name: representativeName || null,
        business_registration_number: businessNo || null,
        businessRegistrationNumber: businessNo || null,
        opened_at: openedAt || null,
        services,
        pg_provider: "payup",
        pg_merchant_id: merchantId,
        pg_merchant_status: status,
        pg_profile: {
          provider: "payup",
          providerLabel: "Payup PG",
          merchantId,
          merchantIdMasked: maskValue(merchantId, "MID 미입력"),
          merchantStatus: status,
          credentialReady,
          encryptedCredentialStored: Boolean(encryptedAuthKey || existingEncrypted),
          adminManaged: true,
          settlementOwner: "payup",
        },
        channel,
        commerce_channel: channel,
        source_site: channel,
        source_project: sourceProject,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      db.collection("a5s_stores").doc(sellerId),
      {
        id: sellerId,
        seller_id: sellerId,
        company_id: sellerId,
        store_name: merchantName,
        name: merchantName,
        status: "active",
        pg_provider: "payup",
        pg_merchant_status: status,
        channel,
        commerce_channel: channel,
        source_site: channel,
        source_project: sourceProject,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(db.collection("payment_audit_logs").doc(), {
      actorType: "SUPER_ADMIN",
      action: `admin_${channel}_pg_credential_save`,
      targetType: "a5s_pg_credentials",
      targetId: sellerId,
      after: redactCredentialDocument(credentialDoc),
      createdAt: now,
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    sellerId,
    channel,
    merchantIdMasked: maskValue(merchantId, "MID 미입력"),
    credentialReady,
    status,
    rawSecretStored: false,
    message: credentialReady
      ? `${channel.toUpperCase()} Payup 가맹점 설정을 저장했습니다.`
      : `${channel.toUpperCase()} Payup 기본 정보는 저장됐지만 인증키가 아직 준비되지 않았습니다.`,
  });
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function dateValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

function safeConnectionCode(value: unknown): string {
  const code = text(value);
  return /^[A-Za-z0-9_.-]{1,80}$/.test(code) ? code : "";
}

async function countCompanyDocuments(db: FirebaseFirestore.Firestore, collectionName: string, companyId: string): Promise<number> {
  const snapshot = await db.collection(collectionName).where("company_id", "==", companyId).count().get();
  return snapshot.data().count;
}

function normalizeDocumentId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function normalizeBusinessNo(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function firstHealthyText(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (candidate && !candidate.includes("?") && !candidate.includes("\uFFFD")) return candidate;
  }
  return "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "";
}

function normalizePgRuntimeSettings(input: AdminPgRuntimeSettingsRequest | undefined, provider: PaymentProviderId) {
  if (!input) return undefined;

  if (provider === "payup" || provider === "pg_contract") {
    const apiBaseUrl = text(input.apiBaseUrl) || readPayupApiBaseUrl();

    return {
      provider: "payup",
      environment: "test",
      mode: "payup_standard_api",
      status: input.realCallsEnabled ? "active" : "draft",
      api_base_url: apiBaseUrl,
      apiBaseUrl,
      payment_mode: "standard",
      checkout_mode: "standard_api",
      documented_endpoints: [
        { method: "POST", path: "/auth/v1/accessToken" },
        { method: "POST", path: "/api/v1/payment" },
        { method: "POST", path: "/api/v1/cancel" },
        { method: "POST", path: "/api/v1/partCancel" },
      ],
      raw_secret_stored: false,
      secret_storage_policy: "functions_encrypted_vault_or_secret_manager",
      updated_at: FieldValue.serverTimestamp(),
    };
  }

  if (provider !== "infiny") return undefined;

  const apiBaseUrl = text(input.apiBaseUrl) || "https://api.innopay.co.kr";
  const paymentMode = ["vbank", "rest", "webview", "tpay", "direct"].includes(String(input.paymentMode)) ? input.paymentMode : "sms";
  const smsSvcPrdtCd = input.smsSvcPrdtCd === "04" ? "04" : "03";
  const documentedEndpoints = Array.isArray(input.documentedEndpoints) ? input.documentedEndpoints.slice(0, 20) : [];
  const scriptUrl = text(input.scriptUrl) || "https://pg.innopay.co.kr/tpay/js/v1/innopay.js";

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
    checkout_mode: paymentMode === "direct" ? "direct" : "webview",
    script_url: scriptUrl,
    scriptUrl,
    global_name: text(input.globalName) || "innopay",
    request_function_name: text(input.requestFunctionName) || "goPay",
    success_url: text(input.successUrl),
    fail_url: text(input.failUrl),
    documented_endpoints: documentedEndpoints,
    raw_secret_stored: false,
    secret_storage_policy: "functions_encrypted_vault_or_secret_manager",
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function readFirestorePgRuntimeReadiness(): Promise<{ ready: boolean; blockers: string[] }> {
  try {
    const db = getAdminDb();
    const providerSnapshot = await db.collection("pg_provider_settings").doc("payup").get();
    const legacySnapshot = isLegacyInnopayEnabled()
      ? await db.collection("pg_gateway_settings").doc("infiny-pg-runtime").get()
      : undefined;
    const data = {
      ...(legacySnapshot?.exists ? legacySnapshot.data() ?? {} : {}),
      ...(providerSnapshot.exists ? providerSnapshot.data() ?? {} : {}),
    };
    const provider = text(data.provider) || text(process.env.PG_PROVIDER) || "payup";
    const smsApiMode = isInnopaySmsApiMode(provider);
    const payupMode = isPayupProvider(provider);
    const hasConfirmEndpoint = Boolean(text(data.confirm_url ?? data.confirmUrl) || text(data.api_base_url ?? data.apiBaseUrl));
    const blockers = [
      !provider ? "PG provider" : "",
      payupMode && !readPayupApiBaseUrl() ? "Payup API base URL" : "",
      !payupMode && !smsApiMode && !text(data.public_client_key ?? data.client_key ?? data.publicClientKey) ? "public client key" : "",
      !payupMode && !smsApiMode && !text(data.channel_key ?? data.channelKey) ? "channel key" : "",
      !payupMode && !smsApiMode && !text(data.script_url ?? data.scriptUrl) ? "browser SDK script URL" : "",
      !payupMode && !smsApiMode && !text(data.request_function_name ?? data.requestFunctionName ?? data.request_method ?? data.requestMethod) ? "browser payment function name" : "",
      !payupMode && !smsApiMode && !hasConfirmEndpoint ? "PG confirm endpoint or API base URL" : "",
      !payupMode && !smsApiMode && !text(data.webhook_url ?? data.webhookUrl) ? "A5 webhook URL" : "",
      !payupMode && !smsApiMode && !text(data.success_url ?? data.successUrl) ? "success URL" : "",
      !payupMode && !smsApiMode && !text(data.fail_url ?? data.failUrl) ? "fail URL" : "",
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
