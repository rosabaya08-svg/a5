export type A5AuthRole =
  | "SUPER_ADMIN"
  | "COMPANY_ADMIN"
  | "NURSERY_ADMIN"
  | "TABLET_DEVICE"
  | "CUSTOMER_GUEST"
  | "seed_admin";

export type A5AssignableAuthRole = Exclude<A5AuthRole, "CUSTOMER_GUEST">;

export type A5RoleScope = {
  company_id?: string;
  nursery_id?: string;
  room_id?: string;
  tablet_id?: string;
};

export type A5AuthClaims = A5RoleScope & {
  role: A5AuthRole;
  seed_admin?: boolean;
};

export type A5ScopedResource = A5RoleScope;

export type A5ClaimValidationResult =
  | { ok: true }
  | { ok: false; reason: string; missing: Array<keyof A5RoleScope> };

export const a5AuthRoles: A5AuthRole[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "NURSERY_ADMIN",
  "TABLET_DEVICE",
  "CUSTOMER_GUEST",
  "seed_admin",
];

export const a5AssignableAuthRoles: A5AssignableAuthRole[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "NURSERY_ADMIN",
  "TABLET_DEVICE",
  "seed_admin",
];

export const requiredScopeFieldsByRole: Record<A5AuthRole, Array<keyof A5RoleScope>> = {
  SUPER_ADMIN: [],
  COMPANY_ADMIN: ["company_id"],
  NURSERY_ADMIN: ["nursery_id"],
  TABLET_DEVICE: ["nursery_id", "room_id", "tablet_id"],
  CUSTOMER_GUEST: [],
  seed_admin: [],
};

export function isSeedAdmin(claims?: Partial<A5AuthClaims> | null): boolean {
  return claims?.seed_admin === true || claims?.role === "seed_admin";
}

export function isSuperAdmin(claims?: Partial<A5AuthClaims> | null): boolean {
  return claims?.role === "SUPER_ADMIN";
}

export function isSuperOrSeedAdmin(claims?: Partial<A5AuthClaims> | null): boolean {
  return isSuperAdmin(claims) || isSeedAdmin(claims);
}

export function canSeedOrAdminWrite(claims?: Partial<A5AuthClaims> | null): boolean {
  return isSuperOrSeedAdmin(claims);
}

export function canAccessCompany(claims: Partial<A5AuthClaims> | null | undefined, companyId?: string): boolean {
  if (isSuperOrSeedAdmin(claims)) return true;
  return claims?.role === "COMPANY_ADMIN" && Boolean(companyId) && claims.company_id === companyId;
}

export function canAccessNursery(claims: Partial<A5AuthClaims> | null | undefined, nurseryId?: string): boolean {
  if (isSuperOrSeedAdmin(claims)) return true;
  return claims?.role === "NURSERY_ADMIN" && Boolean(nurseryId) && claims.nursery_id === nurseryId;
}

export function canAccessTablet(
  claims: Partial<A5AuthClaims> | null | undefined,
  resource: A5ScopedResource,
): boolean {
  if (isSuperOrSeedAdmin(claims)) return true;

  return (
    claims?.role === "TABLET_DEVICE" &&
    Boolean(resource.nursery_id) &&
    Boolean(resource.room_id) &&
    Boolean(resource.tablet_id) &&
    claims.nursery_id === resource.nursery_id &&
    claims.room_id === resource.room_id &&
    claims.tablet_id === resource.tablet_id
  );
}

export function canAccessScopedResource(
  claims: Partial<A5AuthClaims> | null | undefined,
  resource: A5ScopedResource,
): boolean {
  if (isSuperOrSeedAdmin(claims)) return true;
  if (claims?.role === "COMPANY_ADMIN") return canAccessCompany(claims, resource.company_id);
  if (claims?.role === "NURSERY_ADMIN") return canAccessNursery(claims, resource.nursery_id);
  if (claims?.role === "TABLET_DEVICE") return canAccessTablet(claims, resource);
  return false;
}

export function validateClaimsForRole(claims: Partial<A5AuthClaims>): A5ClaimValidationResult {
  if (!claims.role || !a5AuthRoles.includes(claims.role)) {
    return { ok: false, reason: "유효한 role claim이 필요합니다.", missing: [] };
  }

  if (claims.role === "CUSTOMER_GUEST") {
    return { ok: false, reason: "CUSTOMER_GUEST는 Firebase Auth 계정을 만들지 않는 비회원 QR 흐름입니다.", missing: [] };
  }

  const missing = requiredScopeFieldsByRole[claims.role].filter((field) => !claims[field]);
  if (missing.length > 0) {
    return { ok: false, reason: `${claims.role} 권한에 필요한 scope가 누락되었습니다.`, missing };
  }

  return { ok: true };
}

export function buildAssignableClaims(role: A5AssignableAuthRole, scope: A5RoleScope): A5AuthClaims {
  return {
    role,
    company_id: scope.company_id,
    nursery_id: scope.nursery_id,
    room_id: scope.room_id,
    tablet_id: scope.tablet_id,
    seed_admin: role === "seed_admin" ? true : undefined,
  };
}
