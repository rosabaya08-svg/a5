"use client";

import { useMemo, useState, type ReactNode } from "react";
import { payupLogRows, payupSettlementRows, payupTransactionRows } from "@/data/admin/payupSandbox";
import { callPayupAdmin } from "@/lib/payup/adminClient";

type GridColumn<Row> = {
  label: string;
  width?: string;
  value: (row: Row) => string | number;
  render?: (row: Row) => ReactNode;
};

type TransactionDisplayRow = {
  id: string;
  approvedAt: string;
  orderNumber: string;
  transactionId: string;
  subTransactionId: string;
  subMerchantId: string;
  organizationName: string;
  distributionType: string;
  totalAmount: number;
  amount: number;
  status: string;
};

type SettlementDisplayRow = {
  id: string;
  closeDate: string;
  targetDate: string;
  supplyDate: string;
  subMerchantId: string;
  organizationName: string;
  supplyType: string;
  accountCount: number;
  accountAmount: number;
  feeAmount: number;
  vatAmount: number;
  supplyAmount: number;
  transactionId: string;
  subTransactionId: string;
  orderNumber: string;
  reconciliation: string;
};

type LogDisplayRow = {
  id: string;
  occurredAt: string;
  category: string;
  action: string;
  actor: string;
  organizationName: string;
  target: string;
  result: string;
  correlationId: string;
  message: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
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

function todayToken() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function statusClass(value: string) {
  if (/성공|완료|일치|ACTIVE|0003/i.test(value)) return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (/실패|불일치|ERROR|수동|차단/i.test(value)) return "bg-red-100 text-red-800 ring-red-200";
  return "bg-amber-100 text-amber-900 ring-amber-200";
}

function Status({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ring-1 ${statusClass(value)}`}>{value || "대기"}</span>;
}

function downloadCsv<Row>(filename: string, columns: GridColumn<Row>[], rows: Row[]) {
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

function ExcelGrid<Row extends { id: string }>({
  title,
  rows,
  columns,
  filename,
}: {
  title: string;
  rows: Row[];
  columns: GridColumn<Row>[];
  filename: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => columns.some((column) => String(column.value(row)).toLowerCase().includes(keyword)));
  }, [columns, query, rows]);

  return (
    <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-100 px-4 py-3">
        <div>
          <h2 className="font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">전체 {rows.length}건 · 검색 {filtered.length}건</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="표 검색" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold" />
          <button type="button" onClick={() => downloadCsv(filename, columns, filtered)} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-black text-white">엑셀 CSV</button>
        </div>
      </div>
      <div className="max-h-[640px] overflow-auto">
        <table className="min-w-max border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#d9ead3] text-slate-900">
            <tr>
              <th className="border-b border-r border-slate-300 px-3 py-2 text-center">행</th>
              {columns.map((column) => <th key={column.label} style={{ minWidth: column.width ?? "140px" }} className="border-b border-r border-slate-300 px-3 py-2 font-black">{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50">
                <td className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center font-bold text-slate-500">{index + 1}</td>
                {columns.map((column) => <td key={`${row.id}-${column.label}`} className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-700">{column.render ? column.render(row) : column.value(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SyncBar({
  title,
  message,
  busy,
  from,
  to,
  subMerchantId,
  onFrom,
  onTo,
  onSubMerchantId,
  onSync,
  extra,
}: {
  title: string;
  message: string;
  busy: boolean;
  from: string;
  to: string;
  subMerchantId: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onSubMerchantId: (value: string) => void;
  onSync: () => void;
  extra?: ReactNode;
}) {
  return (
    <section className="rounded-md border border-blue-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-600">{message}</p>
        </div>
        <label className="grid gap-1 text-xs font-black text-slate-600">시작일<input value={from} onChange={(event) => onFrom(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} className="h-10 w-32 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">종료일<input value={to} onChange={(event) => onTo(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} className="h-10 w-32 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">하위사업자 선택<input value={subMerchantId} onChange={(event) => onSubMerchantId(event.target.value.slice(0, 20))} placeholder="전체" className="h-10 w-44 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        {extra}
        <button type="button" onClick={onSync} disabled={busy} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-black text-white disabled:opacity-50">{busy ? "조회 중" : "PayUp 조회·대사"}</button>
      </div>
    </section>
  );
}

function sampleTransactions(): TransactionDisplayRow[] {
  return payupTransactionRows.map((row) => ({
    id: row.id,
    approvedAt: row.approvedAt,
    orderNumber: row.orderNumber,
    transactionId: row.transactionId,
    subTransactionId: row.subTransactionId,
    subMerchantId: row.subMerchantId,
    organizationName: row.organizationName,
    distributionType: row.distributionType,
    totalAmount: payupTransactionRows.filter((candidate) => candidate.transactionId === row.transactionId).reduce((sum, candidate) => sum + candidate.amount, 0),
    amount: row.amount,
    status: row.status,
  }));
}

function flattenTransactions(list: unknown[]): TransactionDisplayRow[] {
  const rows: TransactionDisplayRow[] = [];
  for (const raw of list) {
    const transaction = asRecord(raw);
    const transactionId = stringValue(transaction.transactionId ?? transaction.transaction_id);
    const orderNumber = stringValue(transaction.orderNumber ?? transaction.order_number);
    const approvedAt = stringValue(transaction.authDatetime ?? transaction.auth_datetime ?? transaction.approvedAt);
    const totalAmount = numberValue(transaction.totalAmount ?? transaction.total_amount ?? transaction.amount);
    const statusCode = stringValue(transaction.statusCode ?? transaction.status_code ?? transaction.status) || "대사대기";
    const subList = Array.isArray(transaction.subList) ? transaction.subList : Array.isArray(transaction.sub_list) ? transaction.sub_list : [];
    if (!subList.length) {
      rows.push({ id: transactionId || `${orderNumber}-${rows.length}`, approvedAt, orderNumber, transactionId, subTransactionId: "", subMerchantId: "", organizationName: "", distributionType: "PayUp 거래", totalAmount, amount: totalAmount, status: statusCode });
      continue;
    }
    for (const rawSub of subList) {
      const sub = asRecord(rawSub);
      const subTransactionId = stringValue(sub.subTransactionId ?? sub.sub_transaction_id);
      rows.push({
        id: `${transactionId}-${subTransactionId || rows.length}`,
        approvedAt,
        orderNumber,
        transactionId,
        subTransactionId,
        subMerchantId: stringValue(sub.subMerchantId ?? sub.sub_merchant_id),
        organizationName: stringValue(sub.subMerchantName ?? sub.sub_merchant_name),
        distributionType: "PayUp 하위거래",
        totalAmount,
        amount: numberValue(sub.amount),
        status: statusCode === "2001" ? "승인성공" : statusCode === "9001" ? "취소성공" : statusCode,
      });
    }
  }
  return rows;
}

export function PayupTransactionsLivePanel() {
  const today = todayToken();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [subMerchantId, setSubMerchantId] = useState("");
  const [rows, setRows] = useState<TransactionDisplayRow[]>(sampleTransactions);
  const [message, setMessage] = useState("샌드박스 표를 표시 중입니다. 조회 버튼으로 PayUp 거래내역과 내부 원장을 대사합니다.");
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    const result = await callPayupAdmin<{ ok: boolean; responseCode: string; responseMsg: string; listCount: number; list: unknown[] }>("payupAdminTransactions", { searchFromDate: from, searchToDate: to, subMerchantId });
    if (result.ok) {
      const next = flattenTransactions(Array.isArray(result.data.list) ? result.data.list : []);
      if (next.length) setRows(next);
      setMessage(`${result.data.responseCode} · ${result.data.responseMsg} · ${result.data.listCount}건 조회`);
    } else {
      setMessage(`샌드박스 유지: ${result.error}`);
    }
    setBusy(false);
  }

  const columns: GridColumn<TransactionDisplayRow>[] = [
    { label: "승인일시", value: (row) => row.approvedAt, width: "170px" },
    { label: "주문번호", value: (row) => row.orderNumber, width: "210px" },
    { label: "원거래번호", value: (row) => row.transactionId, width: "190px" },
    { label: "하위거래번호", value: (row) => row.subTransactionId, width: "210px" },
    { label: "subMerchantId", value: (row) => row.subMerchantId, width: "180px" },
    { label: "하위사업자", value: (row) => row.organizationName, width: "180px" },
    { label: "분배유형", value: (row) => row.distributionType },
    { label: "승인총액", value: (row) => row.totalAmount, render: (row) => money(row.totalAmount) },
    { label: "분배금액", value: (row) => row.amount, render: (row) => money(row.amount) },
    { label: "상태", value: (row) => row.status, render: (row) => <Status value={row.status} /> },
  ];

  return <div className="grid gap-5"><SyncBar title="거래내역 조회·대사" message={message} busy={busy} from={from} to={to} subMerchantId={subMerchantId} onFrom={setFrom} onTo={setTo} onSubMerchantId={setSubMerchantId} onSync={sync} /><ExcelGrid title="PayUp 원거래·하위거래·분배 원장" rows={rows} columns={columns} filename="payup-transaction-reconciliation.csv" /></div>;
}

function sampleSettlements(): SettlementDisplayRow[] {
  return payupSettlementRows.map((row) => ({
    id: row.id,
    closeDate: "",
    targetDate: row.targetDate,
    supplyDate: row.supplyDate,
    subMerchantId: row.subMerchantId,
    organizationName: row.organizationName,
    supplyType: row.supplyType,
    accountCount: row.accountCount,
    accountAmount: row.accountAmount,
    feeAmount: row.feeAmount,
    vatAmount: row.vatAmount,
    supplyAmount: row.supplyAmount,
    transactionId: "",
    subTransactionId: "",
    orderNumber: "",
    reconciliation: row.reconciliation,
  }));
}

function normalizeSettlements(list: unknown[], action: "list" | "detail"): SettlementDisplayRow[] {
  return list.map((raw, index) => {
    const row = asRecord(raw);
    return {
      id: `${stringValue(row.subMerchantId ?? row.sub_merchant_id)}-${stringValue(row.supplyDate ?? row.supply_date)}-${index}`,
      closeDate: stringValue(row.closeDate ?? row.close_date),
      targetDate: stringValue(row.targetDate ?? row.target_date),
      supplyDate: stringValue(row.supplyDate ?? row.supply_date),
      subMerchantId: stringValue(row.subMerchantId ?? row.sub_merchant_id),
      organizationName: stringValue(row.subMerchantName ?? row.sub_merchant_name),
      supplyType: action === "detail" ? "정산상세" : stringValue(row.supplyType ?? row.supply_type),
      accountCount: numberValue(row.accountCount ?? row.account_count),
      accountAmount: numberValue(row.accountAmount ?? row.account_amount ?? row.amount),
      feeAmount: numberValue(row.feeAmount ?? row.fee_amount ?? row.agentFee ?? row.agent_fee),
      vatAmount: numberValue(row.vatAmount ?? row.vat_amount ?? row.agentVat ?? row.agent_vat),
      supplyAmount: numberValue(row.supplyAmount ?? row.supply_amount ?? row.amount),
      transactionId: stringValue(row.transactionId ?? row.transaction_id),
      subTransactionId: stringValue(row.subTransactionId ?? row.sub_transaction_id),
      orderNumber: stringValue(row.orderNumber ?? row.order_number),
      reconciliation: "PayUp 조회",
    };
  });
}

export function PayupSettlementsLivePanel() {
  const today = todayToken();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [subMerchantId, setSubMerchantId] = useState("");
  const [action, setAction] = useState<"list" | "detail">("list");
  const [rows, setRows] = useState<SettlementDisplayRow[]>(sampleSettlements);
  const [message, setMessage] = useState("지급일자 기준 샌드박스 정산표입니다. 정산목록과 거래별 상세를 전환해 조회할 수 있습니다.");
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    const result = await callPayupAdmin<{ ok: boolean; responseCode: string; responseMsg: string; listCount: number; list: unknown[] }>("payupAdminSettlements", { action, searchFromDate: from, searchToDate: to, dateType: "1", subMerchantId });
    if (result.ok) {
      const next = normalizeSettlements(Array.isArray(result.data.list) ? result.data.list : [], action);
      if (next.length) setRows(next);
      setMessage(`${result.data.responseCode} · ${result.data.responseMsg} · ${result.data.listCount}건 조회`);
    } else {
      setMessage(`샌드박스 유지: ${result.error}`);
    }
    setBusy(false);
  }

  const columns: GridColumn<SettlementDisplayRow>[] = [
    { label: "정산시작일", value: (row) => row.closeDate },
    { label: "정산대상일", value: (row) => row.targetDate },
    { label: "지급예정일", value: (row) => row.supplyDate },
    { label: "subMerchantId", value: (row) => row.subMerchantId, width: "180px" },
    { label: "하위사업자", value: (row) => row.organizationName, width: "180px" },
    { label: "지급상태", value: (row) => row.supplyType, render: (row) => <Status value={row.supplyType} /> },
    { label: "정산건수", value: (row) => row.accountCount },
    { label: "정산금액", value: (row) => row.accountAmount, render: (row) => money(row.accountAmount) },
    { label: "수수료", value: (row) => row.feeAmount, render: (row) => money(row.feeAmount) },
    { label: "부가세", value: (row) => row.vatAmount, render: (row) => money(row.vatAmount) },
    { label: "지급액", value: (row) => row.supplyAmount, render: (row) => money(row.supplyAmount) },
    { label: "원거래번호", value: (row) => row.transactionId, width: "190px" },
    { label: "하위거래번호", value: (row) => row.subTransactionId, width: "210px" },
    { label: "주문번호", value: (row) => row.orderNumber, width: "210px" },
    { label: "대사", value: (row) => row.reconciliation, render: (row) => <Status value={row.reconciliation} /> },
  ];

  return (
    <div className="grid gap-5">
      <SyncBar
        title="정산내역·상세 조회"
        message={message}
        busy={busy}
        from={from}
        to={to}
        subMerchantId={subMerchantId}
        onFrom={setFrom}
        onTo={setTo}
        onSubMerchantId={setSubMerchantId}
        onSync={sync}
        extra={<label className="grid gap-1 text-xs font-black text-slate-600">조회표<select value={action} onChange={(event) => setAction(event.target.value as "list" | "detail")} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-bold"><option value="list">정산목록</option><option value="detail">정산상세</option></select></label>}
      />
      <ExcelGrid title="PayUp 정산 및 지급대사 원장" rows={rows} columns={columns} filename="payup-settlement-reconciliation.csv" />
    </div>
  );
}

function sampleLogs(): LogDisplayRow[] {
  return payupLogRows.map((row) => ({ ...row }));
}

function normalizeLogs(list: unknown[]): LogDisplayRow[] {
  return list.map((raw, index) => {
    const row = asRecord(raw);
    return {
      id: stringValue(row.id) || `log-${index}`,
      occurredAt: stringValue(row.occurredAt ?? row.created_at_iso ?? row.createdAtIso),
      category: stringValue(row.category ?? row.log_type ?? row.source) || "API",
      action: stringValue(row.action ?? row.operation),
      actor: stringValue(row.actor ?? row.actor_email),
      organizationName: stringValue(row.organizationName ?? row.organization_name ?? row.sub_merchant_id),
      target: stringValue(row.target ?? row.target_id ?? row.path),
      result: stringValue(row.result ?? row.status),
      correlationId: stringValue(row.correlationId ?? row.correlation_id),
      message: stringValue(row.message ?? row.response_msg ?? row.reason),
    };
  });
}

export function PayupLogsLivePanel() {
  const [rows, setRows] = useState<LogDisplayRow[]>(sampleLogs);
  const [message, setMessage] = useState("샌드박스 통합로그입니다. 서버 배포 후 실제 API·감사·사업이벤트 로그를 조회합니다.");
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    const result = await callPayupAdmin<{ ok: boolean; listCount: number; list: unknown[] }>("payupAdminLogs", { limit: 300 });
    if (result.ok) {
      const next = normalizeLogs(Array.isArray(result.data.list) ? result.data.list : []);
      if (next.length) setRows(next);
      setMessage(`서버 통합로그 ${result.data.listCount}건을 조회했습니다.`);
    } else {
      setMessage(`샌드박스 유지: ${result.error}`);
    }
    setBusy(false);
  }

  const columns: GridColumn<LogDisplayRow>[] = [
    { label: "발생일시", value: (row) => row.occurredAt, width: "170px" },
    { label: "로그유형", value: (row) => row.category },
    { label: "이벤트", value: (row) => row.action, width: "240px" },
    { label: "실행자", value: (row) => row.actor, width: "190px" },
    { label: "사업자", value: (row) => row.organizationName, width: "170px" },
    { label: "대상", value: (row) => row.target, width: "220px" },
    { label: "결과", value: (row) => row.result, render: (row) => <Status value={row.result} /> },
    { label: "상관ID", value: (row) => row.correlationId, width: "190px" },
    { label: "내용", value: (row) => row.message, width: "440px" },
  ];

  return <div className="grid gap-5"><section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-white p-4 shadow-sm"><div><h2 className="text-lg font-black text-slate-950">API·감사·사업이벤트 통합조회</h2><p className="mt-1 text-sm font-semibold text-slate-600">{message}</p></div><button type="button" onClick={sync} disabled={busy} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? "조회 중" : "서버 로그 새로고침"}</button></section><ExcelGrid title="PayUp 통합 로그 원장" rows={rows} columns={columns} filename="payup-integrated-logs.csv" /></div>;
}
