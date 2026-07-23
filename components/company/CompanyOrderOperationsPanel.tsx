"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CompanyBulkInvoicePanel } from "@/components/company/CompanyBulkInvoicePanel";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  customerName: string;
  customerPhoneMasked: string;
  deliveryMethod: string;
  receiverAddress: string;
  receiverAddressDetail: string;
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
  deliveryStatus: string;
  carrierCode: string;
  invoiceNumber: string;
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
  message?: string;
  error?: { message?: string };
};

type PanelMode = "orders" | "deliveries" | "claims";

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

export function CompanyOrderOperationsPanel({ mode = "orders" }: { companyId: string; mode?: PanelMode }) {
  const endpoint = useMemo(() => getPaymentFunctionUrl("companyOrderOperations"), []);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null);
  const [message, setMessage] = useState("주문 데이터를 불러오는 중입니다.");
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});

  const callApi = useCallback(async (body?: Record<string, unknown>) => {
    if (!endpoint) throw new Error("기업 주문 서버 주소가 설정되지 않았습니다.");
    const user = await ensureCompanyFirebaseAuthFromSession();
    const token = await user?.getIdToken(true);
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
  }, [endpoint]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("주문·배송·클레임 데이터를 확인하고 있습니다.");
    try {
      const payload = await callApi();
      setOrders(payload.orders ?? []);
      setItems(payload.items ?? []);
      setClaims(payload.claims ?? []);
      setMessage(`주문 ${payload.orders?.length ?? 0}건, 상품 ${payload.items?.length ?? 0}건, 클레임 ${payload.claims?.length ?? 0}건을 불러왔습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const orderByNo = useMemo(() => new Map(orders.map((order) => [order.orderNo, order])), [orders]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const order = orderByNo.get(item.orderNo);
      const statusMatches = statusFilter === "all" || item.deliveryStatus === statusFilter || order?.status === statusFilter;
      if (!statusMatches) return false;
      if (!normalizedQuery) return true;
      return [item.orderNo, item.productName, item.optionName, item.productId, order?.customerName, order?.customerPhoneMasked]
        .some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
    });
  }, [items, orderByNo, query, statusFilter]);

  async function submitAction(body: Record<string, unknown>, successMessage: string) {
    setLoading(true);
    setMessage("서버에서 소유권과 상태를 확인하고 있습니다.");
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
                    <p className="text-xs text-slate-500">{claim.order_no} · {claim.order_item_id}</p>
                    <h3 className="mt-1 text-lg text-slate-950">{claim.product_name || "상품명 확인 전"} {claim.option_name ? `/ ${claim.option_name}` : ""}</h3>
                    <p className="mt-2 text-sm text-slate-600">{claimTypeLabels[claim.claim_type ?? ""] ?? claim.claim_type} · 수량 {claim.requested_quantity ?? 0} · {formatCurrency(Number(claim.requested_amount ?? 0))}</p>
                    <p className="mt-1 text-sm text-slate-600">사유: {claim.reason || "사유 없음"}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800">{claimStatusLabels[claim.status ?? ""] ?? claim.status}</span>
                </div>
                {nextStatuses.length ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    <select value={form.status ?? nextStatuses[0]} onChange={(event) => updateForm(claimId, "status", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
                      {nextStatuses.map((status) => <option key={status} value={status}>{claimStatusLabels[status] ?? status}</option>)}
                    </select>
                    <input value={form.memo ?? ""} onChange={(event) => updateForm(claimId, "memo", event.target.value)} placeholder="처리 의견 또는 거절 사유" className="rounded-md border border-slate-200 px-3 py-2" />
                    <input value={form.providerReference ?? ""} onChange={(event) => updateForm(claimId, "providerReference", event.target.value)} placeholder="PayUp 취소·환불 거래번호" className="rounded-md border border-slate-200 px-3 py-2" />
                    <input value={form.returnInvoiceNumber ?? ""} onChange={(event) => updateForm(claimId, "returnInvoiceNumber", event.target.value)} placeholder="반품 송장번호" className="rounded-md border border-slate-200 px-3 py-2" />
                    <input value={form.replacementInvoiceNumber ?? ""} onChange={(event) => updateForm(claimId, "replacementInvoiceNumber", event.target.value)} placeholder="교환 재발송 송장번호" className="rounded-md border border-slate-200 px-3 py-2" />
                    <button type="button" disabled={loading} onClick={() => void submitAction({ action: "claim_transition", claimId, ...form, status: form.status ?? nextStatuses[0] }, "클레임 상태를 변경했습니다.")} className="rounded-md bg-slate-950 px-4 py-2 text-white disabled:opacity-50">상태 변경</button>
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
      <CompanyBulkInvoicePanel
        items={items}
        disabled={loading}
        onSubmit={async (rows) => {
          await submitAction({ action: "delivery_bulk_update", rows }, `송장 ${rows.length}건을 등록했습니다.`);
        }}
      />
      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주문번호, 고객, 연락처, 상품명, 상품코드 검색" className="rounded-md border border-slate-200 px-3 py-2" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
          <option value="all">전체 상태</option>
          {Object.entries(deliveryStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>
      <div className="grid gap-3">
        {filteredItems.map((item) => {
          const order = orderByNo.get(item.orderNo);
          return (
            <article key={item.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">{item.orderNo} · {order?.paidAt ? formatDateTime(order.paidAt) : "결제일 확인 전"}</p>
                  <h3 className="mt-1 text-lg text-slate-950">{item.productName} {item.optionName ? `/ ${item.optionName}` : ""}</h3>
                  <p className="mt-1 text-sm text-slate-600">{order?.customerName || "고객명 확인 전"} · {order?.customerPhoneMasked || "연락처 확인 전"} · {item.quantity}개 · {formatCurrency(item.unitPrice * item.quantity)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">{orderStatusLabels[order?.status ?? ""] ?? order?.status}</p>
                  <span className="mt-1 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">{deliveryStatusLabels[item.deliveryStatus] ?? item.deliveryStatus}</span>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-950">판매자 {item.sellerCompanyName || "업체명 확인 전"}</p>
                <p className="mt-1">사업자번호 {item.sellerBusinessNo || "확인 전"} · 대표자 {item.sellerRepresentativeName || "확인 전"}</p>
                <p className="mt-1">고객센터 {item.sellerCustomerServicePhone || "확인 전"} {item.sellerPublicEmail ? `· ${item.sellerPublicEmail}` : ""}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedItem(item)} className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white">주문 처리</button>
              </div>
            </article>
          );
        })}
        {!filteredItems.length ? <EmptyState text="조건에 맞는 주문 상품이 없습니다." /> : null}
      </div>
      {selectedItem ? (
        <OrderActionDialog
          item={selectedItem}
          order={orderByNo.get(selectedItem.orderNo)}
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

function PanelHeader({ message, loading, onRefresh, payup = false }: { message: string; loading: boolean; onRefresh: () => Promise<void>; payup?: boolean }) {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg text-slate-950">{payup ? "클레임 관리" : "주문·배송 관리"}</h2><p className="mt-1 text-sm text-slate-700">{message}</p></div>
        <div className="flex gap-2">
          {payup ? <a href="https://cp.payup.co.kr" target="_blank" rel="noopener noreferrer" className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white">PayUp 관리자 열기</a> : null}
          <button type="button" disabled={loading} onClick={() => void onRefresh()} className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50">새로고침</button>
        </div>
      </div>
    </section>
  );
}

function OrderActionDialog({ item, order, form, loading, onChange, onClose, onSubmit }: {
  item: ItemRow;
  order?: OrderRow;
  form: Record<string, string>;
  loading: boolean;
  onChange: (field: string, value: string) => void;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>, message: string) => Promise<void>;
}) {
  const nextDeliveryStatus = nextDelivery(item.deliveryStatus);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 md:items-center" role="dialog" aria-modal="true">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="flex justify-between gap-3"><div><p className="text-xs text-slate-500">{item.orderNo}</p><h2 className="text-xl text-slate-950">{item.productName}</h2></div><button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-2">닫기</button></div>
        <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 text-sm md:grid-cols-2">
          <p>수령인: {order?.customerName || "확인 전"}</p><p>연락처: {order?.customerPhoneMasked || "확인 전"}</p>
          <p className="md:col-span-2">주소: {[order?.receiverAddress, order?.receiverAddressDetail].filter(Boolean).join(" ") || "현장수령 또는 주소 확인 전"}</p>
        </div>
        {nextDeliveryStatus ? (
          <div className="mt-5 grid gap-2 rounded-md border border-emerald-200 p-4 md:grid-cols-3">
            <input value={form.carrierCode ?? item.carrierCode ?? ""} onChange={(event) => onChange("carrierCode", event.target.value)} placeholder="택배사 코드" className="rounded-md border border-slate-200 px-3 py-2" />
            <input value={form.invoiceNumber ?? item.invoiceNumber ?? ""} onChange={(event) => onChange("invoiceNumber", event.target.value)} placeholder="송장번호" className="rounded-md border border-slate-200 px-3 py-2" />
            <button type="button" disabled={loading} onClick={() => void onSubmit({ action: "delivery_update", itemId: item.id, deliveryStatus: nextDeliveryStatus, carrierCode: form.carrierCode ?? item.carrierCode, invoiceNumber: form.invoiceNumber ?? item.invoiceNumber }, `${deliveryStatusLabels[nextDeliveryStatus]} 상태로 변경했습니다.`)} className="rounded-md bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">{deliveryStatusLabels[nextDeliveryStatus]} 처리</button>
          </div>
        ) : null}
        <div className="mt-5 grid gap-2 rounded-md border border-rose-200 p-4 md:grid-cols-2">
          <select value={form.claimType ?? "cancel"} onChange={(event) => onChange("claimType", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
            {Object.entries(claimTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input value={form.quantity ?? "1"} onChange={(event) => onChange("quantity", event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="요청 수량" className="rounded-md border border-slate-200 px-3 py-2" />
          <input value={form.reason ?? ""} onChange={(event) => onChange("reason", event.target.value)} placeholder="클레임 사유" className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2" />
          <button type="button" disabled={loading || !form.reason?.trim()} onClick={() => void onSubmit({ action: "claim_create", itemId: item.id, claimType: form.claimType ?? "cancel", quantity: Number(form.quantity ?? 1), reason: form.reason }, "클레임을 접수했습니다.")} className="rounded-md bg-rose-600 px-4 py-2 text-white disabled:opacity-50 md:col-span-2">취소·반품·교환 접수</button>
        </div>
      </section>
    </div>
  );
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
  return <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{text}</div>;
}
