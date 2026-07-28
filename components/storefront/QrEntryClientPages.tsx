"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";

type ClaimResponse = {
  ok?: boolean;
  guestShopSessionId?: string;
  entryToken?: string;
  expiresAt?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

function guestShopEntryTokenKey(sessionId: string) {
  return `a5-guest-shop-entry:${sessionId}`;
}

function writeGuestShopEntryToken(sessionId: string, token: string, expiresAt?: string) {
  if (!sessionId || !token) return;

  const key = guestShopEntryTokenKey(sessionId);
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 3 * 60 * 60 * 1000;

  window.sessionStorage.setItem(key, token);
  window.localStorage.setItem(
    key,
    JSON.stringify({
      token,
      expiresAt: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 3 * 60 * 60 * 1000,
    }),
  );
}

function QrFrame({
  title,
  message,
  failed,
  code,
}: {
  title: string;
  message: string;
  failed?: boolean;
  code: string;
}) {
  return (
    <main className="min-h-dvh bg-white px-3 py-4 text-slate-950">
      <section className="mx-auto max-w-[430px] rounded-md bg-white p-5 shadow-sm">
        <p className="text-xs font-normal uppercase tracking-[0.16em] text-rose-500">위드커머스 QR</p>
        <h1 className="mt-2 text-2xl font-normal">{title}</h1>
        <p className={`mt-3 rounded-md px-3 py-3 text-sm font-normal ${failed ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700"}`}>
          {message}
        </p>
        <p className="mt-3 break-all text-xs font-normal text-slate-400">QR code: {code}</p>
        {failed ? (
          <Link href={`/q/live/?code=${encodeURIComponent(code)}`} className="mt-4 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-normal text-white">
            실시간 QR 페이지 열기
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function targetHref(path: string, sessionId: string) {
  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  return `${normalizedPath}?sessionId=${encodeURIComponent(sessionId)}`;
}

export function QrGuestShopClaimClientPage({
  code,
  targetPath = "/m/shop/",
}: {
  code: string;
  targetPath?: "/m/shop/" | "/m/shop/checkout/";
}) {
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.guestShopClaim, []);
  const [message, setMessage] = useState("Preparing the mobile shopping session...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function claim() {
      if (!endpoint) {
        setFailed(true);
        setMessage("Guest shop claim endpoint is not configured.");
        return;
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, shortCode: code, source: "qr_entry" }),
        });
        const payload = (await response.json().catch(() => ({}))) as ClaimResponse;

        if (cancelled) return;

        if (!response.ok || payload.ok === false || !payload.guestShopSessionId || !payload.entryToken) {
          throw new Error(payload.error?.message || payload.message || `QR claim failed. HTTP ${response.status}`);
        }

        writeGuestShopEntryToken(payload.guestShopSessionId, payload.entryToken, payload.expiresAt);
        setMessage("모바일 쇼핑 세션이 준비되었습니다. 이동 중입니다.");
        window.location.replace(targetHref(targetPath, payload.guestShopSessionId));
      } catch (error) {
        if (cancelled) return;
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "QR claim failed.");
      }
    }

    void claim();

    return () => {
      cancelled = true;
    };
  }, [code, endpoint, targetPath]);

  return <QrFrame title="QR Entry" message={message} failed={failed} code={code} />;
}

export function QrLiveRedirectClientPage({
  code,
  paymentResult,
}: {
  code: string;
  paymentResult?: "success" | "failed";
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("code", code);
    if (paymentResult) params.set("paymentResult", paymentResult);

    window.location.replace(`/q/live/?${params.toString()}`);
  }, [code, paymentResult]);

  return <QrFrame title="QR 상태" message="실시간 QR 페이지를 여는 중입니다." code={code} />;
}
