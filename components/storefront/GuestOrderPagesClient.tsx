"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { GuestRefundRequestBridge } from "@/components/storefront/GuestRefundRequestBridge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type GuestLookupItem = {
  productName?: string;
  optionName?: string;
  quantity?: number;
  unitPrice?: number;
  lineAmount?: number;
  companyId?: string;
};

type GuestLookupOrder = {
  orderNo: string;
  status: string;
  totalAmount: number;
  paidAt?: string;
  deliveryMethod?: "pickup" | "delivery";
  customerPhoneMasked?: string;
  cancelRequest?: {
    id?: string;
    status: string;
    amount: number;
    reason?: string;
    requestedBy?: string;
    providerMessage?: string;
    reviewMemo?: string;
    pgCancelCalled?: boolean;
    createdAt?: string;
    reviewedAt?: string;
  };
  receiverLocation?: {
    address?: string;
    addressDetail?: string;
  };
  items?: GuestLookupItem[];
  vendorContact?: {
    companyId?: string;
    companyName?: string;
    phone?: string;
    kakaoChannel?: string;
    email?: string;
  };
};

type LookupResponse = {
  ok?: boolean;
  order?: GuestLookupOrder;
  orders?: GuestLookupOrder[];
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePhoneLast4(value: string) {
  const digits = normalizeDigits(value);
  return digits.length >= 4 ? digits.slice(-4) : digits;
}

function cacheKey(orderNo: string) {
  return `a5_guest_order_${orderNo}`;
}

function readCachedOrder(orderNo: string): GuestLookupOrder | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.sessionStorage.getItem(cacheKey(orderNo));
    if (!cached) return null;
    const parsed = JSON.parse(cached) as GuestLookupOrder;
    return parsed?.orderNo === orderNo ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedOrder(order: GuestLookupOrder) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(cacheKey(order.orderNo), JSON.stringify(order));
  } catch {
    // Session cache is an optimization only.
  }
}

function writeCachedOrders(orders: GuestLookupOrder[]) {
  orders.forEach((order) => writeCachedOrder(order));
}

function GuestFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-white px-3 py-3 text-slate-950 sm:px-4 sm:py-5">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="overflow-hidden rounded-md bg-slate-950 text-white shadow-xl">
          <div className="p-5">
            <p className="text-xs font-normal uppercase tracking-[0.16em] text-rose-300">위드커머스</p>
            <h1 className="mt-2 text-3xl font-normal tracking-normal">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>
          <nav className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/5 p-3">
            <Link href="/orders/guest" className="rounded-md bg-white px-3 py-2 text-center text-sm font-normal text-slate-950">
              Order lookup
            </Link>
            <Link href="/tablet/login" className="rounded-md border border-white/20 px-3 py-2 text-center text-sm font-normal text-white">
              Room tablet
            </Link>
          </nav>
        </header>
        <section className="mt-4">{children}</section>
      </div>
    </main>
  );
}

function messageClass(failed: boolean) {
  return failed ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700";
}

function deliveryLabel(value?: string) {
  if (value === "delivery") return "Delivery";
  if (value === "pickup") return "On-site pickup";
  return "Not specified";
}

function orderItemsTotal(items: GuestLookupItem[] | undefined) {
  return (items ?? []).reduce((sum, item) => sum + (item.lineAmount ?? (item.unitPrice ?? 0) * (item.quantity ?? 0)), 0);
}

function cancelStatusLabel(status: string) {
  if (status === "manual_review_required") return "Review requested";
  if (status === "pg_cancel_blocked") return "PG cancel blocked";
  if (status === "pg_cancel_failed") return "PG cancel failed";
  if (status === "pg_cancelled") return "PG cancel completed";
  if (status === "approved_manual_review") return "Manual review approved";
  if (status === "rejected") return "Rejected";
  return status || "Review pending";
}

function CancelRequestStatus({ order }: { order: GuestLookupOrder }) {
  const request = order.cancelRequest;

  if (!request) {
    return (
      <section className="rounded-md bg-white p-4 text-sm font-normal text-slate-600 shadow-sm">
        No refund or cancellation request has been recorded for this order.
      </section>
    );
  }

  return (
    <section className="rounded-md border border-rose-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal uppercase text-rose-600">환불/취소</p>
          <h2 className="mt-1 text-lg font-normal">{cancelStatusLabel(request.status)}</h2>
        </div>
        <span className="text-rose-600">{formatCurrency(request.amount)}</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-slate-700">
        {request.reason ? <p><span>사유:</span> {request.reason}</p> : null}
        {request.providerMessage || request.reviewMemo ? <p><span>메시지:</span> {request.providerMessage || request.reviewMemo}</p> : null}
        {request.createdAt ? <p><span>요청일시:</span> {formatDateTime(request.createdAt)}</p> : null}
        {request.reviewedAt ? <p><span>검토일시:</span> {formatDateTime(request.reviewedAt)}</p> : null}
      </div>
    </section>
  );
}

function OrderItems({ items }: { items?: GuestLookupItem[] }) {
  if (!items?.length) {
    return <section className="rounded-md bg-white p-4 text-sm font-normal text-slate-600 shadow-sm">조회된 상품 행이 없습니다.</section>;
  }

  return (
    <section className="grid gap-3">
      {items.map((item, index) => {
        const amount = item.lineAmount ?? (item.unitPrice ?? 0) * (item.quantity ?? 0);

        return (
          <article key={`${item.productName ?? "item"}-${item.optionName ?? "option"}-${index}`} className="rounded-md bg-white p-4 shadow-sm">
            <div className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="break-words font-normal">{item.productName || "Product"}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.optionName || "Default"} / {item.quantity ?? 0} ea
                </p>
                {item.companyId ? <p className="mt-1 text-xs font-normal text-slate-400">{item.companyId}</p> : null}
              </div>
              <span className="whitespace-nowrap">{formatCurrency(amount)}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function OrderTimeline({ order }: { order: GuestLookupOrder }) {
  const steps = [
    { label: "Order", active: true },
    { label: "결제", active: order.status !== "pending_payment" && order.status !== "cancelled" },
    { label: "Fulfillment", active: ["ready_for_pickup", "shipping", "delivered", "picked_up"].includes(order.status) },
    { label: "Done", active: ["delivered", "picked_up"].includes(order.status) },
  ];

  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <h2 className="text-lg font-normal">주문 진행</h2>
      <div className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-normal ${step.active ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"}`}>
              {index + 1}
            </span>
            <span className={step.active ? "font-normal text-slate-950" : "font-normal text-slate-500"}>{step.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderSummary({ order }: { order: GuestLookupOrder }) {
  const itemsTotal = orderItemsTotal(order.items);

  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-normal uppercase text-slate-500">주문번호</p>
          <h2 className="break-all text-2xl font-normal">{order.orderNo}</h2>
          <p className="mt-1 text-sm text-slate-600">{order.customerPhoneMasked || "Verified guest order"}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
        <div className="flex justify-between gap-3">
          <span className="text-sm text-slate-600">배송</span>
          <span className="text-right">{deliveryLabel(order.deliveryMethod)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-sm text-slate-600">결제일시</span>
          <span className="text-right">{order.paidAt ? formatDateTime(order.paidAt) : "Pending"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-sm text-slate-600">상품 합계</span>
          <span>{formatCurrency(itemsTotal)}</span>
        </div>
        <div className="flex justify-between gap-3 text-xl">
          <span className="font-normal">결제 합계</span>
          <span className="text-rose-600">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>
    </section>
  );
}

async function requestLookup(endpoint: string, payload: { orderNo?: string; token?: string; phone?: string; phoneLast4?: string }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as LookupResponse;

  if (!response.ok || data.ok === false) {
    throw new Error(data.error?.message || data.message || `Guest order lookup failed. HTTP ${response.status}`);
  }

  return data;
}

export function GuestOrderLookupClientPage() {
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.guestOrderLookup, []);
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<GuestLookupOrder[]>([]);
  const [message, setMessage] = useState("Enter a phone number to find recent guest orders.");
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const phoneLast4 = normalizePhoneLast4(phone);
  const canSubmit = Boolean(endpoint) && phoneLast4.length === 4 && !isLoading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!endpoint) {
      setFailed(true);
      setMessage("Guest order lookup endpoint is not configured.");
      return;
    }
    if (phoneLast4.length !== 4) {
      setFailed(true);
      setMessage("Enter at least the last 4 digits of the customer phone number.");
      return;
    }

    setIsLoading(true);
    setFailed(false);
    setMessage("Looking up orders...");

    try {
      const payload = await requestLookup(endpoint, { phone: phoneLast4 });
      const nextOrders = payload.orders?.length ? payload.orders : payload.order ? [payload.order] : [];
      writeCachedOrders(nextOrders);
      setOrders(nextOrders);
      setMessage(nextOrders.length ? `Found ${nextOrders.length} order(s).` : "No orders matched that phone number.");
    } catch (error) {
      setOrders([]);
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Guest order lookup failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <GuestFrame title="비회원 주문조회" subtitle="실시간 주문조회 기능으로 폐쇄몰 비회원 주문을 찾습니다.">
      <section className="rounded-md bg-white p-4 shadow-sm">
        <h2 className="text-lg font-normal">주문조회</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-normal text-slate-700">
            Phone number or last 4 digits
            <input
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="010-0000-0000"
              className="min-h-12 rounded-md border border-slate-200 px-3 text-base font-normal outline-none focus:border-slate-950"
            />
          </label>
          <button type="submit" disabled={!canSubmit} className="min-h-12 rounded-md bg-slate-950 px-4 text-sm font-normal text-white disabled:bg-slate-300">
            {isLoading ? "Searching..." : "Lookup orders"}
          </button>
        </form>
        <p className={`mt-3 rounded-md px-3 py-3 text-sm font-normal ${messageClass(failed)}`}>{message}</p>

        {orders.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {orders.map((order) => {
              const firstItem = order.items?.[0];
              return (
                <article key={order.orderNo} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-normal uppercase text-slate-500">주문번호</p>
                      <h3 className="break-all text-lg font-normal">{order.orderNo}</h3>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-slate-700">
                    <p className="font-normal">{firstItem ? `${firstItem.productName || "Product"} / ${firstItem.quantity ?? 0} ea` : "Item rows loading"}</p>
                    <p>{order.customerPhoneMasked || "Masked phone not returned"}</p>
                    <p>{order.paidAt ? formatDateTime(order.paidAt) : "결제시각 대기"}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-rose-600">{formatCurrency(order.totalAmount)}</span>
                    <Link href={`/orders/guest/${order.orderNo}`} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white">
                      View detail
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </GuestFrame>
  );
}

export function GuestOrderDetailClientPage({
  orderNo,
  initialToken = "",
  initialPhoneLast4 = "",
}: {
  orderNo: string;
  initialToken?: string;
  initialPhoneLast4?: string;
}) {
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.guestOrderLookup, []);
  const [order, setOrder] = useState<GuestLookupOrder | null>(null);
  const [token, setToken] = useState(initialToken);
  const [phoneLast4, setPhoneLast4] = useState(normalizePhoneLast4(initialPhoneLast4));
  const [message, setMessage] = useState("Verify the order to load live details.");
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function loadOrder(nextToken = token, nextPhoneLast4 = phoneLast4) {
    if (!endpoint) {
      setFailed(true);
      setMessage("Guest order lookup endpoint is not configured.");
      return;
    }
    if (!nextToken && normalizePhoneLast4(nextPhoneLast4).length !== 4) {
      setFailed(true);
      setMessage("Enter the last 4 digits or use a valid lookup token.");
      return;
    }

    setIsLoading(true);
    setFailed(false);
    setMessage("주문 상세를 불러오는 중입니다.");

    try {
      const payload = await requestLookup(endpoint, {
        orderNo,
        token: nextToken || undefined,
        phoneLast4: nextToken ? undefined : normalizePhoneLast4(nextPhoneLast4),
      });
      const nextOrder = payload.order ?? payload.orders?.[0];
      if (!nextOrder) throw new Error("Lookup succeeded but no order row was returned.");
      writeCachedOrder(nextOrder);
      setOrder(nextOrder);
      setMessage("실시간 주문 상세를 불러왔습니다.");
    } catch (error) {
      setOrder(null);
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Guest order lookup failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const cached = readCachedOrder(orderNo);
    if (cached) {
      const timer = window.setTimeout(() => {
        setOrder(cached);
        setMessage("Loaded from the current lookup session.");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (initialToken || normalizePhoneLast4(initialPhoneLast4).length === 4) {
      const timer = window.setTimeout(() => {
        void loadOrder(initialToken, initialPhoneLast4);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // Initial verification is intentionally one-shot for this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadOrder();
  }

  return (
    <GuestFrame title="비회원 주문 상세" subtitle="비회원 주문조회 기능으로 실시간 주문 상세를 불러옵니다.">
      <div className="grid gap-4">
        {!order ? (
          <section className="rounded-md bg-white p-4 shadow-sm">
            <h2 className="text-lg font-normal">주문 확인</h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-normal text-slate-700">
                Phone last 4 digits
                <input
                  inputMode="numeric"
                  value={phoneLast4}
                  onChange={(event) => setPhoneLast4(normalizePhoneLast4(event.target.value))}
                  maxLength={4}
                  placeholder="0000"
                  className="min-h-12 rounded-md border border-slate-200 px-3 text-base font-normal outline-none focus:border-slate-950"
                />
              </label>
              <label className="grid gap-1 text-sm font-normal text-slate-700">
                Lookup token
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value.trim())}
                  placeholder="optional"
                  className="min-h-12 rounded-md border border-slate-200 px-3 text-base font-normal outline-none focus:border-slate-950"
                />
              </label>
              <button type="submit" disabled={isLoading} className="min-h-12 rounded-md bg-slate-950 px-4 text-sm font-normal text-white disabled:bg-slate-300">
                {isLoading ? "Loading..." : "Load order"}
              </button>
            </form>
            <p className={`mt-3 rounded-md px-3 py-3 text-sm font-normal ${messageClass(failed)}`}>{message}</p>
          </section>
        ) : (
          <>
            <OrderSummary order={order} />
            <CancelRequestStatus order={order} />
            <OrderTimeline order={order} />
            <OrderItems items={order.items} />
            {order.vendorContact?.companyName || order.vendorContact?.phone || order.vendorContact?.email ? (
              <section className="rounded-md bg-white p-4 text-sm shadow-sm">
                <h2 className="text-lg font-normal">판매자 연락처</h2>
                <div className="mt-3 grid gap-1 text-slate-700">
                  {order.vendorContact.companyName ? <p>{order.vendorContact.companyName}</p> : null}
                  {order.vendorContact.phone ? <p>{order.vendorContact.phone}</p> : null}
                  {order.vendorContact.email ? <p>{order.vendorContact.email}</p> : null}
                </div>
              </section>
            ) : null}
            <Link href={`/orders/guest/${order.orderNo}/refund`} className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-normal text-red-700">
              Refund or cancellation request
            </Link>
            <p className={`rounded-md px-3 py-3 text-sm font-normal ${messageClass(failed)}`}>{message}</p>
          </>
        )}
      </div>
    </GuestFrame>
  );
}

export function GuestRefundClientPage({
  orderNo,
  initialToken = "",
  initialPhoneLast4 = "",
}: {
  orderNo: string;
  initialToken?: string;
  initialPhoneLast4?: string;
}) {
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.guestOrderLookup, []);
  const [order, setOrder] = useState<GuestLookupOrder | null>(null);
  const [token, setToken] = useState(initialToken);
  const [phoneLast4, setPhoneLast4] = useState(normalizePhoneLast4(initialPhoneLast4));
  const [message, setMessage] = useState("Verify the order before submitting a refund request.");
  const [failed, setFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function loadOrder(nextToken = token, nextPhoneLast4 = phoneLast4) {
    if (!endpoint) {
      setFailed(true);
      setMessage("Guest order lookup endpoint is not configured.");
      return;
    }
    if (!nextToken && normalizePhoneLast4(nextPhoneLast4).length !== 4) {
      setFailed(true);
      setMessage("Enter the last 4 digits or use a valid lookup token.");
      return;
    }

    setIsLoading(true);
    setFailed(false);
    setMessage("주문 상세를 불러오는 중입니다.");

    try {
      const payload = await requestLookup(endpoint, {
        orderNo,
        token: nextToken || undefined,
        phoneLast4: nextToken ? undefined : normalizePhoneLast4(nextPhoneLast4),
      });
      const nextOrder = payload.order ?? payload.orders?.[0];
      if (!nextOrder) throw new Error("Lookup succeeded but no order row was returned.");
      writeCachedOrder(nextOrder);
      setOrder(nextOrder);
      setMessage("실시간 주문 상세를 불러왔습니다.");
    } catch (error) {
      setOrder(null);
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Guest order lookup failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const cached = readCachedOrder(orderNo);
    if (cached) {
      const timer = window.setTimeout(() => {
        setOrder(cached);
        setMessage("Loaded from the current lookup session.");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (initialToken || normalizePhoneLast4(initialPhoneLast4).length === 4) {
      const timer = window.setTimeout(() => {
        void loadOrder(initialToken, initialPhoneLast4);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    // Initial verification is intentionally one-shot for this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadOrder();
  }

  return (
    <GuestFrame title="Refund Request" subtitle="Refund and cancellation requests are submitted through the live payment Function.">
      <div className="grid gap-4">
        {!order ? (
          <section className="rounded-md bg-white p-4 shadow-sm">
            <h2 className="text-lg font-normal">주문 확인</h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-normal text-slate-700">
                Phone last 4 digits
                <input
                  inputMode="numeric"
                  value={phoneLast4}
                  onChange={(event) => setPhoneLast4(normalizePhoneLast4(event.target.value))}
                  maxLength={4}
                  placeholder="0000"
                  className="min-h-12 rounded-md border border-slate-200 px-3 text-base font-normal outline-none focus:border-slate-950"
                />
              </label>
              <label className="grid gap-1 text-sm font-normal text-slate-700">
                Lookup token
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value.trim())}
                  placeholder="optional"
                  className="min-h-12 rounded-md border border-slate-200 px-3 text-base font-normal outline-none focus:border-slate-950"
                />
              </label>
              <button type="submit" disabled={isLoading} className="min-h-12 rounded-md bg-slate-950 px-4 text-sm font-normal text-white disabled:bg-slate-300">
                {isLoading ? "Loading..." : "Load order"}
              </button>
            </form>
            <p className={`mt-3 rounded-md px-3 py-3 text-sm font-normal ${messageClass(failed)}`}>{message}</p>
          </section>
        ) : (
          <>
            <OrderSummary order={order} />
            <CancelRequestStatus order={order} />
            <OrderItems items={order.items} />
            <GuestRefundRequestBridge orderNo={order.orderNo} amount={order.totalAmount}>
              <section className="rounded-md border border-red-200 bg-white p-4">
                <label className="grid gap-2 text-sm font-normal text-slate-700">
                  Request reason
                  <textarea className="min-h-32 rounded-md border border-slate-200 px-3 py-3" placeholder="Enter refund or cancellation reason." />
                </label>
                <button type="submit" className="mt-4 w-full rounded-md bg-red-600 px-4 py-3 text-sm font-normal text-white">
                  Submit request
                </button>
              </section>
            </GuestRefundRequestBridge>
            <p className={`rounded-md px-3 py-3 text-sm font-normal ${messageClass(failed)}`}>{message}</p>
          </>
        )}
      </div>
    </GuestFrame>
  );
}
