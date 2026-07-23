import type { ReactNode } from "react";
import { connection } from "next/server";
import { PortalLayoutGuard } from "@/components/auth/PortalLayoutGuard";
import { readPortalServerSession } from "@/lib/auth/serverSession";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await readPortalServerSession("admin");
  const initiallyAllowed = session?.role === "SUPER_ADMIN" || session?.role === "admin";

  return (
    <PortalLayoutGuard role="admin" initiallyAllowed={initiallyAllowed}>
      {children}
    </PortalLayoutGuard>
  );
}
