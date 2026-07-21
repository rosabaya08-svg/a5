export type PortalRole = "admin" | "company" | "nursery" | "tablet";

export type PortalSession = {
  role: PortalRole | "SUPER_ADMIN";
  accountId: string;
  businessNo?: string;
  displayName: string;
  companyId?: string;
  sourceProject?: string;
  sourceSite?: string;
  memberType?: "company" | "guest" | "customer" | "nursery" | "tablet" | string;
  ownerUid?: string;
  nurseryId?: string;
  roomId?: string;
  roomName?: string;
  tabletId?: string;
  signedInAt: string;
  firstLoginCompletedAt?: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  marketingConsentAt?: string;
};

export const portalSessionKeys: Record<PortalRole, string> = {
  admin: "a5.super-admin.session",
  company: "a5.company.session",
  nursery: "a5.nursery.session",
  tablet: "a5.tablet.room",
};

export const portalSessionCookieNames: Record<PortalRole, string> = {
  admin: "a5_super_admin_session",
  company: "a5_company_session",
  nursery: "a5_nursery_session",
  tablet: "a5_tablet_room",
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

const companyLoginTransferKey = "a5.company.login-transfer";
const companyRuntimeAccessFlag = "__a5CompanyRuntimeAccess";
const portalSessionCookieMaxAgeSeconds = 60 * 60 * 12;

declare global {
  interface Window {
    __a5CompanyRuntimeAccess?: boolean;
  }
}

export function normalizeBusinessNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function cookieSecureSuffix() {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function writePortalSessionCookie(role: PortalRole, session: PortalSession) {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${portalSessionCookieNames[role]}=${value}; Path=/; Max-Age=${portalSessionCookieMaxAgeSeconds}; SameSite=Lax${cookieSecureSuffix()}`;
}

function clearPortalSessionCookie(role: PortalRole) {
  if (typeof document === "undefined") return;

  document.cookie = `${portalSessionCookieNames[role]}=; Path=/; Max-Age=0; SameSite=Lax${cookieSecureSuffix()}`;
}

function readPortalSessionCookie(role: PortalRole): PortalSession | null {
  if (typeof document === "undefined") return null;

  const cookieName = `${portalSessionCookieNames[role]}=`;
  const raw = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(cookieName));

  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw.slice(cookieName.length))) as PortalSession;
  } catch {
    return null;
  }
}

function restorePortalSessionStorage(role: PortalRole, session: PortalSession) {
  const storage = role === "company" ? window.sessionStorage : window.localStorage;
  storage.setItem(portalSessionKeys[role], JSON.stringify(session));

  if (role === "company") {
    window[companyRuntimeAccessFlag] = true;
  }
}

export function syncPortalSessionCookie(role: PortalRole, session: PortalSession) {
  writePortalSessionCookie(role, session);
}

export function readPortalSession(role: PortalRole): PortalSession | null {
  if (typeof window === "undefined") return null;

  try {
    if (role === "company") {
      window.localStorage.removeItem(portalSessionKeys.company);
    }

    const storage = role === "company" ? window.sessionStorage : window.localStorage;
    const raw = storage.getItem(portalSessionKeys[role]);
    if (raw) {
      return JSON.parse(raw) as PortalSession;
    }

    const cookieSession = readPortalSessionCookie(role);
    if (cookieSession) {
      restorePortalSessionStorage(role, cookieSession);
      return cookieSession;
    }

    return null;
  } catch {
    return null;
  }
}

export function writePortalSession(role: PortalRole, session: PortalSession) {
  if (typeof window === "undefined") return;

  if (role === "company") {
    window.localStorage.removeItem(portalSessionKeys.company);
    window.sessionStorage.setItem(portalSessionKeys.company, JSON.stringify(session));
    window.sessionStorage.setItem(companyLoginTransferKey, "true");
    window[companyRuntimeAccessFlag] = true;
    writePortalSessionCookie(role, session);
    return;
  }

  window.localStorage.setItem(portalSessionKeys[role], JSON.stringify(session));
  writePortalSessionCookie(role, session);
}

export function clearPortalSession(role: PortalRole) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(portalSessionKeys[role]);
  clearPortalSessionCookie(role);

  if (role === "company") {
    window.sessionStorage.removeItem(portalSessionKeys.company);
    window.sessionStorage.removeItem(companyLoginTransferKey);
    window[companyRuntimeAccessFlag] = false;
  }
}

export function consumeCompanyLoginAccess() {
  if (typeof window === "undefined") return false;
  if (window[companyRuntimeAccessFlag]) return true;

  const hasLoginTransfer = window.sessionStorage.getItem(companyLoginTransferKey) === "true";
  if (!hasLoginTransfer) return false;

  window.sessionStorage.removeItem(companyLoginTransferKey);
  window[companyRuntimeAccessFlag] = true;
  return true;
}
