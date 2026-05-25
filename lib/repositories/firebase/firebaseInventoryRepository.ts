import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { InventoryMovement, InventoryRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

const productOptionsCollection = "product_options";
const movementsCollection = "inventory_movements";

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function movementId(prefix: string, optionId: string) {
  return `${prefix}-${optionId}-${Date.now()}`;
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
        reason: "Checkout payment intent reserve.",
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
        reason: "Order paid stock deduction.",
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
