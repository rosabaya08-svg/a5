"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  defaultPayupFeatureFlags,
  payupCancellationRows,
  payupLogRows,
  payupSettlementRows,
  payupSubmerchantRows,
  payupTransactionRows,
  type PayupCancellationRow,
  type PayupFeatureFlag,
  type PayupLogRow,
  type PayupSettlementRow,
  type PayupSubmerchantRow,
  type PayupTransactionRow,
} from "@/data/admin/payupSandbox";
import { callPayupAdmin } from "@/lib/payup/adminClient";

export type PayupAdminView =
  | "overview"
  | "connection"
  | "switchboard"
  | "submerchants"
  | "transactions"
  | "settlements"
  | "cancellations"
  | "logs";

type ConnectionHealth = {
  ok: boolean;
  mode: "sandbox" | "test" | "production";
  liveCallsEnabled: boolean;
  baseUrl: string;
  merchantIdMasked: string;
  fixedIpRegistered: boolean;
  requiredSecrets: Record<string, boolean>;
  blockers: string[];
  lastProbeAt: string;
  payupResponseCode?: string;
  payupResponseMsg?: string;
};

type SpreadsheetColumn<Row> = {
  key: keyof Row | string;
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  value: (row: Row) => string | number;
  render?: (row: Row) => ReactNode;
};

const featureStorageKey = "a5.payup.sandbox.feature-flags.v1";

function money(value: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
}

function badgeTone(value: string) {
  const normalized = value.toLowerCase();
  if (["active", "성공", "일치", "승인성공", "취소완료", "지급완료"].some((token) => normalized.includes(token.toLowerCase()))) {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
  if (["error", "실패", "불일치", "수동처리", "차단"].some((token) => normalized.includes(token.toLowerCase()))) {
    return "bg-red-100 text-red-800 ring-red-200";
  }
  if (["pending", "대기", "보류", "registering", "요청"].some((token) => normalized.includes(token.toLowerCase()))) {
    return "bg-amber-100 text-amber-900 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-black ring-1 ${badgeTone(value)}`}>{value}</span>;
}

function downloadCsv<Row>(filename: string, columns: SpreadsheetColumn<Row>[], rows: Row[]) {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [columns.map((column) => quote(column.label)).join(","), ...rows.map((row) => columns.map((column) => quote(column.value(row))).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function SpreadsheetTable<Row extends { id: string }>({
  title,
  rows,
  columns,
  filename,
  helper,
}: {
  title: string;
  rows: Row[];
  columns: SpreadsheetColumn<Row>[];
  filename: string;
  helper?: string;
}) {
  const [query, setQuery] = useState("");
  const visibleRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => columns.some((column) => String(column.value(row)).toLowerCase().includes(keyword)));
  }, [columns, query, rows]);

  return (
    <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-100 px-4 py-3">
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-600">{helper ?? `전체 ${rows.length}건 · 검색 결과 ${visibleRows.length}건`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="표 안에서 검색"
            className="h-10 min-w-52 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold"
          />
          <button
            type="button"
            onClick={() => downloadCsv(filename, columns, visibleRows)}
            className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white"
          >
            엑셀 CSV 다운로드
          </button>
        </div>
      </div>
      <div className="max-h-[620px] overflow-auto">
        <table className="min-w-max border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#d9ead3] text-slate-900 shadow-sm">
            <tr>
              <th className="w-12 border-b border-r border-slate-300 px-3 py-2 text-center">행</th>
              {columns.map((column) => (
                <th key={String(column.key)} className="whitespace-nowrap border-b border-r border-slate-300 px-3 py-2 font-black" style={{ minWidth: column.width ?? "140px" }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={row.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
                <td className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center font-bold text-slate-500">{rowIndex + 1}</td>
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${String(column.key)}`}
                    className={`whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-700 ${
                      column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {column.render ? column.render(row) : column.value(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ToggleSwitch({ flag, onChange }: { flag: PayupFeatureFlag; onChange: (flag: PayupFeatureFlag) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={flag.enabled}
      disabled={flag.locked}
      onClick={() => onChange(flag)}
      className={`relative h-7 w-14 shrink-0 rounded-full border transition ${
        flag.locked ? "cursor-not-allowed border-slate-300 bg-slate-200" : flag.enabled ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${flag.enabled ? "left-[28px]" : "left-0.5"}`}
      />
    </button>
  );
}

function Notice({ tone = "blue", title, children }: { tone?: "blue" | "amber" | "red" | "green"; title: string; children: ReactNode }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  };
  return (
    <section className={`rounded-md border p-4 ${tones[tone]}`}>
      <h2 className="font-black">{title}</h2>
      <div className="mt-2 text-sm font-semibold leading-6">{children}</div>
    </section>
  );
}

function OverviewPage() {
  const menuCards = [
    ["PayUp 연결 설정", "merchantId·API KEY·고정 IP·테스트/운영 환경을 확인합니다.", "/admin/payup/connection", "연결"],
    ["운영 배전판", "결제·하위사업자·대사·취소 회로를 토글로 제어합니다.", "/admin/payup/switchboard", "토글"],
    ["하위사업자", "공급사·파트너·본사 등록과 PayUp 동기화를 엑셀형 표로 관리합니다.", "/admin/payup/submerchants", "등록"],
    ["거래/분배", "주문·원거래·하위거래·배분금액을 한 줄씩 대사합니다.", "/admin/payup/transactions", "대사"],
    ["정산", "지급예정·보류·완료와 수수료·부가세·실지급액을 확인합니다.", "/admin/payup/settlements", "정산"],
    ["전체취소", "transactionId 기준 전체취소와 1003 수동처리 큐를 관리합니다.", "/admin/payup/cancellations", "취소"],
    ["통합 로그", "API·감사·사업 이벤트를 사업자와 주문 단위로 추적합니다.", "/admin/payup/logs", "로그"],
  ] as const;

  return (
    <div className="grid gap-5">
      <Notice title="A5S 기업관리자 PayUp 통합 관제">
        <p>페이지 주소를 직접 입력하지 않아도 왼쪽 메뉴와 아래 기능 카드에서 모든 PayUp 업무로 이동합니다.</p>
        <p>실제 자격증명은 브라우저에 저장하지 않으며 Firebase Functions와 Secret Manager에서만 사용합니다.</p>
      </Notice>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {menuCards.map(([title, body, href, badge]) => (
          <Link key={href} href={href} className="group rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">{title}</h2>
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black text-white">{badge}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{body}</p>
            <p className="mt-4 text-sm font-black text-blue-700">메뉴 열기 →</p>
          </Link>
        ))}
      </section>
      <Notice tone="amber" title="샌드박스 안전 기준">
        <p>현재 화면은 UI·권한·배전판·엑셀형 관리 흐름을 검증하는 샌드박스입니다.</p>
        <p>실제 PayUp 호출은 서버 Secret, 허용 공인 IP, 테스트/운영 계정이 모두 준비된 경우에만 서버에서 실행됩니다.</p>
      </Notice>
    </div>
  );
}

function ConnectionPage() {
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("연결 점검 전");

  async function probe() {
    setBusy(true);
    setMessage("PayUp Gateway 연결 상태를 확인하고 있습니다.");
    const result = await callPayupAdmin<ConnectionHealth>("payupAdminHealth", { probe: true });
    if (result.ok) {
      setHealth(result.data);
      setMessage(result.data.blockers.length ? "연결 차단 항목이 있습니다." : "PayUp Gateway 연결 준비가 완료됐습니다.");
    } else {
      setHealth(null);
      setMessage(result.error);
    }
    setBusy(false);
  }

  const required = health?.requiredSecrets ?? {
    PAYUP_MERCHANT_ID: false,
    PAYUP_API_KEY: false,
    PAYUP_API_CERT_KEY: false,
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">PayUp PG Connection</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">PayUp PG 연결 설정</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              관리자 버튼을 누르면 중앙 Gateway 상태를 실제 서버에서 점검합니다. 브라우저에는 키 원문이 표시되지 않고 등록 여부만 표시됩니다.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={probe}
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {busy ? "연결 확인 중" : "PayUp PG 연결 확인"}
          </button>
        </div>
        <div className={`mt-4 rounded-md p-3 text-sm font-bold ${health && health.blockers.length === 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {message}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["실행 모드", health?.mode?.toUpperCase() ?? "SANDBOX"],
          ["API 기본주소", health?.baseUrl ?? "서버 확인 전"],
          ["대표 merchantId", health?.merchantIdMasked ?? "미확인"],
          ["고정 IP", health?.fixedIpRegistered ? "등록 확인" : "미확인/미등록"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-2 break-all text-base font-black text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">서버 자격증명 배선</h3>
          <div className="mt-4 grid gap-2">
            {Object.entries(required).map(([key, ready]) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-sm font-bold">
                <span>{key}</span>
                <StatusBadge value={ready ? "등록" : "미등록"} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">Secret 원문은 화면·Firestore·Git에 저장하지 않습니다.</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">연결 차단 항목</h3>
          <div className="mt-4 grid gap-2">
            {(health?.blockers?.length ? health.blockers : ["서버 연결 확인 버튼을 눌러 상태를 조회하세요."]).map((blocker) => (
              <p key={blocker} className="rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">• {blocker}</p>
            ))}
          </div>
          {health?.payupResponseCode ? (
            <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold text-blue-900">
              PayUp 응답 {health.payupResponseCode} · {health.payupResponseMsg}
            </div>
          ) : null}
        </article>
      </section>

      <Notice tone="red" title="연결과 결제승인은 별도 회로입니다">
        <p>연결 확인 성공만으로 고객 결제를 자동 ON 하지 않습니다. 운영 배전판에서 신규 주문, 결제창, 차액분배, 최종승인을 순서대로 승인해야 합니다.</p>
      </Notice>
    </div>
  );
}

function SwitchboardPage() {
  const [flags, setFlags] = useState(defaultPayupFeatureFlags);
  const [message, setMessage] = useState("샌드박스 설정을 불러왔습니다.");

  useEffect(() => {
    let storedFlags = defaultPayupFeatureFlags;
    try {
      const stored = window.localStorage.getItem(featureStorageKey);
      if (stored) storedFlags = JSON.parse(stored) as PayupFeatureFlag[];
    } catch {
      storedFlags = defaultPayupFeatureFlags;
    }
    const timer = window.setTimeout(() => setFlags(storedFlags), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function toggle(flag: PayupFeatureFlag) {
    if (flag.locked) {
      setMessage(`${flag.label}은 ${flag.lockReason ?? "정책"} 때문에 잠겨 있습니다.`);
      return;
    }

    const nextEnabled = !flag.enabled;
    const previous = flags;
    const next = flags.map((item) => (item.key === flag.key ? { ...item, enabled: nextEnabled } : item));
    setFlags(next);
    window.localStorage.setItem(featureStorageKey, JSON.stringify(next));
    setMessage(`${flag.label}을 ${nextEnabled ? "ON" : "OFF"}으로 변경했습니다. 서버 감사로그 반영을 확인 중입니다.`);

    const result = await callPayupAdmin<{ ok: boolean; flag: string; enabled: boolean }>("payupAdminFeatureFlags", {
      key: flag.key,
      enabled: nextEnabled,
      reason: "A5S 기업관리자 PayUp 배전판 변경",
    });

    if (!result.ok && result.source === "firebase_functions") {
      setFlags(previous);
      window.localStorage.setItem(featureStorageKey, JSON.stringify(previous));
      setMessage(`서버 반영 실패로 이전 상태로 복구했습니다: ${result.error}`);
    } else if (!result.ok) {
      setMessage(`${flag.label} 샌드박스 상태를 저장했습니다. 실제 서버 반영 전: ${result.error}`);
    } else {
      setMessage(`${flag.label}을 서버와 화면에 ${nextEnabled ? "ON" : "OFF"}으로 반영했습니다.`);
    }
  }

  const groups = [...new Set(flags.map((flag) => flag.group))];

  return (
    <div className="grid gap-5">
      <Notice title="PayUp 배전판">
        <p>각 회로는 개별 토글로 제어합니다. 신규결제를 OFF해도 기존 거래 대사·정산 조회·취소 처리는 계속 사용할 수 있습니다.</p>
      </Notice>
      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">{message}</div>
      {groups.map((group) => (
        <section key={group} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-sm font-black text-white">{group}</div>
          <div className="divide-y divide-slate-100">
            {flags.filter((flag) => flag.group === group).map((flag) => (
              <div key={flag.key} className="grid gap-3 p-4 lg:grid-cols-[1fr_210px_80px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{flag.label}</h3>
                    <code className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{flag.key}</code>
                    {flag.locked ? <StatusBadge value="LOCKED" /> : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{flag.description}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">
                  {flag.lockReason ? `잠금: ${flag.lockReason}` : flag.dependency ? `조건: ${flag.dependency}` : "독립 회로"}
                </div>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <span className={`text-xs font-black ${flag.enabled ? "text-emerald-700" : "text-slate-500"}`}>{flag.enabled ? "ON" : "OFF"}</span>
                  <ToggleSwitch flag={flag} onChange={toggle} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SubmerchantPage() {
  const [rows, setRows] = useState(payupSubmerchantRows);
  const [message, setMessage] = useState("PayUp 운영 /list에서 확인했거나 PayUp이 발급한 subMerchantId를 그대로 입력하세요.");
  const [busy, setBusy] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const businessNumber = String(form.get("businessNumber") ?? "").replace(/[^0-9]/g, "");
    const companyName = String(form.get("companyName") ?? "").trim();
    const role = String(form.get("role") ?? "상품 공급사");
    const subMerchantId = String(form.get("subMerchantId") ?? "").trim();

    if (businessNumber.length !== 10 || !companyName || !/^[A-Za-z0-9_-]{1,20}$/.test(subMerchantId)) {
      setMessage("사업자번호 10자리, 상호, PayUp이 확인한 subMerchantId(20자 이내)를 확인해 주세요.");
      return;
    }

    const draft: PayupSubmerchantRow = {
      id: `sandbox-${Date.now()}`,
      organizationId: `org-${businessNumber}`,
      role,
      businessNumber,
      companyName,
      subMerchantId,
      representative: String(form.get("representative") ?? "").trim() || "미입력",
      accountBank: String(form.get("accountBank") ?? "").trim() || "미입력",
      accountMasked: "등록 후 마스킹",
      status: "REGISTERING",
      payupSync: "미확인",
      lastSyncedAt: "-",
    };

    setBusy(true);
    const result = await callPayupAdmin<{ ok: boolean; responseCode: string; responseMsg: string }>("payupAdminSubmerchants", {
      action: "upsert",
      gubun: "1",
      subMerchantId,
      subMerchantName: companyName,
      ownerName: draft.representative,
      phoneNumber: String(form.get("phoneNumber") ?? "").replace(/[^0-9]/g, ""),
      subBusinessNumber: businessNumber,
      accountBank: draft.accountBank,
      accountNumber: String(form.get("accountNumber") ?? "").replace(/[^0-9]/g, ""),
      accountOwner: String(form.get("accountOwner") ?? "").trim(),
    });

    setRows((current) => [draft, ...current]);
    setMessage(result.ok ? `PayUp 하위사업자 등록 요청을 완료했습니다: ${result.data.responseCode} ${result.data.responseMsg}` : `샌드박스 등록 행을 추가했습니다. 실제 API 반영 전: ${result.error}`);
    setBusy(false);
    event.currentTarget.reset();
  }

  async function syncAll() {
    setBusy(true);
    const result = await callPayupAdmin<{ ok: boolean; listCount: number }>("payupAdminSubmerchants", { action: "list" });
    setMessage(result.ok ? `PayUp 하위사업자 ${result.data.listCount}건을 조회했습니다.` : `실제 목록 동기화 전: ${result.error}`);
    setBusy(false);
  }

  const columns: SpreadsheetColumn<PayupSubmerchantRow>[] = [
    { key: "role", label: "역할", value: (row) => row.role },
    { key: "businessNumber", label: "사업자번호", value: (row) => row.businessNumber },
    { key: "companyName", label: "상호", value: (row) => row.companyName, width: "180px" },
    { key: "subMerchantId", label: "subMerchantId", value: (row) => row.subMerchantId, width: "190px" },
    { key: "representative", label: "대표자", value: (row) => row.representative },
    { key: "accountBank", label: "은행", value: (row) => row.accountBank },
    { key: "accountMasked", label: "정산계좌", value: (row) => row.accountMasked, width: "190px" },
    { key: "status", label: "내부상태", value: (row) => row.status, render: (row) => <StatusBadge value={row.status} /> },
    { key: "payupSync", label: "PayUp 대사", value: (row) => row.payupSync, render: (row) => <StatusBadge value={row.payupSync} /> },
    { key: "lastSyncedAt", label: "마지막 동기화", value: (row) => row.lastSyncedAt, width: "170px" },
  ];

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">하위사업자 간편 등록</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">ID를 임의 생성하지 않습니다. 운영 MID에 등록된 값과 대소문자까지 정확히 일치해야 합니다.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={syncAll} disabled={busy} className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 disabled:opacity-50">PayUp 전체 동기화</button>
            <button type="button" onClick={() => downloadCsv("payup-submerchant-template.csv", [
              { key: "role", label: "역할", value: (row: PayupSubmerchantRow) => row.role },
              { key: "businessNumber", label: "사업자번호", value: (row: PayupSubmerchantRow) => row.businessNumber },
              { key: "companyName", label: "상호", value: (row: PayupSubmerchantRow) => row.companyName },
              { key: "subMerchantId", label: "subMerchantId", value: (row: PayupSubmerchantRow) => row.subMerchantId },
            ], rows)} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-black text-white">등록 엑셀 다운로드</button>
          </div>
        </div>
        <form onSubmit={register} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-xs font-black text-slate-600">역할<select name="role" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold"><option>상품 공급사</option><option>A5WS 판매 파트너</option><option>위드커머스 본사</option><option>A5LS 운영사</option></select></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">PayUp subMerchantId<input name="subMerchantId" required maxLength={20} placeholder="예: wc2158159188" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">사업자번호<input name="businessNumber" required placeholder="하이픈 없이 10자리" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">상호<input name="companyName" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">대표자<input name="representative" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">연락처<input name="phoneNumber" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">은행명<input name="accountBank" required placeholder="한글 은행명" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">계좌번호<input name="accountNumber" required placeholder="하이픈 없이 숫자" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">예금주<input name="accountOwner" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
          <button type="submit" disabled={busy} className="h-11 rounded-md bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50 md:col-span-2 xl:col-span-4">{busy ? "처리 중" : "검증 후 PayUp 등록"}</button>
        </form>
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">{message}</div>
      </section>
      <SpreadsheetTable title="하위사업자 원장" rows={rows} columns={columns} filename="payup-submerchants.csv" helper="공급사·파트너·본사 등록상태와 PayUp 조회 결과를 한 표에서 비교합니다." />
    </div>
  );
}

function TransactionsPage() {
  const columns: SpreadsheetColumn<PayupTransactionRow>[] = [
    { key: "approvedAt", label: "승인일시", value: (row) => row.approvedAt, width: "170px" },
    { key: "channel", label: "채널", value: (row) => row.channel },
    { key: "orderNumber", label: "주문번호", value: (row) => row.orderNumber, width: "210px" },
    { key: "transactionId", label: "원거래번호", value: (row) => row.transactionId, width: "190px" },
    { key: "subTransactionId", label: "하위거래번호", value: (row) => row.subTransactionId, width: "210px" },
    { key: "subMerchantId", label: "subMerchantId", value: (row) => row.subMerchantId, width: "180px" },
    { key: "organizationName", label: "수취 사업자", value: (row) => row.organizationName },
    { key: "distributionType", label: "분배유형", value: (row) => row.distributionType },
    { key: "amount", label: "분배금액", value: (row) => row.amount, render: (row) => money(row.amount), align: "right" },
    { key: "status", label: "상태", value: (row) => row.status, render: (row) => <StatusBadge value={row.status} /> },
  ];
  return (
    <div className="grid gap-5">
      <Notice title="거래·분배 대사">
        <p>PayUp 원거래 1건과 공급사·위드커머스·파트너 하위거래를 행 단위로 펼쳐서 확인합니다.</p>
        <p>파트너 화면에는 본인 subMerchantId 행만 Projection으로 공유합니다.</p>
      </Notice>
      <SpreadsheetTable title="PayUp 거래 및 cartPayList 분배 원장" rows={payupTransactionRows} columns={columns} filename="payup-transactions.csv" />
    </div>
  );
}

function SettlementsPage() {
  const columns: SpreadsheetColumn<PayupSettlementRow>[] = [
    { key: "supplyDate", label: "지급예정일", value: (row) => row.supplyDate },
    { key: "targetDate", label: "정산대상일", value: (row) => row.targetDate },
    { key: "organizationName", label: "사업자", value: (row) => row.organizationName },
    { key: "subMerchantId", label: "subMerchantId", value: (row) => row.subMerchantId, width: "180px" },
    { key: "supplyType", label: "지급상태", value: (row) => row.supplyType, render: (row) => <StatusBadge value={row.supplyType} />, width: "160px" },
    { key: "accountCount", label: "정산건수", value: (row) => row.accountCount, align: "right" },
    { key: "accountAmount", label: "정산금액", value: (row) => row.accountAmount, render: (row) => money(row.accountAmount), align: "right" },
    { key: "feeAmount", label: "수수료", value: (row) => row.feeAmount, render: (row) => money(row.feeAmount), align: "right" },
    { key: "vatAmount", label: "부가세", value: (row) => row.vatAmount, render: (row) => money(row.vatAmount), align: "right" },
    { key: "supplyAmount", label: "지급액", value: (row) => row.supplyAmount, render: (row) => money(row.supplyAmount), align: "right" },
    { key: "reconciliation", label: "대사", value: (row) => row.reconciliation, render: (row) => <StatusBadge value={row.reconciliation} /> },
  ];
  return (
    <div className="grid gap-5">
      <Notice title="정산 원장">
        <p>PayUp 지급상태 0001~0009를 원문 상태로 보존하고 내부 정산원장과 비교합니다.</p>
      </Notice>
      <SpreadsheetTable title="하위사업자별 정산내역" rows={payupSettlementRows} columns={columns} filename="payup-settlements.csv" />
    </div>
  );
}

function CancellationsPage() {
  const [message, setMessage] = useState("전체취소만 지원합니다. 부분취소는 공식 API 제공 전까지 잠겨 있습니다.");
  const columns: SpreadsheetColumn<PayupCancellationRow>[] = [
    { key: "requestedAt", label: "요청일시", value: (row) => row.requestedAt, width: "170px" },
    { key: "orderNumber", label: "주문번호", value: (row) => row.orderNumber, width: "210px" },
    { key: "transactionId", label: "PayUp 거래번호", value: (row) => row.transactionId, width: "190px" },
    { key: "amount", label: "전체취소금액", value: (row) => row.amount, render: (row) => money(row.amount), align: "right" },
    { key: "reason", label: "취소사유", value: (row) => row.reason, width: "220px" },
    { key: "status", label: "처리상태", value: (row) => row.status, render: (row) => <StatusBadge value={row.status} /> },
    { key: "responseCode", label: "응답코드", value: (row) => row.responseCode },
    { key: "owner", label: "담당", value: (row) => row.owner },
  ];

  async function testCancel() {
    const sample = payupCancellationRows[0];
    const result = await callPayupAdmin<{ ok: boolean; responseCode: string; responseMsg: string }>("payupAdminCancel", {
      transactionId: sample.transactionId,
      reason: "샌드박스 전체취소 버튼 검증",
      dryRun: true,
    });
    setMessage(result.ok ? `취소 경로 점검 완료: ${result.data.responseCode} ${result.data.responseMsg}` : `실제 취소 호출 전: ${result.error}`);
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 md:grid-cols-2">
        <Notice tone="green" title="전체취소 회로">
          <p>transactionId를 기준으로 정산 HOLD → cancel2 → 거래조회 재대사 → 배분원장 역분개 순서로 처리합니다.</p>
          <button type="button" onClick={testCancel} className="mt-3 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white">전체취소 경로 점검</button>
        </Notice>
        <Notice tone="red" title="부분취소 LOCKED OFF">
          <p>PayUp 공식 부분취소 API가 제공되지 않았으므로 품목·수량 단위 취소 버튼을 노출하지 않습니다.</p>
        </Notice>
      </section>
      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">{message}</div>
      <SpreadsheetTable title="전체취소 및 수동처리 큐" rows={payupCancellationRows} columns={columns} filename="payup-cancellations.csv" />
    </div>
  );
}

function LogsPage() {
  const columns: SpreadsheetColumn<PayupLogRow>[] = [
    { key: "occurredAt", label: "발생일시", value: (row) => row.occurredAt, width: "170px" },
    { key: "category", label: "로그유형", value: (row) => row.category },
    { key: "action", label: "이벤트", value: (row) => row.action, width: "240px" },
    { key: "actor", label: "실행자", value: (row) => row.actor, width: "190px" },
    { key: "organizationName", label: "사업자", value: (row) => row.organizationName },
    { key: "target", label: "대상", value: (row) => row.target, width: "210px" },
    { key: "result", label: "결과", value: (row) => row.result, render: (row) => <StatusBadge value={row.result} /> },
    { key: "correlationId", label: "상관ID", value: (row) => row.correlationId, width: "180px" },
    { key: "message", label: "내용", value: (row) => row.message, width: "420px" },
  ];
  return (
    <div className="grid gap-5">
      <Notice title="통합 로그">
        <p>API 전문 로그, 관리자 변경 감사로그, 공급사·파트너 판매 이벤트를 같은 correlationId로 추적합니다.</p>
        <p>API KEY·Signature·AuthToken·계좌번호 원문은 로그에서 제거합니다.</p>
      </Notice>
      <SpreadsheetTable title="PayUp API · 감사 · 사업 이벤트 로그" rows={payupLogRows} columns={columns} filename="payup-logs.csv" />
    </div>
  );
}

export function PayupAdminWorkspace({ view }: { view: PayupAdminView }) {
  if (view === "overview") return <OverviewPage />;
  if (view === "connection") return <ConnectionPage />;
  if (view === "switchboard") return <SwitchboardPage />;
  if (view === "submerchants") return <SubmerchantPage />;
  if (view === "transactions") return <TransactionsPage />;
  if (view === "settlements") return <SettlementsPage />;
  if (view === "cancellations") return <CancellationsPage />;
  return <LogsPage />;
}
