export type PortalRole = "admin" | "company" | "nursery" | "tablet";

export type PortalSession = {
  role: PortalRole | "SUPER_ADMIN";
  accountId: string;
  businessNo?: string;
  displayName: string;
  companyId?: string;
  nurseryId?: string;
  roomId?: string;
  roomName?: string;
  tabletId?: string;
  signedInAt: string;
  firstLoginCompletedAt?: string;
};

export const portalSessionKeys: Record<PortalRole, string> = {
  admin: "a5.super-admin.session",
  company: "a5.company.session",
  nursery: "a5.nursery.session",
  tablet: "a5.tablet.room",
};

export const portalLoginPaths: Record<PortalRole, string> = {
  admin: "/admin/login",
  company: "/company/login",
  nursery: "/nursery/login",
  tablet: "/tablet/login",
};

export const portalHomePaths: Record<PortalRole, string> = {
  admin: "/admin/dashboard",
  company: "/company/dashboard",
  nursery: "/nursery/dashboard",
  tablet: "/tablet/products",
};

export function normalizeBusinessNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function readPortalSession(role: PortalRole): PortalSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(portalSessionKeys[role]);
    return raw ? (JSON.parse(raw) as PortalSession) : null;
  } catch {
    return null;
  }
}

export function writePortalSession(role: PortalRole, session: PortalSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(portalSessionKeys[role], JSON.stringify(session));
}

export function clearPortalSession(role: PortalRole) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(portalSessionKeys[role]);
}
