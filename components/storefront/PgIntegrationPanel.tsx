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
  merchantId?: string;
  moduleKey?: string;
};

export function PgIntegrationPanel({
  amount,
  orderNo,
  orderName,
  customerName,
  customerPhoneMasked,
  qrSessionId,
  merchantId,
  moduleKey,
}: PgIntegrationPanelProps) {
  const [probeMessage, setProbeMessage] = useState("PG 모듈 점검을 아직 실행하지 않았습니다.");
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
        merchantId,
        moduleKey,
      }),
    [amount, customerName, customerPhoneMasked, merchantId, moduleKey, orderName, orderNo, qrSessionId],
  );

  async function probePgModule() {
    const result = await requestPgModulePayment(payload);
    setProbeMessage(result.message ?? "PG 모듈 점검이 완료되었지만 PG사 응답 메시지는 없습니다.");
  }

  const rows = [
    ["PG사", bridgeStatus.provider],
    ["클라이언트 키", bridgeStatus.missing.includes("NEXT_PUBLIC_PG_CLIENT_KEY") ? "미입력" : "입력됨"],
    ["채널/상점 정보", !payload.channelKey || !payload.merchantId ? "미입력" : "입력됨"],
    ["함수 기본 주소", endpoints.ready ? "입력됨" : "미입력"],
    ["브라우저 모듈", bridgeStatus.moduleLoaded ? "로드됨" : "미로드"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">PG 모듈 인계</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">PG 키 입력 직전 연결 슬롯</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            고객 화면은 PG 브라우저 모듈, Firebase Functions 준비/승인 엔드포인트, 서버 금액 재계산 계약을 모두 분리해 둔 상태입니다.
            실제 승인 호출은 provider SDK와 Secret Manager 값이 들어온 뒤에만 켭니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${bridgeStatus.configured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {bridgeStatus.configured ? "공개 설정 준비" : "키 입력 대기"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">결제 예정 금액</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(amount)}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">결제 준비 주소</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-700">{payload.readyEndpoint || "미입력"}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">결제 승인 주소</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-700">{payload.confirmEndpoint || "미입력"}</p>
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
          이 화면의 점검 버튼은 실제 결제를 만들지 않고 모듈 로딩 여부만 확인합니다.
        </p>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <p className="rounded-md bg-slate-50 p-3 text-xs font-bold text-slate-600">{probeMessage}</p>
        <button
          type="button"
          onClick={probePgModule}
          className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          PG 모듈 점검
        </button>
      </div>
    </section>
  );
}
