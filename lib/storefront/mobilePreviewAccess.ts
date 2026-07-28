"use client";

import { readPortalSession } from "@/lib/auth/session";

const mobilePreviewAccessKey = "a5.mobile-preview.access";
const mobilePreviewAccessDurationMs = 30 * 60 * 1000;

type MobilePreviewAccess = {
  grantedAt: number;
  expiresAt: number;
};

function readStoredAccess(): MobilePreviewAccess | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(mobilePreviewAccessKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<MobilePreviewAccess>;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(mobilePreviewAccessKey);
      return null;
    }

    return {
      grantedAt: typeof parsed.grantedAt === "number" ? parsed.grantedAt : Date.now(),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    window.localStorage.removeItem(mobilePreviewAccessKey);
    return null;
  }
}

export function grantMobilePreviewAccess() {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const access: MobilePreviewAccess = {
    grantedAt: now,
    expiresAt: now + mobilePreviewAccessDurationMs,
  };

  window.localStorage.setItem(mobilePreviewAccessKey, JSON.stringify(access));
}

export function hasMobilePreviewAccess() {
  if (process.env.NODE_ENV !== "production") return true;

  const session = readPortalSession("admin");
  if (session?.role === "SUPER_ADMIN" || session?.role === "admin") return true;

  return Boolean(readStoredAccess());
}
