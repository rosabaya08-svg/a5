export type A5AuthRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "NURSERY_ADMIN" | "TABLET_DEVICE" | "CUSTOMER_GUEST" | "seed_admin";

export type A5AuthClaims = {
  role: A5AuthRole;
  company_id?: string;
  nursery_id?: string;
  room_id?: string;
  tablet_id?: string;
  seed_admin?: boolean;
};

export type ScopedResource = {
  company_id?: string;
  nursery_id?: string;
  room_id?: string;
  tablet_id?: string;
};

export function canAccessCompany(claims: A5AuthClaims, companyId?: string): boolean {
  if (claims.role === "SUPER_ADMIN" || claims.seed_admin) return true;
  return claims.role === "COMPANY_ADMIN" && Boolean(companyId) && claims.company_id === companyId;
}

export function canAccessNursery(claims: A5AuthClaims, nurseryId?: string): boolean {
  if (claims.role === "SUPER_ADMIN" || claims.seed_admin) return true;
  return claims.role === "NURSERY_ADMIN" && Boolean(nurseryId) && claims.nursery_id === nurseryId;
}

export function canAccessTablet(claims: A5AuthClaims, resource: ScopedResource): boolean {
  if (claims.role === "SUPER_ADMIN" || claims.seed_admin) return true;

  return (
    claims.role === "TABLET_DEVICE" &&
    claims.nursery_id === resource.nursery_id &&
    claims.room_id === resource.room_id &&
    claims.tablet_id === resource.tablet_id
  );
}
