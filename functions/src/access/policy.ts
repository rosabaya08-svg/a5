import { createHash, randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";

export type AccessRole =
  | "SUPER_ADMIN"
  | "FINANCE_ADMIN"
  | "OPERATIONS_ADMIN"
  | "SUPPORT_ADMIN"
  | "AUDITOR"
  | "COMPANY_ADMIN"
  | "SUPPLIER_ADMIN"
  | "PARTNER_ADMIN"
  | "A5LS_ADMIN";

export type AccessPermission =
  | "PAYUP_VIEW"
  | "PAYUP_HEALTH_PROBE"
  | "PAYUP_FEATURE_FLAG_WRITE"
  | "PAYUP_SUBMERCHANT_READ"
  | "PAYUP_SUBMERCHANT_WRITE"
  | "PAYUP_TRANSACTION_READ"
  | "PAYUP_SETTLEMENT_READ"
  | "PAYUP_CANCEL_REQUEST"
  | "PAYUP_CANCEL_EXECUTE"
  | "PAYUP_LOG_READ"
  | "PAYUP_ACCESS_READ"
  | "PAYUP_ACCESS_MANAGE"
  | "PAYUP_APPROVAL_REQUEST"
  | "PAYUP_APPROVAL_APPROVE"
  | "PAYUP_PARTNER_ACTIVITY_READ"
  | "ORDER_PII_READ";

export type AccessActor = {
  uid: string;
  email: string;
  displayName: string;
  roles: AccessRole[];
  permissions: AccessPermission[];
  organizationIds: string[];
  businessNumbers: string[];
  channelIds: string[];
  superAdmin: boolean;
};

type HttpRequestWithHeaders = {
  get(name: string): string | undefined;
};

type JsonRecord = Record<string, unknown>;

const rolePermissions: Record<AccessRole, AccessPermission[]> = {
  SUPER_ADMIN: [
    "PAYUP_VIEW",
    "PAYUP_HEALTH_PROBE",
    "PAYUP_FEATURE_FLAG_WRITE",
    "PAYUP_SUBMERCHANT_READ",
    "PAYUP_SUBMERCHANT_WRITE",
    "PAYUP_TRANSACTION_READ",
    "PAYUP_SETTLEMENT_READ",
    "PAYUP_CANCEL_REQUEST",
    "PAYUP_CANCEL_EXECUTE",
    "PAYUP_LOG_READ",
    "PAYUP_ACCESS_READ",
    "PAYUP_ACCESS_MANAGE",
    "PAYUP_APPROVAL_REQUEST",
    "PAYUP_APPROVAL_APPROVE",
    "PAYUP_PARTNER_ACTIVITY_READ",
    "ORDER_PII_READ",
  ],
  FINANCE_ADMIN: [
    "PAYUP_VIEW",
    "PAYUP_HEALTH_PROBE",
    "PAYUP_TRANSACTION_READ",
    "PAYUP_SETTLEMENT_READ",
    "PAYUP_CANCEL_REQUEST",
    "PAYUP_CANCEL_EXECUTE",
    "PAYUP_LOG_READ",
    "PAYUP_ACCESS_READ",
    "PAYUP_APPROVAL_REQUEST",
    "PAYUP_APPROVAL_APPROVE",
    "ORDER_PII_READ",
  ],
  OPERATIONS_ADMIN: [
    "PAYUP_VIEW",
    "PAYUP_HEALTH_PROBE",
    "PAYUP_SUBMERCHANT_READ",
    "PAYUP_SUBMERCHANT_WRITE",
    "PAYUP_TRANSACTION_READ",
    "PAYUP_SETTLEMENT_READ",
    "PAYUP_LOG_READ",
    "PAYUP_ACCESS_READ",
    "PAYUP_APPROVAL_REQUEST",
    "ORDER_PII_READ",
  ],
  SUPPORT_ADMIN: [
    "PAYUP_VIEW",
    "PAYUP_TRANSACTION_READ",
    "PAYUP_CANCEL_REQUEST",
    "PAYUP_LOG_READ",
    "ORDER_PII_READ",
  ],
  AUDITOR: [
    "PAYUP_VIEW",
    "PAYUP_HEALTH_PROBE",
    "PAYUP_SUBMERCHANT_READ",
    "PAYUP_TRANSACTION_READ",
    "PAYUP_SETTLEMENT_READ",
    "PAYUP_LOG_READ",
    "PAYUP_ACCESS_READ",
  ],
  COMPANY_ADMIN: ["PAYUP_PARTNER_ACTIVITY_READ", "ORDER_PII_READ"],
  SUPPLIER_ADMIN: ["PAYUP_PARTNER_ACTIVITY_READ", "ORDER_PII_READ"],
  PARTNER_ADMIN: ["PAYUP_PARTNER_ACTIVITY_READ"],
  A5LS_ADMIN: ["PAYUP_PARTNER_ACTIVITY_READ"],
};

export class AccessHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function text(value: unknown, maxLength = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function stringArray(value: unknown, maxItems = 100, maxLength = 200): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => text(entry, maxLength)).filter(Boolean))].slice(0, maxItems);
}

export function safeDocumentId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 180) || randomUUID();
}

export function firestoreDocumentId(value: unknown, name = "documentId"): string {
  const result = text(value, 1500);
  if (!result || result.includes("/") || /[\u0000-\u001f]/.test(result)) {
    throw new AccessHttpError(400, "FIRESTORE_DOCUMENT_ID_INVALID", `${name} 값이 Firestore 문서 ID로 올바르지 않습니다.`);
  }
  return result;
}

function normalizeRole(value: unknown): AccessRole | "" {
  const role = text(value, 100).toUpperCase();
  return Object.prototype.hasOwnProperty.call(rolePermissions, role) ? (role as AccessRole) : "";
}

function tokenRoles(decoded: DecodedIdToken): AccessRole[] {
  const raw = [
    decoded.role,
    decoded.a5_role,
    decoded.admin_role,
    ...(Array.isArray(decoded.roles) ? decoded.roles : []),
  ];
  return [...new Set(raw.map(normalizeRole).filter((value): value is AccessRole => Boolean(value)))];
}

function bootstrapEmails(): Set<string> {
  return new Set(
    String(process.env.A5_BOOTSTRAP_SUPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function claimStringArray(decoded: DecodedIdToken, keys: string[]): string[] {
  for (const key of keys) {
    const value = decoded[key];
    if (Array.isArray(value)) return stringArray(value);
    const single = text(value, 200);
    if (single) return [single];
  }
  return [];
}

function claimBusinessNumbers(decoded: DecodedIdToken): string[] {
  return claimStringArray(decoded, ["business_numbers", "business_number", "business_no"])
    .map((value) => value.replace(/[^0-9]/g, ""))
    .filter(Boolean);
}

function permissionsForRoles(roles: AccessRole[]): AccessPermission[] {
  return [...new Set(roles.flatMap((role) => rolePermissions[role]))];
}

function includesPermission(actor: AccessActor, permission: AccessPermission): boolean {
  return actor.superAdmin || actor.permissions.includes(permission);
}

export async function requireAccess(
  request: HttpRequestWithHeaders,
  permission: AccessPermission,
): Promise<AccessActor> {
  const authorization = request.get("authorization") ?? request.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new AccessHttpError(401, "ACCESS_AUTH_REQUIRED", "Firebase 로그인이 필요합니다.");
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(authorization.slice("Bearer ".length), true);
  } catch {
    throw new AccessHttpError(401, "ACCESS_TOKEN_INVALID", "Firebase 로그인 토큰이 유효하지 않습니다.");
  }

  const email = text(decoded.email, 320).toLowerCase();
  const membershipSnapshot = await getAdminDb().doc(`access_members/${safeDocumentId(decoded.uid)}`).get();
  const membership = membershipSnapshot.data() ?? {};
  const membershipStatus = text(membership.status, 30).toUpperCase();
  if (membershipSnapshot.exists && !["ACTIVE", "APPROVED"].includes(membershipStatus)) {
    throw new AccessHttpError(403, "ACCESS_MEMBER_INACTIVE", "중지되거나 승인되지 않은 관리자 계정입니다.");
  }

  const roles = [...new Set([
    ...tokenRoles(decoded),
    ...stringArray(membership.roles).map(normalizeRole).filter((value): value is AccessRole => Boolean(value)),
    ...(bootstrapEmails().has(email) ? (["SUPER_ADMIN"] as AccessRole[]) : []),
  ])];
  const explicitPermissions = stringArray(membership.permissions)
    .map((value) => value.toUpperCase())
    .filter((value): value is AccessPermission => permissionsForRoles(["SUPER_ADMIN"]).includes(value as AccessPermission));
  const permissions = [...new Set([...permissionsForRoles(roles), ...explicitPermissions])];
  const actor: AccessActor = {
    uid: decoded.uid,
    email,
    displayName: text(decoded.name ?? membership.display_name, 200),
    roles,
    permissions,
    organizationIds: [...new Set([
      ...claimStringArray(decoded, ["organization_ids", "organization_id", "company_id"]),
      ...stringArray(membership.organization_ids),
    ])],
    businessNumbers: [...new Set([
      ...claimBusinessNumbers(decoded),
      ...stringArray(membership.business_numbers).map((value) => value.replace(/[^0-9]/g, "")).filter(Boolean),
    ])],
    channelIds: [...new Set([
      ...claimStringArray(decoded, ["channel_ids", "channel_id", "source_site"]),
      ...stringArray(membership.channel_ids),
    ])],
    superAdmin: roles.includes("SUPER_ADMIN"),
  };

  if (!includesPermission(actor, permission)) {
    throw new AccessHttpError(403, "ACCESS_PERMISSION_DENIED", `${permission} 권한이 없습니다.`);
  }
  return actor;
}

export function assertOrganizationScope(actor: AccessActor, input: { organizationId?: string; businessNumber?: string }) {
  if (actor.superAdmin) return;
  const organizationId = text(input.organizationId, 200);
  const businessNumber = text(input.businessNumber, 20).replace(/[^0-9]/g, "");
  const allowedByOrganization = organizationId && actor.organizationIds.includes(organizationId);
  const allowedByBusiness = businessNumber && actor.businessNumbers.includes(businessNumber);
  if (!allowedByOrganization && !allowedByBusiness) {
    throw new AccessHttpError(403, "ACCESS_SCOPE_DENIED", "다른 하위사업자의 금융정보에는 접근할 수 없습니다.");
  }
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function approvalPayloadHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function assertNoSensitiveKeys(value: unknown, path = "payload") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSensitiveKeys(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as JsonRecord)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (["apikey", "apicertkey", "secret", "signature", "authtoken", "cardno", "accountnumber"].some((token) => normalized.includes(token))) {
      throw new AccessHttpError(400, "SENSITIVE_APPROVAL_PAYLOAD_BLOCKED", `${path}.${key} 민감정보는 승인요청 원장에 저장할 수 없습니다.`);
    }
    assertNoSensitiveKeys(entry, `${path}.${key}`);
  }
}

export async function consumeApprovedChange(input: {
  approvalRequestId: string;
  actionType: string;
  payload: unknown;
  actor: AccessActor;
}) {
  const requestId = safeDocumentId(input.approvalRequestId);
  if (!requestId) throw new AccessHttpError(409, "APPROVAL_REQUIRED", "2인 승인요청 ID가 필요합니다.");
  const ref = getAdminDb().doc(`payup_change_requests/${requestId}`);
  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new AccessHttpError(404, "APPROVAL_NOT_FOUND", "승인요청을 찾을 수 없습니다.");
    const data = snapshot.data() ?? {};
    if (text(data.status, 30).toUpperCase() !== "APPROVED") {
      throw new AccessHttpError(409, "APPROVAL_NOT_APPROVED", "승인 완료된 요청만 실행할 수 있습니다.");
    }
    if (text(data.action_type, 100) !== input.actionType) {
      throw new AccessHttpError(409, "APPROVAL_ACTION_MISMATCH", "승인요청의 작업 종류가 현재 실행과 일치하지 않습니다.");
    }
    if (text(data.payload_hash, 100) !== approvalPayloadHash(input.payload)) {
      throw new AccessHttpError(409, "APPROVAL_PAYLOAD_MISMATCH", "승인받은 값과 현재 실행 값이 다릅니다.");
    }
    const requestedBy = text(data.requested_by_uid, 200);
    const approvedBy = text(data.approved_by_uid, 200);
    if (!requestedBy || !approvedBy || requestedBy === approvedBy) {
      throw new AccessHttpError(409, "APPROVAL_SEPARATION_REQUIRED", "요청자와 승인자는 서로 달라야 합니다.");
    }
    if (data.consumed_at) throw new AccessHttpError(409, "APPROVAL_ALREADY_CONSUMED", "이미 사용된 승인요청입니다.");
    transaction.update(ref, {
      status: "CONSUMED",
      consumed_by_uid: input.actor.uid,
      consumed_at: FieldValue.serverTimestamp(),
      consumed_at_iso: new Date().toISOString(),
    });
  });
}

export async function writeAccessAudit(input: {
  actor: AccessActor;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  correlationId?: string;
}) {
  const correlationId = input.correlationId ?? randomUUID();
  await getAdminDb().collection("audit_logs").add({
    actor_uid: input.actor.uid,
    actor_email: input.actor.email,
    actor_roles: input.actor.roles,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? "",
    correlation_id: correlationId,
    source: "payup_access_control",
    created_at: FieldValue.serverTimestamp(),
    created_at_iso: new Date().toISOString(),
  });
  return correlationId;
}

export function sendAccessError(response: { status(code: number): { json(value: unknown): void } }, error: unknown) {
  const known = error instanceof AccessHttpError;
  response.status(known ? error.status : 500).json({
    ok: false,
    error: {
      code: known ? error.code : "ACCESS_INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "접근제어 처리 중 오류가 발생했습니다.",
    },
  });
}
