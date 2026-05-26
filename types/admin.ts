export type AdminApprovalStatus =
  | "pending_review"
  | "approved_mock"
  | "rejected_mock"
  | "needs_fix"
  | "blocked";

export type AdminContentStatus = "draft" | "pending_approval" | "approved" | "rejected" | "scheduled";

export type AdminContentPlacement =
  | "home_hero"
  | "home_banner"
  | "home_video"
  | "brand_grid"
  | "exhibition"
  | "popup";

export type AdminContentAssetType = "banner" | "video" | "gif" | "brand" | "exhibition" | "popup";

export type AdminContentSlot = {
  id: string;
  title: string;
  placement: AdminContentPlacement;
  assetType: AdminContentAssetType;
  ownerCompanyId?: string;
  targetNurseryIds: string[];
  targetRoomIds: string[];
  linkUrl: string;
  sortOrder: number;
  startAt: string;
  endAt: string;
  status: AdminContentStatus;
  reviewNote: string;
};

export type AdminAccountInvite = {
  id: string;
  email: string;
  role: "COMPANY_ADMIN" | "NURSERY_ADMIN" | "SUPER_ADMIN";
  companyId?: string;
  nurseryId?: string;
  status: "draft" | "invited_mock" | "claim_ready" | "blocked";
  passwordPolicy: "firebase_invite_only";
};

export type CompanyApprovalItem = {
  id: string;
  companyName: string;
  managerName: string;
  businessRegistrationNumber: string;
  mailOrderRegistrationNumber: string;
  submittedAt: string;
  status: AdminApprovalStatus;
  documents: string[];
  riskFlags: string[];
  repositoryPath: string;
};

export type ProductApprovalItem = {
  id: string;
  productName: string;
  companyName: string;
  category: string;
  status: AdminApprovalStatus;
  complianceSummary: {
    sellerDisclosure: boolean;
    productNotice: boolean;
    returnPolicy: boolean;
    kcTarget: boolean;
    kcNumber?: string;
    evidenceUploaded: boolean;
    prohibitedFlags: string[];
  };
  submittedAt: string;
  repositoryPath: string;
};

export type PaymentMonitorItem = {
  id: string;
  orderNo: string;
  paymentIntentId: string;
  provider: "mock" | "pg_ready";
  status: "ready_mock" | "approved_mock" | "failed_mock" | "webhook_pending" | "manual_review";
  amount: number;
  customerMasked: string;
  lastEventAt: string;
  risk: string;
};

export type OrderMonitorItem = {
  id: string;
  orderNo: string;
  qrSessionId: string;
  nurseryId: string;
  companyCount: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  risk: string;
};

export type AdminAuditOperation = {
  id: string;
  actorRole: string;
  actorName: string;
  action: string;
  target: string;
  message: string;
  severity: "info" | "warning" | "blocked";
  createdAt: string;
  repositoryPath: string;
};

export type RepositoryConnectionItem = {
  id: string;
  label: string;
  firestoreCollection: string;
  currentMode: "repository_ready" | "mock_fallback" | "server_write_only" | "blocked";
  writePolicy: "SUPER_ADMIN_required" | "Functions_only" | "read_only" | "blocked";
  note: string;
};
