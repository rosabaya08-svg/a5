import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  approvalPayloadHash,
  asRecord,
  assertNoSensitiveKeys,
  consumeApprovedChange,
  requireAccess,
  safeDocumentId,
  sendAccessError,
  stringArray,
  text,
  writeAccessAudit,
  type AccessRole,
} from "../access/policy";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 10 };

const allowedRoles = new Set<AccessRole>([
  "SUPER_ADMIN",
  "FINANCE_ADMIN",
  "OPERATIONS_ADMIN",
  "SUPPORT_ADMIN",
  "AUDITOR",
  "COMPANY_ADMIN",
  "SUPPLIER_ADMIN",
  "PARTNER_ADMIN",
  "A5LS_ADMIN",
]);

const allowedApprovalActions = new Set([
  "FEATURE_FLAG_ENABLE",
  "FULL_CANCEL",
  "ACCESS_CHANGE",
  "MERCHANT_CHANGE",
  "PAYOUT_HOLD_RELEASE",
  "DISTRIBUTION_POLICY_CHANGE",
]);

function normalizeRoles(value: unknown): AccessRole[] {
  const roles = stringArray(value)
    .map((role) => role.toUpperCase() as AccessRole)
    .filter((role) => allowedRoles.has(role));
  if (!roles.length) throw new AccessHttpError(400, "ACCESS_ROLE_REQUIRED", "하나 이상의 유효한 역할이 필요합니다.");
  return [...new Set(roles)];
}

async function resolveUser(body: Record<string, unknown>) {
  const requestedUid = text(body.uid, 200);
  if (requestedUid) {
    try {
      return await getAdminAuth().getUser(requestedUid);
    } catch {
      throw new AccessHttpError(404, "ACCESS_USER_NOT_FOUND", "Firebase 사용자를 찾을 수 없습니다.");
    }
  }
  const email = text(body.email, 320).toLowerCase();
  if (!email) throw new AccessHttpError(400, "ACCESS_USER_REQUIRED", "uid 또는 이메일이 필요합니다.");
  try {
    return await getAdminAuth().getUserByEmail(email);
  } catch {
    throw new AccessHttpError(404, "ACCESS_USER_NOT_FOUND", "Firebase 사용자를 찾을 수 없습니다.");
  }
}

function accessChangePayload(input: {
  uid: string;
  roles: AccessRole[];
  status: string;
  organizationIds: string[];
  businessNumbers: string[];
  channelIds: string[];
}) {
  return {
    uid: input.uid,
    roles: input.roles,
    status: input.status,
    organizationIds: input.organizationIds,
    businessNumbers: input.businessNumbers,
    channelIds: input.channelIds,
  };
}

export const payupAdminAccessSecure = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const action = text(body.action, 30) || "list";
    const actor = await requireAccess(request, action === "list" ? "PAYUP_ACCESS_READ" : "PAYUP_ACCESS_MANAGE");
    const db = getAdminDb();

    if (action === "list") {
      const requestedLimit = Number(body.limit ?? 300);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
      const snapshot = await db.collection("access_members").limit(limit).get();
      const list = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .sort((left, right) => text((right as Record<string, unknown>).updated_at_iso, 50).localeCompare(text((left as Record<string, unknown>).updated_at_iso, 50)));
      response.status(200).json({ ok: true, listCount: list.length, list, generatedAt: new Date().toISOString() });
      return;
    }

    if (action !== "upsert") throw new AccessHttpError(400, "ACCESS_ACTION_INVALID", "action은 list 또는 upsert여야 합니다.");
    const target = await resolveUser(body);
    const roles = normalizeRoles(body.roles);
    const status = text(body.status, 30).toUpperCase() === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    const organizationIds = stringArray(body.organizationIds);
    const businessNumbers = stringArray(body.businessNumbers).map((value) => value.replace(/[^0-9]/g, "")).filter(Boolean);
    const channelIds = stringArray(body.channelIds);
    const reason = text(body.reason, 500);
    const ref = db.doc(`access_members/${safeDocumentId(target.uid)}`);
    const beforeSnapshot = await ref.get();
    const before = beforeSnapshot.data() ?? null;
    const previousRoles = stringArray(before?.roles).map((value) => value.toUpperCase());
    const critical = roles.includes("SUPER_ADMIN") || previousRoles.includes("SUPER_ADMIN") || status === "SUSPENDED";
    const approvalPayload = accessChangePayload({ uid: target.uid, roles, status, organizationIds, businessNumbers, channelIds });

    if (critical) {
      await consumeApprovedChange({
        approvalRequestId: text(body.approvalRequestId, 200),
        actionType: "ACCESS_CHANGE",
        payload: approvalPayload,
        actor,
      });
    }

    const existingClaims = target.customClaims ?? {};
    const claims = {
      ...existingClaims,
      role: roles[0],
      roles,
      organization_ids: organizationIds,
      organization_id: organizationIds[0] ?? null,
      business_numbers: businessNumbers,
      business_number: businessNumbers[0] ?? null,
      channel_ids: channelIds,
      access_status: status,
    };
    await getAdminAuth().setCustomUserClaims(target.uid, claims);
    const after = {
      uid: target.uid,
      email: target.email ?? "",
      display_name: target.displayName ?? "",
      roles,
      permissions: [],
      organization_ids: organizationIds,
      business_numbers: businessNumbers,
      channel_ids: channelIds,
      status,
      updated_by_uid: actor.uid,
      updated_by_email: actor.email,
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    };
    await ref.set(after, { merge: true });
    const correlationId = await writeAccessAudit({
      actor,
      action: "PAYUP.ACCESS_MEMBER.UPSERTED",
      targetType: "access_member",
      targetId: target.uid,
      before,
      after: { ...after, updated_at: "serverTimestamp" },
      reason,
    });
    response.status(200).json({ ok: true, uid: target.uid, roles, status, correlationId, tokenRefreshRequired: true });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupAdminApprovalsSecure = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const action = text(body.action, 30) || "list";
    const permission = action === "approve" || action === "reject" ? "PAYUP_APPROVAL_APPROVE" : action === "request" ? "PAYUP_APPROVAL_REQUEST" : "PAYUP_ACCESS_READ";
    const actor = await requireAccess(request, permission);
    const db = getAdminDb();

    if (action === "list") {
      const requestedLimit = Number(body.limit ?? 300);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
      const snapshot = await db.collection("payup_change_requests").limit(limit).get();
      const list = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .sort((left, right) => text((right as Record<string, unknown>).requested_at_iso, 50).localeCompare(text((left as Record<string, unknown>).requested_at_iso, 50)));
      response.status(200).json({ ok: true, listCount: list.length, list, generatedAt: new Date().toISOString() });
      return;
    }

    if (action === "request") {
      const actionType = text(body.actionType, 100).toUpperCase();
      if (!allowedApprovalActions.has(actionType)) throw new AccessHttpError(400, "APPROVAL_ACTION_INVALID", "허용되지 않은 승인 작업입니다.");
      let targetId = text(body.targetId, 320);
      let payload = body.payload ?? {};
      assertNoSensitiveKeys(payload);
      if (actionType === "ACCESS_CHANGE") {
        const requested = asRecord(payload);
        const target = await resolveUser({ uid: text(requested.uid, 200), email: targetId || text(requested.email, 320) });
        payload = accessChangePayload({
          uid: target.uid,
          roles: normalizeRoles(requested.roles),
          status: text(requested.status, 30).toUpperCase() === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
          organizationIds: stringArray(requested.organizationIds),
          businessNumbers: stringArray(requested.businessNumbers).map((value) => value.replace(/[^0-9]/g, "")).filter(Boolean),
          channelIds: stringArray(requested.channelIds),
        });
        targetId = target.uid;
      }
      const requestId = `approval-${Date.now()}-${randomUUID().slice(0, 8)}`;
      await db.doc(`payup_change_requests/${safeDocumentId(requestId)}`).set({
        id: requestId,
        action_type: actionType,
        target_id: targetId,
        payload,
        payload_hash: approvalPayloadHash(payload),
        status: "PENDING",
        reason: text(body.reason, 500),
        requested_by_uid: actor.uid,
        requested_by_email: actor.email,
        requested_at: FieldValue.serverTimestamp(),
        requested_at_iso: new Date().toISOString(),
        expires_at_iso: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      await writeAccessAudit({ actor, action: "PAYUP.APPROVAL.REQUESTED", targetType: "payup_change_request", targetId: requestId, after: { actionType, targetId, payloadHash: approvalPayloadHash(payload) }, reason: text(body.reason, 500) });
      response.status(200).json({ ok: true, requestId, targetId, status: "PENDING" });
      return;
    }

    if (action !== "approve" && action !== "reject") throw new AccessHttpError(400, "APPROVAL_ACTION_INVALID", "action은 list, request, approve 또는 reject여야 합니다.");
    const rawRequestId = text(body.requestId, 200);
    if (!rawRequestId) throw new AccessHttpError(400, "APPROVAL_REQUEST_ID_REQUIRED", "승인요청 ID가 필요합니다.");
    const requestId = safeDocumentId(rawRequestId);
    const ref = db.doc(`payup_change_requests/${requestId}`);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new AccessHttpError(404, "APPROVAL_NOT_FOUND", "승인요청을 찾을 수 없습니다.");
      const data = snapshot.data() ?? {};
      if (text(data.status, 30) !== "PENDING") throw new AccessHttpError(409, "APPROVAL_ALREADY_DECIDED", "이미 처리된 승인요청입니다.");
      if (text(data.requested_by_uid, 200) === actor.uid) throw new AccessHttpError(409, "APPROVAL_SELF_APPROVAL_BLOCKED", "요청자는 자신의 작업을 승인할 수 없습니다.");
      if (Date.parse(text(data.expires_at_iso, 50)) < Date.now()) throw new AccessHttpError(409, "APPROVAL_EXPIRED", "승인요청의 유효시간이 만료됐습니다.");
      transaction.update(ref, {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approved_by_uid: action === "approve" ? actor.uid : null,
        approved_by_email: action === "approve" ? actor.email : null,
        rejected_by_uid: action === "reject" ? actor.uid : null,
        rejected_by_email: action === "reject" ? actor.email : null,
        decision_reason: text(body.reason, 500),
        decided_at: FieldValue.serverTimestamp(),
        decided_at_iso: new Date().toISOString(),
      });
    });
    await writeAccessAudit({ actor, action: action === "approve" ? "PAYUP.APPROVAL.APPROVED" : "PAYUP.APPROVAL.REJECTED", targetType: "payup_change_request", targetId: requestId, reason: text(body.reason, 500) });
    response.status(200).json({ ok: true, requestId, status: action === "approve" ? "APPROVED" : "REJECTED" });
  } catch (error) {
    sendAccessError(response, error);
  }
});
