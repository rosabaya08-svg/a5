import type { CompanyOnboardingDocument, CompanyProductEditorState } from "@/types/company";

export const companyOnboardingDocuments: CompanyOnboardingDocument[] = [
  {
    id: "doc-business-license",
    companyId: "company-sanho-care",
    type: "business_license",
    label: "사업자등록증",
    uploadStatus: "pending_upload",
    storageBlocked: true,
  },
  {
    id: "doc-bankbook",
    companyId: "company-sanho-care",
    type: "bankbook_copy",
    label: "입금 통장 사본",
    uploadStatus: "pending_upload",
    storageBlocked: true,
  },
  {
    id: "doc-cs-policy",
    companyId: "company-sanho-care",
    type: "cs_policy",
    label: "CS 연락처/주소/AS 정책",
    uploadStatus: "review_needed",
    storageBlocked: false,
  },
];

export const companyProductEditorStates: CompanyProductEditorState[] = [
  {
    productId: "product-care-kit",
    companyId: "company-sanho-care",
    editorStatus: "preview_ready",
    mobilePreviewReady: true,
    tabletPreviewReady: true,
    complianceChecklist: ["반품 안내", "파손 책임", "AS 연락처", "배송/현장수령"],
  },
];
