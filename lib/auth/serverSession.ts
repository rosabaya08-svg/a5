import { cookies } from "next/headers";
import { portalSessionCookieNames, type PortalRole, type PortalSession } from "@/lib/auth/session";

function parsePortalSession(value?: string) {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as PortalSession;
  } catch {
    return null;
  }
}

export async function readPortalServerSession(role: PortalRole) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const cookieStore = await cookies();
  const session = parsePortalSession(cookieStore.get(portalSessionCookieNames[role])?.value);

  if (!session) return null;
  if (role === "admin") return session.role === "SUPER_ADMIN" || session.role === "admin" ? session : null;
  return session.role === role ? session : null;
}
