"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { formatNumber } from "@/lib/utils/format";

type A5sHubCustomerRow = {
  id: string;
  memberHubId: string;
  customerId: string;
  customerUid: string;
  sellerId: string;
  displayName: string;
  email: string;
  phone: string;
  accountStatus: string;
  hubSyncStatus: string;
  profileVersion: number;
  signupRoute: string;
  signupProviders: string[];
  joinedChannel: string;
  updatedAt: string;
  sourceSite: "a5s";
};

type MonitorResponse = {
  ok?: boolean;
  count?: number;
  customers?: A5sHubCustomerRow[];
  privacyMode?: string;
  message?: string;
  generatedAt?: string;
  error?: {
    message?: string;
  };
};

type CsvCell = string | number | boolean | null | undefined;

const routeFilters = ["전체", "카카오", "네이버", "이메일", "Firebase", "HUB 연결"];

export function AdminA5sCustomerMonitorPanel() {
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.adminA5sCustomerMonitor, []);
  const [customers, setCustomers] = useState<A5sHubCustomerRow[]>([]);
  const [message, setMessage] = useState(() =>
    endpoint ? "A5S 가입 고객 HUB 연결 상태를 불러옵니다." : "Functions base URL이 없어 A5S 고객 모니터링 API를 호출할 수 없습니다.",
  );
  const [searchText, setSearchText] = useState("");
  const [activeRoute, setActiveRoute] = useState(routeFilters[0]);
  const [isLoading, setIsLoading] = useState(Boolean(endpoint));
  const [generatedAt, setGeneratedAt] = useState("");

  const loadCustomers = useCallback(async (query = "") => {
    if (!endpoint) return;

    setIsLoading(true);
    try {
      const token = await getSuperAdminIdToken();
      if (!token) {
        setCustomers([]);
        setMessage("최고관리자 Firebase 로그인 토큰이 없어 A5S 고객 실데이터를 표시할 수 없습니다.");
        return;
      }

      const params = new URLSearchParams({ limit: "120" });
      const trimmedQuery = query.trim();
      if (trimmedQuery) params.set("q", trimmedQuery);

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as MonitorResponse;
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error?.message || payload.message || "A5S 고객 모니터링 조회 실패");
      }

      const rows = Array.isArray(payload.customers) ? payload.customers : [];
      setCustomers(rows);
      setGeneratedAt(payload.generatedAt ?? "");
      setMessage(payload.message || `A5S 고객 ${rows.length}명을 HUB 기준으로 불러왔습니다.`);
    } catch (error) {
      setCustomers([]);
      setMessage(error instanceof Error ? error.message : "A5S 고객 모니터링 조회 실패");
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const routeMatches = activeRoute === "전체" || customer.signupRoute.includes(activeRoute) || customer.signupProviders.includes(activeRoute);
      return routeMatches;
    });
  }, [activeRoute, customers]);

  const snsCustomers = customers.filter((customer) => customer.signupProviders.some((provider) => provider === "카카오" || provider === "네이버")).length;
  const syncedCustomers = customers.filter((customer) => customer.hubSyncStatus === "synced").length;
  const routeSummary = new Set(customers.flatMap((customer) => customer.signupProviders)).size;

  return (
    <section className="rounded-md border border-emerald-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 px-5 py-4">
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.12em] text-emerald-700">A5S customer monitor</p>
          <h3 className="mt-1 text-lg font-normal text-slate-950">A5S 가입 고객 통합 모니터링</h3>
          <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
            A5 최고관리자가 HUB에 연결된 A5S 고객을 읽기 전용으로 확인합니다. 고객 원본은 수정하지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadCustomers(searchText)}
            disabled={isLoading || !endpoint}
            className="h-10 border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => downloadCustomerCsv(filteredCustomers)}
            disabled={!filteredCustomers.length}
            className="h-10 border border-emerald-200 bg-emerald-50 px-3 text-sm font-normal text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            고객 CSV 다운로드
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-4">
        <Metric label="HUB 고객" value={`${formatNumber(customers.length)}명`} helper="withcommerce-member-hub 기준" />
        <Metric label="SNS 가입" value={`${formatNumber(snsCustomers)}명`} helper="카카오/네이버 연결" />
        <Metric label="동기화 정상" value={`${formatNumber(syncedCustomers)}명`} helper="syncStatus=synced" />
        <Metric label="가입루트 수" value={`${formatNumber(routeSummary)}개`} helper={generatedAt ? `갱신 ${shortDateTime(generatedAt)}` : "갱신 대기"} />
      </div>

      <div className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void loadCustomers(searchText);
          }}
          placeholder="고객명, 이메일, 전화번호, customerUid, memberHubId 검색"
          className="h-10 border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={() => void loadCustomers(searchText)}
          disabled={isLoading || !endpoint}
          className="h-10 border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          검색
        </button>
        <div className="flex flex-wrap gap-2">
          {routeFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveRoute(filter)}
              className={`h-10 border px-3 text-sm font-normal ${
                activeRoute === filter
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
        <p className="mb-3 text-sm font-normal text-slate-600">{isLoading ? "불러오는 중입니다." : message}</p>
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="whitespace-nowrap px-3 py-3">가입루트</th>
                <th className="whitespace-nowrap px-3 py-3">고객</th>
                <th className="whitespace-nowrap px-3 py-3">연락처</th>
                <th className="whitespace-nowrap px-3 py-3">A5S 좌표</th>
                <th className="whitespace-nowrap px-3 py-3">HUB 상태</th>
                <th className="whitespace-nowrap px-3 py-3">수정일</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id || customer.memberHubId} className="border-t border-slate-200 bg-white">
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(customer.signupProviders.length ? customer.signupProviders : [customer.signupRoute]).map((provider) => (
                          <Badge key={`${customer.memberHubId}-${provider}`}>{provider}</Badge>
                        ))}
                      </div>
                      <p className="mt-1 text-xs font-normal text-slate-500">{customer.joinedChannel || "A5S"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-normal text-slate-950">{customer.displayName || customer.email || customer.customerId || "-"}</p>
                      <p className="mt-1 max-w-[260px] truncate text-xs font-normal text-slate-500">HUB {customer.memberHubId}</p>
                    </td>
                    <td className="px-3 py-3 font-normal text-slate-700">
                      <p>{customer.phone || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">{customer.email || "-"}</p>
                    </td>
                    <td className="px-3 py-3 font-normal text-slate-700">
                      <p className="max-w-[240px] truncate">{customer.customerId || "-"}</p>
                      <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500">{customer.customerUid || "-"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={customer.hubSyncStatus === "synced" ? "green" : "blue"}>{customer.hubSyncStatus || "linked"}</Badge>
                      <p className="mt-1 text-xs font-normal text-slate-500">v{customer.profileVersion || 0}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-normal text-slate-600">{shortDateTime(customer.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm font-normal text-slate-500">
                    조건에 맞는 A5S 고객 정보가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-normal text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-normal text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-normal text-slate-500">{helper}</p>
    </div>
  );
}

function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" }) {
  const className = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`inline-flex border px-2 py-1 text-xs font-normal ${className}`}>{children}</span>;
}

async function getSuperAdminIdToken() {
  const auth = getFirebaseAuthClient();
  return auth?.currentUser ? auth.currentUser.getIdToken() : "";
}

function downloadCustomerCsv(customers: A5sHubCustomerRow[]) {
  downloadCsv(
    `a5-a5s-customers-${todayStamp()}.csv`,
    [
      "고객명",
      "전화번호",
      "이메일",
      "가입루트",
      "가입채널",
      "상태",
      "A5S customerId",
      "A5S customerUid",
      "sellerId",
      "memberHubId",
      "HUB 동기화",
      "profileVersion",
      "수정일",
    ],
    customers.map((customer) => [
      customer.displayName,
      customer.phone,
      customer.email,
      customer.signupRoute,
      customer.joinedChannel,
      customer.accountStatus,
      customer.customerId,
      customer.customerUid,
      customer.sellerId,
      customer.memberHubId,
      customer.hubSyncStatus,
      customer.profileVersion,
      customer.updatedAt,
    ]),
  );
}

function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvValue(value: CsvCell) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function shortDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function todayStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
