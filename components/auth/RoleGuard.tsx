"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  clearPortalSession,
  portalHomePaths,
  portalLoginPaths,
  readPortalSession,
  writePortalSession,
  type PortalRole,
  type PortalSession,
} from "@/lib/auth/session";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

const adminPortalRoles = new Set(["SUPER_ADMIN", "FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_ADMIN", "AUDITOR"]);
const companyPortalRoles = new Set(["COMPANY_ADMIN", "SUPPLIER_ADMIN", "PARTNER_ADMIN", "A5LS_ADMIN"]);

type RoleGuardProps = {
  role: PortalRole;
  children: React.ReactNode;
};

function isValidLegacySession(role: PortalRole, session: PortalSession | null) {
  if (!session) return false;
  if (role === "nursery") return session.role === role && Boolean(session.nurseryId) && Boolean(session.businessNo);
  if (role === "tablet") return session.role === role && Boolean(session.nurseryId) && Boolean(session.roomId) && Boolean(session.tabletId);
  return false;
}

function redirectToLogin(loginPath: string, role: PortalRole) {
  const next = window.location.pathname + window.location.search;
  window.location.replace(`${loginPath}?next=${encodeURIComponent(next || portalHomePaths[role])}`);
}

function claimRoles(claims: Record<string, unknown>) {
  const values = [claims.role, claims.a5_role, claims.admin_role, claims.company_role, ...(Array.isArray(claims.roles) ? claims.roles : [])];
  return [...new Set(values.map((value) => String(value ?? "").trim().toUpperCase()).filter(Boolean))];
}

function claimString(claims: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = String(claims[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function functionsBaseUrl() {
  return (process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ?? "").replace(/\/$/, "");
}

async function tryBootstrap(user: User) {
  const baseUrl = functionsBaseUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}/payupBootstrapAccess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({}),
    });
    if (!response.ok) return false;
    await user.getIdToken(true);
    return true;
  } catch {
    return false;
  }
}

function permittedAdminClaims(claims: Record<string, unknown>) {
  const roles = claimRoles(claims);
  const status = claimString(claims, "access_status").toUpperCase() || "ACTIVE";
  return status === "ACTIVE" && roles.some((candidate) => adminPortalRoles.has(candidate));
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("로그인이 필요합니다");
  const loginPath = portalLoginPaths[role];
  const label = useMemo(() => role === "admin" ? "A5S 기업관리자" : role === "company" ? "기업·A5WS 파트너" : role === "nursery" ? "조리원 관리자" : "태블릿", [role]);

  useEffect(() => {
    let cancelled = false;

    if (role === "nursery" || role === "tablet") {
      const session = readPortalSession(role);
      const permitted = isValidLegacySession(role, session);
      setAllowed(permitted);
      setReady(true);
      if (!permitted) redirectToLogin(loginPath, role);
      return;
    }

    const auth = getFirebaseAuthClient();
    if (!auth) {
      setMessage("Firebase 인증 설정이 필요합니다");
      setReady(true);
      setAllowed(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        clearPortalSession(role);
        setMessage(`${label} Firebase 로그인이 필요합니다`);
        setReady(true);
        setAllowed(false);
        redirectToLogin(loginPath, role);
        return;
      }

      try {
        let token = await user.getIdTokenResult(true);
        const initialClaims = token.claims as Record<string, unknown>;
        if (role === "admin" && !permittedAdminClaims(initialClaims)) {
          setMessage("초기 최고관리자 서버 등록을 확인하고 있습니다");
          const bootstrapped = await tryBootstrap(user);
          if (bootstrapped) token = await user.getIdTokenResult(true);
        }

        const claims = token.claims as Record<string, unknown>;
        const roles = claimRoles(claims);
        const accessStatus = claimString(claims, "access_status").toUpperCase() || "ACTIVE";
        if (accessStatus !== "ACTIVE") throw new Error("중지되었거나 승인되지 않은 계정입니다.");

        if (role === "admin") {
          if (!permittedAdminClaims(claims)) throw new Error("서버에서 승인된 A5S 관리자 역할이 없습니다.");
          setAllowed(true);
          setReady(true);
          return;
        }

        const organizationId = claimString(claims, "organization_id", "company_id");
        const businessNumber = claimString(claims, "business_number", "business_no").replace(/[^0-9]/g, "");
        const companyRole = roles.find((candidate) => companyPortalRoles.has(candidate));
        if (!companyRole || !organizationId || businessNumber.length !== 10) {
          throw new Error("기업·공급사·파트너 역할과 조직·사업자 범위가 없습니다.");
        }
        const channelIds = Array.isArray(claims.channel_ids) ? claims.channel_ids.map((value) => String(value)) : [];
        if (companyRole === "PARTNER_ADMIN" && channelIds.length > 0 && !channelIds.includes("A5WS")) {
          throw new Error("A5WS 채널 권한이 없습니다.");
        }

        writePortalSession("company", {
          role: "company",
          accountId: user.uid,
          businessNo: businessNumber,
          displayName: user.displayName || user.email || organizationId,
          companyId: organizationId,
          signedInAt: new Date().toISOString(),
          firstLoginCompletedAt: readPortalSession("company")?.firstLoginCompletedAt ?? new Date().toISOString(),
        });
        setAllowed(true);
        setReady(true);
      } catch (error) {
        clearPortalSession(role);
        setMessage(error instanceof Error ? error.message : "서버 권한을 확인하지 못했습니다.");
        setAllowed(false);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [label, loginPath, role]);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-bold text-slate-500">{label} 확인 중</p>
          <h1 className="mt-2 text-2xl font-black">{message}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">A5S·A5WS 접근권한은 Firebase Custom Claims와 서버 access_members 원장으로 확인합니다.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
