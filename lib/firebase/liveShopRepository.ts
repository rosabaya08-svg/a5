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
      nursery_id: data.nursery_id,
      room_id: data.room_id,
      total_amount: data.total_amount,
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
