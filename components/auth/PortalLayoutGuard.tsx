"use client";

import { usePathname } from "next/navigation";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { portalLoginPaths, type PortalRole } from "@/lib/auth/session";

type PortalLayoutGuardProps = {
  role: Extract<PortalRole, "admin" | "company">;
  initiallyAllowed: boolean;
  children: React.ReactNode;
};

function isLoginRoute(pathname: string, loginPath: string) {
  const normalizedLoginPath = loginPath.replace(/\/+$/, "");
  return pathname === normalizedLoginPath || pathname.startsWith(`${normalizedLoginPath}/`);
}

export function PortalLayoutGuard({
  role,
  initiallyAllowed,
  children,
}: PortalLayoutGuardProps) {
  const pathname = usePathname() ?? "";
  const loginPath = portalLoginPaths[role];

  if (isLoginRoute(pathname, loginPath)) {
    return <>{children}</>;
  }

  return (
    <RoleGuard role={role} initiallyAllowed={initiallyAllowed}>
      {children}
    </RoleGuard>
  );
}
