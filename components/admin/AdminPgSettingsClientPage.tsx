"use client";

import dynamic from "next/dynamic";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminA5sPayupMerchantSettingsPanel, type PgCommerceChannel } from "@/components/admin/AdminA5sPayupMerchantSettingsPanel";
import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import { getFirebaseAdminAuthClient } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import type { Company, PgMerchantStatus, PgProvider } from "@/types/commerce";

const PgGatewaySettingsPanel = dynamic(
  () => import("@/components/admin/PgGatewaySettingsPanel").then((mod) => mod.PgGatewaySettingsPanel),
  { ssr: false, loading: () => <div className="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">PG 설정 화면을 불러오는 중입니다.</div> },
);

type AdminPgSettingsClientPageProps = { channel?: PgCommerceChannel | "a5mall" };
type LoadState = "loading" | "ready" | "empty" | "auth_required" | "forbidden" | "error";
type SafePgRow = {
  companyId: string; companyName: string; businessNo: string; representativeName: string; managerName: string;
  contactPhone: string; contactEmail: string; provider: PgProvider; environment: "test" | "production";
  merchantId: string; merchantIdMasked: string; status: PgMerchantStatus; credentialReady: boolean;
  encryptedSecretStored: boolean; vaultReady: boolean; credentialStorageLabel: string;
  lastConnectionTest: { status: string; providerCalled: boolean; environment: string; code: string; testedAt: string; blockerCount: number };
  transactions: { paymentIntents: number; payments: number; orders: number; total: number };
};

const channelCopy = {
  a5mall: { title: "산후조리원 폐쇄몰 PG 관리", subtitle: "A5 Mall 입점 기업별 Payup 가맹점 정보와 결제 상태를 관리합니다.", scope: "A5 Mall" },
  a5s: { title: "산지바로 PG 관리", subtitle: "A5S 산지바로 입점사별 Payup 가맹점 정보를 관리합니다.", scope: "A5S" },
  a5ws: { title: "홀세일 폐쇄몰 PG 관리", subtitle: "A5WS 홀세일 폐쇄몰의 파트너 결제 설정을 채널별로 분리해 관리합니다.", scope: "A5WS" },
  a5ls: { title: "루쏘 부티끄 PG 관리", subtitle: "A5LS 루쏘 부티끄의 Payup 가맹점 설정을 별도로 관리합니다.", scope: "A5LS" },
} satisfies Record<NonNullable<AdminPgSettingsClientPageProps["channel"]>, { title: string; subtitle: string; scope: string }>;

const superAdminEmail = "rosabaya08@gmail.com";

function waitForAuthUser(): Promise<User | null> {
  const auth = getFirebaseAdminAuthClient();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { unsubscribe(); resolve(user); });
  });
}

function rowToCompany(row: SafePgRow): Company {
  return {
    id: row.companyId,
    name: row.companyName,
    businessRegistrationNumber: row.businessNo || undefined,
    businessRegistrationNumberNormalized: row.businessNo || undefined,
    representativeName: row.representativeName || undefined,
    managerName: row.managerName || "확인 전",
    publicContactPhone: row.contactPhone || undefined,
    publicEmail: row.contactEmail || undefined,
    status: "approved",
    commissionRate: 0,
    productCount: 0,
    pendingProductCount: 0,
    settlementBlocked: false,
    pgProfile: {
      provider: row.provider,
      providerLabel: row.provider === "payup" ? "PayUp" : row.provider,
      merchantId: row.merchantId || undefined,
      merchantIdMasked: row.merchantIdMasked,
      credentialRefsStored: row.encryptedSecretStored,
      environment: row.environment,
      credentialReady: row.credentialReady,
      encryptedSecretStored: row.encryptedSecretStored,
      vaultReady: row.vaultReady,
      credentialStorageLabel: row.credentialStorageLabel,
      lastConnectionTest: row.lastConnectionTest,
      transactions: row.transactions,
      merchantStatus: row.status,
      adminManaged: true,
      companyEditable: false,
      pgFeeRate: 0,
      platformFeeRate: 0,
      totalFeeRate: 0,
      settlementOwner: "payup",
      settlementExecutionBlocked: false,
    },
  };
}

export function AdminPgSettingsClientPage({ channel = "a5mall" }: AdminPgSettingsClientPageProps) {
  const copy = channelCopy[channel];
  const searchParams = useSearchParams();
  const requestedCompanyId = searchParams.get("companyId")?.trim() || "";
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.adminPgCredentialList, []);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("입점사 PG 목록을 불러오는 중입니다.");
  const isA5Mall = channel === "a5mall";

  const loadCompanies = useCallback(async () => {
    if (!isA5Mall) return;
    if (!endpoint) { setState("error"); setMessage("PG 안전 조회 함수 주소가 설정되지 않았습니다."); return; }
    setState("loading");
    setMessage("최고관리자 인증과 PG 저장 상태를 확인하는 중입니다.");
    const user = await waitForAuthUser();
    if (!user) { setCompanies([]); setState("auth_required"); setMessage("Firebase 최고관리자 인증이 필요합니다. 다시 로그인해 주세요."); return; }
    if ((user.email ?? "").trim().toLowerCase() !== superAdminEmail) {
      setCompanies([]);
      setState("forbidden");
      setMessage("최고관리자 Google 계정으로 다시 로그인해 주세요.");
      return;
    }
    const token = await user.getIdToken(true);
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      setCompanies([]);
      setState(response.status === 401 ? "auth_required" : response.status === 403 ? "forbidden" : "error");
      setMessage(response.status === 403 ? "최고관리자 Google 인증이 만료되었거나 다른 계정으로 변경되었습니다. 다시 로그인해 주세요." : payload?.error?.message || "PG 저장정보 조회에 실패했습니다.");
      return;
    }
    const rows = Array.isArray(payload.rows) ? (payload.rows as SafePgRow[]) : [];
    setCompanies(rows.map(rowToCompany));
    setState(rows.length ? "ready" : "empty");
    setMessage(rows.length ? "입점사 " + rows.length + "개의 PG 저장 상태를 안전하게 불러왔습니다." : "등록된 입점사가 0건입니다.");
  }, [endpoint, isA5Mall]);

  useEffect(() => {
    void Promise.resolve().then(loadCompanies).catch((error) => {
      setCompanies([]);
      setState("error");
      setMessage(error instanceof Error ? error.message : "PG 저장정보 조회에 실패했습니다.");
    });
  }, [loadCompanies]);

  const tone = state === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : state === "loading" ? "border-blue-200 bg-blue-50 text-blue-950" : "border-amber-200 bg-amber-50 text-amber-950";
  return (
    <AppShell sectionTitle="최고관리자" title={copy.title} subtitle={copy.subtitle} scopeLabel="위드커머스" navItems={adminNavItems} accent="admin">
      <div className="grid gap-4">
        <div className={"rounded-md border px-4 py-3 text-sm " + tone}>{isA5Mall ? message : copy.scope + " 전용 PG 설정입니다."}</div>
        {isA5Mall && (state === "auth_required" || state === "forbidden") ? (
          <button
            type="button"
            onClick={() => window.location.assign(`/admin/login/?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            className="w-fit rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white"
          >
            최고관리자 Google 다시 로그인
          </button>
        ) : null}
        {isA5Mall && state === "ready" ? <PgGatewaySettingsPanel companies={companies} requestedCompanyId={requestedCompanyId} onRefresh={loadCompanies} /> : null}
        {isA5Mall && state === "empty" ? <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-700">등록 업체가 0건입니다. 권한 오류와 구분된 정상 빈 상태입니다.</div> : null}
        {!isA5Mall ? <AdminA5sPayupMerchantSettingsPanel channel={channel} /> : null}
      </div>
    </AppShell>
  );
}
