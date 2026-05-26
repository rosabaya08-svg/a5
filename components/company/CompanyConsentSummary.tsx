"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readPortalSession, type PortalSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils/format";

function subscribeToSessionChange(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("focus", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

function getCompanySessionSnapshot() {
  return JSON.stringify(readPortalSession("company") ?? null);
}

function getServerSnapshot() {
  return "null";
}

function parseSession(snapshot: string): PortalSession | null {
  try {
    return JSON.parse(snapshot) as PortalSession | null;
  } catch {
    return null;
  }
}

function consentValue(value?: string) {
  return value ? `동의 완료 · ${formatDateTime(value)}` : "기록 없음";
}

export function CompanyConsentSummary() {
  const snapshot = useSyncExternalStore(subscribeToSessionChange, getCompanySessionSnapshot, getServerSnapshot);
  const session = useMemo(() => parseSession(snapshot), [snapshot]);
  const rows = [
    ["운영 약관", session?.termsAcceptedAt],
    ["개인정보 처리", session?.privacyAcceptedAt],
    ["마케팅 수신", session?.marketingConsentAt],
  ];

  return (
    <div className="mt-4 rounded-md bg-white p-4 ring-1 ring-emerald-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-emerald-600">최초 로그인 동의 기록</p>
          <h3 className="mt-1 text-base font-black text-slate-950">기업 관리자 필수 동의 완료 내역</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
          {session?.marketingConsentAt ? "마케팅 동의 완료" : "확인 필요"}
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-black text-slate-900">{consentValue(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
