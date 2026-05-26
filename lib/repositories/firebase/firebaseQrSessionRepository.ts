import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { QrSessionDraftInput, QrSessionRepository, RepositoryActor } from "@/lib/repositories/types";
import { assertNeverStatus, repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { CartItemSnapshot, DeliveryMethod, QrPaymentSession, QrSessionType } from "@/types/commerce";
import type { QrSessionStatus } from "@/types/status";

const collectionName = "qr_payment_sessions";

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

function asQrStatus(value: unknown): QrSessionStatus {
  return value === "paid" || value === "expired" || value === "cancelled" ? value : "active";
}

function asQrType(value: unknown): QrSessionType {
  return value === "ask" ? "ask" : "purchase";
}

function asDeliveryMethod(value: unknown): DeliveryMethod {
  return value === "delivery" ? "delivery" : "pickup";
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

function totalAmount(items: CartItemSnapshot[]) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function makeShortCode() {
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `A5${stamp}${random}`;
}

function mapQrSession(documentId: string, data: DocumentData): QrPaymentSession {
  const items = asCartItems(data.items ?? data.items_snapshot ?? data.itemsSnapshot);

  return {
    id: asString(data.id ?? data.qr_session_id ?? data.qrSessionId, documentId),
    shortCode: asString(data.shortCode ?? data.short_code, documentId),
    type: asQrType(data.type),
    status: asQrStatus(data.status),
    nurseryId: asString(data.nurseryId ?? data.nursery_id),
    roomId: asString(data.roomId ?? data.room_id),
    tabletId: asString(data.tabletId ?? data.tablet_id),
    cartId: asString(data.cartId ?? data.cart_id),
    createdAt: asIsoDate(data.createdAt ?? data.created_at),
    expiresAt: asIsoDate(data.expiresAt ?? data.expires_at),
    deliveryMethod: asDeliveryMethod(data.deliveryMethod ?? data.delivery_method),
    totalAmount: asNumber(data.totalAmount ?? data.total_amount ?? data.total_amount_snapshot ?? data.totalAmountSnapshot, totalAmount(items)),
    items,
  };
}

function toFirestorePayload(session: QrPaymentSession) {
  return {
    id: session.id,
    qr_session_id: session.id,
    shortCode: session.shortCode,
    short_code: session.shortCode,
    type: session.type,
    status: session.status,
    nurseryId: session.nurseryId,
    nursery_id: session.nurseryId,
    roomId: session.roomId,
    room_id: session.roomId,
    tabletId: session.tabletId,
    tablet_id: session.tabletId,
    cartId: session.cartId,
    cart_id: session.cartId,
    createdAt: session.createdAt,
    created_at: session.createdAt,
    expiresAt: session.expiresAt,
    expires_at: session.expiresAt,
    deliveryMethod: session.deliveryMethod,
    delivery_method: session.deliveryMethod,
    totalAmount: session.totalAmount,
    total_amount: session.totalAmount,
    total_amount_snapshot: session.totalAmount,
    items: session.items,
    items_snapshot: session.items.map((item) => ({
      product_id: item.productId,
      option_id: item.optionId ?? null,
      product_name: item.productName,
      option_name: item.optionName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      company_id: item.companyId,
      line_amount: item.unitPrice * item.quantity,
    })),
    guest_read_enabled: true,
    source: "firebase_storefront",
    updated_at: serverTimestamp(),
  };
}

async function getSessionDocByShortCode(shortCode: string) {
  const db = getFirebaseDb();

  if (!db) {
    return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", shortCode);
  }

  const direct = await getDoc(doc(db, collectionName, shortCode));

  if (direct.exists()) {
    return repositoryOk({ id: direct.id, data: direct.data() });
  }

  const snapshot = await getDocs(
    query(
      collection(db, collectionName),
      where("short_code", "==", shortCode),
      where("guest_read_enabled", "==", true),
      limit(1),
    ),
  );
  const found = snapshot.docs[0];

  if (!found) {
    return repositoryError("NOT_FOUND", "Firebase QR session not found.", shortCode);
  }

  return repositoryOk({ id: found.id, data: found.data() });
}

export const firebaseQrSessionRepository: QrSessionRepository = {
  async listQrSessions(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const constraints = [];
      if (filters?.status) constraints.push(where("status", "==", filters.status));
      if (filters?.nurseryId) constraints.push(where("nursery_id", "==", filters.nurseryId));
      const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
      return repositoryOk(snapshot.docs.map((item) => mapQrSession(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore QR session read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore QR sessions read failed. ${message}`);
    }
  },

  async getQrSessionByShortCode(shortCode) {
    try {
      const result = await getSessionDocByShortCode(shortCode);
      return result.ok ? repositoryOk(mapQrSession(result.data.id, result.data.data)) : result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore QR session read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore QR session read failed. ${message}`, shortCode);
    }
  },

  async createQrSessionDraft(input: QrSessionDraftInput) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    const shortCode = input.shortCode ?? makeShortCode();
    const createdAt = input.createdAt ?? new Date().toISOString();
    const session: QrPaymentSession = {
      id: `qr-${shortCode}`,
      shortCode,
      type: input.type,
      status: "active",
      nurseryId: input.nurseryId,
      roomId: input.roomId,
      tabletId: input.tabletId,
      cartId: input.cartId,
      createdAt,
      expiresAt: input.expiresAt,
      deliveryMethod: input.deliveryMethod,
      totalAmount: totalAmount(input.items),
      items: input.items,
    };

    try {
      await setDoc(doc(db, collectionName, session.id), {
        ...toFirestorePayload(session),
        created_at_server: serverTimestamp(),
      });

      return repositoryOk(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore QR session write error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore QR session create failed. ${message}`);
    }
  },

  async markQrPaid(qrSessionId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", qrSessionId);
    }

    try {
      const snapshot = await getDoc(doc(db, collectionName, qrSessionId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase QR session not found.", qrSessionId);
      }

      const session = mapQrSession(snapshot.id, snapshot.data());

      if (session.status !== "active") {
        return assertNeverStatus(session.status);
      }

      const paidSession = { ...session, status: "paid" as const };
      await updateDoc(doc(db, collectionName, qrSessionId), {
        status: "paid",
        paid_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      return repositoryOk(paidSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore QR paid update error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore QR paid update failed. ${message}`, qrSessionId);
    }
  },

  async markQrExpired(qrSessionId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", qrSessionId);
    }

    try {
      await updateDoc(doc(db, collectionName, qrSessionId), {
        status: "expired",
        expired_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      const snapshot = await getDoc(doc(db, collectionName, qrSessionId));
      return snapshot.exists()
        ? repositoryOk(mapQrSession(snapshot.id, snapshot.data()))
        : repositoryError("NOT_FOUND", "Firebase QR session not found.", qrSessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore QR expired update error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore QR expired update failed. ${message}`, qrSessionId);
    }
  },

  async markQrCancelled(qrSessionId, actor: RepositoryActor) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", qrSessionId);
    }

    try {
      await updateDoc(doc(db, collectionName, qrSessionId), {
        status: "cancelled",
        cancelled_by: actor.name,
        cancelled_role: actor.role,
        cancelled_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      const snapshot = await getDoc(doc(db, collectionName, qrSessionId));
      return snapshot.exists()
        ? repositoryOk(mapQrSession(snapshot.id, snapshot.data()))
        : repositoryError("NOT_FOUND", "Firebase QR session not found.", qrSessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore QR cancel update error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore QR cancel update failed. ${message}`, qrSessionId);
    }
  },
};
