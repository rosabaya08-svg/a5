import {
  calculateItemsAmount,
  makeOrderNo,
  makePaymentIntentId,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentReadyRequest,
  type PaymentReadyResponse,
  type ServerPaymentIntent,
} from "./types";
import { assertAmount } from "../utils/assertAmount";
import { validateQrSession } from "../qr/validateQrSession";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import { getAdminDb } from "../firebaseAdmin";

export async function paymentsReadyHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentReadyRequest>(request);
  const items = normalizeCartItems(body.items);
  const qrSessionId = String(body.qrSessionId ?? "");

  if (items.length === 0 || !qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_READY_INPUT_INVALID",
        message: "qrSessionId and at least one cart item are required.",
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

  const now = new Date();
  const pgReadiness = getPgServerReadiness();
  const paymentIntent: ServerPaymentIntent = {
    id: makePaymentIntentId(qrSessionId, now),
    qrSessionId,
    orderNoCandidate: makeOrderNo(now),
    amount: recalculatedAmount,
    currency: "KRW",
    provider: "mock",
    status: "ready_mock",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
  };

  const result: PaymentReadyResponse = {
    ok: true,
    provider: "mock",
    pgReady: pgReadiness.readyForAdapter,
    pgReadiness,
    paymentIntentId: paymentIntent.id,
    orderNoCandidate: paymentIntent.orderNoCandidate,
    qrSessionId,
    recalculatedAmount,
    currency: "KRW",
    expiresAt: paymentIntent.expiresAt,
    firestoreTransactionPlan: [
      "Read qr_payment_sessions/{qrSessionId} and reject paid/expired/cancelled.",
      "Read product/product_options snapshots and recalculate amount.",
      "Create payment_intents/{paymentIntentId} with ready_mock status.",
      "Do not call real PG at ready phase.",
      ...getPgAdapterHandoffPlan(),
    ],
    message: pgReadiness.readyForAdapter
      ? "Mock payment intent is ready and server keys are present. Wire the approved PG adapter next."
      : "Mock payment intent is ready. Real PG module is still blocked until keys and adapter are approved.",
  };

  try {
    await getAdminDb()
      .collection("payment_intents")
      .doc(paymentIntent.id)
      .set(
        {
          ...paymentIntent,
          items,
          client_amount: body.clientAmount ?? null,
          recalculated_amount: recalculatedAmount,
          short_code: body.shortCode ?? null,
          cart_id: body.cartId ?? null,
          nursery_id: body.nurseryId ?? null,
          room_id: body.roomId ?? null,
          tablet_id: body.tabletId ?? null,
          provider: "mock",
          pg_ready: pgReadiness.readyForAdapter,
          source: "firebase_functions_mock_ready",
          demo_read_enabled: true,
          guest_lookup_enabled: true,
          created_at: now.toISOString(),
          expires_at: paymentIntent.expiresAt,
        },
        { merge: true },
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore write error.";
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "PAYMENT_READY_FIRESTORE_WRITE_FAILED",
        message,
        httpStatus: 503,
      },
    });
    return;
  }

  sendJson(response, 200, result);
}
