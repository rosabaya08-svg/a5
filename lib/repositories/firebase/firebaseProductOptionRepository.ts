import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { firebaseProductRepository } from "@/lib/repositories/firebase/firebaseProductRepository";
import type { ProductOptionRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { ProductOption } from "@/types/commerce";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mapProductOption(documentId: string, data: Record<string, unknown>): ProductOption {
  return {
    id: asString(data.option_id ?? data.optionId, documentId),
    productId: asString(data.product_id ?? data.productId),
    name: asString(data.name ?? data.option_name ?? data.optionName, "default"),
    priceDelta: asNumber(data.price_delta ?? data.priceDelta, 0),
    stock: asNumber(data.stock ?? data.inventory, 0),
  };
}

export const firebaseProductOptionRepository: ProductOptionRepository = {
  async listProductOptions(productId) {
    return firebaseProductRepository.listProductOptions(productId);
  },

  async getProductOptionById(optionId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", optionId);
    }

    try {
      const snapshot = await getDoc(doc(db, "product_options", optionId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase product option not found.", optionId);
      }

      return repositoryOk(mapProductOption(snapshot.id, snapshot.data()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore product option read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore product option read failed. ${message}`, optionId);
    }
  },
};
