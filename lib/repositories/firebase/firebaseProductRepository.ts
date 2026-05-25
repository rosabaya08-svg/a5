import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ProductRepository, ProductListFilters } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Product, ProductOption } from "@/types/commerce";

const productCollection = "products";
const placeholderImage = "/file.svg";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asIsoDate(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const maybeTimestamp = value as {
      seconds?: number;
      toDate?: () => Date;
    };

    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().toISOString();
    }

    if (typeof maybeTimestamp.seconds === "number") {
      return new Date(maybeTimestamp.seconds * 1000).toISOString();
    }
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function mapProduct(documentId: string, data: DocumentData): Product {
  const comparison = asRecord(data.comparison);
  const closedMallPrice = asNumber(
    data.closed_mall_price ?? data.closedMallPrice ?? comparison.closedMallPrice,
    asNumber(data.price, 0),
  );
  const platformLowestPrice = asNumber(
    data.platform_lowest_price ?? data.platformLowestPrice ?? comparison.platformLowestPrice,
    closedMallPrice,
  );
  const listPrice = asNumber(
    data.list_price ?? data.listPrice ?? comparison.listPrice,
    Math.max(closedMallPrice, platformLowestPrice),
  );
  const imageUrl = asString(data.image_url ?? data.imageUrl, placeholderImage);

  return {
    id: asString(data.product_id ?? data.productId, documentId),
    companyId: asString(data.company_id ?? data.companyId, "company-unknown"),
    nurseryId: asString(data.nursery_id ?? data.nurseryId, ""),
    name: asString(data.title ?? data.name, "Untitled Firebase product"),
    brand: asString(data.brand, "A5 Partner"),
    subtitle: asString(data.subtitle, "Firebase products collection beta item"),
    category: asString(data.category, "uncategorized"),
    status: "approved",
    price: closedMallPrice,
    stock: asNumber(data.inventory ?? data.stock, 0),
    externalProductCode: asString(data.external_product_code ?? data.externalProductCode) || undefined,
    comparison: {
      listPrice,
      platformLowestPrice,
      closedMallPrice,
    },
    optionIds: asStringArray(data.option_ids ?? data.optionIds),
    thumbnailTone: "sage",
    imageUrl,
    gallery: asStringArray(data.gallery).length ? asStringArray(data.gallery) : [imageUrl],
    tags: asStringArray(data.tags),
    badges: asStringArray(data.badges),
    fulfillment: {
      delivery: Boolean(data.delivery_available ?? data.deliveryAvailable ?? true),
      pickup: Boolean(data.pickup_available ?? data.pickupAvailable ?? true),
    },
    firebaseStatus: asString(data.status, "active"),
    source: asString(data.source, "firestore"),
    seededAt: asIsoDate(data.seeded_at ?? data.seededAt),
  };
}

function mapProductOption(documentId: string, data: DocumentData): ProductOption {
  return {
    id: asString(data.option_id ?? data.optionId, documentId),
    productId: asString(data.product_id ?? data.productId),
    name: asString(data.name ?? data.option_name ?? data.optionName, "default"),
    priceDelta: asNumber(data.price_delta ?? data.priceDelta, 0),
    stock: asNumber(data.stock ?? data.inventory, 0),
  };
}

function matchesFilters(product: Product, filters?: ProductListFilters) {
  if (filters?.status && filters.status !== "approved") return false;
  if (filters?.category && product.category !== filters.category) return false;
  if (filters?.companyId && product.companyId !== filters.companyId) return false;
  return true;
}

async function readActiveProducts(filters?: ProductListFilters) {
  const db = getFirebaseDb();

  if (!db) {
    return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing. Using mock fallback.");
  }

  try {
    const snapshot = await getDocs(query(collection(db, productCollection), where("status", "==", "active")));
    const products = snapshot.docs
      .map((item) => mapProduct(item.id, item.data()))
      .filter((product) => matchesFilters(product, filters));

    return repositoryOk(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore product read error.";
    return repositoryError("EXTERNAL_BLOCKED", `Firestore products read failed. Using mock fallback. ${message}`);
  }
}

export const firebaseProductRepository: ProductRepository = {
  async listProducts(filters) {
    return readActiveProducts(filters);
  },

  async listApprovedProducts(filters) {
    return readActiveProducts({ ...filters, status: "approved" });
  },

  async getProductById(productId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing. Using mock fallback.", productId);
    }

    try {
      const snapshot = await getDoc(doc(db, productCollection, productId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase product not found. Using mock fallback.", productId);
      }

      const product = mapProduct(snapshot.id, snapshot.data());

      if (snapshot.data().status !== "active") {
        return repositoryError("NOT_FOUND", "Firebase product is not active. Using mock fallback.", productId);
      }

      return repositoryOk(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore product read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore product read failed. Using mock fallback. ${message}`, productId);
    }
  },

  async listProductOptions(productId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing. Using mock fallback.", productId);
    }

    try {
      const snapshot = await getDocs(query(collection(db, "product_options"), where("product_id", "==", productId)));
      return repositoryOk<ProductOption[]>(snapshot.docs.map((item) => mapProductOption(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore product options read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore product options read failed. Using mock fallback. ${message}`, productId);
    }
  },

  async listCompanyProducts(companyId, filters) {
    return readActiveProducts({ ...filters, companyId, status: "approved" });
  },
};
