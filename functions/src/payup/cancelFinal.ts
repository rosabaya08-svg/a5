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
  PAYUP_API_CERT_KEY,
  PAYUP_API_KEY,
  assertFeatureFlags,
  assertRuntimeReady,
  getPayupRuntime,
  maskIdentifier,
  postPayup,
  sha256,
} from "./runtimeV2";
import { numberValue } from "./paymentShared";
import { repairPayupCancelledTransaction } from "./cancellationLedger";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 10, secrets: [PAYUP_API_KEY, PAYUP_API_CERT_KEY] };
const CANCEL_LOCK_MS = 2 * 60 * 1000;

export const payupAdminCancelFinal = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const dryRun = body.dryRun !== false;
    const actor = await requireAccess(request, dryRun ? "PAYUP_CANCEL_REQUEST" : "PAYUP_CANCEL_EXECUTE");
    const transactionId = text(body.transactionId, 100);
    if (!transactionId) throw new AccessHttpError(400, "CANCEL_TRANSACTION_REQUIRED", "PayUp transactionId가 필요합니다.");
    const db = getAdminDb();
    const transactionRef = db.doc(`payup_transaction_snapshots/${safeDocumentId(transactionId)}`);
    const [transactionSnapshot, paymentQuery] = await Promise.all([
      transactionRef.get(),
      db.collection("payments").where("transaction_id", "==", transactionId).limit(1).get(),
    ]);
    const transactionData = transactionSnapshot.data() ?? {};
    const paymentSnapshot = paymentQuery.docs[0];
    const payment = paymentSnapshot?.data() ?? {};
    const orderNumber = text(body.orderNumber, 40) || text(payment.order_no ?? transactionData.order_number, 40);
    const internalAmount = numberValue(payment.amount ?? transactionData.total_amount);
    if (!orderNumber || internalAmount <= 0) throw new AccessHttpError(409, "CANCEL_INTERNAL_TRANSACTION_NOT_FOUND", "내부 승인 원장과 주문번호를 찾지 못했습니다.");
    const requestedAmount = Number(body.amount ?? internalAmount);
    if (!Number.isInteger(requestedAmount) || requestedAmount !== internalAmount) throw new AccessHttpError(409, "CANCEL_AMOUNT_MISMATCH", "전체취소 금액은 원 승인금액과 정확히 일치해야 합니다.");
    const reason = text(body.reason, 500) || "관리자 전체취소";
    const approvalPayload = { transactionId, amount: internalAmount, orderNumber };

    if (dryRun) {
      response.status(200).json({
        ok: true,
        dryRun: true,
        transactionId: maskIdentifier(transactionId),
        orderNumber,
        amount: internalAmount,
        approvalPayload,
        plan: ["2인 승인 확인", "정산 지급 HOLD", "cancel2 전체취소", "거래내역 재대사", "분배원장 역분개", "재고 복원", "파트너·공급사 음수 이벤트"],
      });
      return;
    }

    await consumeApprovedChange({ approvalRequestId: text(body.approvalRequestId, 200), actionType: "FULL_CANCEL", payload: approvalPayload, actor });
    const config = getPayupRuntime();
    assertRuntimeReady(config);
    await assertFeatureFlags(["PAYUP_MASTER", "FULL_CANCEL", "PAYOUT_HOLD"]);
    if (text(payment.status, 30) !== "approved" && text(transactionData.status_code, 20) !== "2001") throw new AccessHttpError(409, "CANCEL_TRANSACTION_NOT_APPROVED", "승인 완료된 PayUp 거래만 전체취소할 수 있습니다.");

    const cancellationRef = db.doc(`payup_cancellation_snapshots/${safeDocumentId(transactionId)}`);
    const distribution = await db.collection("payment_distribution_lines").where("transaction_id", "==", transactionId).limit(300).get();
    const callId = randomUUID();
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(cancellationRef);
      const data = existing.data() ?? {};
      const status = text(data.status, 50);
      if (status === "CANCELLED") return;
      if (status === "CANCEL_CALLING") {
        const startedAt = Date.parse(text(data.cancel_call_started_at_iso, 50));
        if (Number.isFinite(startedAt) && Date.now() - startedAt < CANCEL_LOCK_MS) throw new AccessHttpError(409, "CANCEL_IN_PROGRESS", "같은 거래의 전체취소가 이미 진행 중입니다.");
        throw new AccessHttpError(409, "CANCEL_RECONCILIATION_REQUIRED", "이전 전체취소 결과가 불명확하여 거래조회 대사가 필요합니다.");
      }
      transaction.set(cancellationRef, {
        provider: "payup",
        transaction_id: transactionId,
        order_number: orderNumber,
        amount: internalAmount,
        reason,
        status: "CANCEL_CALLING",
        payout_hold: true,
        cancel_call_id: callId,
        cancel_call_started_at: FieldValue.serverTimestamp(),
        cancel_call_started_at_iso: new Date().toISOString(),
        requested_by_uid: actor.uid,
        requested_by_email: actor.email,
        created_at: existing.exists ? data.created_at ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
      distribution.docs.forEach((document) => transaction.set(document.ref, { payout_hold: true, payout_hold_reason: "FULL_CANCEL_PENDING", cancel_status: "REQUESTED", updated_at: FieldValue.serverTimestamp() }, { merge: true }));
    });

    let result: Record<string, unknown>;
    try {
      result = await postPayup({
        config,
        actor,
        operation: "FULL_CANCEL",
        pathOrUrl: `/v2/api/payment/${encodeURIComponent(config.merchantId)}/cancel2`,
        payload: { transactionId, signature: sha256([config.merchantId, transactionId, config.apiCertKey]) },
        transactionId,
        orderNumber,
      });
    } catch (error) {
      await Promise.all([
        cancellationRef.set({ status: "CANCEL_UNKNOWN", payout_hold: true, last_error: error instanceof Error ? error.message.slice(0, 1000) : "PayUp 취소결과 확인 필요", updated_at: FieldValue.serverTimestamp(), updated_at_iso: new Date().toISOString() }, { merge: true }),
        db.collection("manual_action_queue").add({ provider: "payup", type: "CANCEL_UNKNOWN", transaction_id: transactionId, order_number: orderNumber, amount: internalAmount, status: "OPEN", assigned_team: "FINANCE", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() }),
        db.collection("payup_reconciliation_queue").add({ provider: "payup", type: "CANCEL_RECONCILIATION", transaction_id: transactionId, order_number: orderNumber, status: "PENDING", attempt_count: 0, created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() }),
      ]);
      throw new AccessHttpError(502, "CANCEL_RESULT_UNKNOWN", "PayUp 전체취소 결과를 확정할 수 없어 지급 HOLD와 자동 대사를 유지합니다.");
    }

    const responseCode = text(result.responseCode, 100);
    const responseMsg = text(result.responseMsg, 500);
    if (responseCode === "0000") {
      await cancellationRef.set({ status: "CANCELLED_REVERSAL_PENDING", payout_hold: true, response_code: responseCode, response_msg: responseMsg, cancel_datetime: text(result.cancelDateTime, 50), updated_at: FieldValue.serverTimestamp(), updated_at_iso: new Date().toISOString() }, { merge: true });
      try {
        await repairPayupCancelledTransaction(transactionId, result);
      } catch (error) {
        await Promise.all([
          cancellationRef.set({ status: "CANCELLED_REVERSAL_PENDING", last_error: error instanceof Error ? error.message.slice(0, 1000) : "역분개 실패", updated_at: FieldValue.serverTimestamp() }, { merge: true }),
          db.collection("payup_recovery_queue").add({ provider: "payup", type: "CANCEL_REVERSAL_FAILED", transaction_id: transactionId, order_number: orderNumber, status: "OPEN", error: error instanceof Error ? error.message.slice(0, 1000) : "역분개 실패", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() }),
        ]);
        response.status(202).json({ ok: true, responseCode, responseMsg, status: "CANCELLED_REVERSAL_PENDING", transactionId, orderNumber, manualActionRequired: true });
        return;
      }
      await writeAccessAudit({ actor, action: "PAYUP.FULL_CANCEL.COMPLETED", targetType: "payment_transaction", targetId: transactionId, after: { status: "CANCELLED", responseCode }, reason });
      response.status(200).json({ ok: true, responseCode, responseMsg, status: "CANCELLED", transactionId, orderNumber, cancelDateTime: result.cancelDateTime });
      return;
    }

    const status = responseCode === "1003" ? "MANUAL_PAYUP_REQUIRED" : "CANCEL_FAILED";
    await cancellationRef.set({ status, payout_hold: true, response_code: responseCode, response_msg: responseMsg, updated_at: FieldValue.serverTimestamp(), updated_at_iso: new Date().toISOString() }, { merge: true });
    if (["1003", "1004", "1005", "1006"].includes(responseCode)) {
      await db.collection("manual_action_queue").add({ provider: "payup", type: `CANCEL_${responseCode}`, transaction_id: transactionId, order_number: orderNumber, amount: internalAmount, message: responseMsg, status: "OPEN", assigned_team: "FINANCE", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() });
    }
    await writeAccessAudit({ actor, action: "PAYUP.FULL_CANCEL.FAILED", targetType: "payment_transaction", targetId: transactionId, after: { status, responseCode }, reason });
    response.status(409).json({ ok: false, responseCode, responseMsg, status, transactionId, orderNumber, manualActionRequired: ["1003", "1004", "1005", "1006"].includes(responseCode) });
  } catch (error) {
    sendAccessError(response, error);
  }
});
