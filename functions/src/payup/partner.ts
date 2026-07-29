import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";

const REGION = "asia-northeast3";
const SUPER_ADMIN_EMAIL = "rosabaya08@gmail.com";

type JsonRecord = Record<string, unknown>;

class PartnerHttpError extends Error {
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

async function resolveScope(request: { get(name: string): string | undefined }) {
  const authorization = request.get("authorization") ?? request.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new PartnerHttpError(401, "PARTNER_AUTH_REQUIRED", "Firebase 기업·파트너 로그인이 필요합니다.");
  const decoded = await getAdminAuth().verifyIdToken(authorization.slice("Bearer ".length));
  const email = text(decoded.email, 320).toLowerCase();
  const role = text(decoded.role ?? decoded.a5_role ?? decoded.company_role, 100).toUpperCase();
  const organizationId = text(decoded.organization_id ?? decoded.organizationId ?? decoded.company_id ?? decoded.companyId, 160);
  const businessNumber = text(decoded.business_number ?? decoded.businessNumber ?? decoded.business_no, 20).replace(/[^0-9]/g, "");
  const superAdmin = email === SUPER_ADMIN_EMAIL || ["SUPER_ADMIN", "ADMIN"].includes(role);
  if (!superAdmin && !organizationId && !businessNumber) {
    throw new PartnerHttpError(403, "PARTNER_SCOPE_MISSING", "로그인 토큰에 organization_id 또는 business_number 범위가 없습니다.");
  }
  return { uid: decoded.uid, email, role, organizationId, businessNumber, superAdmin };
}

function sendError(response: { status(code: number): { json(value: unknown): void } }, error: unknown) {
  const known = error instanceof PartnerHttpError;
  response.status(known ? error.status : 500).json({
    ok: false,
    error: {
      code: known ? error.code : "PAYUP_PARTNER_INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "PayUp 판매로그 조회 중 오류가 발생했습니다.",
    },
  });
}

export const payupPartnerActivity = onRequest(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request, response) => {
    try {
      const scope = await resolveScope(request);
      const body = asRecord(request.body);
      const requestedLimit = Number(body.limit ?? 300);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
      const db = getAdminDb();

      let query = db.collection("payup_partner_activity").limit(limit);
      if (!scope.superAdmin) {
        query = scope.organizationId
          ? db.collection("payup_partner_activity").where("organization_id", "==", scope.organizationId).limit(limit)
          : db.collection("payup_partner_activity").where("business_number", "==", scope.businessNumber).limit(limit);
      }

      const snapshot = await query.get();
      const list = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .sort((left, right) => text((right as JsonRecord).occurred_at_iso, 50).localeCompare(text((left as JsonRecord).occurred_at_iso, 50)));

      response.status(200).json({
        ok: true,
        organizationId: scope.organizationId || undefined,
        businessNumberMasked: scope.businessNumber ? `${scope.businessNumber.slice(0, 3)}-**-${scope.businessNumber.slice(-5)}` : undefined,
        listCount: list.length,
        list,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      sendError(response, error);
    }
  },
);
