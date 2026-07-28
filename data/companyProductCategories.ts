export type CompanyProductCategory = {
  id: string;
  code: string;
  label: string;
  description: string;
  reviewLevel: string;
  defaultFulfillment: string;
  shelf: string;
  subcategories: string[];
  examples: string[];
  requiredFields: string[];
  complianceChecks: string[];
  approvalNotes: string[];
  channelTags: string[];
  optionPresets: string[];
  noticeTemplate: string;
  kcPolicy: "none" | "conditional" | "required";
};

const commonRequiredFields = ["\uC0C1\uD488\uBA85", "\uB300\uD45C \uC774\uBBF8\uC9C0", "\uD310\uB9E4\uAC00", "\uC7AC\uACE0", "\uBC30\uC1A1/\uD604\uC7A5\uC218\uB839"];
const commonComplianceChecks = ["\uAE08\uC9C0\uC0C1\uD488 \uC5EC\uBD80", "\uAC00\uACA9 \uD560\uC778 \uD45C\uC2DC", "\uBC30\uC1A1/\uBC18\uD488 \uC548\uB0B4"];
const commonApprovalNotes = ["\uC0C1\uD488 \uB4F1\uB85D \uC2DC \uC120\uD0DD\uD55C \uCE74\uD14C\uACE0\uB9AC\uB85C \uD3D0\uC1C4\uBAB0\uACFC \uBAA8\uBC14\uC77C \uC0C1\uD488 \uBAA9\uB85D\uC5D0 \uB178\uCD9C\uD569\uB2C8\uB2E4."];
const commonOptionPresets = ["\uC0C9\uC0C1", "\uD568\uB7C9", "\uAD6C\uC131", "\uC218\uB7C9"];

export const companyProductCategories: CompanyProductCategory[] = [
  {
    id: "baby-goods",
    code: "A5-CAT-BABY-GOODS",
    label: "\uC720\uC544\uC6A9\uD488",
    description: "\uC720\uC544 \uCE5C\uAD6C, \uC218\uC720\uC6A9\uD488, \uBAA9\uC695\uC6A9\uD488, \uC7A5\uB09C\uAC10, \uC544\uAE30 \uBCF4\uC870\uC6A9\uD488\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.",
    reviewLevel: "\uAE30\uBCF8 \uAC80\uC218",
    defaultFulfillment: "\uD604\uC7A5\uC218\uB839+\uBC30\uC1A1",
    shelf: "\uC720\uC544\uC6A9\uD488",
    subcategories: ["\uC720\uC544\uC6A9\uD488"],
    examples: ["\uC218\uC720\uCFE0\uC158", "\uC544\uAE30 \uC774\uC694", "\uAE30\uC800\uADC0 \uAC00\uBC29"],
    requiredFields: commonRequiredFields,
    complianceChecks: commonComplianceChecks,
    approvalNotes: commonApprovalNotes,
    channelTags: ["\uC720\uC544\uC6A9\uD488", "\uC544\uAE30", "\uD604\uC7A5\uC218\uB839"],
    optionPresets: commonOptionPresets,
    noticeTemplate: "\uC720\uC544\uC6A9\uD488",
    kcPolicy: "conditional",
  },
  {
    id: "electronics",
    code: "A5-CAT-ELECTRONICS",
    label: "\uC804\uC790\uC81C\uD488",
    description: "\uC18C\uD615 \uAC00\uC804, \uC0DD\uD65C \uC804\uC790\uC81C\uD488, \uCDA9\uC804\uC2DD \uC81C\uD488\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.",
    reviewLevel: "\uAE30\uBCF8 \uAC80\uC218",
    defaultFulfillment: "\uD604\uC7A5\uC218\uB839+\uBC30\uC1A1",
    shelf: "\uC804\uC790\uC81C\uD488",
    subcategories: ["\uC804\uC790\uC81C\uD488"],
    examples: ["\uC18C\uB3C5\uAE30", "\uACF5\uAE30\uAD00\uB9AC \uAE30\uAE30", "\uB9C8\uC0AC\uC9C0\uAE30"],
    requiredFields: commonRequiredFields,
    complianceChecks: commonComplianceChecks,
    approvalNotes: commonApprovalNotes,
    channelTags: ["\uC804\uC790\uC81C\uD488", "\uC0DD\uD65C\uAC00\uC804", "\uBC30\uC1A1"],
    optionPresets: ["\uBAA8\uB378", "\uC0C9\uC0C1", "\uAD6C\uC131", "\uC218\uB7C9"],
    noticeTemplate: "\uC804\uC790\uC81C\uD488",
    kcPolicy: "conditional",
  },
  {
    id: "baby-cosmetics",
    code: "A5-CAT-BABY-COSMETICS",
    label: "\uC720\uC544\uD654\uC7A5\uD488",
    description: "\uC720\uC544 \uB85C\uC158, \uD06C\uB9BC, \uC2A4\uD0A8\uCF00\uC5B4 \uC0C1\uD488\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.",
    reviewLevel: "\uAE30\uBCF8 \uAC80\uC218",
    defaultFulfillment: "\uD604\uC7A5\uC218\uB839+\uBC30\uC1A1",
    shelf: "\uC720\uC544\uD654\uC7A5\uD488",
    subcategories: ["\uC720\uC544\uD654\uC7A5\uD488"],
    examples: ["\uBCA0\uC774\uBE44 \uB85C\uC158", "\uBCA0\uC774\uBE44 \uD06C\uB9BC", "\uC720\uC544 \uC0F4\uD478"],
    requiredFields: commonRequiredFields,
    complianceChecks: commonComplianceChecks,
    approvalNotes: commonApprovalNotes,
    channelTags: ["\uC720\uC544\uD654\uC7A5\uD488", "\uC2A4\uD0A8\uCF00\uC5B4", "\uBC30\uC1A1"],
    optionPresets: ["\uD568\uB7C9", "\uAD6C\uC131", "\uD5A5", "\uC218\uB7C9"],
    noticeTemplate: "\uD654\uC7A5\uD488",
    kcPolicy: "none",
  },
  {
    id: "women-cosmetics",
    code: "A5-CAT-WOMEN-COSMETICS",
    label: "\uC5EC\uC131\uD654\uC7A5\uD488",
    description: "\uC5EC\uC131 \uC2A4\uD0A8\uCF00\uC5B4, \uBC14\uB514\uCF00\uC5B4, \uD5E4\uC5B4\uCF00\uC5B4, \uBDF0\uD2F0 \uC0C1\uD488\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.",
    reviewLevel: "\uAE30\uBCF8 \uAC80\uC218",
    defaultFulfillment: "\uD604\uC7A5\uC218\uB839+\uBC30\uC1A1",
    shelf: "\uC5EC\uC131\uD654\uC7A5\uD488",
    subcategories: ["\uC5EC\uC131\uD654\uC7A5\uD488"],
    examples: ["\uBC14\uB514\uD06C\uB9BC", "\uC2A4\uD0A8\uCF00\uC5B4 \uC138\uD2B8", "\uD5E4\uC5B4\uCF00\uC5B4 \uC81C\uD488"],
    requiredFields: commonRequiredFields,
    complianceChecks: commonComplianceChecks,
    approvalNotes: commonApprovalNotes,
    channelTags: ["\uC5EC\uC131\uD654\uC7A5\uD488", "\uBDF0\uD2F0", "\uBC30\uC1A1"],
    optionPresets: ["\uD568\uB7C9", "\uAD6C\uC131", "\uD5A5", "\uC218\uB7C9"],
    noticeTemplate: "\uD654\uC7A5\uD488",
    kcPolicy: "none",
  },
  {
    id: "women-goods",
    code: "A5-CAT-WOMEN-GOODS",
    label: "\uC5EC\uC131\uC6A9\uD488",
    description: "\uCD9C\uC0B0 \uC804\uD6C4 \uC5EC\uC131\uC6A9\uD488, \uC0DD\uD65C\uC6A9\uD488, \uAC1C\uC778 \uAD00\uB9AC\uC6A9\uD488\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.",
    reviewLevel: "\uAE30\uBCF8 \uAC80\uC218",
    defaultFulfillment: "\uD604\uC7A5\uC218\uB839+\uBC30\uC1A1",
    shelf: "\uC5EC\uC131\uC6A9\uD488",
    subcategories: ["\uC5EC\uC131\uC6A9\uD488"],
    examples: ["\uC218\uC720\uBCF5", "\uAC1C\uC778 \uAD00\uB9AC\uC6A9\uD488", "\uC5EC\uC131 \uC0DD\uD65C\uC6A9\uD488"],
    requiredFields: commonRequiredFields,
    complianceChecks: commonComplianceChecks,
    approvalNotes: commonApprovalNotes,
    channelTags: ["\uC5EC\uC131\uC6A9\uD488", "\uC0DD\uD65C\uC6A9\uD488", "\uD604\uC7A5\uC218\uB839"],
    optionPresets: ["\uC0C9\uC0C1", "\uC0AC\uC774\uC988", "\uAD6C\uC131", "\uC218\uB7C9"],
    noticeTemplate: "\uC0DD\uD65C\uC6A9\uD488",
    kcPolicy: "conditional",
  },
  {
    id: "health-food",
    code: "A5-CAT-HEALTH-FOOD",
    label: "\uAC74\uAC15\uC2DD\uD488",
    description: "\uAC74\uAC15\uC2DD\uD488, \uC601\uC591 \uAC04\uC2DD, \uCC28, \uC74C\uB8CC \uC0C1\uD488\uC744 \uB4F1\uB85D\uD569\uB2C8\uB2E4.",
    reviewLevel: "\uAE30\uBCF8 \uAC80\uC218",
    defaultFulfillment: "\uD604\uC7A5\uC218\uB839+\uBC30\uC1A1",
    shelf: "\uAC74\uAC15\uC2DD\uD488",
    subcategories: ["\uAC74\uAC15\uC2DD\uD488"],
    examples: ["\uAC74\uAC15\uCC28", "\uC601\uC591 \uAC04\uC2DD", "\uAC74\uAC15\uC2DD\uD488 \uC138\uD2B8"],
    requiredFields: commonRequiredFields,
    complianceChecks: commonComplianceChecks,
    approvalNotes: commonApprovalNotes,
    channelTags: ["\uAC74\uAC15\uC2DD\uD488", "\uAC04\uC2DD", "\uBC30\uC1A1"],
    optionPresets: ["\uB9DB", "\uAD6C\uC131", "\uD568\uB7C9", "\uC218\uB7C9"],
    noticeTemplate: "\uC2DD\uD488",
    kcPolicy: "none",
  },
];

export const categoryRegistrationFields = [
  "\uCE74\uD14C\uACE0\uB9AC",
  "\uC0C1\uD488\uBA85",
  "\uBE0C\uB79C\uB4DC/\uC81C\uC870\uC0AC",
  "\uC0C1\uC138\uD398\uC774\uC9C0",
  "\uC635\uC158/\uC7AC\uACE0",
  "\uC77C\uBC18 \uD310\uB9E4\uAC00",
  "\uC624\uD508\uBAB0 \uD310\uB9E4\uAC00",
  "\uD3D0\uC1C4\uBAB0 \uD310\uB9E4\uAC00",
  "\uBC30\uC1A1/\uD604\uC7A5\uC218\uB839",
  "\uACE0\uC2DC/\uC99D\uBE59",
  "MID/PG \uC0C1\uD0DC",
  "\uD310\uB9E4 \uC0C1\uD0DC",
];