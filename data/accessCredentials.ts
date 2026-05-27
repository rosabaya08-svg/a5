import type { PortalRole } from "@/lib/auth/session";

export type BetaAccessAccount = {
  id: string;
  role: Extract<PortalRole, "company" | "nursery">;
  businessNo: string;
  displayName: string;
  defaultPassword: string;
  nextPath: string;
};

export const betaAccessAccounts: BetaAccessAccount[] = [
  {
    id: "company-test-1004",
    role: "company",
    businessNo: "1004-1004-1004",
    displayName: "A5 테스트 기업",
    defaultPassword: "1004",
    nextPath: "/company/dashboard",
  },
  {
    id: "nursery-test-1004",
    role: "nursery",
    businessNo: "1004-1004-1004",
    displayName: "A5 테스트 산후조리원",
    defaultPassword: "1004",
    nextPath: "/nursery/dashboard",
  },
];

export const tabletNurseryAccess = {
  nurseryId: "nursery-gangnam-01",
  businessNo: "1004-1004-1004",
  businessName: "A5 테스트 산후조리원",
  defaultPassword: "1004",
  defaultRoomName: "701호",
  defaultRoomId: "room-701",
  defaultTabletId: "tablet-701-a",
};
