import { type Firestore } from "firebase-admin/firestore";
import { calculateItemsAmount, type CartItemInput, type ServerPricedItem } from "./types";
import { normalizeShippingFeePolicy } from "./shippingFee";

type CatalogSource = "firestore_products";

type CompanyIdentity = {
  companyId: string;
  companyName?: string;
  businessNo?: string;
  businessNoNormalized?: string;
};

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

export class CatalogPricingError extends Error {
  constructor(
    public readonly code: "PRODUCT_NOT_FOUND" | "PRODUCT_NOT_ACTIVE" | "OPTION_NOT_FOUND" | "INVENTORY_SHORTAGE" | "PRODUCT_COMPANY_MISSING" | "PRODUCT_COMPANY_MISMATCH",
    message: string,
    public readonly httpStatus = 409,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function priceCartItemsFromCatalog(db: Firestore, items: CartItemInput[]): Promise<ServerPricedItem[]> {
  const pricedItems: ServerPricedItem[] = [];
  const companyIdentityCache = new Map<string, Promise<CompanyIdentity>>();

  for (const item of items) {
    pricedItems.push(await priceCartItemFromCatalog(db, item, companyIdentityCache));
  }

  return pricedItems;
}

export function calculateCatalogAmount(items: CartItemInput[]): number {
  return calculateItemsAmount(items);
}

async function priceCartItemFromCatalog(
  db: Firestore,
  item: CartItemInput,
  companyIdentityCache: Map<string, Promise<CompanyIdentity>>,
): Promise<ServerPricedItem> {
  if (blockedLegacyMockProductIds.has(item.productId)) {
    throw new CatalogPricingError("PRODUCT_NOT_FOUND", "Legacy mock products cannot create a payment QR.", 404, {
      productId: item.productId,
    });
  }

  const product = await readCatalogProduct(db, item.productId);
  const option = item.optionId ? await readCatalogOption(db, item.productId, item.optionId) : undefined;
  const productPrice = fieldNumber(product.data, "closed_mall_price", "closedMallPrice", "price") ?? item.unitPrice;
  const priceDelta = option ? fieldNumber(option.data, "price_delta", "priceDelta") ?? 0 : 0;
  const unitPrice = productPrice + priceDelta;
  const productStock = fieldNumber(product.data, "stock", "inventory", "available_stock", "availableStock") ?? 0;
  const optionStock = option ? fieldNumber(option.data, "stock", "inventory", "available_stock", "availableStock") : undefined;
  const stock = optionStock ?? productStock;
  const reservedInventory = option
    ? fieldNumber(option.data, "reserved_inventory", "reservedInventory", "reserved_stock", "reservedStock") ?? 0
    : fieldNumber(product.data, "reserved_inventory", "reservedInventory", "reserved_stock", "reservedStock") ?? 0;
  const availableInventory = Math.max(0, stock - reservedInventory);

  if (item.quantity > availableInventory) {
    throw new CatalogPricingError("INVENTORY_SHORTAGE", "Inventory is not enough to create QR session.", 409, {
      productId: item.productId,
      optionId: item.optionId,
      requestedQuantity: item.quantity,
      availableInventory,
    });
  }

  const source: CatalogSource = "firestore_products";
  const productCompanyId = fieldString(product.data, "seller_company_id", "sellerCompanyId", "company_id", "companyId") ?? item.sellerCompanyId ?? item.companyId;
  const pgOwnerCompanyId = fieldString(product.data, "pg_owner_company_id", "pgOwnerCompanyId") ?? productCompanyId;

  if (!productCompanyId) {
    throw new CatalogPricingError("PRODUCT_COMPANY_MISSING", "Product does not have a seller company id.", 409, {
      productId: item.productId,
    });
  }

  const productBusinessNo = normalizeBusinessNoValue(
    fieldString(
      product.data,
      "seller_business_no_normalized",
      "sellerBusinessNoNormalized",
      "seller_business_no",
      "sellerBusinessNo",
      "company_business_no_normalized",
      "companyBusinessNoNormalized",
      "company_business_no",
      "companyBusinessNo",
      "business_registration_number_normalized",
      "business_registration_number",
    ),
  );
  const cartBusinessNo = normalizeBusinessNoValue(item.sellerBusinessNoNormalized ?? item.sellerBusinessNo);
  const companyIdentity = await readCompanyIdentity(db, productCompanyId, companyIdentityCache, productBusinessNo ?? cartBusinessNo);
  const companyBusinessNo = companyIdentity.businessNoNormalized;
  const sellerBusinessNoNormalized = productBusinessNo ?? companyBusinessNo ?? cartBusinessNo;

  if (productBusinessNo && companyBusinessNo && productBusinessNo !== companyBusinessNo) {
    throw new CatalogPricingError("PRODUCT_COMPANY_MISMATCH", "Product seller business number does not match the company document.", 409, {
      productId: item.productId,
      companyId: productCompanyId,
      productBusinessNo,
      companyBusinessNo,
    });
  }

  return {
    productId: item.productId,
    optionId: item.optionId,
    productName: fieldString(product.data, "title", "name") ?? item.productName,
    optionName: option ? fieldString(option.data, "name", "option_name", "optionName") ?? item.optionName : item.optionName,
    unitPrice,
    quantity: item.quantity,
    companyId: pgOwnerCompanyId,
    sellerCompanyId: productCompanyId,
    sellerBusinessNo: companyIdentity.businessNo ?? sellerBusinessNoNormalized ?? item.sellerBusinessNo,
    sellerBusinessNoNormalized,
    sellerCompanyName: fieldString(product.data, "seller_company_name", "sellerCompanyName", "company_name", "companyName") ?? companyIdentity.companyName ?? item.sellerCompanyName,
    commerceProgramId: asProgramChannel(fieldString(product.data, "commerce_program_id", "commerceProgramId", "channel")),
    pgOwnerCompanyId,
    supplierBusinessId: fieldString(product.data, "supplier_business_id", "supplierBusinessId", "product_owner_business_no"),
    resellerBusinessId: fieldString(product.data, "reseller_business_id", "resellerBusinessId", "selling_partner_business_no"),
    settlementRecipientBusinessId: fieldString(product.data, "settlement_recipient_business_id", "settlementRecipientBusinessId", "product_owner_business_no"),
    partnerPayoutUnitAmount: fieldNumber(product.data, "partner_payout_unit_amount", "partnerPayoutUnitAmount", "wholesale_unit_price"),
    grossMarginUnitAmount: fieldNumber(product.data, "gross_margin_unit_amount", "grossMarginUnitAmount", "partner_margin_unit_amount"),
    marginContractVersion: fieldString(product.data, "margin_contract_version", "marginContractVersion"),
    shippingFeePolicy: normalizeShippingFeePolicy(product.data.shipping_fee_policy ?? product.data.shippingFeePolicy ?? item.shippingFeePolicy),
    status: fieldString(product.data, "status") ?? "active",
    inventory: stock,
    reservedInventory,
    availableInventory,
    source,
  };
}

async function readCatalogProduct(db: Firestore, productId: string): Promise<{ data: Record<string, unknown>; source: CatalogSource }> {
  const snapshot = await db.collection("products").doc(productId).get();

  if (snapshot.exists) {
    const data = snapshot.data() ?? {};
    const status = fieldString(data, "status") ?? "";
    const companyId = fieldString(data, "company_id", "companyId") ?? "";

    if (!["active", "approved"].includes(status)) {
      throw new CatalogPricingError("PRODUCT_NOT_ACTIVE", "Product is not active or approved.", 409, { productId, status });
    }

    if (blockedLegacyMockCompanyIds.has(companyId)) {
      throw new CatalogPricingError("PRODUCT_NOT_FOUND", "Legacy mock company products cannot create a payment QR.", 404, {
        productId,
        companyId,
      });
    }

    return { data, source: "firestore_products" };
  }

  throw new CatalogPricingError("PRODUCT_NOT_FOUND", `products/${productId} was not found.`, 404, {
    collectionName: "products",
    documentId: productId,
  });
}

async function readCatalogOption(db: Firestore, productId: string, optionId: string): Promise<{ data: Record<string, unknown>; source: CatalogSource }> {
  const direct = await db.collection("product_options").doc(optionId).get();
  let option = direct.exists ? asRecord(direct.data()) : undefined;

  if (!option) {
    const snapshot = await db
      .collection("product_options")
      .where("product_id", "==", productId)
      .where("option_id", "==", optionId)
      .limit(1)
      .get();
    option = snapshot.docs[0]?.data();
  }

  const optionProductId = option ? fieldString(option, "product_id", "productId") : undefined;
  if (option && (!optionProductId || optionProductId === productId)) return { data: option, source: "firestore_products" };

  throw new CatalogPricingError("OPTION_NOT_FOUND", "Product option was not found.", 404, { productId, optionId, optionProductId });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function readCompanyIdentity(
  db: Firestore,
  companyId: string,
  cache: Map<string, Promise<CompanyIdentity>>,
  businessNoNormalized?: string,
): Promise<CompanyIdentity> {
  const cacheKey = `${companyId}::${businessNoNormalized ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const next = db.collection("companies").doc(companyId).get().then(async (snapshot) => {
    const fallbackByBusinessNo = snapshot.exists || !businessNoNormalized
      ? undefined
      : await readCompanyIdentityByBusinessNo(db, businessNoNormalized);
    const data = snapshot.exists ? snapshot.data() ?? {} : fallbackByBusinessNo?.data ?? {};
    const businessNo = fieldString(data, "business_registration_number", "businessRegistrationNumber", "business_no", "businessNo", "company_business_no", "companyBusinessNo");
    const resolvedBusinessNoNormalized =
      normalizeBusinessNoValue(
        fieldString(data, "business_registration_number_normalized", "businessNoNormalized", "company_business_no_normalized", "companyBusinessNoNormalized"),
      ) ?? normalizeBusinessNoValue(businessNo);

    return {
      companyId: snapshot.exists ? companyId : fallbackByBusinessNo?.id ?? companyId,
      companyName: fieldString(data, "name", "company_name", "companyName"),
      businessNo,
      businessNoNormalized: resolvedBusinessNoNormalized,
    };
  });

  cache.set(cacheKey, next);
  return next;
}

async function readCompanyIdentityByBusinessNo(db: Firestore, businessNoNormalized: string) {
  const fields = [
    "business_registration_number_normalized",
    "businessRegistrationNumberNormalized",
    "company_business_no_normalized",
    "companyBusinessNoNormalized",
  ];

  for (const field of fields) {
    const snapshot = await db.collection("companies").where(field, "==", businessNoNormalized).limit(1).get();
    const document = snapshot.docs[0];
    if (document) return { id: document.id, data: document.data() ?? {} };
  }

  return undefined;
}

function normalizeBusinessNoValue(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/[^0-9]/g, "");
  return text ? text : undefined;
}

function fieldString(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return undefined;
}

function fieldNumber(data: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }

  return undefined;
}

function asProgramChannel(value: unknown): "a5s" | "a5ws" | "a5ls" | undefined {
  return value === "a5s" || value === "a5ws" || value === "a5ls" ? value : undefined;
}
