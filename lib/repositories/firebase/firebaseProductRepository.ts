import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QuerySnapshot,
} from "firebase/firestore";
import { normalizeBusinessNo } from "@/lib/auth/session";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ProductRepository, ProductListFilters } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import { REGISTERED_CLOSED_MALL_BUSINESS_NO } from "@/lib/storefront/sharedClosedMallCatalog";
import { normalizeShippingFeePolicy } from "@/lib/shipping/shippingFee";
import type { Product, ProductOption } from "@/types/commerce";

const productCollection = "products";
const placeholderImage = "/file.svg";
const visibleFirestoreProductStatuses = ["active", "approved"];
const companyManageableFirestoreProductStatuses = ["active", "approved", "paused", "suspended", "archived"];
const visibleApprovalStatuses = ["approved"];
const productBusinessNoFields = [
  "business_no",
  "businessNo",
  "seller_business_no",
  "sellerBusinessNo",
  "seller_business_no_normalized",
  "sellerBusinessNoNormalized",
  "company_business_no",
  "companyBusinessNo",
  "company_business_no_normalized",
  "companyBusinessNoNormalized",
  "business_registration_number",
  "business_registration_number_normalized",
] as const;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asBusinessNo(value: unknown) {
  return normalizeBusinessNo(asString(value));
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value.replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
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

function detailSections(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((section, index) => ({
          id: asString(section.id),
          type: asString(section.type),
          title: asString(section.title),
          body: asString(section.body),
          assetUrl: asString(section.asset_url ?? section.assetUrl),
          assetPath: asString(section.asset_path ?? section.assetPath),
          assetFileName: asString(section.asset_file_name ?? section.assetFileName),
          sortOrder: asNumber(section.sort_order ?? section.sortOrder, index + 1),
        }))
        .filter((section) => section.title || section.body || section.assetUrl)
    : [];
}

function readProductBusinessNo(data: DocumentData) {
  for (const field of productBusinessNoFields) {
    const businessNo = asBusinessNo(data[field]);
    if (businessNo) return businessNo;
  }

  return asBusinessNo(data.brand);
}

function companyBusinessNoAliases(companyId: string) {
  const aliases = new Set<string>();
  const normalizedCompanyId = normalizeBusinessNo(companyId);

  if (normalizedCompanyId === REGISTERED_CLOSED_MALL_BUSINESS_NO) {
    aliases.add(REGISTERED_CLOSED_MALL_BUSINESS_NO);
  }

  if (normalizedCompanyId.length >= 10) {
    aliases.add(normalizedCompanyId);
  }

  return [...aliases];
}

function resolveProductCompanyId(documentId: string, data: DocumentData) {
  const explicitCompanyId = asString(data.company_id ?? data.companyId);
  if (explicitCompanyId) return explicitCompanyId;

  void documentId;
  return "company-unknown";
}

function productMatchesCompanyScope(documentId: string, data: DocumentData, companyId: string) {
  const explicitCompanyId = asString(data.company_id ?? data.companyId);
  if (explicitCompanyId === companyId) return true;

  const businessNo = readProductBusinessNo(data);
  return Boolean(businessNo && companyBusinessNoAliases(companyId).includes(businessNo));
}

function mapProduct(documentId: string, data: DocumentData): Product {
  const comparison = asRecord(data.comparison);
  const productId = asString(data.product_id ?? data.productId, documentId);
  const firestoreStatus = asString(data.status, "active").toLowerCase();
  const productStatus =
    firestoreStatus === "archived"
      ? "archived"
      : firestoreStatus === "suspended" || firestoreStatus === "paused"
        ? "suspended"
      : firestoreStatus === "draft"
        ? "draft"
        : firestoreStatus === "pending_approval"
          ? "pending_approval"
          : firestoreStatus === "rejected"
            ? "rejected"
            : "approved";
  const closedMallPrice = asNumber(
    data.closed_mall_price ?? data.closedMallPrice ?? comparison.closedMallPrice,
    asNumber(data.price, 0),
  );
  const platformLowestPrice = asNumber(
    data.platform_lowest_price ?? data.platformLowestPrice ?? data.open_mall_price ?? data.openMallPrice ?? comparison.platformLowestPrice,
    0,
  );
  const listPrice = asNumber(data.list_price ?? data.listPrice ?? comparison.listPrice, 0);
  const priceComparisonVerified = asBoolean(
    data.price_comparison_verified ?? data.priceComparisonVerified ?? comparison.verified,
    false,
  );
  const priceComparisonStatus = asString(
    data.price_comparison_status ?? data.priceComparisonStatus ?? comparison.status,
    "pending_verification",
  );
  const imageUrl = asString(data.image_url ?? data.imageUrl, placeholderImage);
  const companyId = resolveProductCompanyId(documentId, data);
  const sellerBusinessNo = readProductBusinessNo(data);

  return {
    id: productId,
    companyId,
    sellerCompanyId: asString(data.seller_company_id ?? data.sellerCompanyId ?? data.pg_owner_company_id, companyId),
    sellerBusinessNo: sellerBusinessNo || undefined,
    sellerBusinessNoNormalized: sellerBusinessNo || undefined,
    sellerCompanyName: asString(data.seller_company_name ?? data.sellerCompanyName ?? data.company_name ?? data.companyName) || undefined,
    nurseryId: asString(data.nursery_id ?? data.nurseryId, ""),
    name: asString(data.title ?? data.name, "Untitled Firebase product"),
    brand: asString(data.brand, "A5 Partner"),
    subtitle: asString(data.subtitle, "Firebase products 컬렉션 베타 상품"),
    category: asString(data.category, "uncategorized"),
    status: productStatus,
    price: closedMallPrice,
    stock: asNumber(data.inventory ?? data.stock, 0),
    externalProductCode: asString(data.external_product_code ?? data.externalProductCode) || undefined,
    publicPath: asString(data.public_path ?? data.publicPath) || undefined,
    tabletPath: asString(data.tablet_path ?? data.tabletPath) || undefined,
    mobilePath: asString(data.mobile_path ?? data.mobilePath) || undefined,
    canonicalUrl: asString(data.canonical_url ?? data.canonicalUrl) || undefined,
    productUrl: asString(data.product_url ?? data.productUrl) || undefined,
    adTargetPath: asString(data.ad_target_path ?? data.adTargetPath) || undefined,
    mobileAdTargetPath: asString(data.mobile_ad_target_path ?? data.mobileAdTargetPath) || undefined,
    businessBrandPath: asString(data.business_brand_path ?? data.businessBrandPath ?? data.a5mall_brand_path) || undefined,
    businessProductPath: asString(data.business_product_path ?? data.businessProductPath ?? data.a5mall_product_path) || undefined,
    businessBrandUrl: asString(data.business_brand_url ?? data.businessBrandUrl) || undefined,
    businessProductUrl: asString(data.business_product_url ?? data.businessProductUrl) || undefined,
    urlVersion: asNumber(data.url_version ?? data.urlVersion, 0) || undefined,
    comparison: {
      listPrice,
      platformLowestPrice,
      closedMallPrice,
    },
    priceComparisonVerified,
    priceComparisonStatus,
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
    shippingFeePolicy: normalizeShippingFeePolicy(data.shipping_fee_policy ?? data.shippingFeePolicy),
    detailSections: detailSections(data.detail_sections ?? data.detailSections),
    firebaseStatus: firestoreStatus,
    source: asString(data.source, "firestore"),
    seededAt: asIsoDate(data.published_at ?? data.created_at ?? data.seeded_at ?? data.seededAt),
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

function optionVisible(data: DocumentData) {
  const status = asString(data.status, "active");
  return visibleFirestoreProductStatuses.includes(status);
}

function productVisible(data: DocumentData) {
  const status = asString(data.status, "active");
  const approvalStatus = asString(data.approval_status ?? data.approvalStatus);
  const productApprovalStatus = asString(data.product_approval_status ?? data.productApprovalStatus ?? approvalStatus);
  const companyApprovalStatus = asString(data.company_approval_status ?? data.companyApprovalStatus ?? approvalStatus);

  return (
    visibleFirestoreProductStatuses.includes(status) &&
    visibleApprovalStatuses.includes(productApprovalStatus) &&
    visibleApprovalStatuses.includes(companyApprovalStatus)
  );
}

function uniqueDocuments(documents: DocumentSnapshot<DocumentData>[]) {
  return [...new Map(documents.map((document) => [document.id, document])).values()];
}

function successfulSnapshots(results: PromiseSettledResult<QuerySnapshot<DocumentData>>[]) {
  return results
    .filter((result): result is PromiseFulfilledResult<QuerySnapshot<DocumentData>> => result.status === "fulfilled")
    .map((result) => result.value);
}

function matchesFilters(product: Product, filters?: ProductListFilters) {
  if (filters?.status && product.status !== filters.status) return false;
  if (filters?.category && product.category !== filters.category) return false;
  if (filters?.companyId && product.companyId !== filters.companyId) return false;
  return true;
}

async function readActiveProducts(filters?: ProductListFilters) {
  const db = getFirebaseDb();

  if (!db) {
    return repositoryError("EXTERNAL_BLOCKED", "Firebase 웹 설정이 누락되어 모의 대체 데이터를 사용합니다.");
  }

  try {
    const productRef = collection(db, productCollection);
    const companyScope = Boolean(filters?.companyId);
    const baseStatuses = companyScope ? companyManageableFirestoreProductStatuses : visibleFirestoreProductStatuses;
    const baseConstraints = [where("status", "in", baseStatuses)];
    const businessNoAliases = filters?.companyId ? companyBusinessNoAliases(filters.companyId) : [];
    const scopedQueries = filters?.companyId
      ? [
          getDocs(query(productRef, ...baseConstraints, where("company_id", "==", filters.companyId))),
          getDocs(query(productRef, ...baseConstraints, where("companyId", "==", filters.companyId))),
          ...businessNoAliases.flatMap((businessNo) =>
            productBusinessNoFields.map((field) => getDocs(query(productRef, ...baseConstraints, where(field, "==", businessNo)))),
          ),
        ]
      : [];
    const snapshots = filters?.companyId
      ? successfulSnapshots(await Promise.allSettled(scopedQueries))
      : [await getDocs(query(productRef, ...baseConstraints))];
    const directDocuments: DocumentSnapshot<DocumentData>[] = [];

    if (!snapshots.length && !directDocuments.length) {
      throw new Error("No Firestore product company scope query succeeded.");
    }

    const documents = uniqueDocuments([...snapshots.flatMap((snapshot) => snapshot.docs), ...directDocuments]).filter((item) => item.exists());
    const products = documents
      .filter((item) => !filters?.companyId || productMatchesCompanyScope(item.id, item.data(), filters.companyId))
      .filter((item) => companyScope || productVisible(item.data()))
      .map((item) => mapProduct(item.id, item.data()))
      .filter((product) => matchesFilters(product, filters));

    return repositoryOk(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore product read error.";
    return repositoryError("EXTERNAL_BLOCKED", `Firestore 상품 읽기에 실패하여 모의 대체 데이터를 사용합니다. ${message}`);
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
      return repositoryError("EXTERNAL_BLOCKED", "Firebase 웹 설정이 누락되어 모의 대체 데이터를 사용합니다.", productId);
    }

    try {
      const snapshot = await getDoc(doc(db, productCollection, productId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase 상품을 찾지 못해 모의 대체 데이터를 사용합니다.", productId);
      }

      const product = mapProduct(snapshot.id, snapshot.data());

      if (!productVisible(snapshot.data())) {
        return repositoryError("NOT_FOUND", "Firebase 상품이 승인 노출 상태가 아니어서 모의 대체 데이터를 사용합니다.", productId);
      }

      return repositoryOk(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore product read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore 상품 읽기에 실패하여 모의 대체 데이터를 사용합니다. ${message}`, productId);
    }
  },

  async listProductOptions(productId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase 웹 설정이 누락되어 모의 대체 데이터를 사용합니다.", productId);
    }

    try {
      const snapshot = await getDocs(query(collection(db, "product_options"), where("product_id", "==", productId), where("status", "==", "active")));
      return repositoryOk<ProductOption[]>(snapshot.docs.filter((item) => optionVisible(item.data())).map((item) => mapProductOption(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore product options read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore 상품 옵션 읽기에 실패하여 모의 대체 데이터를 사용합니다. ${message}`, productId);
    }
  },

  async listCompanyProducts(companyId, filters) {
    return readActiveProducts({ ...filters, companyId });
  },
};
