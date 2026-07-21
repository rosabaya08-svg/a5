"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PgReturnConfirmClient } from "@/components/guest/PgReturnConfirmClient";
import { ServerCheckoutFlow } from "@/components/guest/ServerCheckoutFlow";
import { ClosedMallRuntimeAds } from "@/components/storefront/ClosedMallRuntimeAds";
import { ProductDetailTabs } from "@/components/storefront/ProductDetailTabs";
import { TabletHomeRuntimeSections } from "@/components/storefront/TabletHomeRuntimeSections";
import {
  QrReceiverForm,
  initialQrReceiverFormValue,
  type QrReceiverFormValue,
} from "@/components/storefront/QrReceiverForm";
import { readTabletRoomSession, saveTabletRoomSession } from "@/components/tablet/TabletAccessFlow";
import {
  claimBackendGuestShopSession,
  createBackendQrSession,
  readBackendCompanies,
  readBackendGuestShopCart,
  readBackendGuestShopProductDetail,
  readBackendGuestShopProducts,
  readBackendGuestShopSession,
  readBackendQrSessionByShortCode,
  readBackendTabletPaymentCompletion,
  type TabletPaymentCompletionResponse,
  saveBackendGuestShopCart,
} from "@/lib/firebase/liveShopBackend";
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
import { resolvePaymentCompanyId } from "@/lib/payments/paymentCatalogOwners";
import { resolveQrPickupLocation, withResolvedQrPickupLocation } from "@/lib/qr/pickupLocation";
import { brandIdForProductBrand, productBrandName } from "@/lib/storefront/brandRouting";
import { categoryLabelForRouteId, categoryMobilePathFromLabel } from "@/lib/storefront/categoryRouting";
import {
  REGISTERED_CLOSED_MALL_BUSINESS_NO,
  mergeSharedClosedMallProducts,
  normalizeSharedClosedMallProducts,
} from "@/lib/storefront/sharedClosedMallCatalog";
import { hasMobilePreviewAccess } from "@/lib/storefront/mobilePreviewAccess";
import { productMobilePath } from "@/lib/storefront/productUrls";
import { formatCurrency } from "@/lib/utils/format";
import type { StorefrontContent } from "@/lib/repositories/types";
import type { CartItemSnapshot, Company, Product, ProductOption, QrPaymentSession, QrPickupLocation } from "@/types/commerce";

type CartLine = CartItemSnapshot & {
  productImage?: string;
  productId: string;
};

type IndexedCartLine = CartLine & {
  cartIndex: number;
};

type GuestShopEntryTokenPayload = {
  token: string;
  expiresAt: number;
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
const mobilePreviewSessionId = "dev-mobile-preview";
const cartAddedEventName = "a5-cart-added";
const defaultA5PublicOrigin = "https://a5-closed-mall.pages.dev";
const configuredA5PublicOrigin = (process.env.NEXT_PUBLIC_A5_PUBLIC_BASE_URL || defaultA5PublicOrigin).replace(/\/$/, "");
const qrSessionLookupTimeoutMs = 8000;
const guestShopFallbackAccessMs = 3 * 60 * 60 * 1000;
const memoryStore = new Map<string, string>();
const blockedMockCartProductIds = new Set([
  "product-care-kit",
  "product-pillow",
  "product-bag",
  "product-robe",
  "product-tea",
  "product-snack",
  "product-blanket",
]);
const emptyCartSnapshotItems: CartItemSnapshot[] = [];

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

function addHoursIso(baseIso: string, hours: number) {
  return new Date(new Date(baseIso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function makeShortCode() {
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `A5${stamp}${random}`;
}

function readLastQrSession() {
  const code = readText(currentLastQrKey());
  const session = code ? readJson<QrPaymentSession | null>(`${qrPrefix}${code}`, null) : null;
  return session ? withResolvedQrPickupLocation(session) : null;
}

function readQrCheckoutSession(code: string) {
  const session = code ? readJson<QrPaymentSession | null>(`${qrPrefix}${code}`, null) : null;
  return session ? withResolvedQrPickupLocation(session) : null;
}

async function readLiveShopQrSessionByShortCodeWithTimeout(code: string) {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      readQrSessionFromBackendOrFirestore(code),
      new Promise<null>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(null), qrSessionLookupTimeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

async function readQrSessionFromBackendOrFirestore(code: string) {
  const backend = await readBackendQrSessionByShortCode(code);
  if (backend.ok) return backend.session;
  return readLiveShopQrSessionByShortCode(code);
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
      item.sellerCompanyId === other.sellerCompanyId &&
      item.sellerBusinessNoNormalized === other.sellerBusinessNoNormalized &&
      item.quantity === other.quantity &&
      item.unitPrice === other.unitPrice
    );
  });
}

function withoutBlockedMockCartItems<T extends { productId: string }>(items: T[]) {
  return items.filter((item) => !blockedMockCartProductIds.has(item.productId));
}

function orderShareUrl(orderNo: string) {
  const path = `/orders/guest/live?orderNo=${encodeURIComponent(orderNo)}`;
  return `${resolveA5PublicOrigin(typeof window === "undefined" ? "" : window.location.origin)}${path}`;
}

function completedOrderShareMessage(orderNo: string) {
  return `주문내역 확인: ${orderNo}`;
}

function formatOrderDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function orderReceiveLocation(order: LiveOrder) {
  if (order.receiver?.address) {
    return [order.receiver.address, order.receiver.addressDetail].filter(Boolean).join(" ");
  }

  const pickup = order.qrSession.pickupLocation;
  if (pickup) {
    return [pickup.nurseryName, pickup.nurseryAddress, pickup.roomName].filter(Boolean).join(" / ");
  }

  return order.qrSession.deliveryMethod === "delivery" ? "배송 위치 확인 필요" : "현장 수령 위치 확인 필요";
}

function sellerContactsForOrder(order: LiveOrder, companies: Company[]) {
  const companyIds = [...new Set(order.qrSession.items.map((item) => item.companyId).filter(Boolean))];

  return companyIds.map((companyId) => {
    const company = companies.find((item) => item.id === companyId);

    return {
      companyId,
      companyName: company?.name ?? companyId,
      managerName: company?.managerName ?? "담당자 등록 대기",
      phone: company?.publicContactPhone ?? "연락처 등록 대기",
      kakaoChannel: company?.publicKakaoChannel,
      email: company?.publicEmail,
    };
  });
}

function normalizeLiveCompanies(liveCompanies: Company[]) {
  return liveCompanies.map((company) =>
    company.id === "company-test-1004"
      ? { ...company, name: REGISTERED_CLOSED_MALL_BUSINESS_NO, managerName: REGISTERED_CLOSED_MALL_BUSINESS_NO }
      : company,
  );
}

function useLiveCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      const result = await readBackendCompanies();
      if (cancelled || !result.ok || result.data.companies.length === 0) return;
      setCompanies(normalizeLiveCompanies(result.data.companies));
    }

    void loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  return companies;
}

function resolveA5PublicOrigin(origin: string) {
  const normalizedOrigin = origin.replace(/\/$/, "");
  if (normalizedOrigin.startsWith("http://localhost") || normalizedOrigin.startsWith("http://127.0.0.1")) {
    return normalizedOrigin;
  }

  return configuredA5PublicOrigin || normalizedOrigin || defaultA5PublicOrigin;
}

function readBrowserSearchParams() {
  return typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
}

function readLiveCheckoutQuery() {
  const params = readBrowserSearchParams();
  const paymentResult = params.get("paymentResult") ?? "";

  return {
    code: params.get("code") ?? "",
    sessionId: params.get("sessionId") ?? params.get("guestShopSessionId") ?? "",
    paymentResult,
    orderNo: params.get("orderNo") ?? params.get("order_no") ?? params.get("orderId") ?? "",
    hasPgReturnParams: Boolean(
      paymentResult ||
        params.get("paymentIntentId") ||
        params.get("payment_intent_id") ||
        params.get("orderNo") ||
        params.get("orderId") ||
        params.get("order_no") ||
        params.get("paymentKey") ||
        params.get("payment_key") ||
        params.get("transactionId") ||
        params.get("transaction_id") ||
        params.get("tid"),
    ),
  };
}

function readLiveGuestOrderQuery() {
  const params = readBrowserSearchParams();

  return {
    orderNo: params.get("orderNo") ?? "",
    remainingHint: params.get("remaining") === "1",
  };
}

function readMobileShopQuery(pathname = "") {
  const params = readBrowserSearchParams();
  const normalizedPathname = pathname.replace(/\/$/, "");
  const pathProductMatch = normalizedPathname.match(/\/m\/shop\/product\/([^/]+)$/);
  const pathProductId = pathProductMatch?.[1] ? decodeURIComponent(pathProductMatch[1]) : "";
  const pathBrandMatch = normalizedPathname.match(/\/m\/shop\/brand\/([^/]+)$/);
  const pathBrandId = pathBrandMatch?.[1] ? decodeURIComponent(pathBrandMatch[1]) : "";
  const pathCategoryMatch = normalizedPathname.match(/\/m\/shop\/categories\/([^/]+)$/);
  const pathCategoryId = pathCategoryMatch?.[1] ? decodeURIComponent(pathCategoryMatch[1]) : "";
  const requestedSessionId = params.get("sessionId") ?? params.get("guestShopSessionId") ?? "";
  const pathView = normalizedPathname.endsWith("/checkout")
    ? "checkout"
    : normalizedPathname.endsWith("/cart")
      ? "cart"
      : normalizedPathname.endsWith("/product") || Boolean(pathProductId)
        ? "product"
        : "browse";

  return {
    sessionId: requestedSessionId,
    productId: params.get("productId") ?? pathProductId,
    brandId: params.get("brandId") ?? pathBrandId,
    categoryId: params.get("categoryId") ?? pathCategoryId,
    view: params.get("view") || pathView,
  };
}

function mobileCartKey(sessionId: string) {
  return `a5-mobile-cart:${sessionId}`;
}

function guestShopEntryTokenKey(sessionId: string) {
  return `a5-guest-shop-entry:${sessionId}`;
}

function readGuestShopEntryToken(sessionId: string) {
  if (typeof window === "undefined" || !sessionId) return "";
  const key = guestShopEntryTokenKey(sessionId);
  const sessionToken = window.sessionStorage.getItem(key) ?? "";
  if (sessionToken) return sessionToken;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return "";

    const parsed = JSON.parse(raw) as Partial<GuestShopEntryTokenPayload>;
    if (!parsed.token || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(key);
      return "";
    }

    window.sessionStorage.setItem(key, parsed.token);
    return parsed.token;
  } catch {
    window.localStorage.removeItem(key);
    return "";
  }
}

function writeGuestShopEntryToken(sessionId: string, token: string, expiresAt?: string) {
  if (typeof window === "undefined" || !sessionId || !token) return;
  const key = guestShopEntryTokenKey(sessionId);
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : Date.now() + guestShopFallbackAccessMs;
  window.sessionStorage.setItem(key, token);
  window.localStorage.setItem(
    key,
    JSON.stringify({
      token,
      expiresAt: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + guestShopFallbackAccessMs,
    } satisfies GuestShopEntryTokenPayload),
  );
}

const qrDisplayExpiredGuestShopMessage = "결제 QR 유효시간이 만료되었습니다. 태블릿에서 결제 QR을 새로 생성한 뒤 5분 안에 다시 스캔해 주세요.";

function guestShopAccessMessage(error: string) {
  if (error.includes("QR_DISPLAY_EXPIRED")) return qrDisplayExpiredGuestShopMessage;
  if (error.includes("GUEST_SHOP_SESSION_EXPIRED")) return "입장시간이 만료 됐습니다. 사이니지를 통해서 상품 이어서 봐주세요.";
  if (error.includes("GUEST_SHOP_ENTRY_TOKEN") || error.includes("GUEST_SHOP_SESSION_NOT_FOUND")) return "입장권한이 없습니다.";
  return error || "입장권한이 없습니다.";
}

function mobileHref(path: string, sessionId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ sessionId, ...(extra ?? {}) });
  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  return `${normalizedPath}?${params.toString()}`;
}

function mobileProductHref(product: Product, sessionId: string) {
  return mobileHref(productMobilePath(product), sessionId);
}

function mobileBrandRouteId(product: Product) {
  const companyId = product.id === "product-test-1004" ? REGISTERED_CLOSED_MALL_BUSINESS_NO : product.companyId;
  return brandIdForProductBrand(productBrandName(product), companyId);
}

function mobileCartTotal(items: CartItemSnapshot[]) {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

function mobileDiscountRate(product: Product) {
  if (product.priceComparisonVerified !== true) return 0;
  const listPrice = product.comparison?.listPrice ?? 0;
  const closedMallPrice = product.comparison?.closedMallPrice ?? product.price;
  if (!(listPrice > closedMallPrice && closedMallPrice > 0)) return 0;
  return Math.max(0, Math.round(((listPrice - closedMallPrice) / listPrice) * 100));
}

function mobileFulfillmentLabel(product: Product) {
  const delivery = product.fulfillment?.delivery;
  const pickup = product.fulfillment?.pickup;

  if (delivery && pickup) return "현장수령 + 택배";
  if (pickup) return "현장수령";
  if (delivery) return "택배배송";
  return "수령정책 확인";
}

function mobileStockLabel(product: Product) {
  if (product.stock <= 0) return "품절";
  if (product.stock <= 5) return `잔여 ${product.stock}개`;
  return "재고 여유";
}

function sellerCartFields(product: Product, companyId: string) {
  return {
    sellerCompanyId: product.sellerCompanyId ?? companyId,
    sellerBusinessNo: product.sellerBusinessNo,
    sellerBusinessNoNormalized: product.sellerBusinessNoNormalized ?? product.sellerBusinessNo,
    sellerCompanyName: product.sellerCompanyName ?? product.brand,
    shippingFeePolicy: product.shippingFeePolicy,
  };
}

function isMobilePreviewSessionId(sessionId: string) {
  if (sessionId.trim() !== mobilePreviewSessionId) return false;
  return hasMobilePreviewAccess();
}

function mobilePreviewCartItems(products: Product[] = []): CartLine[] {
  return normalizeSharedClosedMallProducts(products)
    .slice(0, 1)
    .map((product) => {
      const companyId = resolvePaymentCompanyId(product.id, product.companyId);
      return {
        productId: product.id,
        optionId: product.optionIds[0],
        productName: product.name,
        optionName: "기본 옵션",
        unitPrice: product.price,
        quantity: 1,
        companyId,
        ...sellerCartFields(product, companyId),
        productImage: product.imageUrl,
      };
    });
}

function createMobilePreviewSession(products?: Product[]): QrPaymentSession & { guestShopSessionId: string } {
  const now = new Date();
  const items = mobilePreviewCartItems(products);

  return {
    id: "qr-dev-mobile-preview",
    shortCode: "PREVIEW",
    type: "purchase",
    status: "active",
    nurseryId: "nursery-preview",
    roomId: "room-preview",
    tabletId: "tablet-preview",
    cartId: `mobile-cart:${mobilePreviewSessionId}`,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    qrDisplayExpiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    deliveryMethod: "pickup",
    totalAmount: mobileCartTotal(items),
    items,
    pickupLocation: {
      nurseryName: "A5 개발자 미리보기",
      nurseryAddress: "모바일 전용 페이지 검수용 위치",
      roomId: "room-preview",
      roomName: "Preview Room",
    },
    guestShopSessionId: mobilePreviewSessionId,
  };
}

function groupStatusLabel(group: CompanyPaymentGroup) {
  if (group.paymentReady) return "QR 결제 가능";
  if (group.merchantStatus === "in_review") return "결제 설정 확인 중";
  if (group.merchantStatus === "blocked") return "결제 제한";
  return "서버 PG 확인";
}

function toSnapshot(item: CartLine): CartItemSnapshot {
  const companyId = resolvePaymentCompanyId(item.productId, item.sellerCompanyId ?? item.companyId);
  return {
    productId: item.productId,
    optionId: item.optionId,
    productName: item.productName,
    optionName: item.optionName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    companyId,
    sellerCompanyId: item.sellerCompanyId ?? companyId,
    sellerBusinessNo: item.sellerBusinessNo,
    sellerBusinessNoNormalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo,
    sellerCompanyName: item.sellerCompanyName,
    shippingFeePolicy: item.shippingFeePolicy,
  };
}

function normalizeCartPaymentOwners<T extends CartItemSnapshot>(items: T[]): T[] {
  return items.map((item) => {
    const companyId = resolvePaymentCompanyId(item.productId, item.sellerCompanyId ?? item.companyId);

    return {
      ...item,
      companyId,
      sellerCompanyId: item.sellerCompanyId ?? companyId,
      sellerBusinessNoNormalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo,
    };
  });
}

const qrCatalogRejectCodes = new Set(["PRODUCT_NOT_FOUND", "PRODUCT_NOT_ACTIVE", "OPTION_NOT_FOUND"]);

function asQrErrorRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function qrRejectedCartTarget(code: string | undefined, details: unknown) {
  if (!code || !qrCatalogRejectCodes.has(code)) return null;

  const record = asQrErrorRecord(details);
  const productId = typeof record.productId === "string" ? record.productId.trim() : "";
  const optionId = typeof record.optionId === "string" ? record.optionId.trim() : "";

  return productId ? { productId, optionId } : null;
}

function removeRejectedCartTarget<T extends CartItemSnapshot>(items: T[], target: { productId: string; optionId?: string }) {
  return items.filter((item) => {
    if (item.productId !== target.productId) return true;
    if (!target.optionId) return false;
    return item.optionId !== target.optionId;
  });
}

function qrRejectedCartMessage(target: { productId: string; optionId?: string }, error: string) {
  const optionLabel = target.optionId ? ` / ${target.optionId}` : "";
  return `QR 생성 실패 품목을 장바구니에서 제외했습니다. 상품을 다시 담아 결제 QR을 생성해 주세요. (${target.productId}${optionLabel}) ${error}`;
}

function persistCart(items: CartLine[]) {
  const normalizedItems = normalizeCartPaymentOwners(items);
  const tabletSession = readTabletRoomSession();
  const cartId = currentCartId();
  const stored = writeJson(currentCartKey(), normalizedItems);
  void saveLiveShopDocument("carts", cartId, {
    cart_id: cartId,
    nursery_id: tabletSession?.nurseryId,
    room_id: tabletSession?.roomId,
    tablet_id: tabletSession?.tabletId,
    items: normalizedItems.map(toSnapshot),
    total_amount: cartTotal(normalizedItems),
    source: "tablet",
    status: "active",
  });

  return { stored };
}

async function readTabletCompletionForSession(
  session: QrPaymentSession,
): Promise<TabletPaymentCompletionResponse | null> {
  const tabletSession = readTabletRoomSession();
  if (!tabletSession) return null;

  if (session.completionToken) {
    const protectedResult = await readBackendTabletPaymentCompletion({
      qrSessionId: session.id,
      shortCode: session.shortCode,
      completionToken: session.completionToken,
      nurseryId: tabletSession.nurseryId,
      roomId: tabletSession.roomId,
      tabletId: tabletSession.tabletId,
    });

    if (protectedResult.ok) return protectedResult.data;
    if (protectedResult.code !== "TABLET_COMPLETION_TOKEN_UNAVAILABLE") return null;
  }

  const legacyResult = await readBackendQrSessionByShortCode(session.shortCode);
  if (!legacyResult.ok) return null;

  return {
    ok: true,
    qrSessionId: legacyResult.session.id,
    shortCode: legacyResult.session.shortCode,
    status: legacyResult.session.status,
    totalAmount: legacyResult.session.totalAmount,
    items: legacyResult.session.items,
    source: "firebase_functions_tablet_payment_completion",
  };
}

function useCompletedOrderCartSync({
  enabled,
  replace,
  onSynced,
  onPaid,
}: {
  enabled: boolean;
  replace: (next: CartLine[]) => Promise<void>;
  onSynced?: () => void;
  onPaid?: (completion: TabletPaymentCompletionResponse) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let notifiedPaid = false;

    async function syncCompletedQr() {
      const session = readLastQrSession();
      if (!session) return;

      const completion = await readTabletCompletionForSession(session);
      if (cancelled || !completion || completion.status !== "paid") return;

      writeJson(`${qrPrefix}${session.shortCode}`, { ...session, status: "paid" });

      const receiptId = `qr:${completion.qrSessionId || session.id}`;
      const syncedReceipts = new Set(readJson<string[]>(currentCompletedOrderSyncKey(), []));
      if (!syncedReceipts.has(receiptId)) {
        const currentCart = readJson<CartLine[]>(currentCartKey(), []);
        const paidItems = completion.items.length > 0 ? completion.items : session.items;
        const remainingCart = removePaidItemsFromCart(currentCart, paidItems);
        const cartChanged = !cartItemsEqual(currentCart, remainingCart);

        if (cartChanged) {
          await replace(remainingCart);
          if (cancelled) return;
          onSynced?.();
        }

        writeJson(currentCompletedOrderSyncKey(), [...syncedReceipts, receiptId]);
      }

      if (!notifiedPaid) {
        notifiedPaid = true;
        onPaid?.(completion);
      }
    }

    void syncCompletedQr();
    const interval = window.setInterval(() => void syncCompletedQr(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, onPaid, onSynced, replace]);
}

function useCart(fallbackItems?: CartItemSnapshot[]) {
  const fallbackSource = fallbackItems ?? emptyCartSnapshotItems;
  const fallback = useMemo<CartLine[]>(
    () =>
      normalizeCartPaymentOwners(
        fallbackSource.map((item) => ({
          ...item,
          productId: item.productId,
        })),
      ).filter((item) => !blockedMockCartProductIds.has(item.productId)),
    [fallbackSource],
  );
  const [items, setItems] = useState<CartLine[]>(fallback);

  useEffect(() => {
    const sync = () => {
      const stored = readJson<CartLine[]>(currentCartKey(), []);
      if (stored.length > 0) {
        const normalizedStored = withoutBlockedMockCartItems(normalizeCartPaymentOwners(stored));
        setItems((current) => (cartItemsEqual(current, normalizedStored) ? current : normalizedStored));
        if (!cartItemsEqual(stored, normalizedStored)) {
          writeJson(currentCartKey(), normalizedStored);
        }
        return;
      }

      setItems((current) => (cartItemsEqual(current, fallback) ? current : fallback));
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
    const normalizedNext = withoutBlockedMockCartItems(normalizeCartPaymentOwners(next));
    setItems(normalizedNext);
    await persistCart(normalizedNext);
  }, []);

  return { items, replace };
}

export function FloatingCartButton() {
  const pathname = usePathname() ?? "";
  const { items, replace } = useCart();
  const [isPopping, setIsPopping] = useState(false);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const normalizedPathname = pathname.replace(/\/$/, "");

  useCompletedOrderCartSync({
    enabled: normalizedPathname !== "/tablet/cart" && normalizedPathname !== "/tablet/qr",
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
        <span className="text-lg font-normal leading-none">장바구니 {count}</span>
      </button>
    </nav>
  );
}

export function AddToCartPanel({ product, options }: { product: Product; options: ProductOption[] }) {
  const firstAvailableOption = options.find((option) => option.stock > 0);
  const [selectedOptionId, setSelectedOptionId] = useState(firstAvailableOption?.id ?? options[0]?.id ?? "default");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const addTimerRef = useRef<number | undefined>(undefined);
  const addFrameRef = useRef<number | undefined>(undefined);
  const selected = options.find((option) => option.id === selectedOptionId);
  const unitPrice = product.price + (selected?.priceDelta ?? 0);
  const availableStock = selected ? selected.stock : product.stock;
  const soldOut = availableStock <= 0;

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
    if (soldOut) {
      setMessage("품절된 상품은 장바구니에 담을 수 없습니다.");
      return;
    }

    const current = readJson<CartLine[]>(currentCartKey(), []);
    const optionName = selected?.name ?? "기본 옵션";
    const companyId = resolvePaymentCompanyId(product.id, product.companyId);
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
            companyId,
            ...sellerCartFields(product, companyId),
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
        <label className="grid gap-1 text-sm font-normal">
          옵션
          <select
            value={selectedOptionId}
            onChange={(event) => setSelectedOptionId(event.target.value)}
            className="rounded-md border border-slate-200 px-3 py-3"
          >
            {options.length > 0 ? (
              options.map((option) => (
                <option key={option.id} value={option.id} disabled={option.stock <= 0}>
                  {option.name} / {formatCurrency(product.price + option.priceDelta)}{option.stock <= 0 ? " / 품절" : ""}
                </option>
              ))
            ) : (
              <option value="default">기본 옵션 / {formatCurrency(product.price)}</option>
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-normal">
          수량
          <input
            type="number"
            min={1}
            max={Math.max(1, Math.min(99, availableStock))}
            value={quantity}
            onChange={(event) => setQuantity(Math.min(Math.max(1, Number(event.target.value) || 1), Math.max(1, availableStock)))}
            disabled={soldOut}
            className="rounded-md border border-slate-200 px-3 py-3"
          />
        </label>
        <div className="rounded-md bg-white/35 p-3 text-sm">
          <span className="text-slate-500">선택 금액</span>
          <span className="ml-2 text-xl text-rose-600">{formatCurrency(unitPrice * quantity)}</span>
        </div>
        <button
          type="button"
          onClick={() => void addToCart()}
          disabled={soldOut}
          className={`grid min-h-12 place-items-center overflow-hidden px-4 py-3 text-sm font-normal text-white shadow-sm transition-all duration-[240ms] ease-out active:scale-[0.98] ${
            soldOut ? "cursor-not-allowed rounded-md bg-slate-400" : isAdding ? "a5-add-cart-morph rounded-full bg-rose-600 shadow-rose-600/25" : "rounded-md bg-slate-950"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            {isAdding ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M7 8h13l-1.6 8.1a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.8 5.8A2 2 0 0 0 3.8 4H3" />
                <path d="M9 21h.01M17 21h.01" strokeLinecap="round" />
              </svg>
            ) : null}
            {soldOut ? "품절" : isAdding ? "담겼어요" : "담기"}
          </span>
        </button>
        {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-normal text-emerald-800">{message}</p> : null}
      </div>
    </section>
  );
}

export function LiveCartPage({ fallbackItems }: { fallbackItems: CartItemSnapshot[] }) {
  const { items, replace } = useCart(fallbackItems);
  const companies = useLiveCompanies();
  const [message, setMessage] = useState("");
  const indexedItems = useMemo<IndexedCartLine[]>(
    () => items.map((item, cartIndex) => ({ ...item, cartIndex })),
    [items],
  );
  const paymentGroups = useMemo(() => groupCartItemsByCompany(indexedItems, companies), [companies, indexedItems]);
  const total = cartTotal(items);
  const notifyCompletedSync = useCallback(() => {
    setMessage("고객 휴대폰 결제 완료 항목을 장바구니에서 주문 완료로 반영했습니다.");
  }, []);

  useCompletedOrderCartSync({
    enabled: true,
    replace,
    onSynced: notifyCompletedSync,
    onPaid: notifyCompletedSync,
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

    const groupItems: CartLine[] = group.items.map((item) => {
      const companyId = resolvePaymentCompanyId(item.productId, group.companyId);

      return {
        productId: item.productId,
        optionId: item.optionId,
        productName: item.productName,
        optionName: item.optionName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        companyId,
        sellerCompanyId: item.sellerCompanyId ?? companyId,
        sellerBusinessNo: item.sellerBusinessNo,
        sellerBusinessNoNormalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo,
        sellerCompanyName: item.sellerCompanyName,
        productImage: item.productImage,
        shippingFeePolicy: item.shippingFeePolicy,
      };
    });
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

    if (!backend.ok) {
      const rejectedTarget = qrRejectedCartTarget(backend.code, backend.details);
      if (rejectedTarget) {
        const nextItems = removeRejectedCartTarget(items, rejectedTarget);
        if (!cartItemsEqual(items, nextItems)) {
          await replace(nextItems);
          setMessage(qrRejectedCartMessage(rejectedTarget, backend.error));
          return;
        }
      }
      setMessage(`Firebase QR 세션 생성 실패: ${backend.error}. 고객 휴대폰 결제 QR은 서버에 저장된 세션만 열 수 있습니다.`);
      return;
    }

    const liveSession = { ...backend.session, pickupLocation: backend.session.pickupLocation ?? pickupLocation };

    if (liveSession.roomId !== tabletSession.roomId || liveSession.tabletId !== tabletSession.tabletId) {
      saveTabletRoomSession({
        ...tabletSession,
        roomId: liveSession.roomId,
        tabletId: liveSession.tabletId,
        roomName: liveSession.pickupLocation?.roomName ?? tabletSession.roomName,
        updatedAt: nowIso(),
      });
    }

    const savedSession = writeJson(`${qrPrefix}${liveSession.shortCode}`, liveSession);
    const savedPointer = writeText(currentLastQrKey(), liveSession.shortCode);

    if (!savedSession || !savedPointer) {
      setMessage("결제 진입 정보를 브라우저 저장소에 저장하지 못했습니다. 브라우저 저장소 권한을 확인해 주세요.");
      return;
    }

    setMessage(`${group.companyName} 결제 QR을 생성했습니다. QR 화면으로 이동합니다.`);
    window.location.assign("/tablet/qr");

  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3">
        <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm">
          <p className="text-xs font-normal uppercase tracking-[0.14em] text-blue-700">기업별 공동구매 결제</p>
          <h2 className="mt-1 text-xl font-normal">{COMPANY_GROUP_PURCHASE_MESSAGE}</h2>
          <p className="mt-2 text-sm leading-6">
            한 번의 결제 QR에는 한 업체 상품만 담습니다. 결제 완료 후 남은 업체 묶음은 다음 QR로 이어서 생성합니다.
          </p>
        </section>
        {items.length === 0 ? (
          <div className="rounded-md bg-white/45 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
            <h2 className="text-xl font-normal">장바구니가 비었습니다</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/tablet/products" className="inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
                상품 보러가기
              </Link>
              <Link href="/tablet/orders" className="inline-flex rounded-md bg-white/60 px-4 py-3 text-sm font-normal text-slate-900">
                주문 완료 내역
              </Link>
            </div>
          </div>
        ) : (
          paymentGroups.map((group, groupIndex) => (
            <article key={group.companyId} className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-normal text-rose-600">결제 묶음 {groupIndex + 1}</p>
                  <h3 className="mt-1 text-xl font-normal">{group.companyName}</h3>
                  <p className="mt-1 text-xs font-normal text-slate-500">업체별 결제 묶음</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-normal ${group.paymentReady ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                  {groupStatusLabel(group)}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {group.items.map((item) => (
                  <div key={`${item.productId}-${item.optionName}`} className="grid gap-4 rounded-md bg-white/45 p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <h4 className="font-normal">{item.productName}</h4>
                      <p className="mt-1 text-sm text-slate-600">{item.optionName}</p>
                      <div className="mt-3 inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
                        <button type="button" onClick={() => void setQuantity(item.cartIndex, item.quantity - 1)} className="px-3 py-2 font-normal">
                          -
                        </button>
                        <span className="bg-slate-50 px-4 py-2 font-normal">{item.quantity}</span>
                        <button type="button" onClick={() => void setQuantity(item.cartIndex, item.quantity + 1)} className="px-3 py-2 font-normal">
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} / 개</p>
                      <p className="mt-1 text-xl font-normal">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      <button
                        type="button"
                        onClick={() => void setQuantity(item.cartIndex, 0)}
                        className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs font-normal text-slate-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/45 pt-4">
                <div>
                  <p className="text-xs font-normal text-slate-500">업체별 결제 예정</p>
                  <p className="text-2xl font-normal text-rose-600">{formatCurrency(group.totalAmount)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void createQr(group)}
                  className="rounded-md bg-rose-600 px-4 py-3 text-sm font-normal text-white transition active:scale-[0.98]"
                >
                  QR 결제 생성
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      <aside className="rounded-md bg-white/45 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <h2 className="text-xl font-normal">장바구니 요약</h2>
        <div className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between">
            <span>상품 수량</span>
            <span>{items.reduce((sum, item) => sum + item.quantity, 0)}개</span>
          </div>
          <div className="flex justify-between">
            <span>결제 QR 묶음</span>
            <span>{paymentGroups.length}개 업체</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-normal">합계</span>
            <span className="text-rose-600">{formatCurrency(total)}</span>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-slate-200 bg-white/55 p-3 text-xs font-normal leading-5 text-slate-700">
          {COMPANY_GROUP_PURCHASE_MESSAGE} 결제 완료된 업체 상품은 장바구니에서 빠지고, 남은 업체 묶음은 다음 QR로 생성합니다.
        </div>
        <Link href="/tablet/products" className="mt-2 block rounded-md bg-slate-100 px-4 py-3 text-center text-sm font-normal text-slate-900">
          상품 계속 보기
        </Link>
        <Link href="/tablet/orders" className="mt-2 block rounded-md bg-white/70 px-4 py-3 text-center text-sm font-normal text-slate-900">
          주문 완료 내역
        </Link>
        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-normal text-emerald-800">{message}</p> : null}
      </aside>
    </section>
  );
}

export function LiveQrSessionPanel() {
  const { replace } = useCart();
  const [session, setSession] = useState<QrPaymentSession | null>(() => readLastQrSession());
  const [completedOrder, setCompletedOrder] = useState<TabletPaymentCompletionResponse | null>(null);
  const [lastCompletionCheckAt, setLastCompletionCheckAt] = useState("");
  const [origin, setOrigin] = useState("");
  const checkoutUrl = session ? `${resolveA5PublicOrigin(origin)}/q/live/?code=${encodeURIComponent(session.shortCode)}` : "";
  const completedOrderUrl = completedOrder?.orderNo
    ? `/orders/guest/live?orderNo=${encodeURIComponent(completedOrder.orderNo)}`
    : "/tablet/orders";
  const handlePaid = useCallback((completion: TabletPaymentCompletionResponse) => {
    setCompletedOrder(completion);
    setLastCompletionCheckAt(formatHistoryRefreshTime(new Date()));
  }, []);

  useCompletedOrderCartSync({
    enabled: Boolean(session),
    replace,
    onPaid: handlePaid,
  });

  useEffect(() => {
    const sync = () => setSession(readLastQrSession());
    const originTimer = window.setTimeout(() => setOrigin(window.location.origin), 0);

    window.addEventListener("a5-cart-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.clearTimeout(originTimer);
      window.removeEventListener("a5-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!completedOrder) return;

    const redirectTimer = window.setTimeout(() => {
      window.location.replace(
        `/tablet/cart?paymentResult=success&qrSessionId=${encodeURIComponent(completedOrder.qrSessionId)}`,
      );
    }, 3500);

    return () => window.clearTimeout(redirectTimer);
  }, [completedOrder]);

  if (!session) {
    return (
      <section className="mx-auto max-w-3xl rounded-md bg-white/55 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-normal uppercase tracking-[0.16em] text-rose-700">서버 QR 필요</p>
        <h2 className="mt-2 text-2xl font-normal">서버 QR 세션이 없습니다</h2>
        <p className="mt-3 text-sm font-normal leading-6 text-slate-700">
          이 화면은 더 이상 예전 SANHO701 테스트 QR이나 mock QR을 표시하지 않습니다. 장바구니에서 업체별 구매 QR 생성 버튼을 눌러 Firebase qrCreate가 성공한 세션만 표시합니다.
        </p>
        <Link href="/tablet/cart" className="mt-5 inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-normal text-white">
          장바구니에서 QR 생성
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[420px_1fr]">
      <div className="rounded-md bg-white/45 p-6 text-center text-slate-950 shadow-sm backdrop-blur-xl">
        {completedOrder ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-left text-emerald-950">
            <p className="text-xs font-normal uppercase tracking-[0.16em] text-emerald-700">결제 완료</p>
            <h2 className="mt-2 text-3xl font-normal">결제 완료</h2>
            <p className="mt-2 text-sm font-normal">주문번호 {completedOrder.orderNo}</p>
            <div className="mt-4 grid gap-2 text-sm font-normal">
              <div className="flex justify-between rounded-md bg-white/70 p-3">
                <span>결제 시간</span>
                <span>{completedOrderTime(completedOrder)}</span>
              </div>
              <div className="flex justify-between rounded-md bg-white/70 p-3">
                <span>결제 금액</span>
                <span>{formatCurrency(completedOrder.totalAmount)}</span>
              </div>
            </div>
            <Link href={completedOrderUrl} className="mt-4 block rounded-md bg-emerald-700 px-4 py-3 text-center text-sm font-normal text-white">
              주문조회
            </Link>
            <Link href="/tablet/orders" className="mt-2 block rounded-md bg-white px-4 py-3 text-center text-sm font-normal text-emerald-900">
              태블릿 주문완료 내역
            </Link>
          </div>
        ) : null}
        <div className="mx-auto grid h-72 w-72 place-items-center rounded-md border-[14px] border-slate-950 bg-white">
          <img src={makeQrImageUrl(checkoutUrl)} alt="결제 QR" className="h-[260px] w-[260px]" />
        </div>
        <p className="mt-3 text-sm font-normal text-slate-700">휴대폰 카메라로 QR을 스캔하세요.</p>
        <p className="mt-4 text-sm font-normal text-rose-600">만료 {new Date(session.expiresAt).toLocaleString("ko-KR")}</p>
        {lastCompletionCheckAt ? <p className="mt-3 text-xs font-normal text-blue-700">자동 확인 {lastCompletionCheckAt}</p> : null}
      </div>
      <div className="grid gap-3">
        <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm">
          <h2 className="text-lg font-normal">{COMPANY_GROUP_PURCHASE_MESSAGE}</h2>
        </section>
        {session.items.map((item) => (
          <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-normal">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
              </div>
              <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
            </div>
          </article>
        ))}
        <div className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
          <div className="flex justify-between text-lg">
            <span className="font-normal">결제 예정</span>
            <span className="text-rose-600">{formatCurrency(session.totalAmount)}</span>
          </div>
        </div>
        {session.pickupLocation ? (
          <div className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
            <p className="text-xs font-normal text-slate-500">현장 받기 자동 입력 주소</p>
            <p className="mt-1 font-normal">{session.pickupLocation.nurseryName}</p>
            <p className="mt-1 text-sm font-normal text-slate-700">{session.pickupLocation.nurseryAddress}</p>
            <p className="mt-1 text-sm font-normal text-rose-600">{session.pickupLocation.roomName}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type MobileGuestShopPageProps = {
  initialProducts?: Product[];
  initialContent?: StorefrontContent;
};

function MobileShopBenefitBar({ products, cartCount }: { products: Product[]; cartCount: number }) {
  const categoryCount = new Set(products.map((product) => product.category).filter(Boolean)).size;
  const maxDiscount = products.reduce((max, product) => Math.max(max, mobileDiscountRate(product)), 0);

  return (
    <section className="grid grid-cols-3 gap-2">
      {[
        ["상품", `${products.length}개`],
        ["카테고리", `${categoryCount}개`],
        maxDiscount > 0 ? ["최대할인", `${maxDiscount}%`] : ["비교가격", "확인 전"],
      ].map(([label, value]) => (
        <div key={label} className="rounded-md border border-white/25 bg-white/10 p-3 text-white backdrop-blur-xl">
          <p className="text-[10px] font-normal text-rose-200">{label}</p>
          <p className="mt-1 text-lg font-normal">{value}</p>
        </div>
      ))}
      <div className="col-span-3 rounded-md border border-rose-200/30 bg-rose-500/15 p-3 text-xs font-normal leading-5 text-rose-50 backdrop-blur-xl">
        QR 입장권으로 둘러보고, 장바구니 {cartCount}개를 모바일에서 결제합니다.
      </div>
    </section>
  );
}

function MobileCategoryScroller({ products, sessionId, basePath = "/m/shop/" }: { products: Product[]; sessionId: string; basePath?: string }) {
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];

  if (categories.length === 0) return null;

  return (
    <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="모바일 상품 카테고리">
      <Link href={mobileHref(basePath, sessionId)} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-normal text-slate-950">
        전체
      </Link>
      {categories.map((category) => (
        <Link key={category} href={mobileHref(categoryMobilePathFromLabel(category), sessionId)} className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-normal text-white ring-1 ring-white/20">
          {category}
        </Link>
      ))}
    </nav>
  );
}

function MobileProductCard({ product, sessionId }: { product: Product; sessionId: string }) {
  const rate = mobileDiscountRate(product);
  const productHref = mobileProductHref(product, sessionId);

  return (
    <article className="min-w-0 overflow-hidden rounded-md border border-white/35 bg-white/90 shadow-sm backdrop-blur-xl">
      <Link href={productHref} className="block">
        <div className="relative overflow-hidden bg-slate-100">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="aspect-[4/5] h-full w-full object-cover" /> : null}
          {rate > 0 ? <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-normal text-white">{rate}%</span> : null}
        </div>
        <div className="grid gap-2 p-3">
          <p className="truncate text-[10px] font-normal text-rose-600">{product.brand ?? product.companyId}</p>
          <h2 className="line-clamp-2 min-h-9 text-sm font-normal leading-[1.25]">{product.name}</h2>
          <div className="flex flex-wrap gap-1">
            {[product.category, mobileFulfillmentLabel(product), mobileStockLabel(product)].filter(Boolean).slice(0, 3).map((badge) => (
              <span key={badge} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-normal text-slate-600">
                {badge}
              </span>
            ))}
          </div>
          <div>
            {product.priceComparisonVerified === true && product.comparison?.listPrice > product.price ? (
              <p className="text-[10px] font-normal text-slate-400 line-through">{formatCurrency(product.comparison.listPrice)}</p>
            ) : null}
            <span className="text-base font-normal text-rose-600">{formatCurrency(product.price)}</span>
          </div>
          <span className="rounded-md bg-slate-950 px-3 py-2 text-center text-xs font-normal text-white">보기</span>
        </div>
      </Link>
    </article>
  );
}

function MobileProductGroups({ products, sessionId }: { products: Product[]; sessionId: string }) {
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];

  if (categories.length === 0) {
    return (
      <section id="mobile-products" className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <MobileProductCard key={product.id} product={product} sessionId={sessionId} />
        ))}
      </section>
    );
  }

  return (
    <section id="mobile-products" className="grid gap-5">
      {categories.map((category) => {
        const categoryProducts = products.filter((product) => product.category === category);

        return (
          <section key={category} id={`mobile-category-${encodeURIComponent(category)}`} className="grid gap-3">
            <div className="flex items-end justify-between text-white">
              <h2 className="text-lg font-normal">{category}</h2>
              <span className="text-xs font-normal text-rose-200">{categoryProducts.length}개</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categoryProducts.map((product) => (
                <MobileProductCard key={product.id} product={product} sessionId={sessionId} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

export function MobileGuestShopPage({ initialProducts, initialContent }: MobileGuestShopPageProps = {}) {
  const companies = useLiveCompanies();
  const pathname = usePathname() ?? "";
  const [query, setQuery] = useState(() => readMobileShopQuery(pathname));
  const { sessionId, productId, brandId, categoryId, view } = query;
  const isPreviewSession = isMobilePreviewSessionId(sessionId);
  const sharedInitialProducts = useMemo(() => mergeSharedClosedMallProducts(initialProducts ?? []), [initialProducts]);
  const [session, setSession] = useState<(QrPaymentSession & { guestShopSessionId?: string }) | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Product[]>(() => mergeSharedClosedMallProducts(initialProducts ?? []));
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [receiver, setReceiver] = useState<QrReceiverFormValue | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const approvedProducts = useMemo(() => normalizeSharedClosedMallProducts(products), [products]);
  const brandScopedProducts = useMemo(
    () => (brandId ? approvedProducts.filter((product) => mobileBrandRouteId(product) === brandId) : approvedProducts),
    [approvedProducts, brandId],
  );
  const selectedCategoryLabel = useMemo(
    () => (categoryId ? categoryLabelForRouteId(categoryId, approvedProducts.map((product) => product.category).filter(Boolean)) : ""),
    [approvedProducts, categoryId],
  );
  const categoryScopedProducts = useMemo(
    () => (categoryId ? brandScopedProducts.filter((product) => product.category === selectedCategoryLabel) : brandScopedProducts),
    [brandScopedProducts, categoryId, selectedCategoryLabel],
  );
  const visibleBrowseProducts = categoryId ? categoryScopedProducts : brandId ? brandScopedProducts : approvedProducts;
  const selectedBrandName = visibleBrowseProducts[0] ? productBrandName(visibleBrowseProducts[0]) : "";
  const selectedProduct = approvedProducts.find((product) => product.id === productId) ?? visibleBrowseProducts[0] ?? approvedProducts[0];
  const selectedOptions = productOptions.filter((option) => option.productId === selectedProduct?.id);
  const cartAmount = mobileCartTotal(cart);

  useEffect(() => {
    function syncQuery() {
      setQuery(readMobileShopQuery(window.location.pathname));
    }

    syncQuery();
    window.addEventListener("popstate", syncQuery);
    return () => window.removeEventListener("popstate", syncQuery);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!sessionId) {
        setIsLoading(false);
        setMessage("입장권한이 없습니다.");
        return;
      }

      setIsLoading(true);
      if (isMobilePreviewSessionId(sessionId)) {
        const previewSession = createMobilePreviewSession(sharedInitialProducts);
        const storedCart = readJson<CartLine[]>(mobileCartKey(sessionId), []);
        const initialCart = storedCart.length > 0 ? storedCart : previewSession.items.map((item) => ({ ...item, productId: item.productId }));

        setSession(previewSession);
        setProducts(sharedInitialProducts);
        setProductOptions([]);
        const normalizedInitialCart = withoutBlockedMockCartItems(normalizeCartPaymentOwners(initialCart));
        setCart(normalizedInitialCart);
        setReceiver((current) => current ?? initialQrReceiverFormValue(previewSession));
        if (storedCart.length === 0 && normalizedInitialCart.length > 0) {
          writeJson(mobileCartKey(sessionId), normalizedInitialCart);
        }
        setMessage("개발자 미리보기 세션입니다.");
        setIsLoading(false);
        return;
      }

      const entryToken = readGuestShopEntryToken(sessionId);
      if (!entryToken) {
        setIsLoading(false);
        setMessage("입장권한이 없습니다.");
        return;
      }

      const result = await readBackendGuestShopSession(sessionId, entryToken);
      if (cancelled) return;

      if (!result.ok) {
        setIsLoading(false);
        setMessage(guestShopAccessMessage(result.error));
        return;
      }

      const guestSession = result.data.session;
      const nextSession = {
        ...guestSession,
        id: guestSession.qrSessionId,
        cartId: guestSession.cartId ?? `mobile-cart:${sessionId}`,
        guestShopSessionId: guestSession.id,
      } as QrPaymentSession & { guestShopSessionId: string };
      const storedCart = readJson<CartLine[]>(mobileCartKey(sessionId), []);
      const serverCart = await readBackendGuestShopCart(sessionId, entryToken);
      const serverProducts = await readBackendGuestShopProducts(sessionId, entryToken);
      if (cancelled) return;
      const serverItems = serverCart.ok ? serverCart.data.items.map((item) => ({ ...item, productId: item.productId })) : [];
      const initialCart = serverItems.length > 0
        ? serverItems
        : storedCart.length > 0
          ? storedCart
          : nextSession.items.map((item) => ({ ...item, productId: item.productId }));

      setSession(nextSession);
      if (serverProducts.ok && serverProducts.data.products.length > 0) {
        setProducts(mergeSharedClosedMallProducts(serverProducts.data.products, sharedInitialProducts));
      }
      const normalizedInitialCart = withoutBlockedMockCartItems(normalizeCartPaymentOwners(initialCart));
      setCart(normalizedInitialCart);
      setReceiver((current) => current ?? initialQrReceiverFormValue(nextSession));
      if (storedCart.length === 0 && normalizedInitialCart.length > 0) {
        writeJson(mobileCartKey(sessionId), normalizedInitialCart);
      }
      setMessage("");
      setIsLoading(false);
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId, sharedInitialProducts]);

  useEffect(() => {
    let cancelled = false;

    async function loadProductDetail() {
      if (!sessionId || !productId || isMobilePreviewSessionId(sessionId)) return;
      const entryToken = readGuestShopEntryToken(sessionId);
      if (!entryToken) return;
      const result = await readBackendGuestShopProductDetail({ sessionId, entryToken, productId });
      if (cancelled || !result.ok) return;
      setProducts((current) => {
        const exists = current.some((product) => product.id === result.data.product.id);
        const next = exists ? current.map((product) => (product.id === result.data.product.id ? result.data.product : product)) : [result.data.product, ...current];
        return mergeSharedClosedMallProducts(next, sharedInitialProducts);
      });
      setProductOptions((current) => {
        const others = current.filter((option) => option.productId !== productId);
        return [...others, ...result.data.options];
      });
    }

    void loadProductDetail();
    return () => {
      cancelled = true;
    };
  }, [sessionId, productId, sharedInitialProducts]);

  function replaceMobileCart(next: CartLine[]) {
    const normalizedNext = withoutBlockedMockCartItems(normalizeCartPaymentOwners(next));
    setCart(normalizedNext);
    writeJson(mobileCartKey(sessionId), normalizedNext);
    if (isPreviewSession) return;

    void saveBackendGuestShopCart({
      sessionId,
      entryToken: readGuestShopEntryToken(sessionId),
      items: normalizedNext,
      clientAmount: mobileCartTotal(normalizedNext),
    });
  }

  function addMobileCart(product: Product, option: ProductOption | undefined) {
    if ((option?.stock ?? product.stock) <= 0) {
      setMessage("품절된 상품은 장바구니에 담을 수 없습니다.");
      return;
    }
    const optionName = option?.name ?? "기본 옵션";
    const unitPrice = product.price + (option?.priceDelta ?? 0);
    const companyId = resolvePaymentCompanyId(product.id, product.companyId);
    const lineKey = `${product.id}:${optionName}`;
    const next = cart.some((item) => `${item.productId}:${item.optionName}` === lineKey)
      ? cart.map((item) => (`${item.productId}:${item.optionName}` === lineKey ? { ...item, quantity: item.quantity + 1 } : item))
      : [
          ...cart,
          {
            productId: product.id,
            optionId: option?.id,
            productName: product.name,
            optionName,
            unitPrice,
            quantity: 1,
            companyId,
            ...sellerCartFields(product, companyId),
            productImage: product.imageUrl,
          },
        ];

    replaceMobileCart(next);
    setMessage("모바일 장바구니에 담았습니다.");
  }

  function updateQuantity(index: number, quantity: number) {
    replaceMobileCart(cart.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity } : item)).filter((item) => item.quantity > 0));
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md border border-white/35 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
          <h1 className="text-2xl font-normal">모바일 폐쇄몰을 불러오는 중입니다</h1>
          <p className="mt-2 text-sm font-normal text-slate-600">고객 휴대폰 세션과 상품 정보를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-white p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md border border-white/35 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
          <h1 className="text-2xl font-normal">모바일 세션을 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm font-normal leading-6 text-red-700">{message || "QR을 다시 스캔해 주세요."}</p>
        </section>
      </main>
    );
  }

  const checkoutItems = normalizeCartPaymentOwners(cart);
  const checkoutSession = {
    ...session,
    cartId: `mobile-cart:${sessionId}`,
    items: checkoutItems,
    totalAmount: mobileCartTotal(checkoutItems),
    guestShopSessionId: sessionId,
    guestShopEntryToken: readGuestShopEntryToken(sessionId),
  } as QrPaymentSession & { guestShopSessionId: string; guestShopEntryToken?: string };
  const effectiveReceiver = receiver ?? initialQrReceiverFormValue(session);

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-slate-950">
      <section className="mx-auto grid max-w-md gap-4">
        <header className="rounded-md border border-white/20 bg-white/10 p-5 text-white shadow-sm backdrop-blur-xl">
          <p className="text-xs font-normal uppercase tracking-[0.14em] text-rose-300">모바일 폐쇄몰</p>
          <h1 className="mt-2 text-3xl font-normal">모바일 전용 둘러보기</h1>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-300">QR 인증 후 3시간 동안 상품을 둘러보고 휴대폰에서 바로 결제할 수 있습니다.</p>
          <nav className="mt-4 grid grid-cols-3 gap-2 text-sm font-normal">
            <Link href={mobileHref("/m/shop/", sessionId)} className={`rounded-md px-3 py-3 text-center ${view === "browse" ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}>상품</Link>
            <Link href={mobileHref("/m/shop/cart/", sessionId)} className={`rounded-md px-3 py-3 text-center ${view === "cart" ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}>장바구니 {cart.length}</Link>
            <Link href={mobileHref("/m/shop/checkout/", sessionId)} className={`rounded-md px-3 py-3 text-center ${view === "checkout" ? "bg-white text-slate-950" : "bg-rose-600 text-white"}`}>결제</Link>
          </nav>
        </header>

        {message ? <p className="rounded-md border border-emerald-200/70 bg-emerald-50/90 p-3 text-sm font-normal text-emerald-900 backdrop-blur-xl">{message}</p> : null}

        {view === "browse" && initialContent ? (
          <TabletHomeRuntimeSections fallbackContent={initialContent} products={approvedProducts} mode="mobile" allowTapSound={false} />
        ) : null}
        {view === "browse" ? (
          <>
            {brandId ? (
              <section className="rounded-md border border-white/35 bg-white/90 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
                <p className="text-xs font-normal uppercase text-rose-600">브랜드샵</p>
                <h2 className="mt-1 text-2xl font-normal">{selectedBrandName || "브랜드관"}</h2>
                <p className="mt-2 text-sm font-normal text-slate-600">등록된 브랜드 상품 {visibleBrowseProducts.length}개를 보여줍니다.</p>
              </section>
            ) : null}
            <MobileShopBenefitBar products={visibleBrowseProducts} cartCount={cart.length} />
            <MobileCategoryScroller
              products={visibleBrowseProducts}
              sessionId={sessionId}
              basePath={brandId ? `/m/shop/brand/${encodeURIComponent(brandId)}/` : "/m/shop/"}
            />
          </>
        ) : null}
        {view !== "browse" ? <ClosedMallRuntimeAds mode="mobile" includeMarketing includeCompany sessionId={sessionId} /> : null}

        {view === "product" && selectedProduct ? (
          <section className="grid gap-4 rounded-md border border-white/35 bg-white/85 p-4 shadow-sm backdrop-blur-xl">
            {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="aspect-square w-full rounded-md object-cover" /> : null}
            <div>
              <p className="text-xs font-normal text-rose-600">{selectedProduct.brand ?? selectedProduct.companyId}</p>
              <h2 className="mt-1 text-2xl font-normal">{selectedProduct.name}</h2>
              <p className="mt-2 text-sm font-normal leading-6 text-slate-600">{selectedProduct.subtitle}</p>
              <p className="mt-3 text-2xl font-normal text-rose-600">{formatCurrency(selectedProduct.price)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-normal">
              <span className="rounded-md bg-rose-50 px-2 py-3 text-rose-700">
                {selectedProduct.priceComparisonVerified === true && mobileDiscountRate(selectedProduct) > 0 ? `${mobileDiscountRate(selectedProduct)}% 할인` : "비교가격 확인 전"}
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-3 text-slate-700">{mobileFulfillmentLabel(selectedProduct)}</span>
              <span className="rounded-md bg-slate-50 px-2 py-3 text-slate-700">{mobileStockLabel(selectedProduct)}</span>
            </div>
            <div className="grid gap-2">
              {selectedOptions.length > 0 ? (
                selectedOptions.map((option) => (
                  <button type="button" key={option.id} disabled={option.stock <= 0} onClick={() => addMobileCart(selectedProduct, option)} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                    {option.stock <= 0 ? `${option.name} / 품절` : `${option.name} 담기 / ${formatCurrency(selectedProduct.price + option.priceDelta)}`}
                  </button>
                ))
              ) : (
                <button type="button" disabled={selectedProduct.stock <= 0} onClick={() => addMobileCart(selectedProduct, undefined)} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                  {selectedProduct.stock <= 0 ? "품절" : "장바구니 담기"}
                </button>
              )}
            </div>
            <ProductDetailTabs
              product={selectedProduct}
              compact
              profile={{
                displayName: selectedProduct.name,
                brand: selectedProduct.brand ?? selectedProduct.companyId,
                category: selectedProduct.category,
                subtitle: selectedProduct.subtitle ?? "",
                imageUrl: selectedProduct.imageUrl,
                gallery: selectedProduct.gallery ?? [],
                detailTabs: selectedProduct.detailSections ?? [],
              }}
            />
            <Link href={mobileHref("/m/shop/", sessionId)} className="rounded-md bg-slate-100 px-4 py-3 text-center text-sm font-normal text-slate-900">상품 목록</Link>
          </section>
        ) : view === "cart" ? (
          <section className="grid gap-3 rounded-md border border-white/35 bg-white/85 p-4 shadow-sm backdrop-blur-xl">
            <h2 className="text-xl font-normal">모바일 장바구니</h2>
            {cart.length === 0 ? <p className="rounded-md bg-slate-50 p-4 text-sm font-normal text-slate-600">담긴 상품이 없습니다.</p> : null}
            {cart.map((item, index) => (
              <article key={`${item.productId}-${item.optionName}`} className="grid gap-3 rounded-md bg-slate-50 p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-normal">{item.productName}</p>
                    <p className="mt-1 text-sm font-normal text-slate-600">{item.optionName}</p>
                  </div>
                  <span className="text-rose-600">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
                <input type="number" min={0} max={99} value={item.quantity} onChange={(event) => updateQuantity(index, Number(event.target.value) || 0)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" />
              </article>
            ))}
            <div className="flex justify-between border-t border-slate-100 pt-4">
              <span className="font-normal">결제 예정 금액</span>
              <span className="text-2xl text-rose-600">{formatCurrency(cartAmount)}</span>
            </div>
            <Link href={mobileHref("/m/shop/checkout/", sessionId)} className="rounded-md bg-rose-600 px-4 py-4 text-center text-base font-normal text-white">결제하기</Link>
          </section>
        ) : view === "checkout" ? (
          <section className="grid gap-4">
            <section className="rounded-md border border-white/35 bg-white/85 p-4 shadow-sm backdrop-blur-xl">
              <h2 className="text-xl font-normal">모바일 결제</h2>
              <p className="mt-2 text-sm font-normal text-slate-600">모바일 장바구니 기준으로 서버에서 가격과 재고를 다시 검증합니다.</p>
              <div className="mt-4 flex justify-between">
                <span className="font-normal">총 결제 금액</span>
                <span className="text-2xl text-rose-600">{formatCurrency(cartAmount)}</span>
              </div>
            </section>
            <QrReceiverForm key={session.id} session={session} onChange={setReceiver} />
            {isPreviewSession && cart.length > 0 ? (
              <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm font-normal leading-6 text-blue-950">
                개발자 미리보기 결제 화면입니다. 실제 결제 호출은 운영 QR 세션에서만 진행합니다.
              </section>
            ) : cart.length > 0 ? (
              <ServerCheckoutFlow session={checkoutSession} dataSource="mobile_guest_shop" companies={companies} receiver={effectiveReceiver} />
            ) : (
              <Link href={mobileHref("/m/shop/", sessionId)} className="rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-normal text-white">상품 담으러 가기</Link>
            )}
          </section>
        ) : visibleBrowseProducts.length > 0 ? (
          <MobileProductGroups products={visibleBrowseProducts} sessionId={sessionId} />
        ) : (
          <section className="rounded-md border border-white/35 bg-white/90 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
            <p className="text-base font-normal">표시할 브랜드 상품이 없습니다.</p>
            <Link href={mobileHref("/m/shop/", sessionId)} className="mt-3 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
              전체 상품 보기
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}

export function LiveQrCheckoutPage() {
  const companies = useLiveCompanies();
  const [query, setQuery] = useState(readLiveCheckoutQuery);
  const { code, sessionId, paymentResult, orderNo, hasPgReturnParams } = query;
  const [session, setSession] = useState<QrPaymentSession | null>(() => readQrCheckoutSession(code));
  const [receiver, setReceiver] = useState<QrReceiverFormValue | null>(() => {
    const initialSession = readQrCheckoutSession(code);
    return initialSession ? initialQrReceiverFormValue(initialSession) : null;
  });
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [shopEntryPending, setShopEntryPending] = useState(false);
  const [shopEntryError, setShopEntryError] = useState("");

  useEffect(() => {
    function syncQuery() {
      setQuery(readLiveCheckoutQuery());
    }

    syncQuery();
    window.addEventListener("popstate", syncQuery);

    return () => {
      window.removeEventListener("popstate", syncQuery);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    function sync() {
      const localSession = readQrCheckoutSession(code);
      if (localSession) {
        setSession(localSession);
        setReceiver((current) => current ?? initialQrReceiverFormValue(localSession));
      }
    }

    async function syncFromFirestore() {
      if (!code && !sessionId) {
        setIsLoadingSession(false);
        return;
      }

      setIsLoadingSession(true);
      setLookupError("");
      let remoteSession: QrPaymentSession | null = null;

      if (sessionId) {
        const entryToken = readGuestShopEntryToken(sessionId);
        const result = entryToken
          ? await readBackendGuestShopSession(sessionId, entryToken)
          : ({ ok: false, error: "입장권한이 없습니다." } as const);
        if (result.ok) {
          const guestSession = result.data.session;
          remoteSession = {
            ...guestSession,
            id: guestSession.qrSessionId,
            cartId: guestSession.cartId ?? `guest-shop:${sessionId}`,
            guestShopSessionId: guestSession.id,
          } as QrPaymentSession & { guestShopSessionId: string };
        }
      } else {
        remoteSession = await readLiveShopQrSessionByShortCodeWithTimeout(code);
      }

      if (!cancelled && remoteSession) {
        writeJson(`${qrPrefix}${remoteSession.shortCode}`, remoteSession);
        setSession(remoteSession);
        setReceiver((current) => current ?? initialQrReceiverFormValue(remoteSession));
      }

      if (!cancelled && !remoteSession) {
        setLookupError("Firebase에서 QR 세션을 확인하지 못했습니다. 태블릿에서 서버 QR 생성이 완료된 뒤 다시 스캔해 주세요.");
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
  }, [code, sessionId, hasPgReturnParams]);

  if (!session && isLoadingSession) {
    return (
      <main className="min-h-screen bg-white p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md border border-white/35 bg-white/85 p-5 backdrop-blur-xl">
          <h1 className="text-2xl font-normal">QR 정보를 불러오는 중입니다</h1>
          <p className="mt-2 text-sm font-normal text-slate-600">산후조리원 주소와 객실번호를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-white p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md border border-white/35 bg-white/85 p-5 backdrop-blur-xl">
          <h1 className="text-2xl font-normal">QR 세션을 찾을 수 없습니다</h1>
          {lookupError ? <p className="mt-2 text-sm font-normal leading-6 text-red-700">{lookupError}</p> : null}
          <Link href="/tablet/cart" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
            장바구니로 이동
          </Link>
        </section>
      </main>
    );
  }

  const effectiveReceiver = receiver ?? initialQrReceiverFormValue(session);

  async function openGuestShopFromQr(source: "checkout_more_products" | "payment_success_more_products") {
    const currentSession = session;
    if (!currentSession?.shortCode) return;

    setShopEntryPending(true);
    setShopEntryError("");

    const result = await claimBackendGuestShopSession({
      shortCode: currentSession.shortCode,
      qrSessionId: currentSession.id,
      source,
    });

    setShopEntryPending(false);

    if (!result.ok) {
      setShopEntryError(guestShopAccessMessage(result.error));
      return;
    }

    writeGuestShopEntryToken(result.data.guestShopSessionId, result.data.entryToken, result.data.expiresAt);
    window.location.assign(`/m/shop/?sessionId=${encodeURIComponent(result.data.guestShopSessionId)}`);
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-white px-3 py-3 text-slate-950 sm:px-4 sm:py-5">
      <section className="mx-auto grid w-full min-w-0 max-w-[430px] gap-4">
        <section className="min-w-0 overflow-hidden rounded-md border border-white/35 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
          <p className="text-xs font-normal uppercase text-rose-600">QR 결제</p>
          <h1 className="mt-2 text-3xl font-normal">QR 결제</h1>
          <p className="mt-2 text-sm font-normal text-slate-600">QR 코드 {session.shortCode}</p>
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-normal leading-6 text-blue-950">
            상품과 결제자 정보를 확인한 뒤 결제를 진행해 주세요.
          </div>
          <div className="mt-4 grid gap-3">
            {session.items.map((item) => (
              <article key={`${item.productId}-${item.optionName}`} className="min-w-0 rounded-md bg-slate-50 p-3">
                <p className="break-words font-normal">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
                <p className="mt-2 break-words text-right font-normal">{formatCurrency(item.unitPrice * item.quantity)}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 flex min-w-0 justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="font-normal">총 결제금액</span>
            <span className="min-w-0 break-words text-right text-2xl text-rose-600">{formatCurrency(session.totalAmount)}</span>
          </div>
        </section>
        <QrReceiverForm key={session.id} session={session} onChange={setReceiver} />
        {paymentResult !== "success" ? (
          <section className="min-w-0 overflow-hidden rounded-md bg-white p-5 shadow-sm">
            <p className="text-xs font-normal uppercase text-blue-700">상품 더보기</p>
            <h2 className="mt-2 text-xl font-normal">다른 상품 추가로 더 보기</h2>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
              이 버튼을 눌렀을 때만 3시간 모바일 둘러보기 입장권이 발급됩니다. 주소를 직접 입력하면 입장할 수 없습니다.
            </p>
            <button
              type="button"
              onClick={() => void openGuestShopFromQr("checkout_more_products")}
              disabled={shopEntryPending}
              className="mt-4 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {shopEntryPending ? "입장권 발급 중" : "다른 상품 추가로 더 보기"}
            </button>
            {shopEntryError ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-normal text-red-800">{shopEntryError}</p> : null}
          </section>
        ) : null}
        {paymentResult === "failed" ? (
          <section className="min-w-0 overflow-hidden rounded-md bg-white p-5 shadow-sm">
            <p className="text-xs font-normal uppercase text-red-600">결제 실패</p>
            <h2 className="mt-2 text-xl font-normal">결제가 완료되지 않았습니다</h2>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
              결제창에서 취소되었거나 승인에 실패했습니다. 정보를 확인한 뒤 다시 결제를 진행해 주세요.
            </p>
          </section>
        ) : null}
        {paymentResult === "server-confirmed" ? (
          <section className="min-w-0 overflow-hidden rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
            <p className="text-xs font-normal uppercase text-emerald-700">결제 성공</p>
            <h2 className="mt-2 text-xl font-normal">결제 완료</h2>
            <p className="mt-2 text-sm font-normal leading-6">
              A5 주문, 결제원장, QR 상태, 재고 차감 흐름까지 완료되었습니다.
              {orderNo ? ` 주문번호 ${orderNo}` : ""}
            </p>
            <button
              type="button"
              onClick={() => void openGuestShopFromQr("payment_success_more_products")}
              disabled={shopEntryPending}
              className="mt-4 w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-emerald-200"
            >
              {shopEntryPending ? "입장권 발급 중" : "다른 상품 추가로 더 보기"}
            </button>
            {shopEntryError ? <p className="mt-3 rounded-md bg-white p-3 text-sm font-normal text-red-800">{shopEntryError}</p> : null}
          </section>
        ) : null}
        {hasPgReturnParams && paymentResult !== "failed" && paymentResult !== "server-confirmed"
          ? <PgReturnConfirmClient session={session} /> : null}
        <ServerCheckoutFlow
          session={session}
          dataSource="live_qr_checkout"
          companies={companies}
          receiver={effectiveReceiver}
          fallbackReason="고객 휴대폰 QR은 Firestore qr_payment_sessions를 읽고 Firebase Functions 결제 서버로 ready/confirm을 호출합니다."
        />
      </section>
    </main>
  );
}

export function LiveGuestOrderPage() {
  const companies = useLiveCompanies();
  const [query, setQuery] = useState(readLiveGuestOrderQuery);
  const { orderNo, remainingHint } = query;
  const [order, setOrder] = useState<LiveOrder | null>(() => readLiveOrder(orderNo));
  const [shareFeedback, setShareFeedback] = useState("");
  const { items: remainingItems } = useCart([]);
  const remainingGroups = useMemo(() => groupCartItemsByCompany(remainingItems, companies), [companies, remainingItems]);
  const sellerContacts = useMemo(() => (order ? sellerContactsForOrder(order, companies) : []), [companies, order]);
  const receiveLocation = order ? orderReceiveLocation(order) : "";
  const paidAtLabel = order ? formatOrderDateTime(order.paidAt) : "";

  useEffect(() => {
    function syncQuery() {
      setQuery(readLiveGuestOrderQuery());
    }

    syncQuery();
    window.addEventListener("popstate", syncQuery);

    return () => {
      window.removeEventListener("popstate", syncQuery);
    };
  }, []);

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
      <main className="min-h-screen bg-white p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md border border-white/35 bg-white/85 p-5 backdrop-blur-xl">
          <h1 className="text-2xl font-normal">주문을 찾을 수 없습니다</h1>
          <Link href="/orders/guest" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
            주문조회로 이동
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-slate-950">
      <section className="mx-auto max-w-md rounded-md border border-white/35 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-normal uppercase text-rose-600">비회원 주문</p>
        <h1 className="mt-2 text-3xl font-normal">{order.orderNo}</h1>
        <p className="mt-2 text-sm text-slate-600">{order.customerName} / {order.customerPhoneMasked}</p>
        <div className="mt-4 grid gap-3 text-sm font-normal text-slate-700">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-normal uppercase text-slate-500">결제일시</p>
            <p className="mt-1 text-slate-950">{paidAtLabel}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-normal uppercase text-slate-500">수령 위치</p>
            <p className="mt-1 leading-6 text-slate-950">{receiveLocation}</p>
          </div>
        </div>
        {order.receiver ? (
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-normal leading-6 text-slate-700">
            <p>{order.receiver.deliveryMethod === "pickup" ? "현장 받기" : "원하는 곳으로 받기"}</p>
            <p>{order.receiver.address}</p>
            {order.receiver.addressDetail ? <p>{order.receiver.addressDetail}</p> : null}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3">
          {order.qrSession.items.map((item) => (
            <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-slate-50 p-3">
              <p className="font-normal">{item.productName}</p>
              <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
              <p className="mt-2 text-right font-normal">{formatCurrency(item.unitPrice * item.quantity)}</p>
            </article>
          ))}
        </div>
        {sellerContacts.length > 0 ? (
          <section className="mt-4 rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs font-normal uppercase text-slate-500">판매자 연락처</p>
            <div className="mt-3 grid gap-2">
              {sellerContacts.map((seller) => (
                <article key={seller.companyId} className="rounded-md bg-slate-50 p-3 text-sm font-normal text-slate-700">
                  <p className="text-base font-normal text-slate-950">{seller.companyName}</p>
                  <p className="mt-1">담당자 {seller.managerName}</p>
                  <p className="mt-1">연락처 {seller.phone}</p>
                  {seller.kakaoChannel ? <p className="mt-1">카카오 채널 {seller.kakaoChannel}</p> : null}
                  {seller.email ? <p className="mt-1">이메일 {seller.email}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
          <span className="font-normal">결제금액</span>
          <span className="text-2xl text-rose-600">{formatCurrency(order.qrSession.totalAmount)}</span>
        </div>
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-normal text-emerald-800">
          주문 접수가 완료되었습니다. 주문번호로 배송 상태와 취소/환불 문의를 확인할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => void shareOrder()}
          className="mt-3 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white"
        >
          카카오톡 등으로 주문내역 공유
        </button>
        {shareFeedback ? <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm font-normal text-slate-700">{shareFeedback}</p> : null}
        {remainingHint || remainingGroups.length > 0 ? (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
            <p className="font-normal">{COMPANY_GROUP_PURCHASE_MESSAGE}</p>
            <p className="mt-1 font-normal">남은 업체 묶음 {remainingGroups.length}개는 장바구니에서 다음 결제 QR로 생성할 수 있습니다.</p>
            <Link href="/tablet/cart" className="mt-3 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-normal text-white">
              남은 업체 결제 QR 생성
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function completedOrderTime(order: LiveShopCompletedOrder | TabletPaymentCompletionResponse) {
  const completedAt = "completedAt" in order ? order.completedAt : order.paidAt;
  const date = new Date(completedAt ?? "");
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatHistoryRefreshTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}


export function LiveTabletOrderHistoryPage() {
  const [dateKey, setDateKey] = useState(() => localDateKey());
  const [orders, setOrders] = useState<LiveShopCompletedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const totalAmount = orders.reduce((total, order) => total + order.totalAmount, 0);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders(options: { showLoading?: boolean } = {}) {
      const tabletSession = readTabletRoomSession();
      if (!tabletSession) {
        if (!cancelled) {
          setOrders([]);
          setIsLoading(false);
          setLastUpdatedAt("");
          setMessage("객실 선택 후 주문 완료 내역을 조회할 수 있습니다.");
        }
        return;
      }

      if (options.showLoading) setIsLoading(true);

      try {
        const completedOrders = await listLiveShopCompletedOrdersForRoom({
          nurseryId: tabletSession.nurseryId,
          roomId: tabletSession.roomId,
          date: dateKey,
        });

        if (!cancelled) {
          setOrders(completedOrders);
          setIsLoading(false);
          setMessage("");
          setLastUpdatedAt(formatHistoryRefreshTime(new Date()));
        }
      } catch (error) {
        if (!cancelled) {
          setIsLoading(false);
          setMessage(error instanceof Error ? error.message : "\uC8FC\uBB38 \uC644\uB8CC \uB0B4\uC5ED \uC870\uD68C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        }
      }
    }

    void loadOrders({ showLoading: true });
    const intervalId = window.setInterval(() => {
      void loadOrders({ showLoading: false });
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [dateKey]);

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-white/25 bg-white/35 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-normal uppercase tracking-[0.18em] text-rose-700">태블릿 주문 개인정보</p>
            <h1 className="mt-2 text-3xl font-normal">날짜별 주문 완료 내역</h1>
            <p className="mt-2 text-sm font-normal text-slate-600">
              태블릿에는 결제 완료 여부, 주문번호, 시간, 금액, 수량만 표시합니다.
            </p>
            {lastUpdatedAt ? <p className="mt-2 text-xs font-normal text-blue-700">{"\uC790\uB3D9 \uAC31\uC2E0"} {lastUpdatedAt}</p> : null}
          </div>
          <label className="grid gap-1 text-sm font-normal text-slate-700">
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
        <p className="text-sm font-normal">개인정보 보호 표시 기준</p>
        <p className="mt-1 text-sm font-normal leading-6">
          고객 성명, 연락처, 주소, 상품명, 옵션명은 이 태블릿 주문내역에 표시하지 않습니다. 다음 고객이 같은 객실 태블릿을 볼 수 있기 때문입니다.
        </p>
      </section>

      {message ? <p className="rounded-md bg-amber-50 p-4 text-sm font-normal text-amber-900">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3">
          {isLoading ? (
            <div className="rounded-md bg-white/45 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
              <p className="text-lg font-normal">주문 완료 내역을 불러오는 중입니다.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-md bg-white/45 p-6 text-slate-950 shadow-sm backdrop-blur-xl">
              <p className="text-lg font-normal">선택한 날짜에 표시할 주문 완료 내역이 없습니다.</p>
            </div>
          ) : (
            orders.map((order) => (
              <article key={order.orderNo} className="rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-normal text-slate-500">주문번호</p>
                    <h2 className="mt-1 text-xl font-normal">{order.orderNo}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-normal text-emerald-800">주문 완료</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm font-normal text-slate-700 sm:grid-cols-3">
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
          <p className="text-sm font-normal text-slate-500">{dateKey} 주문 완료</p>
          <p className="mt-2 text-3xl font-normal">{orders.length}건</p>
          <div className="mt-4 flex justify-between text-sm font-normal">
            <span>결제 완료 합계</span>
            <span className="text-rose-600">{formatCurrency(totalAmount)}</span>
          </div>
          <Link href="/tablet/products" className="mt-5 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-normal text-white">
            상품 보러가기
          </Link>
          <Link href="/tablet/cart" className="mt-2 block rounded-md bg-slate-100 px-4 py-3 text-center text-sm font-normal text-slate-900">
            장바구니로 이동
          </Link>
        </aside>
      </div>
    </section>
  );
}
