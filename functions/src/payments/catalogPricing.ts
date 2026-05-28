import { type Firestore } from "firebase-admin/firestore";
import { calculateItemsAmount, type CartItemInput, type ServerPricedItem } from "./types";

type CatalogSource = "firestore_products" | "mock_products";

type CatalogProduct = {
  id: string;
  companyId: string;
  price: number;
  stock: number;
  status: "active" | "approved";
};

type CatalogOption = {
  id: string;
  productId: string;
  name: string;
  priceDelta: number;
  stock: number;
};

export class CatalogPricingError extends Error {
  constructor(
    public readonly code: "PRODUCT_NOT_FOUND" | "PRODUCT_NOT_ACTIVE" | "OPTION_NOT_FOUND" | "INVENTORY_SHORTAGE",
    message: string,
    public readonly httpStatus = 409,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const mockProducts: Record<string, CatalogProduct> = {
  "product-care-kit": { id: "product-care-kit", companyId: "company-sanho-care", price: 69000, stock: 27, status: "approved" },
  "product-pillow": { id: "product-pillow", companyId: "company-test-1004", price: 58000, stock: 24, status: "approved" },
  "product-bag": { id: "product-bag", companyId: "company-bebe-lux", price: 128000, stock: 14, status: "approved" },
  "product-robe": { id: "product-robe", companyId: "company-sanho-care", price: 54000, stock: 21, status: "approved" },
  "product-tea": { id: "product-tea", companyId: "company-momtable", price: 36000, stock: 32, status: "approved" },
};

const mockOptions: Record<string, CatalogOption> = {
  "opt-care-basic": { id: "opt-care-basic", productId: "product-care-kit", name: "Basic", priceDelta: 0, stock: 18 },
  "opt-care-gift": { id: "opt-care-gift", productId: "product-care-kit", name: "Gift wrap", priceDelta: 6000, stock: 9 },
  "opt-care-s": { id: "opt-care-s", productId: "product-care-kit", name: "Basic set", priceDelta: 0, stock: 18 },
  "opt-care-l": { id: "opt-care-l", productId: "product-care-kit", name: "Gift package", priceDelta: 12000, stock: 9 },
  "opt-pillow-basic": { id: "opt-pillow-basic", productId: "product-pillow", name: "Basic", priceDelta: 0, stock: 16 },
  "opt-pillow-cover": { id: "opt-pillow-cover", productId: "product-pillow", name: "Cover add-on", priceDelta: 9000, stock: 8 },
  "opt-bag-basic": { id: "opt-bag-basic", productId: "product-bag", name: "Basic", priceDelta: 0, stock: 14 },
  "opt-bag-cream": { id: "opt-bag-cream", productId: "product-bag", name: "Cream", priceDelta: 0, stock: 5 },
  "opt-bag-charcoal": { id: "opt-bag-charcoal", productId: "product-bag", name: "Charcoal", priceDelta: 0, stock: 3 },
  "opt-robe-basic": { id: "opt-robe-basic", productId: "product-robe", name: "Basic", priceDelta: 0, stock: 21 },
  "opt-robe-m": { id: "opt-robe-m", productId: "product-robe", name: "M", priceDelta: 0, stock: 7 },
  "opt-robe-l": { id: "opt-robe-l", productId: "product-robe", name: "L", priceDelta: 0, stock: 5 },
  "opt-tea-basic": { id: "opt-tea-basic", productId: "product-tea", name: "Basic", priceDelta: 0, stock: 32 },
  "opt-tea-large": { id: "opt-tea-large", productId: "product-tea", name: "Large", priceDelta: 28000, stock: 12 },
};

export async function priceCartItemsFromCatalog(db: Firestore, items: CartItemInput[]): Promise<ServerPricedItem[]> {
  const pricedItems: ServerPricedItem[] = [];

  for (const item of items) {
    pricedItems.push(await priceCartItemFromCatalog(db, item));
  }

  return pricedItems;
}

export function calculateCatalogAmount(items: CartItemInput[]): number {
  return calculateItemsAmount(items);
}

async function priceCartItemFromCatalog(db: Firestore, item: CartItemInput): Promise<ServerPricedItem> {
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

  const source: CatalogSource = product.source === "mock_products" || option?.source === "mock_products" ? "mock_products" : "firestore_products";

  return {
    productId: item.productId,
    optionId: item.optionId,
    productName: fieldString(product.data, "title", "name") ?? item.productName,
    optionName: option ? fieldString(option.data, "name", "option_name", "optionName") ?? item.optionName : item.optionName,
    unitPrice,
    quantity: item.quantity,
    companyId: fieldString(product.data, "company_id", "companyId") ?? item.companyId,
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

    if (!["active", "approved"].includes(status)) {
      throw new CatalogPricingError("PRODUCT_NOT_ACTIVE", "Product is not active or approved.", 409, { productId, status });
    }

    return { data, source: "firestore_products" };
  }

  const product = mockProducts[productId];

  if (!product) {
    throw new CatalogPricingError("PRODUCT_NOT_FOUND", `products/${productId} was not found.`, 404, {
      collectionName: "products",
      documentId: productId,
    });
  }

  return {
    source: "mock_products",
    data: {
      product_id: product.id,
      company_id: product.companyId,
      status: product.status,
      price: product.price,
      closed_mall_price: product.price,
      stock: product.stock,
      inventory: product.stock,
      source: "mock_qr_catalog",
    },
  };
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

  const mockOption = mockOptions[optionId] ?? (optionId === "default" ? makeDefaultMockOption(productId) : undefined);
  if (mockOption?.productId === productId) {
    return {
      source: "mock_products",
      data: {
        option_id: mockOption.id,
        product_id: mockOption.productId,
        name: mockOption.name,
        status: "active",
        price_delta: mockOption.priceDelta,
        stock: mockOption.stock,
        inventory: mockOption.stock,
        source: "mock_qr_catalog",
      },
    };
  }

  throw new CatalogPricingError("OPTION_NOT_FOUND", "Product option was not found.", 404, { productId, optionId, optionProductId });
}

function makeDefaultMockOption(productId: string): CatalogOption | undefined {
  const product = mockProducts[productId];
  return product ? { id: "default", productId, name: "Default", priceDelta: 0, stock: product.stock } : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
