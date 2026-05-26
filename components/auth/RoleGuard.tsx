"use client";

import { useEffect, useMemo, useState } from "react";
import {
  portalHomePaths,
  portalLoginPaths,
  readPortalSession,
  type PortalRole,
  type PortalSession,
} from "@/lib/auth/session";

type RoleGuardProps = {
  role: PortalRole;
  children: React.ReactNode;
};

function isValidSession(role: PortalRole, session: PortalSession | null) {
  if (!session) return false;
  if (role === "admin") return session.role === "SUPER_ADMIN" || session.role === "admin";
  return session.role === role;
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const loginPath = portalLoginPaths[role];

  const label = useMemo(() => {
    if (role === "admin") return "최고관리자";
    if (role === "company") return "기업 관리자";
    if (role === "nursery") return "조리원 관리자";
    return "태블릿";
  }, [role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const session = readPortalSession(role);
      const ok = isValidSession(role, session);
      setAllowed(ok);
      setReady(true);

      if (!ok) {
        const next = window.location.pathname + window.location.search;
        const target = `${loginPath}?next=${encodeURIComponent(next || portalHomePaths[role])}`;
        window.location.replace(target);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loginPath, role]);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-bold text-slate-500">{label} 확인 중</p>
          <h1 className="mt-2 text-2xl font-black">로그인이 필요합니다</h1>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
