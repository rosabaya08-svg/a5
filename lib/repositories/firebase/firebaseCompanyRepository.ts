import { collection, doc, getDoc, getDocs, query, where, type QueryConstraint } from "firebase/firestore";
import { normalizeBusinessNo } from "@/lib/auth/session";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  buildInfinyPgProfile,
  defaultInfinyPgProfile,
  INFINY_TOTAL_FEE_RATE,
} from "@/lib/payments/infinySettlementPolicy";
import type { CompanyRepository, CompanyListFilters } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Company, PgMerchantStatus } from "@/types/commerce";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isHealthyProfileText(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return Boolean(normalized) && !normalized.includes("?") && !normalized.includes("\uFFFD");
}

function firstHealthyProfileText(values: unknown[], fallback = "") {
  const match = values.find(isHealthyProfileText);
  return typeof match === "string" ? match.trim() : fallback;
}

function firstBusinessNo(values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeBusinessNo(String(value ?? ""));
    if (normalized) return normalized;
  }
  return "";
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asCompanyStatus(status: unknown, approvalStatus: unknown): Company["status"] {
  if (status === "suspended") return "suspended";
  if (status === "pending" || approvalStatus === "pending_review" || approvalStatus === "pending") return "pending";
  return "approved";
}

function asPgMerchantStatus(value: unknown): PgMerchantStatus {
  const allowed: PgMerchantStatus[] = ["not_applied", "in_review", "mid_issued", "active", "blocked"];
  return allowed.includes(value as PgMerchantStatus) ? (value as PgMerchantStatus) : "not_applied";
}

function mapCompany(documentId: string, data: Record<string, unknown>): Company {
  const businessRegistrationNumber = firstBusinessNo([
    data.business_registration_number,
    data.businessRegistrationNumber,
    data.business_no,
    data.businessNo,
    data.company_business_no,
    data.companyBusinessNo,
  ]);
  const pgProfileData = asRecord(data.pg_profile ?? data.pgProfile);
  const merchantId = asString(
    data.payup_mid ??
      data.infiny_mid ??
      data.pg_merchant_id ??
      data.merchant_id ??
      data.merchantId ??
      pgProfileData.mid ??
      pgProfileData.payup_mid ??
      pgProfileData.infiny_mid ??
      pgProfileData.pg_merchant_id ??
      pgProfileData.merchant_id ??
      pgProfileData.merchantId,
  );
  const merchantStatus = asPgMerchantStatus(
    data.payup_mid_status ??
      data.infiny_mid_status ??
      data.pg_merchant_status ??
      data.merchantStatus ??
      pgProfileData.merchantStatus ??
      pgProfileData.merchant_status,
  );
  const basePgProfile = merchantId || merchantStatus !== "not_applied"
    ? buildInfinyPgProfile({ merchantId: merchantId || undefined, merchantStatus })
    : defaultInfinyPgProfile();
  const pgProfile = {
    ...basePgProfile,
    providerLabel: asString(pgProfileData.providerLabel ?? pgProfileData.provider_label, basePgProfile.providerLabel),
    merchantIdMasked: asString(
      data.merchant_id_masked ?? data.pg_merchant_id_masked ?? pgProfileData.merchantIdMasked ?? pgProfileData.merchant_id_masked,
      basePgProfile.merchantIdMasked,
    ),
    moduleKey: asString(data.payup_module_key ?? data.infiny_module_key ?? data.pg_module_key ?? pgProfileData.moduleKey ?? pgProfileData.module_key) || undefined,
    moduleKeyMasked:
      asString(data.module_key_masked ?? data.pg_module_key_masked ?? pgProfileData.moduleKeyMasked ?? pgProfileData.module_key_masked) ||
      basePgProfile.moduleKeyMasked,
    merchantSerialNoMasked:
      asString(data.merchant_serial_no_masked ?? pgProfileData.merchantSerialNoMasked ?? pgProfileData.merchant_serial_no_masked) || undefined,
    terminalIdMasked: asString(data.terminal_id_masked ?? pgProfileData.terminalIdMasked ?? pgProfileData.terminal_id_masked) || undefined,
    credentialRefsStored: Boolean(data.credential_refs_stored ?? pgProfileData.credentialRefsStored ?? pgProfileData.credential_refs_stored),
  };

  return {
    id: asString(data.company_id ?? data.companyId, documentId),
    name: firstHealthyProfileText([data.name, data.companyName, data.company_name, data.brand_name, data.brandName], "업체명 확인 전"),
    businessRegistrationNumber: businessRegistrationNumber || undefined,
    businessRegistrationNumberNormalized: businessRegistrationNumber ? normalizeBusinessNo(businessRegistrationNumber) : undefined,
    representativeName: firstHealthyProfileText([data.representative_name, data.representativeName]) || undefined,
    managerName: firstHealthyProfileText([data.manager_name, data.managerName], "확인 전"),
    publicContactPhone: firstHealthyProfileText([data.public_contact_phone, data.publicContactPhone, data.cs_phone, data.csPhone, data.manager_phone, data.managerPhone, data.contact_phone, data.contactPhone]) || undefined,
    publicKakaoChannel: firstHealthyProfileText([data.public_kakao_channel, data.publicKakaoChannel]) || undefined,
    publicEmail: firstHealthyProfileText([data.public_email, data.publicEmail, data.manager_email, data.managerEmail, data.contact_email, data.contactEmail]) || undefined,
    commerceLicenseNo: firstHealthyProfileText([data.commerce_license_no, data.commerceLicenseNo, data.mail_order_registration_number, data.mailOrderRegistrationNumber]) || undefined,
    businessAddress: firstHealthyProfileText([data.business_address, data.businessAddress, data.company_address, data.companyAddress, data.address]) || undefined,
    returnAddress: firstHealthyProfileText([data.return_address, data.returnAddress]) || undefined,
    signupDocumentStatus: asString(data.signup_document_upload_status ?? data.signupDocumentUploadStatus) || undefined,
    status: asCompanyStatus(data.status, data.approval_status),
    commissionRate: asNumber(data.commission_rate ?? data.commissionRate, INFINY_TOTAL_FEE_RATE),
    productCount: asNumber(data.product_count ?? data.productCount, 0),
    pendingProductCount: asNumber(data.pending_product_count ?? data.pendingProductCount, 0),
    settlementBlocked: Boolean(data.settlement_blocked ?? data.settlementBlocked ?? false),
    pgProfile,
  };
}

function constraints(filters?: CompanyListFilters) {
  const items: QueryConstraint[] = [];
  if (filters?.status === "suspended") items.push(where("status", "==", "suspended"));
  if (filters?.status === "pending") items.push(where("approval_status", "in", ["pending", "pending_review"]));
  if (filters?.status === "approved") items.push(where("status", "in", ["active", "approved"]));
  return items;
}

export const firebaseCompanyRepository: CompanyRepository = {
  async listCompanies(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const snapshot = await getDocs(query(collection(db, "companies"), ...constraints(filters)));
      return repositoryOk(snapshot.docs.map((item) => mapCompany(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore companies read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore companies read failed. ${message}`);
    }
  },

  async getCompanyById(companyId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", companyId);
    }

    try {
      const snapshot = await getDoc(doc(db, "companies", companyId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase company not found.", companyId);
      }

      return repositoryOk(mapCompany(snapshot.id, snapshot.data()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore company read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore company read failed. ${message}`, companyId);
    }
  },
};
