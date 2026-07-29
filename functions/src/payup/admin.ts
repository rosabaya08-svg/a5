import { createHash, randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";

const REGION = "asia-northeast3";
const PAYUP_API_KEY = defineSecret("PAYUP_API_KEY");
const PAYUP_API_CERT_KEY = defineSecret("PAYUP_API_CERT_KEY");
const SUPER_ADMIN_EMAIL = "rosabaya08@gmail.com";
const REQUEST_TIMEOUT_MS = 12_000;
const PAYUP_TEST_BASE_URL = "https://api.testpayup.co.kr";
const PAYUP_PRODUCTION_BASE_URL = "https://api.payup.co.kr";

const allowedFeatureFlags = new Set([
  "PAYUP_MASTER",
  "NEW_ORDER",
  "PAYMENT_WINDOW",
  "FINAL_APPROVAL",
  "CART_DISTRIBUTION",
  "SUBMERCHANT_CREATE",
  "SUBMERCHANT_UPDATE",
  "SUBMERCHANT_SYNC",
  "TRANSACTION_RECON",
  "SETTLEMENT_RECON",
  "FULL_CANCEL",
  "PARTIAL_CANCEL",
  "PAYOUT_HOLD",
  "MOCK_MODE",
  "LOCAL_PAID_FALLBACK",
]);

const permanentlyDisabledFlags = new Set(["PARTIAL_CANCEL", "LOCAL_PAID_FALLBACK"]);
const liveConfigurationFlags = new Set([
  "PAYUP_MASTER",
  "NEW_ORDER",
  "PAYMENT_WINDOW",
  "FINAL_APPROVAL",
  "CART_DISTRIBUTION",
  "SUBMERCHANT_CREATE",
  "SUBMERCHANT_UPDATE",
  "FULL_CANCEL",
]);

const functionOptions = {
  region: REGION,
  cors: true,
  maxInstances: 10,
  secrets: [PAYUP_API_KEY, PAYUP_API_CERT_KEY],
};

type JsonRecord = Record<string, unknown>;

type AdminActor = {
  uid: string;
  email: string;
  role: string;
};

type PayupRuntime = {
  environment: "test" | "production";
  mode: "sandbox" | "test" | "production";
  baseUrl: string;
  merchantId: string;
  apiKey: string;
  apiCertKey: string;
  liveCallsEnabled: boolean;
  fixedIpRegistered: boolean;
};

class AdminHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, maxLength = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function requiredText(value: unknown, name: string, maxLength = 1000): string {
  const result = text(value, maxLength);
  if (!result) throw new AdminHttpError(400, "INVALID_ARGUMENT", `${name} 값이 필요합니다.`);
  return result;
}

function boolEnv(name: string): boolean {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function runtime(): PayupRuntime {
  const environment = process.env.PAYUP_ENVIRONMENT === "production" ? "production" : "test";
  const liveCallsEnabled = boolEnv("PAYUP_LIVE_CALLS_ENABLED");
  const baseUrl = environment === "production" ? PAYUP_PRODUCTION_BASE_URL : PAYUP_TEST_BASE_URL;
  return {
    environment,
    mode: liveCallsEnabled ? environment : "sandbox",
    baseUrl,
    merchantId: text(process.env.PAYUP_MERCHANT_ID, 100),
    apiKey: text(PAYUP_API_KEY.value(), 200),
    apiCertKey: text(PAYUP_API_CERT_KEY.value(), 200),
    liveCallsEnabled,
    fixedIpRegistered: boolEnv("PAYUP_FIXED_IP_REGISTERED"),
  };
}

function runtimeBlockers(config: PayupRuntime): string[] {
  const blockers: string[] = [];
  if (!config.merchantId) blockers.push("PAYUP_MERCHANT_ID 미등록");
  if (!config.apiKey) blockers.push("PAYUP_API_KEY Secret 미등록");
  if (!config.apiCertKey) blockers.push("PAYUP_API_CERT_KEY Secret 미등록");
  if (!config.fixedIpRegistered) blockers.push("PayUp 운영 허용 공인 IP 미확인");
  if (!config.liveCallsEnabled) blockers.push("PAYUP_LIVE_CALLS_ENABLED=false: 실제 외부 호출 차단");
  return blockers;
}

function maskIdentifier(value: string): string {
  if (!value) return "미등록";
  if (value.length <= 6) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

function maskAccount(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return "****";
  return `${digits.slice(0, 3)}-****-${digits.slice(-3)}`;
}

function sha256(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function dateToken(value: Date): string {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

function validateDateRange(from: string, to: string) {
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) {
    throw new AdminHttpError(400, "INVALID_DATE_RANGE", "조회일자는 yyyyMMdd 형식이어야 합니다.");
  }
  const parse = (value: string) => Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
  const start = parse(from);
  const end = parse(to);
  const days = Math.floor((end - start) / 86_400_000);
  if (!Number.isFinite(start) || !Number.isFinite(end) || days < 0 || days > 30) {
    throw new AdminHttpError(400, "INVALID_DATE_RANGE", "PayUp 조회기간은 시작일부터 31일 이내여야 합니다.");
  }
}

async function requireSuperAdmin(request: { get(name: string): string | undefined }): Promise<AdminActor> {
  const authorization = request.get("authorization") ?? request.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new AdminHttpError(401, "ADMIN_AUTH_REQUIRED", "최고관리자 Firebase 로그인이 필요합니다.");
  }

  const decoded = await getAdminAuth().verifyIdToken(authorization.slice("Bearer ".length));
  const email = text(decoded.email, 320).toLowerCase();
  const role = text(decoded.role ?? decoded.a5_role ?? decoded.admin_role, 100).toUpperCase();
  if (email !== SUPER_ADMIN_EMAIL && !["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new AdminHttpError(403, "ADMIN_PERMISSION_DENIED", "PayUp 설정은 A5S 최고관리자만 변경할 수 있습니다.");
  }

  return { uid: decoded.uid, email, role: role || "SUPER_ADMIN" };
}

function safeDocumentId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 180) || randomUUID();
}

async function writeAudit(input: {
  actor: AdminActor;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  correlationId: string;
}) {
  await getAdminDb().collection("audit_logs").add({
    actor_uid: input.actor.uid,
    actor_email: input.actor.email,
    actor_role: input.actor.role,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? "",
    correlation_id: input.correlationId,
    source: "payup_admin_control_center",
    created_at: FieldValue.serverTimestamp(),
    created_at_iso: new Date().toISOString(),
  });
}

async function writeIntegrationLog(input: {
  actor: AdminActor;
  operation: string;
  path: string;
  correlationId: string;
  responseCode: string;
  responseMsg: string;
  status: "success" | "failed" | "blocked" | "sandbox";
  merchantId?: string;
  subMerchantId?: string;
}) {
  await getAdminDb().collection("payup_integration_logs").add({
    actor_uid: input.actor.uid,
    actor_email: input.actor.email,
    operation: input.operation,
    path: input.path,
    merchant_id_masked: maskIdentifier(input.merchantId ?? ""),
    sub_merchant_id: input.subMerchantId ?? null,
    response_code: input.responseCode,
    response_msg: input.responseMsg.slice(0, 500),
    status: input.status,
    correlation_id: input.correlationId,
    secrets_redacted: true,
    created_at: FieldValue.serverTimestamp(),
    created_at_iso: new Date().toISOString(),
  });
}

async function postPayup(input: {
  config: PayupRuntime;
  actor: AdminActor;
  operation: string;
  path: string;
  payload: JsonRecord;
  correlationId: string;
  subMerchantId?: string;
}): Promise<JsonRecord> {
  if (!input.config.liveCallsEnabled) {
    throw new AdminHttpError(409, "PAYUP_LIVE_CALLS_DISABLED", "샌드박스 안전장치가 실제 PayUp 호출을 차단했습니다.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let responseCode = "HTTP_ERROR";
  let responseMsg = "PayUp API 호출 실패";

  try {
    const response = await fetch(`${input.config.baseUrl}${input.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(input.payload),
      signal: controller.signal,
    });
    const raw = await response.text();
    let parsed: JsonRecord;
    try {
      parsed = asRecord(JSON.parse(raw));
    } catch {
      parsed = { responseCode: `HTTP_${response.status}`, responseMsg: raw.slice(0, 500) };
    }
    responseCode = text(parsed.responseCode, 100) || `HTTP_${response.status}`;
    responseMsg = text(parsed.responseMsg, 500) || `HTTP ${response.status}`;

    await writeIntegrationLog({
      actor: input.actor,
      operation: input.operation,
      path: input.path,
      correlationId: input.correlationId,
      responseCode,
      responseMsg,
      status: response.ok && responseCode === "0000" ? "success" : "failed",
      merchantId: input.config.merchantId,
      subMerchantId: input.subMerchantId,
    });

    if (!response.ok) {
      throw new AdminHttpError(502, "PAYUP_HTTP_ERROR", `PayUp HTTP ${response.status}: ${responseMsg}`);
    }
    return parsed;
  } catch (error) {
    if (!(error instanceof AdminHttpError)) {
      await writeIntegrationLog({
        actor: input.actor,
        operation: input.operation,
        path: input.path,
        correlationId: input.correlationId,
        responseCode,
        responseMsg: error instanceof Error ? error.message : responseMsg,
        status: "failed",
        merchantId: input.config.merchantId,
        subMerchantId: input.subMerchantId,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function sendError(response: { status(code: number): { json(value: unknown): void } }, error: unknown) {
  const known = error instanceof AdminHttpError;
  const status = known ? error.status : 500;
  const code = known ? error.code : "PAYUP_ADMIN_INTERNAL_ERROR";
  const message = error instanceof Error ? error.message : "PayUp 관리자 처리 중 오류가 발생했습니다.";
  response.status(status).json({ ok: false, error: { code, message } });
}

async function featureFlagEnabled(key: string): Promise<boolean> {
  const snapshot = await getAdminDb().doc(`payment_feature_flags/payup_${safeDocumentId(key)}`).get();
  return snapshot.exists && snapshot.data()?.enabled === true;
}

function assertLiveReady(config: PayupRuntime) {
  const blockers = runtimeBlockers(config);
  if (blockers.length) throw new AdminHttpError(409, "PAYUP_CONFIGURATION_BLOCKED", blockers.join(", "));
}

export const payupAdminHealth = onRequest(functionOptions, async (request, response) => {
  try {
    const actor = await requireSuperAdmin(request);
    const config = runtime();
    const blockers = runtimeBlockers(config);
    const body = asRecord(request.body);
    let payupResponseCode = "";
    let payupResponseMsg = "";

    if (body.probe === true && blockers.length === 0) {
      const correlationId = randomUUID();
      const result = await postPayup({
        config,
        actor,
        operation: "SUBMERCHANT_LIST_PROBE",
        path: `/cartpay/api/sub/${encodeURIComponent(config.merchantId)}/list`,
        payload: { apiKey: config.apiKey },
        correlationId,
      });
      payupResponseCode = text(result.responseCode, 100);
      payupResponseMsg = text(result.responseMsg, 500);
    }

    response.status(200).json({
      ok: blockers.length === 0,
      mode: config.mode,
      liveCallsEnabled: config.liveCallsEnabled,
      baseUrl: config.baseUrl,
      merchantIdMasked: maskIdentifier(config.merchantId),
      fixedIpRegistered: config.fixedIpRegistered,
      requiredSecrets: {
        PAYUP_MERCHANT_ID: Boolean(config.merchantId),
        PAYUP_API_KEY: Boolean(config.apiKey),
        PAYUP_API_CERT_KEY: Boolean(config.apiCertKey),
      },
      blockers,
      lastProbeAt: new Date().toISOString(),
      payupResponseCode: payupResponseCode || undefined,
      payupResponseMsg: payupResponseMsg || undefined,
    });
  } catch (error) {
    sendError(response, error);
  }
});

export const payupAdminFeatureFlags = onRequest(functionOptions, async (request, response) => {
  try {
    const actor = await requireSuperAdmin(request);
    const body = asRecord(request.body);
    const key = requiredText(body.key, "key", 100).toUpperCase();
    const enabled = body.enabled === true;
    const reason = text(body.reason, 500);
    if (!allowedFeatureFlags.has(key)) throw new AdminHttpError(400, "FEATURE_FLAG_UNKNOWN", "정의되지 않은 PayUp 회로입니다.");
    if (enabled && permanentlyDisabledFlags.has(key)) {
      throw new AdminHttpError(409, "FEATURE_FLAG_PERMANENTLY_LOCKED", `${key} 회로는 정책상 영구 OFF입니다.`);
    }
    if (enabled && liveConfigurationFlags.has(key)) assertLiveReady(runtime());

    const ref = getAdminDb().doc(`payment_feature_flags/payup_${safeDocumentId(key)}`);
    const beforeSnapshot = await ref.get();
    const before = beforeSnapshot.data() ?? null;
    const correlationId = randomUUID();
    const after = {
      provider: "payup",
      key,
      enabled,
      reason,
      updated_by_uid: actor.uid,
      updated_by_email: actor.email,
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    };
    await ref.set(after, { merge: true });
    await writeAudit({ actor, action: "PAYUP.FEATURE_FLAG.CHANGED", targetType: "payment_feature_flag", targetId: key, before, after: { ...after, updated_at: "serverTimestamp" }, reason, correlationId });
    response.status(200).json({ ok: true, flag: key, enabled, correlationId });
  } catch (error) {
    sendError(response, error);
  }
});

export const payupAdminSubmerchants = onRequest(functionOptions, async (request, response) => {
  try {
    const actor = await requireSuperAdmin(request);
    const config = runtime();
    const body = asRecord(request.body);
    const action = text(body.action, 30) || "list";
    const correlationId = randomUUID();

    if (action === "list") {
      if (runtimeBlockers(config).length === 0) {
        const result = await postPayup({
          config,
          actor,
          operation: "SUBMERCHANT_LIST",
          path: `/cartpay/api/sub/${encodeURIComponent(config.merchantId)}/list`,
          payload: {
            apiKey: config.apiKey,
            ...(text(body.subMerchantId, 20) ? { subMerchantId: text(body.subMerchantId, 20) } : {}),
          },
          correlationId,
          subMerchantId: text(body.subMerchantId, 20),
        });
        const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
        const batch = getAdminDb().batch();
        for (const item of list) {
          const subMerchantId = text(item.subMerchantId, 20);
          if (!subMerchantId) continue;
          batch.set(getAdminDb().doc(`payup_submerchants/${safeDocumentId(subMerchantId)}`), {
            merchant_id: config.merchantId,
            sub_merchant_id: subMerchantId,
            sub_merchant_name: text(item.subMerchantName, 100),
            owner_name: text(item.ownerName, 100),
            phone_number_masked: text(item.phoneNumber, 30).replace(/(\d{3})\d+(\d{4})/, "$1****$2"),
            business_number: text(item.subBusinessNumber, 20),
            account_bank: text(item.accountBank, 50),
            account_number_masked: maskAccount(text(item.accountNumber, 50)),
            account_owner: text(item.accountOwner, 100),
            business_scale: text(item.businessScale, 50),
            status: "ACTIVE",
            payup_sync_status: "MATCHED",
            last_synced_at: FieldValue.serverTimestamp(),
            last_synced_at_iso: new Date().toISOString(),
          }, { merge: true });
        }
        await batch.commit();
        response.status(200).json({ ok: text(result.responseCode, 100) === "0000", responseCode: result.responseCode, responseMsg: result.responseMsg, listCount: Number(result.listCount ?? list.length), list });
        return;
      }

      const snapshots = await getAdminDb().collection("payup_submerchants").limit(500).get();
      response.status(200).json({
        ok: true,
        mode: "sandbox",
        responseCode: "SANDBOX",
        responseMsg: "실제 PayUp 연결 전 내부 하위사업자 원장을 조회했습니다.",
        listCount: snapshots.size,
        list: snapshots.docs.map((document) => ({ id: document.id, ...document.data() })),
      });
      return;
    }

    if (action !== "upsert") throw new AdminHttpError(400, "SUBMERCHANT_ACTION_INVALID", "action은 list 또는 upsert여야 합니다.");
    const gubun = text(body.gubun, 1) === "2" ? "2" : "1";
    const subMerchantId = requiredText(body.subMerchantId, "subMerchantId", 20);
    const subMerchantName = requiredText(body.subMerchantName, "subMerchantName", 30);
    const ownerName = requiredText(body.ownerName, "ownerName", 20);
    const phoneNumber = requiredText(body.phoneNumber, "phoneNumber", 20).replace(/[^0-9]/g, "");
    const subBusinessNumber = requiredText(body.subBusinessNumber, "subBusinessNumber", 20).replace(/[^0-9]/g, "");
    const accountBank = requiredText(body.accountBank, "accountBank", 30);
    const accountNumber = requiredText(body.accountNumber, "accountNumber", 30).replace(/[^0-9]/g, "");
    const accountOwner = requiredText(body.accountOwner, "accountOwner", 30);
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(subMerchantId)) throw new AdminHttpError(400, "SUBMERCHANT_ID_INVALID", "subMerchantId는 20자 이내 영문·숫자·_-만 허용합니다.");
    if (subBusinessNumber.length !== 10) throw new AdminHttpError(400, "BUSINESS_NUMBER_INVALID", "사업자번호는 하이픈 없이 10자리여야 합니다.");

    const payload = { apiKey: config.apiKey, gubun, subMerchantId, subMerchantName, ownerName, phoneNumber, subBusinessNumber, accountBank, accountNumber, accountOwner };
    let result: JsonRecord = { responseCode: "SANDBOX", responseMsg: "실제 PayUp 호출 전 내부 등록 대기 상태로 저장했습니다." };
    let status = "PENDING_ACTIVATION";
    if (runtimeBlockers(config).length === 0) {
      const flagKey = gubun === "2" ? "SUBMERCHANT_UPDATE" : "SUBMERCHANT_CREATE";
      if (!(await featureFlagEnabled(flagKey))) throw new AdminHttpError(409, "SUBMERCHANT_CIRCUIT_OFF", `${flagKey} 회로가 OFF입니다.`);
      result = await postPayup({
        config,
        actor,
        operation: gubun === "2" ? "SUBMERCHANT_UPDATE" : "SUBMERCHANT_CREATE",
        path: `/cartpay/api/sub/${encodeURIComponent(config.merchantId)}/update`,
        payload,
        correlationId,
        subMerchantId,
      });
      status = text(result.responseCode, 100) === "0000" ? "ACTIVE" : "ERROR";
    }

    const ref = getAdminDb().doc(`payup_submerchants/${safeDocumentId(subMerchantId)}`);
    const beforeSnapshot = await ref.get();
    await ref.set({
      merchant_id: config.merchantId || null,
      sub_merchant_id: subMerchantId,
      sub_merchant_name: subMerchantName,
      owner_name: ownerName,
      phone_number_masked: phoneNumber.replace(/(\d{3})\d+(\d{4})/, "$1****$2"),
      business_number: subBusinessNumber,
      account_bank: accountBank,
      account_number_masked: maskAccount(accountNumber),
      account_owner: accountOwner,
      status,
      payup_sync_status: status === "ACTIVE" ? "MATCHED" : "PENDING",
      last_response_code: text(result.responseCode, 100),
      last_response_msg: text(result.responseMsg, 500),
      created_by_uid: beforeSnapshot.exists ? beforeSnapshot.data()?.created_by_uid ?? actor.uid : actor.uid,
      updated_by_uid: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    }, { merge: true });
    await writeAudit({ actor, action: gubun === "2" ? "PAYUP.SUBMERCHANT.UPDATED" : "PAYUP.SUBMERCHANT.REGISTERED", targetType: "payup_submerchant", targetId: subMerchantId, before: beforeSnapshot.data() ?? null, after: { subMerchantId, subMerchantName, ownerName, businessNumber: subBusinessNumber, accountBank, accountNumberMasked: maskAccount(accountNumber), status }, correlationId });
    response.status(200).json({ ok: text(result.responseCode, 100) === "0000" || text(result.responseCode, 100) === "SANDBOX", responseCode: result.responseCode, responseMsg: result.responseMsg, subMerchantId, status, correlationId });
  } catch (error) {
    sendError(response, error);
  }
});

export const payupAdminTransactions = onRequest(functionOptions, async (request, response) => {
  try {
    const actor = await requireSuperAdmin(request);
    const config = runtime();
    const body = asRecord(request.body);
    const today = dateToken(new Date());
    const searchFromDate = text(body.searchFromDate, 8) || today;
    const searchToDate = text(body.searchToDate, 8) || today;
    const subMerchantId = text(body.subMerchantId, 20);
    validateDateRange(searchFromDate, searchToDate);
    const correlationId = randomUUID();

    if (runtimeBlockers(config).length > 0) {
      const snapshots = await getAdminDb().collection("payup_transaction_snapshots").orderBy("auth_datetime", "desc").limit(500).get();
      response.status(200).json({ ok: true, mode: "sandbox", responseCode: "SANDBOX", responseMsg: "내부 거래 스냅샷 조회", listCount: snapshots.size, list: snapshots.docs.map((document) => ({ id: document.id, ...document.data() })) });
      return;
    }
    if (!(await featureFlagEnabled("TRANSACTION_RECON"))) throw new AdminHttpError(409, "TRANSACTION_RECON_OFF", "거래내역 자동대사 회로가 OFF입니다.");

    const result = await postPayup({
      config,
      actor,
      operation: "TRANSACTION_LIST",
      path: `/cartpay/api/auth/${encodeURIComponent(config.merchantId)}/list`,
      payload: { apiKey: config.apiKey, searchFromDate, searchToDate, ...(subMerchantId ? { subMerchantId } : {}) },
      correlationId,
      subMerchantId,
    });
    const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
    const batch = getAdminDb().batch();
    for (const transaction of list) {
      const transactionId = text(transaction.transactionId, 100);
      if (!transactionId) continue;
      batch.set(getAdminDb().doc(`payup_transaction_snapshots/${safeDocumentId(transactionId)}`), {
        ...transaction,
        transaction_id: transactionId,
        correlation_id: correlationId,
        reconciled_at: FieldValue.serverTimestamp(),
        reconciled_at_iso: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
    response.status(200).json({ ok: text(result.responseCode, 100) === "0000", responseCode: result.responseCode, responseMsg: result.responseMsg, listCount: Number(result.listCount ?? list.length), list, correlationId });
  } catch (error) {
    sendError(response, error);
  }
});

export const payupAdminSettlements = onRequest(functionOptions, async (request, response) => {
  try {
    const actor = await requireSuperAdmin(request);
    const config = runtime();
    const body = asRecord(request.body);
    const action = text(body.action, 20) === "detail" ? "detail" : "list";
    const today = dateToken(new Date());
    const searchFromDate = text(body.searchFromDate, 8) || today;
    const searchToDate = text(body.searchToDate, 8) || today;
    const dateType = ["1", "2", "3"].includes(text(body.dateType, 1)) ? text(body.dateType, 1) : "1";
    const subMerchantId = text(body.subMerchantId, 20);
    validateDateRange(searchFromDate, searchToDate);
    const correlationId = randomUUID();

    if (runtimeBlockers(config).length > 0) {
      const collectionName = action === "detail" ? "payup_settlement_detail_snapshots" : "payup_settlement_snapshots";
      const snapshots = await getAdminDb().collection(collectionName).limit(500).get();
      response.status(200).json({ ok: true, mode: "sandbox", responseCode: "SANDBOX", responseMsg: "내부 정산 스냅샷 조회", listCount: snapshots.size, list: snapshots.docs.map((document) => ({ id: document.id, ...document.data() })) });
      return;
    }
    if (!(await featureFlagEnabled("SETTLEMENT_RECON"))) throw new AdminHttpError(409, "SETTLEMENT_RECON_OFF", "정산내역 자동대사 회로가 OFF입니다.");

    const result = await postPayup({
      config,
      actor,
      operation: action === "detail" ? "SETTLEMENT_DETAIL" : "SETTLEMENT_LIST",
      path: `/cartpay/api/closing/${encodeURIComponent(config.merchantId)}/${action === "detail" ? "detail" : "list"}`,
      payload: { apiKey: config.apiKey, searchFromDate, searchToDate, dateType, ...(subMerchantId ? { subMerchantId } : {}) },
      correlationId,
      subMerchantId,
    });
    const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
    const collectionName = action === "detail" ? "payup_settlement_detail_snapshots" : "payup_settlement_snapshots";
    const batch = getAdminDb().batch();
    for (const [index, settlement] of list.entries()) {
      const identity = [text(settlement.subMerchantId, 20), text(settlement.supplyDate, 20), text(settlement.transactionId, 100), String(index)].join("-");
      batch.set(getAdminDb().doc(`${collectionName}/${safeDocumentId(identity)}`), {
        ...settlement,
        correlation_id: correlationId,
        reconciled_at: FieldValue.serverTimestamp(),
        reconciled_at_iso: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
    response.status(200).json({ ok: text(result.responseCode, 100) === "0000", responseCode: result.responseCode, responseMsg: result.responseMsg, listCount: Number(result.listCount ?? list.length), list, correlationId });
  } catch (error) {
    sendError(response, error);
  }
});

export const payupAdminCancel = onRequest(functionOptions, async (request, response) => {
  try {
    const actor = await requireSuperAdmin(request);
    const config = runtime();
    const body = asRecord(request.body);
    const transactionId = requiredText(body.transactionId, "transactionId", 100);
    const reason = text(body.reason, 500) || "관리자 전체취소";
    const dryRun = body.dryRun === true;
    const correlationId = randomUUID();
    const cancelRequestRef = getAdminDb().doc(`cancel_requests/${safeDocumentId(`${transactionId}-${Date.now()}`)}`);

    await cancelRequestRef.set({
      provider: "payup",
      transaction_id: transactionId,
      reason,
      requested_by_uid: actor.uid,
      requested_by_email: actor.email,
      status: dryRun ? "DRY_RUN" : "SETTLEMENT_HOLD",
      payout_hold: true,
      correlation_id: correlationId,
      created_at: FieldValue.serverTimestamp(),
      created_at_iso: new Date().toISOString(),
    });

    if (dryRun || runtimeBlockers(config).length > 0) {
      await writeAudit({ actor, action: "PAYUP.CANCEL.DRY_RUN", targetType: "payment_transaction", targetId: transactionId, after: { payoutHold: true, dryRun: true }, reason, correlationId });
      response.status(200).json({ ok: true, responseCode: "DRY_RUN", responseMsg: "정산 HOLD와 전체취소 호출 경로를 검증했습니다. 실제 PayUp 취소는 실행하지 않았습니다.", transactionId, correlationId });
      return;
    }
    if (!(await featureFlagEnabled("FULL_CANCEL"))) throw new AdminHttpError(409, "FULL_CANCEL_OFF", "전체취소 회로가 OFF입니다.");
    assertLiveReady(config);

    const signature = sha256([config.merchantId, transactionId, config.apiCertKey]);
    const result = await postPayup({
      config,
      actor,
      operation: "FULL_CANCEL",
      path: `/v2/api/payment/${encodeURIComponent(config.merchantId)}/cancel2`,
      payload: { transactionId, signature },
      correlationId,
    });
    const responseCode = text(result.responseCode, 100);
    const status = responseCode === "0000" ? "CANCELLED" : responseCode === "1003" ? "MANUAL_PAYUP_REQUIRED" : "FAILED";
    await cancelRequestRef.set({
      status,
      response_code: responseCode,
      response_msg: text(result.responseMsg, 500),
      cancel_datetime: text(result.cancelDateTime, 30),
      payout_hold: responseCode !== "0000",
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    }, { merge: true });
    await writeAudit({ actor, action: responseCode === "0000" ? "PAYUP.CANCEL.COMPLETED" : responseCode === "1003" ? "PAYUP.CANCEL.MANUAL_REQUIRED" : "PAYUP.CANCEL.FAILED", targetType: "payment_transaction", targetId: transactionId, after: { status, responseCode, payoutHold: responseCode !== "0000" }, reason, correlationId });
    response.status(200).json({ ok: responseCode === "0000", responseCode, responseMsg: result.responseMsg, cancelDateTime: result.cancelDateTime, status, transactionId, correlationId });
  } catch (error) {
    sendError(response, error);
  }
});
