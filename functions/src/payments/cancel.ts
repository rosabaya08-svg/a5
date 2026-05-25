import { releaseInventorySkeleton } from "../inventory/releaseInventory";
import { appendAuditLogSkeleton, createAuditLogDraft } from "../utils/auditLog";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
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
