export type UserRole =
  | "SUPER_ADMIN"
  | "COMPANY_ADMIN"
  | "NURSERY_ADMIN"
  | "TABLET_DEVICE"
  | "CUSTOMER_GUEST"
  | "PAYER_GUEST";

export type RoleScope = {
  role: UserRole;
  companyId?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
};

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "최고관리자",
  COMPANY_ADMIN: "기업 Admin",
  NURSERY_ADMIN: "산후조리원 Admin",
  TABLET_DEVICE: "태블릿",
  CUSTOMER_GUEST: "비회원 고객",
  PAYER_GUEST: "조르기 결제자",
};

export const roleHomePaths: Record<UserRole, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  COMPANY_ADMIN: "/company/dashboard",
  NURSERY_ADMIN: "/nursery/dashboard",
  TABLET_DEVICE: "/tablet/products",
  CUSTOMER_GUEST: "/orders/guest",
  PAYER_GUEST: "/orders/guest",
};
