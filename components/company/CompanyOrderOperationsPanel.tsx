"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CompanyBulkInvoicePanel,
  type BulkInvoiceRow,
  type CompanyCarrierOption,
} from "@/components/company/CompanyBulkInvoicePanel";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  customerName: string;
  customerPhoneMasked: string;
  receiverName: string;
  receiverPhone: string;
  deliveryMethod: string;
  receiverPostalCode: string;
  receiverAddress: string;
  receiverAddressDetail: string;
  deliveryMemo: string;
  totalAmount: number;
  paidAt: string;
  providerTransactionId: string;
  pgProvider: string;
};

type ItemRow = {
  id: string;
  orderNo: string;
  companyId: string;
  productId: string;
  optionId: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  fulfillmentStatus: string;
  deliveryStatus: string;
  carrierCode: string;
  carrierName: string;
  invoiceNumber: string;
  shipmentId: string;
  sellerCompanyName: string;
  sellerBusinessNo: string;
  sellerRepresentativeName: string;
  sellerCustomerServicePhone: string;
  sellerPublicEmail: string;
  sellerReturnAddress: string;
  sellerContactVerified: boolean;
  createdAt: string;
};

type ClaimRow = {
  id: string;
  claim_id?: string;
  order_no?: string;
  order_item_id?: string;
  product_name?: string;
  option_name?: string;
  claim_type?: string;
  status?: string;
  reason?: string;
  requested_quantity?: number;
  requested_amount?: number;
  company_memo?: string;
  updated_at?: string;
  created_at?: string;
};

type ApiPayload = {
  ok?: boolean;
  orders?: OrderRow[];
  items?: ItemRow[];
  claims?: ClaimRow[];
  carriers?: CompanyCarrierOption[];
  resultMeta?: { itemLimit?: number; truncated?: boolean };
  message?: string;
  error?: { message?: string };
};

type PanelMode = "orders" | "deliveries" | "claims";
type DateField = "paidAt" | "createdAt";

const orderStatusLabels: Record<string, string> = {
  paid: "결제 완료",
  preparing: "상품 준비",
  partially_shipping: "일부 배송 중",
  fulfilled: "처리 완료",
  cancelled: "취소",
  partially_cancelled: "부분 취소",
};

const deliveryStatusLabels: Record<string, string> = {
  invoice_pending: "송장 대기",
  invoice_entered: "송장 등록",
  in_transit: "배송 중",
  delivered: "배송 완료",
  pickup_ready: "현장수령 준비",
  picked_up: "현장수령 완료",
};

const fulfillmentStatusLabels: Record<string, string> = {
  new: "발주 확인 전",
  accepted: "발주 확인",
  stockout_pending_cancel: "품절·결제취소 필요",
};

const claimTypeLabels: Record<string, string> = {
  cancel: "주문 취소",
  return: "반품",
  exchange: "교환",
  defect: "상품 이상",
  wrong_delivery: "오배송",
};

const claimStatusLabels: Record<string, string> = {
  requested: "접수",
  accepted: "처리 수락",
  rejected: "처리 거절",
  return_in_transit: "반품 회수 중",
  received: "반품 입고",
  refund_processing: "PayUp 환불 처리 중",
  refund_completed: "PayUp 환불 확인",
  replacement_shipping: "교환상품 배송 중",
  completed: "처리 완료",
};

const dateRangePresets: ReadonlyArray<{ label: string; days: number; offset?: number }> = [
  { label: "오늘", days: 1 },
  { label: "어제", days: 1, offset: 1 },
  { label: "3일", days: 3 },
  { label: "7일", days: 7 },
  { label: "10일", days: 10 },
  { label: "20일", days: 20 },
  { label: "30일", days: 30 },
  { label: "90일", days: 90 },
];

function koreaDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function koreaDateDaysAgo(daysAgo: number) {
  return koreaDateKey(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000));
}

function presetDateRange(days: number, offset = 0) {
  return {
    from: koreaDateDaysAgo(days - 1 + offset),
    to: koreaDateDaysAgo(offset),
  };
}

function itemDateKey(item: ItemRow, order: OrderRow | undefined, field: DateField) {
  const value = field === "paidAt" ? order?.paidAt || item.createdAt : item.createdAt || order?.paidAt;
  return value ? koreaDateKey(value) : "";
}

function dateHeading(dateKey: string) {
  if (!dateKey) return "일자 확인 전";
  const date = new Date(`${dateKey}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function CompanyOrderOperationsPanel({ mode = "orders" }: { companyId: string; mode?: PanelMode }) {
  const endpoint = useMemo(() => getPaymentFunctionUrl("companyOrderOperations"), []);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [carriers, setCarriers] = useState<CompanyCarrierOption[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(mode === "deliveries" ? "invoice_pending" : "all");
  const [dateField, setDateField] = useState<DateField>("paidAt");
  const [fromDate, setFromDate] = useState(() => presetDateRange(90).from);
  const [toDate, setToDate] = useState(() => presetDateRange(90).to);
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null);
  const [message, setMessage] = useState("주문 데이터를 불러오는 중입니다.");
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});

  const callApi = useCallback(
    async (body?: Record<string, unknown>) => {
      if (!endpoint) throw new Error("기업 주문 서버 주소가 설정되지 않았습니다.");
      const user = await ensureCompanyFirebaseAuthFromSession();
      const token = await user?.getIdToken();
      if (!token) throw new Error("기업관리자 로그인이 필요합니다.");
      const response = await fetch(body ? endpoint : `${endpoint}?action=list`, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || payload.ok === false || payload.error) {
        throw new Error(payload.error?.message || payload.message || `서버 요청 실패 HTTP ${response.status}`);
      }
      return payload;
    },
    [endpoint],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("주문·배송·클레임 데이터를 확인하고 있습니다.");
    try {
      const payload = await callApi();
      setOrders(payload.orders ?? []);
      setItems(payload.items ?? []);
      setClaims(payload.claims ?? []);
      setCarriers(payload.carriers ?? []);
      const limitNotice = payload.resultMeta?.truncated
        ? ` 최근 ${payload.resultMeta.itemLimit ?? 1000}개 상품까지만 조회됐습니다. 기간을 좁혀 주세요.`
        : "";
      setMessage(
        `주문 ${payload.orders?.length ?? 0}건, 상품 ${payload.items?.length ?? 0}건, 클레임 ${payload.claims?.length ?? 0}건을 불러왔습니다.${limitNotice}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const orderByNo = useMemo(() => new Map(orders.map((order) => [order.orderNo, order])), [orders]);
  const dateFilteredItems = useMemo(
    () =>
      items.filter((item) => {
        const dateKey = itemDateKey(item, orderByNo.get(item.orderNo), dateField);
        if (!dateKey) return true;
        return (!fromDate || dateKey >= fromDate) && (!toDate || dateKey <= toDate);
      }),
    [dateField, fromDate, items, orderByNo, toDate],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return dateFilteredItems
      .filter((item) => {
        const order = orderByNo.get(item.orderNo);
        const statusMatches =
          statusFilter === "all" || item.deliveryStatus === statusFilter || order?.status === statusFilter;
        if (!statusMatches) return false;
        if (!normalizedQuery) return true;
        return [
          item.orderNo,
          item.id,
          item.productName,
          item.optionName,
          item.productId,
          order?.customerName,
          order?.customerPhoneMasked,
          order?.receiverName,
          order?.receiverPhone,
          item.invoiceNumber,
        ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const leftDate = itemDateKey(left, orderByNo.get(left.orderNo), dateField);
        const rightDate = itemDateKey(right, orderByNo.get(right.orderNo), dateField);
        return rightDate.localeCompare(leftDate) || right.createdAt.localeCompare(left.createdAt);
      });
  }, [dateField, dateFilteredItems, orderByNo, query, statusFilter]);

  const queueCounts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(deliveryStatusLabels).map((status) => [
          status,
          dateFilteredItems.filter((item) => item.deliveryStatus === status).length,
        ]),
      ),
    [dateFilteredItems],
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ItemRow[]>();
    filteredItems.forEach((item) => {
      const key = itemDateKey(item, orderByNo.get(item.orderNo), dateField);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return [...groups.entries()]
      .sort(([left], [right]) => {
        if (!left) return 1;
        if (!right) return -1;
        return right.localeCompare(left);
      })
      .map(([dateKey, groupItems]) => ({
        dateKey,
        items: groupItems,
        orderCount: new Set(groupItems.map((item) => item.orderNo)).size,
        totalAmount: groupItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      }));
  }, [dateField, filteredItems, orderByNo]);

  function applyDatePreset(days: number, offset = 0) {
    const range = presetDateRange(days, offset);
    setFromDate(range.from);
    setToDate(range.to);
  }

  async function submitAction(body: Record<string, unknown>, successMessage: string) {
    setLoading(true);
    setMessage("서버에서 소유권·배송상태·중복 송장을 확인하고 있습니다.");
    try {
      await callApi(body);
      setMessage(successMessage);
      setSelectedItem(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function updateForm(key: string, field: string, value: string) {
    setForms((current) => ({ ...current, [key]: { ...(current[key] ?? {}), [field]: value } }));
  }

  if (mode === "claims") {
    return (
      <div className="grid gap-4">
        <PanelHeader message={message} loading={loading} onRefresh={load} payup />
        <div className="grid gap-3">
          {claims.map((claim) => {
            const claimId = claim.claim_id || claim.id;
            const form = forms[claimId] ?? {};
            const nextStatuses = nextClaimStatuses(claim.status ?? "requested");
            return (
              <article key={claimId} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {claim.order_no} · {claim.order_item_id}
                    </p>
                    <h3 className="mt-1 text-lg text-slate-950">
                      {claim.product_name || "상품명 확인 전"}{" "}
                      {claim.option_name ? `/ ${claim.option_name}` : ""}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {claimTypeLabels[claim.claim_type ?? ""] ?? claim.claim_type} · 수량{" "}
                      {claim.requested_quantity ?? 0} · {formatCurrency(Number(claim.requested_amount ?? 0))}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">사유: {claim.reason || "사유 없음"}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800">
                    {claimStatusLabels[claim.status ?? ""] ?? claim.status}
                  </span>
                </div>
                {nextStatuses.length ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    <select
                      value={form.status ?? nextStatuses[0]}
                      onChange={(event) => updateForm(claimId, "status", event.target.value)}
                      className="rounded-md border border-slate-200 px-3 py-2"
                    >
                      {nextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {claimStatusLabels[status] ?? status}
                        </option>
                      ))}
                    </select>
                    <input
                      value={form.memo ?? ""}
                      onChange={(event) => updateForm(claimId, "memo", event.target.value)}
                      placeholder="처리 의견 또는 거절 사유"
                      className="rounded-md border border-slate-200 px-3 py-2"
                    />
                    <input
                      value={form.providerReference ?? ""}
                      onChange={(event) => updateForm(claimId, "providerReference", event.target.value)}
                      placeholder="PayUp 취소·환불 거래번호"
                      className="rounded-md border border-slate-200 px-3 py-2"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        void submitAction(
                          {
                            action: "claim_transition",
                            claimId,
                            ...form,
                            status: form.status ?? nextStatuses[0],
                          },
                          "클레임 상태를 변경했습니다.",
                        )
                      }
                      className="rounded-md bg-slate-950 px-4 py-2 text-white disabled:opacity-50"
                    >
                      상태 변경
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!claims.length ? <EmptyState text="접수된 취소·반품·교환 요청이 없습니다." /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PanelHeader message={message} loading={loading} onRefresh={load} />

      {mode === "deliveries" ? (
        <>
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {Object.entries(deliveryStatusLabels).map(([status, label]) => (
              <button
                type="button"
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md border p-3 text-left ${
                  statusFilter === status
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-900"
                }`}
              >
                <span className="block text-xs opacity-80">{label}</span>
                <strong className="mt-1 block text-xl">{queueCounts[status] ?? 0}</strong>
              </button>
            ))}
          </section>
          <CompanyBulkInvoicePanel
            items={items}
            carriers={carriers}
            disabled={loading}
            onSubmit={async (rows: BulkInvoiceRow[]) => {
              await submitAction(
                { action: "delivery_bulk_update", rows },
                `송장 ${rows.length}건을 등록했습니다.`,
              );
            }}
          />
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            A5는 주문 작업목록과 송장 등록·배송상태를 관리합니다. 택배사 공식 라벨 번호 발급·출력은
            각 택배사 계약 API 또는 전용 프로그램 연결 후 사용할 수 있습니다.
          </section>
        </>
      ) : null}

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr]">
          <label className="grid gap-1 text-xs text-slate-600">
            조회 기준
            <select
              value={dateField}
              onChange={(event) => setDateField(event.target.value as DateField)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-950"
            >
              <option value="paidAt">결제일</option>
              <option value="createdAt">주문 접수일</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-600">
            시작일
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-950"
            />
          </label>
          <label className="grid gap-1 text-xs text-slate-600">
            종료일
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-950"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {dateRangePresets.map((preset) => (
            <button
              type="button"
              key={`${preset.label}-${preset.offset ?? 0}`}
              onClick={() => applyDatePreset(preset.days, preset.offset ?? 0)}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="주문번호, 주문고유번호, 고객, 연락처, 상품명, 송장번호 검색"
            className="rounded-md border border-slate-200 px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-2"
          >
            <option value="all">전체 상태</option>
            {Object.entries(mode === "orders" ? orderStatusLabels : deliveryStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={loading || !filteredItems.length}
            onClick={() => void downloadShippingWorklist(filteredItems, orderByNo, carriers)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 disabled:opacity-40"
          >
            배송 작업목록 다운로드
          </button>
        </div>
      </section>

      <div className="grid gap-5">
        {groupedItems.map((group) => (
          <section key={group.dateKey || "unknown-date"} className="grid gap-3">
            <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-800 px-1 pb-2">
              <div>
                <p className="text-xs text-slate-500">{dateField === "paidAt" ? "결제일" : "주문 접수일"}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">{dateHeading(group.dateKey)}</h2>
              </div>
              <p className="text-sm text-slate-600">
                주문 {group.orderCount}건 · 상품 {group.items.length}건 · {formatCurrency(group.totalAmount)}
              </p>
            </header>
            <div className="grid gap-3">
              {group.items.map((item) => {
                const order = orderByNo.get(item.orderNo);
          return (
            <article key={item.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    {item.orderNo} · {item.id} ·{" "}
                    {order?.paidAt ? formatDateTime(order.paidAt) : "결제일 확인 전"}
                  </p>
                  <h3 className="mt-1 text-lg text-slate-950">
                    {item.productName} {item.optionName ? `/ ${item.optionName}` : ""}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {order?.receiverName || order?.customerName || "수령인 확인 전"} ·{" "}
                    {order?.receiverPhone || order?.customerPhoneMasked || "연락처 확인 전"} · {item.quantity}개 ·{" "}
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                  {item.invoiceNumber ? (
                    <p className="mt-1 text-sm text-blue-700">
                      {item.carrierName || carrierName(carriers, item.carrierCode) || item.carrierCode} ·{" "}
                      {item.invoiceNumber}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">
                    {orderStatusLabels[order?.status ?? ""] ?? order?.status}
                  </p>
                  <span className="mt-1 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">
                    {deliveryStatusLabels[item.deliveryStatus] ?? item.deliveryStatus}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid gap-1 rounded-md bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-2">
                <p>수령인: {order?.receiverName || order?.customerName || "확인 필요"}</p>
                <p>연락처: {order?.receiverPhone || order?.customerPhoneMasked || "확인 필요"}</p>
                <p>우편번호: {order?.receiverPostalCode || (order?.deliveryMethod === "pickup" ? "현장수령" : "기존 주문 확인 필요")}</p>
                <p>배송메모: {order?.deliveryMemo || "-"}</p>
                <p className="md:col-span-2">
                  주소:{" "}
                  {[order?.receiverAddress, order?.receiverAddressDetail].filter(Boolean).join(" ") ||
                    "현장수령 또는 기존 주문 확인 필요"}
                </p>
              </div>
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-950">
                  판매업체 {item.sellerCompanyName || "업체명 확인 전"}
                </p>
                <p className="mt-1">
                  사업자번호 {item.sellerBusinessNo || "확인 전"} · 대표자{" "}
                  {item.sellerRepresentativeName || "확인 전"}
                </p>
                <p className="mt-1">
                  고객센터 {item.sellerCustomerServicePhone || "확인 전"}{" "}
                  {item.sellerPublicEmail ? `· ${item.sellerPublicEmail}` : ""}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.fulfillmentStatus === "new" ? (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        void submitAction(
                          {
                            action: "order_item_decision",
                            itemId: item.id,
                            decision: "accept",
                          },
                          `${item.productName} 발주를 확인했습니다.`,
                        )
                      }
                      className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      발주 확인
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        const reason = window.prompt(
                          "품절 사유를 입력하세요. 결제 취소는 별도로 처리해야 합니다.",
                        );
                        if (!reason?.trim()) return;
                        void submitAction(
                          {
                            action: "order_item_decision",
                            itemId: item.id,
                            decision: "stockout",
                            reason: reason.trim(),
                          },
                          `${item.productName} 품절을 기록했습니다. PayUp 결제 취소가 필요합니다.`,
                        );
                      }}
                      className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm text-rose-700 disabled:opacity-50"
                    >
                      품절 처리
                    </button>
                  </>
                ) : (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    {fulfillmentStatusLabels[item.fulfillmentStatus] ??
                      item.fulfillmentStatus}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white"
                >
                  주문 처리
                </button>
              </div>
            </article>
                );
              })}
            </div>
          </section>
        ))}
        {!filteredItems.length ? <EmptyState text="조건에 맞는 주문 상품이 없습니다." /> : null}
      </div>

      {selectedItem ? (
        <OrderActionDialog
          item={selectedItem}
          order={orderByNo.get(selectedItem.orderNo)}
          carriers={carriers}
          form={forms[selectedItem.id] ?? {}}
          loading={loading}
          onChange={(field, value) => updateForm(selectedItem.id, field, value)}
          onClose={() => setSelectedItem(null)}
          onSubmit={submitAction}
        />
      ) : null}
    </div>
  );
}

function PanelHeader({
  message,
  loading,
  onRefresh,
  payup = false,
}: {
  message: string;
  loading: boolean;
  onRefresh: () => Promise<void>;
  payup?: boolean;
}) {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg text-slate-950">{payup ? "클레임 관리" : "주문·배송 관리"}</h2>
          <p className="mt-1 text-sm text-slate-700">{message}</p>
        </div>
        <div className="flex gap-2">
          {payup ? (
            <a
              href="https://cp.payup.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white"
            >
              PayUp 관리자 열기
            </a>
          ) : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void onRefresh()}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </div>
    </section>
  );
}

function OrderActionDialog({
  item,
  order,
  carriers,
  form,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  item: ItemRow;
  order?: OrderRow;
  carriers: CompanyCarrierOption[];
  form: Record<string, string>;
  loading: boolean;
  onChange: (field: string, value: string) => void;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>, message: string) => Promise<void>;
}) {
  const nextDeliveryStatus = nextDelivery(item.deliveryStatus);
  const shipmentRequired = ["invoice_entered", "in_transit", "delivered"].includes(nextDeliveryStatus);
  const selectedCarrierCode = form.carrierCode ?? item.carrierCode ?? "";
  const selectedInvoiceNumber = form.invoiceNumber ?? item.invoiceNumber ?? "";
  const shipmentReady = !shipmentRequired || Boolean(selectedCarrierCode && selectedInvoiceNumber.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
    >
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="flex justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{item.orderNo} · {item.id}</p>
            <h2 className="text-xl text-slate-950">{item.productName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-2">
            닫기
          </button>
        </div>
        <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 text-sm md:grid-cols-2">
          <p>수령인: {order?.receiverName || order?.customerName || "확인 필요"}</p>
          <p>연락처: {order?.receiverPhone || order?.customerPhoneMasked || "확인 필요"}</p>
          <p>우편번호: {order?.receiverPostalCode || "확인 필요"}</p>
          <p>배송메모: {order?.deliveryMemo || "-"}</p>
          <p className="md:col-span-2">
            주소:{" "}
            {[order?.receiverAddress, order?.receiverAddressDetail].filter(Boolean).join(" ") ||
              "현장수령 또는 기존 주문 확인 필요"}
          </p>
        </div>
        {nextDeliveryStatus ? (
          <div className="mt-5 grid gap-2 rounded-md border border-emerald-200 p-4 md:grid-cols-3">
            {shipmentRequired ? (
              <>
                <select
                  value={selectedCarrierCode}
                  onChange={(event) => onChange("carrierCode", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                >
                  <option value="">택배사 선택</option>
                  {carriers
                    .filter((carrier) => carrier.shippingEnabled)
                    .map((carrier) => (
                      <option key={carrier.code} value={carrier.code}>
                        {carrier.name} ({carrier.code})
                      </option>
                    ))}
                </select>
                <input
                  value={selectedInvoiceNumber}
                  onChange={(event) => onChange("invoiceNumber", event.target.value)}
                  placeholder="송장번호"
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </>
            ) : (
              <p className="text-sm text-slate-700 md:col-span-2">현장수령 완료 상태로 변경합니다.</p>
            )}
            <button
              type="button"
              disabled={loading || !shipmentReady}
              onClick={() =>
                void onSubmit(
                  {
                    action: "delivery_update",
                    itemId: item.id,
                    deliveryStatus: nextDeliveryStatus,
                    carrierCode: selectedCarrierCode,
                    invoiceNumber: selectedInvoiceNumber,
                  },
                  `${deliveryStatusLabels[nextDeliveryStatus]} 상태로 변경했습니다.`,
                )
              }
              className="rounded-md bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {deliveryStatusLabels[nextDeliveryStatus]} 처리
            </button>
          </div>
        ) : null}
        <div className="mt-5 grid gap-2 rounded-md border border-rose-200 p-4 md:grid-cols-2">
          <select
            value={form.claimType ?? "cancel"}
            onChange={(event) => onChange("claimType", event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-2"
          >
            {Object.entries(claimTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={form.quantity ?? "1"}
            onChange={(event) => onChange("quantity", event.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="요청 수량"
            className="rounded-md border border-slate-200 px-3 py-2"
          />
          <input
            value={form.reason ?? ""}
            onChange={(event) => onChange("reason", event.target.value)}
            placeholder="클레임 사유"
            className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2"
          />
          <button
            type="button"
            disabled={loading || !form.reason?.trim()}
            onClick={() =>
              void onSubmit(
                {
                  action: "claim_create",
                  itemId: item.id,
                  claimType: form.claimType ?? "cancel",
                  quantity: Number(form.quantity ?? 1),
                  reason: form.reason,
                },
                "클레임을 접수했습니다.",
              )
            }
            className="rounded-md bg-rose-600 px-4 py-2 text-white disabled:opacity-50 md:col-span-2"
          >
            취소·반품·교환 접수
          </button>
        </div>
      </section>
    </div>
  );
}

async function downloadShippingWorklist(
  items: ItemRow[],
  orderByNo: Map<string, OrderRow>,
  carriers: CompanyCarrierOption[],
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("배송작업목록");
  sheet.columns = [
    { header: "주문번호", key: "orderNo", width: 24 },
    { header: "주문고유번호", key: "itemId", width: 34 },
    { header: "결제일시", key: "paidAt", width: 22 },
    { header: "수령인", key: "receiverName", width: 16 },
    { header: "연락처", key: "receiverPhone", width: 18 },
    { header: "우편번호", key: "postalCode", width: 12 },
    { header: "주소", key: "address", width: 36 },
    { header: "상세주소", key: "addressDetail", width: 24 },
    { header: "배송메모", key: "deliveryMemo", width: 24 },
    { header: "상품명", key: "productName", width: 32 },
    { header: "옵션", key: "optionName", width: 22 },
    { header: "수량", key: "quantity", width: 10 },
    { header: "상품금액", key: "amount", width: 14 },
    { header: "택배사", key: "carrierName", width: 18 },
    { header: "택배사코드", key: "carrierCode", width: 14 },
    { header: "송장번호", key: "invoiceNumber", width: 24 },
    { header: "배송상태", key: "deliveryStatus", width: 16 },
  ];
  items.forEach((item) => {
    const order = orderByNo.get(item.orderNo);
    sheet.addRow({
      orderNo: item.orderNo,
      itemId: item.id,
      paidAt: order?.paidAt ? formatDateTime(order.paidAt) : "",
      receiverName: order?.receiverName || order?.customerName || "",
      receiverPhone: order?.receiverPhone || order?.customerPhoneMasked || "",
      postalCode: order?.receiverPostalCode || "",
      address: order?.receiverAddress || "",
      addressDetail: order?.receiverAddressDetail || "",
      deliveryMemo: order?.deliveryMemo || "",
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      amount: item.unitPrice * item.quantity,
      carrierName: item.carrierName || carrierName(carriers, item.carrierCode),
      carrierCode: item.carrierCode,
      invoiceNumber: item.invoiceNumber,
      deliveryStatus: deliveryStatusLabels[item.deliveryStatus] ?? item.deliveryStatus,
    });
  });
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.height = 24;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `Q${Math.max(sheet.rowCount, 1)}` };
  sheet.getColumn("L").numFmt = "0";
  sheet.getColumn("M").numFmt = "#,##0";
  ["A", "B", "E", "F", "O", "P"].forEach((column) => {
    sheet.getColumn(column).numFmt = "@";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `A5Mall_배송작업목록_${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function carrierName(carriers: CompanyCarrierOption[], code: string) {
  return carriers.find((carrier) => carrier.code === code)?.name ?? "";
}

function nextDelivery(status: string) {
  if (status === "invoice_pending") return "invoice_entered";
  if (status === "invoice_entered") return "in_transit";
  if (status === "in_transit") return "delivered";
  if (status === "pickup_ready") return "picked_up";
  return "";
}

function nextClaimStatuses(status: string) {
  const transitions: Record<string, string[]> = {
    requested: ["accepted", "rejected"],
    accepted: ["return_in_transit", "refund_processing", "replacement_shipping", "completed"],
    return_in_transit: ["received"],
    received: ["refund_processing", "replacement_shipping", "completed"],
    replacement_shipping: ["completed"],
    refund_processing: ["refund_completed"],
    refund_completed: ["completed"],
  };
  return transitions[status] ?? [];
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
