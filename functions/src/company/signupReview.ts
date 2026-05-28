import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import {
  readObjectBody,
  requirePost,
  sendJson,
  type CompanyMerchantProfile,
  type HttpRequestLike,
  type HttpResponseLike,
} from "../payments/types";

type CompanySignupReviewAction = "mark_sent" | "approve" | "hold" | "reject";

type CompanySignupReviewRequest = {
  requestId?: string;
  action?: CompanySignupReviewAction;
  companyId?: string;
  merchantId?: string;
  moduleKey?: string;
  merchantStatus?: CompanyMerchantProfile["merchantStatus"];
  reviewMemo?: string;
};

type CompanySignupRequestRecord = {
  companyName?: unknown;
  company_name?: unknown;
  businessRegistrationNumber?: unknown;
  business_registration_number?: unknown;
  representativeName?: unknown;
  representative_name?: unknown;
  managerName?: unknown;
  manager_name?: unknown;
  managerPhone?: unknown;
  manager_phone?: unknown;
  managerEmail?: unknown;
  manager_email?: unknown;
  commerceLicenseNo?: unknown;
  commerce_license_no?: unknown;
  csPhone?: unknown;
  cs_phone?: unknown;
  returnAddress?: unknown;
  return_address?: unknown;
  documentNames?: unknown;
  document_names?: unknown;
  documentUploads?: unknown;
  document_uploads?: unknown;
  documentUploadIds?: unknown;
  document_upload_ids?: unknown;
  documentStoragePaths?: unknown;
  document_storage_paths?: unknown;
  gmailDeliveryStatus?: unknown;
  gmail_delivery_status?: unknown;
  documentUploadStatus?: unknown;
  document_upload_status?: unknown;
  approvedCompanyId?: unknown;
  approved_company_id?: unknown;
  status?: unknown;
};

type AdminActor = {
  uid: string;
  email: string;
  role: string;
};

const masterAdminEmail = "rosabaya08@gmail.com";
const allowedMerchantStatuses: CompanyMerchantProfile["merchantStatus"][] = [
  "not_applied",
  "in_review",
  "mid_issued",
  "active",
  "blocked",
];

export async function companySignupReviewHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<CompanySignupReviewRequest>(request);
  const requestId = text(body.requestId);
  const action = body.action;

  if (!requestId || !isReviewAction(action)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "COMPANY_SIGNUP_REVIEW_REQUEST_INVALID",
        message: "requestId and a valid action are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const requestRef = db.collection("company_signup_requests").doc(requestId);
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "COMPANY_SIGNUP_REQUEST_NOT_FOUND",
        message: "가입 요청 문서를 찾을 수 없습니다. 로컬 임시 요청이 아니라 Firestore에 저장된 요청만 처리할 수 있습니다.",
        httpStatus: 404,
      },
    });
    return;
  }

  const signup = requestSnapshot.data() as CompanySignupRequestRecord;
  const normalizedBusinessNo = normalizeBusinessNo(
    text(signup.businessRegistrationNumber) || text(signup.business_registration_number),
  );
  const companyId = text(body.companyId) || text(signup.approvedCompanyId) || text(signup.approved_company_id) || makeCompanyId(normalizedBusinessNo, requestId);
  const merchantId = text(body.merchantId);
  const moduleKey = text(body.moduleKey);
  const merchantStatus = allowedMerchantStatuses.includes(body.merchantStatus as CompanyMerchantProfile["merchantStatus"])
    ? (body.merchantStatus as CompanyMerchantProfile["merchantStatus"])
    : action === "mark_sent"
      ? "in_review"
      : "mid_issued";
  const reviewMemo = text(body.reviewMemo);

  if (action === "approve" && (!merchantId || !moduleKey)) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "COMPANY_SIGNUP_MID_REQUIRED",
        message: "기업 승인에는 인피니 MID와 결제 모듈 키가 필요합니다.",
        httpStatus: 409,
      },
    });
    return;
  }

  const nowIso = new Date().toISOString();
  const requestPatch = buildRequestPatch({
    action,
    companyId,
    merchantId,
    moduleKey,
    merchantStatus,
    reviewMemo,
    actor,
    nowIso,
  });

  await db.runTransaction(async (transaction) => {
    transaction.set(requestRef, requestPatch, { merge: true });

    if (action === "approve") {
      transaction.set(db.collection("companies").doc(companyId), buildApprovedCompanyDocument(companyId, signup, requestId, merchantId, moduleKey, merchantStatus), { merge: true });
      transaction.set(db.collection("company_pg_credentials").doc(companyId), buildCompanyPgCredentialDocument(companyId, signup, merchantId, moduleKey, merchantStatus), { merge: true });
      transaction.set(db.collection("company_onboarding").doc(companyId), buildCompanyOnboardingDocument(companyId, signup, requestId), { merge: true });
    }

    transaction.set(db.collection("audit_logs").doc(), {
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRole: actor.role || "SUPER_ADMIN",
      action: `company_signup.${action}`,
      targetType: "company_signup_requests",
      targetId: requestId,
      company_id: companyId,
      message: auditMessageFor(action, companyId),
      before: {
        status: text(signup.status),
      },
      after: {
        status: requestPatch.status,
        company_id: companyId,
        pg_merchant_status: merchantStatus,
      },
      createdAt: nowIso,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      source: "firebase_functions_admin_backend",
    });
  });

  const authProvisioning = action === "approve"
    ? await provisionCompanyAdminAuthUser(companyId, signup, actor)
    : { status: "not_required" };

  sendJson(response, 200, {
    ok: true,
    requestId,
    action,
    companyId,
    authProvisioning,
    message: auditMessageFor(action, companyId),
  });
}

function buildRequestPatch(input: {
  action: CompanySignupReviewAction;
  companyId: string;
  merchantId: string;
  moduleKey: string;
  merchantStatus: CompanyMerchantProfile["merchantStatus"];
  reviewMemo: string;
  actor: AdminActor;
  nowIso: string;
}) {
  const status = input.action === "approve"
    ? "approved"
    : input.action === "mark_sent"
      ? "infiny_sent"
      : input.action === "hold"
        ? "on_hold"
        : "rejected";
  const transferStatus = input.action === "approve"
    ? "approved"
    : input.action === "mark_sent" || input.action === "hold"
      ? "sent"
      : "rejected";

  return {
    status,
    infiny_transfer_status: transferStatus,
    approved_company_id: input.companyId,
    pg_provider: "infiny",
    pg_merchant_id: input.merchantId || null,
    pg_module_key: input.moduleKey || null,
    pg_merchant_status: input.merchantStatus,
    review_memo: input.reviewMemo,
    reviewed_by_uid: input.actor.uid,
    reviewed_by_email: input.actor.email,
    reviewed_at: input.nowIso,
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildApprovedCompanyDocument(
  companyId: string,
  signup: CompanySignupRequestRecord,
  requestId: string,
  merchantId: string,
  moduleKey: string,
  merchantStatus: CompanyMerchantProfile["merchantStatus"],
) {
  return {
    company_id: companyId,
    name: companyName(signup) || companyId,
    business_registration_number: text(signup.businessRegistrationNumber) || text(signup.business_registration_number),
    business_registration_number_normalized: normalizeBusinessNo(text(signup.businessRegistrationNumber) || text(signup.business_registration_number)),
    representative_name: text(signup.representativeName) || text(signup.representative_name),
    manager_name: text(signup.managerName) || text(signup.manager_name),
    manager_phone: text(signup.managerPhone) || text(signup.manager_phone),
    manager_email: text(signup.managerEmail) || text(signup.manager_email),
    commerce_license_no: text(signup.commerceLicenseNo) || text(signup.commerce_license_no),
    cs_phone: text(signup.csPhone) || text(signup.cs_phone),
    return_address: text(signup.returnAddress) || text(signup.return_address),
    signup_request_id: requestId,
    signup_document_names: stringArray(signup.documentNames ?? signup.document_names),
    signup_document_uploads: arrayValue(signup.documentUploads ?? signup.document_uploads),
    signup_document_upload_ids: stringArray(signup.documentUploadIds ?? signup.document_upload_ids),
    signup_document_storage_paths: stringArray(signup.documentStoragePaths ?? signup.document_storage_paths),
    signup_gmail_delivery_status: text(signup.gmailDeliveryStatus) || text(signup.gmail_delivery_status) || "not_requested",
    signup_document_upload_status: text(signup.documentUploadStatus) || text(signup.document_upload_status) || "not_uploaded",
    status: "approved",
    approval_status: "approved",
    account_status: "active",
    pg_provider: "infiny",
    pg_merchant_id: merchantId,
    pg_module_key: moduleKey,
    pg_merchant_status: merchantStatus,
    infiny_mid: merchantId,
    infiny_module_key: moduleKey,
    infiny_mid_status: merchantStatus,
    pg_profile: {
      provider: "infiny",
      providerLabel: "인피니 PG",
      merchantId,
      merchantIdMasked: maskValue(merchantId, "MID 미입력"),
      moduleKey,
      moduleKeyMasked: maskValue(moduleKey, "모듈 키 미입력"),
      merchantStatus,
      adminManaged: true,
      companyEditable: false,
      settlementOwner: "infiny",
      settlementExecutionBlocked: true,
    },
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildCompanyPgCredentialDocument(
  companyId: string,
  signup: CompanySignupRequestRecord,
  merchantId: string,
  moduleKey: string,
  merchantStatus: CompanyMerchantProfile["merchantStatus"],
) {
  return {
    company_id: companyId,
    company_name: companyName(signup) || companyId,
    provider: "infiny",
    environment: "test",
    mid: merchantId,
    merchant_id: merchantId,
    merchant_id_masked: maskValue(merchantId, "MID 미입력"),
    module_key: moduleKey,
    module_key_masked: maskValue(moduleKey, "모듈 키 미입력"),
    credential_ready: merchantStatus === "active",
    credential_status: merchantStatus,
    status: merchantStatus,
    raw_secret_stored: false,
    secret_storage_policy: "firebase_functions_encrypted_vault_or_secret_manager",
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildCompanyOnboardingDocument(companyId: string, signup: CompanySignupRequestRecord, requestId: string) {
  return {
    company_id: companyId,
    signup_request_id: requestId,
    status: "approved",
    document_status: text(signup.documentUploadStatus) || text(signup.document_upload_status) || "not_uploaded",
    document_names: stringArray(signup.documentNames ?? signup.document_names),
    document_upload_ids: stringArray(signup.documentUploadIds ?? signup.document_upload_ids),
    document_storage_paths: stringArray(signup.documentStoragePaths ?? signup.document_storage_paths),
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function provisionCompanyAdminAuthUser(companyId: string, signup: CompanySignupRequestRecord, actor: AdminActor) {
  const email = (text(signup.managerEmail) || text(signup.manager_email)).trim().toLowerCase();
  const db = getAdminDb();

  if (!email || !email.includes("@")) {
    await recordAuthProvisioning(companyId, {
      status: "skipped",
      reason: "manager_email_missing",
      actorEmail: actor.email,
    });
    return { status: "skipped", reason: "manager_email_missing" };
  }

  try {
    const auth = getAdminAuth();
    let user = await auth.getUserByEmail(email).catch(() => null);

    if (!user) {
      user = await auth.createUser({
        email,
        emailVerified: false,
        disabled: false,
        displayName: `${companyName(signup) || companyId} 관리자`,
      });
    }

    const customClaims = {
      role: "COMPANY_ADMIN",
      company_id: companyId,
    };

    await auth.setCustomUserClaims(user.uid, customClaims);

    let resetLinkCreated = false;
    try {
      await auth.generatePasswordResetLink(email);
      resetLinkCreated = true;
    } catch {
      resetLinkCreated = false;
    }

    await Promise.all([
      db.collection("companies").doc(companyId).set(
        {
          auth_uid: user.uid,
          auth_email: email,
          auth_claims_ready: true,
          auth_password_reset_link_generated: resetLinkCreated,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
      recordAuthProvisioning(companyId, {
        status: "claims_set",
        uid: user.uid,
        email,
        role: "COMPANY_ADMIN",
        company_id: companyId,
        resetLinkCreated,
        actorEmail: actor.email,
      }),
    ]);

    return { status: "claims_set", uid: user.uid, resetLinkCreated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firebase Auth provisioning failed.";
    await recordAuthProvisioning(companyId, {
      status: "failed",
      email,
      reason: message,
      actorEmail: actor.email,
    });
    return { status: "failed", reason: message };
  }
}

async function recordAuthProvisioning(companyId: string, data: Record<string, unknown>) {
  await getAdminDb().collection("company_auth_provisioning").doc(companyId).set(
    {
      ...data,
      company_id: companyId,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<AdminActor | null> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "ADMIN_AUTH_REQUIRED",
        message: "최고관리자 Firebase ID 토큰이 필요합니다.",
        httpStatus: 401,
      },
    });
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;

    if (allowed) {
      return {
        uid: decoded.uid,
        email,
        role: role || (decoded.seed_admin === true ? "seed_admin" : "SUPER_ADMIN"),
      };
    }
  } catch {
    // Return a generic denial below.
  }

  sendJson(response, 403, {
    ok: false,
    error: {
      code: "ADMIN_FORBIDDEN",
      message: "최고관리자 권한이 필요합니다.",
      httpStatus: 403,
    },
  });
  return null;
}

function isReviewAction(value: unknown): value is CompanySignupReviewAction {
  return value === "mark_sent" || value === "approve" || value === "hold" || value === "reject";
}

function auditMessageFor(action: CompanySignupReviewAction, companyId: string) {
  if (action === "approve") return `${companyId} 기업 가입 승인과 MID 저장이 완료되었습니다.`;
  if (action === "mark_sent") return `${companyId} 기업 가입 요청을 인피니 전달 상태로 변경했습니다.`;
  if (action === "hold") return `${companyId} 기업 가입 요청을 보류했습니다.`;
  return `${companyId} 기업 가입 요청을 반려했습니다.`;
}

function companyName(signup: CompanySignupRequestRecord) {
  return text(signup.companyName) || text(signup.company_name);
}

function normalizeBusinessNo(value: string) {
  return value.replace(/\D/g, "");
}

function makeCompanyId(normalizedBusinessNo: string, fallback: string) {
  return `company-${normalizedBusinessNo || fallback.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}`;
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function maskValue(value: string, fallback: string) {
  if (!value) return fallback;
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}-${"*".repeat(Math.max(value.length - 8, 4))}-${value.slice(-4)}`;
}
