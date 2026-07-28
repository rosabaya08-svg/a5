import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type RecordData = Record<string, unknown>;

const visibleCompanyStatuses = new Set(["active", "approved", "operating"]);

export async function storefrontCompanySummariesHandler(
  request: HttpRequestLike,
  response: HttpResponseLike,
): Promise<void> {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST.", httpStatus: 405 },
    });
    return;
  }

  try {
    const db = getAdminDb();
    const [companiesSnapshot, credentialsSnapshot] = await Promise.all([
      db.collection("companies").limit(1000).get(),
      db.collection("company_pg_credentials").limit(1000).get(),
    ]);
    const credentials = new Map(credentialsSnapshot.docs.map((doc) => [doc.id, asRecord(doc.data())]));

    const companies = companiesSnapshot.docs
      .map((doc) => mapPublicCompany(doc, credentials.get(doc.id)))
      .filter((company): company is NonNullable<typeof company> => Boolean(company))
      .sort((left, right) => left.name.localeCompare(right.name, "ko"));

    sendJson(response, 200, {
      ok: true,
      source: "firestore_safe_company_summary",
      companies,
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "STOREFRONT_COMPANY_SUMMARY_FAILED",
        message: error instanceof Error ? error.message : "Company summary read failed.",
        httpStatus: 500,
      },
    });
  }
}

function mapPublicCompany(doc: QueryDocumentSnapshot<DocumentData>, credentialData?: RecordData) {
  const company = asRecord(doc.data());
  const status = text(company.status).toLowerCase();
  const approval = text(company.approval_status ?? company.approvalStatus).toLowerCase();
  if (status === "archived" || status === "deleted" || status === "suspended") return null;
  if (status && !visibleCompanyStatuses.has(status) && approval !== "approved") return null;

  const credential = credentialData ?? {};
  const companyName = healthyText([
    company.legal_name,
    company.legalName,
    company.name,
    company.company_name,
    company.companyName,
    company.brand_name,
    company.brandName,
  ]) || "업체명 확인 전";
  const businessNo = normalizeBusinessNo(
    company.business_registration_number ??
      company.businessRegistrationNumber ??
      company.business_no ??
      company.businessNo ??
      credential.business_no ??
      credential.businessNo,
  );
  const merchantStatus = normalizeMerchantStatus(
    credential.credential_status ?? credential.merchant_status ?? credential.status,
  );
  const environment = text(credential.environment).toLowerCase() === "test" ? "test" : "production";
  const encryptedSecretStored = Boolean(
    credential.encrypted_secret_stored === true ||
      Object.keys(asRecord(credential.encrypted_secret_key ?? credential.encryptedSecretKey)).length ||
      Object.keys(asRecord(credential.encrypted_auth_key ?? credential.encryptedAuthKey)).length ||
      text(credential.secret_key_ref ?? credential.secretKeyRef ?? credential.auth_key_ref ?? credential.authKeyRef),
  );
  const credentialReady = bool(credential.credential_ready ?? credential.credentialReady, encryptedSecretStored);
  const vaultReady = bool(credential.vault_ready ?? credential.vaultReady, encryptedSecretStored);
  const merchantIdMasked = text(
    credential.merchant_id_masked ?? credential.merchantIdMasked ?? credential.payup_mid_masked,
  ) || (hasMerchantId(credential) ? "저장됨" : "미등록");

  return {
    id: doc.id,
    name: companyName,
    businessRegistrationNumber: businessNo || undefined,
    businessRegistrationNumberNormalized: businessNo || undefined,
    representativeName: healthyText([company.representative_name, company.representativeName]) || undefined,
    managerName: healthyText([company.manager_name, company.managerName]) || "담당자 확인 전",
    publicContactPhone: healthyText([
      company.public_contact_phone,
      company.publicContactPhone,
      company.cs_phone,
      company.csPhone,
    ]) || undefined,
    publicKakaoChannel: healthyText([company.public_kakao_channel, company.publicKakaoChannel]) || undefined,
    publicEmail: healthyText([company.public_email, company.publicEmail]) || undefined,
    commerceLicenseNo: healthyText([company.commerce_license_no, company.commerceLicenseNo]) || undefined,
    businessAddress: healthyText([company.business_address, company.businessAddress]) || undefined,
    returnAddress: healthyText([company.return_address, company.returnAddress]) || undefined,
    signupDocumentStatus: text(company.signup_document_upload_status ?? company.signupDocumentUploadStatus) || undefined,
    status: "approved" as const,
    commissionRate: numberValue(company.commission_rate ?? company.commissionRate, 4.5),
    productCount: numberValue(company.product_count ?? company.productCount),
    pendingProductCount: numberValue(company.pending_product_count ?? company.pendingProductCount),
    settlementBlocked: false,
    pgProfile: {
      provider: "payup" as const,
      providerLabel: "Payup",
      taxationType: "taxable" as const,
      taxFreeEnabled: false as const,
      merchantIdMasked,
      merchantStatus,
      environment,
      credentialReady,
      encryptedSecretStored,
      vaultReady,
      credentialStorageLabel: encryptedSecretStored ? "암호화 저장됨" : "미등록",
      adminManaged: true,
      companyEditable: false,
      pgFeeRate: numberValue(credential.pg_fee_rate ?? credential.pgFeeRate),
      platformFeeRate: numberValue(credential.platform_fee_rate ?? credential.platformFeeRate, 4.5),
      totalFeeRate: numberValue(credential.total_fee_rate ?? credential.totalFeeRate, 4.5),
      settlementOwner: "payup" as const,
      settlementExecutionBlocked: true,
    },
  };
}

function asRecord(value: unknown): RecordData {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordData) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["true", "1", "yes"].includes(value.toLowerCase())) return true;
    if (["false", "0", "no"].includes(value.toLowerCase())) return false;
  }
  return fallback;
}

function normalizeBusinessNo(value: unknown) {
  const normalized = text(value).replace(/[^0-9]/g, "");
  return normalized.length === 10 ? normalized : "";
}

function hasMerchantId(data: RecordData) {
  return Boolean(text(data.merchant_id ?? data.merchantId ?? data.payup_mid));
}

function normalizeMerchantStatus(value: unknown): "not_applied" | "in_review" | "mid_issued" | "active" | "blocked" {
  const normalized = text(value).toLowerCase();
  if (normalized === "active" || normalized === "enabled") return "active";
  if (normalized === "blocked" || normalized === "disabled" || normalized === "suspended") return "blocked";
  if (normalized === "in_review" || normalized === "pending") return "in_review";
  if (normalized === "mid_issued") return "mid_issued";
  return "not_applied";
}

function healthyText(values: unknown[]) {
  for (const value of values) {
    const candidate = text(value);
    if (!candidate || candidate.includes("�") || candidate.includes("???")) continue;
    if ((candidate.match(/\?/g) ?? []).length >= 2) continue;
    return candidate;
  }
  return "";
}
