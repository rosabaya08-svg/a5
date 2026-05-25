export type AdminContentStatus = "draft" | "pending_approval" | "approved" | "rejected" | "scheduled";

export type AdminContentPlacement =
  | "home_hero"
  | "home_banner"
  | "home_video"
  | "brand_grid"
  | "exhibition"
  | "popup";

export type AdminContentSlot = {
  id: string;
  title: string;
  placement: AdminContentPlacement;
  ownerCompanyId?: string;
  targetNurseryIds: string[];
  targetRoomIds: string[];
  linkUrl: string;
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
