"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { readPayupGuestOrder, type PayupGuestOrder } from "@/lib/payup/checkoutClient";
import { formatCurrency } from "@/lib/utils/format";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    paid: "결제완료",
    cancelled: "전체취소",
    ready_for_pickup: "현장수령 준비",
    shipping: "배송중",
    delivered: "배송완료",
    picked_up: "수령완료",
  };
  return labels[status] ?? status || "확인 중";
}

export function PayupGuestOrderPage() {
  const params = useSearchParams();
  const initialOrderNo = params.get("orderNo") ?? "";
  const [orderNumber, setOrderNumber] = useState(initialOrderNo);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [order, setOrder] = useState<PayupGuestOrder | null>(null);
  const [message, setMessage] = useState("주문번호와 주문자 연락처 마지막 4자리를 입력하세요.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initialOrderNo) return;
    const stored = window.sessionStorage.getItem(`a5-payup-order-phone:${initialOrderNo}`) ?? "";
    if (stored.length === 4) {
      setPhoneLast4(stored);
      void lookup(initialOrderNo, stored);
    }
  }, [initialOrderNo]);

  async function lookup(targetOrder = orderNumber, targetPhone = phoneLast4) {
    const normalizedOrder = targetOrder.trim();
    const normalizedPhone = targetPhone.replace(/[^0-9]/g, "").slice(-4);
    if (!normalizedOrder || normalizedPhone.length !== 4) {
      setMessage("주문번호와 연락처 마지막 4자리를 정확히 입력하세요.");
      return;
    }
    setBusy(true);
    setOrder(null);
    setMessage("서버에서 PayUp 승인·취소·주문 원장을 확인하고 있습니다.");
    try {
      const result = await readPayupGuestOrder(normalizedOrder, normalizedPhone);
      setOrder(result.order);
      setOrderNumber(normalizedOrder);
      setPhoneLast4(normalizedPhone);
      window.sessionStorage.setItem(`a5-payup-order-phone:${normalizedOrder}`, normalizedPhone);
      setMessage("주문정보를 확인했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문을 조회하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void lookup();
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] px-4 py-6 text-slate-950">
      <section className="mx-auto grid max-w-3xl gap-4">
        <header className="rounded-md bg-slate-950 p-5 text-white shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">PAYUP VERIFIED ORDER</p>
          <h1 className="mt-2 text-3xl font-black">PayUp 주문조회</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">주문번호와 연락처 확인 후 승인·취소·배송 상태를 마스킹 정보로 제공합니다.</p>
        </header>

        <form onSubmit={submit} className="grid gap-3 rounded-md bg-white p-5 shadow-sm sm:grid-cols-[1fr_170px_auto]">
          <label className="grid gap-1 text-xs font-black text-slate-600">주문번호<input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold" placeholder="A5..." /></label>
          <label className="grid gap-1 text-xs font-black text-slate-600">연락처 마지막 4자리<input required inputMode="numeric" maxLength={4} value={phoneLast4} onChange={(event) => setPhoneLast4(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))} className="h-12 rounded-md border border-slate-200 px-3 text-center text-lg font-black" placeholder="1234" /></label>
          <button type="submit" disabled={busy} className="self-end rounded-md bg-rose-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50">{busy ? "확인 중" : "주문조회"}</button>
        </form>
        <p className="rounded-md bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">{message}</p>

        {order ? (
          <>
            <section className="grid gap-3 rounded-md bg-white p-5 shadow-sm sm:grid-cols-3">
              <div><p className="text-xs font-black text-slate-500">주문번호</p><p className="mt-1 font-black">{order.orderNumber}</p></div>
              <div><p className="text-xs font-black text-slate-500">주문상태</p><p className="mt-1 font-black text-blue-700">{statusLabel(order.status)}</p></div>
              <div><p className="text-xs font-black text-slate-500">총 결제금액</p><p className="mt-1 text-xl font-black text-rose-600">{formatCurrency(order.totalAmount)}</p></div>
              <div><p className="text-xs font-black text-slate-500">고객</p><p className="mt-1 font-bold">{order.customerName} · {order.customerPhoneMasked}</p></div>
              <div><p className="text-xs font-black text-slate-500">PayUp 거래번호</p><p className="mt-1 font-bold">{order.transactionIdMasked || "대사 중"}</p></div>
              <div><p className="text-xs font-black text-slate-500">결제일시</p><p className="mt-1 font-bold">{order.paidAt ? new Date(order.paidAt).toLocaleString("ko-KR") : "-"}</p></div>
            </section>
            <section className="grid gap-3">
              {order.items.map((item) => (
                <article key={item.id} className="rounded-md bg-white p-4 shadow-sm">
                  <div className="flex justify-between gap-4"><div><p className="font-black">{item.productName}</p><p className="mt-1 text-sm font-semibold text-slate-600">{item.optionName} · {item.quantity}개 · {item.deliveryStatus}</p></div><strong>{formatCurrency(item.lineAmount)}</strong></div>
                </article>
              ))}
            </section>
            <section className="rounded-md bg-white p-4 shadow-sm"><h2 className="font-black">수령 정보</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{order.deliveryMethod === "delivery" ? "택배배송" : "현장수령"} · {order.receiverAddressMasked} {order.receiverAddressDetailMasked}</p>{order.cancelledAt ? <p className="mt-2 font-black text-red-700">전체취소 {new Date(order.cancelledAt).toLocaleString("ko-KR")}</p> : null}</section>
          </>
        ) : null}

        <Link href="/" className="justify-self-center rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-black">쇼핑몰 홈으로</Link>
      </section>
    </main>
  );
}
