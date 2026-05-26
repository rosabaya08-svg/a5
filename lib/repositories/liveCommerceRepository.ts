import {
  commerceRepositories,
  firebaseRepositories,
  mockRepositories,
  readRepositoryWithSource,
  type RepositoryReadSource,
} from "@/lib/repositories";
import { repositoryData, type OrderWithItems } from "@/lib/repositories/types";
import type { MallProductProfile } from "@/data/mockShopContent";
import type { Nursery, Product, ProductOption, QrPaymentSession, Room } from "@/types/commerce";

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

export async function getLiveStorefrontContent() {
  return repositoryData(await commerceRepositories.content.getStorefrontContent());
}

export async function getLiveProductProfile(productId: string): Promise<MallProductProfile | undefined> {
  const result = await commerceRepositories.content.getProductProfileById(productId);
  return result.ok ? result.data : undefined;
}
