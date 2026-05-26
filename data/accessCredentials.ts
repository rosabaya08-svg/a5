export type BetaAccessAccount = {
  id: string;
  role: "company" | "nursery";
  businessNo: string;
  displayName: string;
  defaultPassword: string;
  nextPath: string;
};

export const betaAccessAccounts: BetaAccessAccount[] = [
  {
    id: "company-sanho-care",
    role: "company",
    businessNo: "123-45-67890",
    displayName: "산호케어",
    defaultPassword: "1004",
    nextPath: "/company/dashboard",
  },
  {
    id: "nursery-gangnam-01",
    role: "nursery",
    businessNo: "987-65-43210",
    displayName: "라온 산후조리원 강남",
    defaultPassword: "1004",
    nextPath: "/nursery/dashboard",
  },
];

export const tabletNurseryAccess = {
  nurseryId: "nursery-gangnam-01",
  businessNo: "987-65-43210",
  businessName: "라온 산후조리원 강남",
  defaultPassword: "1004",
  defaultRoomName: "701호",
};
