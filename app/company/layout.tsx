import type { ReactNode } from "react";
import { connection } from "next/server";
import { PortalLayoutGuard } from "@/components/auth/PortalLayoutGuard";
import { readPortalServerSession } from "@/lib/auth/serverSession";

export default async function CompanyLayout({ children }: { children: ReactNode }) {
  await connection();
  const session = await readPortalServerSession("company");
  const initiallyAllowed = Boolean(
    session?.role === "company" &&
      session.termsAcceptedAt &&
      session.privacyAcceptedAt &&
      session.marketingConsentAt,
  );

  return (
    <PortalLayoutGuard role="company" initiallyAllowed={initiallyAllowed}>
      {children}
    </PortalLayoutGuard>
  );
}
