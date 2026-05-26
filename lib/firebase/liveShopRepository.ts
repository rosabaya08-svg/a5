import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where, type DocumentData } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { withResolvedQrPickupLocation } from "@/lib/qr/pickupLocation";
import type { CartItemSnapshot, QrPaymentSession, QrPickupLocation } from "@/types/commerce";

export type LiveShopCollection =
  | "carts"
  | "qr_payment_sessions"
  | "orders"
  | "order_items";

export type LiveShopSaveResult = {
  mode: "firestore" | "blocked";
  message: string;
};

export type LiveShopCompletedOrder = {
  orderNo: string;
  status: string;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  cartId: string;
  qrSessionId: string;
  shortCode: string;
  completedAt: string;
  completedDate: string;
  totalAmount: number;
  itemCount: number;
  items: CartItemSnapshot[];
};

export type LiveShopStoredOrder = {
  orderNo: string;
  qrSession: QrPaymentSession;
  customerName: string;
  customerPhoneMasked: string;
  receiver?: {
    customerName: string;
    customerPhone: string;
    deliveryMethod: QrPaymentSession["deliveryMethod"];
    address: string;
    addressDetail: string;
    consent: boolean;
  };
  guestOrderUrl?: string;
  shareMessage?: string;
  createdAt: string;
  paidAt: string;
  status: "paid" | "ready_for_pickup";
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asIsoDate(value: unknown) {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date };

    if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().toISOString();
    if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return new Date().toISOString();
}

function asCartItems(value: unknown): CartItemSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const data = item && typeof item === "object" ? (item as Record<string, unknown>) : {};

      return {
        productId: asString(data.productId ?? data.product_id),
        optionId: asString(data.optionId ?? data.option_id) || undefined,
        productName: asString(data.productName ?? data.product_name),
        optionName: asString(data.optionName ?? data.option_name, "default"),
        unitPrice: asNumber(data.unitPrice ?? data.unit_price),
        quantity: asNumber(data.quantity),
        companyId: asString(data.companyId ?? data.company_id),
      };
    })
    .filter((item) => item.productId && item.productName && item.quantity > 0);
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asDateKey(value: unknown) {
  const explicit = asString(value);
  if (explicit) return explicit.slice(0, 10);
  return asIsoDate(value).slice(0, 10);
}

function asDeliveryMethod(value: unknown): QrPaymentSession["deliveryMethod"] {
  return value === "delivery" ? "delivery" : "pickup";
}

function asPickupLocation(data: DocumentData): QrPickupLocation | undefined {
  const raw = data.pickupLocation ?? data.pickup_location;
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const nurseryName = asString(value.nurseryName ?? value.nursery_name ?? data.nurseryName ?? data.nursery_name);
  const nurseryAddress = asString(value.nurseryAddress ?? value.nursery_address ?? data.nurseryAddress ?? data.nursery_address);
  const roomId = asString(value.roomId ?? value.room_id ?? data.roomId ?? data.room_id);
  const roomName = asString(value.roomName ?? value.room_name ?? data.roomName ?? data.room_name);

  if (!nurseryAddress || !roomName) return undefined;

  return {
    nurseryName,
    nurseryAddress,
    roomId,
    roomName,
  };
}

function mapQrSession(documentId: string, data: DocumentData): QrPaymentSession {
  const items = asCartItems(data.items ?? data.items_snapshot ?? data.itemsSnapshot);

  return withResolvedQrPickupLocation({
    id: asString(data.id ?? data.qr_session_id ?? data.qrSessionId, documentId),
    shortCode: asString(data.shortCode ?? data.short_code, documentId),
    type: data.type === "ask" ? "ask" : "purchase",
    status: data.status === "paid" || data.status === "expired" || data.status === "cancelled" ? data.status : "active",
    nurseryId: asString(data.nurseryId ?? data.nursery_id),
    roomId: asString(data.roomId ?? data.room_id),
    tabletId: asString(data.tabletId ?? data.tablet_id),
    cartId: asString(data.cartId ?? data.cart_id),
    createdAt: asIsoDate(data.createdAt ?? data.created_at),
    expiresAt: asIsoDate(data.expiresAt ?? data.expires_at),
    deliveryMethod: data.deliveryMethod === "delivery" || data.delivery_method === "delivery" ? "delivery" : "pickup",
    totalAmount: asNumber(data.totalAmount ?? data.total_amount ?? data.total_amount_snapshot),
    items,
    pickupLocation: asPickupLocation(data),
  });
}

function mapCompletedOrder(documentId: string, data: DocumentData): LiveShopCompletedOrder {
  const items = asCartItems(data.items ?? data.items_snapshot ?? data.itemsSnapshot);
  const completedAt = asIsoDate(data.completedAt ?? data.completed_at ?? data.paidAt ?? data.paid_at ?? data.createdAt ?? data.created_at);
  const itemCount = asNumber(data.itemCount ?? data.item_count, items.reduce((total, item) => total + item.quantity, 0));

  return {
    orderNo: asString(data.orderNo ?? data.order_no, documentId),
    status: asString(data.status, "paid"),
    nurseryId: asString(data.nurseryId ?? data.nursery_id),
    roomId: asString(data.roomId ?? data.room_id),
    tabletId: asString(data.tabletId ?? data.tablet_id),
    cartId: asString(data.cartId ?? data.cart_id),
    qrSessionId: asString(data.qrSessionId ?? data.qr_session_id),
    shortCode: asString(data.shortCode ?? data.short_code),
    completedAt,
    completedDate: asDateKey(data.completedDate ?? data.completed_date ?? completedAt),
    totalAmount: asNumber(data.totalAmount ?? data.total_amount),
    itemCount,
    items,
  };
}

function mapStoredOrder(documentId: string, data: DocumentData): LiveShopStoredOrder {
  const customerName = asString(data.customerName ?? data.customer_name, "비회원 고객");
  const customerPhoneMasked = asString(data.customerPhoneMasked ?? data.customer_phone_masked, "010-****-0000");
  const deliveryMethod = asDeliveryMethod(data.deliveryMethod ?? data.delivery_method);
  const receiverRaw = data.receiver && typeof data.receiver === "object" ? (data.receiver as Record<string, unknown>) : {};
  const paidAt = asIsoDate(data.paidAt ?? data.paid_at ?? data.completedAt ?? data.completed_at);
  const createdAt = asIsoDate(data.createdAt ?? data.created_at ?? paidAt);
  const qrSession: QrPaymentSession = withResolvedQrPickupLocation({
    id: asString(data.qrSessionId ?? data.qr_session_id, documentId),
    shortCode: asString(data.shortCode ?? data.short_code),
    type: "purchase",
    status: "paid",
    nurseryId: asString(data.nurseryId ?? data.nursery_id),
    roomId: asString(data.roomId ?? data.room_id),
    tabletId: asString(data.tabletId ?? data.tablet_id),
    cartId: asString(data.cartId ?? data.cart_id),
    createdAt,
    expiresAt: asIsoDate(data.expiresAt ?? data.expires_at ?? paidAt),
    deliveryMethod,
    totalAmount: asNumber(data.totalAmount ?? data.total_amount),
    items: asCartItems(data.items ?? data.items_snapshot ?? data.itemsSnapshot),
    pickupLocation: asPickupLocation(data),
  });
  const receiverAddress = asString(receiverRaw.address ?? data.receiver_address);
  const receiverAddressDetail = asString(receiverRaw.address_detail ?? receiverRaw.addressDetail ?? data.receiver_address_detail);

  return {
    orderNo: asString(data.orderNo ?? data.order_no, documentId),
    qrSession,
    customerName,
    customerPhoneMasked,
    receiver: receiverAddress
      ? {
          customerName,
          customerPhone: customerPhoneMasked,
          deliveryMethod,
          address: receiverAddress,
          addressDetail: receiverAddressDetail,
          consent: true,
        }
      : undefined,
    guestOrderUrl: asString(data.guestOrderUrl ?? data.guest_order_url) || undefined,
    shareMessage: asString(data.shareMessage ?? data.share_message) || undefined,
    createdAt,
    paidAt,
    status: data.status === "ready_for_pickup" ? "ready_for_pickup" : "paid",
  };
}

function normalizePayload(collectionName: LiveShopCollection, id: string, data: Record<string, unknown>) {
  const base = {
    ...data,
    id: data.id ?? id,
    source: data.source ?? "live_storefront",
    updated_at: serverTimestamp(),
  };

  if (collectionName === "carts") {
    return {
      ...base,
      cart_id: data.cart_id ?? id,
      guest_write_enabled: true,
    };
  }

  if (collectionName === "qr_payment_sessions") {
    return {
      ...base,
      qr_session_id: data.qr_session_id ?? data.id ?? id,
      short_code: data.short_code ?? data.shortCode,
      nursery_id: data.nursery_id ?? data.nurseryId,
      room_id: data.room_id ?? data.roomId,
      tablet_id: data.tablet_id ?? data.tabletId,
      cart_id: data.cart_id ?? data.cartId,
      total_amount: data.total_amount ?? data.totalAmount,
      delivery_method: data.delivery_method ?? data.deliveryMethod,
      pickup_location: data.pickup_location ?? data.pickupLocation,
      guest_read_enabled: true,
      guest_write_enabled: true,
    };
  }

  if (collectionName === "orders") {
    return {
      ...base,
      order_no: data.order_no ?? id,
      qr_session_id: data.qr_session_id,
      short_code: data.short_code ?? data.shortCode,
      nursery_id: data.nursery_id,
      room_id: data.room_id,
      tablet_id: data.tablet_id ?? data.tabletId,
      cart_id: data.cart_id ?? data.cartId,
      total_amount: data.total_amount,
      item_count: data.item_count ?? data.itemCount,
      completed_at: data.completed_at ?? data.paid_at,
      completed_date: data.completed_date ?? data.completedDate,
      order_completed: data.order_completed ?? data.status === "paid",
      guest_order_url: data.guest_order_url ?? data.guestOrderUrl,
      share_message: data.share_message ?? data.shareMessage,
      tablet_safe_summary: data.tablet_safe_summary ?? data.tabletSafeSummary,
      admin_data_provision_enabled: data.admin_data_provision_enabled ?? true,
      customer_order_share_enabled: data.customer_order_share_enabled ?? true,
      notification_payload: data.notification_payload,
      guest_lookup_enabled: true,
      payment_status: data.payment_status ?? "approved_mock",
    };
  }

  return {
    ...base,
    order_no: data.order_no,
    order_id: data.order_id,
    company_id: data.company_id ?? data.companyId,
    product_id: data.product_id ?? data.productId,
    product_name: data.product_name ?? data.productName,
    option_name: data.option_name ?? data.optionName,
    unit_price: data.unit_price ?? data.unitPrice,
    delivery_status: data.delivery_status ?? "pickup_ready",
    guest_lookup_enabled: true,
  };
}

export async function saveLiveShopDocument(
  collectionName: LiveShopCollection,
  id: string,
  data: Record<string, unknown>,
): Promise<LiveShopSaveResult> {
  const db = getFirebaseDb();

  if (!db) {
    return {
      mode: "blocked",
      message: "Firebase web config is missing. Browser local storage fallback is active.",
    };
  }

  try {
    await setDoc(doc(db, collectionName, id), normalizePayload(collectionName, id, data), { merge: true });

    return {
      mode: "firestore",
      message: `Saved ${collectionName}/${id} to Firestore.`,
    };
  } catch (error) {
    return {
      mode: "blocked",
      message: error instanceof Error ? error.message : "Unknown Firestore live shop write error.",
    };
  }
}

export async function readLiveShopQrSessionByShortCode(shortCode: string): Promise<QrPaymentSession | null> {
  const db = getFirebaseDb();

  if (!db || !shortCode) return null;

  try {
    const direct = await getDoc(doc(db, "qr_payment_sessions", `qr-${shortCode}`));
    if (direct.exists()) return mapQrSession(direct.id, direct.data());

    const byRawCode = await getDoc(doc(db, "qr_payment_sessions", shortCode));
    if (byRawCode.exists()) return mapQrSession(byRawCode.id, byRawCode.data());

    const snapshot = await getDocs(
      query(
        collection(db, "qr_payment_sessions"),
        where("short_code", "==", shortCode),
        where("guest_read_enabled", "==", true),
        limit(1),
      ),
    );
    const found = snapshot.docs[0];

    return found ? mapQrSession(found.id, found.data()) : null;
  } catch {
    return null;
  }
}

export async function readLiveShopOrderByOrderNo(orderNo: string): Promise<LiveShopStoredOrder | null> {
  const db = getFirebaseDb();

  if (!db || !orderNo) return null;

  try {
    const direct = await getDoc(doc(db, "orders", orderNo));
    if (direct.exists()) return mapStoredOrder(direct.id, direct.data());

    const snapshot = await getDocs(
      query(
        collection(db, "orders"),
        where("order_no", "==", orderNo),
        where("guest_lookup_enabled", "==", true),
        limit(1),
      ),
    );
    const found = snapshot.docs[0];

    return found ? mapStoredOrder(found.id, found.data()) : null;
  } catch {
    return null;
  }
}

export async function listLiveShopCompletedOrdersForRoom(input: {
  nurseryId: string;
  roomId: string;
  date: string;
}): Promise<LiveShopCompletedOrder[]> {
  const db = getFirebaseDb();

  if (!db || !input.nurseryId || !input.roomId || !input.date) return [];

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "orders"),
        where("nursery_id", "==", input.nurseryId),
        limit(100),
      ),
    );

    return snapshot.docs
      .map((item) => ({ order: mapCompletedOrder(item.id, item.data()), data: item.data() }))
      .filter(({ order, data }) => {
        if (order.roomId !== input.roomId) return false;
        if (order.completedDate !== input.date) return false;
        const completed = asBoolean(data.order_completed, order.status === "paid");
        return completed && order.status === "paid";
      })
      .map(({ order }) => order)
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  } catch {
    return [];
  }
}
