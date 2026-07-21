import type { Product } from "@/types/commerce";

export const REGISTERED_CLOSED_MALL_BUSINESS_NO = "7592901311";

const TEST_1004_PRODUCT_ID = "product-test-1004";
const TEST_1004_CATEGORY = "유아용품";

const blockedLegacyMockProductIds = new Set([
  "product-care-kit",
  "product-pillow",
  "product-bag",
  "product-robe",
  "product-tea",
  "product-snack",
  "product-blanket",
]);

const blockedLegacyMockCompanyIds = new Set(["company-sanho-care", "company-bebe-lux", "company-momtable"]);

export function isLegacyMockClosedMallProduct(product: Product) {
  return blockedLegacyMockProductIds.has(product.id) || blockedLegacyMockCompanyIds.has(product.companyId);
}

export function isSharedClosedMallVisibleProduct(product: Product) {
  return product.status === "approved" && !isLegacyMockClosedMallProduct(product);
}

function normalizeSharedClosedMallProduct(product: Product) {
  if (product.id !== TEST_1004_PRODUCT_ID) return product;

  return {
    ...product,
    brand: REGISTERED_CLOSED_MALL_BUSINESS_NO,
    category: TEST_1004_CATEGORY,
    tags: [...new Set([...(product.tags ?? []), REGISTERED_CLOSED_MALL_BUSINESS_NO, TEST_1004_CATEGORY, "1004"])],
  };
}

export function normalizeSharedClosedMallProducts(products: Product[]) {
  const byId = new Map<string, Product>();

  for (const product of products) {
    if (!isSharedClosedMallVisibleProduct(product)) continue;
    byId.set(product.id, normalizeSharedClosedMallProduct(product));
  }

  return sortSharedClosedMallProducts([...byId.values()]);
}

export function mergeSharedClosedMallProducts(products: Product[], fallbackProducts: Product[] = []) {
  const byId = new Map<string, Product>();

  for (const product of normalizeSharedClosedMallProducts(products)) {
    byId.set(product.id, product);
  }

  for (const product of normalizeSharedClosedMallProducts(fallbackProducts)) {
    if (!byId.has(product.id)) {
      byId.set(product.id, product);
    }
  }

  return sortSharedClosedMallProducts([...byId.values()]);
}

function sortSharedClosedMallProducts(products: Product[]) {
  return [...products].sort((left, right) => {
    const leftKey = productSortKey(left);
    const rightKey = productSortKey(right);
    return leftKey.localeCompare(rightKey, "ko-KR");
  });
}

function productSortKey(product: Product) {
  return [product.category, product.brand ?? "", product.name, product.id].join("|");
}
