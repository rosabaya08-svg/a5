"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  QrReceiverForm,
  initialQrReceiverFormValue,
  isQrReceiverFormComplete,
  type QrReceiverFormValue,
} from "@/components/storefront/QrReceiverForm";
import {
  abortPayupPayment,
  approvePayupPayment,
  readPayupPublicQr,
  requestPayupOrder,
  type PayupOrderResponse,
} from "@/lib/payup/checkoutClient";
import { formatCurrency } from "@/lib/utils/format";
import type { QrPaymentSession } from "@/types/commerce";

declare global {
  interface Window {
    goPay?: (form: HTMLFormElement) => void;
    nicepaySubmit?: () => void;
    nicepayClose?: () => void;
  }
}

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent) || window.innerWidth <= 760;
}

function authDataFromForm(form: HTMLFormElement) {
  const result: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") result[key] = value;
  });
  return result;
}

function buildPaymentForm(order: PayupOrderResponse, mobile: boolean) {
  const form = document.createElement("form");
  form.name = "payForm";
  form.id = `payup-form-${order.paymentSessionId}`;
  form.method = "post";
  form.acceptCharset = "utf-8";
  form.style.display = "none";
  if (mobile) form.action = order.formAction;
  const fields = {
    PayMethod: order.fields.PayMethod || "CARD",
    TransType: order.fields.TransType || "0",
    ...order.fields,
    charset: "utf-8",
    ReqReserved: order.paymentSessionId,
  };
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  });
  document.body.appendChild(form);
  return form;
}

async function loadPcScript(src: string) {
  if (window.goPay) return;
  const existing = document.querySelector<HTMLScriptElement>(`script[data-payup-pc-script="${src}"]`);
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if (window.goPay) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("PC 결제창 스크립트를 불러오지 못했습니다.")), { once: true });
    });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.payupPcScript = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PC 결제창 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

function phoneLast4(value: string) {
  return value.replace(/[^0-9]/g, "").slice(-4);
}

function rememberGuestVerification(orderNumber: string, phone: string) {
  const last4 = phoneLast4(phone);
  if (orderNumber && last4.length === 4) window.sessionStorage.setItem(`a5-payup-order-phone:${orderNumber}`, last4);
}

export function PayupQrCheckoutPage({ fixedCode = "" }: { fixedCode?: string }) {
  const params = useSearchParams();
  const code = fixedCode || params.get("code") || "";
  const [session, setSession] = useState<QrPaymentSession | null>(null);
  const [receiver, setReceiver] = useState<QrReceiverFormValue | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [message, setMessage] = useState("QR 결제정보를 확인하고 있습니다.");
  const [busy, setBusy] = useState(false);
  const activeForm = useRef<HTMLFormElement | null>(null);
  const activePaymentSessionId = useRef("");
  const activeClientToken = useRef("");
  const activeBuyerPhone = useRef("");

  useEffect(() => {
    let cancelled = false;
    if (!code) {
      setMessage("QR 코드가 없습니다.");
      return;
    }
    void readPayupPublicQr(code)
      .then((result) => {
        if (cancelled) return;
        setSession(result.session);
        setReceiver(initialQrReceiverFormValue(result.session));
        setMessage("상품·금액·수령정보를 확인한 뒤 결제를 진행하세요.");
      })
      .catch((error) => {
        if (cancelled) return;
        setSession(null);
        setMessage(error instanceof Error ? error.message : "QR 결제세션을 찾을 수 없습니다.");
      });
    return () => {
      cancelled = true;
      delete window.nicepaySubmit;
      delete window.nicepayClose;
      activeForm.current?.remove();
    };
  }, [code]);

  const payable = useMemo(() => session?.status === "active", [session?.status]);

  async function abortCurrent(reason: string) {
    const paymentSessionId = activePaymentSessionId.current;
    const clientToken = activeClientToken.current;
    activeForm.current?.remove();
    activeForm.current = null;
    delete window.nicepaySubmit;
    delete window.nicepayClose;
    if (!paymentSessionId || !clientToken) return;
    try {
      await abortPayupPayment({ paymentSessionId, clientToken, reason });
    } catch {
      // 서버 만료 정리 작업이 남은 재고예약을 해제합니다.
    }
  }

  async function approvePc(order: PayupOrderResponse, form: HTMLFormElement) {
    try {
      setMessage("카드 인증정보를 서버에서 검증하고 PayUp 최종승인을 요청하고 있습니다.");
      const result = await approvePayupPayment({ paymentSessionId: order.paymentSessionId, clientToken: order.clientToken, authData: authDataFromForm(form) });
      activeForm.current?.remove();
      activeForm.current = null;
      rememberGuestVerification(result.orderNumber, activeBuyerPhone.current);
      window.location.assign(`/orders/guest/live?orderNo=${encodeURIComponent(result.orderNumber)}`);
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "PayUp 최종승인에 실패했습니다.");
    }
  }

  async function startPayment() {
    if (!session || !receiver || !isQrReceiverFormComplete(receiver)) {
      setMessage("고객성명, 연락처, 주소와 개인정보 처리 동의를 확인해 주세요.");
      return;
    }
    if (!payable) {
      setMessage("현재 결제할 수 없는 QR 상태입니다.");
      return;
    }
    setBusy(true);
    setMessage("서버에서 가격·재고·하위사업자·차액분배를 다시 검증하고 있습니다.");
    try {
      const mobile = isMobileBrowser();
      const order = await requestPayupOrder({
        shortCode: session.shortCode,
        buyerName: receiver.customerName.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerPhone: receiver.customerPhone.trim(),
        receiver: {
          deliveryMethod: receiver.deliveryMethod,
          address: receiver.address,
          addressDetail: receiver.addressDetail,
        },
        userAgent: mobile ? "WM" : "WP",
      });
      activePaymentSessionId.current = order.paymentSessionId;
      activeClientToken.current = order.clientToken;
      activeBuyerPhone.current = receiver.customerPhone.trim();
      rememberGuestVerification(order.orderNumber, receiver.customerPhone);
      const form = buildPaymentForm(order, mobile);
      activeForm.current = form;
      if (mobile) {
        setMessage("모바일 카드 인증 결제창으로 이동합니다.");
        form.submit();
        return;
      }
      await loadPcScript(order.pcScriptUrl);
      window.nicepaySubmit = () => void approvePc(order, form);
      window.nicepayClose = () => {
        void abortCurrent("고객이 PC 결제창을 종료했습니다.");
        setBusy(false);
        setMessage("결제창을 닫았습니다. 카드 승인은 처리되지 않았습니다.");
      };
      if (!window.goPay) throw new Error("PC 결제창 실행 함수를 불러오지 못했습니다.");
      setMessage("PC 카드 인증 결제창을 열었습니다.");
      window.goPay(form);
    } catch (error) {
      await abortCurrent("결제창 시작 실패");
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "PayUp 결제를 시작하지 못했습니다.");
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f5f1eb] px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-md rounded-md bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black">PayUp QR 결제</h1>
          <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>
          <Link href="/tablet/cart" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">장바구니로 이동</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] px-4 py-6 text-slate-950">
      <section className="mx-auto grid max-w-md gap-4">
        <article className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">PAYUP CART DISTRIBUTION</p>
          <h1 className="mt-2 text-2xl font-black">장바구니 차액정산 결제</h1>
          <p className="mt-2 text-sm font-semibold leading-6">최종승인 전에 서버가 상품가격·재고·공급사 상품대금·A5S 이용료·파트너 차액과 전체 합계를 다시 검증합니다.</p>
        </article>

        <section className="rounded-md bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-black text-slate-500">QR 코드</p><h2 className="mt-1 text-2xl font-black">{session.shortCode}</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${payable ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{session.status}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {session.items.map((item) => (
              <div key={`${item.productId}-${item.optionName}`} className="rounded-md bg-slate-50 p-3">
                <p className="font-black">{item.productName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{item.optionName} · {item.quantity}개</p>
                <p className="mt-2 text-right font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-lg"><span className="font-black">총 승인금액</span><strong className="text-rose-600">{formatCurrency(session.totalAmount)}</strong></div>
        </section>

        <QrReceiverForm session={session} onChange={setReceiver} />
        <label className="grid gap-1 rounded-md bg-white p-4 text-sm font-black text-slate-700 shadow-sm">결제 영수증 이메일 · 선택<input type="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} className="mt-1 h-12 rounded-md border border-slate-200 px-3 text-base font-semibold" placeholder="email@example.com" /></label>
        <button type="button" disabled={busy || !payable} onClick={() => void startPayment()} className="rounded-md bg-rose-600 px-4 py-4 text-base font-black text-white disabled:opacity-50">{busy ? "PayUp 결제 준비 중" : `${formatCurrency(session.totalAmount)} 결제 진행`}</button>
        <p className="rounded-md bg-white p-3 text-sm font-bold leading-6 text-slate-700 shadow-sm">{message}</p>
        <p className="text-center text-xs font-semibold leading-5 text-slate-500">실제 PayUp 거래번호가 발급되고 서버 원장 저장이 완료된 경우에만 결제완료로 처리됩니다.</p>
      </section>
    </main>
  );
}
