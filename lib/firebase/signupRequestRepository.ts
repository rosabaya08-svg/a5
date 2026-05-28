import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { maskMerchantId } from "@/lib/payments/infinySettlementPolicy";
import type { PgMerchantStatus } from "@/types/commerce";

export type CompanySignupRequestPayload = {
  id: string;
  companyName: string;
  businessRegistrationNumber: string;
  representativeName: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  commerceLicenseNo: string;
  csPhone: string;
  returnAddress: string;
  documentNames: string[];
  documentUploadIds?: string[];
  documentStoragePaths?: string[];
  gmailDeliveryStatus?: "not_requested" | "queued";
  status: "pending_review" | "infiny_sent" | "approved" | "on_hold" | "rejected";
  infinyTransferStatus?: "not_sent" | "sent" | "approved" | "rejected";
  pgMerchantId?: string;
  pgModuleKey?: string;
  pgMerchantStatus?: PgMerchantStatus;
  reviewedAt?: string;
  reviewMemo?: string;
  approvedCompanyId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyPgApprovalPayload = {
  request: CompanySignupRequestPayload;
  companyId: string;
  merchantId: string;
  moduleKey: string;
  merchantStatus: PgMerchantStatus;
  transferStatus: NonNullable<CompanySignupRequestPayload["infinyTransferStatus"]>;
  reviewStatus: CompanySignupRequestPayload["status"];
  reviewMemo?: string;
};

export async function saveCompanySignupRequest(payload: CompanySignupRequestPayload) {
  const db = getFirebaseDb();

  if (!db) {
    return { mode: "local" as const, message: "Firestore config is missing." };
  }

  await setDoc(
    doc(db, "company_signup_requests", payload.id),
    {
      ...payload,
      business_registration_number: payload.businessRegistrationNumber,
      representative_name: payload.representativeName,
      manager_name: payload.managerName,
      manager_phone: payload.managerPhone,
      manager_email: payload.managerEmail,
      commerce_license_no: payload.commerceLicenseNo,
      cs_phone: payload.csPhone,
      return_address: payload.returnAddress,
      document_names: payload.documentNames,
      document_upload_ids: payload.documentUploadIds ?? [],
      document_storage_paths: payload.documentStoragePaths ?? [],
      gmail_delivery_status: payload.gmailDeliveryStatus ?? "not_requested",
      guest_write_enabled: true,
      source: "cms_beta",
      source_app: "company",
      source_channel: "company_signup_request",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  return { mode: "firestore" as const, message: "Signup request saved." };
}

export async function saveCompanyPgApproval(payload: CompanyPgApprovalPayload) {
  const db = getFirebaseDb();

  if (!db) {
    return { mode: "local" as const, message: "Firestore config is missing." };
  }

  const now = serverTimestamp();
  const merchantId = payload.merchantId.trim();
  const moduleKey = payload.moduleKey.trim();
  const merchantIdMasked = maskMerchantId(merchantId || undefined);

  await Promise.all([
    setDoc(
      doc(db, "company_signup_requests", payload.request.id),
      {
        status: payload.reviewStatus,
        infiny_transfer_status: payload.transferStatus,
        pg_provider: "infiny",
        pg_merchant_id: merchantId || null,
        pg_module_key: moduleKey || null,
        pg_merchant_status: payload.merchantStatus,
        approved_company_id: payload.companyId,
        review_memo: payload.reviewMemo ?? "",
        reviewed_at: now,
        updated_at: now,
      },
      { merge: true },
    ),
    setDoc(
      doc(db, "companies", payload.companyId),
      {
        company_id: payload.companyId,
        name: payload.request.companyName,
        business_registration_number: payload.request.businessRegistrationNumber,
        representative_name: payload.request.representativeName,
        manager_name: payload.request.managerName,
        manager_phone: payload.request.managerPhone,
        manager_email: payload.request.managerEmail,
        commerce_license_no: payload.request.commerceLicenseNo,
        cs_phone: payload.request.csPhone,
        return_address: payload.request.returnAddress,
        status: payload.reviewStatus === "approved" ? "approved" : "pending",
        pg_provider: "infiny",
        pg_merchant_id: merchantId || null,
        pg_module_key: moduleKey || null,
        pg_merchant_status: payload.merchantStatus,
        infiny_mid: merchantId || null,
        infiny_mid_status: payload.merchantStatus,
        pg_profile: {
          provider: "infiny",
          providerLabel: "인피니 PG",
          merchantId: merchantId || null,
          merchantIdMasked,
          merchantStatus: payload.merchantStatus,
          adminManaged: true,
          companyEditable: false,
          settlementOwner: "infiny",
          settlementExecutionBlocked: true,
        },
        updated_at: now,
      },
      { merge: true },
    ),
  ]);

  return { mode: "firestore" as const, message: "Company PG approval saved." };
}
