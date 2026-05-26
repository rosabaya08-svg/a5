"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PgIntegrationPanel } from "@/components/storefront/PgIntegrationPanel";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { getPaymentReadiness } from "@/lib/payments/paymentService";
import { buildPgCheckoutPayload, getPgBridgeStatus } from "@/lib/payments/pgCheckoutBridge";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
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
  approval: {
    status: "approved_mock";
    mockTid: string;
    approvedAt: string;
    message: string;
  };
  orderNo: string;
  recalculatedAmount: number;
  firestoreTransactionPlan: string[];
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
  status: "idle" | "ready" | "confirmed_mock" | "failed";
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

function FlowStepCard({
  label,
  title,
  body,
  state,
}: {
  label: string;
  title: string;
  body: string;
  state: "ready" | "done" | "blocked";
}) {
  const styles = {
    ready: "border-blue-200 bg-blue-50 text-blue-950",
    done: "border-emerald-200 bg-emerald-50 text-emerald-950",
    blocked: "border-red-200 bg-red-50 text-red-950",
  };

  return (
    <article className={`rounded-md border p-3 ${styles[state]}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em]">{label}</p>
      <h3 className="mt-1 font-black">{title}</h3>
      <p className="mt-2 text-xs leading-5">{body}</p>
    </article>
  );
}

function DeveloperPayloadPanel({
  session,
  ready,
  confirm,
  error,
}: {
  session: QrPaymentSession;
  ready?: ReadyResponse;
  confirm?: ConfirmResponse;
  error?: CheckoutApiError;
}) {
  const rows = [
    ["short_code", session.shortCode],
    ["qr_session_id", session.id],
    ["status", session.status],
    ["expires_at", session.expiresAt],
    ["payment_intent_id", ready?.paymentIntentId ?? "-"],
    ["order_no", confirm?.orderNo ?? ready?.orderNoCandidate ?? "-"],
    ["server_amount", ready?.recalculatedAmount ? formatCurrency(ready.recalculatedAmount) : "-"],
    ["last_error", error ? `${error.code}: ${error.message}` : "-"],
  ];

  return (
    <details className="rounded-md border border-slate-200 bg-slate-950 p-4 text-white">
      <summary className="cursor-pointer text-sm font-black">개발자 결제 서버 확인값</summary>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-white/10 p-2">
            <dt className="font-bold text-slate-300">{label}</dt>
            <dd className="mt-1 break-words font-black">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function ServerCheckoutFlow({
  session,
  dataSource,
  fallbackReason,
}: {
  session: QrPaymentSession;
  dataSource: string;
  fallbackReason?: string;
}) {
  const router = useRouter();
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const readiness = useMemo(() => getPaymentReadiness(), []);
  const bridge = useMemo(() => getPgBridgeStatus(), []);
  const [ready, setReady] = useState<ReadyResponse>();
  const [confirm, setConfirm] = useState<ConfirmResponse>();
  const [error, setError] = useState<CheckoutApiError>();
  const [pending, setPending] = useState<"ready" | "confirm" | "amount-test" | "">("");
  const expired = isExpired(session);
  const activeQr = session.status === "active" && !expired;
  const providerIsMock = readiness.provider === "mock";
  const buttonDisabled = Boolean(pending) || !endpoints.ready;

  const pgPayload = useMemo(
    () =>
      buildPgCheckoutPayload({
        orderNo: ready?.orderNoCandidate ?? `A5-${session.shortCode}`,
        orderName: `A5 closed mall ${session.shortCode}`,
        amount: ready?.recalculatedAmount ?? session.totalAmount,
        customerName: "비회원 고객",
        customerPhoneMasked: "010-****-0000",
        qrSessionId: session.id,
      }),
    [ready?.orderNoCandidate, ready?.recalculatedAmount, session.id, session.shortCode, session.totalAmount],
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
      return;
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
  }

  async function runConfirm() {
    if (!ready) return;

    setPending("confirm");
    setError(undefined);

    const result = await postPaymentFunction<ConfirmResponse>(endpoints.endpoints.confirm, {
      ...checkoutPayload(session, ready.recalculatedAmount),
      paymentIntentId: ready.paymentIntentId,
      orderNoCandidate: ready.orderNoCandidate,
      mockApprovalRequested: true,
    });

    setPending("");

    if (!result.ok) {
      setError(result.error);
      writeStoredFlow({
        shortCode: session.shortCode,
        qrSessionId: session.id,
        paymentIntentId: ready.paymentIntentId,
        orderNo: ready.orderNoCandidate,
        amount: ready.recalculatedAmount,
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
      paymentIntentId: ready.paymentIntentId,
      orderNo: result.data.orderNo,
      amount: result.data.recalculatedAmount,
      status: "confirmed_mock",
      source: "firebase_functions",
      message: result.data.message,
      updatedAt: new Date().toISOString(),
    });
    router.push(`/q/${session.shortCode}/success?orderNo=${encodeURIComponent(result.data.orderNo)}&paymentIntentId=${encodeURIComponent(ready.paymentIntentId)}`);
  }

  const flowStates = [
    {
      label: "1단계",
      title: "QR 세션 검증",
      body: `${session.id} / ${session.shortCode} 기준으로 active, 만료, 중복 사용 여부를 서버에서 확인합니다.`,
      state: activeQr ? ("ready" as const) : ("blocked" as const),
    },
    {
      label: "2단계",
      title: "서버 금액 재계산",
      body: "클라이언트 금액을 신뢰하지 않고 Firestore products 가격과 수량으로 다시 계산합니다.",
      state: ready ? ("done" as const) : ("ready" as const),
    },
    {
      label: "3단계",
      title: providerIsMock ? "모의 승인 + transaction 기록" : "PG 결제창 연결 준비",
      body: providerIsMock
        ? "모의 결제사일 때만 confirm까지 이어지며 orders/payments/order_items/inventory/audit log 기록 구조를 탑니다."
        : "실제 PG SDK/API 호출은 아직 금지되어 있으며 PG사 어댑터와 키 수령 후 연결합니다.",
      state: confirm ? ("done" as const) : providerIsMock ? ("ready" as const) : ("blocked" as const),
    },
  ];

  return (
    <section className="grid gap-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-600">서버 결제 흐름</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">서버 검증 후 결제 진행</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              이 화면은 Firebase Functions 결제 서버 계층으로 ready/confirm을 호출합니다. 실제 PG 승인, 취소, 환불, 정산은 아직 호출하지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">{dataSource}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">{readiness.label}</span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">실결제 아님</span>
          </div>
        </div>
        {fallbackReason ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-900">대체 표시 사유: {fallbackReason}</p> : null}
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {flowStates.map((step) => (
          <FlowStepCard key={step.label} {...step} />
        ))}
      </div>

      <section className="rounded-md bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">QR session id</p>
            <p className="mt-1 break-words font-black">{session.id}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">short code</p>
            <p className="mt-1 font-black">{session.shortCode}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">expires</p>
            <p className="mt-1 font-black">{formatDateTime(session.expiresAt)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">amount</p>
            <p className="mt-1 font-black text-rose-600">{formatCurrency(session.totalAmount)}</p>
          </div>
        </div>
      </section>

      {!activeQr ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
          <h3 className="font-black">결제 진입 차단</h3>
          <p className="mt-2 text-sm leading-6">
            QR 상태가 {session.status}이고 만료 여부는 {expired ? "만료됨" : "유효"}입니다. 서버 ready 호출은 차단 사유 확인용으로만 사용할 수 있습니다.
          </p>
        </section>
      ) : null}

      <section className="rounded-md bg-white p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          <button
            type="button"
            onClick={() => void runReady()}
            disabled={buttonDisabled}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending === "ready" ? "서버 검증 중" : "1. 결제 전 서버 검증"}
          </button>
          <button
            type="button"
            onClick={() => void runConfirm()}
            disabled={Boolean(pending) || !ready || !providerIsMock}
            className="rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending === "confirm" ? "모의 승인 처리 중" : "2. 모의 승인 실행"}
          </button>
          <button
            type="button"
            onClick={() => void runReady(session.totalAmount + 1000, "amount-test")}
            disabled={buttonDisabled}
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {pending === "amount-test" ? "금액 오류 테스트 중" : "금액불일치 테스트"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
            실제 PG 결제사가 선택되면 이 영역은 PG 결제창 호출 직전 상태까지 표시합니다. 공식 모듈 불러오기와 승인 호출은 별도 승인 전까지 차단합니다.
        </p>
      </section>

      {ready ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <h3 className="font-black">서버 ready 완료</h3>
          <p className="mt-2 text-sm leading-6">{ready.message}</p>
          <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
            <span className="rounded-full bg-white px-3 py-2 font-black">paymentIntentId: {ready.paymentIntentId}</span>
            <span className="rounded-full bg-white px-3 py-2 font-black">orderNo: {ready.orderNoCandidate}</span>
            <span className="rounded-full bg-white px-3 py-2 font-black">serverAmount: {formatCurrency(ready.recalculatedAmount)}</span>
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

      <PgIntegrationPanel
        amount={ready?.recalculatedAmount ?? session.totalAmount}
        orderNo={ready?.orderNoCandidate ?? `A5-${session.shortCode}`}
        orderName={`A5 closed mall ${session.shortCode}`}
        customerName="비회원 고객"
        customerPhoneMasked="010-****-0000"
        qrSessionId={session.id}
      />

      <section className="rounded-md border border-blue-100 bg-blue-50 p-4 text-blue-950">
        <h3 className="font-black">PG 결제창 준비 상태</h3>
        <p className="mt-2 text-sm leading-6">
          PG사: {bridge.provider} / 브라우저 모듈: {bridge.moduleLoaded ? "로드됨" : "미로드"} / 결제 준비 주소: {pgPayload.readyEndpoint || "미입력"}
        </p>
        <p className="mt-2 text-xs leading-5">
          실제 결제창 호출은 결제사 공식 모듈과 키 검수 이후에만 열립니다. 현재 승인은 Firebase Functions 모의 결제사로만 진행됩니다.
        </p>
      </section>

      <DeveloperPayloadPanel session={session} ready={ready} confirm={confirm} error={error} />
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
