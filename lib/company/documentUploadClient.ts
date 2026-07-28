"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { ensureAnonymousFirebaseUser, getFirebaseDb } from "@/lib/firebase/client";
import { createCmsId, uploadCmsFile } from "@/lib/firebase/contentRepository";
import type { CompanyDocumentType } from "@/types/company";

const COMPANY_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
export const COMPANY_DOCUMENT_GMAIL_RECIPIENT = "withcadmin@gmail.com";

type UploadCompanyDocumentInput = {
  companyId: string;
  companyName?: string;
  documentType: CompanyDocumentType;
  documentLabel: string;
  file: File;
  productId?: string;
  productName?: string;
  destinationEmail?: string;
  sendToGmail?: boolean;
  createA1Inbox?: boolean;
  persistRecord?: boolean;
};

export type UploadedCompanyDocument = {
  id: string;
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  a1InboxStatus: "not_queued" | "queued";
  gmailStatus: "not_requested" | "queued";
};

function assertSupportedFile(file: File) {
  if (file.size <= 0) {
    throw new Error("빈 파일은 업로드할 수 없습니다.");
  }

  if (file.size > COMPANY_DOCUMENT_MAX_BYTES) {
    throw new Error("기업 서류는 파일당 15MB 이하로 업로드해 주세요.");
  }

  const contentType = file.type || "application/octet-stream";
  const allowed =
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType === "application/pdf" ||
    contentType === "application/msword" ||
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    contentType === "application/vnd.ms-excel" ||
    contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    contentType === "image/svg+xml";

  if (!allowed) {
    throw new Error("이미지, PDF, Word, Excel, 영상 파일만 업로드할 수 있습니다.");
  }
}

function documentRecord(input: UploadCompanyDocumentInput, upload: UploadedCompanyDocument) {
  const recipient = input.destinationEmail?.trim() || COMPANY_DOCUMENT_GMAIL_RECIPIENT;

  return {
    id: upload.id,
    company_id: input.companyId,
    company_name: input.companyName ?? input.companyId,
    document_type: input.documentType,
    document_label: input.documentLabel,
    product_id: input.productId ?? null,
    product_name: input.productName ?? null,
    file_name: upload.fileName,
    file_size: upload.fileSize,
    content_type: upload.contentType,
    storage_path: upload.storagePath,
    download_url: upload.downloadUrl,
    status: "uploaded",
    review_status: "pending_review",
    a1_inbox_status: upload.a1InboxStatus,
    gmail_status: upload.gmailStatus,
    gmail_recipient: recipient,
    source: "cms_beta",
    source_app: "company",
    source_channel: "company_admin_file_upload",
    guest_write_enabled: true,
    demo_read_enabled: false,
    uploaded_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

export async function uploadCompanyDocument(input: UploadCompanyDocumentInput): Promise<UploadedCompanyDocument> {
  assertSupportedFile(input.file);
  try {
    const companyUser = await ensureCompanyFirebaseAuthFromSession();
    if (!companyUser) {
      await ensureAnonymousFirebaseUser();
    }
  } catch {
    // Company signup happens before an account exists. Storage rules allow this guarded
    // onboarding upload, so Firebase anonymous auth must not block the whole request.
  }

  const shouldPersistRecord = input.persistRecord ?? true;
  const db = shouldPersistRecord ? getFirebaseDb() : null;

  if (shouldPersistRecord && !db) {
    throw new Error("Firebase Storage 또는 Firestore 설정이 없습니다.");
  }

  const uploadId = createCmsId(`company-doc-${input.companyId}-${input.documentType}`);
  const contentType = input.file.type || "application/octet-stream";
  const uploaded = await uploadCmsFile(
    "company_documents",
    uploadId,
    input.file,
    {
      companyId: input.companyId,
      productId: input.productId,
    },
    {
      companyId: input.companyId,
      documentType: input.documentType,
      documentLabel: input.documentLabel,
      productId: input.productId ?? "",
      source: "company-admin-upload",
      a1Inbox: (input.createA1Inbox ?? input.sendToGmail ?? false) ? "queued" : "not_queued",
      gmailDelivery: input.sendToGmail ? "queued" : "not_requested",
    },
  );

  const shouldCreateA1Inbox = input.createA1Inbox ?? input.sendToGmail ?? false;
  const shouldSendToGmail = input.sendToGmail ?? false;
  const upload: UploadedCompanyDocument = {
    id: uploadId,
    storagePath: uploaded.path,
    downloadUrl: uploaded.url,
    fileName: input.file.name,
    fileSize: input.file.size,
    contentType,
    a1InboxStatus: shouldCreateA1Inbox ? "queued" : "not_queued",
    gmailStatus: shouldSendToGmail ? "queued" : "not_requested",
  };
  const record = documentRecord(input, upload);

  if (!shouldPersistRecord) {
    return upload;
  }

  if (!db) {
    throw new Error("Firestore config is missing.");
  }

  const writes = [setDoc(doc(db, "company_documents", upload.id), record, { merge: true })];

  if (shouldCreateA1Inbox) {
    writes.push(
      setDoc(
      doc(db, "a1_company_document_inbox", upload.id),
      {
        ...record,
        inbox_status: "new",
        received_at: serverTimestamp(),
      },
      { merge: true },
      ),
    );
  }

  if (shouldSendToGmail) {
    writes.push(
      setDoc(
      doc(db, "gmail_delivery_queue", upload.id),
      {
        ...record,
        delivery_status: "queued",
        queued_at: serverTimestamp(),
      },
      { merge: true },
      ),
    );
  }

  await Promise.all(writes);

  return upload;
}
