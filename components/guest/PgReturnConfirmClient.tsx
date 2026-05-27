"use client";

import { useEffect, useMemo, useState } from "react";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import type { QrPaymentSession } from "@/types/commerce";

type ReturnState =
  | { status: "idle"; message: string }
  | { status: "checking"; message: string }
  | { status: "confirmed"; message: string; orderNo?: string }
  | { status: "failed"; message: string };

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

type ConfirmResponse = {
  ok: boolean;
  orderNo: string;
  recalculatedAmount: number;
  message: string;
};

type StatusResponse = {
  ok: boolean;
  orderNo?: string;
  status?: string;
  message: string;
};

export function PgReturnConfirmClient({ session }: { session: QrPaymentSession }) {
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const [state, setState] = useState<ReturnState>({
    status: "idle",
    message: "주문 상태를 확인하고 있습니다.",
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!endpoints.ready) {
        setState({ status: "failed", message: "결제 확인 서버 연결이 준비되지 않았습니다." });
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const paymentIntentId = params.get("paymentIntentId") || params.get("payment_intent_id") || "";
      const orderNo = params.get("orderNo") || params.get("orderId") || params.get("order_no") || "";
      const providerPaymentKey = params.get("paymentKey") || params.get("payment_key") || "";
      const transactionId = params.get("transactionId") || params.get("transaction_id") || params.get("tid") || "";
      const receiptUrl = params.get("receiptUrl") || params.get("receipt_url") || "";

      if (!paymentIntentId && !orderNo) {
        setState({ status: "idle", message: "주문 접수가 완료되었습니다." });
        return;
      }

      setState({ status: "checking", message: "결제 승인 결과를 확인하고 있습니다." });

      const statusResult = await getStatus(endpoints.endpoints.status, { paymentIntentId, orderNo });
      if (cancelled) return;

      if (statusResult.ok && ["approved", "approved_mock", "paid"].includes(String(statusResult.data.status))) {
        setState({
          status: "confirmed",
          orderNo: statusResult.data.orderNo || orderNo,
          message: "결제가 확인되었습니다.",
        });
        return;
      }

      if (!paymentIntentId || (!providerPaymentKey && !transactionId)) {
        setState({
          status: statusResult.ok ? "confirmed" : "idle",
          orderNo: statusResult.ok ? statusResult.data.orderNo : orderNo,
          message: statusResult.ok ? "주문 상태를 확인했습니다." : "주문 접수가 완료되었습니다.",
        });
        return;
      }

      const confirmResult = await postJson<ConfirmResponse>(endpoints.endpoints.confirm, {
        qrSessionId: session.id,
        shortCode: session.shortCode,
        cartId: session.cartId,
        nurseryId: session.nurseryId,
        roomId: session.roomId,
        tabletId: session.tabletId,
        clientAmount: session.totalAmount,
        currency: "KRW",
        items: session.items,
        paymentIntentId,
        orderNoCandidate: orderNo || undefined,
        providerPaymentKey,
        transactionId,
        receiptUrl,
      });
      if (cancelled) return;

      if (!confirmResult.ok) {
        setState({ status: "failed", message: confirmResult.error.message });
        return;
      }

      setState({
        status: "confirmed",
        orderNo: confirmResult.data.orderNo,
        message: "결제가 확인되었습니다.",
      });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [endpoints, session]);

  return (
    <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">
      <p>{state.message}</p>
      {state.status === "confirmed" && state.orderNo ? <p className="mt-1 text-slate-950">주문번호 {state.orderNo}</p> : null}
      {state.status === "failed" ? <p className="mt-1 text-red-700">결제 확인이 필요합니다.</p> : null}
    </div>
  );
}

async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || data?.ok === false) {
      return { ok: false, error: data?.error ?? { code: "REQUEST_FAILED", message: "요청을 처리하지 못했습니다." } };
    }
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "네트워크 요청에 실패했습니다.",
      },
    };
  }
}

async function getStatus(url: string, params: { paymentIntentId?: string; orderNo?: string }): Promise<ApiResult<StatusResponse>> {
  const query = new URLSearchParams();
  if (params.paymentIntentId) query.set("paymentIntentId", params.paymentIntentId);
  if (params.orderNo) query.set("orderNo", params.orderNo);
  return postLikeGet(`${url}?${query.toString()}`);
}

async function postLikeGet<T>(url: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data?.ok === false) {
      return { ok: false, error: data?.error ?? { code: "REQUEST_FAILED", message: "요청을 처리하지 못했습니다." } };
    }
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "네트워크 요청에 실패했습니다.",
      },
    };
  }
}
