import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";

const REGION = "asia-northeast3";
const SUPER_ADMIN_EMAIL = "rosabaya08@gmail.com";

type JsonRecord = Record<string, unknown>;

class LogHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, maxLength = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function requireSuperAdmin(request: { get(name: string): string | undefined }) {
  const authorization = request.get("authorization") ?? request.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new LogHttpError(401, "ADMIN_AUTH_REQUIRED", "최고관리자 Firebase 로그인이 필요합니다.");
  const decoded = await getAdminAuth().verifyIdToken(authorization.slice("Bearer ".length));
  const email = text(decoded.email, 320).toLowerCase();
  const role = text(decoded.role ?? decoded.a5_role ?? decoded.admin_role, 100).toUpperCase();
  if (email !== SUPER_ADMIN_EMAIL && !["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new LogHttpError(403, "ADMIN_PERMISSION_DENIED", "PayUp 통합로그는 A5S 최고관리자만 조회할 수 있습니다.");
  }
  return { uid: decoded.uid, email, role: role || "SUPER_ADMIN" };
}

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

function sendError(response: { status(code: number): { json(value: unknown): void } }, error: unknown) {
  const known = error instanceof LogHttpError;
  response.status(known ? error.status : 500).json({
    ok: false,
    error: {
      code: known ? error.code : "PAYUP_LOG_INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "PayUp 통합로그 조회 중 오류가 발생했습니다.",
    },
  });
}

export const payupAdminLogs = onRequest(
  { region: REGION, cors: true, maxInstances: 10 },
  async (request, response) => {
    try {
      await requireSuperAdmin(request);
      const body = asRecord(request.body);
      const requestedLimit = Number(body.limit ?? 300);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
      const db = getAdminDb();
      const perCollection = Math.max(Math.ceil(limit / 3), 30);
      const [integration, audit, business] = await Promise.all([
        db.collection("payup_integration_logs").orderBy("created_at_iso", "desc").limit(perCollection).get(),
        db.collection("audit_logs").where("source", "==", "payup_admin_control_center").limit(perCollection).get(),
        db.collection("business_events").where("provider", "==", "payup").limit(perCollection).get(),
      ]);

      const list = [
        ...integration.docs.map((document) => normalize(document.id, document.data(), "API")),
        ...audit.docs.map((document) => normalize(document.id, document.data(), "감사")),
        ...business.docs.map((document) => normalize(document.id, document.data(), "사업이벤트")),
      ]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .slice(0, limit);

      response.status(200).json({ ok: true, listCount: list.length, list, generatedAt: new Date().toISOString() });
    } catch (error) {
      sendError(response, error);
    }
  },
);
