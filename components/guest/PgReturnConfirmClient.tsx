"use client";

import { useEffect, useMemo, useState } from "react";
import { clearPaymentReceiver, readPaymentReceiver } from "@/lib/payments/paymentBrowserStorage";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { shouldAllowMockPaymentRuntime } from "@/lib/payments/paymentConfig";
import type { QrPaymentSession } from "@/types/commerce";

type ReturnState =
  | { status: "idle"; message: string }
  | { status: "checking"; message: string; orderNo?: string }
  | { status: "confirmed"; message: string; orderNo?: string }
  | { status: "failed"; message: string };

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

type ConfirmResponse = {
  ok: boolean;
  orderNo: string;
  orderLookupUrl?: string;
  recalculatedAmount: number;
  message: string;
};

type SyncPendingResponse = {
  ok: true;
  status: "pending_payment_link";
  message: string;
  transactionStatus?: string;
  orderNo?: string;
  paymentIntentId?: string;
};

type StatusResponse = {
  ok: boolean;
  orderNo?: string;
  status?: string;
  message: string;
};

type A5ReturnContext = {
  provider?: string;
  paymentIntentId?: string;
  orderNo?: string;
  qrSessionId?: string;
  shortCode?: string;
};

export function PgReturnConfirmClient({ session }: { session: QrPaymentSession }) {
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const [state, setState] = useState<ReturnState>({
    status: "idle",
    message: "주문 상태를 확인하고 있습니다.",
  });

  useEffect(() => {
    let cancelled = false;

    function completePayment(input: { paymentIntentId: string; orderNo: string; orderLookupUrl?: string; message?: string }) {
      if (cancelled) return;

      clearPaymentReceiver(input.paymentIntentId);
      setState({
        status: "confirmed",
        orderNo: input.orderNo,
        message: input.message ?? "결제가 확인되었습니다.",
      });
      window.location.replace(input.orderLookupUrl || liveConfirmedUrl(session.shortCode, input.orderNo, input.paymentIntentId));
    }

    async function run() {
      if (!endpoints.ready) {
        setState({ status: "failed", message: "결제 확인 서버 주소가 배포 번들에 포함되지 않았습니다." });
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const bypassValue = getReturnParam(params, ["bypassValue", "bypass_value", "BypassValue"]);
      const mallReserved = getReturnParam(params, ["mallReserved", "MallReserved", "mall_reserved", "reserved", "reserved1"]);
      const returnContext = readA5ReturnContext(bypassValue || mallReserved);
      const paymentIntentId =
        getReturnParam(params, ["paymentIntentId", "payment_intent_id", "paymentIntent", "payIntentId"]) ||
        returnContext.paymentIntentId ||
        "";
      const orderNo =
        getReturnParam(params, ["orderNo", "orderId", "order_no", "orderNumber", "ORDERNUMBER", "MOID", "Moid", "moid"]) ||
        returnContext.orderNo ||
        "";
      const provider = getReturnParam(params, ["provider", "pgProvider", "pg_provider"]) || returnContext.provider || "payup";
      const providerPaymentKey = getReturnParam(params, ["paymentKey", "payment_key", "payToken", "PayToken"]);
      const transactionId = getReturnParam(params, ["transactionId", "transaction_id", "tid", "TID", "pgTid", "PgTid"]);
      const receiptUrl = getReturnParam(params, ["receiptUrl", "receipt_url"]);
      const pgResultCode = getReturnParam(params, ["ResultCode", "resultCode", "result_code", "resultCd", "result_cd"]);
      const pgResultMessage = getReturnParam(params, ["ResultMsg", "resultMsg", "result_msg", "resultMessage"]);
      const paymentResult = getReturnParam(params, ["paymentResult", "payment_result"]);
      const storedReceiver = readPaymentReceiver(paymentIntentId);
      const successfulStatuses = shouldAllowMockPaymentRuntime() ? ["approved", "approved_mock", "paid"] : ["approved", "paid"];
      void recordPgReturnTrace({
        url: endpoints.endpoints.returnTrace,
        params,
        paymentIntentId,
        orderNo,
        transactionId,
        provider,
        session,
      });

      if (!paymentIntentId && !orderNo) {
        setState({ status: "idle", message: "주문 접수 정보가 없어 결제 상태를 확인할 수 없습니다." });
        return;
      }

      if (paymentResult === "failed" || (pgResultCode && !["0000", "3001", "4100"].includes(pgResultCode))) {
        setState({
          status: "failed",
          message: pgResultMessage || `PG 결제가 승인되지 않았습니다. 결과코드 ${pgResultCode}`,
        });
        return;
      }

      setState({ status: "checking", message: "결제 승인 결과를 서버에서 확인하고 있습니다." });

      const statusResult = await getStatus(endpoints.endpoints.status, { paymentIntentId, orderNo });
      if (cancelled) return;

      if (statusResult.ok && successfulStatuses.includes(String(statusResult.data.status))) {
        completePayment({
          paymentIntentId,
          orderNo: statusResult.data.orderNo || orderNo,
        });
        return;
      }

      const normalizedProvider = provider.trim().toLowerCase().replace(/[\s_-]/g, "");
      if ((normalizedProvider === "payup" || normalizedProvider === "payuppg") && !transactionId) {
        setState({
          status: "failed",
          message: "PayUp 거래번호가 전달되지 않아 승인을 요청하지 않았습니다. 카드 과금도 요청하지 않았습니다.",
        });
        return;
      }

      if (isLegacyInnopayReturnProvider(provider) && endpoints.endpoints.syncInnopaySms && (paymentIntentId || orderNo) && (transactionId || orderNo)) {
        const syncResult = await postJson<ConfirmResponse | SyncPendingResponse>(endpoints.endpoints.syncInnopaySms, {
          paymentIntentId,
          orderNo,
          tid: transactionId,
        });
        if (cancelled) return;

        if (syncResult.ok && isConfirmedResponse(syncResult.data)) {
          completePayment({
            paymentIntentId,
            orderNo: syncResult.data.orderNo,
            orderLookupUrl: syncResult.data.orderLookupUrl,
            message: "PG 거래 조회를 통해 결제가 확인되었습니다.",
          });
          return;
        }

        if (syncResult.ok) {
          setState({
            status: "checking",
            orderNo: syncResult.data.orderNo || orderNo,
            message: syncResult.data.message || "PG 결제 결과를 아직 확인 중입니다.",
          });
          return;
        }

        if (!paymentIntentId) {
          setState({ status: "failed", message: syncResult.error.message });
          return;
        }
      }

      if (!paymentIntentId) {
        setState({ status: "idle", message: "결제 결과가 돌아왔지만 결제 요청 ID가 없어 서버 확정을 대기합니다." });
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
        ...storedReceiver,
      });
      if (cancelled) return;

      if (!confirmResult.ok) {
        setState({ status: "failed", message: confirmResult.error.message });
        return;
      }

      completePayment({
        paymentIntentId,
        orderNo: confirmResult.data.orderNo,
        orderLookupUrl: confirmResult.data.orderLookupUrl,
      });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [endpoints, session]);

  return (
    <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-normal text-slate-700">
      <p>{state.message}</p>
      {state.status === "confirmed" && state.orderNo ? <p className="mt-1 text-slate-950">주문번호 {state.orderNo}</p> : null}
      {state.status === "failed" ? <p className="mt-1 text-red-700">결제 확인이 필요합니다.</p> : null}
    </div>
  );
}

function liveConfirmedUrl(shortCode: string, orderNo: string, paymentIntentId: string) {
  const params = new URLSearchParams({
    code: shortCode,
    paymentResult: "server-confirmed",
    orderNo,
    paymentIntentId,
  });
  return `/q/live/?${params.toString()}`;
}

function getReturnParam(params: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = params.get(key);
    if (value?.trim()) return value.trim();
  }

  const lowerMap = new Map(Array.from(params.entries()).map(([key, value]) => [key.toLowerCase(), value]));
  for (const key of keys) {
    const value = lowerMap.get(key.toLowerCase());
    if (value?.trim()) return value.trim();
  }

  return "";
}

function readA5ReturnContext(value: string): A5ReturnContext {
  const text = value.trim();
  if (!text) return {};
  if (text.startsWith("a5:")) {
    const [paymentIntentId, orderNo, shortCode] = text.slice(3).split(":").map((item) => item.trim());
    return { provider: "payup", paymentIntentId, orderNo, shortCode };
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      provider: readString(parsed.provider ?? parsed.pgProvider ?? parsed.pg_provider),
      paymentIntentId: readString(parsed.paymentIntentId ?? parsed.payment_intent_id ?? parsed.paymentIntent),
      orderNo: readString(parsed.orderNo ?? parsed.order_no ?? parsed.orderNumber),
      qrSessionId: readString(parsed.qrSessionId ?? parsed.qr_session_id),
      shortCode: readString(parsed.shortCode ?? parsed.short_code ?? parsed.returnCode),
    };
  } catch {
    return {};
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isLegacyInnopayReturnProvider(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]/g, "");
  return normalized === "infiny" || normalized === "infini" || normalized.includes("innopay");
}

function isConfirmedResponse(value: ConfirmResponse | SyncPendingResponse): value is ConfirmResponse {
  return "recalculatedAmount" in value && Boolean(value.orderNo);
}

async function recordPgReturnTrace(input: {
  url: string;
  params: URLSearchParams;
  paymentIntentId: string;
  orderNo: string;
  transactionId: string;
  provider: string;
  session: QrPaymentSession;
}) {
  if (!input.url || input.params.size === 0) return;

  await postJson(input.url, {
    provider: input.provider,
    paymentIntentId: input.paymentIntentId,
    orderNo: input.orderNo,
    transactionId: input.transactionId,
    shortCode: input.session.shortCode,
    qrSessionId: input.session.id,
    href: window.location.href,
    params: Object.fromEntries(input.params.entries()),
  });
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
