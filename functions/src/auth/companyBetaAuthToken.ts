import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth } from "../firebaseAdmin";
import { getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { hashCompanyPassword, verifyCompanyPassword } from "../company/companyPassword";
import { a5CompanyAuthClaims } from "../identity/source";

type CompanyBetaAuthRequest = {
  companyId?: string;
  businessNo?: string;
  password?: string;
};

const registeredClosedMallBusinessNo = "7592901311";
const temporaryInitialPassword = "1111";
const legacyBusinessNumberPasswordPolicy = "business_registration_number_initial";
const temporaryPasswordPolicy = "temporary_1111_force_change";
type ResolvedCompanyAccount = {
  companyId: string;
  documentId?: string;
  businessNo: string;
  password?: string;
  passwordHash?: string;
  displayName: string;
  status: string;
  passwordPolicy?: string;
  passwordChangeRequired?: boolean;
};

export async function companyBetaAuthTokenHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<CompanyBetaAuthRequest>(request);
  const companyId = text(body.companyId);
  const businessNo = normalizeBusinessNo(body.businessNo);
  const password = text(body.password);
  const account = await resolveCompanyAccount({ companyId, businessNo });

  if (!account) {
    sendJson(response, 403, {
      ok: false,
      resultCode: 403,
      resultMsg: "등록된 사업자 계정을 찾을 수 없습니다.",
    });
    return;
  }

  if (isBlockedStatus(account.status)) {
    sendJson(response, 403, {
      ok: false,
      resultCode: 403,
      resultMsg: "현재 사용할 수 없는 기업 계정입니다. 최고관리자에게 문의해 주세요.",
    });
    return;
  }

  const usesLegacyBusinessNumberPassword = account.passwordPolicy === legacyBusinessNumberPasswordPolicy;
  const verifiedPassword = verifyCompanyPassword({
    password,
    passwordHash: account.passwordHash,
    legacyPassword: account.password,
  });
  const passwordMatches = usesLegacyBusinessNumberPassword ? password === temporaryInitialPassword : verifiedPassword;

  if (!passwordMatches) {
    sendJson(response, 403, {
      ok: false,
      resultCode: 403,
      resultMsg: "사업자등록번호 또는 비밀번호가 일치하지 않습니다.",
    });
    return;
  }

  if (usesLegacyBusinessNumberPassword) {
    await migrateLegacyInitialPassword(account);
  }

  const uid = `company:${account.companyId}`;
  try {
    const token = await getAdminAuth().createCustomToken(uid, a5CompanyAuthClaims({
      companyId: account.companyId,
      businessNo: normalizeBusinessNo(account.businessNo),
      ownerUid: uid,
    }));

    sendJson(response, 200, {
      ok: true,
      companyId: account.companyId,
      displayName: account.displayName,
      businessNo: account.businessNo,
      customToken: token,
      passwordChangeRequired: usesLegacyBusinessNumberPassword || account.passwordChangeRequired === true,
    });
  } catch {
    sendJson(response, 500, {
      ok: false,
      resultCode: 500,
      resultMsg: "기업관리자 로그인 토큰 발급 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
}

async function resolveCompanyAccount(input: { companyId: string; businessNo: string }): Promise<ResolvedCompanyAccount | null> {
  if (!input.businessNo) return null;

  const firestoreAccount = await findCompanyByBusinessNo(input.businessNo);
  if (firestoreAccount && (!input.companyId || firestoreAccount.companyId === input.companyId)) {
    return firestoreAccount;
  }

  return null;
}

async function findCompanyByBusinessNo(businessNo: string): Promise<ResolvedCompanyAccount | null> {
  const db = getAdminDb();
  const normalized = normalizeBusinessNo(businessNo);
  const snapshot = await db
    .collection("companies")
    .where("business_registration_number_normalized", "==", normalized)
    .limit(1)
    .get();

  const document = snapshot.docs[0] ?? await findCompanyByRawBusinessNo(businessNo);
  if (!document) return null;

  const data = document.data();
  const registeredBusinessNo = text(data.business_registration_number) || text(data.businessRegistrationNumber) || businessNo;
  const normalizedBusinessNo = normalizeBusinessNo(registeredBusinessNo);

  return {
    companyId: text(data.company_id) || text(data.companyId) || document.id,
    documentId: document.id,
    businessNo: registeredBusinessNo,
    password: text(data.company_login_password) || text(data.login_password) || text(data.default_password),
    passwordHash: text(data.company_login_password_hash) || text(data.login_password_hash) || text(data.password_hash),
    displayName:
      normalizedBusinessNo === registeredClosedMallBusinessNo
        ? registeredClosedMallBusinessNo
        : text(data.name) || text(data.company_name) || text(data.companyName) || document.id,
    status: text(data.account_status) || text(data.status) || text(data.approval_status) || "approved",
    passwordPolicy: text(data.company_login_password_policy),
    passwordChangeRequired: data.password_change_required === true,
  };
}

async function findCompanyByRawBusinessNo(businessNo: string) {
  const db = getAdminDb();
  const normalized = normalizeBusinessNo(businessNo);
  const fields = ["business_registration_number", "businessRegistrationNumber", "business_no", "businessNo"];

  for (const field of fields) {
    const snapshot = await db.collection("companies").where(field, "==", businessNo).limit(1).get();
    if (!snapshot.empty) return snapshot.docs[0];
  }

  const scan = await db.collection("companies").limit(500).get();
  return (
    scan.docs.find((document) => {
      const data = document.data();
      return fields.some((field) => normalizeBusinessNo(data[field]) === normalized);
    }) ?? null
  );
}

async function migrateLegacyInitialPassword(account: ResolvedCompanyAccount): Promise<void> {
  const db = getAdminDb();
  const documentId = account.documentId || account.companyId;
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    transaction.set(
      db.collection("companies").doc(documentId),
      {
        company_login_password_hash: hashCompanyPassword(temporaryInitialPassword),
        company_login_password: FieldValue.delete(),
        login_password: FieldValue.delete(),
        default_password: FieldValue.delete(),
        company_login_password_policy: temporaryPasswordPolicy,
        password_change_required: true,
        company_login_password_migrated_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(db.collection("company_account_audit_logs").doc(), {
      company_id: account.companyId,
      action: "initial_password_policy_migrated",
      previous_policy: legacyBusinessNumberPasswordPolicy,
      next_policy: temporaryPasswordPolicy,
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
  });
}
function isBlockedStatus(status: string) {
  return ["suspended", "blocked", "rejected", "on_hold", "inactive", "withdrawal_requested", "withdrawn", "deleted"].includes(status);
}

function normalizeBusinessNo(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
