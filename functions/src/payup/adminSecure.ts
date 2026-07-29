import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  consumeApprovedChange,
  requireAccess,
  safeDocumentId,
  sendAccessError,
  text,
  writeAccessAudit,
} from "../access/policy";
import {
  ORDER_PII_ENCRYPTION_KEY,
  PAYUP_API_CERT_KEY,
  PAYUP_API_KEY,
  assertFeatureFlags,
  assertRuntimeReady,
  featureFlagEnabled,
  getPayupRuntime,
  maskIdentifier,
  postPayup,
  runtimeBlockers,
  sha256,
} from "./runtimeV2";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 10, secrets: [PAYUP_API_KEY, PAYUP_API_CERT_KEY, ORDER_PII_ENCRYPTION_KEY] };
const allowedFeatureFlags = new Set([
  "PAYUP_MASTER", "NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL", "CART_DISTRIBUTION",
  "SUBMERCHANT_CREATE", "SUBMERCHANT_UPDATE", "SUBMERCHANT_SYNC", "TRANSACTION_RECON",
  "SETTLEMENT_RECON", "FULL_CANCEL", "PARTIAL_CANCEL", "PAYOUT_HOLD", "MOCK_MODE",
  "LOCAL_PAID_FALLBACK",
]);
const permanentlyDisabledFlags = new Set(["PARTIAL_CANCEL", "LOCAL_PAID_FALLBACK"]);
const criticalEnableFlags = new Set(["PAYUP_MASTER", "FINAL_APPROVAL", "FULL_CANCEL"]);

type JsonRecord = Record<string, unknown>;

function maskAccount(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return `${digits.slice(0, 3)}-****-${digits.slice(-3)}`;
}

function dateToken(value: Date) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

function validateDateRange(from: string, to: string) {
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) throw new AccessHttpError(400, "INVALID_DATE_RANGE", "조회일자는 yyyyMMdd 형식이어야 합니다.");
  const parse = (value: string) => Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
  const days = Math.floor((parse(to) - parse(from)) / 86_400_000);
  if (!Number.isFinite(days) || days < 0 || days > 30) throw new AccessHttpError(400, "INVALID_DATE_RANGE", "PayUp 조회기간은 시작일부터 31일 이내여야 합니다.");
}

async function internalList(collectionName: string, limit = 500) {
  const snapshot = await getAdminDb().collection(collectionName).limit(limit).get();
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export const payupAdminHealthSecure = onRequest(options, async (request, response) => {
  try {
    const actor = await requireAccess(request, "PAYUP_HEALTH_PROBE");
    const config = getPayupRuntime();
    const blockers = runtimeBlockers(config, { requireApiCertKey: true, requirePiiKey: true });
    const cartApiBlockers = runtimeBlockers(config);
    const body = asRecord(request.body);
    let payupResponseCode = "";
    let payupResponseMsg = "";
    if (body.probe === true && cartApiBlockers.length === 0) {
      const result = await postPayup({ config, actor, operation: "SUBMERCHANT_LIST_PROBE", pathOrUrl: `/cartpay/api/sub/${encodeURIComponent(config.merchantId)}/list`, payload: { apiKey: config.apiKey } });
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
        A5_ORDER_PII_ENCRYPTION_KEY: config.orderPiiEncryptionKey.length >= 32,
        PAYUP_AUTH_RETURN_URL: Boolean(config.authReturnUrl),
      },
      blockers,
      cartApiBlockers,
      actorRoles: actor.roles,
      lastProbeAt: new Date().toISOString(),
      payupResponseCode: payupResponseCode || undefined,
      payupResponseMsg: payupResponseMsg || undefined,
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupAdminFeatureFlagsSecure = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const action = text(body.action, 30) || (text(body.key, 100) ? "update" : "list");
    if (action === "list") {
      const actor = await requireAccess(request, "PAYUP_VIEW");
      const snapshot = await getAdminDb().collection("payment_feature_flags").where("provider", "==", "payup").limit(100).get();
      const list = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      response.status(200).json({ ok: true, list, listCount: list.length, actorRoles: actor.roles, generatedAt: new Date().toISOString() });
      return;
    }
    const actor = await requireAccess(request, "PAYUP_FEATURE_FLAG_WRITE");
    const key = text(body.key, 100).toUpperCase();
    const enabled = body.enabled === true;
    const reason = text(body.reason, 500);
    if (!allowedFeatureFlags.has(key)) throw new AccessHttpError(400, "FEATURE_FLAG_UNKNOWN", "정의되지 않은 PayUp 회로입니다.");
    if (enabled && permanentlyDisabledFlags.has(key)) throw new AccessHttpError(409, "FEATURE_FLAG_PERMANENTLY_LOCKED", `${key} 회로는 정책상 영구 OFF입니다.`);
    if (enabled && criticalEnableFlags.has(key)) {
      await consumeApprovedChange({ approvalRequestId: text(body.approvalRequestId, 200), actionType: "FEATURE_FLAG_ENABLE", payload: { key, enabled: true }, actor });
    }
    if (enabled && ["PAYUP_MASTER", "NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL", "CART_DISTRIBUTION", "SUBMERCHANT_CREATE", "SUBMERCHANT_UPDATE", "FULL_CANCEL"].includes(key)) {
      assertRuntimeReady(getPayupRuntime(), {
        requireApiCertKey: ["NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL", "FULL_CANCEL"].includes(key),
        requireAuthReturn: ["NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL"].includes(key),
        requirePiiKey: ["NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL"].includes(key),
      });
    }
    const ref = getAdminDb().doc(`payment_feature_flags/payup_${safeDocumentId(key)}`);
    const beforeSnapshot = await ref.get();
    const after = { provider: "payup", key, enabled, reason, updated_by_uid: actor.uid, updated_by_email: actor.email, updated_at: FieldValue.serverTimestamp(), updated_at_iso: new Date().toISOString() };
    await ref.set(after, { merge: true });
    const correlationId = await writeAccessAudit({ actor, action: "PAYUP.FEATURE_FLAG.CHANGED", targetType: "payment_feature_flag", targetId: key, before: beforeSnapshot.data() ?? null, after: { ...after, updated_at: "serverTimestamp" }, reason });
    response.status(200).json({ ok: true, flag: key, enabled, correlationId });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupAdminSubmerchantsSecure = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const action = text(body.action, 30) || "list";
    const actor = await requireAccess(request, action === "list" ? "PAYUP_SUBMERCHANT_READ" : "PAYUP_SUBMERCHANT_WRITE");
    const config = getPayupRuntime();
    if (action === "list") {
      if (runtimeBlockers(config).length === 0 && await featureFlagEnabled("SUBMERCHANT_SYNC")) {
        const subMerchantId = text(body.subMerchantId, 20);
        const result = await postPayup({ config, actor, operation: "SUBMERCHANT_LIST", pathOrUrl: `/cartpay/api/sub/${encodeURIComponent(config.merchantId)}/list`, payload: { apiKey: config.apiKey, ...(subMerchantId ? { subMerchantId } : {}) }, subMerchantId });
        const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
        const batch = getAdminDb().batch();
        list.forEach((item) => {
          const id = text(item.subMerchantId, 20);
          if (!id) return;
          batch.set(getAdminDb().doc(`payup_submerchants/${safeDocumentId(id)}`), {
            merchant_id: config.merchantId,
            sub_merchant_id: id,
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
        });
        await batch.commit();
        response.status(200).json({ ok: text(result.responseCode, 100) === "0000", responseCode: result.responseCode, responseMsg: result.responseMsg, listCount: Number(result.listCount ?? list.length), list });
        return;
      }
      const list = await internalList("payup_submerchants");
      response.status(200).json({ ok: true, mode: "sandbox", responseCode: "SANDBOX", responseMsg: "내부 하위사업자 원장을 조회했습니다.", listCount: list.length, list });
      return;
    }
    if (action !== "upsert") throw new AccessHttpError(400, "SUBMERCHANT_ACTION_INVALID", "action은 list 또는 upsert여야 합니다.");
    const gubun = text(body.gubun, 1) === "2" ? "2" : "1";
    const subMerchantId = text(body.subMerchantId, 20);
    const subMerchantName = text(body.subMerchantName, 30);
    const ownerName = text(body.ownerName, 20);
    const phoneNumber = text(body.phoneNumber, 20).replace(/[^0-9]/g, "");
    const subBusinessNumber = text(body.subBusinessNumber, 20).replace(/[^0-9]/g, "");
    const accountBank = text(body.accountBank, 30);
    const accountNumber = text(body.accountNumber, 30).replace(/[^0-9]/g, "");
    const accountOwner = text(body.accountOwner, 30);
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(subMerchantId)) throw new AccessHttpError(400, "SUBMERCHANT_ID_INVALID", "subMerchantId는 20자 이내 영문·숫자·_-만 허용합니다.");
    if (!subMerchantName || !ownerName || !phoneNumber || !accountBank || !accountNumber || !accountOwner) throw new AccessHttpError(400, "SUBMERCHANT_FIELD_REQUIRED", "하위사업자 필수정보를 모두 입력해야 합니다.");
    if (subBusinessNumber.length !== 10) throw new AccessHttpError(400, "BUSINESS_NUMBER_INVALID", "사업자번호는 숫자 10자리여야 합니다.");
    const payload = { apiKey: config.apiKey, gubun, subMerchantId, subMerchantName, ownerName, phoneNumber, subBusinessNumber, accountBank, accountNumber, accountOwner };
    let result: JsonRecord = { responseCode: "SANDBOX", responseMsg: "내부 등록 대기 상태로 저장했습니다." };
    let status = "PENDING_ACTIVATION";
    if (runtimeBlockers(config).length === 0) {
      await assertFeatureFlags([gubun === "2" ? "SUBMERCHANT_UPDATE" : "SUBMERCHANT_CREATE"]);
      result = await postPayup({ config, actor, operation: gubun === "2" ? "SUBMERCHANT_UPDATE" : "SUBMERCHANT_CREATE", pathOrUrl: `/cartpay/api/sub/${encodeURIComponent(config.merchantId)}/update`, payload, subMerchantId });
      status = text(result.responseCode, 100) === "0000" ? "PENDING_VERIFICATION" : "ERROR";
    }
    const ref = getAdminDb().doc(`payup_submerchants/${safeDocumentId(subMerchantId)}`);
    const beforeSnapshot = await ref.get();
    const after = {
      merchant_id: config.merchantId || null,
      organization_id: text(body.organizationId, 160) || null,
      channel_ids: Array.isArray(body.channelIds) ? body.channelIds : [],
      role: text(body.role, 80),
      sub_merchant_id: subMerchantId,
      sub_merchant_name: subMerchantName,
      owner_name: ownerName,
      phone_number_masked: phoneNumber.replace(/(\d{3})\d+(\d{4})/, "$1****$2"),
      business_number: subBusinessNumber,
      account_bank: accountBank,
      account_number_masked: maskAccount(accountNumber),
      account_owner: accountOwner,
      status,
      payup_sync_status: "PENDING",
      last_response_code: text(result.responseCode, 100),
      last_response_msg: text(result.responseMsg, 500),
      updated_by_uid: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    };
    await ref.set(after, { merge: true });
    const correlationId = await writeAccessAudit({ actor, action: gubun === "2" ? "PAYUP.SUBMERCHANT.UPDATED" : "PAYUP.SUBMERCHANT.REGISTERED", targetType: "payup_submerchant", targetId: subMerchantId, before: beforeSnapshot.data() ?? null, after: { ...after, updated_at: "serverTimestamp" } });
    response.status(200).json({ ok: ["0000", "SANDBOX"].includes(text(result.responseCode, 100)), responseCode: result.responseCode, responseMsg: result.responseMsg, subMerchantId, status, correlationId });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupAdminTransactionsSecure = onRequest(options, async (request, response) => {
  try {
    const actor = await requireAccess(request, "PAYUP_TRANSACTION_READ");
    const config = getPayupRuntime();
    const body = asRecord(request.body);
    const today = dateToken(new Date());
    const from = text(body.searchFromDate, 8) || today;
    const to = text(body.searchToDate, 8) || today;
    validateDateRange(from, to);
    if (runtimeBlockers(config).length === 0 && await featureFlagEnabled("TRANSACTION_RECON")) {
      const subMerchantId = text(body.subMerchantId, 20);
      const result = await postPayup({ config, actor, operation: "TRANSACTION_LIST", pathOrUrl: `/cartpay/api/auth/${encodeURIComponent(config.merchantId)}/list`, payload: { apiKey: config.apiKey, searchFromDate: from, searchToDate: to, ...(subMerchantId ? { subMerchantId } : {}) }, subMerchantId });
      const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
      const batch = getAdminDb().batch();
      list.forEach((item) => {
        const transactionId = text(item.transactionId, 100);
        if (!transactionId) return;
        batch.set(getAdminDb().doc(`payup_transaction_snapshots/${safeDocumentId(transactionId)}`), { ...item, provider: "payup", transaction_id: transactionId, reconciled_at: FieldValue.serverTimestamp(), reconciled_at_iso: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      response.status(200).json({ ok: text(result.responseCode, 100) === "0000", responseCode: result.responseCode, responseMsg: result.responseMsg, listCount: Number(result.listCount ?? list.length), list });
      return;
    }
    const list = await internalList("payup_transaction_snapshots");
    response.status(200).json({ ok: true, responseCode: "SANDBOX", responseMsg: "내부 거래 스냅샷을 조회했습니다.", listCount: list.length, list });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupAdminSettlementsSecure = onRequest(options, async (request, response) => {
  try {
    const actor = await requireAccess(request, "PAYUP_SETTLEMENT_READ");
    const config = getPayupRuntime();
    const body = asRecord(request.body);
    const today = dateToken(new Date());
    const from = text(body.searchFromDate, 8) || today;
    const to = text(body.searchToDate, 8) || today;
    const dateType = ["1", "2", "3"].includes(text(body.dateType, 1)) ? text(body.dateType, 1) : "1";
    const detail = body.detail === true || text(body.action, 20) === "detail";
    validateDateRange(from, to);
    if (runtimeBlockers(config).length === 0 && await featureFlagEnabled("SETTLEMENT_RECON")) {
      const subMerchantId = text(body.subMerchantId, 20);
      const result = await postPayup({ config, actor, operation: detail ? "SETTLEMENT_DETAIL" : "SETTLEMENT_LIST", pathOrUrl: `/cartpay/api/closing/${encodeURIComponent(config.merchantId)}/${detail ? "detail" : "list"}`, payload: { apiKey: config.apiKey, searchFromDate: from, searchToDate: to, dateType, ...(subMerchantId ? { subMerchantId } : {}) }, subMerchantId });
      const list = Array.isArray(result.list) ? result.list.map(asRecord) : [];
      const collection = detail ? "payup_settlement_detail_snapshots" : "payup_settlement_snapshots";
      const batch = getAdminDb().batch();
      list.forEach((item, index) => {
        const id = detail ? `${text(item.subTransactionId, 100)}-${index}` : `${text(item.subMerchantId, 20)}-${text(item.closeDate, 20)}-${text(item.supplyDate, 20)}`;
        batch.set(getAdminDb().doc(`${collection}/${safeDocumentId(id)}`), { ...item, provider: "payup", reconciled_at: FieldValue.serverTimestamp(), reconciled_at_iso: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      response.status(200).json({ ok: text(result.responseCode, 100) === "0000", responseCode: result.responseCode, responseMsg: result.responseMsg, listCount: Number(result.listCount ?? list.length), list, detail });
      return;
    }
    const list = await internalList(detail ? "payup_settlement_detail_snapshots" : "payup_settlement_snapshots");
    response.status(200).json({ ok: true, responseCode: "SANDBOX", responseMsg: "내부 정산 스냅샷을 조회했습니다.", listCount: list.length, list, detail });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupAdminCancelSecure = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const dryRun = body.dryRun !== false;
    const actor = await requireAccess(request, dryRun ? "PAYUP_CANCEL_REQUEST" : "PAYUP_CANCEL_EXECUTE");
    const transactionId = text(body.transactionId, 100);
    if (!transactionId) throw new AccessHttpError(400, "CANCEL_TRANSACTION_REQUIRED", "PayUp transactionId가 필요합니다.");
    const amount = Number(body.amount ?? 0);
    const orderNumber = text(body.orderNumber, 30);
    const reason = text(body.reason, 500);
    if (dryRun) {
      response.status(200).json({ ok: true, dryRun: true, transactionId: maskIdentifier(transactionId), plan: ["원거래 조회", "정산 지급 HOLD", "cancel2 전체취소", "거래내역 재대사", "분배원장 역분개", "파트너·공급사 이벤트 반영"] });
      return;
    }
    await consumeApprovedChange({ approvalRequestId: text(body.approvalRequestId, 200), actionType: "FULL_CANCEL", payload: { transactionId, amount, orderNumber }, actor });
    const config = getPayupRuntime();
    assertRuntimeReady(config, { requireApiCertKey: true });
    await assertFeatureFlags(["PAYUP_MASTER", "FULL_CANCEL", "PAYOUT_HOLD"]);
    const result = await postPayup({ config, actor, operation: "FULL_CANCEL", pathOrUrl: `/v2/api/payment/${encodeURIComponent(config.merchantId)}/cancel2`, payload: { transactionId, signature: sha256([config.merchantId, transactionId, config.apiCertKey]) }, transactionId, orderNumber, requireApiCertKey: true });
    const responseCode = text(result.responseCode, 100);
    const status = responseCode === "0000" ? "CANCELLED" : responseCode === "1003" ? "MANUAL_PAYUP_REQUIRED" : "CANCEL_FAILED";
    const db = getAdminDb();
    const cancelId = `cancel-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const distributionSnapshot = await db.collection("payment_distribution_lines").where("transaction_id", "==", transactionId).limit(500).get();
    const activitySnapshot = await db.collection("payup_partner_activity").where("transaction_id", "==", transactionId).limit(500).get();
    const batch = db.batch();
    batch.set(db.doc(`payup_cancellation_snapshots/${safeDocumentId(cancelId)}`), { id: cancelId, provider: "payup", transaction_id: transactionId, order_number: orderNumber || null, amount, reason, status, response_code: responseCode, response_msg: text(result.responseMsg, 500), cancel_datetime: text(result.cancelDateTime, 50), requested_by_uid: actor.uid, created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() });
    if (responseCode === "0000") {
      distributionSnapshot.docs.forEach((document) => batch.set(document.ref, { status: "REVERSED", reversed_at: FieldValue.serverTimestamp(), reversed_at_iso: new Date().toISOString() }, { merge: true }));
      activitySnapshot.docs.forEach((document) => batch.set(document.ref, { event_type: "PARTNER.SALE.REVERSED", cancel_status: "CANCELLED", settlement_status: "REVERSED", reversed_at: FieldValue.serverTimestamp(), reversed_at_iso: new Date().toISOString() }, { merge: true }));
      if (orderNumber) batch.set(db.doc(`orders/${safeDocumentId(orderNumber)}`), { status: "cancelled", payment_status: "cancelled", cancel_transaction_id: transactionId, cancelled_at: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(db.doc(`payup_transaction_snapshots/${safeDocumentId(transactionId)}`), { status_code: "9001", cancel_datetime: text(result.cancelDateTime, 50), reconciled_at: FieldValue.serverTimestamp() }, { merge: true });
    }
    if (responseCode === "1003") batch.set(db.doc(`manual_action_queue/${safeDocumentId(cancelId)}`), { provider: "payup", type: "CANCEL_1003", transaction_id: transactionId, order_number: orderNumber || null, amount, status: "OPEN", assigned_team: "FINANCE", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() });
    await batch.commit();
    await writeAccessAudit({ actor, action: "PAYUP.FULL_CANCEL.EXECUTED", targetType: "payment_transaction", targetId: transactionId, after: { status, responseCode }, reason });
    response.status(responseCode === "0000" ? 200 : 409).json({ ok: responseCode === "0000", responseCode, responseMsg: result.responseMsg, status, cancelDateTime: result.cancelDateTime, manualActionRequired: responseCode === "1003" });
  } catch (error) {
    sendAccessError(response, error);
  }
});
