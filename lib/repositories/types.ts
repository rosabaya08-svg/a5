import type {
  AuditAction,
  AuditLog,
  CartItemSnapshot,
  DeliveryMethod,
  Order,
  OrderItem,
  Payment,
  Product,
  ProductOption,
  QrPaymentSession,
  QrSessionType,
} from "@/types/commerce";
import type { OrderStatus, PaymentStatus, ProductStatus, QrSessionStatus } from "@/types/status";
import type { RoleScope, UserRole } from "@/types/roles";

export type RepositoryErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN_SCOPE"
  | "QR_EXPIRED"
  | "QR_ALREADY_USED"
  | "AMOUNT_MISMATCH"
  | "OUT_OF_STOCK"
  | "INVALID_STATUS_TRANSITION"
  | "EXTERNAL_BLOCKED"
  | "NOT_IMPLEMENTED";

export type RepositoryError = {
  code: RepositoryErrorCode;
  message: string;
  target?: string;
};

export type RepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: RepositoryError;
    };

export type RepositoryActor = {
  role: UserRole;
  name: string;
  scope?: RoleScope;
};

export type ProductListFilters = {
  category?: string;
  companyId?: string;
  status?: ProductStatus;
};

export type OrderListFilters = {
  status?: OrderStatus;
  from?: string;
  to?: string;
};

export type OrderItemListFilters = {
  deliveryStatus?: string;
  from?: string;
  to?: string;
};

export type OrderWithItems = {
  order: Order;
  items: OrderItem[];
};

export type QrSessionDraftInput = {
  shortCode?: string;
  type: QrSessionType;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  cartId: string;
  items: CartItemSnapshot[];
  deliveryMethod: DeliveryMethod;
  expiresAt: string;
  createdAt?: string;
};

export type CreateOrderFromQrInput = {
  qrSession: QrPaymentSession;
  payment: Payment;
  orderNo: string;
  customerName: string;
  customerPhoneMasked: string;
  createdAt: string;
  paidAt?: string;
};

export type PaymentEvent = {
  id: string;
  paymentId: string;
  orderId?: string;
  qrSessionId?: string;
  status: PaymentStatus;
  amount: number;
  message: string;
  createdAt: string;
};

export type CreatePaymentReadyInput = {
  orderId: string;
  orderNo: string;
  amount: number;
  createdAt: string;
};

export type InventoryMovementType = "reserve" | "deduct" | "restore" | "external_sync" | "manual_adjust";

export type InventoryMovement = {
  id: string;
  productId?: string;
  optionId: string;
  companyId?: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  sourceId?: string;
  createdAt: string;
  createdBy?: string;
};

export type AuditLogInput = {
  actorRole: UserRole;
  actorName: string;
  action: AuditAction;
  target: string;
  message: string;
  createdAt: string;
};

export interface ProductRepository {
  listProducts(filters?: ProductListFilters): Promise<RepositoryResult<Product[]>>;
  listApprovedProducts(filters?: Omit<ProductListFilters, "status">): Promise<RepositoryResult<Product[]>>;
  getProductById(productId: string): Promise<RepositoryResult<Product>>;
  listProductOptions(productId: string): Promise<RepositoryResult<ProductOption[]>>;
  listCompanyProducts(companyId: string, filters?: Pick<ProductListFilters, "status" | "category">): Promise<RepositoryResult<Product[]>>;
}

export interface QrSessionRepository {
  listQrSessions(filters?: { status?: QrSessionStatus; nurseryId?: string }): Promise<RepositoryResult<QrPaymentSession[]>>;
  getQrSessionByShortCode(shortCode: string): Promise<RepositoryResult<QrPaymentSession>>;
  createQrSessionDraft(input: QrSessionDraftInput): Promise<RepositoryResult<QrPaymentSession>>;
  markQrPaid(qrSessionId: string, paymentId: string): Promise<RepositoryResult<QrPaymentSession>>;
  markQrExpired(qrSessionId: string): Promise<RepositoryResult<QrPaymentSession>>;
  markQrCancelled(qrSessionId: string, actor: RepositoryActor): Promise<RepositoryResult<QrPaymentSession>>;
}

export interface OrderRepository {
  listOrders(filters?: OrderListFilters): Promise<RepositoryResult<Order[]>>;
  getOrderByOrderNo(orderNo: string): Promise<RepositoryResult<OrderWithItems>>;
  listOrdersByNursery(nurseryId: string, filters?: OrderListFilters): Promise<RepositoryResult<Order[]>>;
  listOrderItemsByCompany(companyId: string, filters?: OrderItemListFilters): Promise<RepositoryResult<OrderItem[]>>;
  createOrderFromQrSnapshot(input: CreateOrderFromQrInput): Promise<RepositoryResult<OrderWithItems>>;
}

export interface PaymentRepository {
  createPaymentReady(input: CreatePaymentReadyInput): Promise<RepositoryResult<Payment>>;
  recordPaymentApproved(paymentId: string, tid: string, amount: number): Promise<RepositoryResult<Payment>>;
  recordPaymentFailed(paymentId: string, reason: string): Promise<RepositoryResult<Payment>>;
  appendPaymentEvent(event: Omit<PaymentEvent, "id">): Promise<RepositoryResult<PaymentEvent>>;
}

export interface InventoryRepository {
  getOptionStock(optionId: string): Promise<RepositoryResult<number>>;
  reserveStock(optionId: string, quantity: number, sourceId: string): Promise<RepositoryResult<InventoryMovement>>;
  deductStock(optionId: string, quantity: number, orderId: string): Promise<RepositoryResult<InventoryMovement>>;
  restoreStock(optionId: string, quantity: number, reason: string): Promise<RepositoryResult<InventoryMovement>>;
  appendInventoryMovement(movement: Omit<InventoryMovement, "id">): Promise<RepositoryResult<InventoryMovement>>;
}

export interface AuditLogRepository {
  appendAuditLog(input: AuditLogInput): Promise<RepositoryResult<AuditLog>>;
  listAuditLogs(filters?: { target?: string; actorRole?: UserRole }): Promise<RepositoryResult<AuditLog[]>>;
}

export type CommerceRepositories = {
  products: ProductRepository;
  qrSessions: QrSessionRepository;
  orders: OrderRepository;
  payments: PaymentRepository;
  inventory: InventoryRepository;
  auditLogs: AuditLogRepository;
};

export function repositoryOk<T>(data: T): RepositoryResult<T> {
  return { ok: true, data };
}

export function repositoryError(
  code: RepositoryErrorCode,
  message: string,
  target?: string,
): RepositoryResult<never> {
  return { ok: false, error: { code, message, target } };
}

export function repositoryData<T>(result: RepositoryResult<T>): T {
  if (result.ok) {
    return result.data;
  }

  throw new Error(`${result.error.code}: ${result.error.message}`);
}

export function assertNeverStatus(status: QrSessionStatus): RepositoryResult<never> {
  return repositoryError("INVALID_STATUS_TRANSITION", `QR status cannot transition from ${status}`);
}
