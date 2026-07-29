import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import { asRecord, requireAccess, sendAccessError, text } from "../access/policy";

const REGION = "asia-northeast3";
type JsonRecord = Record<string, unknown>;

function normalize(documentId: string, data: JsonRecord, category: string) {
  return {
    id: documentId,
    occurredAt: text(data.created_at_iso ?? data.occurred_at_iso ?? data.updated_at_iso, 50),
    category,
    action: text(data.action ?? data.operation ?? data.event_type, 200),
    actor: text(data.actor_email ?? data.actor_uid ?? data.created_by_email, 320),
    organizationName: text(data.organization_name ?? data.sub_merchant_id ?? data.merchant_id_masked, 200),
    target: text(data.target_id ?? data.path ?? data.order_number ?? data.transaction_id, 300),
    result: text(data.status ?? data.result ?? data.response_code, 100),
    correlationId: text(data.correlation_id, 200),
    message: text(data.message ?? data.response_msg ?? data.reason, 1000),
  };
}

export const payupAdminLogsSecure = onRequest({ region: REGION, cors: true, maxInstances: 10 }, async (request, response) => {
  try {
    await requireAccess(request, "PAYUP_LOG_READ");
    const body = asRecord(request.body);
    const requestedLimit = Number(body.limit ?? 300);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
    const db = getAdminDb();
    const perCollection = Math.max(Math.ceil(limit / 4), 30);
    const [integration, audit, business, security] = await Promise.all([
      db.collection("payup_integration_logs").orderBy("created_at_iso", "desc").limit(perCollection).get(),
      db.collection("audit_logs").where("source", "in", ["payup_admin_control_center", "payup_access_control"]).limit(perCollection).get(),
      db.collection("business_events").where("provider", "==", "payup").limit(perCollection).get(),
      db.collection("payup_change_requests").limit(perCollection).get(),
    ]);
    const list = [
      ...integration.docs.map((document) => normalize(document.id, document.data(), "API")),
      ...audit.docs.map((document) => normalize(document.id, document.data(), "감사")),
      ...business.docs.map((document) => normalize(document.id, document.data(), "사업이벤트")),
      ...security.docs.map((document) => normalize(document.id, document.data(), "2인승인")),
    ]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, limit);
    response.status(200).json({ ok: true, listCount: list.length, list, generatedAt: new Date().toISOString() });
  } catch (error) {
    sendAccessError(response, error);
  }
});
