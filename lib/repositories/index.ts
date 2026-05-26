import { firebaseRepositories } from "@/lib/repositories/firebase";
import { mockRepositories } from "@/lib/repositories/mock";
import type {
  AuditLogInput,
  CommerceRepositories,
  CreateOrderFromQrInput,
  CreatePaymentReadyInput,
  InventoryMovement,
  OrderItemListFilters,
  OrderListFilters,
  PaymentEvent,
  ProductListFilters,
  QrSessionDraftInput,
  RepositoryActor,
  RepositoryResult,
} from "@/lib/repositories/types";
import { repositoryError } from "@/lib/repositories/types";
import type { Company, Nursery, ProductOption, Room, Tablet } from "@/types/commerce";
import type { QrSessionStatus } from "@/types/status";

export type RepositoryReadSource = "Firestore" | "mock fallback";

export type RepositoryRead<T> = {
  data: T;
  source: RepositoryReadSource;
  reason?: string;
};

export function requestedDataSource() {
  return (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "firebase").trim().toLowerCase();
}

export function shouldUseFirebaseRepositories() {
  return requestedDataSource() === "firebase";
}

function isEmptyData<T>(data: T) {
  return Array.isArray(data) && data.length === 0;
}

function fallbackReason<T>(result: RepositoryResult<T>) {
  return result.ok ? undefined : result.error.message;
}

async function resultWithFallback<T>(
  firebaseRead: () => Promise<RepositoryResult<T>>,
  mockRead: () => Promise<RepositoryResult<T>>,
  options: { fallbackOnEmpty?: boolean; emptyReason?: string; target?: string } = {},
): Promise<RepositoryResult<T>> {
  if (!shouldUseFirebaseRepositories()) {
    return mockRead();
  }

  const firebaseResult = await firebaseRead();

  if (firebaseResult.ok && (!options.fallbackOnEmpty || !isEmptyData(firebaseResult.data))) {
    return firebaseResult;
  }

  const fallbackResult = await mockRead();

  if (!fallbackResult.ok) {
    return fallbackResult;
  }

  return fallbackResult.ok
    ? fallbackResult
    : repositoryError(
        "EXTERNAL_BLOCKED",
        firebaseResult.ok ? options.emptyReason ?? "Firestore returned empty." : firebaseResult.error.message,
        options.target,
      );
}

export async function readRepositoryWithSource<T>(
  firebaseRead: () => Promise<RepositoryResult<T>>,
  mockRead: () => Promise<RepositoryResult<T>>,
  options: { fallbackOnEmpty?: boolean; emptyReason?: string } = {},
): Promise<RepositoryRead<T>> {
  if (!shouldUseFirebaseRepositories()) {
    const mockResult = await mockRead();

    if (!mockResult.ok) {
      throw new Error(`${mockResult.error.code}: ${mockResult.error.message}`);
    }

    return {
      data: mockResult.data,
      source: "mock fallback",
      reason: `NEXT_PUBLIC_DATA_SOURCE=${requestedDataSource() || "unset"}; Firestore read skipped by data-source selector.`,
    };
  }

  const firebaseResult = await firebaseRead();

  if (firebaseResult.ok && (!options.fallbackOnEmpty || !isEmptyData(firebaseResult.data))) {
    return {
      data: firebaseResult.data,
      source: "Firestore",
    };
  }

  const mockResult = await mockRead();

  if (!mockResult.ok) {
    throw new Error(`${mockResult.error.code}: ${mockResult.error.message}`);
  }

  return {
    data: mockResult.data,
    source: "mock fallback",
    reason: firebaseResult.ok ? options.emptyReason ?? "Firestore returned empty." : fallbackReason(firebaseResult),
  };
}

export const commerceRepositories: CommerceRepositories = {
  products: {
    listProducts(filters?: ProductListFilters) {
      return resultWithFallback(
        () => firebaseRepositories.products.listProducts(filters),
        () => mockRepositories.products.listProducts(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore products returned empty." },
      );
    },
    listApprovedProducts(filters) {
      return resultWithFallback(
        () => firebaseRepositories.products.listApprovedProducts(filters),
        () => mockRepositories.products.listApprovedProducts(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore approved products returned empty." },
      );
    },
    getProductById(productId) {
      return resultWithFallback(
        () => firebaseRepositories.products.getProductById(productId),
        () => mockRepositories.products.getProductById(productId),
        { target: productId },
      );
    },
    listProductOptions(productId) {
      return resultWithFallback(
        () => firebaseRepositories.products.listProductOptions(productId),
        () => mockRepositories.products.listProductOptions(productId),
        { fallbackOnEmpty: true, emptyReason: "Firestore product options returned empty.", target: productId },
      );
    },
    listCompanyProducts(companyId, filters) {
      return resultWithFallback(
        () => firebaseRepositories.products.listCompanyProducts(companyId, filters),
        () => mockRepositories.products.listCompanyProducts(companyId, filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore company products returned empty.", target: companyId },
      );
    },
  },

  productOptions: {
    listProductOptions(productId) {
      return resultWithFallback(
        () => firebaseRepositories.productOptions.listProductOptions(productId),
        () => mockRepositories.productOptions.listProductOptions(productId),
        { fallbackOnEmpty: true, emptyReason: "Firestore product options returned empty.", target: productId },
      );
    },
    getProductOptionById(optionId) {
      return resultWithFallback(
        () => firebaseRepositories.productOptions.getProductOptionById(optionId),
        () => mockRepositories.productOptions.getProductOptionById(optionId),
        { target: optionId },
      );
    },
  },

  companies: {
    listCompanies(filters) {
      return resultWithFallback(
        () => firebaseRepositories.companies.listCompanies(filters),
        () => mockRepositories.companies.listCompanies(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore companies returned empty." },
      );
    },
    getCompanyById(companyId) {
      return resultWithFallback(
        () => firebaseRepositories.companies.getCompanyById(companyId),
        () => mockRepositories.companies.getCompanyById(companyId),
        { target: companyId },
      );
    },
  },

  nurseries: {
    listNurseries(filters) {
      return resultWithFallback(
        () => firebaseRepositories.nurseries.listNurseries(filters),
        () => mockRepositories.nurseries.listNurseries(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore nurseries returned empty." },
      );
    },
    getNurseryById(nurseryId) {
      return resultWithFallback(
        () => firebaseRepositories.nurseries.getNurseryById(nurseryId),
        () => mockRepositories.nurseries.getNurseryById(nurseryId),
        { target: nurseryId },
      );
    },
  },

  rooms: {
    listRooms(filters) {
      return resultWithFallback(
        () => firebaseRepositories.rooms.listRooms(filters),
        () => mockRepositories.rooms.listRooms(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore rooms returned empty." },
      );
    },
    listRoomsByNursery(nurseryId) {
      return resultWithFallback(
        () => firebaseRepositories.rooms.listRoomsByNursery(nurseryId),
        () => mockRepositories.rooms.listRoomsByNursery(nurseryId),
        { fallbackOnEmpty: true, emptyReason: "Firestore nursery rooms returned empty.", target: nurseryId },
      );
    },
    getRoomById(roomId) {
      return resultWithFallback(
        () => firebaseRepositories.rooms.getRoomById(roomId),
        () => mockRepositories.rooms.getRoomById(roomId),
        { target: roomId },
      );
    },
  },

  tablets: {
    listTablets(filters) {
      return resultWithFallback(
        () => firebaseRepositories.tablets.listTablets(filters),
        () => mockRepositories.tablets.listTablets(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore tablets returned empty." },
      );
    },
    listTabletsByNursery(nurseryId) {
      return resultWithFallback(
        () => firebaseRepositories.tablets.listTabletsByNursery(nurseryId),
        () => mockRepositories.tablets.listTabletsByNursery(nurseryId),
        { fallbackOnEmpty: true, emptyReason: "Firestore nursery tablets returned empty.", target: nurseryId },
      );
    },
    getTabletById(tabletId) {
      return resultWithFallback(
        () => firebaseRepositories.tablets.getTabletById(tabletId),
        () => mockRepositories.tablets.getTabletById(tabletId),
        { target: tabletId },
      );
    },
  },

  qrSessions: {
    listQrSessions(filters?: { status?: QrSessionStatus; nurseryId?: string }) {
      return resultWithFallback(
        () => firebaseRepositories.qrSessions.listQrSessions(filters),
        () => mockRepositories.qrSessions.listQrSessions(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore QR sessions returned empty." },
      );
    },
    getQrSessionByShortCode(shortCode) {
      return resultWithFallback(
        () => firebaseRepositories.qrSessions.getQrSessionByShortCode(shortCode),
        () => mockRepositories.qrSessions.getQrSessionByShortCode(shortCode),
        { target: shortCode },
      );
    },
    createQrSessionDraft(input: QrSessionDraftInput) {
      return resultWithFallback(
        () => firebaseRepositories.qrSessions.createQrSessionDraft(input),
        () => mockRepositories.qrSessions.createQrSessionDraft(input),
        { target: input.shortCode ?? input.cartId },
      );
    },
    markQrPaid(qrSessionId, paymentId) {
      return resultWithFallback(
        () => firebaseRepositories.qrSessions.markQrPaid(qrSessionId, paymentId),
        () => mockRepositories.qrSessions.markQrPaid(qrSessionId, paymentId),
        { target: qrSessionId },
      );
    },
    markQrExpired(qrSessionId) {
      return resultWithFallback(
        () => firebaseRepositories.qrSessions.markQrExpired(qrSessionId),
        () => mockRepositories.qrSessions.markQrExpired(qrSessionId),
        { target: qrSessionId },
      );
    },
    markQrCancelled(qrSessionId, actor: RepositoryActor) {
      return resultWithFallback(
        () => firebaseRepositories.qrSessions.markQrCancelled(qrSessionId, actor),
        () => mockRepositories.qrSessions.markQrCancelled(qrSessionId, actor),
        { target: qrSessionId },
      );
    },
  },

  orders: {
    listOrders(filters?: OrderListFilters) {
      return resultWithFallback(
        () => firebaseRepositories.orders.listOrders(filters),
        () => mockRepositories.orders.listOrders(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore orders returned empty." },
      );
    },
    getOrderByOrderNo(orderNo) {
      return resultWithFallback(
        () => firebaseRepositories.orders.getOrderByOrderNo(orderNo),
        () => mockRepositories.orders.getOrderByOrderNo(orderNo),
        { target: orderNo },
      );
    },
    listOrdersByNursery(nurseryId, filters) {
      return resultWithFallback(
        () => firebaseRepositories.orders.listOrdersByNursery(nurseryId, filters),
        () => mockRepositories.orders.listOrdersByNursery(nurseryId, filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore nursery orders returned empty.", target: nurseryId },
      );
    },
    listOrderItemsByCompany(companyId, filters?: OrderItemListFilters) {
      return resultWithFallback(
        () => firebaseRepositories.orders.listOrderItemsByCompany(companyId, filters),
        () => mockRepositories.orders.listOrderItemsByCompany(companyId, filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore company order items returned empty.", target: companyId },
      );
    },
    createOrderFromQrSnapshot(input: CreateOrderFromQrInput) {
      return resultWithFallback(
        () => firebaseRepositories.orders.createOrderFromQrSnapshot(input),
        () => mockRepositories.orders.createOrderFromQrSnapshot(input),
        { target: input.orderNo },
      );
    },
  },

  payments: {
    createPaymentReady(input: CreatePaymentReadyInput) {
      return resultWithFallback(
        () => firebaseRepositories.payments.createPaymentReady(input),
        () => mockRepositories.payments.createPaymentReady(input),
        { target: input.orderNo },
      );
    },
    recordPaymentApproved(paymentId, tid, amount) {
      return resultWithFallback(
        () => firebaseRepositories.payments.recordPaymentApproved(paymentId, tid, amount),
        () => mockRepositories.payments.recordPaymentApproved(paymentId, tid, amount),
        { target: paymentId },
      );
    },
    recordPaymentFailed(paymentId, reason) {
      return resultWithFallback(
        () => firebaseRepositories.payments.recordPaymentFailed(paymentId, reason),
        () => mockRepositories.payments.recordPaymentFailed(paymentId, reason),
        { target: paymentId },
      );
    },
    appendPaymentEvent(event: Omit<PaymentEvent, "id">) {
      return resultWithFallback(
        () => firebaseRepositories.payments.appendPaymentEvent(event),
        () => mockRepositories.payments.appendPaymentEvent(event),
        { target: event.paymentId },
      );
    },
  },

  inventory: {
    getOptionStock(optionId) {
      return resultWithFallback(
        () => firebaseRepositories.inventory.getOptionStock(optionId),
        () => mockRepositories.inventory.getOptionStock(optionId),
        { target: optionId },
      );
    },
    reserveStock(optionId, quantity, sourceId) {
      return resultWithFallback(
        () => firebaseRepositories.inventory.reserveStock(optionId, quantity, sourceId),
        () => mockRepositories.inventory.reserveStock(optionId, quantity, sourceId),
        { target: optionId },
      );
    },
    deductStock(optionId, quantity, orderId) {
      return resultWithFallback(
        () => firebaseRepositories.inventory.deductStock(optionId, quantity, orderId),
        () => mockRepositories.inventory.deductStock(optionId, quantity, orderId),
        { target: optionId },
      );
    },
    restoreStock(optionId, quantity, reason) {
      return resultWithFallback(
        () => firebaseRepositories.inventory.restoreStock(optionId, quantity, reason),
        () => mockRepositories.inventory.restoreStock(optionId, quantity, reason),
        { target: optionId },
      );
    },
    appendInventoryMovement(movement: Omit<InventoryMovement, "id">) {
      return resultWithFallback(
        () => firebaseRepositories.inventory.appendInventoryMovement(movement),
        () => mockRepositories.inventory.appendInventoryMovement(movement),
        { target: movement.optionId },
      );
    },
  },

  auditLogs: {
    appendAuditLog(input: AuditLogInput) {
      return resultWithFallback(
        () => firebaseRepositories.auditLogs.appendAuditLog(input),
        () => mockRepositories.auditLogs.appendAuditLog(input),
        { target: input.target },
      );
    },
    listAuditLogs(filters) {
      return resultWithFallback(
        () => firebaseRepositories.auditLogs.listAuditLogs(filters),
        () => mockRepositories.auditLogs.listAuditLogs(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore audit logs returned empty." },
      );
    },
  },

  content: {
    getStorefrontContent() {
      return resultWithFallback(
        () => firebaseRepositories.content.getStorefrontContent(),
        () => mockRepositories.content.getStorefrontContent(),
      );
    },
    getProductProfileById(productId) {
      return resultWithFallback(
        () => firebaseRepositories.content.getProductProfileById(productId),
        () => mockRepositories.content.getProductProfileById(productId),
        { target: productId },
      );
    },
    listMarketingSlots(filters) {
      return resultWithFallback(
        () => firebaseRepositories.content.listMarketingSlots(filters),
        () => mockRepositories.content.listMarketingSlots(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore marketing slots returned empty." },
      );
    },
  },
};

export type RepositoryEntity =
  | ProductOption
  | Company
  | Nursery
  | Room
  | Tablet;

export { firebaseRepositories, mockRepositories };
