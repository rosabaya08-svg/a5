import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  requireAccess,
  safeDocumentId,
  sendAccessError,
  stringArray,
  text,
  writeAccessAudit,
} from "../access/policy";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 10 };
const allowedRoles = new Set(["COMPANY_ADMIN", "SUPPLIER_ADMIN", "PARTNER_ADMIN", "A5LS_ADMIN"]);

function normalizedRoles(value: unknown) {
  const roles = stringArray(value).map((role) => role.toUpperCase()).filter((role) => allowedRoles.has(role));
  if (!roles.length) throw new AccessHttpError(400, "PARTNER_INVITE_ROLE_REQUIRED", "기업·공급사·파트너·A5LS 역할이 필요합니다.");
  return [...new Set(roles)];
}

function businessNumbers(value: unknown) {
  const values = stringArray(value).map((entry) => entry.replace(/[^0-9]/g, "")).filter(Boolean);
  if (!values.length || values.some((entry) => entry.length !== 10)) {
    throw new AccessHttpError(400, "PARTNER_INVITE_BUSINESS_NUMBER_INVALID", "사업자번호는 숫자 10자리여야 합니다.");
  }
  return [...new Set(values)];
}

export const payupAdminPartnerInvite = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    const actor = await requireAccess(request, "PAYUP_ACCESS_MANAGE");
    const body = asRecord(request.body);
    const email = text(body.email, 320).toLowerCase();
    const displayName = text(body.displayName, 200);
    const roles = normalizedRoles(body.roles);
    const organizationIds = stringArray(body.organizationIds);
    const normalizedBusinessNumbers = businessNumbers(body.businessNumbers);
    const channelIds = stringArray(body.channelIds);
    const reason = text(body.reason, 500) || "기업·A5WS·A5LS Firebase 계정 초대";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new AccessHttpError(400, "PARTNER_INVITE_EMAIL_INVALID", "유효한 이메일이 필요합니다.");
    if (!organizationIds.length) throw new AccessHttpError(400, "PARTNER_INVITE_ORGANIZATION_REQUIRED", "조직 ID가 필요합니다.");
    if (roles.includes("PARTNER_ADMIN") && !channelIds.includes("A5WS")) {
      throw new AccessHttpError(400, "PARTNER_INVITE_A5WS_CHANNEL_REQUIRED", "PARTNER_ADMIN에는 A5WS 채널을 지정해야 합니다.");
    }
    if (roles.includes("A5LS_ADMIN") && !channelIds.includes("A5LS")) {
      throw new AccessHttpError(400, "PARTNER_INVITE_A5LS_CHANNEL_REQUIRED", "A5LS_ADMIN에는 A5LS 채널을 지정해야 합니다.");
    }

    let user;
    let created = false;
    try {
      user = await getAdminAuth().getUserByEmail(email);
    } catch {
      user = await getAdminAuth().createUser({
        email,
        displayName: displayName || email.split("@")[0],
        emailVerified: false,
        disabled: false,
        password: randomBytes(32).toString("base64url"),
      });
      created = true;
    }

    const claims = {
      ...(user.customClaims ?? {}),
      role: roles[0],
      roles,
      access_status: "ACTIVE",
      organization_ids: organizationIds,
      organization_id: organizationIds[0],
      business_numbers: normalizedBusinessNumbers,
      business_number: normalizedBusinessNumbers[0],
      channel_ids: channelIds,
    };
    await getAdminAuth().setCustomUserClaims(user.uid, claims);
    await getAdminAuth().revokeRefreshTokens(user.uid);
    const passwordSetupLink = await getAdminAuth().generatePasswordResetLink(email);
    const now = new Date().toISOString();
    const member = {
      uid: user.uid,
      email,
      display_name: displayName || user.displayName || email.split("@")[0],
      roles,
      permissions: [],
      organization_ids: organizationIds,
      business_numbers: normalizedBusinessNumbers,
      channel_ids: channelIds,
      status: "ACTIVE",
      invitation_status: "PASSWORD_SETUP_PENDING",
      invited_by_uid: actor.uid,
      invited_by_email: actor.email,
      invited_at: FieldValue.serverTimestamp(),
      invited_at_iso: now,
      updated_by_uid: actor.uid,
      updated_by_email: actor.email,
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: now,
    };
    await getAdminDb().doc(`access_members/${safeDocumentId(user.uid)}`).set(member, { merge: true });
    const correlationId = await writeAccessAudit({
      actor,
      action: created ? "PAYUP.PARTNER_USER.CREATED" : "PAYUP.PARTNER_USER.REINVITED",
      targetType: "access_member",
      targetId: user.uid,
      after: { email, roles, organizationIds, businessNumbers: normalizedBusinessNumbers, channelIds, passwordSetupPending: true },
      reason,
    });
    response.status(200).json({
      ok: true,
      uid: user.uid,
      email,
      created,
      roles,
      organizationIds,
      businessNumbers: normalizedBusinessNumbers,
      channelIds,
      passwordSetupLink,
      linkDisplayedOnce: true,
      correlationId,
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});
