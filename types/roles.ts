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
  SUPER_ADMIN: "Super admin",
  COMPANY_ADMIN: "Company admin",
  NURSERY_ADMIN: "Nursery admin",
  TABLET_DEVICE: "Tablet device",
  CUSTOMER_GUEST: "Guest customer",
  PAYER_GUEST: "Guest payer",
};

export const roleHomePaths: Record<UserRole, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  COMPANY_ADMIN: "/company/dashboard",
  NURSERY_ADMIN: "/nursery/dashboard",
  TABLET_DEVICE: "/tablet/products",
  CUSTOMER_GUEST: "/orders/guest",
  PAYER_GUEST: "/orders/guest",
};
