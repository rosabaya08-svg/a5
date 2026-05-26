export type A5AuthRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "NURSERY_ADMIN" | "TABLET_DEVICE" | "CUSTOMER_GUEST" | "seed_admin";

export type A5AuthClaims = {
  role?: A5AuthRole;
  company_id?: string;
  nursery_id?: string;
  room_id?: string;
  tablet_id?: string;
  seed_admin?: boolean;
};

export function isSuperOrSeedAdmin(claims: A5AuthClaims): boolean {
  return claims.role === "SUPER_ADMIN" || claims.seed_admin === true || claims.role === "seed_admin";
}

export function canWriteCompanyScope(claims: A5AuthClaims, companyId?: string): boolean {
  return isSuperOrSeedAdmin(claims) || (claims.role === "COMPANY_ADMIN" && claims.company_id === companyId);
}

export function canReadNurseryScope(claims: A5AuthClaims, nurseryId?: string): boolean {
  return isSuperOrSeedAdmin(claims) || (claims.role === "NURSERY_ADMIN" && claims.nursery_id === nurseryId);
}

export function canUseTabletScope(
  claims: A5AuthClaims,
  scope: { nursery_id?: string; room_id?: string; tablet_id?: string },
): boolean {
  return (
    isSuperOrSeedAdmin(claims) ||
    (claims.role === "TABLET_DEVICE" &&
      claims.nursery_id === scope.nursery_id &&
      claims.room_id === scope.room_id &&
      claims.tablet_id === scope.tablet_id)
  );
}
