import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  InventoryMovement,
  InventoryMovementListFilters,
  InventoryMovementType,
  InventoryRepository,
} from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

const productOptionsCollection = "product_options";
const movementsCollection = "inventory_movements";

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
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

function asMovementType(value: unknown): InventoryMovementType {
  const allowed: InventoryMovementType[] = ["reserve", "deduct", "restore", "external_sync", "manual_adjust"];
  return allowed.includes(value as InventoryMovementType) ? (value as InventoryMovementType) : "manual_adjust";
}

function movementId(prefix: string, optionId: string) {
  return `${prefix}-${optionId}-${Date.now()}`;
}

function movementConstraints(filters?: InventoryMovementListFilters) {
  const constraints: QueryConstraint[] = [];
  if (filters?.companyId) constraints.push(where("company_id", "==", filters.companyId));
  if (filters?.productId) constraints.push(where("product_id", "==", filters.productId));
  if (filters?.optionId) constraints.push(where("option_id", "==", filters.optionId));
  return constraints;
}

function mapMovement(documentId: string, data: Record<string, unknown>): InventoryMovement {
  return {
    id: asString(data.id, documentId),
    productId: asString(data.product_id ?? data.productId) || undefined,
    optionId: asString(data.option_id ?? data.optionId),
    companyId: asString(data.company_id ?? data.companyId) || undefined,
    type: asMovementType(data.type),
    quantity: asNumber(data.quantity),
    reason: asString(data.reason, "Firestore inventory movement"),
    sourceId: asString(data.source_id ?? data.sourceId) || undefined,
    createdAt: asIsoDate(data.created_at ?? data.createdAt),
    createdBy: asString(data.created_by ?? data.createdBy) || undefined,
  };
}

async function createMovement(movement: Omit<InventoryMovement, "id">, idPrefix: string) {
  const db = getFirebaseDb();

  if (!db) {
    return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", movement.optionId);
  }

  const id = movementId(idPrefix, movement.optionId);
  const payload: InventoryMovement = { ...movement, id };

  try {
    await setDoc(doc(collection(db, movementsCollection), id), {
      ...payload,
      option_id: payload.optionId,
      product_id: payload.productId,
      company_id: payload.companyId,
      source_id: payload.sourceId,
      created_by: payload.createdBy,
      guest_write_enabled: true,
      source: "firebase_storefront",
      updated_at: serverTimestamp(),
    });

    return repositoryOk(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore inventory movement error.";
    return repositoryError("EXTERNAL_BLOCKED", `Firestore inventory movement failed. ${message}`, movement.optionId);
  }
}

export const firebaseInventoryRepository: InventoryRepository = {
  async listInventoryMovements(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const snapshot = await getDocs(query(collection(db, movementsCollection), ...movementConstraints(filters)));
      return repositoryOk(snapshot.docs.map((item) => mapMovement(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore inventory movement read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore inventory movements read failed. ${message}`);
    }
  },

  async getOptionStock(optionId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", optionId);
    }

    try {
      const snapshot = await getDoc(doc(db, productOptionsCollection, optionId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase product option not found.", optionId);
      }

      return repositoryOk(asNumber(snapshot.data().stock ?? snapshot.data().inventory, 0));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore stock read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore option stock read failed. ${message}`, optionId);
    }
  },

  async reserveStock(optionId, quantity, sourceId) {
    return createMovement(
      {
        optionId,
        type: "reserve",
        quantity,
        reason: "체크아웃 결제 의도 재고 예약.",
        sourceId,
        createdAt: new Date().toISOString(),
        createdBy: "firebase-storefront",
      },
      "reserve",
    );
  },

  async deductStock(optionId, quantity, orderId) {
    return createMovement(
      {
        optionId,
        type: "deduct",
        quantity,
        reason: "주문 결제 완료 재고 차감.",
        sourceId: orderId,
        createdAt: new Date().toISOString(),
        createdBy: "firebase-storefront",
      },
      "deduct",
    );
  },

  async restoreStock(optionId, quantity, reason) {
    return createMovement(
      {
        optionId,
        type: "restore",
        quantity,
        reason,
        createdAt: new Date().toISOString(),
        createdBy: "firebase-storefront",
      },
      "restore",
    );
  },

  async appendInventoryMovement(movement) {
    return createMovement(movement, movement.type);
  },
};
