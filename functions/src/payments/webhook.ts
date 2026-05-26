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

export async function paymentsWebhookHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentWebhookRequest>(request);
  const signature = request.get?.("x-pg-signature") ?? request.get?.("x-webhook-signature") ?? "";
  const pgReadiness = getPgServerReadiness();
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
        signature_verified: false,
        mode: "signature_skeleton_only",
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
          severity: "warning",
          message: "Webhook received but signature verification is skeleton-only.",
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
    verified: false,
    mode: "signature_skeleton_only",
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
    message: "Webhook skeleton received. Real signature verification is not enabled.",
  });
}
