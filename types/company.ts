export type CompanyOnboardingStatus = "draft" | "documents_needed" | "review" | "approved" | "approved_mock" | "blocked";

export type CompanyDocumentType =
  | "business_license"
  | "bankbook_copy"
  | "commerce_license"
  | "brand_logo"
  | "cs_policy"
  | "manager_contact"
  | "return_policy"
  | "kc_certificate"
  | "test_report"
  | "brand_import_certificate"
  | "product_detail_image"
  | "product_video"
  | "product_detail_asset";

export type CompanyDocumentUploadStatus =
  | "placeholder"
  | "pending_upload"
  | "uploading"
  | "uploaded"
  | "queued_for_a1"
  | "gmail_queued"
  | "sent_to_gmail"
  | "review_needed"
  | "approved"
  | "approved_mock";

export type CompanyOnboardingDocument = {
  id: string;
  companyId: string;
  type: CompanyDocumentType;
  label: string;
  description?: string;
  required?: boolean;
  accept?: string;
  uploadStatus: CompanyDocumentUploadStatus;
  storageBlocked: boolean;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  uploadedAt?: string;
  a1InboxStatus?: "not_queued" | "queued" | "received";
  gmailStatus?: "not_configured" | "queued" | "sent" | "failed";
};

export type CompanyProductEditorState = {
  productId: string;
  companyId: string;
  editorStatus: "draft" | "preview_ready" | "pending_approval" | "rejected";
  mobilePreviewReady: boolean;
  tabletPreviewReady: boolean;
  complianceChecklist: string[];
};
