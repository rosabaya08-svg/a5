import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb, getAdminStorage } from "../firebaseAdmin";
import { A5_COMPANY_SOURCE_SITE, a5MemberDocumentFields } from "../identity/source";
import { persistMemberHubSyncStatusInA5, syncA5CompanyMemberToHub } from "../memberHub/sync";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { consumeCompanyEmailVerification } from "./accountSecurity";
import { hashCompanyPassword } from "./companyPassword";

type SignupDocumentLink = {
  id?: unknown;
  fileName?: unknown;
  storagePath?: unknown;
  downloadUrl?: unknown;
  documentType?: unknown;
  documentLabel?: unknown;
  contentType?: unknown;
  fileSize?: unknown;
  gmailStatus?: unknown;
  a1InboxStatus?: unknown;
};

type CompanySignupSubmitRequest = {
  request?: Record<string, unknown>;
  companyId?: string;
  loginPassword?: string;
  destinationEmail?: string;
  documentFiles?: SignupDocumentFile[];
  firebaseAuthIdToken?: string;
  emailVerification?: {
    verificationId?: string;
    verificationToken?: string;
    email?: string;
  };
};

type SignupDocumentFile = {
  fileName?: unknown;
  contentType?: unknown;
  base64?: unknown;
  documentType?: unknown;
  documentLabel?: unknown;
};

const defaultDocumentRecipient = "withcadmin@gmail.com";

export async function companySignupSubmitHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<CompanySignupSubmitRequest>(request);
  const signup = body.request && typeof body.request === "object" ? body.request : {};
  const requestId = text(signup.id);
  const businessNo = text(signup.businessRegistrationNumber);
  const normalizedBusinessNo = normalizeBusinessNo(businessNo);
  const companyId = text(body.companyId) || text(signup.approvedCompanyId) || `company-${normalizedBusinessNo || requestId}`;
  const loginPassword = text(body.loginPassword);

  if (!requestId || !companyId || !businessNo || !loginPassword) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "COMPANY_SIGNUP_SUBMIT_INVALID",
        message: "requestId, companyId, business number, and login password are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const emailVerification = await verifySignupEmail({
    firebaseAuthIdToken: body.firebaseAuthIdToken,
    verificationId: body.emailVerification?.verificationId,
    verificationToken: body.emailVerification?.verificationToken,
    email: text(body.emailVerification?.email) || text(signup.managerEmail),
    purpose: "signup",
    businessNo,
  });

  if (!emailVerification.ok) {
    sendJson(response, 403, {
      ok: false,
      error: {
        code: emailVerification.code,
        message: emailVerification.message,
        httpStatus: 403,
      },
    });
    return;
  }

  const recipient = text(body.destinationEmail) || defaultDocumentRecipient;
  const uploadedDocuments = await uploadSignupDocumentFiles(companyId, body.documentFiles);
  const documents = [...documentLinks(signup.documentUploads), ...uploadedDocuments];
  const db = getAdminDb();
  const nowIso = new Date().toISOString();
  const batch = db.batch();
  const requestRef = db.collection("company_signup_requests").doc(requestId);
  const companyRef = db.collection("companies").doc(companyId);

  batch.set(requestRef, buildSignupRequestDocument(signup, requestId, companyId, recipient, documents, nowIso), { merge: true });
  batch.set(companyRef, buildCompanyDocument(signup, requestId, companyId, loginPassword, documents), { merge: true });

  for (const document of documents) {
    const record = buildDocumentRecord(document, companyId, signup, recipient);
    batch.set(db.collection("company_documents").doc(document.id), record, { merge: true });

    if (document.a1InboxStatus === "queued" || document.gmailStatus === "queued") {
      batch.set(
        db.collection("a1_company_document_inbox").doc(document.id),
        {
          ...record,
          inbox_status: "new",
          received_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (document.gmailStatus === "queued") {
      batch.set(
        db.collection("gmail_delivery_queue").doc(document.id),
        {
          ...record,
          delivery_status: "queued",
          queued_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  await batch.commit();
  const memberHubSync = await syncA5CompanyMemberToHub({
    companyId,
    businessNo,
    companyName: text(signup.companyName) || companyId,
    managerEmail: text(signup.managerEmail),
    managerName: text(signup.managerName),
    managerPhone: text(signup.managerPhone),
    status: "pending_review",
    approvalStatus: "registered",
    sourceRequestId: requestId,
  });
  await persistMemberHubSyncStatusInA5({ companyId, requestId, result: memberHubSync });

  sendJson(response, 200, {
    ok: true,
    requestId,
    companyId,
    documentCount: documents.length,
    gmailRecipient: recipient,
    memberHubSync,
    message: "Company signup request submitted.",
  });
}

async function verifySignupEmail(input: {
  firebaseAuthIdToken?: string;
  verificationId?: string;
  verificationToken?: string;
  email?: string;
  purpose: "signup";
  businessNo: string;
}) {
  const firebaseAuthIdToken = text(input.firebaseAuthIdToken);
  const expectedEmail = text(input.email).toLowerCase();

  if (firebaseAuthIdToken) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(firebaseAuthIdToken, true);
      const decodedEmail = text(decoded.email).toLowerCase();

      if (!decodedEmail || decodedEmail !== expectedEmail || decoded.email_verified !== true) {
        return {
          ok: false as const,
          code: "FIREBASE_EMAIL_VERIFICATION_INVALID",
          message: "Firebase email verification is invalid or incomplete.",
        };
      }

      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        code: "FIREBASE_EMAIL_VERIFICATION_TOKEN_INVALID",
        message: "Firebase email verification token is invalid.",
      };
    }
  }

  return consumeCompanyEmailVerification({
    verificationId: input.verificationId,
    verificationToken: input.verificationToken,
    email: input.email,
    purpose: input.purpose,
    businessNo: input.businessNo,
  });
}

function buildSignupRequestDocument(
  signup: Record<string, unknown>,
  requestId: string,
  companyId: string,
  recipient: string,
  documents: NormalizedSignupDocument[],
  nowIso: string,
) {
  const documentNames = documents.length ? documents.map((document) => document.fileName) : stringArray(signup.documentNames);

  return {
    ...signup,
    ...a5MemberDocumentFields({ sourceSite: A5_COMPANY_SOURCE_SITE, memberType: "company", created: true }),
    id: requestId,
    approved_company_id: companyId,
    approvedCompanyId: companyId,
    business_registration_number: text(signup.businessRegistrationNumber),
    representative_name: text(signup.representativeName),
    representative_birth_date: text(signup.representativeBirthDate),
    representative_nationality: text(signup.representativeNationality),
    representative_gender: text(signup.representativeGender),
    manager_name: text(signup.managerName),
    manager_phone: text(signup.managerPhone),
    manager_email: text(signup.managerEmail),
    commerce_license_no: text(signup.commerceLicenseNo),
    cs_phone: text(signup.csPhone),
    return_address: text(signup.returnAddress),
    document_names: documentNames,
    document_uploads: documents.map((document) => ({
      id: document.id,
      fileName: document.fileName,
      storagePath: document.storagePath,
      downloadUrl: document.downloadUrl,
      documentType: document.documentType,
      documentLabel: document.documentLabel,
      contentType: document.contentType,
      fileSize: document.fileSize,
      gmailStatus: document.gmailStatus,
      a1InboxStatus: document.a1InboxStatus,
    })),
    document_upload_ids: documents.map((document) => document.id),
    document_storage_paths: documents.map((document) => document.storagePath),
    gmail_delivery_status: documents.some((document) => document.gmailStatus === "queued") ? "queued" : "not_requested",
    document_upload_status: documents.length ? "uploaded" : "not_uploaded",
    document_gmail_recipient: recipient,
    manager_email_verified: true,
    manager_email_verified_at: FieldValue.serverTimestamp(),
    account_status: "active",
    product_registration_status: "pending_review",
    product_registration_enabled: false,
    status: "pending_review",
    guest_write_enabled: true,
    source: "cms_beta",
    source_app: "company",
    source_channel: "company_signup_request",
    createdAt: text(signup.createdAt) || nowIso,
    updatedAt: nowIso,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildCompanyDocument(
  signup: Record<string, unknown>,
  requestId: string,
  companyId: string,
  loginPassword: string,
  documents: NormalizedSignupDocument[],
) {
  const businessNo = text(signup.businessRegistrationNumber);

  return {
    ...a5MemberDocumentFields({ sourceSite: A5_COMPANY_SOURCE_SITE, memberType: "company", created: true }),
    company_id: companyId,
    companyId,
    name: text(signup.companyName) || companyId,
    business_registration_number: businessNo,
    business_registration_number_normalized: normalizeBusinessNo(businessNo),
    representative_name: text(signup.representativeName),
    representative_birth_date: text(signup.representativeBirthDate),
    representative_nationality: text(signup.representativeNationality),
    representative_gender: text(signup.representativeGender),
    manager_name: text(signup.managerName),
    manager_phone: text(signup.managerPhone),
    manager_email: text(signup.managerEmail),
    commerce_license_no: text(signup.commerceLicenseNo),
    cs_phone: text(signup.csPhone),
    return_address: text(signup.returnAddress),
    signup_request_id: requestId,
    signup_document_names: documents.map((document) => document.fileName),
    signup_document_uploads: documents,
    signup_document_upload_ids: documents.map((document) => document.id),
    signup_document_storage_paths: documents.map((document) => document.storagePath),
    signup_gmail_delivery_status: documents.some((document) => document.gmailStatus === "queued") ? "queued" : "not_requested",
    signup_document_upload_status: documents.length ? "uploaded" : "not_uploaded",
    company_login_password_hash: hashCompanyPassword(loginPassword),
    company_login_password: FieldValue.delete(),
    manager_email_verified: true,
    manager_email_verified_at: FieldValue.serverTimestamp(),
    password_updated_at: FieldValue.serverTimestamp(),
    account_status: "active",
    approval_status: "registered",
    status: "registered",
    product_registration_status: "pending_review",
    product_registration_enabled: false,
    pg_provider: "payup",
    pg_merchant_status: "not_applied",
    guest_write_enabled: true,
    demo_read_enabled: false,
    source: "cms_beta",
    source_app: "company",
    source_channel: "company_signup_request",
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildDocumentRecord(
  document: NormalizedSignupDocument,
  companyId: string,
  signup: Record<string, unknown>,
  recipient: string,
) {
  return {
    ...a5MemberDocumentFields({ sourceSite: A5_COMPANY_SOURCE_SITE, memberType: "company", created: true }),
    id: document.id,
    company_id: companyId,
    companyId,
    company_name: text(signup.companyName) || companyId,
    document_type: document.documentType,
    document_label: document.documentLabel,
    product_id: null,
    product_name: null,
    file_name: document.fileName,
    file_size: document.fileSize,
    content_type: document.contentType,
    storage_path: document.storagePath,
    download_url: document.downloadUrl,
    status: "uploaded",
    review_status: "pending_review",
    a1_inbox_status: document.a1InboxStatus,
    gmail_status: document.gmailStatus,
    gmail_recipient: recipient,
    source: "cms_beta",
    source_app: "company",
    source_channel: "company_admin_file_upload",
    guest_write_enabled: true,
    demo_read_enabled: false,
    uploaded_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function uploadSignupDocumentFiles(companyId: string, value: unknown): Promise<NormalizedSignupDocument[]> {
  if (!Array.isArray(value) || value.length === 0) return [];

  const bucket = getAdminStorage().bucket();
  const uploads: NormalizedSignupDocument[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const file = item as SignupDocumentFile;
    const fileName = text(file.fileName) || "company-document";
    const contentType = text(file.contentType) || "application/octet-stream";
    const base64 = text(file.base64);
    const documentType = text(file.documentType) || "onboarding_document";
    const documentLabel = text(file.documentLabel) || documentType;

    if (!base64) continue;

    const buffer = Buffer.from(base64, "base64");
    const uploadId = makeUploadId(companyId, documentType);
    const storagePath = storagePathFor(companyId, documentType, uploadId, fileName);
    const storageFile = bucket.file(storagePath);

    await storageFile.save(buffer, {
      contentType,
      metadata: {
        metadata: {
          companyId,
          documentType,
          documentLabel,
          sourceProject: "a5-closed-mall",
          sourceSite: A5_COMPANY_SOURCE_SITE,
          memberType: "company",
          source: "company-signup-submit",
        },
      },
    });

    uploads.push({
      id: uploadId,
      fileName,
      storagePath,
      downloadUrl: `gs://${bucket.name}/${storagePath}`,
      documentType,
      documentLabel,
      contentType,
      fileSize: buffer.length,
      gmailStatus: "queued",
      a1InboxStatus: "queued",
    });
  }

  return uploads;
}

type NormalizedSignupDocument = {
  id: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  documentType: string;
  documentLabel: string;
  contentType: string;
  fileSize: number;
  gmailStatus: "not_requested" | "queued";
  a1InboxStatus: "not_queued" | "queued";
};

function documentLinks(value: unknown): NormalizedSignupDocument[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is SignupDocumentLink => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: text(item.id),
      fileName: text(item.fileName),
      storagePath: text(item.storagePath),
      downloadUrl: text(item.downloadUrl),
      documentType: text(item.documentType),
      documentLabel: text(item.documentLabel),
      contentType: text(item.contentType) || "application/octet-stream",
      fileSize: numberValue(item.fileSize),
      gmailStatus: item.gmailStatus === "queued" ? ("queued" as const) : ("not_requested" as const),
      a1InboxStatus: item.a1InboxStatus === "queued" ? ("queued" as const) : ("not_queued" as const),
    }))
    .filter((item) => item.id && item.storagePath && item.fileName);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeBusinessNo(value: string) {
  return value.replace(/\D/g, "");
}

function safeFileName(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "company-document";
}

function makeUploadId(companyId: string, documentType: string) {
  const safeCompanyId = companyId.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const safeDocumentType = documentType.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return `company-doc-${safeCompanyId}-${safeDocumentType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function storagePathFor(companyId: string, documentType: string, uploadId: string, fileName: string) {
  const storedFileName = `${uploadId}-${safeFileName(fileName)}`;

  if (documentType === "bankbook_copy") {
    return `companies/${companyId}/bank-documents/${documentType}/${storedFileName}`;
  }

  return `companies/${companyId}/onboarding/${documentType}/${storedFileName}`;
}
