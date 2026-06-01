"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  portalHomePaths,
  portalLoginPaths,
  portalSessionKeys,
  readPortalSession,
  type PortalRole,
  type PortalSession,
} from "@/lib/auth/session";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

type RoleGuardProps = {
  role: PortalRole;
  children: React.ReactNode;
};

function isValidSession(role: PortalRole, session: PortalSession | null) {
  if (!session) return false;
  if (role === "admin") return session.role === "SUPER_ADMIN" || session.role === "admin";
  if (role === "nursery") return session.role === role && Boolean(session.nurseryId) && Boolean(session.businessNo);
  return session.role === role;
}

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function redirectToLogin(loginPath: string, role: PortalRole) {
  const next = window.location.pathname + window.location.search;
  const target = `${loginPath}?next=${encodeURIComponent(next || portalHomePaths[role])}`;
  window.location.replace(target);
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("로그인이 필요합니다");
  const loginPath = portalLoginPaths[role];

  const label = useMemo(() => {
    if (role === "admin") return "최고관리자";
    if (role === "company") return "기업 관리자";
    if (role === "nursery") return "조리원 관리자";
    return "태블릿";
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;

    const timer = window.setTimeout(() => {
      const session = readPortalSession(role);

      if (!isValidSession(role, session)) {
        setAllowed(false);
        setReady(true);
        redirectToLogin(loginPath, role);
        return;
      }

      if (role !== "admin") {
        setAllowed(true);
        setReady(true);
        return;
      }

      const auth = getFirebaseAuthClient();

      if (!auth) {
        setAllowed(false);
        setReady(true);
        setMessage("Firebase 관리자 로그인이 설정되지 않았습니다");
        return;
      }

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (cancelled) return;

        if (!user) {
          window.localStorage.removeItem(portalSessionKeys.admin);
          setAllowed(false);
          setReady(true);
          setMessage("최고관리자 Firebase 로그인이 필요합니다");
          redirectToLogin(loginPath, role);
          return;
        }

        if (normalizeEmail(user.email) !== "rosabaya08@gmail.com") {
          window.localStorage.removeItem(portalSessionKeys.admin);
          setAllowed(false);
          setReady(true);
          setMessage("허용되지 않은 최고관리자 계정입니다");
          redirectToLogin(loginPath, role);
          return;
        }

        setAllowed(true);
        setReady(true);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsubscribeAuth?.();
    };
  }, [loginPath, role]);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-bold text-slate-500">{label} 확인 중</p>
          <h1 className="mt-2 text-2xl font-black">{message}</h1>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
