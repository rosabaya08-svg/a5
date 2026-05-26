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
  const signature = request.get?.("x-pg-signature") ?? request.get?.("x-webhook-signature") ?? "";
  const pgReadiness = getPgServerReadiness();
  const signatureResult = verifyWebhookSignature({
    signature,
    secret: process.env.PG_WEBHOOK_SECRET?.trim() ?? "",
    rawBody: request.rawBody,
    fallbackBody: body,
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
        source: "firebase_functions_webhook_skeleton",
        demo_read_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
    };

    transaction.set(webhookRef, eventDocument);
    transaction.set(paymentEventRef, eventDocument, { merge: true });
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
    provider: "mock",
    pgReady: pgReadiness.readyForAdapter,
    pgReadiness,
    verified: signatureResult.verified,
    mode: signatureResult.verified ? "signature_verified" : "mock_signature_not_required",
    receivedEventId: eventId,
    receivedEventType: body.eventType ?? "unknown",
    duplicate,
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

function verifyWebhookSignature(input: {
  signature: string;
  secret: string;
  rawBody?: Buffer | string;
  fallbackBody: unknown;
}): { verified: boolean; reason: string } {
  if (!input.secret) return { verified: false, reason: "PG_WEBHOOK_SECRET is missing." };
  if (!input.signature) return { verified: false, reason: "Webhook signature header is missing." };

  const payload =
    typeof input.rawBody === "string"
      ? input.rawBody
      : Buffer.isBuffer(input.rawBody)
        ? input.rawBody
        : JSON.stringify(input.fallbackBody ?? {});
  const expected = createHmac("sha256", input.secret).update(payload).digest("hex");
  const normalized = input.signature.replace(/^sha256=/i, "").trim();

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
