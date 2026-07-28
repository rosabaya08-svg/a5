import { createHmac } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../firebaseAdmin";
import { appendIntegrationCallLog } from "./auth";
import type { IntegrationPlatformType } from "./types";

type FirestoreData = FirebaseFirestore.DocumentData;

type DeliveryResult =
  | { ok: true; status: "sent"; endpoint: string; httpStatus: number }
  | { ok: false; status: "failed"; reason: string; endpoint?: string; httpStatus?: number };

const DELIVERABLE_STATUSES = new Set(["ready", "failed", "retrying"]);

export async function deliverIntegrationEventToWebhook(eventId: string): Promise<DeliveryResult> {
  const db = getAdminDb();
  const eventRef = db.collection("integration_events").doc(eventId);
  const eventSnapshot = await eventRef.get();

  if (!eventSnapshot.exists) {
    return { ok: false, status: "failed", reason: "event_not_found" };
  }

  const event = eventSnapshot.data() ?? {};
  const companyId = text(event.company_id ?? event.companyId);
  const platformType = platformFromTracks(event.platform_tracks);
  const currentStatus = text(event.status, "ready");

  if (!companyId) {
    await markFailed(eventRef, "company_id_missing");
    return { ok: false, status: "failed", reason: "company_id_missing" };
  }

  if (!DELIVERABLE_STATUSES.has(currentStatus)) {
    return { ok: false, status: "failed", reason: `event_status_not_deliverable:${currentStatus}` };
  }

  const request = await findLiveIntegrationRequest(companyId, platformType);
  if (!request?.webhookUrl) {
    await markFailed(eventRef, "live_webhook_url_missing");
    await appendIntegrationCallLog({
      companyId,
      platformType,
      endpoint: "webhook-delivery",
      status: "failed",
      errorCode: "LIVE_WEBHOOK_URL_MISSING",
      httpStatus: 409,
      eventId,
      orderNo: text(event.order_no ?? event.orderNo),
      message: "Live integration request does not have a webhook URL.",
    });
    return { ok: false, status: "failed", reason: "live_webhook_url_missing" };
  }

  const now = new Date().toISOString();
  const payload = {
    id: eventId,
    eventId,
    eventType: text(event.event_type ?? event.eventType, "payment.paid"),
    companyId,
    platformType,
    orderNo: text(event.order_no ?? event.orderNo),
    paymentId: text(event.payment_id ?? event.paymentId),
    status: "ready",
    createdAt: iso(event.created_at),
    deliveredAt: now,
    data: event.payload && typeof event.payload === "object" ? event.payload : {},
  };

  await eventRef.set(
    {
      status: "retrying",
      last_attempt_at: now,
      updated_at: FieldValue.serverTimestamp(),
      retry_count: FieldValue.increment(currentStatus === "retrying" ? 0 : 1),
    },
    { merge: true },
  );

  try {
    const payloadBody = JSON.stringify(payload);
    const signature = signWebhookPayload(payloadBody, request.webhookSecretId);

    const response = await fetch(request.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Company-Id": companyId,
        "X-A5-Event-Id": eventId,
        "X-A5-Platform-Type": platformType,
        "X-A5-Webhook-Secret-Id": request.webhookSecretId ?? "",
        "X-A5-Signature": signature,
        "X-A5-Signature-Algorithm": "HMAC-SHA256",
      },
      body: payloadBody,
    });

    if (!response.ok) {
      const errorMessage = `webhook_http_${response.status}`;
      await markFailed(eventRef, errorMessage, request.webhookUrl, response.status);
      await appendIntegrationCallLog({
        companyId,
        platformType,
        endpoint: "webhook-delivery",
        status: "failed",
        errorCode: errorMessage,
        httpStatus: response.status,
        eventId,
        orderNo: payload.orderNo,
        message: request.webhookUrl,
      });
      return { ok: false, status: "failed", reason: errorMessage, endpoint: request.webhookUrl, httpStatus: response.status };
    }

    await eventRef.set(
      {
        status: "sent",
        last_error: null,
        webhook_url: request.webhookUrl,
        webhook_http_status: response.status,
        processed_at: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await appendIntegrationCallLog({
      companyId,
      platformType,
      endpoint: "webhook-delivery",
        status: "success",
        resultCount: 1,
        httpStatus: response.status,
        eventId,
        orderNo: payload.orderNo,
        message: `signed:${Boolean(signature)} ${request.webhookUrl}`,
      });

    return { ok: true, status: "sent", endpoint: request.webhookUrl, httpStatus: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook_delivery_failed";
    await markFailed(eventRef, message, request.webhookUrl);
    await appendIntegrationCallLog({
      companyId,
      platformType,
      endpoint: "webhook-delivery",
      status: "failed",
      errorCode: "WEBHOOK_DELIVERY_FAILED",
      eventId,
      orderNo: payload.orderNo,
      message,
    });
    return { ok: false, status: "failed", reason: message, endpoint: request.webhookUrl };
  }
}

export async function integrationEventCreatedHandler(event: { params: { eventId?: string } }) {
  const eventId = text(event.params.eventId);
  if (!eventId) return;
  await deliverIntegrationEventToWebhook(eventId);
}

async function findLiveIntegrationRequest(companyId: string, platformType: IntegrationPlatformType) {
  const snapshot = await getAdminDb()
    .collection("company_api_integration_requests")
    .where("company_id", "==", companyId)
    .where("status", "==", "live")
    .limit(10)
    .get();

  const exact = snapshot.docs.find((doc) => text(doc.data().platform_type) === platformType);
  const fallback = exact ?? snapshot.docs[0];
  if (!fallback) return null;

  const data = fallback.data();
  const deployment = data.deployment && typeof data.deployment === "object" ? data.deployment as FirestoreData : {};

  return {
    webhookUrl: text(data.webhook_url ?? data.webhookUrl),
    webhookSecretId: text(deployment.webhookSecretId ?? deployment.webhook_secret_id),
  };
}

async function markFailed(
  ref: FirebaseFirestore.DocumentReference,
  errorMessage: string,
  webhookUrl?: string,
  httpStatus?: number,
) {
  await ref.set(
    {
      status: "failed",
      last_error: errorMessage,
      webhook_url: webhookUrl ?? null,
      webhook_http_status: httpStatus ?? null,
      last_attempt_at: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function platformFromTracks(value: unknown): IntegrationPlatformType {
  const tracks = Array.isArray(value) ? value.map((item) => text(item)) : [];
  const preferred = tracks.find((track) => track && track !== "ALL") ?? "STANDARD";
  if (preferred === "SABANGNET" || preferred === "ERP" || preferred === "WMS" || preferred === "CUSTOM") return preferred;
  return "STANDARD";
}

function text(value: unknown, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function iso(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const timestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }

  return new Date().toISOString();
}

function signWebhookPayload(payloadBody: string, webhookSecretId?: string) {
  const secret = process.env.A5_INTEGRATION_WEBHOOK_SECRET?.trim() || text(webhookSecretId);
  if (!secret) return "";
  return `sha256=${createHmac("sha256", secret).update(payloadBody).digest("hex")}`;
}
