import { repositoryError } from "@/lib/repositories/types";
import type {
  AuditLogInput,
  CommerceRepositories,
  CreateOrderFromQrInput,
  CreatePaymentReadyInput,
  InventoryMovementListFilters,
  InventoryMovement,
  OrderItemListFilters,
  OrderListFilters,
  PaymentEvent,
  ProductListFilters,
  QrSessionDraftInput,
  RepositoryActor,
  RepositoryResult,
} from "@/lib/repositories/types";
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
  return true;
}

export function shouldAllowMockRepositoryFallback() {
  // A5 production/admin surfaces must expose Firebase permission or linkage
  // failures instead of silently replacing them with mock commerce data.
  return false;
}

type FunctionsLiveRepositoriesModule = typeof import("@/lib/repositories/functionsLiveRepository");

let functionsLiveRepositoriesModulePromise: Promise<FunctionsLiveRepositoriesModule> | null = null;

async function loadFirebaseRepositories() {
  functionsLiveRepositoriesModulePromise ??= import("@/lib/repositories/functionsLiveRepository");
  return (await functionsLiveRepositoriesModulePromise).functionsLiveRepositories;
}

function blockedFirebaseRepositoryRead(repositoryName: string, methodName: string, target?: string) {
  return repositoryError(
    "EXTERNAL_BLOCKED",
    `Firebase repository ${repositoryName}.${methodName} cannot run during Cloudflare Worker server rendering. Use browser runtime or Firebase Functions live reads.`,
    target,
  );
}

const firebaseRepositories = new Proxy(
  {},
  {
    get(_target, repositoryName) {
      return new Proxy(
        {},
        {
          get(_repositoryTarget, methodName) {
            return async (...args: unknown[]) => {
              const loaded = await loadFirebaseRepositories();
              const target = typeof args[0] === "string" ? args[0] : undefined;

              if (!loaded) {
                return blockedFirebaseRepositoryRead(String(repositoryName), String(methodName), target);
              }

              const repository = (loaded as unknown as Record<string, Record<string, (...methodArgs: unknown[]) => unknown>>)[
                String(repositoryName)
              ];
              const method = repository?.[String(methodName)];

              if (typeof method !== "function") {
                return blockedFirebaseRepositoryRead(String(repositoryName), String(methodName), target);
              }

              return method(...args);
            };
          },
        },
      );
    },
  },
) as CommerceRepositories;

const mockRepositories = new Proxy(
  {},
  {
    get(_target, repositoryName) {
      return new Proxy(
        {},
        {
          get(_repositoryTarget, methodName) {
            return async (...args: unknown[]) => {
              const target = typeof args[0] === "string" ? args[0] : undefined;
              return repositoryError(
                "NOT_IMPLEMENTED",
                `Mock repository ${String(repositoryName)}.${String(methodName)} has been removed. A5 uses Firebase live data only.`,
                target,
              );
            };
          },
        },
      );
    },
  },
) as CommerceRepositories;

async function resultWithFallback<T>(
  firebaseRead: () => Promise<RepositoryResult<T>>,
  mockRead: () => Promise<RepositoryResult<T>>,
  options: { fallbackOnEmpty?: boolean; emptyReason?: string; target?: string } = {},
): Promise<RepositoryResult<T>> {
  void mockRead;
  void options;
  const firebaseResult = await firebaseRead();

  return firebaseResult;
}

export async function readRepositoryWithSource<T>(
  firebaseRead: () => Promise<RepositoryResult<T>>,
  mockRead: () => Promise<RepositoryResult<T>>,
  options: { fallbackOnEmpty?: boolean; emptyReason?: string } = {},
): Promise<RepositoryRead<T>> {
  void mockRead;
  void options;
  const firebaseResult = await firebaseRead();

  if (firebaseResult.ok) {
    return {
      data: firebaseResult.data,
      source: "Firestore",
    };
  }

  throw new Error(`${firebaseResult.error.code}: ${firebaseResult.error.message}`);
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
    listQrSessionsByRoomOrTablet(filters: { nurseryId?: string; roomIds?: string[]; tabletIds?: string[] }) {
      return resultWithFallback(
        () => firebaseRepositories.qrSessions.listQrSessionsByRoomOrTablet(filters),
        () => mockRepositories.qrSessions.listQrSessionsByRoomOrTablet(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore QR sessions by room/tablet returned empty." },
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
    listOrderItemsByOrderNos(orderNos) {
      return resultWithFallback(
        () => firebaseRepositories.orders.listOrderItemsByOrderNos(orderNos),
        () => mockRepositories.orders.listOrderItemsByOrderNos(orderNos),
        { fallbackOnEmpty: false, emptyReason: "Firestore order items by order_no returned empty." },
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
    listPayments() {
      return resultWithFallback(
        () => firebaseRepositories.payments.listPayments(),
        () => mockRepositories.payments.listPayments(),
        { fallbackOnEmpty: true, emptyReason: "Firestore payments returned empty." },
      );
    },
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
    listInventoryMovements(filters?: InventoryMovementListFilters) {
      return resultWithFallback(
        () => firebaseRepositories.inventory.listInventoryMovements(filters),
        () => mockRepositories.inventory.listInventoryMovements(filters),
        { fallbackOnEmpty: true, emptyReason: "Firestore inventory movements returned empty." },
      );
    },
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
    getStorefrontRuntimeSnapshot() {
      return resultWithFallback(
        () => firebaseRepositories.content.getStorefrontRuntimeSnapshot(),
        () => mockRepositories.content.getStorefrontRuntimeSnapshot(),
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
