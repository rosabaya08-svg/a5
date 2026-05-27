import {
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentWebhookRequest,
} from "./types";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import { getAdminDb } from "../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { createHmac, timingSafeEqual } from "crypto";

export async function paymentsWebhookHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentWebhookRequest>(request);
  const pgReadiness = getPgServerReadiness();
  const signature =
    request.get?.(pgReadiness.webhookSignatureHeader) ??
    request.get?.(pgReadiness.webhookSignatureHeader.toLowerCase()) ??
    request.get?.("x-pg-signature") ??
    request.get?.("x-webhook-signature") ??
    "";
  const signatureResult = verifyWebhookSignature({
    signature,
    secret: process.env.PG_WEBHOOK_SECRET?.trim() ?? "",
    rawBody: request.rawBody,
    fallbackBody: body,
    algorithm: pgReadiness.webhookSignatureAlgorithm,
  });

  if (pgReadiness.provider !== "mock" && !signatureResult.verified) {
    sendJson(response, 401, {
      ok: false,
      provider: pgReadiness.provider,
      verified: false,
      error: {
        code: "PAYMENT_WEBHOOK_SIGNATURE_INVALID",
        message: signatureResult.reason,
        httpStatus: 401,
      },
    });
    return;
  }

  const eventId = String(body.eventId ?? `missing-event-${Date.now()}`);
  const db = getAdminDb();
  const paymentSnapshot = await findPaymentForWebhook(db, body);
  const paymentRef = paymentSnapshot?.ref;
  const paymentData = paymentSnapshot?.data() ?? {};
  const orderNo = String(body.orderNo ?? paymentData.order_no ?? paymentData.orderNo ?? "");
  const orderRef = orderNo ? db.collection("orders").doc(orderNo) : undefined;
  const normalizedStatus = normalizeWebhookStatus(body.status ?? body.eventType);
  const webhookRef = db.collection("webhook_events").doc(eventId);
  const paymentEventRef = db.collection("payment_events").doc(eventId);
  const auditRef = db.collection("audit_logs").doc();
  let duplicate = false;

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(webhookRef);

    if (existing.exists) {
      duplicate = true;
      return;
    }

    const eventDocument = {
        event_id: eventId,
        event_type: body.eventType ?? "unknown",
        order_no: body.orderNo ?? null,
        payment_key: body.paymentKey ?? null,
        transaction_id: body.transactionId ?? null,
        amount: body.amount ?? null,
        signature_present: Boolean(signature),
        signature_verified: signatureResult.verified,
        mode: signatureResult.verified ? "signature_verified" : "mock_signature_not_required",
        source: signatureResult.verified ? "firebase_functions_webhook_verified" : "firebase_functions_webhook_mock",
        demo_read_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
    };

    transaction.set(webhookRef, eventDocument);
    transaction.set(paymentEventRef, eventDocument, { merge: true });
    if (paymentRef && normalizedStatus) {
      transaction.set(
        paymentRef,
        {
          webhook_status: normalizedStatus,
          status: normalizedStatus,
          last_webhook_event_id: eventId,
          last_webhook_at: eventDocument.created_at,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    if (orderRef && normalizedStatus) {
      transaction.set(
        orderRef,
        {
          payment_status: normalizedStatus,
          status: normalizedStatus === "canceled" ? "cancelled" : normalizedStatus === "approved" ? "paid" : String(paymentData.status ?? "paid"),
          last_payment_webhook_event_id: eventId,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    transaction.set(auditRef, {
      ...toAuditLogDocument(
          createAuditLogDraft({
            action: "payment_webhook_received",
            target: eventId,
            severity: signatureResult.verified ? "info" : "warning",
            message: signatureResult.verified
              ? "Webhook received with a verified signature."
              : "Webhook received in mock mode without real signature verification.",
          }),
      ),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    provider: pgReadiness.provider,
    pgReady: pgReadiness.readyForAdapter,
    pgReadiness,
    verified: signatureResult.verified,
    mode: signatureResult.verified ? "signature_verified" : "mock_signature_not_required",
    receivedEventId: eventId,
    receivedEventType: body.eventType ?? "unknown",
    duplicate,
    linkedPaymentId: paymentSnapshot?.id ?? null,
    linkedOrderNo: orderNo || null,
    appliedStatus: normalizedStatus || null,
    signaturePresent: Boolean(signature),
    firestoreTransactionPlan: [
      "Verify webhook signature with Secret Manager value.",
      "Reject duplicate eventId using payment_events idempotency document.",
      "Load payment_intents/payments by paymentKey or orderNo.",
      "Apply status transition only inside a Firestore transaction.",
      "Append audit log for every webhook event.",
      ...getPgAdapterHandoffPlan(),
    ],
    message: signatureResult.verified
      ? "Webhook signature verified and event idempotency document recorded."
      : "Webhook received in mock mode. Real provider webhooks require PG_WEBHOOK_SECRET signature verification.",
  });
}

async function findPaymentForWebhook(db: FirebaseFirestore.Firestore, body: Partial<PaymentWebhookRequest>) {
  const paymentIntentId = String(body.paymentIntentId ?? "");
  if (paymentIntentId) {
    const snapshot = await db.collection("payments").doc(paymentIntentId).get();
    if (snapshot.exists) return snapshot;
  }

  const paymentKey = String(body.paymentKey ?? "");
  if (paymentKey) {
    const snapshot = (await db.collection("payments").where("provider_payment_key", "==", paymentKey).limit(1).get()).docs[0];
    if (snapshot?.exists) return snapshot;
  }

  const orderNo = String(body.orderNo ?? "");
  if (orderNo) {
    const snapshot = (await db.collection("payments").where("order_no", "==", orderNo).limit(1).get()).docs[0];
    if (snapshot?.exists) return snapshot;
  }

  return undefined;
}

function normalizeWebhookStatus(value: unknown): "approved" | "failed" | "canceled" | undefined {
  const status = String(value ?? "").toLowerCase();
  if (status.includes("approve") || status.includes("paid") || status.includes("complete")) return "approved";
  if (status.includes("cancel")) return "canceled";
  if (status.includes("fail") || status.includes("reject") || status.includes("expired")) return "failed";
  return undefined;
}

function verifyWebhookSignature(input: {
  signature: string;
  secret: string;
  rawBody?: Buffer | string;
  fallbackBody: unknown;
  algorithm: "sha256" | "sha512";
}): { verified: boolean; reason: string } {
  if (!input.secret) return { verified: false, reason: "PG_WEBHOOK_SECRET is missing." };
  if (!input.signature) return { verified: false, reason: "Webhook signature header is missing." };

  const payload =
    typeof input.rawBody === "string"
      ? input.rawBody
      : Buffer.isBuffer(input.rawBody)
        ? input.rawBody
        : JSON.stringify(input.fallbackBody ?? {});
  const expected = createHmac(input.algorithm, input.secret).update(payload).digest("hex");
  const normalized = input.signature.replace(/^sha(256|512)=/i, "").trim();

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(normalized, "hex");
    const verified = expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
    return {
      verified,
      reason: verified ? "Webhook signature verified." : "Webhook signature mismatch.",
    };
  } catch {
    return { verified: false, reason: "Webhook signature format is invalid." };
  }
}
