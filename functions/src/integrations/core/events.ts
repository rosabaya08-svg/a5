import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../firebaseAdmin";
import type { IntegrationPage, IntegrationPlatformType } from "./types";

type FirestoreData = FirebaseFirestore.DocumentData;

export type IntegrationEventStatus = "ready" | "sent" | "failed" | "retrying" | "cancelled";

export type IntegrationEvent = {
  id: string;
  companyId: string;
  orderNo: string;
  paymentId: string;
  eventType: string;
  platformTracks: string[];
  status: IntegrationEventStatus;
  retryCount: number;
  lastError: string;
  createdAt: string;
  updatedAt: string;
};

export async function listCompanyIntegrationEvents(input: {
  companyId: string;
  platformType: IntegrationPlatformType;
  status?: IntegrationEventStatus;
  limit?: number;
  cursor?: string;
}): Promise<IntegrationPage<IntegrationEvent>> {
  const db = getAdminDb();
  const limit = clampLimit(input.limit);
  let query = db.collection("integration_events").where("company_id", "==", input.companyId).orderBy(FieldPath.documentId());

  if (input.cursor) {
    query = query.startAfter(input.cursor);
  }

  const snapshot = await query.limit(limit + 1).get();
  const visibleDocs = snapshot.docs.filter((doc) => {
    const data = doc.data();
    const status = normalizeStatus(data.status);
    const tracks = Array.isArray(data.platform_tracks) ? data.platform_tracks.map((track) => String(track)) : [];
    if (input.status && status !== input.status) return false;
    return tracks.length === 0 || tracks.includes(input.platformType) || tracks.includes("ALL");
  });
  const pageDocs = visibleDocs.slice(0, limit);

  return {
    items: pageDocs.map((doc) => mapEvent(doc.id, doc.data())),
    nextCursor: snapshot.docs.length > limit ? snapshot.docs.slice(0, limit).at(-1)?.id : undefined,
  };
}

export async function markCompanyIntegrationEvent(input: {
  companyId: string;
  eventId: string;
  nextStatus: IntegrationEventStatus;
  errorMessage?: string;
}) {
  const db = getAdminDb();
  const ref = db.collection("integration_events").doc(input.eventId);
  const doc = await ref.get();
  if (!doc.exists || text(doc.data()?.company_id) !== input.companyId) {
    return { updated: false, reason: "not_found" };
  }

  const data = doc.data() ?? {};
  const retryIncrement = input.nextStatus === "retrying" ? 1 : 0;
  await ref.set(
    {
      status: input.nextStatus,
      last_error: input.errorMessage ?? null,
      last_attempt_at: new Date().toISOString(),
      processed_at: input.nextStatus === "sent" ? new Date().toISOString() : data.processed_at ?? null,
      retry_count: FieldValue.increment(retryIncrement),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { updated: true };
}

function mapEvent(id: string, data: FirestoreData): IntegrationEvent {
  return {
    id,
    companyId: text(data.company_id ?? data.companyId),
    orderNo: text(data.order_no ?? data.orderNo),
    paymentId: text(data.payment_id ?? data.paymentId),
    eventType: text(data.event_type ?? data.eventType),
    platformTracks: Array.isArray(data.platform_tracks) ? data.platform_tracks.map((track) => String(track)) : [],
    status: normalizeStatus(data.status),
    retryCount: numberValue(data.retry_count),
    lastError: text(data.last_error),
    createdAt: iso(data.created_at),
    updatedAt: iso(data.updated_at),
  };
}

function normalizeStatus(value: unknown): IntegrationEventStatus {
  const status = String(value ?? "");
  if (status === "sent" || status === "failed" || status === "retrying" || status === "cancelled") return status;
  return "ready";
}

function clampLimit(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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
