import {
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentWebhookRequest,
} from "./types";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";

export async function paymentsWebhookHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentWebhookRequest>(request);
  const signature = request.get?.("x-pg-signature") ?? request.get?.("x-webhook-signature") ?? "";
  const pgReadiness = getPgServerReadiness();

  sendJson(response, 200, {
    ok: true,
    provider: "mock",
    pgReady: pgReadiness.readyForAdapter,
    pgReadiness,
    verified: false,
    mode: "signature_skeleton_only",
    receivedEventId: body.eventId ?? "missing-event-id",
    receivedEventType: body.eventType ?? "unknown",
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
