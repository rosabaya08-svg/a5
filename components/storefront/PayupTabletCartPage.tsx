"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { readTabletRoomSession } from "@/components/tablet/TabletAccessFlow";
import { createPayupQrSession } from "@/lib/payup/checkoutClient";
import { formatCurrency } from "@/lib/utils/format";
import type { CartItemSnapshot, QrPaymentSession } from "@/types/commerce";

type CartLine = CartItemSnapshot & { productImage?: string };

function tabletScope() {
  const session = readTabletRoomSession();
  return session ? `${session.nurseryId}:${session.roomId}:${session.tabletId}` : "unassigned";
}

function cartKey() {
  return `a5-live-cart:${tabletScope()}`;
}

function lastQrKey() {
  return `a5-live-last-qr:${tabletScope()}`;
}

function readCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(cartKey());
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartLine[]) {
  window.localStorage.setItem(cartKey(), JSON.stringify(items));
  window.dispatchEvent(new Event("a5-cart-change"));
}

function qrImage(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(target)}`;
}

export function PayupTabletCartPage() {
  const [items, setItems] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("공급사·위드커머스·판매 파트너 차액을 한 번의 PayUp 승인으로 분배합니다.");
  const [created, setCreated] = useState<{ session: QrPaymentSession; customerPath: string } | null>(null);

  const sync = useCallback(() => setItems(readCart()), []);
  useEffect(() => {
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("a5-cart-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("a5-cart-change", sync);
    };
  }, [sync]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items]);
  const companyCount = useMemo(() => new Set(items.map((item) => item.companyId)).size, [items]);

  function update(index: number, quantity: number) {
    const next = items.map((item, itemIndex) => itemIndex === index ? { ...item, quantity } : item).filter((item) => item.quantity > 0);
    setItems(next);
    writeCart(next);
    setCreated(null);
  }

  async function createQr() {
    const tablet = readTabletRoomSession();
    if (!tablet) {
      setMessage("객실·태블릿 등록 후 PayUp QR을 만들 수 있습니다.");
      return;
    }
    if (!items.length) {
      setMessage("장바구니가 비어 있습니다.");
      return;
    }
    setBusy(true);
    setMessage("서버에서 상품가격·재고·모든 하위사업자·차액분배 정책을 검증하고 있습니다.");
    try {
      const result = await createPayupQrSession({
        cartId: `payup-cart:${tablet.nurseryId}:${tablet.roomId}:${tablet.tabletId}`,
        nurseryId: tablet.nurseryId,
        roomId: tablet.roomId,
        tabletId: tablet.tabletId,
        deliveryMethod: "pickup",
        pickupLocation: {
          nurseryName: tablet.businessName,
          nurseryAddress: tablet.registeredAddress,
          roomId: tablet.roomId,
          roomName: tablet.roomName,
        },
        items: items.map(({ productImage: _productImage, ...item }) => item),
        clientAmount: total,
      });
      window.localStorage.setItem(`a5-live-qr:${result.shortCode}`, JSON.stringify(result.session));
      window.localStorage.setItem(lastQrKey(), result.shortCode);
      setCreated({ session: result.session, customerPath: result.customerPath });
      setMessage(`PayUp QR 생성 완료 · ${result.subMerchantCount}개 수취 하위사업자 · ${formatCurrency(result.totalAmount)}`);
    } catch (error) {
      setCreated(null);
      setMessage(error instanceof Error ? error.message : "PayUp QR을 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const customerUrl = created ? `${origin}${created.customerPath}` : "";

  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 text-slate-950 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-4">
        <article className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">PAYUP MULTI SUBMERCHANT CART</p>
          <h1 className="mt-2 text-2xl font-black">장바구니 1회 승인·자동 차액분배</h1>
          <p className="mt-2 text-sm font-semibold leading-6">기업별 여러 번 결제하지 않고, 한 장바구니를 공급사 상품대금·A5S 이용료·판매 파트너 차액·배송비로 서버에서 분배합니다.</p>
        </article>
        {!items.length ? (
          <article className="rounded-md bg-white p-6 shadow-sm"><h2 className="text-xl font-black">장바구니가 비었습니다.</h2><Link href="/tablet/products" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">상품 보기</Link></article>
        ) : items.map((item, index) => (
          <article key={`${item.productId}-${item.optionName}`} className="grid gap-3 rounded-md bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
            <div><p className="text-xs font-black text-slate-500">{item.companyId}</p><h2 className="mt-1 font-black">{item.productName}</h2><p className="mt-1 text-sm font-semibold text-slate-600">{item.optionName}</p></div>
            <div className="sm:text-right"><p className="font-black">{formatCurrency(item.unitPrice * item.quantity)}</p><div className="mt-3 inline-flex overflow-hidden rounded-md border border-slate-200"><button type="button" onClick={() => update(index, item.quantity - 1)} className="px-3 py-2 font-black">−</button><span className="bg-slate-50 px-4 py-2 font-black">{item.quantity}</span><button type="button" onClick={() => update(index, item.quantity + 1)} className="px-3 py-2 font-black">＋</button></div></div>
          </article>
        ))}
      </section>
      <aside className="h-fit rounded-md bg-white p-5 shadow-sm lg:sticky lg:top-5">
        <h2 className="text-xl font-black">PayUp 장바구니 요약</h2>
        <div className="mt-4 grid gap-3 text-sm"><div className="flex justify-between"><span>판매 기업</span><strong>{companyCount}개</strong></div><div className="flex justify-between"><span>상품 수량</span><strong>{items.reduce((sum, item) => sum + item.quantity, 0)}개</strong></div><div className="flex justify-between border-t border-slate-100 pt-3 text-lg"><span className="font-black">총 승인금액</span><strong className="text-rose-600">{formatCurrency(total)}</strong></div></div>
        <button type="button" disabled={busy || !items.length} onClick={() => void createQr()} className="mt-5 w-full rounded-md bg-rose-600 px-4 py-4 text-base font-black text-white disabled:opacity-50">{busy ? "분배 검증 중" : "PayUp 결제 QR 생성"}</button>
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">{message}</p>
        {created && customerUrl ? <div className="mt-4 grid gap-3 text-center"><img src={qrImage(customerUrl)} alt="PayUp 결제 QR" className="mx-auto size-[280px] max-w-full rounded-md border-8 border-slate-950 bg-white" /><p className="text-xs font-bold text-slate-500">만료 {new Date(created.session.expiresAt).toLocaleString("ko-KR")}</p><a href={created.customerPath} target="_blank" rel="noreferrer" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">휴대폰 결제화면 열기</a></div> : null}
      </aside>
    </main>
  );
}

export function PayupTabletQrPage() {
  const [session, setSession] = useState<QrPaymentSession | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    const code = window.localStorage.getItem(lastQrKey()) ?? "";
    try {
      const raw = code ? window.localStorage.getItem(`a5-live-qr:${code}`) : "";
      setSession(raw ? JSON.parse(raw) as QrPaymentSession : null);
    } catch {
      setSession(null);
    }
  }, []);
  if (!session) return <main className="mx-auto max-w-md px-4 py-6"><section className="rounded-md bg-white p-5 shadow-sm"><h1 className="text-2xl font-black">생성된 PayUp QR이 없습니다.</h1><Link href="/tablet/cart" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">장바구니로 이동</Link></section></main>;
  const target = `${origin}/q/${encodeURIComponent(session.shortCode)}/checkout`;
  return <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]"><section className="rounded-md bg-white p-5 text-center shadow-sm"><img src={qrImage(target)} alt="PayUp 결제 QR" className="mx-auto size-[280px] max-w-full rounded-md border-8 border-slate-950" /><p className="mt-3 font-black">휴대폰 카메라로 스캔하세요.</p><p className="mt-2 text-sm font-bold text-rose-600">만료 {new Date(session.expiresAt).toLocaleString("ko-KR")}</p></section><section className="grid gap-3"><article className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950"><h1 className="text-xl font-black">PayUp 장바구니 통합 결제</h1><p className="mt-2 text-sm font-semibold leading-6">한 번의 승인에서 공급사·위드커머스·판매 파트너 하위업체로 자동 분배됩니다.</p></article>{session.items.map((item) => <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-white p-4 shadow-sm"><div className="flex justify-between gap-4"><div><p className="font-black">{item.productName}</p><p className="mt-1 text-sm font-semibold text-slate-600">{item.optionName} · {item.quantity}개</p></div><strong>{formatCurrency(item.unitPrice * item.quantity)}</strong></div></article>)}<article className="rounded-md bg-white p-4 shadow-sm"><div className="flex justify-between text-lg"><span className="font-black">총 승인금액</span><strong className="text-rose-600">{formatCurrency(session.totalAmount)}</strong></div></article></section></main>;
}
