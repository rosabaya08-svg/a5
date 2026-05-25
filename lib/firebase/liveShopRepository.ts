import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export type LiveShopCollection =
  | "carts"
  | "qr_payment_sessions"
  | "orders"
  | "order_items";

export type LiveShopSaveResult = {
  mode: "firestore" | "blocked";
  message: string;
};

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
