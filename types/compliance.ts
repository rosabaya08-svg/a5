export type ComplianceRiskLevel = "required" | "warning" | "blocked";

export type ComplianceField = {
  id: string;
  label: string;
  required: boolean;
  helper: string;
};

export type LegalComplianceItem = {
  id: string;
  title: string;
  description: string;
  riskLevel: ComplianceRiskLevel;
  lawReviewRequired: boolean;
};

export type CertificationType =
  | "safety_certification"
  | "safety_confirmation"
  | "supplier_conformity"
  | "not_applicable";

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

export type ProductNotice = {
  productName: string;
  modelName: string;
  manufacturerOrImporter: string;
  originCountry: string;
  manufacturedAtOrExpiration: string;
  warrantyStandard: string;
  asOwnerAndContact: string;
};

export type ReturnPolicyNotice = {
  shippingFee: string;
  remoteAreaFee: string;
  dispatchSchedule: string;
  exchangeReturnPeriod: string;
  exchangeReturnRestriction: string;
  damageMisdeliveryStandard: string;
  refundStandard: string;
};

export type ProductCertification = {
  kcTarget: boolean;
  kcNumber?: string;
  certificationType: CertificationType;
  childrenProduct: boolean;
  electricOrLivingProduct: boolean;
  foodHealthBeautyMedical: boolean;
  evidenceUploadRequired: boolean;
  evidenceUploaded: boolean;
};

export type ProductComplianceState = {
  prohibitedProductConfirmed: boolean;
  selectedRestrictedItemIds: string[];
  sellerDisclosureCompleted: boolean;
  productNoticeCompleted: boolean;
  returnPolicyCompleted: boolean;
  certification: ProductCertification;
  expertReviewRequired: boolean;
};

export type ComplianceGateResult = {
  approvalRequestEnabled: boolean;
  blockers: string[];
  warnings: string[];
};
