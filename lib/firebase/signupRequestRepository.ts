import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { maskMerchantId } from "@/lib/payments/infinySettlementPolicy";
import { normalizeBusinessNo } from "@/lib/auth/session";
import type { PgMerchantStatus } from "@/types/commerce";

export const COMPANY_SIGNUP_REQUEST_STORAGE_KEY = "a5.company-signup-requests";

export type CompanySignupDocumentLink = {
  id: string;
  fileName: string;
  storagePath: string;
  downloadUrl?: string;
  documentType?: string;
  documentLabel?: string;
  contentType?: string;
  fileSize?: number;
  gmailStatus?: "not_requested" | "queued";
  a1InboxStatus?: "not_queued" | "queued";
};

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
  documentUploads?: CompanySignupDocumentLink[];
  documentUploadIds?: string[];
  documentStoragePaths?: string[];
  gmailDeliveryStatus?: "not_requested" | "queued";
  documentUploadStatus?: "not_uploaded" | "uploaded" | "failed";
  documentUploadError?: string;
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

export function readLocalCompanySignupRequests() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMPANY_SIGNUP_REQUEST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompanySignupRequestPayload[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalCompanySignupRequest(request: CompanySignupRequestPayload) {
  if (typeof window === "undefined") return;

  const current = readLocalCompanySignupRequests();
  window.localStorage.setItem(
    COMPANY_SIGNUP_REQUEST_STORAGE_KEY,
    JSON.stringify([request, ...current.filter((item) => item.id !== request.id)]),
  );
}

export function companySignupDocumentLinksFor(request: CompanySignupRequestPayload): CompanySignupDocumentLink[] {
  if (request.documentUploads?.length) return request.documentUploads;

  return (request.documentUploadIds ?? []).map((id, index) => ({
    id,
    fileName: request.documentNames[index] ?? id,
    storagePath: request.documentStoragePaths?.[index] ?? "",
    gmailStatus: request.gmailDeliveryStatus ?? "not_requested",
  }));
}

export function findLocalCompanySignupRequestForScope(companyId: string, businessNo?: string | null) {
  const normalizedBusinessNo = normalizeBusinessNo(businessNo ?? "");

  return readLocalCompanySignupRequests().find((request) => {
    const normalizedRequestNo = normalizeBusinessNo(request.businessRegistrationNumber);

    return (
      request.approvedCompanyId === companyId ||
      companySignupDocumentLinksFor(request).some((document) => document.storagePath.includes(`companies/${companyId}/`)) ||
      (normalizedBusinessNo.length > 0 && normalizedRequestNo === normalizedBusinessNo)
    );
  });
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asDateIso(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && value.trim()) return value;

  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return fallback;
}

function asDocumentLinks(value: unknown): CompanySignupDocumentLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: asString(item.id),
      fileName: asString(item.fileName ?? item.file_name),
      storagePath: asString(item.storagePath ?? item.storage_path),
      downloadUrl: asOptionalString(item.downloadUrl ?? item.download_url),
      documentType: asOptionalString(item.documentType ?? item.document_type),
      documentLabel: asOptionalString(item.documentLabel ?? item.document_label),
      contentType: asOptionalString(item.contentType ?? item.content_type),
      fileSize: typeof item.fileSize === "number" ? item.fileSize : typeof item.file_size === "number" ? item.file_size : undefined,
      gmailStatus: item.gmailStatus === "queued" || item.gmail_status === "queued" ? "queued" : "not_requested",
      a1InboxStatus: item.a1InboxStatus === "queued" || item.a1_inbox_status === "queued" ? "queued" : "not_queued",
    }));
}

export function normalizeCompanySignupRequestSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): CompanySignupRequestPayload {
  const data = snapshot.data();
  const status = asString(data.status, "pending_review") as CompanySignupRequestPayload["status"];
  const uploadStatus = asString(data.documentUploadStatus ?? data.document_upload_status, "") as CompanySignupRequestPayload["documentUploadStatus"];
  const gmailStatus = asString(data.gmailDeliveryStatus ?? data.gmail_delivery_status, "not_requested") as CompanySignupRequestPayload["gmailDeliveryStatus"];

  return {
    id: asString(data.id, snapshot.id),
    companyName: asString(data.companyName ?? data.company_name ?? data.name),
    businessRegistrationNumber: asString(data.businessRegistrationNumber ?? data.business_registration_number),
    representativeName: asString(data.representativeName ?? data.representative_name),
    managerName: asString(data.managerName ?? data.manager_name),
    managerPhone: asString(data.managerPhone ?? data.manager_phone),
    managerEmail: asString(data.managerEmail ?? data.manager_email),
    commerceLicenseNo: asString(data.commerceLicenseNo ?? data.commerce_license_no),
    csPhone: asString(data.csPhone ?? data.cs_phone),
    returnAddress: asString(data.returnAddress ?? data.return_address),
    documentNames: asStringArray(data.documentNames ?? data.document_names),
    documentUploads: asDocumentLinks(data.documentUploads ?? data.document_uploads),
    documentUploadIds: asStringArray(data.documentUploadIds ?? data.document_upload_ids),
    documentStoragePaths: asStringArray(data.documentStoragePaths ?? data.document_storage_paths),
    gmailDeliveryStatus: gmailStatus === "queued" ? "queued" : "not_requested",
    documentUploadStatus: uploadStatus === "uploaded" || uploadStatus === "failed" || uploadStatus === "not_uploaded" ? uploadStatus : undefined,
    documentUploadError: asString(data.documentUploadError ?? data.document_upload_error),
    status: ["pending_review", "infiny_sent", "approved", "on_hold", "rejected"].includes(status) ? status : "pending_review",
    infinyTransferStatus: asString(data.infinyTransferStatus ?? data.infiny_transfer_status, "not_sent") as CompanySignupRequestPayload["infinyTransferStatus"],
    pgMerchantId: asString(data.pgMerchantId ?? data.pg_merchant_id),
    pgModuleKey: asString(data.pgModuleKey ?? data.pg_module_key),
    pgMerchantStatus: asString(data.pgMerchantStatus ?? data.pg_merchant_status, "not_applied") as PgMerchantStatus,
    reviewedAt: asDateIso(data.reviewedAt ?? data.reviewed_at, ""),
    reviewMemo: asString(data.reviewMemo ?? data.review_memo),
    approvedCompanyId: asString(data.approvedCompanyId ?? data.approved_company_id),
    createdAt: asDateIso(data.createdAt ?? data.created_at),
    updatedAt: asDateIso(data.updatedAt ?? data.updated_at),
  };
}

export function subscribeCompanySignupRequests(
  onChange: (requests: CompanySignupRequestPayload[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();

  if (!db) {
    onChange([]);
    return () => {};
  }

  const requestsQuery = query(collection(db, "company_signup_requests"), orderBy("created_at", "desc"), limit(100));

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      onChange(snapshot.docs.map(normalizeCompanySignupRequestSnapshot));
    },
    (error) => {
      onError?.(error);
    },
  );
}

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
      document_uploads: payload.documentUploads ?? [],
      document_upload_ids: payload.documentUploadIds ?? [],
      document_storage_paths: payload.documentStoragePaths ?? [],
      gmail_delivery_status: payload.gmailDeliveryStatus ?? "not_requested",
      document_upload_status: payload.documentUploadStatus ?? (payload.documentUploads?.length ? "uploaded" : "not_uploaded"),
      document_upload_error: payload.documentUploadError ?? "",
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
        signup_document_names: payload.request.documentNames,
        signup_document_uploads: payload.request.documentUploads ?? [],
        signup_document_upload_ids: payload.request.documentUploadIds ?? [],
        signup_document_storage_paths: payload.request.documentStoragePaths ?? [],
        signup_gmail_delivery_status: payload.request.gmailDeliveryStatus ?? "not_requested",
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
