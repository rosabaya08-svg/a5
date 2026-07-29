import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAdminDb } from "../firebaseAdmin";
import { enforceBrowserRequestGuards } from "../access/requestGuards";
import { AccessHttpError, asRecord, firestoreDocumentId, sendAccessError, text } from "../access/policy";
import {
  ORDER_PII_ENCRYPTION_KEY,
  PAYUP_API_CERT_KEY,
  PAYUP_API_KEY,
  assertFeatureFlags,
  assertRuntimeReady,
  getPayupRuntime,
  postPayup,
  writeIntegrationLog,
} from "./runtimeV2";
import {
  assertPublicSessionCredential,
  integer,
  normalizePayupDateTime,
  numberValue,
  releaseReservation,
  type JsonRecord,
} from "./paymentShared";
import { commitPayupApproval } from "./paymentLedger";

const REGION = "asia-northeast3";
const APPROVAL_CALL_LOCK_MS = 2 * 60 * 1000;
const options = { region: REGION, cors: true, maxInstances: 30, secrets: [PAYUP_API_KEY, PAYUP_API_CERT_KEY, ORDER_PII_ENCRYPTION_KEY] };
const cleanupOptions = { region: REGION, schedule: "every 5 minutes", timeZone: "Asia/Seoul", maxInstances: 1 };

function boolEnv(name: string) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function channelReturnUrl(session: JsonRecord, kind: "success" | "failure") {
  return text(kind === "success" ? session.source_success_return_url : session.source_failure_return_url, 1000);
}

async function acquireApprovalCall(paymentSessionId: string) {
  const db = getAdminDb();
  const ref = db.doc(`payup_payment_sessions/${paymentSessionId}`);
  const callId = randomUUID();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new AccessHttpError(404, "PAYUP_PAYMENT_SESSION_NOT_FOUND", "PayUp 결제세션을 찾을 수 없습니다.");
    const data = snapshot.data() ?? {};
    const status = text(data.status, 30);
    if (status === "APPROVED") return;
    if (["APPROVAL_UNKNOWN", "LEDGER_COMMIT_PENDING"].includes(status)) throw new AccessHttpError(409, "PAYUP_RECONCILIATION_REQUIRED", "승인결과를 재호출하지 말고 PayUp 거래조회로 대사해야 합니다.");
    if (status === "APPROVAL_CALLING") {
      const startedAt = Date.parse(text(data.approval_call_started_at_iso, 50));
      if (Number.isFinite(startedAt) && Date.now() - startedAt < APPROVAL_CALL_LOCK_MS) throw new AccessHttpError(409, "PAYUP_APPROVAL_IN_PROGRESS", "같은 결제의 최종승인이 이미 진행 중입니다.");
      transaction.set(ref, { status: "APPROVAL_UNKNOWN", last_error: "승인호출 응답시간 초과", updated_at: FieldValue.serverTimestamp(), updated_at_iso: new Date().toISOString() }, { merge: true });
      throw new AccessHttpError(409, "PAYUP_RECONCILIATION_REQUIRED", "이전 승인호출 결과가 불명확하여 PayUp 거래조회 대사가 필요합니다.");
    }
    if (status !== "AUTH_PENDING") throw new AccessHttpError(409, "PAYUP_PAYMENT_SESSION_STATE_INVALID", `승인 가능한 결제세션 상태가 아닙니다: ${status}`);
    if (Date.parse(text(data.expires_at_iso, 50)) <= Date.now()) throw new AccessHttpError(409, "PAYUP_PAYMENT_SESSION_EXPIRED", "결제세션이 만료됐습니다.");
    transaction.set(ref, { status: "APPROVAL_CALLING", approval_call_id: callId, approval_call_started_at: FieldValue.serverTimestamp(), approval_call_started_at_iso: new Date().toISOString(), approval_attempt_count: FieldValue.increment(1), updated_at: FieldValue.serverTimestamp() }, { merge: true });
  });
  return callId;
}

async function writeApprovalRecovery(input: { paymentSessionId: string; error: unknown; response?: JsonRecord }) {
  const db = getAdminDb();
  const message = input.error instanceof Error ? input.error.message : "PayUp 승인 결과 확인 필요";
  const sessionSnapshot = await db.doc(`payup_payment_sessions/${input.paymentSessionId}`).get();
  const session = sessionSnapshot.data() ?? {};
  const orderNumber = text(session.order_number, 30);
  await Promise.all([
    db.doc(`payup_payment_sessions/${input.paymentSessionId}`).set({ status: "APPROVAL_UNKNOWN", last_error: message.slice(0, 500), updated_at: FieldValue.serverTimestamp(), updated_at_iso: new Date().toISOString() }, { merge: true }),
    db.collection("manual_action_queue").add({ provider: "payup", type: "APPROVAL_UNKNOWN", payment_session_id: input.paymentSessionId, order_number: orderNumber || null, source_channel: text(session.source_channel, 30) || null, source_order_no: text(session.source_order_no, 200) || null, response_snapshot: input.response ? { responseCode: text(input.response.responseCode, 100), responseMsg: text(input.response.responseMsg, 500), transactionId: text(input.response.transactionId, 100) } : null, status: "OPEN", assigned_team: "FINANCE", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() }),
    db.collection("payup_reconciliation_queue").add({ provider: "payup", type: "APPROVAL_UNKNOWN_RECOVERY", payment_session_id: input.paymentSessionId, order_number: orderNumber || null, transaction_id: text(input.response?.transactionId, 100) || null, source_channel: text(session.source_channel, 30) || null, source_order_no: text(session.source_order_no, 200) || null, status: "PENDING", attempt_count: 0, created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() }),
  ]);
}

async function approvePayment(input: { paymentSessionId: string; clientToken?: string; authReturnState?: string; authData: JsonRecord }) {
  const db = getAdminDb();
  const config = getPayupRuntime();
  assertRuntimeReady(config);
  await assertFeatureFlags(["PAYUP_MASTER", "CART_DISTRIBUTION", "FINAL_APPROVAL"]);
  const paymentSessionId = firestoreDocumentId(input.paymentSessionId, "paymentSessionId");
  const sessionRef = db.doc(`payup_payment_sessions/${paymentSessionId}`);
  const initialSession = await sessionRef.get();
  if (!initialSession.exists) throw new AccessHttpError(404, "PAYUP_PAYMENT_SESSION_NOT_FOUND", "PayUp 결제세션을 찾을 수 없습니다.");
  const initial = initialSession.data() ?? {};
  assertPublicSessionCredential(initial, { clientToken: input.clientToken, authReturnState: input.authReturnState });
  if (text(initial.status, 30) === "APPROVED") {
    return {
      orderNumber: text(initial.order_number, 30),
      transactionId: text(initial.transaction_id, 100),
      amount: numberValue(initial.amount),
      duplicate: true,
      returnUrl: channelReturnUrl(initial, "success") || undefined,
      sourceOrderNo: text(initial.source_order_no, 200) || undefined,
    };
  }
  if (["APPROVAL_UNKNOWN", "LEDGER_COMMIT_PENDING"].includes(text(initial.status, 30))) throw new AccessHttpError(409, "PAYUP_RECONCILIATION_REQUIRED", "승인 결과가 이미 불명확하거나 원장 복구 중입니다. 거래조회 대사를 기다려 주세요.");

  const authResultCode = text(input.authData.AuthResultCode ?? input.authData.authResultCode, 20);
  if (authResultCode !== "0000") {
    await releaseReservation(paymentSessionId, "AUTH_FAILED", text(input.authData.AuthResultMsg ?? input.authData.authResultMsg, 500) || `인증 실패 ${authResultCode}`);
    throw new AccessHttpError(409, "PAYUP_AUTH_FAILED", text(input.authData.AuthResultMsg ?? input.authData.authResultMsg, 500) || "카드 인증에 실패했습니다.");
  }
  const authToken = text(input.authData.AuthToken ?? input.authData.authToken, 2000);
  const mid = text(input.authData.MID ?? input.authData.mid, 100);
  const authSignature = text(input.authData.Signature ?? input.authData.signature, 2000);
  const txTid = text(input.authData.TxTid ?? input.authData.txTid, 2000);
  if (!authToken || !mid || !authSignature || !txTid) throw new AccessHttpError(400, "PAYUP_AUTH_DATA_INCOMPLETE", "PayUp 카드 인증 필수값이 누락됐습니다.");
  const expectedMid = text(asRecord(initial.form_fields_safe).MID, 100);
  if (expectedMid && expectedMid !== mid) throw new AccessHttpError(409, "PAYUP_AUTH_MID_MISMATCH", "인증결과 MID가 주문요청 MID와 일치하지 않습니다.");

  const planId = firestoreDocumentId(initial.distribution_plan_id, "distributionPlanId");
  const planSnapshot = await db.doc(`payment_distribution_plans/${planId}`).get();
  if (!planSnapshot.exists || text(planSnapshot.data()?.status, 30) !== "LOCKED") throw new AccessHttpError(409, "PAYUP_DISTRIBUTION_PLAN_NOT_LOCKED", "차액분배 원장이 잠금 상태가 아닙니다.");
  const plan = planSnapshot.data() ?? {};
  const cartPayList = Array.isArray(plan.cart_pay_list) ? plan.cart_pay_list.map((entry) => {
    const line = asRecord(entry);
    return { subMerchantId: text(line.subMerchantId ?? line.sub_merchant_id, 20), amount: String(integer(line.amount, "cartPayList.amount", 1)) };
  }) : [];
  if (!cartPayList.length) throw new AccessHttpError(409, "PAYUP_CARTPAY_EMPTY", "cartPayList가 없습니다.");
  const amount = integer(initial.amount, "paymentSession.amount", 1);
  const sum = cartPayList.reduce((total, line) => total + Number(line.amount), 0);
  if (sum !== amount) throw new AccessHttpError(409, "PAYUP_CARTPAY_SUM_MISMATCH", `cartPayList 합계 ${sum}원이 승인금액 ${amount}원과 일치하지 않습니다.`);

  await acquireApprovalCall(paymentSessionId);
  const approvalPayload: JsonRecord = { AuthResultCode: authResultCode, AuthToken: authToken, MID: mid, Signature: authSignature, TxTid: txTid, cartPayFlag: "Y", cartPayList };
  let result: JsonRecord;
  try {
    result = await postPayup({ config, operation: "PAYMENT_APPROVAL", pathOrUrl: text(initial.pay_url, 1000), payload: approvalPayload, orderNumber: text(initial.order_number, 30) });
  } catch (error) {
    await writeApprovalRecovery({ paymentSessionId, error });
    throw new AccessHttpError(502, "PAYUP_APPROVAL_UNKNOWN", "PayUp 승인결과를 확정할 수 없습니다. 자동 대사와 관리자 확인이 필요합니다.");
  }
  if (text(result.responseCode, 100) !== "0000") {
    await releaseReservation(paymentSessionId, "APPROVAL_FAILED", text(result.responseMsg, 500) || "PayUp 최종승인 거절");
    throw new AccessHttpError(502, "PAYUP_APPROVAL_REJECTED", text(result.responseMsg, 500) || "PayUp 최종승인이 거절됐습니다.");
  }
  const transactionId = text(result.transactionId, 100);
  if (!transactionId) {
    await writeApprovalRecovery({ paymentSessionId, error: new Error("transactionId missing"), response: result });
    throw new AccessHttpError(502, "PAYUP_TRANSACTION_ID_MISSING", "PayUp 승인응답에 transactionId가 없어 자동 대사가 필요합니다.");
  }
  const responseAmount = integer(result.amount, "PayUp approval amount", 1);
  const expectedOrderNumber = text(initial.order_number, 30);
  const responseOrderNumber = text(result.orderNumber, 30);
  if (responseAmount !== amount || (responseOrderNumber && responseOrderNumber !== expectedOrderNumber)) {
    await writeApprovalRecovery({ paymentSessionId, error: new Error(`approval mismatch amount=${responseAmount}/${amount} order=${responseOrderNumber}/${expectedOrderNumber}`), response: result });
    throw new AccessHttpError(502, "PAYUP_APPROVAL_RESPONSE_MISMATCH", "PayUp 승인응답 금액 또는 주문번호가 내부 원장과 일치하지 않아 자동 대사가 필요합니다.");
  }
  const approvedAt = normalizePayupDateTime(result.authDateTime);
  const orderNumber = responseOrderNumber || expectedOrderNumber;
  await commitPayupApproval({ paymentSessionId, result, transactionId, orderNumber, approvedAt });
  return {
    orderNumber,
    transactionId,
    amount,
    duplicate: false,
    returnUrl: channelReturnUrl(initial, "success") || undefined,
    sourceOrderNo: text(initial.source_order_no, 200) || undefined,
  };
}

export const payupPaymentApprove = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    await enforceBrowserRequestGuards(request);
    const body = asRecord(request.body);
    const result = await approvePayment({ paymentSessionId: text(body.paymentSessionId, 1500), clientToken: text(body.clientToken, 500), authData: asRecord(body.authData ?? body) });
    response.status(200).json({ ok: true, provider: "payup", ...result });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupPaymentAbort = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    await enforceBrowserRequestGuards(request);
    const body = asRecord(request.body);
    const paymentSessionId = firestoreDocumentId(body.paymentSessionId, "paymentSessionId");
    const sessionSnapshot = await getAdminDb().doc(`payup_payment_sessions/${paymentSessionId}`).get();
    if (!sessionSnapshot.exists) throw new AccessHttpError(404, "PAYUP_PAYMENT_SESSION_NOT_FOUND", "PayUp 결제세션을 찾을 수 없습니다.");
    const sessionData = sessionSnapshot.data() ?? {};
    assertPublicSessionCredential(sessionData, { clientToken: text(body.clientToken, 500) });
    const status = text(sessionData.status, 30);
    if (["APPROVED", "APPROVAL_CALLING", "APPROVAL_UNKNOWN", "LEDGER_COMMIT_PENDING"].includes(status)) throw new AccessHttpError(409, "PAYUP_ABORT_NOT_ALLOWED", "승인 진행 또는 승인확인 상태에서는 결제세션을 해제할 수 없습니다.");
    await releaseReservation(paymentSessionId, "AUTH_CANCELLED", text(body.reason, 500) || "고객 결제창 종료");
    response.status(200).json({ ok: true, paymentSessionId, status: "AUTH_CANCELLED", returnUrl: channelReturnUrl(sessionData, "failure") || undefined });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupPaymentStatus = onRequest({ region: REGION, cors: true, maxInstances: 30 }, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    await enforceBrowserRequestGuards(request);
    const body = asRecord(request.body);
    const paymentSessionId = text(body.paymentSessionId, 1500);
    let snapshot;
    if (paymentSessionId) snapshot = await getAdminDb().doc(`payup_payment_sessions/${firestoreDocumentId(paymentSessionId, "paymentSessionId")}`).get();
    else {
      const shortCode = text(body.shortCode, 80);
      if (!shortCode) throw new AccessHttpError(400, "PAYUP_STATUS_KEY_REQUIRED", "paymentSessionId 또는 shortCode가 필요합니다.");
      const query = await getAdminDb().collection("payup_payment_sessions").where("short_code", "==", shortCode).limit(1).get();
      if (query.empty) throw new AccessHttpError(404, "PAYUP_PAYMENT_SESSION_NOT_FOUND", "PayUp 결제세션을 찾을 수 없습니다.");
      snapshot = query.docs[0];
    }
    if (!snapshot.exists) throw new AccessHttpError(404, "PAYUP_PAYMENT_SESSION_NOT_FOUND", "PayUp 결제세션을 찾을 수 없습니다.");
    const data = snapshot.data() ?? {};
    const clientToken = text(body.clientToken, 500);
    const detailed = Boolean(paymentSessionId && clientToken);
    if (paymentSessionId) assertPublicSessionCredential(data, { clientToken });
    response.status(200).json({ ok: true, paymentSessionId: snapshot.id, status: text(data.status, 30), orderNumber: detailed ? text(data.order_number, 30) || undefined : undefined, transactionIdMasked: detailed && text(data.transaction_id, 100) ? `${text(data.transaction_id, 100).slice(0, 5)}***${text(data.transaction_id, 100).slice(-4)}` : undefined, amount: numberValue(data.amount), updatedAt: text(data.updated_at_iso ?? data.approved_at, 50), returnUrl: detailed ? channelReturnUrl(data, text(data.status, 30) === "APPROVED" ? "success" : "failure") || undefined : undefined });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupMobileAuthReturn = onRequest(options, async (request, response) => {
  const query = asRecord(request.query);
  const body = asRecord(request.body);
  const paymentSessionId = text(query.session ?? body.session ?? body.ReqReserved, 1500);
  const authReturnState = text(query.state ?? body.state, 500);
  try {
    const result = await approvePayment({ paymentSessionId, authReturnState, authData: { ...query, ...body } });
    const sessionSnapshot = await getAdminDb().doc(`payup_payment_sessions/${firestoreDocumentId(paymentSessionId, "paymentSessionId")}`).get();
    const session = sessionSnapshot.data() ?? {};
    const shortCode = text(session.short_code, 80);
    const runtime = getPayupRuntime();
    const sourceReturn = channelReturnUrl(session, "success");
    if (sourceReturn) {
      response.redirect(sourceReturn);
      return;
    }
    const fallback = shortCode ? `/q/${encodeURIComponent(shortCode)}/success` : "/orders/guest";
    const url = new URL(runtime.successReturnUrl || fallback, "https://a5.invalid");
    url.searchParams.set("orderNo", result.orderNumber);
    url.searchParams.set("transactionId", result.transactionId);
    response.redirect(url.origin === "https://a5.invalid" ? `${url.pathname}${url.search}` : url.toString());
  } catch (error) {
    let sourceFailure = "";
    try {
      const sessionSnapshot = await getAdminDb().doc(`payup_payment_sessions/${firestoreDocumentId(paymentSessionId, "paymentSessionId")}`).get();
      sourceFailure = channelReturnUrl(sessionSnapshot.data() ?? {}, "failure");
    } catch {
      // 기본 실패 URL로 이동합니다.
    }
    if (sourceFailure) {
      response.redirect(sourceFailure);
      return;
    }
    const runtime = getPayupRuntime();
    const url = new URL(runtime.failureReturnUrl || "/orders/guest", "https://a5.invalid");
    url.searchParams.set("paymentSessionId", paymentSessionId);
    url.searchParams.set("error", error instanceof Error ? error.message.slice(0, 300) : "PAYUP_APPROVAL_FAILED");
    response.redirect(url.origin === "https://a5.invalid" ? `${url.pathname}${url.search}` : url.toString());
  }
});

export const payupExpirePaymentSessions = onSchedule(cleanupOptions, async () => {
  if (!boolEnv("PAYUP_SESSION_CLEANUP_ENABLED")) return;
  const snapshot = await getAdminDb().collection("payup_payment_sessions").limit(200).get();
  for (const document of snapshot.docs) {
    const data = document.data();
    const status = text(data.status, 30);
    const expiresAt = Date.parse(text(data.expires_at_iso, 50));
    if (["ORDER_CREATING", "AUTH_PENDING", "AUTH_FAILED", "AUTH_CANCELLED"].includes(status) && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      try {
        await releaseReservation(document.id, "EXPIRED", "결제세션 유효시간 만료");
      } catch (error) {
        await writeIntegrationLog({ operation: "PAYMENT_SESSION_CLEANUP", path: "internal/payup_payment_sessions", responseCode: "CLEANUP_FAILED", responseMsg: error instanceof Error ? error.message : "cleanup failed", status: "failed", orderNumber: text(data.order_number, 30) });
      }
    }
  }
});
