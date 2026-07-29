"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  portalHomePaths,
  portalLoginPaths,
  readPortalSession,
  type PortalRole,
  type PortalSession,
} from "@/lib/auth/session";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

type RoleGuardProps = {
  role: PortalRole;
  children: React.ReactNode;
};

const adminPortalRoles = new Set(["SUPER_ADMIN", "FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_ADMIN", "AUDITOR"]);

function isValidSession(role: PortalRole, session: PortalSession | null) {
  if (!session) return false;
  if (role === "nursery") return session.role === role && Boolean(session.nurseryId) && Boolean(session.businessNo);
  return session.role === role;
}

function redirectToLogin(loginPath: string, role: PortalRole) {
  const next = window.location.pathname + window.location.search;
  window.location.replace(`${loginPath}?next=${encodeURIComponent(next || portalHomePaths[role])}`);
}

function claimRoles(claims: Record<string, unknown>) {
  const values = [claims.role, claims.a5_role, claims.admin_role, ...(Array.isArray(claims.roles) ? claims.roles : [])];
  return [...new Set(values.map((value) => String(value ?? "").trim().toUpperCase()).filter(Boolean))];
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
  const status = String(claims.access_status ?? "ACTIVE").toUpperCase();
  return status === "ACTIVE" && roles.some((candidate) => adminPortalRoles.has(candidate));
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("로그인이 필요합니다");
  const loginPath = portalLoginPaths[role];
  const label = useMemo(() => role === "admin" ? "A5S 기업관리자" : role === "company" ? "기업 관리자" : role === "nursery" ? "조리원 관리자" : "태블릿", [role]);

  useEffect(() => {
    let cancelled = false;
    const auth = getFirebaseAuthClient();

    if (role !== "admin") {
      const session = readPortalSession(role);
      if (!isValidSession(role, session)) {
        setReady(true);
        setAllowed(false);
        redirectToLogin(loginPath, role);
        return;
      }
      setAllowed(true);
      setReady(true);
      return;
    }

    if (!auth) {
      setMessage("Firebase 관리자 인증 설정이 필요합니다");
      setReady(true);
      setAllowed(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        setMessage("A5S 기업관리자 Firebase 로그인이 필요합니다");
        setReady(true);
        setAllowed(false);
        redirectToLogin(loginPath, role);
        return;
      }
      try {
        let token = await user.getIdTokenResult(true);
        if (!permittedAdminClaims(token.claims as Record<string, unknown>)) {
          setMessage("초기 최고관리자 서버 등록을 확인하고 있습니다");
          const bootstrapped = await tryBootstrap(user);
          if (bootstrapped) token = await user.getIdTokenResult(true);
        }
        if (!permittedAdminClaims(token.claims as Record<string, unknown>)) {
          setMessage("서버에서 승인된 A5S 관리자 역할이 없습니다");
          setAllowed(false);
          setReady(true);
          return;
        }
        setAllowed(true);
        setReady(true);
      } catch {
        setMessage("관리자 권한 토큰을 확인하지 못했습니다");
        setAllowed(false);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loginPath, role]);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-bold text-slate-500">{label} 확인 중</p>
          <h1 className="mt-2 text-2xl font-black">{message}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">관리자 권한은 이메일 하드코딩이 아니라 Firebase Custom Claims와 서버 access_members 원장으로 확인합니다.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
