import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type {
  CommerceRepositories,
  InventoryMovementListFilters,
  OrderItemListFilters,
  OrderListFilters,
  ProductListFilters,
  RepositoryResult,
} from "@/lib/repositories/types";
import type { QrSessionStatus } from "@/types/status";

type LiveReadResponse<T> =
  | {
      ok: true;
      data: T;
      source?: string;
    }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
        httpStatus?: number;
      };
    };

function liveReadToken() {
  return process.env.A5_COMMERCE_LIVE_READ_TOKEN?.trim() || "";
}

async function liveRead<T>(repository: string, method: string, args: unknown[] = []): Promise<RepositoryResult<T>> {
  const url = getPaymentFunctionUrl("commerceLiveRead");

  if (!url) {
    return repositoryError("EXTERNAL_BLOCKED", "commerceLiveRead Functions URL is not configured.");
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const token = liveReadToken();

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ repository, method, args }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as LiveReadResponse<T> | null;

    if (response.ok && payload?.ok) {
      return repositoryOk(payload.data);
    }

    return repositoryError(
      "EXTERNAL_BLOCKED",
      payload?.ok === false && payload.error?.message
        ? payload.error.message
        : `commerceLiveRead failed with HTTP ${response.status}.`,
    );
  } catch (error) {
    return repositoryError(
      "EXTERNAL_BLOCKED",
      error instanceof Error ? `commerceLiveRead request failed. ${error.message}` : "commerceLiveRead request failed.",
    );
  }
}

function notImplemented<T>(method: string): Promise<RepositoryResult<T>> {
  return Promise.resolve(repositoryError("NOT_IMPLEMENTED", `${method} must be executed by a dedicated Firebase Function, not server live-read.`));
}

export const functionsLiveRepositories: CommerceRepositories = {
  products: {
    listProducts(filters?: ProductListFilters) {
      return liveRead("products", "listProducts", [filters]);
    },
    listApprovedProducts(filters) {
      return liveRead("products", "listApprovedProducts", [filters]);
    },
    getProductById(productId) {
      return liveRead("products", "getProductById", [productId]);
    },
    listProductOptions(productId) {
      return liveRead("products", "listProductOptions", [productId]);
    },
    listCompanyProducts(companyId, filters) {
      return liveRead("products", "listCompanyProducts", [companyId, filters]);
    },
  },
  productOptions: {
    listProductOptions(productId) {
      return liveRead("productOptions", "listProductOptions", [productId]);
    },
    getProductOptionById(optionId) {
      return liveRead("productOptions", "getProductOptionById", [optionId]);
    },
  },
  companies: {
    listCompanies(filters) {
      return liveRead("companies", "listCompanies", [filters]);
    },
    getCompanyById(companyId) {
      return liveRead("companies", "getCompanyById", [companyId]);
    },
  },
  nurseries: {
    listNurseries(filters) {
      return liveRead("nurseries", "listNurseries", [filters]);
    },
    getNurseryById(nurseryId) {
      return liveRead("nurseries", "getNurseryById", [nurseryId]);
    },
  },
  rooms: {
    listRooms(filters) {
      return liveRead("rooms", "listRooms", [filters]);
    },
    listRoomsByNursery(nurseryId) {
      return liveRead("rooms", "listRoomsByNursery", [nurseryId]);
    },
    getRoomById(roomId) {
      return liveRead("rooms", "getRoomById", [roomId]);
    },
  },
  tablets: {
    listTablets(filters) {
      return liveRead("tablets", "listTablets", [filters]);
    },
    listTabletsByNursery(nurseryId) {
      return liveRead("tablets", "listTabletsByNursery", [nurseryId]);
    },
    getTabletById(tabletId) {
      return liveRead("tablets", "getTabletById", [tabletId]);
    },
  },
  qrSessions: {
    listQrSessions(filters?: { status?: QrSessionStatus; nurseryId?: string }) {
      return liveRead("qrSessions", "listQrSessions", [filters]);
    },
    listQrSessionsByRoomOrTablet(filters) {
      return liveRead("qrSessions", "listQrSessionsByRoomOrTablet", [filters]);
    },
    getQrSessionByShortCode(shortCode) {
      return liveRead("qrSessions", "getQrSessionByShortCode", [shortCode]);
    },
    createQrSessionDraft() {
      return notImplemented("qrSessions.createQrSessionDraft");
    },
    markQrPaid() {
      return notImplemented("qrSessions.markQrPaid");
    },
    markQrExpired() {
      return notImplemented("qrSessions.markQrExpired");
    },
    markQrCancelled() {
      return notImplemented("qrSessions.markQrCancelled");
    },
  },
  orders: {
    listOrders(filters?: OrderListFilters) {
      return liveRead("orders", "listOrders", [filters]);
    },
    getOrderByOrderNo(orderNo) {
      return liveRead("orders", "getOrderByOrderNo", [orderNo]);
    },
    listOrdersByNursery(nurseryId, filters) {
      return liveRead("orders", "listOrdersByNursery", [nurseryId, filters]);
    },
    listOrderItemsByOrderNos(orderNos) {
      return liveRead("orders", "listOrderItemsByOrderNos", [orderNos]);
    },
    listOrderItemsByCompany(companyId, filters?: OrderItemListFilters) {
      return liveRead("orders", "listOrderItemsByCompany", [companyId, filters]);
    },
    createOrderFromQrSnapshot() {
      return notImplemented("orders.createOrderFromQrSnapshot");
    },
  },
  payments: {
    listPayments() {
      return liveRead("payments", "listPayments");
    },
    createPaymentReady() {
      return notImplemented("payments.createPaymentReady");
    },
    recordPaymentApproved() {
      return notImplemented("payments.recordPaymentApproved");
    },
    recordPaymentFailed() {
      return notImplemented("payments.recordPaymentFailed");
    },
    appendPaymentEvent() {
      return notImplemented("payments.appendPaymentEvent");
    },
  },
  inventory: {
    listInventoryMovements(filters?: InventoryMovementListFilters) {
      return liveRead("inventory", "listInventoryMovements", [filters]);
    },
    getOptionStock() {
      return notImplemented("inventory.getOptionStock");
    },
    reserveStock() {
      return notImplemented("inventory.reserveStock");
    },
    deductStock() {
      return notImplemented("inventory.deductStock");
    },
    restoreStock() {
      return notImplemented("inventory.restoreStock");
    },
    appendInventoryMovement() {
      return notImplemented("inventory.appendInventoryMovement");
    },
  },
  auditLogs: {
    appendAuditLog() {
      return notImplemented("auditLogs.appendAuditLog");
    },
    listAuditLogs(filters) {
      return liveRead("auditLogs", "listAuditLogs", [filters]);
    },
  },
  content: {
    getStorefrontContent() {
      return liveRead("content", "getStorefrontContent");
    },
    getStorefrontRuntimeSnapshot() {
      return liveRead("content", "getStorefrontRuntimeSnapshot");
    },
    getProductProfileById(productId) {
      return liveRead("content", "getProductProfileById", [productId]);
    },
    listMarketingSlots(filters) {
      return liveRead("content", "listMarketingSlots", [filters]);
    },
  },
};
