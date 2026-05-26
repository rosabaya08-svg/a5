import { releaseInventorySkeleton } from "../inventory/releaseInventory";
import { appendAuditLogSkeleton, createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import { getAdminDb } from "../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentCancelRequest,
} from "./types";

export async function paymentsCancelHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentCancelRequest & { items?: unknown }>(request);
  const orderNo = String(body.orderNo ?? "");

  if (!orderNo) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_CANCEL_INPUT_INVALID",
        message: "orderNo is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const pgReadiness = getPgServerReadiness();
  const releasePlan = releaseInventorySkeleton(normalizeCartItems(body.items));
  const auditPlan = appendAuditLogSkeleton(
    createAuditLogDraft({
      action: "payment_cancel_blocked",
      target: orderNo,
      severity: "blocked",
      message: "Real PG cancel/refund is blocked until PG and settlement policy approval.",
    }),
  );

  const db = getAdminDb();
  const cancelRequestId = `${orderNo}-${Date.now()}`;

  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("cancel_requests").doc(cancelRequestId), {
      order_no: orderNo,
      payment_key: body.paymentKey ?? null,
      amount: body.amount ?? null,
      reason: body.reason ?? "No reason supplied",
      requested_by: body.requestedBy ?? "CUSTOMER_GUEST",
      status: "manual_review_required",
      pg_cancel_called: false,
      source: "firebase_functions_cancel_blocked",
      demo_read_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });

    transaction.set(db.collection("audit_logs").doc(), {
      ...toAuditLogDocument(
        createAuditLogDraft({
          action: "payment_cancel_request",
          target: orderNo,
          severity: "blocked",
          message: "Real PG cancel/refund is blocked; manual review request recorded.",
        }),
      ),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: false,
    provider: "mock",
    pgReady: pgReadiness.readyForAdapter,
    pgReadiness,
    status: "cancel_blocked",
    orderNo,
    pgCancelCalled: false,
    firestoreTransactionPlan: [
      ...releasePlan.transactionSteps,
      ...getPgAdapterHandoffPlan(),
      "Mark refund/cancel request for manual review.",
      "Hold settlement payout until refund policy is approved.",
      `Append audit log at ${auditPlan.plannedPath}.`,
    ],
    message: "Real cancel/refund is blocked. This endpoint is a mock skeleton only.",
  });
}
