import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { AccessHttpError, safeDocumentId, sendAccessError, text } from "../access/policy";

const REGION = "asia-northeast3";

function bootstrapEmails() {
  return new Set(String(process.env.A5_BOOTSTRAP_SUPER_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export const payupBootstrapAccess = onRequest({ region: REGION, cors: true, maxInstances: 3 }, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    const authorization = request.get("authorization") ?? request.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) throw new AccessHttpError(401, "BOOTSTRAP_AUTH_REQUIRED", "Firebase 로그인이 필요합니다.");
    let decoded;
    try {
      decoded = await getAdminAuth().verifyIdToken(authorization.slice("Bearer ".length), true);
    } catch {
      throw new AccessHttpError(401, "BOOTSTRAP_TOKEN_INVALID", "Firebase 로그인 토큰이 유효하지 않습니다.");
    }
    const email = text(decoded.email, 320).toLowerCase();
    if (!email || !bootstrapEmails().has(email)) throw new AccessHttpError(403, "BOOTSTRAP_EMAIL_DENIED", "서버에 등록된 초기 최고관리자 계정이 아닙니다.");
    const existingClaims = decoded;
    const claims = {
      role: "SUPER_ADMIN",
      roles: ["SUPER_ADMIN"],
      access_status: "ACTIVE",
      organization_ids: Array.isArray(existingClaims.organization_ids) ? existingClaims.organization_ids : [],
      business_numbers: Array.isArray(existingClaims.business_numbers) ? existingClaims.business_numbers : [],
      channel_ids: ["A5S", "A5WS", "A5LS"],
    };
    await getAdminAuth().setCustomUserClaims(decoded.uid, claims);
    await getAdminDb().doc(`access_members/${safeDocumentId(decoded.uid)}`).set({
      uid: decoded.uid,
      email,
      display_name: text(decoded.name, 200),
      roles: ["SUPER_ADMIN"],
      permissions: [],
      organization_ids: claims.organization_ids,
      business_numbers: claims.business_numbers,
      channel_ids: claims.channel_ids,
      status: "ACTIVE",
      bootstrap_granted: true,
      bootstrap_granted_at: FieldValue.serverTimestamp(),
      bootstrap_granted_at_iso: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    }, { merge: true });
    await getAdminDb().collection("audit_logs").add({ actor_uid: decoded.uid, actor_email: email, actor_roles: ["SUPER_ADMIN"], action: "PAYUP.ACCESS.BOOTSTRAPPED", target_type: "access_member", target_id: decoded.uid, source: "payup_access_control", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() });
    response.status(200).json({ ok: true, role: "SUPER_ADMIN", tokenRefreshRequired: true });
  } catch (error) {
    sendAccessError(response, error);
  }
});
