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
  role?: A5AuthRole;
  seed_admin?: boolean;
};

export type ClaimValidationResult =
  | { ok: true }
  | { ok: false; reason: string; missing: Array<keyof A5RoleScope> };

const assignableRoles: A5AssignableAuthRole[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "NURSERY_ADMIN",
  "TABLET_DEVICE",
  "seed_admin",
];

const requiredScopeFieldsByRole: Record<A5AuthRole, Array<keyof A5RoleScope>> = {
  SUPER_ADMIN: [],
  COMPANY_ADMIN: ["company_id"],
  NURSERY_ADMIN: ["nursery_id"],
  TABLET_DEVICE: ["nursery_id", "room_id", "tablet_id"],
  CUSTOMER_GUEST: [],
  seed_admin: [],
};

export function isSuperOrSeedAdmin(claims?: A5AuthClaims | null): boolean {
  return claims?.role === "SUPER_ADMIN" || claims?.role === "seed_admin" || claims?.seed_admin === true;
}

export function canSeedOrAdminWrite(claims?: A5AuthClaims | null): boolean {
  return isSuperOrSeedAdmin(claims);
}

export function canWriteCompanyScope(claims: A5AuthClaims, companyId?: string): boolean {
  return isSuperOrSeedAdmin(claims) || (claims.role === "COMPANY_ADMIN" && Boolean(companyId) && claims.company_id === companyId);
}

export function canReadNurseryScope(claims: A5AuthClaims, nurseryId?: string): boolean {
  return isSuperOrSeedAdmin(claims) || (claims.role === "NURSERY_ADMIN" && Boolean(nurseryId) && claims.nursery_id === nurseryId);
}

export function canUseTabletScope(claims: A5AuthClaims, scope: A5RoleScope): boolean {
  return (
    isSuperOrSeedAdmin(claims) ||
    (claims.role === "TABLET_DEVICE" &&
      Boolean(scope.nursery_id) &&
      Boolean(scope.room_id) &&
      Boolean(scope.tablet_id) &&
      claims.nursery_id === scope.nursery_id &&
      claims.room_id === scope.room_id &&
      claims.tablet_id === scope.tablet_id)
  );
}

export function canAccessScopedResource(claims: A5AuthClaims, scope: A5RoleScope): boolean {
  if (isSuperOrSeedAdmin(claims)) return true;
  if (claims.role === "COMPANY_ADMIN") return canWriteCompanyScope(claims, scope.company_id);
  if (claims.role === "NURSERY_ADMIN") return canReadNurseryScope(claims, scope.nursery_id);
  if (claims.role === "TABLET_DEVICE") return canUseTabletScope(claims, scope);
  return false;
}

export function validateClaimsForRole(claims: A5AuthClaims): ClaimValidationResult {
  if (!claims.role || !isAssignableRole(claims.role)) {
    return { ok: false, reason: "Only admin/device roles can be assigned as Firebase Custom Claims.", missing: [] };
  }

  const missing = requiredScopeFieldsByRole[claims.role].filter((field) => !claims[field]);
  if (missing.length > 0) {
    return { ok: false, reason: `${claims.role} is missing required scope fields.`, missing };
  }

  return { ok: true };
}

export function assertCanSetClaims(requesterClaims: A5AuthClaims, targetClaims: A5AuthClaims): void {
  if (!canSeedOrAdminWrite(requesterClaims)) {
    throw new Error("PERMISSION_DENIED: only SUPER_ADMIN or seed_admin may assign A5 custom claims.");
  }

  const validation = validateClaimsForRole(targetClaims);
  if (!validation.ok) {
    throw new Error(`INVALID_CLAIMS: ${validation.reason} ${validation.missing.join(",")}`.trim());
  }
}

export function buildCustomClaimsDraft(role: A5AssignableAuthRole, scope: A5RoleScope): A5AuthClaims {
  const claims: A5AuthClaims = {
    role,
    company_id: scope.company_id,
    nursery_id: scope.nursery_id,
    room_id: scope.room_id,
    tablet_id: scope.tablet_id,
    seed_admin: role === "seed_admin" ? true : undefined,
  };

  const validation = validateClaimsForRole(claims);
  if (!validation.ok) {
    throw new Error(`INVALID_CLAIMS: ${validation.reason} ${validation.missing.join(",")}`.trim());
  }

  return claims;
}

function isAssignableRole(role: A5AuthRole): role is A5AssignableAuthRole {
  return assignableRoles.includes(role as A5AssignableAuthRole);
}
