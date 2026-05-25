export type CompanyOnboardingStatus = "draft" | "documents_needed" | "review" | "approved_mock" | "blocked";

export type CompanyDocumentType =
  | "business_license"
  | "bankbook_copy"
  | "brand_logo"
  | "cs_policy"
  | "return_policy"
  | "product_detail_image"
  | "product_video";

export type CompanyOnboardingDocument = {
  id: string;
  companyId: string;
  type: CompanyDocumentType;
  label: string;
  uploadStatus: "placeholder" | "pending_upload" | "review_needed" | "approved_mock";
  storageBlocked: boolean;
};

export type CompanyProductEditorState = {
  productId: string;
  companyId: string;
  editorStatus: "draft" | "preview_ready" | "pending_approval" | "rejected";
  mobilePreviewReady: boolean;
  tabletPreviewReady: boolean;
  complianceChecklist: string[];
};
