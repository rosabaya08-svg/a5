"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type GuestLookupOrder = {
  orderNo: string;
  status: string;
  totalAmount: number;
  paidAt?: string;
  deliveryMethod?: "pickup" | "delivery";
  customerPhoneMasked?: string;
  cancelRequest?: {
    status: string;
    amount: number;
    reason?: string;
    providerMessage?: string;
    reviewMemo?: string;
    createdAt?: string;
    reviewedAt?: string;
  };
  items?: Array<{
    productName: string;
    optionName: string;
    quantity: number;
    unitPrice: number;
    lineAmount: number;
  }>;
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

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function statusLabel(status: string) {
  if (status === "paid") return "결제 완료";
  if (status === "ready_for_pickup") return "수령 준비";
  if (status === "shipping") return "배송 중";
  if (status === "delivered") return "배송 완료";
  if (status === "cancelled") return "취소";
  if (status === "refunded") return "환불 완료";
  return status || "확인 필요";
}

function cancelStatusLabel(status: string) {
  if (status === "manual_review_required") return "취소/환불 검토 접수";
  if (status === "pg_cancel_blocked") return "PG 취소 보류";
  if (status === "pg_cancel_failed") return "PG 취소 실패";
  if (status === "pg_cancelled") return "PG 취소 완료";
  if (status === "approved_manual_review") return "수동 처리 승인";
  if (status === "rejected") return "반려";
  return status || "검토 중";
}

export function GuestOrderLookupClient() {
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.guestOrderLookup, []);
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<GuestLookupOrder[]>([]);
  const [message, setMessage] = useState("주문할 때 입력한 연락처로 최근 주문을 조회합니다.");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = normalizePhone(phone).length >= 4 && Boolean(endpoint) && !isLoading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const digits = normalizePhone(phone);

    if (!endpoint) {
      setMessage("주문조회 서버 주소가 설정되지 않았습니다.");
      return;
    }
    if (digits.length < 4) {
      setMessage("연락처는 최소 끝 4자리 이상 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    setMessage("주문을 조회하고 있습니다.");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: digits,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as LookupResponse;

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error?.message || payload.message || `주문조회 실패 HTTP ${response.status}`);
      }

      const nextOrders = payload.orders?.length ? payload.orders : payload.order ? [payload.order] : [];
      setOrders(nextOrders);
      setMessage(nextOrders.length ? `${nextOrders.length}건의 주문을 찾았습니다.` : "해당 연락처로 조회되는 주문이 없습니다.");
    } catch (error) {
      setOrders([]);
      setMessage(error instanceof Error ? error.message : "주문조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <h2 className="text-lg font-normal">주문조회</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-normal text-slate-700">
          연락처
          <input
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="010-0000-0000"
            className="min-h-12 rounded-md border border-slate-200 px-3 text-base font-normal outline-none focus:border-slate-950"
          />
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-12 rounded-md bg-slate-950 px-4 text-sm font-normal text-white disabled:bg-slate-300"
        >
          {isLoading ? "조회 중" : "주문 조회"}
        </button>
      </form>

      <p className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm font-normal text-slate-700">{message}</p>

      {orders.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {orders.map((order) => {
            const firstItem = order.items?.[0];
            return (
              <article key={order.orderNo} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-normal uppercase text-slate-500">주문번호</p>
                    <h3 className="break-all text-lg font-normal">{order.orderNo}</h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-normal text-emerald-800">
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-slate-700">
                  <p className="font-normal">{firstItem ? `${firstItem.productName} / ${firstItem.quantity}개` : "상품 정보 확인 중"}</p>
                  <p>{order.customerPhoneMasked || "연락처 마스킹값 없음"}</p>
                  <p>{order.paidAt ? formatDateTime(order.paidAt) : "결제시각 확인 중"}</p>
                  {order.cancelRequest ? (
                    <p className="rounded-md bg-rose-50 px-2 py-1 text-xs font-normal text-rose-700">
                      {cancelStatusLabel(order.cancelRequest.status)} / {formatCurrency(order.cancelRequest.amount)}
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-rose-600">{formatCurrency(order.totalAmount)}</span>
                  <Link href={`/orders/guest/${order.orderNo}`} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white">
                    상세 보기
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
