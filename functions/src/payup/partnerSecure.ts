import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import { AccessHttpError, assertOrganizationScope, asRecord, requireAccess, sendAccessError, text } from "../access/policy";

const REGION = "asia-northeast3";

export const payupPartnerActivitySecure = onRequest({ region: REGION, cors: true, maxInstances: 20 }, async (request, response) => {
  try {
    const actor = await requireAccess(request, "PAYUP_PARTNER_ACTIVITY_READ");
    const body = asRecord(request.body);
    const requestedLimit = Number(body.limit ?? 300);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
    const requestedOrganizationId = text(body.organizationId, 160);
    const requestedBusinessNumber = text(body.businessNumber, 20).replace(/[^0-9]/g, "");
    const organizationId = actor.superAdmin ? requestedOrganizationId : actor.organizationIds[0] ?? "";
    const businessNumber = actor.superAdmin ? requestedBusinessNumber : actor.businessNumbers[0] ?? "";
    if (!actor.superAdmin) assertOrganizationScope(actor, { organizationId, businessNumber });
    if (!actor.superAdmin && !organizationId && !businessNumber) throw new AccessHttpError(403, "PARTNER_SCOPE_MISSING", "로그인 계정에 하위사업자 범위가 없습니다.");
    const db = getAdminDb();
    let query = db.collection("payup_partner_activity").limit(limit);
    if (organizationId) query = db.collection("payup_partner_activity").where("organization_id", "==", organizationId).limit(limit);
    else if (businessNumber) query = db.collection("payup_partner_activity").where("business_number", "==", businessNumber).limit(limit);
    const snapshot = await query.get();
    const list = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort((left, right) => text((right as Record<string, unknown>).occurred_at_iso, 50).localeCompare(text((left as Record<string, unknown>).occurred_at_iso, 50)));
    response.status(200).json({
      ok: true,
      organizationId: organizationId || undefined,
      businessNumberMasked: businessNumber ? `${businessNumber.slice(0, 3)}-**-${businessNumber.slice(-5)}` : undefined,
      listCount: list.length,
      list,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});
