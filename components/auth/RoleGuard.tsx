"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearPortalSession,
  portalHomePaths,
  portalLoginPaths,
  readPortalSession,
  syncPortalSessionCookie,
  type PortalRole,
  type PortalSession,
} from "@/lib/auth/session";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";

type RoleGuardProps = {
  role: PortalRole;
  children: React.ReactNode;
};

function isValidSession(role: PortalRole, session: PortalSession | null) {
  if (!session) return false;
  if (role === "admin") return session.role === "SUPER_ADMIN" || session.role === "admin";
  if (session.role !== role) return false;

  if (role === "company" || role === "nursery") {
    return Boolean(session.termsAcceptedAt && session.privacyAcceptedAt && session.marketingConsentAt);
  }

  return true;
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
      void (async () => {
        const session = readPortalSession(role);
        const sessionIsValid = isValidSession(role, session);
        let ok = sessionIsValid;

        if (role === "company" && sessionIsValid) {
          try {
            await ensureCompanyFirebaseAuthFromSession();
          } catch {
            ok = false;
            clearPortalSession("company");
          }
        } else if (role === "company" && !sessionIsValid) {
          clearPortalSession("company");
        }

        setAllowed(ok);
        setReady(true);

        if (ok && session) {
          syncPortalSessionCookie(role, session);
        }

        if (!ok) {
          const next = window.location.pathname + window.location.search;
          const reason = role === "company" && sessionIsValid ? "&reason=firebase-auth-mismatch" : "";
          const target = `${loginPath}?next=${encodeURIComponent(next || portalHomePaths[role])}${reason}`;
          window.location.replace(target);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loginPath, role]);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-normal text-slate-500">{label} 확인 중</p>
          <h1 className="mt-2 text-2xl font-normal">로그인이 필요합니다</h1>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
