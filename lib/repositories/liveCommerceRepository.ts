import {
  commerceRepositories,
  firebaseRepositories,
  mockRepositories,
  readRepositoryWithSource,
  type RepositoryReadSource,
} from "@/lib/repositories";
import { repositoryData, type InventoryMovement, type OrderWithItems } from "@/lib/repositories/types";
import type { MallProductProfile } from "@/data/mockShopContent";
import type { Nursery, Order, OrderItem, Product, ProductOption, QrPaymentSession, Room, Tablet } from "@/types/commerce";

export type LiveReadSource = RepositoryReadSource;

export type LiveRead<T> = {
  data: T;
  source: LiveReadSource;
  reason?: string;
};

export function productSourceLabel(source: LiveReadSource) {
  return source === "Firestore" ? "Firebase products" : "mock fallback";
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
  return readRepositoryWithSource(
    () => firebaseRepositories.products.listApprovedProducts(),
    () => mockRepositories.products.listApprovedProducts(),
    { fallbackOnEmpty: true, emptyReason: "Firestore products returned empty." },
  );
}

export async function getLiveProductById(productId: string): Promise<LiveRead<Product>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.products.getProductById(productId),
    () => mockRepositories.products.getProductById(productId),
  );
}

export async function getLiveProductOptions(productId: string): Promise<LiveRead<ProductOption[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.productOptions.listProductOptions(productId),
    () => mockRepositories.productOptions.listProductOptions(productId),
    { fallbackOnEmpty: true, emptyReason: "Firestore product options returned empty." },
  );
}

export async function getLiveCompanyProducts(companyId: string): Promise<LiveRead<Product[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.products.listCompanyProducts(companyId),
    () => mockRepositories.products.listCompanyProducts(companyId),
    { fallbackOnEmpty: true, emptyReason: "Firestore company products returned empty." },
  );
}

export async function getLiveCompanyOrderItems(companyId: string): Promise<LiveRead<OrderItem[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.orders.listOrderItemsByCompany(companyId),
    () => mockRepositories.orders.listOrderItemsByCompany(companyId),
    { fallbackOnEmpty: true, emptyReason: "Firestore company order items returned empty." },
  );
}

export async function getLiveCompanyInventoryMovements(companyId: string): Promise<LiveRead<InventoryMovement[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.inventory.listInventoryMovements({ companyId }),
    () => mockRepositories.inventory.listInventoryMovements({ companyId }),
    { fallbackOnEmpty: true, emptyReason: "Firestore company inventory movements returned empty." },
  );
}

export type CompanySettlementPreview = {
  companyId: string;
  period: string;
  grossAmount: number;
  commissionAmount: number;
  refundHoldAmount: number;
  payoutAmount: number;
  itemCount: number;
  basis: "order_items";
};

export async function getLiveCompanySettlementPreview(companyId: string): Promise<LiveRead<CompanySettlementPreview>> {
  const orderItems = await getLiveCompanyOrderItems(companyId);
  const grossAmount = orderItems.data.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const payoutAmount = orderItems.data.reduce((total, item) => total + item.settlementAmount, 0);

  return {
    data: {
      companyId,
      period: "2026-05",
      grossAmount,
      commissionAmount: Math.max(grossAmount - payoutAmount, 0),
      refundHoldAmount: 0,
      payoutAmount,
      itemCount: orderItems.data.length,
      basis: "order_items",
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
      source: "mock fallback",
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
      source: "mock fallback",
      reason: error instanceof Error ? error.message : "Room repository lookup failed.",
    };
  }
}

export async function getLiveNurseryRooms(nurseryId: string): Promise<LiveRead<Room[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.rooms.listRoomsByNursery(nurseryId),
    () => mockRepositories.rooms.listRoomsByNursery(nurseryId),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery rooms returned empty." },
  );
}

export async function getLiveNurseryTablets(nurseryId: string): Promise<LiveRead<Tablet[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.tablets.listTabletsByNursery(nurseryId),
    () => mockRepositories.tablets.listTabletsByNursery(nurseryId),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery tablets returned empty." },
  );
}

export async function getLiveNurseryQrSessions(nurseryId: string): Promise<LiveRead<QrPaymentSession[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.qrSessions.listQrSessions({ nurseryId }),
    () => mockRepositories.qrSessions.listQrSessions({ nurseryId }),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery QR sessions returned empty." },
  );
}

export async function getLiveNurseryOrders(nurseryId: string): Promise<LiveRead<Order[]>> {
  return readRepositoryWithSource(
    () => firebaseRepositories.orders.listOrdersByNursery(nurseryId),
    () => mockRepositories.orders.listOrdersByNursery(nurseryId),
    { fallbackOnEmpty: true, emptyReason: "Firestore nursery orders returned empty." },
  );
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
    reason: orders.reason ?? "pickup_events collection is prepared as a server-write collection; preview is derived from scoped orders.",
  };
}

export async function getLiveStorefrontContent() {
  return repositoryData(await commerceRepositories.content.getStorefrontContent());
}

export async function getLiveProductProfile(productId: string): Promise<MallProductProfile | undefined> {
  const result = await commerceRepositories.content.getProductProfileById(productId);
  return result.ok ? result.data : undefined;
}
