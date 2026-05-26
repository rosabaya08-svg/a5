"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { readTabletRoomSession } from "@/components/tablet/TabletAccessFlow";
import { mockCompanies } from "@/data/mockCompanies";
import { approveBackendMockPayment, createBackendQrSession } from "@/lib/firebase/liveShopBackend";
import { saveLiveShopDocument } from "@/lib/firebase/liveShopRepository";
import {
  COMPANY_GROUP_PURCHASE_MESSAGE,
  groupCartItemsByCompany,
  removePaidItemsFromCart,
  type CompanyPaymentGroup,
} from "@/lib/payments/companyPaymentGroups";
import { formatCurrency } from "@/lib/utils/format";
import type { CartItemSnapshot, Product, ProductOption, QrPaymentSession } from "@/types/commerce";

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
  createdAt: string;
  paidAt: string;
  status: "paid" | "ready_for_pickup";
};

const cartKeyBase = "a5-live-cart";
const lastQrKeyBase = "a5-live-last-qr";
const qrPrefix = "a5-live-qr:";
const orderPrefix = "a5-live-order:";
const cartAddedEventName = "a5-cart-added";
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

function currentCartId(companyId?: string) {
  const scope = readTabletScope().replaceAll(":", "-");
  return companyId ? `cart:${scope}:${companyId}` : `cart:${scope}`;
}

function makeQrImageUrl(targetUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(targetUrl)}`;
}

function nowIso() {
  return new Date().toISOString();
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
  return code ? readJson<QrPaymentSession>(`${qrPrefix}${code}`, fallbackSession) : fallbackSession;
}

function readQrCheckoutSession(code: string) {
  return code ? readJson<QrPaymentSession | null>(`${qrPrefix}${code}`, null) : null;
}

function readLiveOrder(orderNo: string) {
  return orderNo ? readJson<LiveOrder | null>(`${orderPrefix}${orderNo}`, null) : null;
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

function groupStatusLabel(group: CompanyPaymentGroup) {
  if (group.paymentReady) return "결제 QR 생성 가능";
  if (group.merchantStatus === "in_review") return "MID 심사 중";
  if (group.merchantStatus === "blocked") return "MID 차단";
  return "MID 확인 필요";
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

  async function replace(next: CartLine[]) {
    setItems(next);
    await persistCart(next);
  }

  return { items, replace };
}

export function FloatingCartButton() {
  const pathname = usePathname();
  const { items } = useCart();
  const [isPopping, setIsPopping] = useState(false);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const normalizedPathname = pathname.replace(/\/$/, "");

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

    if (!group.paymentReady) {
      setMessage(`${group.companyName} MID가 운영 가능 상태가 아니라 결제 QR을 만들 수 없습니다.`);
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
    };

    const backend = await createBackendQrSession({
      cartId: session.cartId,
      nurseryId: session.nurseryId,
      roomId: session.roomId,
      tabletId: session.tabletId,
      deliveryMethod: session.deliveryMethod,
      items: session.items,
      totalAmountHint: session.totalAmount,
    });
    const liveSession = backend.ok ? backend.session : session;
    const savedSession = writeJson(`${qrPrefix}${liveSession.shortCode}`, liveSession);
    const savedPointer = writeText(currentLastQrKey(), liveSession.shortCode);

    if (!savedSession || !savedPointer) {
      setMessage("결제 진입 정보를 브라우저 저장소에 저장하지 못했습니다. 브라우저 저장소 권한을 확인해 주세요.");
      return;
    }

    setMessage(
      backend.ok
        ? `${group.companyName} 결제 QR을 생성했습니다. 결제 완료 후 남은 업체 QR을 이어서 만들 수 있습니다.`
        : `결제 진입을 생성하지 못했습니다: ${backend.error}. 잠시 후 다시 시도해 주세요.`,
    );
    window.location.assign(`/q/live?code=${encodeURIComponent(liveSession.shortCode)}`);

    if (!backend.ok) {
      void saveLiveShopDocument("qr_payment_sessions", liveSession.id, {
        ...liveSession,
        short_code: liveSession.shortCode,
        total_amount: liveSession.totalAmount,
        source: "local_fallback_only",
      });
    }
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
            <Link href="/tablet/products" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
              상품 보러가기
            </Link>
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
                <span className={`rounded-full px-3 py-1 text-xs font-black ${group.paymentReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
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
                  disabled={!group.paymentReady}
                  className="rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  이 업체 결제 QR 생성
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
        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      </aside>
    </section>
  );
}

export function LiveQrSessionPanel({ fallbackSession }: { fallbackSession: QrPaymentSession }) {
  const [session, setSession] = useState<QrPaymentSession>(() => readLastQrSession(fallbackSession));
  const [origin, setOrigin] = useState("");
  const sessionGroup = groupCartItemsByCompany(session.items, mockCompanies)[0];
  const checkoutUrl = `${origin || "https://a5-closed-mall.pages.dev"}/q/live?code=${encodeURIComponent(session.shortCode)}`;

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
      </div>
    </section>
  );
}

export function LiveQrCheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const [session, setSession] = useState<QrPaymentSession | null>(() => readQrCheckoutSession(code));
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () => setSession(readQrCheckoutSession(code));

    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [code]);

  async function pay() {
    if (!session) return;

    const backend = await approveBackendMockPayment({
      shortCode: session.shortCode,
      customerName: "비회원 고객",
      customerPhoneMasked: "010-****-0000",
    });
    const paidAt = nowIso();
    const fallbackPaidSession: QrPaymentSession = { ...session, status: "paid" };
    const fallbackOrder: LiveOrder = {
      orderNo: makeOrderNo(),
      qrSession: fallbackPaidSession,
      customerName: "비회원 고객",
      customerPhoneMasked: "010-****-0000",
      createdAt: paidAt,
      paidAt,
      status: "paid",
    };
    const order: LiveOrder = backend.ok ? backend.order : fallbackOrder;
    const orderNo = order.orderNo;
    const paidSession = order.qrSession;

    const savedSession = writeJson(`${qrPrefix}${paidSession.shortCode}`, paidSession);
    const savedOrder = writeJson(`${orderPrefix}${orderNo}`, order);
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
        short_code: paidSession.shortCode,
        total_amount: paidSession.totalAmount,
      }),
      saveLiveShopDocument("orders", orderNo, {
        order_no: orderNo,
        qr_session_id: paidSession.id,
        short_code: paidSession.shortCode,
        customer_name: order.customerName,
        customer_phone_masked: order.customerPhoneMasked,
        status: order.status,
        total_amount: paidSession.totalAmount,
        items: paidSession.items,
        paid_at: paidAt,
      }),
      ...paidSession.items.map((item, index) =>
        saveLiveShopDocument("order_items", `${orderNo}-${index + 1}`, {
          order_no: orderNo,
          ...item,
          line_total: item.unitPrice * item.quantity,
        }),
      ),
    ]);
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
  const { items: remainingItems } = useCart([]);
  const remainingGroups = useMemo(() => groupCartItemsByCompany(remainingItems, mockCompanies), [remainingItems]);

  useEffect(() => {
    const sync = () => setOrder(readLiveOrder(orderNo));

    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [orderNo]);

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
