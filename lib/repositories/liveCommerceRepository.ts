import {
  commerceRepositories,
  firebaseRepositories,
  mockRepositories,
  readRepositoryWithSource,
  type RepositoryReadSource,
} from "@/lib/repositories";
import {
  repositoryData,
  type InventoryMovement,
  type OrderWithItems,
  type StorefrontContent,
  type StorefrontRuntimeSnapshot,
} from "@/lib/repositories/types";
import {
  buildPayupSalesCommissionPreview,
  type PayupReconciliationStatus,
  type PayupSalesCommissionBasis,
} from "@/lib/payments/payupReconciliation";
import type { MallProductProfile } from "@/types/storefrontContent";
import { safeStorefrontMediaUrl } from "@/lib/storefront/safeMediaUrl";
import type { Company, Nursery, Order, OrderItem, Product, ProductOption, QrPaymentSession, Room, Tablet } from "@/types/commerce";

export type LiveReadSource = RepositoryReadSource;

export type LiveRead<T> = {
  data: T;
  source: LiveReadSource;
  reason?: string;
};

const emptyBanner = {
  id: "live-read-empty",
  title: "",
  subtitle: "",
  eyebrow: "",
  href: "/tablet/products/",
  imageUrl: "/file.svg",
  tone: "rose" as const,
};

const emptyStorefrontContent: StorefrontContent = {
  heroBanner: emptyBanner,
  promoBanners: [
    { ...emptyBanner, id: "live-read-empty-promo-1" },
    { ...emptyBanner, id: "live-read-empty-promo-2" },
    { ...emptyBanner, id: "live-read-empty-promo-3" },
    { ...emptyBanner, id: "live-read-empty-promo-4" },
  ],
  brands: [],
  categories: [],
  productProfiles: [],
  marketingSlots: [],
};

const emptyStorefrontRuntimeSnapshot: StorefrontRuntimeSnapshot = {
  content: emptyStorefrontContent,
  products: [],
};

function cleanGalleryUrls(gallery: string[]) {
  return gallery.map((item) => safeStorefrontMediaUrl(item)).filter(Boolean);
}

function cleanStorefrontContent(content: StorefrontContent): StorefrontContent {
  return {
    ...content,
    heroBanner: {
      ...content.heroBanner,
      imageUrl: safeStorefrontMediaUrl(content.heroBanner.imageUrl),
    },
    promoBanners: content.promoBanners.map((banner) => ({
      ...banner,
      imageUrl: safeStorefrontMediaUrl(banner.imageUrl),
    })),
    brands: content.brands
      .map((brand) => ({
        ...brand,
        logoUrl: safeStorefrontMediaUrl(brand.logoUrl),
      }))
      .filter((brand) => Boolean(brand.logoUrl)),
    productProfiles: content.productProfiles.map((profile) => {
      const gallery = cleanGalleryUrls(profile.gallery);
      return {
        ...profile,
        imageUrl: safeStorefrontMediaUrl(profile.imageUrl) || gallery[0] || "",
        gallery,
      };
    }),
  };
}

function failedLiveRead<T>(data: T, error: unknown, fallbackReason: string): LiveRead<T> {
  return {
    data,
    source: "Firestore",
    reason: error instanceof Error ? error.message : fallbackReason,
  };
}

export function productSourceLabel(source: LiveReadSource) {
  return source === "Firestore" ? "Firebase 상품" : "모의 대체 데이터";
}

export async function getLiveQrSessionByShortCode(shortCode: string): Promise<LiveRead<QrPaymentSession>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.qrSessions.getQrSessionByShortCode(shortCode),
    () => mockRepositories.qrSessions.getQrSessionByShortCode(shortCode),
  );
}

export async function getLiveOrderByOrderNo(orderNo: string): Promise<LiveRead<OrderWithItems>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.orders.getOrderByOrderNo(orderNo),
    () => mockRepositories.orders.getOrderByOrderNo(orderNo),
  );
}

export async function getLiveApprovedProducts(): Promise<LiveRead<Product[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.products.listApprovedProducts(),
    () => mockRepositories.products.listApprovedProducts(),
    { fallbackOnEmpty: true, emptyReason: "Firestore 상품 결과가 비어 있습니다." },
    );
  } catch (error) {
    return failedLiveRead([], error, "Approved product live read failed.");
  }
}

export async function getLiveProductById(productId: string): Promise<LiveRead<Product>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.products.getProductById(productId),
    () => mockRepositories.products.getProductById(productId),
  );
}

export async function getLiveProductOptions(productId: string): Promise<LiveRead<ProductOption[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.productOptions.listProductOptions(productId),
    () => mockRepositories.productOptions.listProductOptions(productId),
    );
  } catch (error) {
    return failedLiveRead([], error, "Product option live read failed.");
  }
}

export async function getLiveCompanyProducts(companyId: string): Promise<LiveRead<Product[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.products.listCompanyProducts(companyId),
    () => mockRepositories.products.listCompanyProducts(companyId),
    );
  } catch (error) {
    return failedLiveRead([], error, "Company product live read failed.");
  }
}

export async function getLiveCompanyById(companyId: string): Promise<LiveRead<Company | undefined>> {
  try {
    return await readRepositoryWithSource(
      () => firebaseRepositories.companies.getCompanyById(companyId),
      () => mockRepositories.companies.getCompanyById(companyId),
    );
  } catch (error) {
    return {
      data: undefined,
      source: "Firestore",
      reason: error instanceof Error ? error.message : "Company repository lookup failed.",
    };
  }
}

export async function getLiveCompanyOrderItems(companyId: string): Promise<LiveRead<OrderItem[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.orders.listOrderItemsByCompany(companyId),
    () => mockRepositories.orders.listOrderItemsByCompany(companyId),
    );
  } catch (error) {
    return failedLiveRead([], error, "Company order item live read failed.");
  }
}

export async function getLiveCompanyOrders(companyId: string): Promise<LiveRead<Order[]>> {
  const orderItems = await getLiveCompanyOrderItems(companyId);
  const orderNos = [...new Set(orderItems.data.map((item) => item.orderId).filter(Boolean))];
  const orderReads = await Promise.all(
    orderNos.map(async (orderNo) => {
      try {
        return await getLiveOrderByOrderNo(orderNo);
      } catch (error) {
        return {
          data: undefined,
          source: "Firestore" as const,
          reason: error instanceof Error ? error.message : `Order lookup failed for ${orderNo}.`,
        };
      }
    }),
  );
  const successfulOrders = orderReads
    .map((read) => read.data?.order)
    .filter((order): order is Order => Boolean(order));
  const source =
    orderItems.source === "Firestore" && orderReads.every((read) => read.source === "Firestore")
      ? "Firestore"
      : "Firestore";
  const reason = [orderItems.reason, ...orderReads.map((read) => read.reason)].filter(Boolean).join(" / ") || undefined;

  return {
    data: successfulOrders,
    source,
    reason,
  };
}

export async function getLiveCompanyProductOptions(companyId: string): Promise<LiveRead<ProductOption[]>> {
  const products = await getLiveCompanyProducts(companyId);
  const optionReads = await Promise.all(products.data.map((product) => getLiveProductOptions(product.id)));

  return {
    data: optionReads.flatMap((read) => read.data),
    source: products.source === "Firestore" && optionReads.every((read) => read.source === "Firestore") ? "Firestore" : "Firestore",
    reason: [products.reason, ...optionReads.map((read) => read.reason)].filter(Boolean).join(" / ") || undefined,
  };
}

export async function getLiveCompanyInventoryMovements(companyId: string): Promise<LiveRead<InventoryMovement[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.inventory.listInventoryMovements({ companyId }),
    () => mockRepositories.inventory.listInventoryMovements({ companyId }),
    );
  } catch (error) {
    return failedLiveRead([], error, "Company inventory live read failed.");
  }
}

export type CompanySettlementPreview = {
  companyId: string;
  period: string;
  grossAmount: number;
  grossSalesAmount: number;
  commissionAmount: number;
  a5CommissionRate: number;
  a5CommissionAmount: number;
  refundHoldAmount: number;
  payoutAmount: number;
  payupConfirmedAmount: number;
  payupDataLinked: boolean;
  reconciliationStatus: PayupReconciliationStatus;
  itemCount: number;
  basis: PayupSalesCommissionBasis;
  settlementOwner: "payup";
  payupSettlementOwner: "payup";
  settlementExecutionBlocked: true;
  a5SettlementExecutionBlocked: true;
};

export async function getLiveCompanySettlementPreview(companyId: string): Promise<LiveRead<CompanySettlementPreview>> {
  const orderItems = await getLiveCompanyOrderItems(companyId);
  const preview = buildPayupSalesCommissionPreview({ companyId, orderItems: orderItems.data });

  return {
    data: {
      companyId,
      period: preview.period,
      grossAmount: preview.grossSalesAmount,
      grossSalesAmount: preview.grossSalesAmount,
      commissionAmount: preview.a5CommissionAmount,
      a5CommissionRate: preview.a5CommissionRate,
      a5CommissionAmount: preview.a5CommissionAmount,
      refundHoldAmount: 0,
      payoutAmount: 0,
      payupConfirmedAmount: preview.payupConfirmedAmount,
      payupDataLinked: preview.payupDataLinked,
      reconciliationStatus: preview.reconciliationStatus,
      itemCount: preview.itemCount,
      basis: preview.basis,
      settlementOwner: "payup",
      payupSettlementOwner: "payup",
      settlementExecutionBlocked: true,
      a5SettlementExecutionBlocked: true,
    },
    source: orderItems.source,
    reason: orderItems.reason,
  };
}

export async function getLiveNurseryById(nurseryId: string): Promise<LiveRead<Nursery | undefined>> {
  try {
    return await readRepositoryWithSource(
      () => firebaseRepositories.nurseries.getNurseryById(nurseryId),
      () => mockRepositories.nurseries.getNurseryById(nurseryId),
    );
  } catch (error) {
    return {
      data: undefined,
      source: "Firestore",
      reason: error instanceof Error ? error.message : "Nursery repository lookup failed.",
    };
  }
}

export async function getLiveRoomById(roomId: string): Promise<LiveRead<Room | undefined>> {
  try {
    return await readRepositoryWithSource(
      () => firebaseRepositories.rooms.getRoomById(roomId),
      () => mockRepositories.rooms.getRoomById(roomId),
    );
  } catch (error) {
    return {
      data: undefined,
      source: "Firestore",
      reason: error instanceof Error ? error.message : "Room repository lookup failed.",
    };
  }
}

export async function getLiveNurseryRooms(nurseryId: string): Promise<LiveRead<Room[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.rooms.listRoomsByNursery(nurseryId),
    () => mockRepositories.rooms.listRoomsByNursery(nurseryId),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery rooms returned empty." },
    );
  } catch (error) {
    return failedLiveRead([], error, "Nursery room live read failed.");
  }
}

export async function getLiveNurseryTablets(nurseryId: string): Promise<LiveRead<Tablet[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.tablets.listTabletsByNursery(nurseryId),
    () => mockRepositories.tablets.listTabletsByNursery(nurseryId),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery tablets returned empty." },
    );
  } catch (error) {
    return failedLiveRead([], error, "Nursery tablet live read failed.");
  }
}

export async function getLiveNurseryQrSessions(nurseryId: string): Promise<LiveRead<QrPaymentSession[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.qrSessions.listQrSessions({ nurseryId }),
    () => mockRepositories.qrSessions.listQrSessions({ nurseryId }),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery QR sessions returned empty." },
    );
  } catch (error) {
    return failedLiveRead([], error, "Nursery QR session live read failed.");
  }
}

export async function getLiveNurseryQrSessionsByScope(input: {
  nurseryId: string;
  roomIds: string[];
  tabletIds: string[];
}): Promise<LiveRead<QrPaymentSession[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.qrSessions.listQrSessionsByRoomOrTablet(input),
    () => mockRepositories.qrSessions.listQrSessions({ nurseryId: input.nurseryId }),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery scoped QR sessions returned empty." },
    );
  } catch (error) {
    return failedLiveRead([], error, "Nursery scoped QR session live read failed.");
  }
}

export async function getLiveNurseryOrders(nurseryId: string): Promise<LiveRead<Order[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.orders.listOrdersByNursery(nurseryId),
    () => mockRepositories.orders.listOrdersByNursery(nurseryId),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery orders returned empty." },
    );
  } catch (error) {
    return failedLiveRead([], error, "Nursery order live read failed.");
  }
}

export async function getLiveOrderItemsByOrderNos(orderNos: string[]): Promise<LiveRead<OrderItem[]>> {
  try {
    return await readRepositoryWithSource(
    () => firebaseRepositories.orders.listOrderItemsByOrderNos(orderNos),
    () => mockRepositories.orders.listOrderItemsByOrderNos(orderNos),
    { fallbackOnEmpty: false, emptyReason: "Firestore order items by order_no returned empty." },
    );
  } catch (error) {
    return failedLiveRead([], error, "Order item live read failed.");
  }
}

export type NurseryPickupEventPreview = {
  id: string;
  nurseryId: string;
  roomId: string;
  orderNo: string;
  status: Order["status"];
  amount: number;
  createdAt: string;
  sourceCollection: "orders" | "pickup_events";
};

export async function getLiveNurseryPickupEvents(nurseryId: string): Promise<LiveRead<NurseryPickupEventPreview[]>> {
  const orders = await getLiveNurseryOrders(nurseryId);

  return {
    data: orders.data
      .filter((order) => order.deliveryMethod === "pickup")
      .map((order) => ({
        id: `pickup-${order.id}`,
        nurseryId: order.nurseryId,
        roomId: order.roomId,
        orderNo: order.orderNo,
        status: order.status,
        amount: order.totalAmount,
        createdAt: order.createdAt,
        sourceCollection: "orders",
      })),
    source: orders.source,
    reason: orders.reason ?? "pickup_events 컬렉션은 서버 쓰기 전용으로 준비되어 있어, 미리보기는 범위가 제한된 주문에서 파생합니다.",
  };
}

export async function getLiveStorefrontContent() {
  try {
    return cleanStorefrontContent(repositoryData(await commerceRepositories.content.getStorefrontContent()));
  } catch {
    return emptyStorefrontContent;
  }
}

export async function getLiveStorefrontRuntimeSnapshot(): Promise<LiveRead<StorefrontRuntimeSnapshot>> {
  try {
    return await readRepositoryWithSource(
      () => commerceRepositories.content.getStorefrontRuntimeSnapshot(),
      () => mockRepositories.content.getStorefrontRuntimeSnapshot(),
    );
  } catch (error) {
    return failedLiveRead(emptyStorefrontRuntimeSnapshot, error, "Storefront runtime snapshot live read failed.");
  }
}

export async function getLiveProductProfile(productId: string): Promise<MallProductProfile | undefined> {
  const result = await commerceRepositories.content.getProductProfileById(productId);
  return result.ok ? result.data : undefined;
}
