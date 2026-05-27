import { CompanyDocumentUploadPanel, type CompanyDocumentUploadSlot } from "@/components/company/CompanyDocumentUploadPanel";

const evidenceSlots: CompanyDocumentUploadSlot[] = [
  {
    id: "kc-certificate",
    type: "kc_certificate",
    label: "KC 인증서",
    description: "유아용품, 전자제품 등 KC 대상 상품의 인증서 PDF 또는 이미지",
    required: false,
    accept: "image/*,.pdf",
  },
  {
    id: "test-report",
    type: "test_report",
    label: "시험성적서",
    description: "안전확인, 공급자적합성, 소재/성분 검증 자료",
    required: false,
    accept: "image/*,.pdf,.doc,.docx",
  },
  {
    id: "brand-import",
    type: "brand_import_certificate",
    label: "상표/수입 증빙",
    description: "상표 사용권, 수입신고필증, 정품 공급 계약 증빙",
    required: false,
    accept: "image/*,.pdf,.doc,.docx",
  },
  {
    id: "product-detail-asset",
    type: "product_detail_asset",
    label: "상세페이지 원본",
    description: "상세 이미지, GIF, 영상 원본을 A1 검수함으로 전달",
    required: false,
    accept: "image/*,video/*,.pdf",
  },
];

type CertificationEvidenceUploaderProps = {
  companyId?: string;
  companyName?: string;
  productId?: string;
  productName?: string;
};

export function CertificationEvidenceUploader({
  companyId = "company-sanho-care",
  companyName = "산호케어",
  productId,
  productName,
}: CertificationEvidenceUploaderProps) {
  return (
    <CompanyDocumentUploadPanel
      companyId={companyId}
      companyName={companyName}
      productId={productId}
      productName={productName}
      title="인증/증빙 파일 업로드"
      description="제품 인증서, 시험성적서, 상세페이지 원본 등 상품 자료는 실제 Firebase Storage에 저장하고 Firestore 파일 기록으로만 관리합니다."
      documents={evidenceSlots}
      deliveryMode="firebase_only"
    />
  );
}
