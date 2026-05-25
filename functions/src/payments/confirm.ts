import { reserveInventorySkeleton } from "../inventory/reserveInventory";
import { createOrderSnapshotDraft } from "../orders/createOrderSnapshot";
import { validateQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { appendAuditLogSkeleton, createAuditLogDraft } from "../utils/auditLog";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import { getAdminDb } from "../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
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

  try {
    const db = getAdminDb();

    await db.runTransaction(async (transaction) => {
      const intentRef = db.collection("payment_intents").doc(paymentIntentId);
      const paymentRef = db.collection("payments").doc(paymentIntentId);
      const orderRef = db.collection("orders").doc(orderNo);
      const qrRef = db.collection("qr_payment_sessions").doc(qrSessionId);
      const auditRef = db.collection("audit_logs").doc();
      const eventRef = db.collection("payment_events").doc(`${paymentIntentId}-approved-mock`);
      const inventoryMovementRefs = items.map(() => db.collection("inventory_movements").doc());
      const productRefs = items.map((item) => db.collection("products").doc(item.productId));
      const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

      productSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) return;

        const inventory = snapshot.get("inventory");
        const requested = items[index].quantity;

        if (typeof inventory === "number" && inventory < requested) {
          throw new Error(`OUT_OF_STOCK:${items[index].productId}`);
        }
      });

      transaction.set(
        intentRef,
        {
          status: "confirmed_mock",
          confirmed_at: approvedAt,
          order_no: orderNo,
          mock_tid: approval.mockTid,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        paymentRef,
        {
          id: paymentIntentId,
          payment_id: paymentIntentId,
          payment_intent_id: paymentIntentId,
          order_id: orderNo,
          order_no: orderNo,
          qr_session_id: qrSessionId,
          status: "approved_mock",
          amount: recalculatedAmount,
          currency: "KRW",
          provider: "mock",
          mock_tid: approval.mockTid,
          approved_at: approvedAt,
          source: "firebase_functions_mock_confirm",
          guest_lookup_enabled: true,
          demo_read_enabled: true,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        orderRef,
        {
          id: orderNo,
          order_id: orderNo,
          orderNo,
          order_no: orderNo,
          qrSessionId,
          qr_session_id: qrSessionId,
          nurseryId: body.nurseryId ?? "nursery-gangnam-01",
          nursery_id: body.nurseryId ?? "nursery-gangnam-01",
          roomId: body.roomId ?? "room-701",
          room_id: body.roomId ?? "room-701",
          tabletId: body.tabletId ?? "tablet-701-a",
          tablet_id: body.tabletId ?? "tablet-701-a",
          customerName: "Guest",
          customer_name: "Guest",
          customerPhoneMasked: "010-****-0000",
          customer_phone_masked: "010-****-0000",
          status: "paid",
          deliveryMethod: "pickup",
          delivery_method: "pickup",
          totalAmount: recalculatedAmount,
          total_amount: recalculatedAmount,
          paidAt: approvedAt,
          paid_at: approvedAt,
          createdAt: approvedAt,
          created_at: approvedAt,
          itemIds: items.map((_, index) => `${orderNo}-${index + 1}`),
          item_ids: items.map((_, index) => `${orderNo}-${index + 1}`),
          payment_id: paymentIntentId,
          mock_tid: approval.mockTid,
          source: "firebase_functions_mock_confirm",
          guest_lookup_enabled: true,
          demo_read_enabled: true,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      items.forEach((item, index) => {
        const itemId = `${orderNo}-${index + 1}`;
        const lineAmount = item.unitPrice * item.quantity;

        transaction.set(
          db.collection("order_items").doc(itemId),
          {
            id: itemId,
            order_id: orderNo,
            order_no: orderNo,
            qr_session_id: qrSessionId,
            company_id: item.companyId,
            product_id: item.productId,
            product_name: item.productName,
            option_name: item.optionName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_amount: lineAmount,
            delivery_status: "pickup_ready",
            settlement_amount: Math.round(lineAmount * 0.85),
            source: "firebase_functions_mock_confirm",
            guest_lookup_enabled: true,
            demo_read_enabled: true,
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        const productSnapshot = productSnapshots[index];
        if (productSnapshot.exists && typeof productSnapshot.get("inventory") === "number") {
          transaction.update(productRefs[index], {
            inventory: FieldValue.increment(-item.quantity),
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        transaction.set(
          inventoryMovementRefs[index],
          {
            option_id: item.productId,
            product_id: item.productId,
            company_id: item.companyId,
            type: "deduct",
            quantity: item.quantity,
            reason: "mock_payment_confirm",
            source_id: orderNo,
            source: "firebase_functions_mock_confirm",
            demo_read_enabled: true,
            created_at: approvedAt,
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

      transaction.set(
        qrRef,
        {
          status: "paid",
          payment_id: paymentIntentId,
          order_no: orderNo,
          paid_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        eventRef,
        {
          payment_id: paymentIntentId,
          order_id: orderNo,
          order_no: orderNo,
          qr_session_id: qrSessionId,
          status: "approved_mock",
          amount: recalculatedAmount,
          message: approval.message,
          source: "firebase_functions_mock_confirm",
          demo_read_enabled: true,
          created_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(auditRef, {
        actorRole: "SYSTEM",
        actor_role: "SYSTEM",
        actorName: "Firebase Functions payment server",
        actor_name: "Firebase Functions payment server",
        action: "mock_adapter",
        target: paymentIntentId,
        message: "Mock payment confirmed and order snapshot written by Firebase Functions.",
        source: "firebase_functions_mock_confirm",
        demo_read_enabled: true,
        createdAt: approvedAt,
        created_at: approvedAt,
        updated_at: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore transaction error.";
    const outOfStockProductId = message.startsWith("OUT_OF_STOCK:") ? message.replace("OUT_OF_STOCK:", "") : "";

    sendJson(response, outOfStockProductId ? 409 : 503, {
      ok: false,
      error: {
        code: outOfStockProductId ? "OUT_OF_STOCK" : "PAYMENT_CONFIRM_FIRESTORE_TRANSACTION_FAILED",
        message: outOfStockProductId ? `Product ${outOfStockProductId} is out of stock.` : message,
        httpStatus: outOfStockProductId ? 409 : 503,
      },
    });
    return;
  }

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
