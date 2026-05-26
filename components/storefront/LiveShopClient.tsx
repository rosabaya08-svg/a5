"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { approveBackendMockPayment, createBackendQrSession } from "@/lib/firebase/liveShopBackend";
import { saveLiveShopDocument } from "@/lib/firebase/liveShopRepository";
import { formatCurrency } from "@/lib/utils/format";
import type { CartItemSnapshot, Product, ProductOption, QrPaymentSession } from "@/types/commerce";

type CartLine = CartItemSnapshot & {
  productImage?: string;
  productId: string;
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

const cartKey = "a5-live-cart";
const lastQrKey = "a5-live-last-qr";
const qrPrefix = "a5-live-qr:";
const orderPrefix = "a5-live-order:";
const memoryStore = new Map<string, string>();

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
  const code = readText(lastQrKey);
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
  const stored = writeJson(cartKey, items);
  void saveLiveShopDocument("carts", "tablet-active-cart", {
    cart_id: "tablet-active-cart",
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
      const stored = readJson<CartLine[]>(cartKey, []);
      if (stored.length > 0) {
        setItems(stored);
        return;
      }

      setItems(fallback);
      if (fallback.length > 0) {
        writeJson(cartKey, fallback);
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

export function CartStatusBadge() {
  const { items } = useCart();
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <button
      type="button"
      onClick={() => {
        window.location.assign("/tablet/cart");
      }}
      className="rounded-full bg-rose-600 px-5 py-3 text-base font-black text-white shadow-lg shadow-rose-600/20 ring-2 ring-rose-100/70"
    >
      장바구니 {count}
    </button>
  );
}

export function AddToCartPanel({ product, options }: { product: Product; options: ProductOption[] }) {
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id ?? "default");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const selected = options.find((option) => option.id === selectedOptionId);
  const unitPrice = product.price + (selected?.priceDelta ?? 0);

  async function addToCart(goCart: boolean) {
    const current = readJson<CartLine[]>(cartKey, []);
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
    setMessage(result.stored ? "장바구니에 담았습니다. 상단 장바구니 수량과 장바구니 화면에 바로 반영됩니다." : "장바구니 메모리에 반영했습니다. 브라우저 저장소 권한은 확인이 필요합니다.");

    if (goCart) {
      window.location.assign("/tablet/cart");
    }
  }

  return (
    <section className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">실제 장바구니 동작</p>
          <h3 className="mt-1 text-lg font-black">옵션 선택 후 담기</h3>
        </div>
        <CartStatusBadge />
      </div>
      <div className="mt-3 grid gap-3">
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
                  {option.name} / {formatCurrency(product.price + option.priceDelta)} / 재고 {option.stock}
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
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void addToCart(false)}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white"
          >
            장바구니 담기
          </button>
          <button
            type="button"
            onClick={() => void addToCart(true)}
            className="rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white"
          >
            담고 장바구니 이동
          </button>
        </div>
        {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      </div>
    </section>
  );
}

export function LiveCartPage({ fallbackItems }: { fallbackItems: CartItemSnapshot[] }) {
  const { items, replace } = useCart(fallbackItems);
  const [message, setMessage] = useState("");
  const total = cartTotal(items);

  async function setQuantity(index: number, quantity: number) {
    const next = items
      .map((item, itemIndex) => (itemIndex === index ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    await replace(next);
  }

  async function createQr() {
    if (items.length === 0) {
      setMessage("장바구니가 비어 있습니다.");
      return;
    }

    const code = makeShortCode();
    const createdAt = nowIso();
    const expiresAt = addHoursIso(createdAt, 3);
    const session: QrPaymentSession = {
      id: `qr-${code}`,
      shortCode: code,
      type: "purchase",
      status: "active",
      nurseryId: "nursery-gangnam-01",
      roomId: "room-701",
      tabletId: "tablet-701-a",
      cartId: "tablet-active-cart",
      createdAt,
      expiresAt,
      deliveryMethod: "pickup",
      totalAmount: total,
      items: items.map(toSnapshot),
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
    const savedPointer = writeText(lastQrKey, liveSession.shortCode);

    if (!savedSession || !savedPointer) {
      setMessage("결제 진입 정보를 브라우저 저장소에 저장하지 못했습니다. 브라우저 저장소 권한을 확인해 주세요.");
      return;
    }

    setMessage(backend.ok ? "고객 휴대폰 결제 화면을 열었습니다." : `서버 결제 진입 생성 실패: ${backend.error}. 개발용 로컬 결제 화면으로 이동합니다.`);
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
        {items.length === 0 ? (
          <div className="rounded-md bg-white/45 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
            <h2 className="text-xl font-black">장바구니가 비었습니다</h2>
            <Link href="/tablet/products" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
              상품 보러가기
            </Link>
          </div>
        ) : (
          items.map((item, index) => (
            <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-xs font-black text-rose-600">{item.companyId}</p>
                  <h3 className="mt-1 text-lg font-black">{item.productName}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.optionName}</p>
                  <div className="mt-3 inline-flex overflow-hidden rounded-md border border-slate-200">
                    <button type="button" onClick={() => void setQuantity(index, item.quantity - 1)} className="px-3 py-2 font-black">
                      -
                    </button>
                    <span className="bg-slate-50 px-4 py-2 font-black">{item.quantity}</span>
                    <button type="button" onClick={() => void setQuantity(index, item.quantity + 1)} className="px-3 py-2 font-black">
                      +
                    </button>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} / 개</p>
                  <p className="mt-1 text-xl font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  <button
                    type="button"
                    onClick={() => void setQuantity(index, 0)}
                    className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                  >
                    삭제
                  </button>
                </div>
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
          <div className="flex justify-between text-lg">
            <span className="font-black">합계</span>
            <strong className="text-rose-600">{formatCurrency(total)}</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createQr()}
          className="mt-5 w-full rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white"
        >
          고객 휴대폰 결제 열기
        </button>
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

  useEffect(() => {
    const sync = () => setSession(readLastQrSession(fallbackSession));

    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [fallbackSession]);

  return (
    <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[420px_1fr]">
      <div className="rounded-md bg-white/45 p-6 text-center text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="mx-auto grid h-72 w-72 place-items-center rounded-md border-[14px] border-slate-950 bg-slate-100">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">short code</p>
            <p className="mt-2 text-4xl font-black">{session.shortCode}</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-bold text-rose-600">만료 {new Date(session.expiresAt).toLocaleString("ko-KR")}</p>
        <Link href={`/q/live?code=${encodeURIComponent(session.shortCode)}`} className="mt-4 inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white">
          고객 모바일 화면 열기
        </Link>
      </div>
      <div className="grid gap-3">
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

    if (!savedSession || !savedOrder) {
      setMessage("주문을 브라우저 저장소에 저장하지 못했습니다. 브라우저 저장소 권한을 확인해 주세요.");
      return;
    }

    setMessage(backend.ok ? "백엔드 결제 승인과 주문 저장을 완료했습니다." : `로컬 주문으로 진행합니다. 백엔드 대기: ${backend.error}`);
    router.push(`/orders/guest/live?orderNo=${orderNo}`);

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
        <p className="mt-2 text-sm text-slate-600">브라우저 저장소와 Firebase에 저장되는 실제 주문 생성 흐름입니다.</p>
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
  const [order, setOrder] = useState<LiveOrder | null>(() => readLiveOrder(orderNo));

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
          주문 생성 완료. Firebase env가 있으면 Firestore `orders`, `order_items`에도 저장됩니다.
        </p>
      </section>
    </main>
  );
}
