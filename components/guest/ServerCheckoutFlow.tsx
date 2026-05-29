"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isQrReceiverFormComplete, maskCustomerPhone, type QrReceiverFormValue } from "@/components/storefront/QrReceiverForm";
import { mockCompanies } from "@/data/mockCompanies";
import { analyzeInfinyCart } from "@/lib/payments/infinySettlementPolicy";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { getPaymentReadiness } from "@/lib/payments/paymentService";
import { buildPgCheckoutPayload, requestPgModulePayment, type PgRuntimeOverride } from "@/lib/payments/pgCheckoutBridge";
import { formatCurrency } from "@/lib/utils/format";
import type { CartItemSnapshot, QrPaymentSession } from "@/types/commerce";

type CheckoutApiError = {
  code: string;
  message: string;
  httpStatus?: number;
  details?: unknown;
};

type ReadyResponse = {
  ok: true;
  provider: string;
  pgReady: boolean;
  merchantProfile?: {
    companyId: string;
    companyName: string;
    provider: string;
    merchantId?: string;
    merchantIdMasked: string;
    moduleKey?: string;
    moduleKeyMasked: string;
    merchantStatus: string;
    paymentReady: boolean;
  };
  pgClientConfig?: PgRuntimeOverride;
  paymentIntentId: string;
  orderNoCandidate: string;
  qrSessionId: string;
  recalculatedAmount: number;
  currency: "KRW";
  expiresAt: string;
  firestoreTransactionPlan: string[];
  message: string;
};

type ConfirmResponse = {
  ok: true;
  provider: string;
  pgReady: boolean;
  merchantProfile?: ReadyResponse["merchantProfile"];
  approval: {
    status: "approved_mock" | "approved";
    mockTid: string;
    paymentKey?: string;
    transactionId?: string;
    receiptUrl?: string;
    realPgCalled?: boolean;
    approvedAt: string;
    message: string;
  };
  orderNo: string;
  recalculatedAmount: number;
  firestoreTransactionPlan: string[];
  message: string;
};

type StartInnopaySmsResponse = {
  ok: true;
  provider: "infiny";
  status: "pending_payment_link";
  paymentIntentId: string;
  orderNo: string;
  amount?: number;
  resultCode: string;
  resultMsg: string;
  buyerPhoneMasked?: string;
  message: string;
};

type StatusResponse = {
  ok: true;
  source: "firebase_functions";
  paymentIntentId?: string;
  orderNo?: string;
  status?: string;
  amount?: number;
  currency?: "KRW";
  provider?: string;
  message: string;
};

type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: CheckoutApiError;
    };

type StoredPaymentFlow = {
  shortCode: string;
  qrSessionId: string;
  paymentIntentId?: string;
  orderNo?: string;
  amount: number;
  status: "idle" | "ready" | "pending_payment_link" | "confirmed_mock" | "confirmed" | "failed";
  source: "firebase_functions" | "local_ui";
  message: string;
  updatedAt: string;
  error?: CheckoutApiError;
};

function paymentFlowKey(shortCode: string) {
  return `a5-server-payment-flow:${shortCode}`;
}

function toServerItem(item: CartItemSnapshot) {
  return {
    productId: item.productId,
    productName: item.productName,
    optionName: item.optionName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    companyId: item.companyId,
  };
}

function checkoutPayload(session: QrPaymentSession, clientAmount = session.totalAmount) {
  return {
    qrSessionId: session.id,
    shortCode: session.shortCode,
    cartId: session.cartId,
    nurseryId: session.nurseryId,
    roomId: session.roomId,
    tabletId: session.tabletId,
    clientAmount,
    currency: "KRW" as const,
    items: session.items.map(toServerItem),
  };
}

function receiverPayload(receiver?: QrReceiverFormValue) {
  if (!receiver) return {};

  return {
    customerName: receiver.customerName.trim(),
    customerPhone: receiver.customerPhone.trim(),
    customerPhoneMasked: maskCustomerPhone(receiver.customerPhone),
    deliveryMethod: receiver.deliveryMethod,
    receiverAddress: receiver.address,
    receiverAddressDetail: receiver.addressDetail,
  };
}

function normalizeApiError(error: unknown, fallback: string): CheckoutApiError {
  if (typeof error === "object" && error !== null) {
    const candidate = error as Partial<CheckoutApiError>;
    return {
      code: String(candidate.code ?? "CHECKOUT_FLOW_ERROR"),
      message: String(candidate.message ?? fallback),
      httpStatus: typeof candidate.httpStatus === "number" ? candidate.httpStatus : undefined,
      details: candidate.details,
    };
  }

  return {
    code: "CHECKOUT_FLOW_ERROR",
    message: fallback,
  };
}

async function postPaymentFunction<T>(url: string, payload: Record<string, unknown>): Promise<ApiResult<T>> {
  if (!url) {
    return {
      ok: false,
      error: {
        code: "PAYMENT_ENDPOINT_MISSING",
        message: "NEXT_PUBLIC_PAYMENT_API_BASE_URL이 누락되었습니다. Firebase Functions 결제 주소가 설정되지 않았습니다.",
      },
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Client": "guest-checkout",
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: CheckoutApiError };

    if (!response.ok || data.ok === false) {
      return {
        ok: false,
        error: normalizeApiError(data.error, `결제 서버가 HTTP ${response.status}를 반환했습니다.`),
      };
    }

    return { ok: true, data: data as T };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "PAYMENT_FUNCTION_FETCH_FAILED",
        message: error instanceof Error ? error.message : "결제 함수 요청이 실패했습니다.",
      },
    };
  }
}

async function getPaymentStatus(url: string, params: { paymentIntentId?: string; orderNo?: string }): Promise<ApiResult<StatusResponse>> {
  if (!url) {
    return {
      ok: false,
      error: {
        code: "PAYMENT_STATUS_ENDPOINT_MISSING",
        message: "결제 상태 조회 주소가 설정되지 않았습니다.",
      },
    };
  }

  const query = new URLSearchParams();
  if (params.paymentIntentId) query.set("paymentIntentId", params.paymentIntentId);
  if (params.orderNo) query.set("orderNo", params.orderNo);

  if (!query.toString()) {
    return {
      ok: false,
      error: {
        code: "PAYMENT_STATUS_QUERY_MISSING",
        message: "상태 조회에는 paymentIntentId 또는 orderNo가 필요합니다.",
      },
    };
  }

  try {
    const response = await fetch(`${url}?${query.toString()}`, {
      method: "GET",
      headers: {
        "X-A5-Client": "guest-payment-status",
      },
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: CheckoutApiError };

    if (!response.ok || data.ok === false) {
      return {
        ok: false,
        error: normalizeApiError(data.error, `결제 상태 조회가 HTTP ${response.status}를 반환했습니다.`),
      };
    }

    return { ok: true, data: data as StatusResponse };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "PAYMENT_STATUS_FETCH_FAILED",
        message: error instanceof Error ? error.message : "결제 상태 조회 요청이 실패했습니다.",
      },
    };
  }
}

function readStoredFlow(shortCode: string): StoredPaymentFlow | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const value = window.localStorage.getItem(paymentFlowKey(shortCode));
    return value ? (JSON.parse(value) as StoredPaymentFlow) : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredFlow(flow: StoredPaymentFlow) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(paymentFlowKey(flow.shortCode), JSON.stringify(flow));
  } catch {
    // Local storage is a convenience for static-export guest handoff only.
  }
}

function riskCopy(code?: string) {
  if (!code) return "서버 검증 전입니다.";

  if (code.includes("AMOUNT_MISMATCH")) return "클라이언트 금액과 서버 재계산 금액이 달라 결제가 차단되었습니다.";
  if (code.includes("OUT_OF_STOCK")) return "재고가 부족하여 결제가 차단되었습니다.";
  if (code.includes("QR_SESSION_EXPIRED")) return "QR 세션이 만료되어 새 QR 생성이 필요합니다.";
  if (code.includes("QR_SESSION_NOT_ACTIVE")) return "이미 결제되었거나 취소된 QR입니다.";
  if (code.includes("NOT_FOUND")) return "서버에서 QR/상품/결제 의도를 찾지 못했습니다.";

  return "서버 결제 계층에서 검증 오류가 발생했습니다.";
}

function isExpired(session: QrPaymentSession) {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

export function ServerCheckoutFlow({
  session,
  receiver,
}: {
  session: QrPaymentSession;
  dataSource: string;
  fallbackReason?: string;
  receiver?: QrReceiverFormValue;
}) {
  const router = useRouter();
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const readiness = useMemo(() => getPaymentReadiness(), []);
  const [ready, setReady] = useState<ReadyResponse>();
  const [, setConfirm] = useState<ConfirmResponse>();
  const [smsStart, setSmsStart] = useState<StartInnopaySmsResponse>();
  const [error, setError] = useState<CheckoutApiError>();
  const [pending, setPending] = useState<"ready" | "pg" | "sms" | "sync" | "confirm" | "amount-test" | "">("");
  const expired = isExpired(session);
  const activeQr = session.status === "active" && !expired;
  const pgClientConfig = ready?.pgClientConfig;
  const effectiveProvider = ready?.provider ?? readiness.provider;
  const providerIsMock = effectiveProvider === "mock";
  const providerIsInnopaySms = effectiveProvider === "infiny";
  const receiverComplete = receiver ? isQrReceiverFormComplete(receiver) : true;
  const merchantAnalysis = useMemo(() => analyzeInfinyCart(session.items, mockCompanies), [session.items]);
  const pgPolicyBlocked = !providerIsMock && merchantAnalysis.requiresSplitSettlementApi;
  const innopayCheckoutReady = Boolean(ready && !providerIsMock && ready.pgReady && providerIsInnopaySms);
  const innopayPrimaryDisabled = Boolean(pending) ||
    !activeQr ||
    !receiverComplete ||
    pgPolicyBlocked ||
    !endpoints.ready ||
    Boolean(ready && !providerIsMock && (!innopayCheckoutReady || !endpoints.endpoints.startInnopaySms));
  const innopayStatusLabel = smsStart
    ? "SMS 결제요청 완료"
    : innopayCheckoutReady
      ? "인피니 결제 준비 완료"
      : ready && providerIsMock
        ? "결제 가능"
      : ready
        ? "MID/키 입력 대기"
        : "결제 준비 전";
  const innopayBlockedReason = !activeQr
    ? "QR이 만료되었거나 이미 사용되었습니다."
    : !receiverComplete
      ? "고객명, 연락처, 주소와 동의 체크가 필요합니다."
      : pgPolicyBlocked
        ? "여러 기업 MID가 섞여 있어 기업별 QR로 나누어야 합니다."
        : ready && !providerIsMock && !innopayCheckoutReady
          ? "아직 MID 또는 인피니 키값이 저장되지 않아 실제 결제요청은 대기 중입니다."
          : !ready
            ? "결제하기를 누르면 서버 금액 검증 후 인피니 단계로 넘어갑니다."
            : "";

  const pgPayload = useMemo(
    () =>
      buildPgCheckoutPayload({
        orderNo: ready?.orderNoCandidate ?? `A5-${session.shortCode}`,
        orderName: `with.commerce ${session.shortCode}`,
        amount: ready?.recalculatedAmount ?? session.totalAmount,
        customerName: "비회원 고객",
        customerPhoneMasked: "010-****-0000",
        qrSessionId: session.id,
        returnCode: session.shortCode,
        merchantId: ready?.merchantProfile?.merchantId,
        moduleKey: ready?.merchantProfile?.moduleKey,
        runtimeConfig: pgClientConfig,
      }),
    [pgClientConfig, ready?.merchantProfile?.merchantId, ready?.merchantProfile?.moduleKey, ready?.orderNoCandidate, ready?.recalculatedAmount, session.id, session.shortCode, session.totalAmount],
  );

  async function runReady(clientAmount = session.totalAmount, intent: "ready" | "amount-test" = "ready") {
    setPending(intent);
    setError(undefined);

    const result = await postPaymentFunction<ReadyResponse>(endpoints.endpoints.ready, checkoutPayload(session, clientAmount));

    setPending("");

    if (!result.ok) {
      setError(result.error);
      writeStoredFlow({
        shortCode: session.shortCode,
        qrSessionId: session.id,
        amount: session.totalAmount,
        status: "failed",
        source: "firebase_functions",
        message: result.error.message,
        updatedAt: new Date().toISOString(),
        error: result.error,
      });
      return undefined;
    }

    setReady(result.data);
    writeStoredFlow({
      shortCode: session.shortCode,
      qrSessionId: session.id,
      paymentIntentId: result.data.paymentIntentId,
      orderNo: result.data.orderNoCandidate,
      amount: result.data.recalculatedAmount,
      status: "ready",
      source: "firebase_functions",
      message: result.data.message,
      updatedAt: new Date().toISOString(),
    });
    return result.data;
  }

  async function runConfirm(preparedReady = ready) {
    if (!preparedReady) return;
    if (receiver && !isQrReceiverFormComplete(receiver)) {
      setError({
        code: "RECEIVER_REQUIRED",
        message: "고객명, 연락처, 주소와 개인정보 동의를 먼저 입력해야 결제를 진행할 수 있습니다.",
      });
      return;
    }

    setPending("confirm");
    setError(undefined);

    const result = await postPaymentFunction<ConfirmResponse>(endpoints.endpoints.confirm, {
      ...checkoutPayload(session, preparedReady.recalculatedAmount),
      paymentIntentId: preparedReady.paymentIntentId,
      orderNoCandidate: preparedReady.orderNoCandidate,
      mockApprovalRequested: true,
      ...receiverPayload(receiver),
    });

    setPending("");

    if (!result.ok) {
      setError(result.error);
      writeStoredFlow({
        shortCode: session.shortCode,
        qrSessionId: session.id,
        paymentIntentId: preparedReady.paymentIntentId,
        orderNo: preparedReady.orderNoCandidate,
        amount: preparedReady.recalculatedAmount,
        status: "failed",
        source: "firebase_functions",
        message: result.error.message,
        updatedAt: new Date().toISOString(),
        error: result.error,
      });
      return;
    }

    setConfirm(result.data);
    writeStoredFlow({
      shortCode: session.shortCode,
      qrSessionId: session.id,
      paymentIntentId: preparedReady.paymentIntentId,
      orderNo: result.data.orderNo,
      amount: result.data.recalculatedAmount,
      status: result.data.approval.realPgCalled ? "confirmed" : "confirmed_mock",
      source: "firebase_functions",
      message: result.data.message,
      updatedAt: new Date().toISOString(),
    });
    router.push(`/q/${session.shortCode}/success?orderNo=${encodeURIComponent(result.data.orderNo)}&paymentIntentId=${encodeURIComponent(preparedReady.paymentIntentId)}`);
  }

  async function runProviderPayment(preparedReady = ready) {
    if (!preparedReady) return;
    if (receiver && !isQrReceiverFormComplete(receiver)) {
      setError({
        code: "RECEIVER_REQUIRED",
        message: "고객명, 연락처, 주소와 개인정보 동의를 먼저 입력해야 결제를 진행할 수 있습니다.",
      });
      return;
    }

    setPending("pg");
    setError(undefined);

    const pgResult = await requestPgModulePayment(pgPayload, pgClientConfig);
    if (!pgResult.ok) {
      setPending("");
      setError({
        code: "PG_BROWSER_MODULE_FAILED",
        message: pgResult.message ?? "PG 결제창 호출 결과를 확인할 수 없습니다.",
      });
      return;
    }

    setPending("confirm");

    const result = await postPaymentFunction<ConfirmResponse>(endpoints.endpoints.confirm, {
      ...checkoutPayload(session, preparedReady.recalculatedAmount),
      paymentIntentId: preparedReady.paymentIntentId,
      orderNoCandidate: preparedReady.orderNoCandidate,
      providerPaymentKey: pgResult.paymentKey,
      transactionId: pgResult.transactionId,
      receiptUrl: pgResult.receiptUrl,
      ...receiverPayload(receiver),
    });

    setPending("");

    if (!result.ok) {
      setError(result.error);
      writeStoredFlow({
        shortCode: session.shortCode,
        qrSessionId: session.id,
        paymentIntentId: preparedReady.paymentIntentId,
        orderNo: preparedReady.orderNoCandidate,
        amount: preparedReady.recalculatedAmount,
        status: "failed",
        source: "firebase_functions",
        message: result.error.message,
        updatedAt: new Date().toISOString(),
        error: result.error,
      });
      return;
    }

    setConfirm(result.data);
    writeStoredFlow({
      shortCode: session.shortCode,
      qrSessionId: session.id,
      paymentIntentId: preparedReady.paymentIntentId,
      orderNo: result.data.orderNo,
      amount: result.data.recalculatedAmount,
      status: result.data.approval.realPgCalled ? "confirmed" : "confirmed_mock",
      source: "firebase_functions",
      message: result.data.message,
      updatedAt: new Date().toISOString(),
    });
    router.push(`/q/${session.shortCode}/success?orderNo=${encodeURIComponent(result.data.orderNo)}&paymentIntentId=${encodeURIComponent(preparedReady.paymentIntentId)}`);
  }

  async function runInnopaySmsPayment(preparedReady = ready) {
    if (!preparedReady) return;
    if (receiver && !isQrReceiverFormComplete(receiver)) {
      setError({
        code: "RECEIVER_REQUIRED",
        message: "고객명, 연락처, 주소와 개인정보 동의를 먼저 입력해야 SMS 결제요청을 보낼 수 있습니다.",
      });
      return;
    }

    setPending("sms");
    setError(undefined);

    const result = await postPaymentFunction<StartInnopaySmsResponse>(endpoints.endpoints.startInnopaySms, {
      ...checkoutPayload(session, preparedReady.recalculatedAmount),
      paymentIntentId: preparedReady.paymentIntentId,
      orderNoCandidate: preparedReady.orderNoCandidate,
      ...receiverPayload(receiver),
    });

    setPending("");

    if (!result.ok) {
      setError(result.error);
      writeStoredFlow({
        shortCode: session.shortCode,
        qrSessionId: session.id,
        paymentIntentId: preparedReady.paymentIntentId,
        orderNo: preparedReady.orderNoCandidate,
        amount: preparedReady.recalculatedAmount,
        status: "failed",
        source: "firebase_functions",
        message: result.error.message,
        updatedAt: new Date().toISOString(),
        error: result.error,
      });
      return;
    }

    setSmsStart(result.data);
    writeStoredFlow({
      shortCode: session.shortCode,
      qrSessionId: session.id,
      paymentIntentId: preparedReady.paymentIntentId,
      orderNo: result.data.orderNo,
      amount: result.data.amount ?? preparedReady.recalculatedAmount,
      status: "pending_payment_link",
      source: "firebase_functions",
      message: result.data.message,
      updatedAt: new Date().toISOString(),
    });
  }

  async function runInnopaySmsSync() {
    const paymentIntentId = smsStart?.paymentIntentId ?? ready?.paymentIntentId;
    const orderNo = smsStart?.orderNo ?? ready?.orderNoCandidate;
    if (!paymentIntentId && !orderNo) return;

    setPending("sync");
    setError(undefined);

    const result = await postPaymentFunction<ConfirmResponse | { ok: true; status: "pending_payment_link"; message: string; transactionStatus?: string }>(
      endpoints.endpoints.syncInnopaySms,
      {
        paymentIntentId,
        orderNo,
      },
    );

    setPending("");

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if ("approval" in result.data) {
      const confirmedPaymentIntentId = paymentIntentId ?? result.data.approval.transactionId ?? "";
      setConfirm(result.data);
      writeStoredFlow({
        shortCode: session.shortCode,
        qrSessionId: session.id,
        paymentIntentId: confirmedPaymentIntentId,
        orderNo: result.data.orderNo,
        amount: result.data.recalculatedAmount,
        status: result.data.approval.realPgCalled ? "confirmed" : "confirmed_mock",
        source: "firebase_functions",
        message: result.data.message,
        updatedAt: new Date().toISOString(),
      });
      router.push(`/q/${session.shortCode}/success?orderNo=${encodeURIComponent(result.data.orderNo)}&paymentIntentId=${encodeURIComponent(confirmedPaymentIntentId)}`);
      return;
    }

    setError({
      code: "INNOPAY_SMS_STILL_PENDING",
      message: result.data.message,
      details: { transactionStatus: result.data.transactionStatus },
    });
  }

  async function runInnopayPrimary() {
    const preparedReady = ready ?? (await runReady());
    if (!preparedReady) {
      return;
    }

    if (smsStart) {
      await runInnopaySmsSync();
      return;
    }

    if (preparedReady.provider === "mock") {
      await runConfirm(preparedReady);
      return;
    }

    await (preparedReady.provider === "infiny" ? runInnopaySmsPayment(preparedReady) : runProviderPayment(preparedReady));
  }

  return (
    <section className="grid gap-4">
      <section className="rounded-md border border-slate-900 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">InnoPay payment</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">인피니 QR 결제</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              결제 금액과 결제자 정보를 확인한 뒤 결제를 진행합니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{innopayStatusLabel}</span>
        </div>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">결제 금액</p>
            <p className="mt-1 text-xl font-black text-rose-600">{formatCurrency(ready?.recalculatedAmount ?? session.totalAmount)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">결제수단</p>
            <p className="mt-1 font-black text-slate-950">인피니 SMS 카드결제</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">MID 상태</p>
            <p className="mt-1 font-black text-slate-950">
              {ready?.merchantProfile?.merchantIdMasked ?? merchantAnalysis.companyLines[0]?.merchantIdMasked ?? "MID 발급 대기"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={runInnopayPrimary}
            disabled={innopayPrimaryDisabled}
            className="rounded-md bg-blue-700 px-4 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending === "ready"
              ? "결제 준비 중"
              : pending === "sms"
                ? "결제 요청 중"
                : pending === "sync"
                  ? "결제 완료 확인 중"
                  : !ready
                    ? "결제"
                    : smsStart
                      ? "결제완료 확인"
                      : "결제"}
          </button>
          {innopayBlockedReason ? (
            <p className="rounded-md bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">{innopayBlockedReason}</p>
          ) : null}
          {smsStart ? (
            <p className="rounded-md bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-950">
              인피니 응답코드 {smsStart.resultCode}. 고객 휴대폰 {smsStart.buyerPhoneMasked ?? "-"}로 결제 링크 요청을 보냈습니다.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
        <h3 className="font-black">취소/환불 안내</h3>
        <p className="mt-2 text-sm font-bold leading-6">
          결제 완료 후 취소 또는 환불은 상품 발송, 현장 수령 여부, 판매자 정책에 따라 처리됩니다. 주문 내역 확인 화면에서 주문번호를 확인한 뒤 판매자 또는 산후조리원 안내 창구로 문의해 주세요.
        </p>
        <p className="mt-3 text-xs font-bold leading-5">
          오픈마켓(산후조리원연합회)은 통신판매중개자 이며, 판매자가 등록한 상품 및 거래에 대한 정보 등의 저작권 책임은 각 판매자 에게 있습니다.
        </p>
      </section>

      {!activeQr ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
          <h3 className="font-black">결제 진입 차단</h3>
          <p className="mt-2 text-sm leading-6">
            QR 상태가 {session.status}이고 만료 여부는 {expired ? "만료됨" : "유효"}입니다. 서버 ready 호출은 차단 사유 확인용으로만 사용할 수 있습니다.
          </p>
        </section>
      ) : null}

      {smsStart ? (
        <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-black">인피니 SMS 결제요청 전송 완료</h3>
              <p className="mt-2 text-sm leading-6">{smsStart.message}</p>
              <p className="mt-2 text-xs font-bold">
                주문번호 {smsStart.orderNo} / 결과코드 {smsStart.resultCode} / 수신번호 {smsStart.buyerPhoneMasked ?? "-"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runInnopaySmsSync()}
              disabled={Boolean(pending)}
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {pending === "sync" ? "승인 확인 중" : "결제완료 확인"}
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-black">{riskCopy(error.code)}</h3>
              <p className="mt-2 text-sm leading-6">{error.message}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black">{error.code}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href={`/q/${session.shortCode}/failed`} className="rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
              실패 화면 보기
            </Link>
            <Link href="/tablet/qr" className="rounded-md bg-white px-4 py-3 text-center text-sm font-black text-red-800">
              새 QR 생성 안내
            </Link>
          </div>
        </section>
      ) : null}
    </section>
  );
}

export function PaymentStatusPanel({
  shortCode,
  mode,
}: {
  shortCode: string;
  mode: "success" | "failed" | "status";
}) {
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const [stored, setStored] = useState<StoredPaymentFlow>();
  const [queryValues, setQueryValues] = useState<{ paymentIntentId?: string; orderNo?: string }>({});
  const [status, setStatus] = useState<StatusResponse>();
  const [error, setError] = useState<CheckoutApiError>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStored(readStoredFlow(shortCode));
      const params = new URLSearchParams(window.location.search);
      setQueryValues({
        paymentIntentId: params.get("paymentIntentId") ?? undefined,
        orderNo: params.get("orderNo") ?? undefined,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [shortCode]);

  const paymentIntentId = queryValues.paymentIntentId ?? stored?.paymentIntentId;
  const orderNo = queryValues.orderNo ?? stored?.orderNo;

  async function refresh() {
    setLoading(true);
    setError(undefined);
    const result = await getPaymentStatus(endpoints.endpoints.status, {
      paymentIntentId: paymentIntentId ?? undefined,
      orderNo: orderNo ?? undefined,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setStatus(result.data);
  }

  useEffect(() => {
    if (paymentIntentId || orderNo) {
      const timer = window.setTimeout(() => {
        void refresh();
      }, 0);

      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId, orderNo]);

  const headline = mode === "success" ? "결제 상태 확인" : mode === "failed" ? "실패 원인 확인" : "QR 결제 상태";
  const body =
    mode === "success"
      ? "모의 승인 이후 Firebase Functions 결제 상태를 조회합니다."
      : mode === "failed"
        ? "만료, 금액불일치, 재고부족, 중복 결제 등 서버 차단 사유를 고객에게 안내합니다."
    : "결제 의도 ID 또는 주문번호 기준으로 결제 상태를 조회합니다.";

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">결제 상태</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{headline}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{endpoints.ready ? "결제 함수 주소 준비" : "결제 함수 주소 누락"}</span>
      </div>

      <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">short_code</p>
          <p className="mt-1 font-black">{shortCode}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">payment_intent</p>
          <p className="mt-1 break-words font-black">{paymentIntentId ?? "-"}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">order_no</p>
          <p className="mt-1 break-words font-black">{orderNo ?? "-"}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">status</p>
          <p className="mt-1 font-black">{status?.status ?? stored?.status ?? "pending_lookup"}</p>
        </div>
      </div>

      {status ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
          <strong>{status.message}</strong>
          <p className="mt-1">
            PG사 {status.provider ?? "-"} / 금액 {status.amount ? formatCurrency(status.amount) : "-"} / 출처 {status.source}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-950">
          <strong>{riskCopy(error.code)}</strong>
          <p className="mt-1">{error.message}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || (!paymentIntentId && !orderNo)}
          className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "상태 조회 중" : "상태 다시 조회"}
        </button>
        <Link href={`/q/${shortCode}/checkout`} className="rounded-md bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-900">
          checkout으로 돌아가기
        </Link>
        <Link href={orderNo ? `/orders/guest/${orderNo}` : "/orders/guest"} className="rounded-md bg-rose-600 px-4 py-3 text-center text-sm font-black text-white">
          주문 상세 보기
        </Link>
      </div>
    </section>
  );
}
