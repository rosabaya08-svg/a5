"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QrReceiverForm,
  initialQrReceiverFormValue,
  isQrReceiverFormComplete,
  maskCustomerPhone,
  type QrReceiverFormValue,
} from "@/components/storefront/QrReceiverForm";
import { readTabletRoomSession } from "@/components/tablet/TabletAccessFlow";
import { mockCompanies } from "@/data/mockCompanies";
import { approveBackendMockPayment, createBackendQrSession } from "@/lib/firebase/liveShopBackend";
import {
  listLiveShopCompletedOrdersForRoom,
  readLiveShopOrderByOrderNo,
  readLiveShopQrSessionByShortCode,
  saveLiveShopDocument,
  type LiveShopCompletedOrder,
  type LiveShopStoredOrder,
} from "@/lib/firebase/liveShopRepository";
import {
  COMPANY_GROUP_PURCHASE_MESSAGE,
  groupCartItemsByCompany,
  removePaidItemsFromCart,
  type CompanyPaymentGroup,
} from "@/lib/payments/companyPaymentGroups";
import { resolveQrPickupLocation, withResolvedQrPickupLocation } from "@/lib/qr/pickupLocation";
import { formatCurrency } from "@/lib/utils/format";
import type { CartItemSnapshot, Product, ProductOption, QrPaymentSession, QrPickupLocation } from "@/types/commerce";

type CartLine = CartItemSnapshot & {
  productImage?: string;
  productId: string;
};

type IndexedCartLine = CartLine & {
  cartIndex: number;
};

type LiveOrder = {
  orderNo: string;
  qrSession: QrPaymentSession;
  customerName: string;
  customerPhoneMasked: string;
  receiver?: QrReceiverFormValue;
  guestOrderUrl?: string;
  shareMessage?: string;
  createdAt: string;
  paidAt: string;
  status: "paid" | "ready_for_pickup";
};

const cartKeyBase = "a5-live-cart";
const lastQrKeyBase = "a5-live-last-qr";
const completedOrderSyncKeyBase = "a5-live-completed-order-sync";
const qrPrefix = "a5-live-qr:";
const orderPrefix = "a5-live-order:";
const cartAddedEventName = "a5-cart-added";
const defaultA5PublicOrigin = "https://mommy-a5.pages.dev";
const configuredA5PublicOrigin = (process.env.NEXT_PUBLIC_A5_PUBLIC_BASE_URL || defaultA5PublicOrigin).replace(/\/$/, "");
const memoryStore = new Map<string, string>();

function readTabletScope() {
  const session = readTabletRoomSession();
  return session ? `${session.nurseryId}:${session.roomId}:${session.tabletId}` : "unassigned";
}

function scopedKey(base: string) {
  return `${base}:${readTabletScope()}`;
}

function currentCartKey() {
  return scopedKey(cartKeyBase);
}

function currentLastQrKey() {
  return scopedKey(lastQrKeyBase);
}

function currentCompletedOrderSyncKey() {
  return scopedKey(completedOrderSyncKeyBase);
}

function currentCartId(companyId?: string) {
  const scope = readTabletScope().replaceAll(":", "-");
  return companyId ? `cart:${scope}:${companyId}` : `cart:${scope}`;
}

function pickupLocationForTablet(): QrPickupLocation | undefined {
  const tabletSession = readTabletRoomSession();
  if (!tabletSession) return undefined;

  return resolveQrPickupLocation({
    nurseryId: tabletSession.nurseryId,
    nurseryName: tabletSession.businessName,
    nurseryAddress: tabletSession.registeredAddress,
    roomId: tabletSession.roomId,
    roomName: tabletSession.roomName,
  });
}

function makeQrImageUrl(targetUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(targetUrl)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDateKeyFromIso(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? localDateKey() : localDateKey(date);
}

function addHoursIso(baseIso: string, hours: number) {
  return new Date(new Date(baseIso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function makeShortCode() {
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `A5${stamp}${random}`;
}

function makeOrderNo() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `A5-${ymd}-${Date.now().toString().slice(-5)}`;
}

function readLastQrSession(fallbackSession: QrPaymentSession) {
  const code = readText(currentLastQrKey());
  return withResolvedQrPickupLocation(code ? readJson<QrPaymentSession>(`${qrPrefix}${code}`, fallbackSession) : fallbackSession);
}

function readQrCheckoutSession(code: string) {
  const session = code ? readJson<QrPaymentSession | null>(`${qrPrefix}${code}`, null) : null;
  return session ? withResolvedQrPickupLocation(session) : null;
}

function readLiveOrder(orderNo: string) {
  return orderNo ? readJson<LiveOrder | null>(`${orderPrefix}${orderNo}`, null) : null;
}

function toLiveOrder(order: LiveShopStoredOrder): LiveOrder {
  return {
    orderNo: order.orderNo,
    qrSession: order.qrSession,
    customerName: order.customerName,
    customerPhoneMasked: order.customerPhoneMasked,
    receiver: order.receiver,
    guestOrderUrl: order.guestOrderUrl,
    shareMessage: order.shareMessage,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    status: order.status,
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = typeof window !== "undefined" ? window.localStorage?.getItem(key) : null;
    const memoryValue = value ?? memoryStore.get(key);
    return memoryValue ? (JSON.parse(memoryValue) as T) : fallback;
  } catch {
    try {
      const memoryValue = memoryStore.get(key);
      return memoryValue ? (JSON.parse(memoryValue) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}

function readText(key: string): string | null {
  try {
    const value = typeof window !== "undefined" ? window.localStorage?.getItem(key) : null;
    return value ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function announceStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("a5-cart-change"));
  }
}

function announceCartAdded() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(cartAddedEventName));
  }
}

function writeText(key: string, value: string) {
  memoryStore.set(key, value);

  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(key, value);
    }
    announceStorageChange();
    return true;
  } catch {
    announceStorageChange();
    return true;
  }
}

function writeJson<T>(key: string, value: T) {
  let serialized: string;

  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }

  memoryStore.set(key, serialized);

  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(key, serialized);
    }
    announceStorageChange();
    return true;
  } catch {
    announceStorageChange();
    return true;
  }
}

function cartTotal(items: CartLine[]) {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

function cartItemsEqual(left: CartLine[], right: CartLine[]) {
  if (left.length !== right.length) return false;

  return left.every((item, index) => {
    const other = right[index];
    return (
      item.productId === other.productId &&
      item.optionName === other.optionName &&
      item.companyId === other.companyId &&
      item.quantity === other.quantity &&
      item.unitPrice === other.unitPrice
    );
  });
}

function itemQuantity(items: CartItemSnapshot[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function orderShareUrl(orderNo: string) {
  const path = `/orders/guest/live?orderNo=${encodeURIComponent(orderNo)}`;
  return `${resolveA5PublicOrigin(typeof window === "undefined" ? "" : window.location.origin)}${path}`;
}

function completedOrderShareMessage(orderNo: string) {
  return `주문내역 확인: ${orderNo}`;
}

function resolveA5PublicOrigin(origin: string) {
  const normalizedOrigin = origin.replace(/\/$/, "");
  if (normalizedOrigin.startsWith("http://localhost") || normalizedOrigin.startsWith("http://127.0.0.1")) {
    return normalizedOrigin;
  }

  return configuredA5PublicOrigin || normalizedOrigin || defaultA5PublicOrigin;
}

function groupStatusLabel(group: CompanyPaymentGroup) {
  if (group.paymentReady) return "QR 결제 가능";
  if (group.merchantStatus === "in_review") return "MID 심사 중";
  if (group.merchantStatus === "blocked") return "MID 차단";
  return "테스트 QR 가능";
}

function toSnapshot(item: CartLine): CartItemSnapshot {
  return {
    productId: item.productId,
    optionId: item.optionId,
    productName: item.productName,
    optionName: item.optionName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    companyId: item.companyId,
  };
}

function persistCart(items: CartLine[]) {
  const tabletSession = readTabletRoomSession();
  const cartId = currentCartId();
  const stored = writeJson(currentCartKey(), items);
  void saveLiveShopDocument("carts", cartId, {
    cart_id: cartId,
    nursery_id: tabletSession?.nurseryId,
    room_id: tabletSession?.roomId,
    tablet_id: tabletSession?.tabletId,
    items: items.map(toSnapshot),
    total_amount: cartTotal(items),
    source: "tablet",
    status: "active",
  });

  return { stored };
}

function useCompletedOrderCartSync({
  enabled,
  replace,
  onSynced,
}: {
  enabled: boolean;
  replace: (next: CartLine[]) => Promise<void>;
  onSynced?: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function syncCompletedOrders() {
      const tabletSession = readTabletRoomSession();
      if (!tabletSession) return;

      const today = localDateKey();
      const completedOrders = await listLiveShopCompletedOrdersForRoom({
        nurseryId: tabletSession.nurseryId,
        roomId: tabletSession.roomId,
        date: today,
      });
      if (cancelled || completedOrders.length === 0) return;

      const syncedOrderNos = new Set(readJson<string[]>(currentCompletedOrderSyncKey(), []));
      const unsyncedOrders = completedOrders.filter((order) => !syncedOrderNos.has(order.orderNo));
      if (unsyncedOrders.length === 0) return;

      const paidItems = unsyncedOrders.flatMap((order) => order.items);
      const currentCart = readJson<CartLine[]>(currentCartKey(), []);
      const remainingCart = removePaidItemsFromCart(currentCart, paidItems);

      if (!cartItemsEqual(currentCart, remainingCart)) {
        await replace(remainingCart);
        if (!cancelled) onSynced?.();
      }

      writeJson(currentCompletedOrderSyncKey(), [...syncedOrderNos, ...unsyncedOrders.map((order) => order.orderNo)]);
    }

    void syncCompletedOrders();
    const interval = window.setInterval(() => void syncCompletedOrders(), 12000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, onSynced, replace]);
}

function useCart(fallbackItems: CartItemSnapshot[] = []) {
  const fallback = useMemo<CartLine[]>(
    () =>
      fallbackItems.map((item) => ({
        ...item,
        productId: item.productId,
      })),
    [fallbackItems],
  );
  const [items, setItems] = useState<CartLine[]>(fallback);

  useEffect(() => {
    const sync = () => {
      const stored = readJson<CartLine[]>(currentCartKey(), []);
      if (stored.length > 0) {
        setItems(stored);
        return;
      }

      setItems(fallback);
      if (fallback.length > 0) {
        writeJson(currentCartKey(), fallback);
      }
    };

    sync();
    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [fallback]);

  const replace = useCallback(async (next: CartLine[]) => {
    setItems(next);
    await persistCart(next);
  }, []);

  return { items, replace };
}

export function FloatingCartButton() {
  const pathname = usePathname();
  const { items, replace } = useCart();
  const [isPopping, setIsPopping] = useState(false);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const normalizedPathname = pathname.replace(/\/$/, "");

  useCompletedOrderCartSync({
    enabled: normalizedPathname !== "/tablet/cart",
    replace,
  });

  useEffect(() => {
    let popTimer: number | undefined;
    let popFrame: number | undefined;

    function pop() {
      window.clearTimeout(popTimer);
      if (popFrame !== undefined) {
        window.cancelAnimationFrame(popFrame);
      }
      setIsPopping(false);
      popFrame = window.requestAnimationFrame(() => setIsPopping(true));
      popTimer = window.setTimeout(() => setIsPopping(false), 760);
    }

    window.addEventListener(cartAddedEventName, pop);

    return () => {
      window.clearTimeout(popTimer);
      if (popFrame !== undefined) {
        window.cancelAnimationFrame(popFrame);
      }
      window.removeEventListener(cartAddedEventName, pop);
    };
  }, []);

  if (normalizedPathname === "/tablet/cart") {
    return null;
  }

  return (
    <nav aria-label="장바구니 이동" className="fixed bottom-5 right-4 z-40">
      <button
        type="button"
        onClick={() => {
          window.location.assign("/tablet/cart");
        }}
        className={`flex min-h-14 items-center gap-3 rounded-full border border-white/30 bg-white/35 p-1.5 pr-5 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.22)] backdrop-blur-xl transition active:scale-95 ${isPopping ? "a5-cart-pop" : ""}`}
        aria-label={`장바구니 ${count}개 보기`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full border border-white/50 bg-rose-600 text-white shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M7 8h13l-1.6 8.1a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.8 5.8A2 2 0 0 0 3.8 4H3" />
            <path d="M9 21h.01M17 21h.01" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-lg font-black leading-none">장바구니 {count}</span>
      </button>
    </nav>
  );
}

export function AddToCartPanel({ product, options }: { product: Product; options: ProductOption[] }) {
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id ?? "default");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const addTimerRef = useRef<number | undefined>(undefined);
  const addFrameRef = useRef<number | undefined>(undefined);
  const selected = options.find((option) => option.id === selectedOptionId);
  const unitPrice = product.price + (selected?.priceDelta ?? 0);

  useEffect(() => {
    return () => {
      window.clearTimeout(addTimerRef.current);
      if (addFrameRef.current !== undefined) {
        window.cancelAnimationFrame(addFrameRef.current);
      }
    };
  }, []);

  function playAddAnimation() {
    window.clearTimeout(addTimerRef.current);
    if (addFrameRef.current !== undefined) {
      window.cancelAnimationFrame(addFrameRef.current);
    }

    setIsAdding(false);
    addFrameRef.current = window.requestAnimationFrame(() => setIsAdding(true));
    addTimerRef.current = window.setTimeout(() => setIsAdding(false), 640);
  }

  async function addToCart() {
    const current = readJson<CartLine[]>(currentCartKey(), []);
    const optionName = selected?.name ?? "기본 옵션";
    const lineId = `${product.id}:${optionName}`;
    const existing = current.find((item) => `${item.productId}:${item.optionName}` === lineId);
    const next = existing
      ? current.map((item) =>
          `${item.productId}:${item.optionName}` === lineId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      : [
          ...current,
          {
            productId: product.id,
            optionId: selected?.id,
            productName: product.name,
            optionName,
            unitPrice,
            quantity,
            companyId: product.companyId,
            productImage: product.imageUrl,
          },
        ];

    const result = await persistCart(next);
    if (result.stored) {
      playAddAnimation();
      announceCartAdded();
    }
    setMessage(result.stored ? "담았습니다. 오른쪽 장바구니에 반영됐습니다." : "담았습니다. 브라우저 저장소 권한을 확인해 주세요.");
  }

  return (
    <section className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-bold">
          옵션
          <select
            value={selectedOptionId}
            onChange={(event) => setSelectedOptionId(event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-3"
          >
            {options.length > 0 ? (
              options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} / {formatCurrency(product.price + option.priceDelta)}
                </option>
              ))
            ) : (
              <option value="default">기본 옵션 / {formatCurrency(product.price)}</option>
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          수량
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            className="rounded-md border border-slate-200 px-3 py-3"
          />
        </label>
        <div className="rounded-md bg-white/35 p-3 text-sm">
          <span className="text-slate-500">선택 금액</span>
          <strong className="ml-2 text-xl text-rose-600">{formatCurrency(unitPrice * quantity)}</strong>
        </div>
        <button
          type="button"
          onClick={() => void addToCart()}
          className={`grid min-h-12 place-items-center overflow-hidden px-4 py-3 text-sm font-black text-white shadow-sm transition-all duration-[240ms] ease-out active:scale-[0.98] ${
            isAdding ? "a5-add-cart-morph rounded-full bg-rose-600 shadow-rose-600/25" : "rounded-md bg-slate-950"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            {isAdding ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M7 8h13l-1.6 8.1a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.8 5.8A2 2 0 0 0 3.8 4H3" />
                <path d="M9 21h.01M17 21h.01" strokeLinecap="round" />
              </svg>
            ) : null}
            {isAdding ? "담겼어요" : "담기"}
          </span>
        </button>
        {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      </div>
    </section>
  );
}

export function LiveCartPage({ fallbackItems }: { fallbackItems: CartItemSnapshot[] }) {
  const { items, replace } = useCart(fallbackItems);
  const [message, setMessage] = useState("");
  const indexedItems = useMemo<IndexedCartLine[]>(
    () => items.map((item, cartIndex) => ({ ...item, cartIndex })),
    [items],
  );
  const paymentGroups = useMemo(() => groupCartItemsByCompany(indexedItems, mockCompanies), [indexedItems]);
  const total = cartTotal(items);
  const notifyCompletedSync = useCallback(() => {
    setMessage("고객 휴대폰 결제 완료 항목을 장바구니에서 주문 완료로 반영했습니다.");
  }, []);

  useCompletedOrderCartSync({
    enabled: true,
    replace,
    onSynced: notifyCompletedSync,
  });

  async function setQuantity(index: number, quantity: number) {
    const next = items
      .map((item, itemIndex) => (itemIndex === index ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    await replace(next);
  }

  async function createQr(group: CompanyPaymentGroup<IndexedCartLine>) {
    const tabletSession = readTabletRoomSession();

    if (!tabletSession) {
      setMessage("객실 선택 후 결제 QR을 생성할 수 있습니다.");
      return;
    }

    if (items.length === 0) {
      setMessage("장바구니가 비어 있습니다.");
      return;
    }

    const groupItems: CartLine[] = group.items.map((item) => ({
      productId: item.productId,
      optionId: item.optionId,
      productName: item.productName,
      optionName: item.optionName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      companyId: item.companyId,
      productImage: item.productImage,
    }));
    const code = makeShortCode();
    const createdAt = nowIso();
    const expiresAt = addHoursIso(createdAt, 3);
    const pickupLocation = pickupLocationForTablet();
    const session: QrPaymentSession = {
      id: `qr-${code}`,
      shortCode: code,
      type: "purchase",
      status: "active",
      nurseryId: tabletSession.nurseryId,
      roomId: tabletSession.roomId,
      tabletId: tabletSession.tabletId,
      cartId: currentCartId(group.companyId),
      createdAt,
      expiresAt,
      deliveryMethod: "pickup",
      totalAmount: group.totalAmount,
      items: groupItems.map(toSnapshot),
      pickupLocation,
    };

    const backend = await createBackendQrSession({
      cartId: session.cartId,
      nurseryId: session.nurseryId,
      roomId: session.roomId,
      tabletId: session.tabletId,
      deliveryMethod: session.deliveryMethod,
      pickupLocation,
      items: session.items,
      totalAmountHint: session.totalAmount,
    });
    const liveSession = backend.ok ? { ...backend.session, pickupLocation: backend.session.pickupLocation ?? pickupLocation } : session;
    const savedSession = writeJson(`${qrPrefix}${liveSession.shortCode}`, liveSession);
    const savedPointer = writeText(currentLastQrKey(), liveSession.shortCode);

    if (!savedSession || !savedPointer) {
      setMessage("결제 진입 정보를 브라우저 저장소에 저장하지 못했습니다. 브라우저 저장소 권한을 확인해 주세요.");
      return;
    }

    setMessage(`${group.companyName} 결제 QR을 생성했습니다. QR 화면으로 이동합니다.`);
    window.location.assign("/tablet/qr");

    void saveLiveShopDocument("qr_payment_sessions", liveSession.id, {
      ...liveSession,
      short_code: liveSession.shortCode,
      total_amount: liveSession.totalAmount,
      pickup_location: liveSession.pickupLocation,
      source: backend.ok ? "backend_plus_storefront_context" : "local_fallback_only",
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3">
        <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">기업별 공동구매 결제</p>
          <h2 className="mt-1 text-xl font-black">{COMPANY_GROUP_PURCHASE_MESSAGE}</h2>
          <p className="mt-2 text-sm leading-6">
            한 번의 결제 QR에는 한 기업/MID 상품만 담습니다. 결제 완료 후 남은 기업 묶음은 다음 QR로 이어서 생성합니다.
          </p>
        </section>
        {items.length === 0 ? (
          <div className="rounded-md bg-white/45 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
            <h2 className="text-xl font-black">장바구니가 비었습니다</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/tablet/products" className="inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
                상품 보러가기
              </Link>
              <Link href="/tablet/orders" className="inline-flex rounded-md bg-white/60 px-4 py-3 text-sm font-black text-slate-900">
                주문 완료 내역
              </Link>
            </div>
          </div>
        ) : (
          paymentGroups.map((group, groupIndex) => (
            <article key={group.companyId} className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-rose-600">결제 묶음 {groupIndex + 1}</p>
                  <h3 className="mt-1 text-xl font-black">{group.companyName}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">MID {group.merchantIdMasked}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${group.paymentReady ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                  {groupStatusLabel(group)}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {group.items.map((item) => (
                  <div key={`${item.productId}-${item.optionName}`} className="grid gap-4 rounded-md bg-white/45 p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <h4 className="font-black">{item.productName}</h4>
                      <p className="mt-1 text-sm text-slate-600">{item.optionName}</p>
                      <div className="mt-3 inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
                        <button type="button" onClick={() => void setQuantity(item.cartIndex, item.quantity - 1)} className="px-3 py-2 font-black">
                          -
                        </button>
                        <span className="bg-slate-50 px-4 py-2 font-black">{item.quantity}</span>
                        <button type="button" onClick={() => void setQuantity(item.cartIndex, item.quantity + 1)} className="px-3 py-2 font-black">
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} / 개</p>
                      <p className="mt-1 text-xl font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      <button
                        type="button"
                        onClick={() => void setQuantity(item.cartIndex, 0)}
                        className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/45 pt-4">
                <div>
                  <p className="text-xs font-black text-slate-500">업체별 결제 예정</p>
                  <p className="text-2xl font-black text-rose-600">{formatCurrency(group.totalAmount)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void createQr(group)}
                  className="rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white transition active:scale-[0.98]"
                >
                  QR 결제 생성
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      <aside className="rounded-md bg-white/45 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <h2 className="text-xl font-black">장바구니 요약</h2>
        <div className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between">
            <span>상품 수량</span>
            <strong>{items.reduce((sum, item) => sum + item.quantity, 0)}개</strong>
          </div>
          <div className="flex justify-between">
            <span>결제 QR 묶음</span>
            <strong>{paymentGroups.length}개 업체</strong>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-black">합계</span>
            <strong className="text-rose-600">{formatCurrency(total)}</strong>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-slate-200 bg-white/55 p-3 text-xs font-bold leading-5 text-slate-700">
          {COMPANY_GROUP_PURCHASE_MESSAGE} 결제 완료된 업체 상품은 장바구니에서 빠지고, 남은 업체 묶음은 다음 QR로 생성합니다.
        </div>
        <Link href="/tablet/products" className="mt-2 block rounded-md bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-900">
          상품 계속 보기
        </Link>
        <Link href="/tablet/orders" className="mt-2 block rounded-md bg-white/70 px-4 py-3 text-center text-sm font-black text-slate-900">
          주문 완료 내역
        </Link>
        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      </aside>
    </section>
  );
}

export function LiveQrSessionPanel({ fallbackSession }: { fallbackSession: QrPaymentSession }) {
  const [session, setSession] = useState<QrPaymentSession>(() => readLastQrSession(fallbackSession));
  const [origin, setOrigin] = useState("");
  const sessionGroup = groupCartItemsByCompany(session.items, mockCompanies)[0];
  const checkoutUrl = `${resolveA5PublicOrigin(origin)}/q/live?code=${encodeURIComponent(session.shortCode)}`;

  useEffect(() => {
    const sync = () => setSession(readLastQrSession(fallbackSession));
    const originTimer = window.setTimeout(() => setOrigin(window.location.origin), 0);

    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.clearTimeout(originTimer);
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [fallbackSession]);

  return (
    <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[420px_1fr]">
      <div className="rounded-md bg-white/45 p-6 text-center text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="mx-auto grid h-72 w-72 place-items-center rounded-md border-[14px] border-slate-950 bg-white">
          <img src={makeQrImageUrl(checkoutUrl)} alt="결제 QR" className="h-[260px] w-[260px]" />
        </div>
        <p className="mt-3 text-sm font-black text-slate-700">휴대폰 카메라로 QR을 스캔하세요.</p>
        <p className="mt-4 text-sm font-bold text-rose-600">만료 {new Date(session.expiresAt).toLocaleString("ko-KR")}</p>
      </div>
      <div className="grid gap-3">
        <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">기업별 결제 QR</p>
          <h2 className="mt-1 text-lg font-black">{COMPANY_GROUP_PURCHASE_MESSAGE}</h2>
          <p className="mt-2 text-sm leading-6">
            현재 QR은 {sessionGroup?.companyName ?? "선택 업체"} 상품만 결제합니다. 다른 업체 상품은 장바구니에서 별도 QR로 이어집니다.
          </p>
        </section>
        {session.items.map((item) => (
          <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-black">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
              </div>
              <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
            </div>
          </article>
        ))}
        <div className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
          <div className="flex justify-between text-lg">
            <span className="font-black">결제 예정</span>
            <strong className="text-rose-600">{formatCurrency(session.totalAmount)}</strong>
          </div>
        </div>
        {session.pickupLocation ? (
          <div className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-black text-slate-500">현장 받기 자동 입력 주소</p>
            <p className="mt-1 font-black">{session.pickupLocation.nurseryName}</p>
            <p className="mt-1 text-sm font-bold text-slate-700">{session.pickupLocation.nurseryAddress}</p>
            <p className="mt-1 text-sm font-bold text-rose-600">{session.pickupLocation.roomName}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LiveQrCheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const [session, setSession] = useState<QrPaymentSession | null>(() => readQrCheckoutSession(code));
  const [receiver, setReceiver] = useState<QrReceiverFormValue | null>(() => {
    const initialSession = readQrCheckoutSession(code);
    return initialSession ? initialQrReceiverFormValue(initialSession) : null;
  });
  const [isLoadingSession, setIsLoadingSession] = useState(Boolean(code));
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    function sync() {
      const localSession = readQrCheckoutSession(code);
      if (localSession) setSession(localSession);
    }

    async function syncFromFirestore() {
      if (!code) {
        setIsLoadingSession(false);
        return;
      }

      setIsLoadingSession(true);
      const remoteSession = await readLiveShopQrSessionByShortCode(code);

      if (!cancelled && remoteSession) {
        writeJson(`${qrPrefix}${remoteSession.shortCode}`, remoteSession);
        setSession(remoteSession);
      }

      if (!cancelled) setIsLoadingSession(false);
    }

    sync();
    void syncFromFirestore();

    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      cancelled = true;
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [code]);

  useEffect(() => {
    if (session) setReceiver(initialQrReceiverFormValue(session));
  }, [session?.id]);

  async function pay() {
    if (!session) return;
    if (!receiver || !isQrReceiverFormComplete(receiver)) {
      setMessage("고객성명, 연락처, 주소를 입력하고 개인정보 처리 안내에 동의해 주세요.");
      return;
    }

    const customerName = receiver.customerName.trim();
    const customerPhoneMasked = maskCustomerPhone(receiver.customerPhone);
    const checkoutSession: QrPaymentSession = {
      ...session,
      deliveryMethod: receiver.deliveryMethod,
    };

    const backend = await approveBackendMockPayment({
      shortCode: session.shortCode,
      customerName,
      customerPhoneMasked,
    });
    const paidAt = nowIso();
    const fallbackPaidSession: QrPaymentSession = { ...checkoutSession, status: "paid" };
    const fallbackOrder: LiveOrder = {
      orderNo: makeOrderNo(),
      qrSession: fallbackPaidSession,
      customerName,
      customerPhoneMasked,
      receiver,
      createdAt: paidAt,
      paidAt,
      status: "paid",
    };
    const order: LiveOrder = backend.ok
      ? {
          ...backend.order,
          qrSession: {
            ...backend.order.qrSession,
            deliveryMethod: receiver.deliveryMethod,
            pickupLocation: backend.order.qrSession.pickupLocation ?? session.pickupLocation,
          },
          customerName,
          customerPhoneMasked,
          receiver,
        }
      : fallbackOrder;
    const orderNo = order.orderNo;
    const paidSession = {
      ...order.qrSession,
      status: "paid" as const,
      deliveryMethod: receiver.deliveryMethod,
      pickupLocation: order.qrSession.pickupLocation ?? session.pickupLocation,
    };
    const completedDate = localDateKeyFromIso(paidAt);
    const guestOrderUrl = orderShareUrl(orderNo);
    const shareMessage = completedOrderShareMessage(orderNo);
    const orderForStorage: LiveOrder = {
      ...order,
      qrSession: paidSession,
      status: "paid",
      guestOrderUrl,
      shareMessage,
    };
    const tabletSafeSummary = {
      order_no: orderNo,
      status: "paid",
      completed_at: paidAt,
      completed_date: completedDate,
      total_amount: paidSession.totalAmount,
      item_count: itemQuantity(paidSession.items),
      nursery_id: paidSession.nurseryId,
      room_id: paidSession.roomId,
      tablet_id: paidSession.tabletId,
      cart_id: paidSession.cartId,
      qr_session_id: paidSession.id,
      short_code: paidSession.shortCode,
    };

    const savedSession = writeJson(`${qrPrefix}${paidSession.shortCode}`, paidSession);
    const savedOrder = writeJson(`${orderPrefix}${orderNo}`, orderForStorage);
    const currentCart = readJson<CartLine[]>(currentCartKey(), []);
    const remainingCart = removePaidItemsFromCart(currentCart, paidSession.items);
    const remainingStored = persistCart(remainingCart).stored;

    if (!savedSession || !savedOrder || !remainingStored) {
      setMessage("주문을 브라우저 저장소에 저장하지 못했습니다. 브라우저 저장소 권한을 확인해 주세요.");
      return;
    }

    const hasRemaining = remainingCart.length > 0;
    setMessage(
      backend.ok
        ? hasRemaining
          ? "결제 완료. 남은 업체 상품은 장바구니에서 다음 QR로 생성할 수 있습니다."
          : "백엔드 결제 승인과 주문 저장을 완료했습니다."
        : hasRemaining
          ? `로컬 주문으로 진행합니다. 남은 업체 상품은 다음 QR로 생성할 수 있습니다. 백엔드 대기: ${backend.error}`
          : `로컬 주문으로 진행합니다. 백엔드 대기: ${backend.error}`,
    );
    router.push(`/orders/guest/live?orderNo=${orderNo}${hasRemaining ? "&remaining=1" : ""}`);

    void Promise.all([
      saveLiveShopDocument("qr_payment_sessions", paidSession.id, {
        ...paidSession,
        status: "paid",
        short_code: paidSession.shortCode,
        total_amount: paidSession.totalAmount,
        pickup_location: paidSession.pickupLocation,
        paid_at: paidAt,
        order_no: orderNo,
      }),
      saveLiveShopDocument("orders", orderNo, {
        order_no: orderNo,
        qr_session_id: paidSession.id,
        short_code: paidSession.shortCode,
        nursery_id: paidSession.nurseryId,
        room_id: paidSession.roomId,
        tablet_id: paidSession.tabletId,
        cart_id: paidSession.cartId,
        customer_name: order.customerName,
        customer_phone_masked: order.customerPhoneMasked,
        status: "paid",
        order_completed: true,
        completed_at: paidAt,
        completed_date: completedDate,
        delivery_method: receiver.deliveryMethod,
        receiver_address: receiver.address,
        receiver_address_detail: receiver.addressDetail,
        receiver: {
          name: customerName,
          phone_masked: customerPhoneMasked,
          delivery_method: receiver.deliveryMethod,
          address: receiver.address,
          address_detail: receiver.addressDetail,
        },
        pickup_location: paidSession.pickupLocation,
        total_amount: paidSession.totalAmount,
        item_count: tabletSafeSummary.item_count,
        items: paidSession.items,
        paid_at: paidAt,
        guest_order_url: guestOrderUrl,
        share_message: shareMessage,
        tablet_safe_summary: tabletSafeSummary,
        admin_data_provision_enabled: true,
        customer_order_share_enabled: true,
        notification_payload: {
          event: "order.payment_completed",
          order_no: orderNo,
          qr_session_id: paidSession.id,
          guest_order_url: guestOrderUrl,
          share_message: shareMessage,
          tablet_safe_summary: tabletSafeSummary,
        },
      }),
      ...paidSession.items.map((item, index) =>
        saveLiveShopDocument("order_items", `${orderNo}-${index + 1}`, {
          order_no: orderNo,
          order_id: orderNo,
          qr_session_id: paidSession.id,
          nursery_id: paidSession.nurseryId,
          room_id: paidSession.roomId,
          tablet_id: paidSession.tabletId,
          ...item,
          line_total: item.unitPrice * item.quantity,
        }),
      ),
    ]);
  }

  if (!session && isLoadingSession) {
    return (
      <main className="min-h-screen bg-[#f5f1eb] p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md bg-white p-5">
          <h1 className="text-2xl font-black">QR 정보를 불러오는 중입니다</h1>
          <p className="mt-2 text-sm font-bold text-slate-600">산후조리원 주소와 객실번호를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f5f1eb] p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md bg-white p-5">
          <h1 className="text-2xl font-black">QR 세션을 찾을 수 없습니다</h1>
          <Link href="/tablet/cart" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
            장바구니로 이동
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] px-4 py-5 text-slate-950">
      <section className="mx-auto max-w-md rounded-md bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase text-rose-600">live QR checkout</p>
        <h1 className="mt-2 text-3xl font-black">{session.shortCode}</h1>
        <p className="mt-2 text-sm text-slate-600">{COMPANY_GROUP_PURCHASE_MESSAGE}</p>
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-950">
          이 QR은 한 기업/MID 상품만 결제합니다. 결제 완료 후 남은 업체 상품은 장바구니에서 다음 QR로 생성됩니다.
        </div>
        <div className="mt-4 grid gap-3">
          {session.items.map((item) => (
            <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-slate-50 p-3">
              <p className="font-black">{item.productName}</p>
              <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
              <p className="mt-2 text-right font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
          <span className="font-black">총 결제금액</span>
          <strong className="text-2xl text-rose-600">{formatCurrency(session.totalAmount)}</strong>
        </div>
        <div className="mt-4">
          <QrReceiverForm session={session} onChange={setReceiver} />
        </div>
        <button
          type="button"
          onClick={() => void pay()}
          className="mt-5 w-full rounded-md bg-rose-600 px-4 py-4 text-base font-black text-white"
        >
          결제 완료 처리
        </button>
        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      </section>
    </main>
  );
}

export function LiveGuestOrderPage() {
  const params = useSearchParams();
  const orderNo = params.get("orderNo") ?? "";
  const remainingHint = params.get("remaining") === "1";
  const [order, setOrder] = useState<LiveOrder | null>(() => readLiveOrder(orderNo));
  const [shareFeedback, setShareFeedback] = useState("");
  const { items: remainingItems } = useCart([]);
  const remainingGroups = useMemo(() => groupCartItemsByCompany(remainingItems, mockCompanies), [remainingItems]);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      const localOrder = readLiveOrder(orderNo);
      if (localOrder) setOrder(localOrder);
    };

    async function syncRemoteOrder() {
      const remoteOrder = await readLiveShopOrderByOrderNo(orderNo);
      if (!remoteOrder || cancelled) return;

      const liveOrder = toLiveOrder(remoteOrder);
      writeJson(`${orderPrefix}${orderNo}`, liveOrder);
      setOrder(liveOrder);
    }

    sync();
    void syncRemoteOrder();

    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      cancelled = true;
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [orderNo]);

  async function shareOrder() {
    if (!order) return;

    const url = order.guestOrderUrl ?? orderShareUrl(order.orderNo);
    const text = order.shareMessage ?? completedOrderShareMessage(order.orderNo);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "주문내역 확인",
          text,
          url,
        });
        setShareFeedback("주문내역 공유창을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareFeedback("주문내역 확인 링크를 복사했습니다.");
    } catch {
      setShareFeedback("공유를 완료하지 못했습니다. 주문번호를 보관해 주세요.");
    }
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f5f1eb] p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md bg-white p-5">
          <h1 className="text-2xl font-black">주문을 찾을 수 없습니다</h1>
          <Link href="/orders/guest" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
            주문조회로 이동
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] px-4 py-5 text-slate-950">
      <section className="mx-auto max-w-md rounded-md bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase text-rose-600">live guest order</p>
        <h1 className="mt-2 text-3xl font-black">{order.orderNo}</h1>
        <p className="mt-2 text-sm text-slate-600">{order.customerName} / {order.customerPhoneMasked}</p>
        {order.receiver ? (
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">
            <p>{order.receiver.deliveryMethod === "pickup" ? "현장 받기" : "원하는 곳으로 받기"}</p>
            <p>{order.receiver.address}</p>
            {order.receiver.addressDetail ? <p>{order.receiver.addressDetail}</p> : null}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3">
          {order.qrSession.items.map((item) => (
            <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-slate-50 p-3">
              <p className="font-black">{item.productName}</p>
              <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
              <p className="mt-2 text-right font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
          <span className="font-black">결제금액</span>
          <strong className="text-2xl text-rose-600">{formatCurrency(order.qrSession.totalAmount)}</strong>
        </div>
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          주문 접수가 완료되었습니다. 주문번호로 배송 상태와 취소/환불 문의를 확인할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => void shareOrder()}
          className="mt-3 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          카카오톡 등으로 주문내역 공유
        </button>
        {shareFeedback ? <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">{shareFeedback}</p> : null}
        {remainingHint || remainingGroups.length > 0 ? (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
            <p className="font-black">{COMPANY_GROUP_PURCHASE_MESSAGE}</p>
            <p className="mt-1 font-bold">남은 업체 묶음 {remainingGroups.length}개는 장바구니에서 다음 결제 QR로 생성할 수 있습니다.</p>
            <Link href="/tablet/cart" className="mt-3 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
              남은 업체 결제 QR 생성
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function completedOrderTime(order: LiveShopCompletedOrder) {
  const date = new Date(order.completedAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function LiveTabletOrderHistoryPage() {
  const [dateKey, setDateKey] = useState(() => localDateKey());
  const [orders, setOrders] = useState<LiveShopCompletedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const totalAmount = orders.reduce((total, order) => total + order.totalAmount, 0);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      const tabletSession = readTabletRoomSession();
      if (!tabletSession) {
        if (!cancelled) {
          setOrders([]);
          setIsLoading(false);
          setMessage("객실 선택 후 주문 완료 내역을 조회할 수 있습니다.");
        }
        return;
      }

      setIsLoading(true);
      setMessage("");
      const completedOrders = await listLiveShopCompletedOrdersForRoom({
        nurseryId: tabletSession.nurseryId,
        roomId: tabletSession.roomId,
        date: dateKey,
      });

      if (!cancelled) {
        setOrders(completedOrders);
        setIsLoading(false);
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-white/25 bg-white/35 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">tablet order privacy</p>
            <h1 className="mt-2 text-3xl font-black">날짜별 주문 완료 내역</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">
              태블릿에는 결제 완료 여부, 주문번호, 시간, 금액, 수량만 표시합니다.
            </p>
          </div>
          <label className="grid gap-1 text-sm font-black text-slate-700">
            조회 날짜
            <input
              type="date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value || localDateKey())}
              className="rounded-md border border-white/50 bg-white/80 px-3 py-3 text-slate-950"
            />
          </label>
        </div>
      </div>

      <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm">
        <p className="text-sm font-black">개인정보 보호 표시 기준</p>
        <p className="mt-1 text-sm font-bold leading-6">
          고객 성명, 연락처, 주소, 상품명, 옵션명은 이 태블릿 주문내역에 표시하지 않습니다. 다음 고객이 같은 객실 태블릿을 볼 수 있기 때문입니다.
        </p>
      </section>

      {message ? <p className="rounded-md bg-amber-50 p-4 text-sm font-bold text-amber-900">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3">
          {isLoading ? (
            <div className="rounded-md bg-white/45 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
              <p className="text-lg font-black">주문 완료 내역을 불러오는 중입니다.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-md bg-white/45 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
              <p className="text-lg font-black">선택한 날짜에 표시할 주문 완료 내역이 없습니다.</p>
            </div>
          ) : (
            orders.map((order) => (
              <article key={order.orderNo} className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-500">주문번호</p>
                    <h2 className="mt-1 text-xl font-black">{order.orderNo}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">주문 완료</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
                  <div className="rounded-md bg-white/45 p-3">
                    <p className="text-xs text-slate-500">완료 시간</p>
                    <p className="mt-1 text-slate-950">{completedOrderTime(order)}</p>
                  </div>
                  <div className="rounded-md bg-white/45 p-3">
                    <p className="text-xs text-slate-500">상품 수량</p>
                    <p className="mt-1 text-slate-950">{order.itemCount}개</p>
                  </div>
                  <div className="rounded-md bg-white/45 p-3">
                    <p className="text-xs text-slate-500">결제 금액</p>
                    <p className="mt-1 text-rose-600">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="rounded-md bg-white/45 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
          <p className="text-sm font-black text-slate-500">{dateKey} 주문 완료</p>
          <p className="mt-2 text-3xl font-black">{orders.length}건</p>
          <div className="mt-4 flex justify-between text-sm font-bold">
            <span>결제 완료 합계</span>
            <strong className="text-rose-600">{formatCurrency(totalAmount)}</strong>
          </div>
          <Link href="/tablet/products" className="mt-5 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
            상품 보러가기
          </Link>
          <Link href="/tablet/cart" className="mt-2 block rounded-md bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-900">
            장바구니로 이동
          </Link>
        </aside>
      </div>
    </section>
  );
}
