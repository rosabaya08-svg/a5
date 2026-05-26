export type ComplianceRiskLevel = "required" | "warning" | "blocked";

export type LegalComplianceItem = {
  id: string;
  title: string;
  description: string;
  riskLevel: ComplianceRiskLevel;
};

export type SellerDisclosure = {
  companyName: string;
  representativeName: string;
  businessRegistrationNumber: string;
  mailOrderRegistrationNumber: string;
  address: string;
  phone: string;
  email: string;
  csPhone: string;
  returnAddress: string;
};

export type ProductCertification = {
  kcTarget: boolean;
  kcNumber?: string;
  certificationType?: "safety_certification" | "safety_confirmation" | "supplier_conformity" | "not_applicable";
  childrenProduct: boolean;
  electricOrLivingProduct: boolean;
  foodHealthBeautyMedical: boolean;
  evidenceUploadRequired: boolean;
};

export type ProductComplianceState = {
  prohibitedProductConfirmed: boolean;
  legalNoticeCompleted: boolean;
  sellerDisclosureCompleted: boolean;
  certificationCompleted: boolean;
  returnPolicyCompleted: boolean;
  expertReviewRequired: boolean;
};
