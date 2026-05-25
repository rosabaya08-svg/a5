"use client";

import { useMemo, useState } from "react";
import { buildPgCheckoutPayload, getPgBridgeStatus, requestPgModulePayment } from "@/lib/payments/pgCheckoutBridge";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { formatCurrency } from "@/lib/utils/format";

type PgIntegrationPanelProps = {
  amount: number;
  orderNo: string;
  orderName: string;
  customerName: string;
  customerPhoneMasked: string;
  qrSessionId: string;
};

export function PgIntegrationPanel({
  amount,
  orderNo,
  orderName,
  customerName,
  customerPhoneMasked,
  qrSessionId,
}: PgIntegrationPanelProps) {
  const [probeMessage, setProbeMessage] = useState("PG module probe not executed.");
  const bridgeStatus = useMemo(() => getPgBridgeStatus(), []);
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const payload = useMemo(
    () =>
      buildPgCheckoutPayload({
        orderNo,
        orderName,
        amount,
        customerName,
        customerPhoneMasked,
        qrSessionId,
      }),
    [amount, customerName, customerPhoneMasked, orderName, orderNo, qrSessionId],
  );

  async function probePgModule() {
    const result = await requestPgModulePayment(payload);
    setProbeMessage(result.message ?? "PG module probe completed without a provider message.");
  }

  const rows = [
    ["Provider", bridgeStatus.provider],
    ["Client key", bridgeStatus.missing.includes("NEXT_PUBLIC_PG_CLIENT_KEY") ? "missing" : "configured"],
    ["Channel/Merchant", bridgeStatus.missing.includes("NEXT_PUBLIC_PG_CHANNEL_KEY") || bridgeStatus.missing.includes("NEXT_PUBLIC_PG_MERCHANT_ID") ? "missing" : "configured"],
    ["Functions base", endpoints.ready ? "configured" : "missing"],
    ["Browser module", bridgeStatus.moduleLoaded ? "loaded" : "not loaded"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">PG module handoff</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">PG 키 입력 직전 연결 슬롯</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            고객 화면은 PG 브라우저 모듈, Firebase Functions ready/confirm endpoint, 서버 금액 재계산 계약을 모두 분리해 둔 상태입니다.
            실제 승인 호출은 provider SDK와 Secret Manager 값이 들어온 뒤에만 켭니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${bridgeStatus.configured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {bridgeStatus.configured ? "public config ready" : "keys pending"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">결제 예정 금액</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(amount)}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Ready endpoint</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-700">{payload.readyEndpoint || "missing"}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">Confirm endpoint</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-700">{payload.confirmEndpoint || "missing"}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-100 p-3">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
        <p className="font-black">PG사 키 수령 후 교체 지점</p>
        <p className="mt-1">
          `NEXT_PUBLIC_PG_*`는 브라우저 SDK 초기화에만 쓰고, `PG_SECRET_KEY`와 `PG_WEBHOOK_SECRET`은 Firebase Functions Secret Manager에만 넣습니다.
          이 화면의 probe 버튼은 실제 결제를 만들지 않고 모듈 로딩 여부만 확인합니다.
        </p>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <p className="rounded-md bg-slate-50 p-3 text-xs font-bold text-slate-600">{probeMessage}</p>
        <button
          type="button"
          onClick={probePgModule}
          className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          PG module probe
        </button>
      </div>
    </section>
  );
}
