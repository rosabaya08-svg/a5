import type { PortalRole } from "@/lib/auth/session";

export type BetaAccessAccount = {
  id: string;
  role: Extract<PortalRole, "company" | "nursery">;
  loginId?: string;
  businessNo: string;
  displayName: string;
  defaultPassword: string;
  nextPath: string;
};

export const betaAccessAccounts: BetaAccessAccount[] = [
  {
    id: "company-test-1004",
    role: "company",
    loginId: "7592901311",
    businessNo: "7592901311",
    displayName: "7592901311 테스트 관리자",
    defaultPassword: "1004",
    nextPath: "/company/dashboard",
  },
  {
    id: "nursery-test-1004",
    role: "nursery",
    loginId: "1004",
    businessNo: "7592901311",
    displayName: "A5 테스트 산후조리원",
    defaultPassword: "1004",
    nextPath: "/nursery/dashboard",
  },
];

export const tabletNurseryAccess = {
  nurseryId: "nursery-test-1004",
  businessNo: "7592901311",
  businessName: "A5 테스트 산후조리원",
  defaultPassword: "1004",
  defaultRoomName: "701호",
  defaultRoomId: "room-701",
  defaultTabletId: "tablet-701-a",
};
