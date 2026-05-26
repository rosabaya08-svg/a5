import { getAdminDb } from "../firebaseAdmin";
import { normalizeOrderNumber } from "../orders/orderNumber";
import { sendJson, type HttpRequestLike, type HttpResponseLike, type PaymentStatusResponse } from "./types";

function getQueryString(request: HttpRequestLike, key: string): string {
  const value = request.query?.[key];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export async function paymentsStatusHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for payment status checks.",
        httpStatus: 405,
      },
    });
    return;
  }

  const paymentIntentId = getQueryString(request, "paymentIntentId");
  const orderNo = normalizeOrderNumber(getQueryString(request, "orderNo"));

  if (!paymentIntentId && !orderNo) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_STATUS_QUERY_REQUIRED",
        message: "paymentIntentId or orderNo query is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  try {
    const db = getAdminDb();
    const paymentSnapshot = paymentIntentId
      ? await db.collection("payments").doc(paymentIntentId).get()
      : (
          await db.collection("payments").where("order_no", "==", orderNo).limit(1).get()
        ).docs[0];

    if (!paymentSnapshot?.exists) {
      sendJson(response, 404, {
        ok: false,
        error: {
          code: "PAYMENT_STATUS_NOT_FOUND",
          message: "Payment status document was not found.",
          httpStatus: 404,
        },
      });
      return;
    }

    const data = paymentSnapshot.data() ?? {};
    const result: PaymentStatusResponse = {
      ok: true,
      source: "firebase_functions",
      paymentIntentId: String(data.payment_intent_id ?? paymentSnapshot.id),
      orderNo: String(data.order_no ?? orderNo),
      status: String(data.status ?? "unknown"),
      amount: typeof data.amount === "number" ? data.amount : undefined,
      currency: data.currency === "KRW" ? "KRW" : undefined,
      provider: data.provider === "pg_contract" ? "pg_contract" : "mock",
      message: "Payment status read through Firebase Functions. No PG secret was used.",
    };

    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "PAYMENT_STATUS_FIRESTORE_READ_FAILED",
        message: error instanceof Error ? error.message : "Unknown payment status read error.",
        httpStatus: 503,
      },
    });
  }
}
