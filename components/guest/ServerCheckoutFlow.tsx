"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isQrReceiverFormComplete, maskCustomerPhone, type QrReceiverFormValue } from "@/components/storefront/QrReceiverForm";
import { analyzeInfinyCart } from "@/lib/payments/infinySettlementPolicy";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { getPaymentReadiness } from "@/lib/payments/paymentService";
import { writePaymentReceiver } from "@/lib/payments/paymentBrowserStorage";
import { calculateCartShippingFee } from "@/lib/shipping/shippingFee";
import {
  buildPgCheckoutPayload,
  isInnopayBrowserCheckoutRuntime,
  loadPgBrowserModule,
  requestPgModulePayment,
  type PgRuntimeOverride,
} from "@/lib/payments/pgCheckoutBridge";
import { formatCurrency } from "@/lib/utils/format";
import type { CartItemSnapshot, Company, QrPaymentSession } from "@/types/commerce";

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
  checkoutWindowReady?: boolean;
  checkoutWindowBlockers?: string[];
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
  productSubtotalAmount?: number;
  shippingFee?: number;
  shippingBaseFee?: number;
  shippingRemoteAreaFee?: number;
  shippingAreaType?: "standard" | "remote" | "island";
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
  orderLookupUrl?: string;
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

type InnopayCheckoutChannel = "webview" | "sms";
type InnopayPayMethod = "CARD" | "EPAY" | "EBANK" | "BANK" | "VBANK" | "OPCARD";
type InnopayEpayCl = "" | "01" | "02" | "03" | "0408" | "0409" | "06";

const payupKeyinEnabled = ["1", "true", "yes", "on"].includes(
  (process.env.NEXT_PUBLIC_A5_ENABLE_PAYUP_KEYIN ?? "").trim().toLowerCase(),
);

type PayupCardFormValue = {
  cardNo: string;
  expireMonth: string;
  expireYear: string;
  birthday: string;
  cardPw: string;
  quota: string;
};

function paymentFlowKey(shortCode: string) {
  return `a5-server-payment-flow:${shortCode}`;
}

function toServerItem(item: CartItemSnapshot) {
  return {
    productId: item.productId,
    optionId: item.optionId,
    productName: item.productName,
    optionName: item.optionName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    companyId: item.companyId,
    sellerCompanyId: item.sellerCompanyId,
    sellerBusinessNo: item.sellerBusinessNo,
    sellerBusinessNoNormalized: item.sellerBusinessNoNormalized,
    sellerCompanyName: item.sellerCompanyName,
    shippingFeePolicy: item.shippingFeePolicy,
  };
}

function checkoutOrderName(session: QrPaymentSession) {
  const firstItem = session.items[0]?.productName || `QR ${session.shortCode}`;
  return session.items.length > 1 ? `${firstItem} 외 ${session.items.length - 1}건` : firstItem;
}

function checkoutItemCount(session: QrPaymentSession) {
  return Math.max(session.items.reduce((sum, item) => sum + item.quantity, 0), 1);
}

function checkoutPayload(session: QrPaymentSession, clientAmount = session.totalAmount, receiver?: QrReceiverFormValue) {
  return {
    qrSessionId: session.id,
    guestShopSessionId: (session as QrPaymentSession & { guestShopSessionId?: string }).guestShopSessionId,
    guestShopEntryToken: (session as QrPaymentSession & { guestShopEntryToken?: string }).guestShopEntryToken,
    shortCode: session.shortCode,
    cartId: session.cartId,
    nurseryId: session.nurseryId,
    roomId: session.roomId,
    tabletId: session.tabletId,
    clientAmount,
    currency: "KRW" as const,
    items: session.items.map(toServerItem),
    ...receiverPayload(receiver),
  };
}

function receiverPayload(receiver?: QrReceiverFormValue) {
  if (!receiver) return {};

  return {
    customerName: receiver.customerName.trim(),
    customerPhone: receiver.customerPhone.trim(),
    customerPhoneMasked: maskCustomerPhone(receiver.customerPhone),
    deliveryMethod: receiver.deliveryMethod,
    receiverName: receiver.customerName.trim(),
    receiverPhone: receiver.customerPhone.trim(),
    receiverPostalCode: receiver.postalCode.trim(),
    receiverAddress: receiver.address,
    receiverAddressDetail: receiver.addressDetail,
    deliveryMemo: receiver.deliveryMemo.trim(),
  };
}

function liveSuccessUrl(shortCode: string, orderNo: string, paymentIntentId: string) {
  const params = new URLSearchParams({
    code: shortCode,
    paymentResult: "success",
    orderNo,
    paymentIntentId,
  });

  return `/q/live/?${params.toString()}`;
}

function liveCheckoutUrl(shortCode: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ code: shortCode });
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    params.set(key, value);
  });
  return `/q/live/?${params.toString()}`;
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

function isPayupStandardRuntimeConfig(config?: PgRuntimeOverride) {
  return Boolean(config?.checkoutMode === "standard_api" || config?.paymentMode === "standard" || config?.scriptUrl);
}

const checkoutGlassPanelClass =
  "min-w-0 overflow-hidden rounded-md border border-white/70 bg-white/65 p-5 shadow-[0_20px_60px_rgba(190,18,60,0.12)] ring-1 ring-white/50 backdrop-blur-xl";
const checkoutGlassTileClass =
  "min-w-0 rounded-md border border-white/65 bg-white/60 p-3 shadow-sm ring-1 ring-rose-100/70 backdrop-blur";
const checkoutFieldLabelClass = "grid min-w-0 gap-1 text-xs font-normal text-slate-600";
const checkoutSelectClass =
  "h-11 w-full min-w-0 rounded-md border border-white/70 bg-white/80 px-3 text-sm font-normal text-slate-950 shadow-inner outline-none ring-1 ring-rose-100/80 transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200 disabled:bg-slate-100/80 disabled:text-slate-400";
const checkoutInputClass =
  "h-11 w-full min-w-0 rounded-md border border-white/70 bg-white/80 px-3 text-sm font-normal text-slate-950 shadow-inner outline-none ring-1 ring-rose-100/80 transition placeholder:text-slate-300 focus:border-rose-300 focus:ring-2 focus:ring-rose-200 disabled:bg-slate-100/80 disabled:text-slate-400";
const checkoutPrimaryButtonClass =
  "rounded-md bg-rose-600 px-4 py-4 text-base font-normal text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none";
const checkoutSecondaryButtonClass =
  "rounded-md border border-white/70 bg-white/75 px-4 py-3 text-center text-sm font-normal text-slate-900 shadow-sm ring-1 ring-rose-100/70 backdrop-blur transition hover:bg-white";
const checkoutSmallButtonClass =
  "rounded-md bg-rose-600 px-4 py-3 text-sm font-normal text-white shadow-md shadow-rose-500/20 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none";
const checkoutStatusPillClass =
  "rounded-full border border-white/60 bg-rose-600/90 px-3 py-1 text-xs font-normal text-white shadow-md shadow-rose-500/20";

function shouldAllowMockPaymentConfirm() {
  const value = (process.env.NEXT_PUBLIC_A5_ALLOW_MOCK_PAYMENT_CONFIRM ?? process.env.NEXT_PUBLIC_ALLOW_MOCK_PAYMENT_CONFIRM ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

export function ServerCheckoutFlow({
  session,
  companies = [],
  receiver,
}: {
  session: QrPaymentSession;
  dataSource: string;
  fallbackReason?: string;
  companies?: Company[];
  receiver?: QrReceiverFormValue;
}) {
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const readiness = useMemo(() => getPaymentReadiness(), []);
  const [readyResponse, setReadyResponse] = useState<ReadyResponse>();
  const [readyContextKey, setReadyContextKey] = useState("");
  const [, setConfirm] = useState<ConfirmResponse>();
  const [smsStart, setSmsStart] = useState<StartInnopaySmsResponse>();
  const [error, setError] = useState<CheckoutApiError>();
  const [pgLaunchMessage, setPgLaunchMessage] = useState("");
  const [innopayChannel, setInnopayChannel] = useState<InnopayCheckoutChannel>("webview");
  const [innopayPayMethod, setInnopayPayMethod] = useState<InnopayPayMethod>("CARD");
  const [innopayEpayCl, setInnopayEpayCl] = useState<InnopayEpayCl>("");
  const [innopayCardQuota, setInnopayCardQuota] = useState("00");
  const [payupCard, setPayupCard] = useState<PayupCardFormValue>({
    cardNo: "",
    expireMonth: "",
    expireYear: "",
    birthday: "",
    cardPw: "",
    quota: "00",
  });
  const [pending, setPending] = useState<"ready" | "pg" | "sms" | "sync" | "confirm" | "amount-test" | "">("");
  const expired = isExpired(session);
  const activeQr = session.status === "active" && !expired;
  const receiverDeliveryMethod = receiver?.deliveryMethod;
  const receiverAddress = receiver?.address ?? "";
  const shippingBreakdown = useMemo(
    () =>
      calculateCartShippingFee(session.items, {
        deliveryMethod: receiverDeliveryMethod,
        address: receiverAddress,
      }),
    [receiverAddress, receiverDeliveryMethod, session.items],
  );
  const checkoutContextKey = `${receiverDeliveryMethod ?? ""}|${receiverAddress}|${shippingBreakdown.totalFee}`;
  const ready = readyContextKey === checkoutContextKey ? readyResponse : undefined;
  const pgClientConfig = ready?.pgClientConfig;
  const hasServerReady = Boolean(ready);
  const effectiveProvider = ready?.provider ?? readiness.provider;
  const providerIsMock = hasServerReady && effectiveProvider === "mock";
  const mockPaymentConfirmAllowed = shouldAllowMockPaymentConfirm();
  const mockPaymentBlocked = providerIsMock && !mockPaymentConfirmAllowed;
  const providerIsPayup = effectiveProvider === "payup";
  const providerIsInnopay = effectiveProvider === "infiny";
  const providerIsInnopaySms = providerIsInnopay && innopayChannel === "sms";
  const providerIsInnopayWebview = providerIsInnopay && innopayChannel === "webview";
  const providerIsPayupStandard = providerIsPayup && isPayupStandardRuntimeConfig(pgClientConfig);
  const receiverComplete = receiver ? isQrReceiverFormComplete(receiver) : true;
  const checkoutTotalAmount = session.totalAmount + shippingBreakdown.totalFee;
  const checkoutDisplayAmount = ready?.recalculatedAmount ?? checkoutTotalAmount;
  const displayProductSubtotal = ready?.productSubtotalAmount ?? shippingBreakdown.productSubtotal;
  const displayShippingFee = ready?.shippingFee ?? shippingBreakdown.totalFee;
  const displayRemoteAreaFee = ready?.shippingRemoteAreaFee ?? shippingBreakdown.remoteAreaFee;
  const merchantAnalysis = useMemo(() => analyzeInfinyCart(session.items, companies), [companies, session.items]);
  const pgPolicyBlocked = !providerIsMock && merchantAnalysis.requiresSplitSettlementApi;
  const innopayBrowserRuntimeReady = isInnopayBrowserCheckoutRuntime(pgClientConfig);
  const innopayCheckoutReady = Boolean(
    ready &&
      !providerIsMock &&
      ready.pgReady &&
      providerIsInnopay &&
      (providerIsInnopaySms || (providerIsInnopayWebview && innopayBrowserRuntimeReady)),
  );
  const payupCardComplete = Boolean(
    payupCard.cardNo.replace(/\D/g, "").length >= 13 &&
      payupCard.expireMonth.replace(/\D/g, "").length >= 1 &&
      payupCard.expireYear.replace(/\D/g, "").length >= 2 &&
      payupCard.birthday.replace(/\D/g, "").length >= 6 &&
      payupCard.cardPw.replace(/\D/g, "").length >= 2,
  );
  const payupStandardRuntimeReady = Boolean(ready && providerIsPayupStandard && pgClientConfig?.scriptUrl);
  const payupBrowserCheckoutReady = Boolean(
    ready &&
      providerIsPayup &&
      providerIsPayupStandard &&
      payupStandardRuntimeReady &&
      (ready.checkoutWindowReady ?? Boolean(ready.merchantProfile?.merchantId)),
  );
  const payupKeyinCheckoutReady = Boolean(payupKeyinEnabled && ready && providerIsPayup && !providerIsPayupStandard && ready.pgReady && payupCardComplete);
  const payupCheckoutReady = payupBrowserCheckoutReady || payupKeyinCheckoutReady;
  const innopayPrimaryDisabled = Boolean(pending) ||
    !activeQr ||
    !receiverComplete ||
    pgPolicyBlocked ||
    mockPaymentBlocked ||
    !endpoints.ready ||
    Boolean(
      ready &&
        !providerIsMock &&
        ((providerIsPayup && !payupCheckoutReady) ||
          (providerIsInnopay && (!innopayCheckoutReady || (providerIsInnopaySms && !endpoints.endpoints.startInnopaySms))) ||
          (!providerIsPayup && !providerIsInnopay && !innopayCheckoutReady)),
    );
  const visibleSmsStart = innopayChannel === "sms" ? smsStart : undefined;
  const smsSyncMode = Boolean(visibleSmsStart);
  const checkoutStatusLabel = !activeQr
    ? "QR 사용 불가"
    : !receiverComplete
      ? "결제자 정보 입력 필요"
      : !endpoints.ready
        ? "결제 서버 설정 오류"
      : !ready
        ? pending === "ready"
          ? "결제 준비 중"
          : "결제 준비 전"
        : mockPaymentBlocked
          ? "결제 설정 확인 필요"
          : payupCheckoutReady || innopayCheckoutReady || providerIsMock
            ? "결제 가능"
            : "결제 설정 확인 필요";
  const innopayStatusLabel = smsSyncMode
    ? "SMS 결제요청 완료"
    : payupCheckoutReady || innopayCheckoutReady
      ? "결제 준비 완료"
      : ready && providerIsMock
        ? "결제 가능"
        : checkoutStatusLabel;
  const innopayBlockedReason = !activeQr
    ? "QR이 만료되었거나 이미 사용되었습니다."
    : !receiverComplete
      ? "고객명, 연락처, 주소와 동의 체크가 필요합니다."
    : !endpoints.ready
      ? "결제 서버 주소가 배포 번들에 포함되지 않았습니다. 관리자에게 문의해 주세요."
    : pgPolicyBlocked
      ? "여러 판매자의 상품이 함께 담겨 있어 업체별 QR로 나누어야 합니다."
      : mockPaymentBlocked
        ? "PG 설정이 완료되지 않아 실제 결제를 열 수 없습니다."
        : ready && !providerIsMock && !payupCheckoutReady && !innopayCheckoutReady
          ? providerIsPayup && ready.checkoutWindowBlockers?.length
            ? ready.checkoutWindowBlockers.join(" / ")
            : providerIsPayup
            ? "Payup 카드 승인 정보를 입력해야 결제를 진행할 수 있습니다."
            : providerIsInnopayWebview
            ? "인피니 결제창 스크립트 또는 MID 설정이 아직 완료되지 않아 결제창을 열 수 없습니다."
            : "결제 설정이 아직 완료되지 않아 결제요청은 대기 중입니다."
          : !ready
            ? "결제하기를 누르면 주문 금액 확인 후 결제 단계로 이동합니다."
            : "";

  const runReady = useCallback(
    async (clientAmount = checkoutTotalAmount, intent: "ready" | "amount-test" = "ready") => {
      setPending(intent);
      setError(undefined);
      setPgLaunchMessage("");

      const result = await postPaymentFunction<ReadyResponse>(endpoints.endpoints.ready, checkoutPayload(session, clientAmount, receiver));

      setPending("");

      if (!result.ok) {
        setError(result.error);
        writeStoredFlow({
          shortCode: session.shortCode,
          qrSessionId: session.id,
          amount: clientAmount,
          status: "failed",
          source: "firebase_functions",
          message: result.error.message,
          updatedAt: new Date().toISOString(),
          error: result.error,
        });
        return undefined;
      }

      setReadyResponse(result.data);
      setReadyContextKey(checkoutContextKey);
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
    },
    [checkoutContextKey, checkoutTotalAmount, endpoints.endpoints.ready, receiver, session],
  );

  useEffect(() => {
    if (!ready || !(payupStandardRuntimeReady || (providerIsInnopayWebview && innopayBrowserRuntimeReady))) return;
    void loadPgBrowserModule(ready.pgClientConfig ?? pgClientConfig);
  }, [innopayBrowserRuntimeReady, payupStandardRuntimeReady, pgClientConfig, providerIsInnopayWebview, ready]);

  useEffect(() => {
    if (
      ready ||
      pending ||
      !activeQr ||
      !receiverComplete ||
      pgPolicyBlocked ||
      mockPaymentBlocked ||
      !endpoints.ready
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runReady();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeQr, endpoints.ready, mockPaymentBlocked, pending, pgPolicyBlocked, ready, receiverComplete, runReady]);

  function updateInnopayChannel(value: InnopayCheckoutChannel) {
    setInnopayChannel(value);
    setError(undefined);
    setPgLaunchMessage("");
  }

  function updateInnopayPayMethod(value: InnopayPayMethod) {
    setInnopayPayMethod(value);
    setError(undefined);
    setPgLaunchMessage("");
    if (value !== "EPAY") setInnopayEpayCl("");
  }

  function updatePayupCard<K extends keyof PayupCardFormValue>(key: K, value: PayupCardFormValue[K]) {
    setPayupCard((current) => ({ ...current, [key]: value }));
    setError(undefined);
    setPgLaunchMessage("");
  }

  function buildInnopayCheckoutPayload(preparedReady: ReadyResponse) {
    return buildPgCheckoutPayload({
      orderNo: preparedReady.orderNoCandidate,
      orderName: checkoutOrderName(session),
      itemCount: checkoutItemCount(session),
      amount: preparedReady.recalculatedAmount,
      customerName: receiver?.customerName.trim() || "비회원 고객",
      customerPhone: receiver?.customerPhone.trim(),
      customerPhoneMasked: receiver?.customerPhone ? maskCustomerPhone(receiver.customerPhone) : "010-****-0000",
      customerEmail: "noemail@noemail.com",
      qrSessionId: session.id,
      paymentIntentId: preparedReady.paymentIntentId,
      returnCode: session.shortCode,
      merchantId: preparedReady.merchantProfile?.merchantId,
      moduleKey: preparedReady.merchantProfile?.moduleKey,
      runtimeConfig: preparedReady.pgClientConfig ?? pgClientConfig,
      payMethod: innopayPayMethod,
      epayCl: innopayPayMethod === "EPAY" ? innopayEpayCl : "",
      cardCode: "NONE",
      cardQuota: innopayCardQuota,
    });
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
      ...checkoutPayload(session, preparedReady.recalculatedAmount, receiver),
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
    window.location.assign(result.data.orderLookupUrl ?? liveSuccessUrl(session.shortCode, result.data.orderNo, preparedReady.paymentIntentId));
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
    setPgLaunchMessage("");
    writePaymentReceiver(preparedReady.paymentIntentId, receiverPayload(receiver));

    const runtimeConfig = preparedReady.pgClientConfig ?? pgClientConfig;
    const pgResult = await requestPgModulePayment(buildInnopayCheckoutPayload(preparedReady), runtimeConfig);
    if (!pgResult.ok) {
      setPending("");
      setError({
        code: "PAYMENT_BROWSER_MODULE_FAILED",
        message: pgResult.message ?? "결제창 호출 결과를 확인할 수 없습니다.",
      });
      return;
    }

    if (!pgResult.paymentKey && !pgResult.transactionId) {
      setPending("");
      setPgLaunchMessage(pgResult.message ?? "인피니 결제창을 열었습니다. 결제 완료 후 자동으로 A5 주문 확정 화면으로 돌아옵니다.");
      writeStoredFlow({
        shortCode: session.shortCode,
        qrSessionId: session.id,
        paymentIntentId: preparedReady.paymentIntentId,
        orderNo: preparedReady.orderNoCandidate,
        amount: preparedReady.recalculatedAmount,
        status: "ready",
        source: "firebase_functions",
        message: pgResult.message ?? "InnoPay checkout window opened.",
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    setPending("confirm");

    const result = await postPaymentFunction<ConfirmResponse>(endpoints.endpoints.confirm, {
      ...checkoutPayload(session, preparedReady.recalculatedAmount, receiver),
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
    window.location.assign(result.data.orderLookupUrl ?? liveSuccessUrl(session.shortCode, result.data.orderNo, preparedReady.paymentIntentId));
  }

  async function runPayupPayment(preparedReady = ready) {
    if (!preparedReady) return;
    if (!payupKeyinEnabled) {
      setError({
        code: "PAYUP_KEYIN_DISABLED",
        message: "?? ???? ??? ?????? ????. PayUp ?? ???? ??? ???.",
      });
      return;
    }
    if (receiver && !isQrReceiverFormComplete(receiver)) {
      setError({
        code: "RECEIVER_REQUIRED",
        message: "고객명, 연락처, 주소와 개인정보 동의를 먼저 입력해야 결제를 진행할 수 있습니다.",
      });
      return;
    }

    if (!payupCardComplete) {
      setError({
        code: "PAYUP_CARD_INPUT_REQUIRED",
        message: "Payup 카드 승인 정보를 모두 입력해야 결제를 진행할 수 있습니다.",
      });
      return;
    }

    setPending("confirm");
    setError(undefined);
    setPgLaunchMessage("");

    const result = await postPaymentFunction<ConfirmResponse>(endpoints.endpoints.confirm, {
      ...checkoutPayload(session, preparedReady.recalculatedAmount, receiver),
      paymentIntentId: preparedReady.paymentIntentId,
      orderNoCandidate: preparedReady.orderNoCandidate,
      payupCard: {
        cardNo: payupCard.cardNo,
        expireMonth: payupCard.expireMonth,
        expireYear: payupCard.expireYear,
        birthday: payupCard.birthday,
        cardPw: payupCard.cardPw,
        quota: payupCard.quota,
        userName: receiver?.customerName.trim(),
        mobileNumber: receiver?.customerPhone.trim(),
        kakaoSend: "N",
      },
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
    setPayupCard({
      cardNo: "",
      expireMonth: "",
      expireYear: "",
      birthday: "",
      cardPw: "",
      quota: "00",
    });
    writeStoredFlow({
      shortCode: session.shortCode,
      qrSessionId: session.id,
      paymentIntentId: preparedReady.paymentIntentId,
      orderNo: result.data.orderNo,
      amount: result.data.recalculatedAmount,
      status: "confirmed",
      source: "firebase_functions",
      message: result.data.message,
      updatedAt: new Date().toISOString(),
    });
    window.location.assign(result.data.orderLookupUrl ?? liveSuccessUrl(session.shortCode, result.data.orderNo, preparedReady.paymentIntentId));
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
      ...checkoutPayload(session, preparedReady.recalculatedAmount, receiver),
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
      window.location.assign(result.data.orderLookupUrl ?? liveSuccessUrl(session.shortCode, result.data.orderNo, confirmedPaymentIntentId));
      return;
    }

    setError({
      code: "INNOPAY_SMS_STILL_PENDING",
      message: result.data.message,
      details: { transactionStatus: result.data.transactionStatus },
    });
  }

  async function runInnopayPrimary() {
    if (mockPaymentBlocked) {
      setError({
        code: "MOCK_PAYMENT_CONFIRM_DISABLED",
        message: "PG 설정이 완료되지 않아 모의 결제 확정은 차단되었습니다.",
      });
      return;
    }

    const preparedReady = ready ?? (await runReady());
    if (!preparedReady) {
      return;
    }

    if (smsSyncMode) {
      await runInnopaySmsSync();
      return;
    }

    if (preparedReady.provider === "mock") {
      if (!mockPaymentConfirmAllowed) {
        setError({
          code: "MOCK_PAYMENT_CONFIRM_DISABLED",
          message: "PG 설정이 완료되지 않아 모의 결제 확정은 차단되었습니다.",
        });
        return;
      }

      await runConfirm(preparedReady);
      return;
    }

    if (preparedReady.provider === "infiny") {
      await (innopayChannel === "webview" ? runProviderPayment(preparedReady) : runInnopaySmsPayment(preparedReady));
      return;
    }

    if (preparedReady.provider === "payup") {
      if (isPayupStandardRuntimeConfig(preparedReady.pgClientConfig ?? pgClientConfig)) {
        await runProviderPayment(preparedReady);
        return;
      }

      await runPayupPayment(preparedReady);
      return;
    }

    await runProviderPayment(preparedReady);
  }

  return (
    <section className="grid min-w-0 gap-4">
      <section className={checkoutGlassPanelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-rose-600">결제</p>
            <h2 className="mt-1 text-2xl font-normal text-slate-950">QR 결제</h2>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
              결제 금액과 결제자 정보를 확인한 뒤 결제를 진행합니다.
            </p>
          </div>
          <span className={checkoutStatusPillClass}>{innopayStatusLabel}</span>
        </div>

        <div className="mt-4 grid min-w-0 gap-2 text-sm sm:grid-cols-3">
          <div className={checkoutGlassTileClass}>
            <p className="text-xs font-normal text-slate-500">결제 금액</p>
            <p className="mt-1 break-words text-xl font-normal text-rose-600">{formatCurrency(checkoutDisplayAmount)}</p>
            <div className="mt-2 grid gap-1 text-[11px] font-normal text-slate-500">
              <p className="flex items-center justify-between gap-2">
                <span>{"\uc0c1\ud488\uae08\uc561"}</span>
                <span>{formatCurrency(displayProductSubtotal)}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>{"\ubc30\uc1a1\ube44"}</span>
                <span>{formatCurrency(displayShippingFee)}</span>
              </p>
              {displayRemoteAreaFee > 0 ? (
                <p className="flex items-center justify-between gap-2 text-rose-600">
                  <span>{"\ub3c4\uc11c\uc0b0\uac04 \ucd94\uac00"}</span>
                  <span>{formatCurrency(displayRemoteAreaFee)}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className={checkoutGlassTileClass}>
            <p className="text-xs font-normal text-slate-500">결제수단</p>
            <p className="mt-1 font-normal text-slate-950">{providerIsInnopay && innopayChannel === "webview" ? innopayPayMethod : "카드결제"}</p>
          </div>
          <div className={checkoutGlassTileClass}>
            <p className="text-xs font-normal text-slate-500">결제 상태</p>
            <p className="mt-1 font-normal text-slate-950">
              {checkoutStatusLabel}
            </p>
          </div>
        </div>

        {providerIsInnopay ? (
          <div className="mt-4 grid min-w-0 gap-3 rounded-md border border-white/70 bg-white/55 p-3 shadow-sm ring-1 ring-rose-100/70 backdrop-blur">
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <label className={checkoutFieldLabelClass}>
                인피니 결제 방식
                <select
                  value={innopayChannel}
                  onChange={(event) => updateInnopayChannel(event.target.value as InnopayCheckoutChannel)}
                  className={checkoutSelectClass}
                >
                  <option value="webview">결제창/웹뷰 바로 열기</option>
                  <option value="sms">SMS 결제 링크</option>
                </select>
              </label>

              <label className={checkoutFieldLabelClass}>
                결제수단
                <select
                  value={innopayPayMethod}
                  onChange={(event) => updateInnopayPayMethod(event.target.value as InnopayPayMethod)}
                  disabled={innopayChannel !== "webview"}
                  className={checkoutSelectClass}
                >
                  <option value="CARD">신용카드</option>
                  <option value="EPAY">간편결제</option>
                  <option value="BANK">계좌이체</option>
                  <option value="VBANK">가상계좌</option>
                  <option value="OPCARD">해외카드</option>
                </select>
              </label>

              {innopayPayMethod === "EPAY" ? (
                <label className={checkoutFieldLabelClass}>
                  간편결제사
                  <select
                    value={innopayEpayCl}
                    onChange={(event) => setInnopayEpayCl(event.target.value as InnopayEpayCl)}
                    disabled={innopayChannel !== "webview"}
                    className={checkoutSelectClass}
                  >
                    <option value="">통합 선택화면</option>
                    <option value="01">카카오페이</option>
                    <option value="02">LPay</option>
                    <option value="03">PAYCO</option>
                    <option value="0408">SSG 신용카드</option>
                    <option value="0409">SSG 머니</option>
                    <option value="06">네이버페이</option>
                  </select>
                </label>
              ) : null}

              <label className={checkoutFieldLabelClass}>
                카드 할부
                <select
                  value={innopayCardQuota}
                  onChange={(event) => setInnopayCardQuota(event.target.value)}
                  disabled={innopayChannel !== "webview" || innopayPayMethod !== "CARD"}
                  className={checkoutSelectClass}
                >
                  <option value="00">일시불</option>
                  <option value="02">2개월</option>
                  <option value="03">3개월</option>
                  <option value="06">6개월</option>
                  <option value="12">12개월</option>
                </select>
              </label>
            </div>
            <p className="text-xs font-normal leading-5 text-slate-600">
              결제창/웹뷰 방식은 인피니 `innopay.goPay()`를 호출해 카드사 선택, 앱카드/인증 앱 이동, 결제 결과 Return URL 복귀까지 사용합니다.
            </p>
          </div>
        ) : null}

        {providerIsPayup && !providerIsPayupStandard && payupKeyinEnabled ? (
          <div className="mt-4 grid min-w-0 gap-3 rounded-md border border-white/70 bg-white/55 p-3 shadow-sm ring-1 ring-rose-100/70 backdrop-blur">
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <label className={checkoutFieldLabelClass}>
                Payup 카드번호
                <input
                  value={payupCard.cardNo}
                  onChange={(event) => updatePayupCard("cardNo", event.target.value)}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="0000000000000000"
                  className={checkoutInputClass}
                />
              </label>
              <label className={checkoutFieldLabelClass}>
                유효기간 월
                <input
                  value={payupCard.expireMonth}
                  onChange={(event) => updatePayupCard("expireMonth", event.target.value)}
                  inputMode="numeric"
                  autoComplete="cc-exp-month"
                  placeholder="MM"
                  className={checkoutInputClass}
                />
              </label>
              <label className={checkoutFieldLabelClass}>
                유효기간 년
                <input
                  value={payupCard.expireYear}
                  onChange={(event) => updatePayupCard("expireYear", event.target.value)}
                  inputMode="numeric"
                  autoComplete="cc-exp-year"
                  placeholder="YY"
                  className={checkoutInputClass}
                />
              </label>
              <label className={checkoutFieldLabelClass}>
                생년월일/사업자번호
                <input
                  value={payupCard.birthday}
                  onChange={(event) => updatePayupCard("birthday", event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="YYMMDD"
                  className={checkoutInputClass}
                />
              </label>
              <label className={checkoutFieldLabelClass}>
                카드 비밀번호 앞 2자리
                <input
                  value={payupCard.cardPw}
                  onChange={(event) => updatePayupCard("cardPw", event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="**"
                  type="password"
                  className={checkoutInputClass}
                />
              </label>
              <label className={checkoutFieldLabelClass}>
                할부
                <select value={payupCard.quota} onChange={(event) => updatePayupCard("quota", event.target.value)} className={checkoutSelectClass}>
                  <option value="00">일시불</option>
                  <option value="02">2개월</option>
                  <option value="03">3개월</option>
                  <option value="06">6개월</option>
                  <option value="12">12개월</option>
                </select>
              </label>
            </div>
            <p className="text-xs font-normal leading-5 text-slate-600">
              카드 승인 정보는 Payup 승인 요청에만 사용되며 A5 주문, 결제, 브라우저 저장소에는 저장하지 않습니다.
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={runInnopayPrimary}
            disabled={innopayPrimaryDisabled}
            className={checkoutPrimaryButtonClass}
          >
            {pending === "ready"
              ? "결제 준비 중"
              : !receiverComplete
                ? "결제자 정보 입력 필요"
              : pending === "sms"
                ? "결제 요청 중"
                : pending === "sync"
                  ? "결제 완료 확인 중"
                  : !ready
                    ? "결제"
                  : smsSyncMode
                      ? "결제완료 확인"
                      : providerIsInnopay && innopayChannel === "webview"
                        ? "결제하기"
                        : providerIsInnopay
                          ? "SMS 결제 요청"
                          : providerIsPayup
                            ? "Payup 카드 결제"
                            : "결제"}
          </button>
          {innopayBlockedReason ? (
            <p className="rounded-md border border-amber-100 bg-amber-50/80 p-3 text-xs font-normal leading-5 text-amber-900 backdrop-blur">
              {innopayBlockedReason}
            </p>
          ) : null}
          {visibleSmsStart ? (
            <p className="rounded-md border border-sky-100 bg-white/75 p-3 text-xs font-normal leading-5 text-sky-950 backdrop-blur">
              결제 요청 응답코드 {visibleSmsStart.resultCode}. 고객 휴대폰 {visibleSmsStart.buyerPhoneMasked ?? "-"}로 결제 링크 요청을 보냈습니다.
            </p>
          ) : null}
          {pgLaunchMessage ? (
            <p className="rounded-md border border-emerald-100 bg-emerald-50/80 p-3 text-xs font-normal leading-5 text-emerald-950 backdrop-blur">
              {pgLaunchMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-white/70 bg-white/60 p-4 text-slate-800 shadow-sm ring-1 ring-amber-100/80 backdrop-blur">
        <h3 className="font-normal">취소/환불 안내</h3>
        <p className="mt-2 text-sm font-normal leading-6">
          결제 완료 후 취소 또는 환불은 상품 발송, 현장 수령 여부, 판매자 정책에 따라 처리됩니다. 주문 내역 확인 화면에서 주문번호를 확인한 뒤 판매자 또는 산후조리원 안내 창구로 문의해 주세요.
        </p>
        <p className="mt-3 text-xs font-normal leading-5">
          오픈마켓(산후조리원연합회)은 통신판매중개자 이며, 판매자가 등록한 상품 및 거래에 대한 정보 등의 저작권 책임은 각 판매자 에게 있습니다.
        </p>
      </section>

      {!activeQr ? (
        <section className="rounded-md border border-red-100 bg-red-50/85 p-4 text-red-950 shadow-sm backdrop-blur">
          <h3 className="font-normal">결제 진입 차단</h3>
          <p className="mt-2 text-sm leading-6">
            QR 상태가 {session.status}이고 만료 여부는 {expired ? "만료됨" : "유효"}입니다. 서버 ready 호출은 차단 사유 확인용으로만 사용할 수 있습니다.
          </p>
        </section>
      ) : null}

      {smsStart ? (
        <section className="rounded-md border border-white/70 bg-white/65 p-4 text-slate-900 shadow-sm ring-1 ring-sky-100/80 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-normal">결제요청 전송 완료</h3>
              <p className="mt-2 text-sm leading-6">{smsStart.message}</p>
              <p className="mt-2 text-xs font-normal">
                주문번호 {smsStart.orderNo} / 결과코드 {smsStart.resultCode} / 수신번호 {smsStart.buyerPhoneMasked ?? "-"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runInnopaySmsSync()}
              disabled={Boolean(pending)}
              className={checkoutSmallButtonClass}
            >
              {pending === "sync" ? "승인 확인 중" : "결제완료 확인"}
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-md border border-red-100 bg-red-50/85 p-4 text-red-950 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-normal">{riskCopy(error.code)}</h3>
              <p className="mt-2 text-sm leading-6">{error.message}</p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-normal shadow-sm">{error.code}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href={liveCheckoutUrl(session.shortCode, { paymentResult: "failed" })} className={checkoutSmallButtonClass}>
              실패 화면 보기
            </Link>
            <Link href="/tablet/qr" className={checkoutSecondaryButtonClass}>
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
      ? "결제 완료 이후 주문 상태를 조회합니다."
      : mode === "failed"
        ? "만료, 금액불일치, 재고부족, 중복 결제 등 서버 차단 사유를 고객에게 안내합니다."
    : "결제 의도 ID 또는 주문번호 기준으로 결제 상태를 조회합니다.";

  return (
    <section className="rounded-md border border-white/70 bg-white/65 p-4 shadow-[0_18px_50px_rgba(190,18,60,0.1)] ring-1 ring-white/50 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.12em] text-rose-600">결제 상태</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">{headline}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
        <span className={checkoutStatusPillClass}>{endpoints.ready ? "결제 함수 주소 준비" : "결제 함수 주소 누락"}</span>
      </div>

      <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
        <div className={checkoutGlassTileClass}>
          <p className="text-xs font-normal text-slate-500">단축 코드</p>
          <p className="mt-1 font-normal">{shortCode}</p>
        </div>
        <div className={checkoutGlassTileClass}>
          <p className="text-xs font-normal text-slate-500">결제 요청</p>
          <p className="mt-1 break-words font-normal">{paymentIntentId ?? "-"}</p>
        </div>
        <div className={checkoutGlassTileClass}>
          <p className="text-xs font-normal text-slate-500">주문번호</p>
          <p className="mt-1 break-words font-normal">{orderNo ?? "-"}</p>
        </div>
        <div className={checkoutGlassTileClass}>
          <p className="text-xs font-normal text-slate-500">상태</p>
          <p className="mt-1 font-normal">{status?.status ?? stored?.status ?? "pending_lookup"}</p>
        </div>
      </div>

      {status ? (
        <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50/80 p-3 text-sm leading-6 text-emerald-950 backdrop-blur">
          <span>{status.message}</span>
          <p className="mt-1">
            결제수단 {status.provider ?? "-"} / 금액 {status.amount ? formatCurrency(status.amount) : "-"} / 출처 {status.source}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50/85 p-3 text-sm leading-6 text-red-950 backdrop-blur">
          <span>{riskCopy(error.code)}</span>
          <p className="mt-1">{error.message}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || (!paymentIntentId && !orderNo)}
          className={checkoutSmallButtonClass}
        >
          {loading ? "상태 조회 중" : "상태 다시 조회"}
        </button>
        <Link href={liveCheckoutUrl(shortCode)} className={checkoutSecondaryButtonClass}>
          checkout으로 돌아가기
        </Link>
        <Link href={orderNo ? `/orders/guest/${orderNo}` : "/orders/guest"} className={checkoutSmallButtonClass}>
          주문 상세 보기
        </Link>
      </div>
    </section>
  );
}
