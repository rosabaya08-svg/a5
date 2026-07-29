"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readTabletRoomSession } from "@/components/tablet/TabletAccessFlow";
import { formatCurrency } from "@/lib/utils/format";
import type { QrPaymentSession } from "@/types/commerce";

function scope() {
  const session = readTabletRoomSession();
  return session ? `${session.nurseryId}:${session.roomId}:${session.tabletId}` : "unassigned";
}

function qrImage(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(target)}`;
}

export function PayupTabletQrRuntimePage() {
  const [session, setSession] = useState<QrPaymentSession | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    const code = window.localStorage.getItem(`a5-live-last-qr:${scope()}`) ?? "";
    try {
      const raw = code ? window.localStorage.getItem(`a5-live-qr:${code}`) : "";
      setSession(raw ? JSON.parse(raw) as QrPaymentSession : null);
    } catch {
      setSession(null);
    }
  }, []);

  if (!session) {
    return <main className="mx-auto max-w-md px-4 py-6"><section className="rounded-md bg-white p-5 shadow-sm"><h1 className="text-2xl font-black">생성된 PayUp QR이 없습니다.</h1><Link href="/tablet/cart" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">장바구니로 이동</Link></section></main>;
  }
  const target = `${origin}/q/live?code=${encodeURIComponent(session.shortCode)}`;
  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-md bg-white p-5 text-center shadow-sm">
        <img src={qrImage(target)} alt="PayUp 결제 QR" className="mx-auto size-[280px] max-w-full rounded-md border-8 border-slate-950" />
        <p className="mt-3 font-black">휴대폰 카메라로 스캔하세요.</p>
        <p className="mt-2 text-sm font-bold text-rose-600">만료 {new Date(session.expiresAt).toLocaleString("ko-KR")}</p>
        <a href={`/q/live?code=${encodeURIComponent(session.shortCode)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">결제화면 열기</a>
      </section>
      <section className="grid gap-3">
        <article className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950"><h1 className="text-xl font-black">PayUp 장바구니 통합 결제</h1><p className="mt-2 text-sm font-semibold leading-6">한 번의 승인에서 공급사·위드커머스·판매 파트너 하위업체로 자동 분배됩니다.</p></article>
        {session.items.map((item) => <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-white p-4 shadow-sm"><div className="flex justify-between gap-4"><div><p className="font-black">{item.productName}</p><p className="mt-1 text-sm font-semibold text-slate-600">{item.optionName} · {item.quantity}개</p></div><strong>{formatCurrency(item.unitPrice * item.quantity)}</strong></div></article>)}
        <article className="rounded-md bg-white p-4 shadow-sm"><div className="flex justify-between text-lg"><span className="font-black">총 승인금액</span><strong className="text-rose-600">{formatCurrency(session.totalAmount)}</strong></div></article>
      </section>
    </main>
  );
}
