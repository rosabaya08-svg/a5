"use client";

import { clearPortalSession, portalLoginPaths, type PortalRole } from "@/lib/auth/session";

type PortalLogoutButtonProps = {
  role: PortalRole;
  surface?: "light" | "dark";
  className?: string;
};

export function PortalLogoutButton({ role, surface = "light", className = "" }: PortalLogoutButtonProps) {
  const isDark = surface === "dark";

  function handleLogout() {
    clearPortalSession(role);
    window.location.replace(portalLoginPaths[role]);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`h-10 rounded-md px-4 text-sm font-black transition ${
        isDark
          ? "bg-white text-slate-950 hover:bg-slate-100"
          : "bg-slate-950 text-white hover:bg-slate-800"
      } ${className}`}
    >
      로그아웃
    </button>
  );
}
