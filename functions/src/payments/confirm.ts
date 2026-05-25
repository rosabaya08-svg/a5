import { reserveInventorySkeleton } from "../inventory/reserveInventory";
import { createOrderSnapshotDraft } from "../orders/createOrderSnapshot";
import { validateQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { appendAuditLogSkeleton, createAuditLogDraft } from "../utils/auditLog";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import {
  calculateItemsAmount,
  makeOrderNo,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type MockPgApproval,
  type PaymentConfirmRequest,
  type PaymentConfirmResponse,
} from "./types";

export async function paymentsConfirmHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentConfirmRequest>(request);
  const items = normalizeCartItems(body.items);
  const qrSessionId = String(body.qrSessionId ?? "");
  const paymentIntentId = String(body.paymentIntentId ?? "");

  if (items.length === 0 || !qrSessionId || !paymentIntentId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_CONFIRM_INPUT_INVALID",
        message: "paymentIntentId, qrSessionId, and items are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const qrValidation = validateQrSession({ qrSessionId, status: "active" });

  if (!qrValidation.ok) {
    sendJson(response, 409, { ok: false, error: qrValidation });
    return;
  }

  const recalculatedAmount = calculateItemsAmount(items);
  const amountAssertion = assertAmount(body.clientAmount, recalculatedAmount);

  if (!amountAssertion.ok) {
    sendJson(response, amountAssertion.error.httpStatus, { ok: false, error: amountAssertion.error });
    return;
  }

  const approvedAt = new Date().toISOString();
  const pgReadiness = getPgServerReadiness();
  const orderNo = body.orderNoCandidate ?? makeOrderNo(new Date(approvedAt));
  const inventoryPlan = reserveInventorySkeleton(items);
  const orderSnapshot = createOrderSnapshotDraft({
    orderNo,
    qrSessionId,
    nurseryId: body.nurseryId,
    roomId: body.roomId,
    tabletId: body.tabletId,
    items,
    totalAmount: recalculatedAmount,
    paidAt: approvedAt,
  });
  const auditPlan = appendAuditLogSkeleton(
    createAuditLogDraft({
      action: "mock_payment_confirm",
      target: paymentIntentId,
      severity: "info",
      message: "Mock approval only. Real PG confirm was not called.",
    }),
  );

  const approval: MockPgApproval = {
    provider: "mock",
    status: "approved_mock",
    mockTid: `MOCK-FN-${orderNo}`,
    approvedAt,
    message: "Mock approval only. No PG secret or real API was used.",
  };

  const result: PaymentConfirmResponse = {
    ok: true,
    provider: "mock",
    pgReady: pgReadiness.readyForAdapter,
    pgReadiness,
    approval,
    orderNo,
    recalculatedAmount,
    firestoreTransactionPlan: [
      ...getPgAdapterHandoffPlan(),
      ...inventoryPlan.transactionSteps,
      ...orderSnapshot.writePlan,
      `Append audit log at ${auditPlan.plannedPath}.`,
    ],
    message: "Payment confirm skeleton completed in mock mode.",
  };

  sendJson(response, 200, result);
}
