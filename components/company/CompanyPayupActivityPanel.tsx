"use client";

import { useEffect, useMemo, useState } from "react";
import { callPayupAdmin } from "@/lib/payup/adminClient";
import { readPortalSession } from "@/lib/auth/session";

type ActivityRow = {
  id: string;
  occurredAt: string;
  eventType: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  saleAmount: number;
  receivableType: string;
  receivableAmount: number;
  transactionStatus: string;
  settlementStatus: string;
  cancelStatus: string;
  message: string;
};

const sandboxRows: ActivityRow[] = [
  {
    id: "partner-sale-001",
    occurredAt: "2026-07-29 09:30:18",
    eventType: "PARTNER.SALE_RECORDED",
    orderNumber: "A5WS-20260729-0001",
    productName: "대추방울토마토 500g",
    quantity: 1,
    saleAmount: 10400,
    receivableType: "파트너 차액",
    receivableAmount: 100,
    transactionStatus: "대사대기",
    settlementStatus: "지급보류",
    cancelStatus: "정상",
    message: "고객 결제 승인 후 파트너 판매로그가 생성됐습니다.",
  },
  {
    id: "supplier-sale-001",
    occurredAt: "2026-07-29 09:30:18",
    eventType: "SUPPLIER.SALE_RECORDED",
    orderNumber: "A5WS-20260729-0001",
    productName: "대추방울토마토 500g",
    quantity: 1,
    saleAmount: 10400,
    receivableType: "상품대금",
    receivableAmount: 10000,
    transactionStatus: "대사대기",
    settlementStatus: "지급예정",
    cancelStatus: "정상",
    message: "공급사 상품대금 원장이 생성됐습니다.",
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function numberValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
}

function normalizeRows(list: unknown[]): ActivityRow[] {
  return list.map((raw, index) => {
    const row = asRecord(raw);
    return {
      id: text(row.id) || `activity-${index}`,
      occurredAt: text(row.occurred_at_iso ?? row.occurredAt),
      eventType: text(row.event_type ?? row.eventType),
      orderNumber: text(row.order_number ?? row.orderNumber),
      productName: text(row.product_name ?? row.productName),
      quantity: numberValue(row.quantity),
      saleAmount: numberValue(row.sale_amount ?? row.saleAmount),
      receivableType: text(row.receivable_type ?? row.receivableType),
      receivableAmount: numberValue(row.receivable_amount ?? row.receivableAmount),
      transactionStatus: text(row.transaction_status ?? row.transactionStatus),
      settlementStatus: text(row.settlement_status ?? row.settlementStatus),
      cancelStatus: text(row.cancel_status ?? row.cancelStatus),
      message: text(row.message),
    };
  });
}

function downloadCsv(rows: ActivityRow[]) {
  const columns: Array<[string, (row: ActivityRow) => string | number]> = [
    ["발생일시", (row) => row.occurredAt],
    ["이벤트", (row) => row.eventType],
    ["주문번호", (row) => row.orderNumber],
    ["상품명", (row) => row.productName],
    ["수량", (row) => row.quantity],
    ["고객결제금액", (row) => row.saleAmount],
    ["내 수취유형", (row) => row.receivableType],
    ["내 수취금액", (row) => row.receivableAmount],
    ["거래상태", (row) => row.transactionStatus],
    ["정산상태", (row) => row.settlementStatus],
    ["취소상태", (row) => row.cancelStatus],
    ["내용", (row) => row.message],
  ];
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [columns.map(([label]) => quote(label)).join(","), ...rows.map((row) => columns.map(([, getter]) => quote(getter(row))).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "my-payup-sales-settlements.csv";
  anchor.click();
  URL.revokeObjectURL(href);
}

function statusTone(value: string) {
  if (/완료|성공|일치|정상/.test(value)) return "bg-emerald-100 text-emerald-800";
  if (/실패|불일치|수동|취소/.test(value)) return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

export function CompanyPayupActivityPanel() {
  const [rows, setRows] = useState(sandboxRows);
  const [message, setMessage] = useState("샌드박스 판매·정산 로그를 표시 중입니다.");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [companyName, setCompanyName] = useState("로그인 사업자");

  useEffect(() => {
    const session = readPortalSession("company");
    if (session?.displayName) setCompanyName(session.displayName);
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(keyword)));
  }, [query, rows]);

  const metrics = useMemo(() => ({
    sales: rows.reduce((sum, row) => sum + row.saleAmount, 0),
    receivable: rows.reduce((sum, row) => sum + row.receivableAmount, 0),
    pending: rows.filter((row) => !/완료/.test(row.settlementStatus)).length,
  }), [rows]);

  async function refresh() {
    setBusy(true);
    const result = await callPayupAdmin<{ ok: boolean; listCount: number; list: unknown[] }>("payupPartnerActivity", { limit: 300 });
    if (result.ok) {
      const next = normalizeRows(Array.isArray(result.data.list) ? result.data.list : []);
      if (next.length) setRows(next);
      setMessage(`내 사업자 범위 판매·정산 로그 ${result.data.listCount}건을 조회했습니다.`);
    } else {
      setMessage(`샌드박스 유지: ${result.error}`);
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <h2 className="text-lg font-black">{companyName} 전용 PayUp 판매·정산 로그</h2>
        <p className="mt-2 text-sm font-semibold leading-6">다른 공급사·파트너 정보는 표시하지 않고 로그인 토큰에 연결된 organization_id 또는 사업자번호 범위만 조회합니다.</p>
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-black text-slate-500">관련 고객 결제액</p><p className="mt-2 text-2xl font-black text-slate-950">{money(metrics.sales)}</p></article>
        <article className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-black text-slate-500">내 수취 예정액</p><p className="mt-2 text-2xl font-black text-emerald-700">{money(metrics.receivable)}</p></article>
        <article className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-black text-slate-500">처리 대기</p><p className="mt-2 text-2xl font-black text-amber-700">{metrics.pending}건</p></article>
      </section>
      <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-100 px-4 py-3">
          <div><h2 className="font-black text-slate-950">판매·거래·정산 이벤트 원장</h2><p className="mt-1 text-xs font-bold text-slate-500">{message}</p></div>
          <div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문·상품 검색" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold" /><button type="button" onClick={refresh} disabled={busy} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-black text-white disabled:opacity-50">{busy ? "조회 중" : "내 로그 새로고침"}</button><button type="button" onClick={() => downloadCsv(filtered)} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white">엑셀 CSV</button></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-max border-collapse text-left text-xs">
            <thead className="bg-[#d9ead3] text-slate-900"><tr>{["행", "발생일시", "주문번호", "상품", "수량", "고객 결제액", "내 수취유형", "내 수취액", "거래", "정산", "취소", "내용"].map((label) => <th key={label} className="border-b border-r border-slate-300 px-3 py-2 font-black">{label}</th>)}</tr></thead>
            <tbody>{filtered.map((row, index) => <tr key={row.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50"><td className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center font-bold text-slate-500">{index + 1}</td><td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2">{row.occurredAt}</td><td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-bold">{row.orderNumber}</td><td className="min-w-56 border-b border-r border-slate-200 px-3 py-2">{row.productName}</td><td className="border-b border-r border-slate-200 px-3 py-2 text-right">{row.quantity}</td><td className="border-b border-r border-slate-200 px-3 py-2 text-right">{money(row.saleAmount)}</td><td className="border-b border-r border-slate-200 px-3 py-2">{row.receivableType}</td><td className="border-b border-r border-slate-200 px-3 py-2 text-right font-black text-emerald-700">{money(row.receivableAmount)}</td><td className="border-b border-r border-slate-200 px-3 py-2"><span className={`rounded-full px-2 py-1 font-black ${statusTone(row.transactionStatus)}`}>{row.transactionStatus}</span></td><td className="border-b border-r border-slate-200 px-3 py-2"><span className={`rounded-full px-2 py-1 font-black ${statusTone(row.settlementStatus)}`}>{row.settlementStatus}</span></td><td className="border-b border-r border-slate-200 px-3 py-2"><span className={`rounded-full px-2 py-1 font-black ${statusTone(row.cancelStatus)}`}>{row.cancelStatus}</span></td><td className="min-w-80 border-b border-r border-slate-200 px-3 py-2">{row.message}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
