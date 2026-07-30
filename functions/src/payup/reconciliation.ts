import { FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAdminDb } from "../firebaseAdmin";
import { AccessHttpError, asRecord, safeDocumentId, text } from "../access/policy";
import {
  ORDER_PII_ENCRYPTION_KEY,
  PAYUP_API_CERT_KEY,
  PAYUP_API_KEY,
  assertRuntimeReady,
  featureFlagEnabled,
  getPayupRuntime,
  postPayup,
  writeIntegrationLog,
} from "./runtimeV2";
import { repairPayupApprovalLedger } from "./paymentLedger";
import { repairPayupCancelledTransaction } from "./cancellationLedger";
import {
  buildSettlementQueryPayload,
  buildTransactionListPayload,
  payupCartPath,
  projectListResponse,
  projectSettlementDetail,
  projectSettlementSummary,
  projectTransaction,
} from "./cartApiV12";

const REGION = "asia-northeast3";
const secrets = [PAYUP_API_KEY, PAYUP_API_CERT_KEY, ORDER_PII_ENCRYPTION_KEY];
type JsonRecord = Record<string, unknown>;

function enabled(name: string) {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function dateToken(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}${value("month")}${value("day")}`;
}

function numberValue(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function rows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function requireSuccess(result: JsonRecord, operation: string) {
  const code = text(result.responseCode, 100);
  if (code !== "0000") throw new AccessHttpError(502, "PAYUP_RECON_API_FAILED", `${operation} 실패: ${code || "unknown"} ${text(result.responseMsg, 500)}`);
}

async function commitMergeOperations(operations: Array<{ path: string; data: JsonRecord }>) {
  const db = getAdminDb();
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = db.batch();
    operations.slice(offset, offset + 400).forEach((operation) => {
      batch.set(db.doc(operation.path), operation.data, { merge: true });
    });
    await batch.commit();
  }
}

async function openManualAction(input: { type: string; transactionId?: string; orderNumber?: string; message: string }) {
  const id = safeDocumentId(`${input.type}-${input.transactionId || input.orderNumber || "unknown"}`);
  await getAdminDb().doc(`manual_action_queue/${id}`).set({
    provider: "payup",
    type: input.type,
    transaction_id: input.transactionId ?? null,
    order_number: input.orderNumber ?? null,
    message: input.message.slice(0, 1000),
    status: "OPEN",
    assigned_team: "FINANCE",
    occurrence_count: FieldValue.increment(1),
    updated_at: FieldValue.serverTimestamp(),
    updated_at_iso: new Date().toISOString(),
    created_at: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function reconcileDistributionRows(transactionId: string, transactionRow: JsonRecord) {
  const db = getAdminDb();
  const subRows = rows(transactionRow.subList ?? transactionRow.sub_list);
  const [distribution, activities] = await Promise.all([
    db.collection("payment_distribution_lines").where("transaction_id", "==", transactionId).limit(300).get(),
    db.collection("payup_partner_activity").where("transaction_id", "==", transactionId).limit(300).get(),
  ]);
  const internalBySub = new Map<string, number>();
  distribution.docs.forEach((document) => {
    const data = document.data();
    const subMerchantId = text(data.sub_merchant_id ?? data.subMerchantId, 20);
    internalBySub.set(subMerchantId, (internalBySub.get(subMerchantId) ?? 0) + numberValue(data.amount));
  });
  const payupBySub = new Map<string, { amount: number; subTransactionId: string }>();
  subRows.forEach((row) => {
    const subMerchantId = text(row.subMerchantId ?? row.sub_merchant_id, 20);
    if (!subMerchantId) return;
    const current = payupBySub.get(subMerchantId);
    payupBySub.set(subMerchantId, { amount: (current?.amount ?? 0) + numberValue(row.amount), subTransactionId: text(row.subTransactionId ?? row.sub_transaction_id, 100) || current?.subTransactionId || "" });
  });
  const allSubIds = [...new Set([...internalBySub.keys(), ...payupBySub.keys()])];
  const mismatch = allSubIds.filter((id) => (internalBySub.get(id) ?? 0) !== (payupBySub.get(id)?.amount ?? 0));
  const batch = db.batch();
  distribution.docs.forEach((document) => {
    const data = document.data();
    const subMerchantId = text(data.sub_merchant_id ?? data.subMerchantId, 20);
    const payup = payupBySub.get(subMerchantId);
    batch.set(document.ref, { sub_transaction_id: payup?.subTransactionId || null, payup_recipient_amount: payup?.amount ?? 0, reconciliation_status: mismatch.includes(subMerchantId) ? "MISMATCH" : "MATCHED", payout_hold: mismatch.includes(subMerchantId), payout_hold_reason: mismatch.includes(subMerchantId) ? "TRANSACTION_RECON_MISMATCH" : FieldValue.delete(), reconciled_at: FieldValue.serverTimestamp(), reconciled_at_iso: new Date().toISOString() }, { merge: true });
  });
  activities.docs.forEach((document) => {
    const data = document.data();
    const subMerchantId = text(data.sub_merchant_id, 20);
    const payup = payupBySub.get(subMerchantId);
    batch.set(document.ref, { sub_transaction_id: payup?.subTransactionId || null, transaction_status: "RECONCILED", reconciliation_status: mismatch.includes(subMerchantId) ? "MISMATCH" : "MATCHED", payout_hold: mismatch.includes(subMerchantId), reconciled_at: FieldValue.serverTimestamp() }, { merge: true });
  });
  await batch.commit();
  return { matched: mismatch.length === 0 && internalBySub.size > 0, mismatch };
}

export const payupReconcileTransactionsScheduled = onSchedule(
  { region: REGION, schedule: "every 10 minutes", timeZone: "Asia/Seoul", maxInstances: 1, secrets },
  async () => {
    if (!enabled("PAYUP_RECON_SCHEDULE_ENABLED") || !(await featureFlagEnabled("TRANSACTION_RECON"))) return;
    const config = getPayupRuntime();
    assertRuntimeReady(config);
    const db = getAdminDb();
    const queue = await db.collection("payup_reconciliation_queue").where("status", "==", "PENDING").limit(100).get();
    if (queue.empty) return;
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await postPayup({
      config,
      operation: "TRANSACTION_RECON_SCHEDULED",
      pathOrUrl: payupCartPath(config.merchantId, "auth-list"),
      payload: buildTransactionListPayload(config.apiKey, {
        searchFromDate: dateToken(fromDate),
        searchToDate: dateToken(new Date()),
      }),
    });
    requireSuccess(result, "거래내역 조회");
    const transactionRows = projectListResponse(result, projectTransaction).list;
    const byTransaction = new Map(transactionRows.map((row) => [text(row.transactionId, 100), row]));
    const byOrder = new Map(transactionRows.map((row) => [text(row.orderNumber, 40), row]));

    for (const document of queue.docs) {
      const data = document.data();
      let transactionId = text(data.transaction_id, 100);
      const orderNumber = text(data.order_number, 40);
      const row = byTransaction.get(transactionId) ?? byOrder.get(orderNumber);
      if (!row) {
        const attemptCount = numberValue(data.attempt_count) + 1;
        await document.ref.set({ attempt_count: attemptCount, last_result: "NOT_FOUND", last_checked_at: FieldValue.serverTimestamp(), last_checked_at_iso: new Date().toISOString() }, { merge: true });
        if (attemptCount >= 6) await openManualAction({ type: "TRANSACTION_RECON_NOT_FOUND", transactionId, orderNumber, message: "PayUp 거래조회에서 6회 이상 원거래를 찾지 못했습니다." });
        continue;
      }
      const rowTransactionId = text(row.transactionId, 100);
      const paymentSessionId = text(data.payment_session_id, 1500);
      if (!transactionId && rowTransactionId) transactionId = rowTransactionId;
      const statusCode = text(row.statusCode, 20);
      if (paymentSessionId && statusCode === "2001") {
        try {
          await repairPayupApprovalLedger(paymentSessionId, row);
        } catch (error) {
          await openManualAction({ type: "APPROVAL_LEDGER_REPAIR_FAILED", transactionId, orderNumber, message: error instanceof Error ? error.message : "ledger repair failed" });
        }
      }
      if (statusCode === "9001" && transactionId) {
        try {
          await repairPayupCancelledTransaction(transactionId, { responseCode: "0000", responseMsg: "PayUp 거래조회 취소성공", cancelDateTime: row.cancelDatetime ?? row.cancelDateTime });
        } catch (error) {
          await openManualAction({ type: "CANCEL_REVERSAL_REPAIR_FAILED", transactionId, orderNumber, message: error instanceof Error ? error.message : "cancel reversal failed" });
        }
      }
      const [internal, paymentSession] = await Promise.all([
        transactionId ? db.doc(`payup_transaction_snapshots/${safeDocumentId(transactionId)}`).get() : Promise.resolve(null),
        paymentSessionId ? db.doc(`payup_payment_sessions/${paymentSessionId}`).get() : Promise.resolve(null),
      ]);
      const expectedAmount = numberValue(internal?.data()?.total_amount ?? paymentSession?.data()?.amount);
      const actualAmount = numberValue(row.totalAmount ?? row.amount);
      const distributionResult = transactionId ? await reconcileDistributionRows(transactionId, row) : { matched: false, mismatch: ["transactionId missing"] };
      const matched = expectedAmount > 0 && expectedAmount === actualAmount && ["2001", "9001"].includes(statusCode) && distributionResult.matched;
      const batch = db.batch();
      batch.set(document.ref, { status: matched ? "COMPLETED" : "MISMATCH", last_result: statusCode, completed_at: matched ? FieldValue.serverTimestamp() : null, last_checked_at: FieldValue.serverTimestamp(), last_checked_at_iso: new Date().toISOString() }, { merge: true });
      if (transactionId) batch.set(db.doc(`payup_transaction_snapshots/${safeDocumentId(transactionId)}`), { ...row, provider: "payup", transaction_id: transactionId, reconciliation_status: matched ? "MATCHED" : "MISMATCH", reconciled_at: FieldValue.serverTimestamp(), reconciled_at_iso: new Date().toISOString() }, { merge: true });
      const payments = transactionId ? await db.collection("payments").where("transaction_id", "==", transactionId).limit(5).get() : null;
      payments?.docs.forEach((payment) => batch.set(payment.ref, { reconciliation_status: matched ? "MATCHED" : "MISMATCH", payup_status_code: statusCode, payout_hold: !matched, reconciled_at: FieldValue.serverTimestamp() }, { merge: true }));
      await batch.commit();
      if (!matched) await openManualAction({ type: "TRANSACTION_RECON_MISMATCH", transactionId, orderNumber, message: `내부 ${expectedAmount} / PayUp ${actualAmount} / 상태 ${statusCode} / 하위불일치 ${distributionResult.mismatch.join(",")}` });
    }
  },
);

export const payupReconcileSettlementsScheduled = onSchedule(
  { region: REGION, schedule: "every day 04:20", timeZone: "Asia/Seoul", maxInstances: 1, secrets },
  async () => {
    if (!enabled("PAYUP_RECON_SCHEDULE_ENABLED") || !(await featureFlagEnabled("SETTLEMENT_RECON"))) return;
    const config = getPayupRuntime();
    assertRuntimeReady(config);
    const db = getAdminDb();
    const from = dateToken(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const to = dateToken(new Date());
    const [summary, detail] = await Promise.all([
      postPayup({
        config,
        operation: "SETTLEMENT_LIST_SCHEDULED",
        pathOrUrl: payupCartPath(config.merchantId, "closing-list"),
        payload: buildSettlementQueryPayload(config.apiKey, { searchFromDate: from, searchToDate: to, dateType: "1" }),
      }),
      postPayup({
        config,
        operation: "SETTLEMENT_DETAIL_SCHEDULED",
        pathOrUrl: payupCartPath(config.merchantId, "closing-detail"),
        payload: buildSettlementQueryPayload(config.apiKey, { searchFromDate: from, searchToDate: to, dateType: "1" }),
      }),
    ]);
    requireSuccess(summary, "정산내역 조회");
    requireSuccess(detail, "정산상세 조회");
    const summaryRows = projectListResponse(summary, projectSettlementSummary).list;
    const detailRows = projectListResponse(detail, projectSettlementDetail).list;
    const summaryBySub = new Map(summaryRows.map((row) => [text(row.subMerchantId, 20), row]));
    const operations: Array<{ path: string; data: JsonRecord }> = [];
    summaryRows.forEach((row, index) => operations.push({
      path: `payup_settlement_snapshots/${safeDocumentId(`${text(row.subMerchantId, 20)}-${text(row.closeDate, 20)}-${text(row.supplyDate, 20)}-${index}`)}`,
      data: { ...row, provider: "payup", reconciliation_status: "SYNCED", reconciled_at: FieldValue.serverTimestamp(), reconciled_at_iso: new Date().toISOString() },
    }));
    detailRows.forEach((row, index) => operations.push({
      path: `payup_settlement_detail_snapshots/${safeDocumentId(`${text(row.subTransactionId, 100)}-${index}`)}`,
      data: { ...row, provider: "payup", reconciliation_status: "SYNCED", reconciled_at: FieldValue.serverTimestamp(), reconciled_at_iso: new Date().toISOString() },
    }));
    await commitMergeOperations(operations);

    for (const row of detailRows.slice(0, 500)) {
      const subTransactionId = text(row.subTransactionId, 100);
      if (!subTransactionId) continue;
      const [distribution, activities] = await Promise.all([
        db.collection("payment_distribution_lines").where("sub_transaction_id", "==", subTransactionId).limit(100).get(),
        db.collection("payup_partner_activity").where("sub_transaction_id", "==", subTransactionId).limit(100).get(),
      ]);
      const summaryRow = summaryBySub.get(text(row.subMerchantId, 20)) ?? {};
      const settlementStatus = text(summaryRow.supplyType ?? summaryRow.statusCode, 20) || "UNKNOWN";
      const updates = db.batch();
      distribution.docs.forEach((document) => updates.set(document.ref, { settlement_status: settlementStatus, settlement_amount: numberValue(row.amount), settlement_fee: numberValue(row.agentFee), settlement_vat: numberValue(row.agentVat), settlement_reconciliation_status: "MATCHED", settlement_reconciled_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() }, { merge: true }));
      activities.docs.forEach((document) => updates.set(document.ref, { settlement_status: settlementStatus, settlement_amount: numberValue(row.amount), settlement_fee: numberValue(row.agentFee), settlement_vat: numberValue(row.agentVat), settlement_reconciliation_status: "MATCHED", settlement_reconciled_at: FieldValue.serverTimestamp() }, { merge: true }));
      await updates.commit();
    }
    await writeIntegrationLog({ operation: "SETTLEMENT_RECON_SCHEDULED", path: "internal/reconciliation", responseCode: "0000", responseMsg: `정산 ${summaryRows.length}건, 상세 ${detailRows.length}건 동기화`, status: "success", merchantId: config.merchantId });
  },
);

export const payupRepairCancelReversalsScheduled = onSchedule(
  { region: REGION, schedule: "every 10 minutes", timeZone: "Asia/Seoul", maxInstances: 1, secrets },
  async () => {
    if (!enabled("PAYUP_RECON_SCHEDULE_ENABLED")) return;
    const db = getAdminDb();
    const snapshot = await db.collection("payup_cancellation_snapshots").where("status", "==", "CANCELLED_REVERSAL_PENDING").limit(20).get();
    for (const document of snapshot.docs) {
      const transactionId = text(document.data().transaction_id, 100);
      if (!transactionId) continue;
      try {
        await repairPayupCancelledTransaction(transactionId);
      } catch (error) {
        await document.ref.set({ reversal_attempt_count: FieldValue.increment(1), last_error: error instanceof Error ? error.message.slice(0, 1000) : "cancel reversal retry failed", last_attempt_at: FieldValue.serverTimestamp(), last_attempt_at_iso: new Date().toISOString() }, { merge: true });
      }
    }
  },
);
