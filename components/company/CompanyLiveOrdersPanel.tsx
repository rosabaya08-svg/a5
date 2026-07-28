"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, where, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { normalizeBusinessNo, readPortalSession } from "@/lib/auth/session";
import { ensureAnonymousFirebaseUser, getFirebaseDb } from "@/lib/firebase/client";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { DataTable } from "@/components/ui/DataTable";
import { CompanyDeliveryActionPanel } from "@/components/company/CompanyDeliveryActionPanel";
import type { OrderItem } from "@/types/commerce";
import type { DeliveryStatus } from "@/types/status";

type LiveOrderItem = {
  id: string;
  orderNo: string;
  companyId: string;
  sellerCompanyId?: string;
  sellerBusinessNo?: string;
  sellerBusinessNoNormalized?: string;
  sellerCompanyName?: string;
  productId: string;
  optionId?: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  deliveryStatus: DeliveryStatus;
  settlementAmount: number;
  createdAt: string;
  carrierCode?: string;
  invoiceNumber?: string;
};

type LiveOrder = {
  id: string;
  orderNo: string;
  status: string;
  customerName: string;
  customerPhoneMasked: string;
  deliveryMethod: "pickup" | "delivery";
  totalAmount: number;
  paidAt?: string;
  createdAt: string;
  roomId?: string;
  receiverAddress?: string;
  receiverAddressDetail?: string;
};

type CompanyNotification = {
  id: string;
  orderNo: string;
  title: string;
  message: string;
  amount: number;
  createdAt: string;
  read: boolean;
};

type CancelRequestState = {
  status: "idle" | "submitting" | "submitted" | "error";
  message: string;
};

type CancelRequestResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

type CompanyScopeField =
  | "company_id"
  | "companyId"
  | "seller_company_id"
  | "sellerCompanyId"
  | "pg_owner_company_id"
  | "seller_business_no_normalized"
  | "sellerBusinessNoNormalized"
  | "company_business_no_normalized"
  | "companyBusinessNoNormalized"
  | "business_registration_number_normalized";

type CompanyScopeQuery = {
  key: string;
  field: CompanyScopeField;
  value: string;
};

const companyIdScopeFields: CompanyScopeField[] = ["company_id", "companyId", "seller_company_id", "sellerCompanyId", "pg_owner_company_id"];
const companyBusinessNoScopeFields: CompanyScopeField[] = [
  "seller_business_no_normalized",
  "sellerBusinessNoNormalized",
  "company_business_no_normalized",
  "companyBusinessNoNormalized",
  "business_registration_number_normalized",
];

function buildCompanyScopeQueries(companyId: string, businessNo?: string) {
  const queries: CompanyScopeQuery[] = [];
  const seen = new Set<string>();
  const add = (field: CompanyScopeField, value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue) return;
    const key = `${field}:${cleanValue}`;
    if (seen.has(key)) return;
    seen.add(key);
    queries.push({ key, field, value: cleanValue });
  };

  companyIdScopeFields.forEach((field) => add(field, companyId));
  const normalizedBusinessNo = normalizeBusinessNo(businessNo ?? "");
  companyBusinessNoScopeFields.forEach((field) => add(field, normalizedBusinessNo));

  return queries;
}

const deliveryStatusLabels: Record<string, string> = {
  pending: "처리 대기",
  paid: "결제 완료",
  ready: "출고 준비",
  invoice_pending: "송장 대기",
  invoice_entered: "송장 입력",
  in_transit: "배송 중",
  shipping: "배송 중",
  delivered: "배송 완료",
  pickup_ready: "현장수령 준비",
  picked_up: "현장수령 완료",
  cancelled: "취소",
};

const orderStatusLabels: Record<string, string> = {
  pending_payment: "결제 대기",
  paid: "결제 완료",
  preparing: "상품 준비",
  shipping: "배송 중",
  ready_for_pickup: "현장수령 준비",
  delivered: "배송 완료",
  picked_up: "현장수령 완료",
  cancelled: "취소",
  refunded: "환불 완료",
};

function asString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asIsoDate(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const timestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }

  return new Date().toISOString();
}

function asDeliveryStatus(value: unknown): DeliveryStatus {
  const text = asString(value, "invoice_pending");
  const allowed: DeliveryStatus[] = ["invoice_pending", "invoice_entered", "in_transit", "delivered", "pickup_ready", "picked_up"];
  return allowed.includes(text as DeliveryStatus) ? (text as DeliveryStatus) : "invoice_pending";
}

function deliveryStatusLabel(status: string) {
  return deliveryStatusLabels[status] ?? (status || "처리 대기");
}

function orderStatusLabel(status: string) {
  return orderStatusLabels[status] ?? (status || "상태 미지정");
}

function mapOrderItem(documentId: string, data: DocumentData): LiveOrderItem {
  const quantity = asNumber(data.quantity, 1);
  const unitPrice = asNumber(data.unit_price ?? data.unitPrice);
  const sellerCompanyId = asString(data.seller_company_id ?? data.sellerCompanyId ?? data.pg_owner_company_id);
  const sellerBusinessNo = asString(data.seller_business_no ?? data.sellerBusinessNo ?? data.company_business_no ?? data.companyBusinessNo ?? data.business_registration_number);
  const sellerBusinessNoNormalized = normalizeBusinessNo(
    asString(
      data.seller_business_no_normalized ??
        data.sellerBusinessNoNormalized ??
        data.company_business_no_normalized ??
        data.companyBusinessNoNormalized ??
        data.business_registration_number_normalized ??
        sellerBusinessNo,
    ),
  );

  return {
    id: asString(data.id ?? data.order_item_id, documentId),
    orderNo: asString(data.order_no ?? data.orderNo ?? data.order_id),
    companyId: asString(data.company_id ?? data.companyId ?? sellerCompanyId),
    sellerCompanyId: sellerCompanyId || undefined,
    sellerBusinessNo: sellerBusinessNo || undefined,
    sellerBusinessNoNormalized: sellerBusinessNoNormalized || undefined,
    sellerCompanyName: asString(data.seller_company_name ?? data.sellerCompanyName ?? data.company_name ?? data.companyName) || undefined,
    productId: asString(data.product_id ?? data.productId ?? data.product_ref ?? data.productRef),
    optionId: asString(data.option_id ?? data.optionId),
    productName: asString(data.product_name ?? data.productName, "상품명 없음"),
    optionName: asString(data.option_name ?? data.optionName, "기본"),
    quantity,
    unitPrice,
    deliveryStatus: asDeliveryStatus(data.delivery_status ?? data.deliveryStatus),
    settlementAmount: asNumber(data.settlement_amount ?? data.settlementAmount, quantity * unitPrice),
    createdAt: asIsoDate(data.created_at ?? data.createdAt),
    carrierCode: asString(data.carrier_code ?? data.carrierCode),
    invoiceNumber: asString(data.invoice_no ?? data.invoiceNo ?? data.sheet_no),
  };
}

function mapOrder(documentId: string, data: DocumentData): LiveOrder {
  return {
    id: asString(data.id ?? data.order_id, documentId),
    orderNo: asString(data.order_no ?? data.orderNo, documentId),
    status: asString(data.status, "paid"),
    customerName: asString(data.customer_name ?? data.customerName, "비회원 고객"),
    customerPhoneMasked: asString(data.customer_phone_masked ?? data.customerPhoneMasked, "010-****-0000"),
    deliveryMethod: data.delivery_method === "delivery" || data.deliveryMethod === "delivery" ? "delivery" : "pickup",
    totalAmount: asNumber(data.total_amount ?? data.totalAmount),
    paidAt: asIsoDate(data.paid_at ?? data.paidAt),
    createdAt: asIsoDate(data.created_at ?? data.createdAt),
    roomId: asString(data.room_id ?? data.roomId),
    receiverAddress: asString(data.receiver_address),
    receiverAddressDetail: asString(data.receiver_address_detail),
  };
}

function mapNotification(documentId: string, data: DocumentData): CompanyNotification {
  return {
    id: asString(data.id, documentId),
    orderNo: asString(data.order_no ?? data.orderNo),
    title: asString(data.title, "새 결제 주문"),
    message: asString(data.message, "고객 결제가 완료되었습니다."),
    amount: asNumber(data.amount),
    createdAt: asIsoDate(data.created_at ?? data.createdAt),
    read: data.read === true,
  };
}

function mergeUniqueById<T extends { id: string }>(items: T[][]) {
  return [...new Map(items.flat().map((item) => [item.id, item])).values()];
}

function playOrderSound() {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.34);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.36);
}

function toOrderItem(item: LiveOrderItem): OrderItem {
  return {
    id: item.id,
    orderId: item.orderNo,
    companyId: item.companyId,
    sellerCompanyId: item.sellerCompanyId,
    sellerBusinessNo: item.sellerBusinessNo,
    sellerBusinessNoNormalized: item.sellerBusinessNoNormalized,
    sellerCompanyName: item.sellerCompanyName,
    productName: item.productName,
    optionName: item.optionName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    deliveryStatus: item.deliveryStatus,
    settlementAmount: item.settlementAmount,
  };
}

function CompanyCancelRequestPanel({
  companyId,
  item,
  order,
}: {
  companyId: string;
  item: LiveOrderItem;
  order?: LiveOrder;
}) {
  const lineAmount = item.unitPrice * item.quantity;
  const [amount, setAmount] = useState(String(lineAmount));
  const [reason, setReason] = useState("");
  const [state, setState] = useState<CancelRequestState>({ status: "idle", message: "" });
  const disabledByStatus = ["cancelled", "refunded"].includes(order?.status ?? "");

  async function submitCancelRequest() {
    const endpoint = getPaymentFunctionUrl("cancel");
    const requestedAmount = Math.trunc(Number(amount));

    if (!endpoint) {
      setState({ status: "error", message: "취소/환불 요청 서버 주소가 설정되지 않았습니다." });
      return;
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      setState({ status: "error", message: "요청 금액을 1원 이상으로 입력해 주세요." });
      return;
    }

    if (disabledByStatus) {
      setState({ status: "error", message: "이미 취소 또는 환불 완료된 주문입니다." });
      return;
    }

    setState({ status: "submitting", message: "취소/환불 검토 요청을 접수하고 있습니다." });

    try {
      const user = await ensureCompanyFirebaseAuthFromSession();
      const token = await user?.getIdToken();
      if (!token) throw new Error("로그인 확인이 필요합니다. 다시 로그인해 주세요.");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderNo: item.orderNo,
          companyId,
          amount: requestedAmount,
          reason: reason.trim() || "기업관리자 취소/환불 검토 요청",
          requestedBy: "COMPANY_ADMIN",
          items: [
            {
              productId: item.productId,
              optionId: item.optionId,
              productName: item.productName,
              optionName: item.optionName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              companyId,
            },
          ],
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CancelRequestResponse;
      const accepted = payload.ok !== false || payload.status === "manual_review_required";

      if (!response.ok || payload.error || !accepted) {
        throw new Error(payload.error?.message || payload.message || "취소/환불 요청 접수에 실패했습니다.");
      }

      setState({
        status: "submitted",
        message: payload.message || "취소/환불 요청이 접수되었습니다. 처리 결과는 주문 화면에서 확인할 수 있습니다.",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "취소/환불 요청 접수에 실패했습니다.",
      });
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <label className="grid gap-1 text-xs font-normal text-slate-600">
          요청 금액
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
            className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-normal text-slate-950"
            inputMode="numeric"
          />
        </label>
        <label className="grid gap-1 text-xs font-normal text-slate-600">
          사유
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-normal text-slate-950"
            placeholder="예: 고객 단순변심, 품절, 중복 주문"
          />
        </label>
      </div>
      <div className="rounded-md bg-white/70 p-3 text-xs font-normal leading-5 text-slate-600">
        취소·환불 요청은 주문번호를 기준으로 접수되며, 운영자 확인 후 처리됩니다.
      </div>
      <button
        type="button"
        onClick={submitCancelRequest}
        disabled={state.status === "submitting" || disabledByStatus}
        className="rounded-md bg-rose-600 px-4 py-3 text-sm font-normal text-white disabled:opacity-50"
      >
        {state.status === "submitting" ? "요청 접수 중" : "취소/환불 검토 요청"}
      </button>
      {state.message ? (
        <p className={`rounded-md px-3 py-2 text-xs font-normal ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function OrderDetailDrawer({
  companyId,
  item,
  order,
  onClose,
}: {
  companyId: string;
  item: LiveOrderItem;
  order?: LiveOrder;
  onClose: () => void;
}) {
  const lineAmount = item.unitPrice * item.quantity;
  const deliveryMethod = order?.deliveryMethod === "delivery" ? "택배 배송" : "조리원 현장수령";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 p-3">
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-md bg-white text-slate-950 shadow-2xl">
        <header className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">주문 상세</p>
              <h2 className="mt-1 text-2xl font-normal">{item.orderNo}</h2>
              <p className="mt-2 text-sm font-normal text-slate-500">{orderStatusLabel(order?.status ?? "paid")} / {deliveryMethod}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-sm font-normal">
              X
            </button>
          </div>
        </header>

        <div className="a5-console-scrollbar flex-1 overflow-y-auto p-5">
          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-normal text-slate-500">고객</p>
              <p className="mt-1 font-normal">{order?.customerName ?? "비회원 고객"}</p>
              <p className="mt-1 text-sm font-normal text-slate-500">{order?.customerPhoneMasked ?? "010-****-0000"}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-normal text-slate-500">결제/주문</p>
              <p className="mt-1 font-normal">{formatCurrency(order?.totalAmount || lineAmount)}</p>
              <p className="mt-1 text-sm font-normal text-slate-500">{formatDateTime(order?.paidAt ?? item.createdAt)}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-normal text-slate-500">수령 방식</p>
              <p className="mt-1 font-normal">{deliveryMethod}</p>
              <p className="mt-1 text-sm font-normal text-slate-500">{order?.roomId || order?.receiverAddress || "수령 위치 미지정"}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-normal text-slate-500">배송 상태</p>
              <p className="mt-1 font-normal">{deliveryStatusLabel(item.deliveryStatus)}</p>
              <p className="mt-1 text-sm font-normal text-slate-500">{item.invoiceNumber ? `${item.carrierCode || "택배사"} / ${item.invoiceNumber}` : "송장 미입력"}</p>
            </div>
          </section>

          <section className="mt-4 rounded-md border border-slate-200 p-4">
            <p className="text-xs font-normal tracking-[0.14em] text-slate-500">상품</p>
            <h3 className="mt-2 text-lg font-normal">{item.productName}</h3>
            <div className="mt-3 grid gap-2 text-sm font-normal text-slate-600">
              <div className="flex justify-between gap-3">
                <span>옵션</span>
                <span className="text-slate-950">{item.optionName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>수량</span>
                <span className="text-slate-950">{item.quantity.toLocaleString()}개</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>판매금액</span>
                <span className="text-slate-950">{formatCurrency(lineAmount)}</span>
              </div>

            </div>
          </section>

          <section className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-normal tracking-[0.14em] text-rose-700">취소/환불</p>
            <h3 className="mt-1 text-lg font-normal text-slate-950">취소/환불 검토 요청</h3>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
              주문 상품 단위로 취소 또는 환불을 요청할 수 있습니다. 접수한 요청은 운영자 확인 후 처리됩니다.
            </p>
            <div className="mt-3">
              <CompanyCancelRequestPanel companyId={companyId} item={item} order={order} />
            </div>
          </section>

          <section className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">배송 처리</p>
            <h3 className="mt-1 text-lg font-normal text-slate-950">배송/현장수령 처리</h3>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
              저장하면 기업 범위 검증 후 `order_items`와 `orders`가 함께 갱신되고, 고객 주문조회 화면도 같은 주문 상태를 읽습니다.
            </p>
            <div className="mt-3">
              <CompanyDeliveryActionPanel companyId={companyId} item={toOrderItem(item)} />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export function CompanyLiveOrdersPanel({ companyId, businessNo }: { companyId: string; businessNo?: string }) {
  const [items, setItems] = useState<LiveOrderItem[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [notifications, setNotifications] = useState<CompanyNotification[]>([]);
  const [liveAlert, setLiveAlert] = useState<CompanyNotification | null>(null);
  const [selectedItem, setSelectedItem] = useState<LiveOrderItem | null>(null);
  const [statusMessage, setStatusMessage] = useState("실시간 주문 연결을 준비하고 있습니다.");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const initializedNotifications = useRef(false);
  const alertTimerRef = useRef<number | null>(null);
  const sessionBusinessNo = useMemo(() => readPortalSession("company")?.businessNo, []);
  const companyScopeQueries = useMemo(() => buildCompanyScopeQueries(companyId, businessNo ?? sessionBusinessNo), [businessNo, companyId, sessionBusinessNo]);
  const orderItemsByScope = useRef<Record<string, LiveOrderItem[]>>({});
  const ordersByScope = useRef<Record<string, LiveOrder[]>>({});
  const notificationsByScope = useRef<Record<string, CompanyNotification[]>>({});

  useEffect(() => {
    const unsubscribers: Unsubscribe[] = [];
    let cancelled = false;
    orderItemsByScope.current = {};
    ordersByScope.current = {};
    notificationsByScope.current = {};

    void ensureCompanyFirebaseAuthFromSession()
      .catch(() => ensureAnonymousFirebaseUser())
      .catch(() => null)
      .then(() => {
        if (cancelled) return;
        const db = getFirebaseDb();

        if (!db) {
          setStatusMessage("주문 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        for (const companyScope of companyScopeQueries) {
          const orderItemsQuery = query(collection(db, "order_items"), where(companyScope.field, "==", companyScope.value));
          const ordersQuery = query(collection(db, "orders"), where(companyScope.field, "==", companyScope.value));
          const notificationsQuery = query(collection(db, "company_notifications"), where(companyScope.field, "==", companyScope.value));

          unsubscribers.push(
            onSnapshot(
              orderItemsQuery,
              (snapshot) => {
                orderItemsByScope.current[companyScope.key] = snapshot.docs.map((doc) => mapOrderItem(doc.id, doc.data()));
                setItems(mergeUniqueById(Object.values(orderItemsByScope.current)).sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
                setStatusMessage("결제 완료 주문을 실시간으로 수신 중입니다.");
              },
              (error) => setStatusMessage(`주문 실시간 구독 실패: ${error.message}`),
            ),
            onSnapshot(
              ordersQuery,
              (snapshot) => {
                ordersByScope.current[companyScope.key] = snapshot.docs.map((doc) => mapOrder(doc.id, doc.data()));
                setOrders(mergeUniqueById(Object.values(ordersByScope.current)).sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
              },
              (error) => setStatusMessage(`주문 상세 구독 실패: ${error.message}`),
            ),
            onSnapshot(
              notificationsQuery,
              (snapshot) => {
                notificationsByScope.current[companyScope.key] = snapshot.docs.map((doc) => mapNotification(doc.id, doc.data()));
                const nextNotifications = mergeUniqueById(Object.values(notificationsByScope.current)).sort((left, right) =>
                  right.createdAt.localeCompare(left.createdAt),
                );

                if (initializedNotifications.current) {
                  const newest = nextNotifications.find((notification) => !seenNotificationIds.current.has(notification.id));
                  if (newest) {
                    if (soundEnabled) playOrderSound();
                    setLiveAlert(newest);
                    if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
                    alertTimerRef.current = window.setTimeout(() => setLiveAlert(null), 7000);
                  }
                }

                seenNotificationIds.current = new Set(nextNotifications.map((notification) => notification.id));
                initializedNotifications.current = true;
                setNotifications(nextNotifications);
              },
              (error) => setStatusMessage(`알림 실시간 구독 실패: ${error.message}`),
            ),
          );
        }
      });

    return () => {
      cancelled = true;
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [companyId, companyScopeQueries, soundEnabled]);

  const ordersByNo = useMemo(() => new Map(orders.map((order) => [order.orderNo, order])), [orders]);
  const latestNotification = notifications[0];
  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items]);
  const readyCount = useMemo(
    () => items.filter((item) => ["invoice_pending", "pickup_ready"].includes(item.deliveryStatus)).length,
    [items],
  );
  const selectedOrder = selectedItem ? ordersByNo.get(selectedItem.orderNo) : undefined;

  return (
    <div className="grid gap-4">
      {liveAlert ? (
        <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-950 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-normal tracking-[0.14em] text-rose-700">신규 결제 주문</p>
              <h2 className="mt-1 text-xl font-normal">{liveAlert.title}</h2>
              <p className="mt-1 text-sm font-normal">
                {liveAlert.orderNo} / {formatCurrency(liveAlert.amount)}
              </p>
              <p className="mt-1 text-sm">{liveAlert.message}</p>
            </div>
            <button type="button" onClick={() => setLiveAlert(null)} className="rounded-md bg-rose-700 px-4 py-3 text-sm font-normal text-white">
              확인
            </button>
          </div>
        </section>
      ) : null}
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">실시간 주문 목록</p>
            <h2 className="mt-1 text-lg font-normal">결제 완료 주문 실시간 반영</h2>
            <p className="mt-2 text-sm font-normal">{statusMessage}</p>
            {latestNotification ? (
              <p className="mt-2 text-sm">
                최근 알림: {latestNotification.title} / {latestNotification.orderNo} / {formatCurrency(latestNotification.amount)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(true);
              playOrderSound();
            }}
            className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-normal text-white"
          >
            {soundEnabled ? "알림 소리 켜짐" : "알림 소리 켜기"}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-white p-3">
            <p className="text-xs font-normal text-emerald-700">주문 상품</p>
            <p className="mt-1 text-xl font-normal">{items.length}건</p>
          </div>
          <div className="rounded-md bg-white p-3">
            <p className="text-xs font-normal text-emerald-700">판매 금액</p>
            <p className="mt-1 text-xl font-normal">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="rounded-md bg-white p-3">
            <p className="text-xs font-normal text-emerald-700">처리 필요</p>
            <p className="mt-1 text-xl font-normal">{readyCount}건</p>
          </div>
        </div>
      </section>

      <DataTable
        columns={["주문", "고객", "상품", "수량", "배송 상태", "판매금액", "처리"]}
        rows={items.map((item) => {
          const order = ordersByNo.get(item.orderNo);

          return {
            id: item.id,
            cells: [
              item.orderNo,
              order?.customerName ?? "-",
              <div key="product">
                <p className="font-normal text-slate-950">{item.productName}</p>
                <p className="mt-1 text-xs font-normal text-slate-500">{item.optionName}</p>
              </div>,
              item.quantity,
              deliveryStatusLabel(item.deliveryStatus),
              formatCurrency(item.unitPrice * item.quantity),
              <button
                key="detail"
                type="button"
                onClick={() => setSelectedItem(item)}
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white"
              >
                상세/처리
              </button>,
            ],
          };
        })}
        emptyMessage="아직 결제 완료 주문 상품이 없습니다."
        sortLabel="정렬: 최신 주문순"
        paginationLabel={`${items.length.toLocaleString()}건`}
      />

      {selectedItem ? (
        <OrderDetailDrawer
          companyId={companyId}
          item={selectedItem}
          order={selectedOrder}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}
    </div>
  );
}
