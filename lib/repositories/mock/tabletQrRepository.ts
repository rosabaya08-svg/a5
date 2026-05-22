import { mockApi } from "@/lib/mock/mockApi";
import type {
  CartItemSnapshot,
  Nursery,
  Order,
  OrderItem,
  Payment,
  Product,
  ProductOption,
  QrPaymentSession,
  Room,
  Tablet,
} from "@/types/commerce";

export type TabletStoreContext = {
  session: QrPaymentSession;
  nursery?: Nursery;
  room?: Room;
  tablet?: Tablet;
};

export type GuestOrderDetail = {
  order: Order;
  items: OrderItem[];
  payment?: Payment;
};

export type RiskLevel = "high" | "medium" | "low";

export type ProductRisk = {
  id: string;
  label: string;
  level: RiskLevel;
  detail: string;
};

export type CartItemNotice = {
  id: string;
  productName: string;
  level: RiskLevel;
  label: string;
  detail: string;
};

export type CountSummary = {
  label: string;
  value: number;
  helper: string;
  level?: RiskLevel;
};

export type QrLifecycleState = "active" | "expired" | "used" | "canceled" | "payment_failed";

export function getTabletStoreContext(shortCode = "SANHO701"): TabletStoreContext {
  const session = getQrSession(shortCode);
  const nursery = mockApi.nurseries().find((item) => item.id === session.nurseryId);
  const room = mockApi.rooms().find((item) => item.id === session.roomId);
  const tablet = mockApi.tablets().find((item) => item.id === session.tabletId);

  return { session, nursery, room, tablet };
}

export function getApprovedProducts(): Product[] {
  return mockApi.products().filter((product) => product.status === "approved");
}

export function getProduct(productId: string): Product {
  return mockApi.findProduct(productId);
}

export function getProductOptions(productId: string): ProductOption[] {
  return mockApi.productOptions().filter((option) => option.productId === productId);
}

export function getProductCategories(): string[] {
  return ["All", ...Array.from(new Set(getApprovedProducts().map((product) => product.category)))];
}

export function getCatalogSummaries(): CountSummary[] {
  const products = getApprovedProducts();
  const lowStock = products.filter((product) => product.stock <= 10).length;
  const missingExternalCode = products.filter((product) => !product.externalProductCode).length;
  const pickupCapable = products.filter((product) => getFulfillmentLabel(product).includes("Pickup")).length;

  return [
    { label: "Approved", value: products.length, helper: "Visible on tablet", level: "low" },
    { label: "Low stock", value: lowStock, helper: "Mock risk badge source", level: lowStock ? "high" : "low" },
    {
      label: "No external code",
      value: missingExternalCode,
      helper: "Supplier mapping pending",
      level: missingExternalCode ? "medium" : "low",
    },
    { label: "Pickup capable", value: pickupCapable, helper: "Can branch to nursery pickup", level: "low" },
  ];
}

export function getCartSession(): QrPaymentSession {
  return getQrSession("SANHO701");
}

export function getAskSession(): QrPaymentSession {
  return mockApi.qrSessions().find((session) => session.type === "ask" && session.status === "active") ?? getQrSession("ASKMOM88");
}

export function getQrSession(shortCode: string): QrPaymentSession {
  return mockApi.findQr(shortCode);
}

export function getQrPreviewSessions(): QrPaymentSession[] {
  return mockApi.qrSessions();
}

export function getQrStatusSummaries(): CountSummary[] {
  const sessions = getQrPreviewSessions();
  const active = sessions.filter((session) => session.status === "active").length;
  const paid = sessions.filter((session) => session.status === "paid").length;
  const expired = sessions.filter((session) => session.status === "expired").length;
  const cancelled = sessions.filter((session) => session.status === "cancelled").length;

  return [
    { label: "Active", value: active, helper: "Can enter checkout", level: active ? "low" : "medium" },
    { label: "Paid", value: paid, helper: "Already used QR", level: paid ? "medium" : "low" },
    { label: "Expired", value: expired, helper: "Must block checkout", level: expired ? "high" : "low" },
    { label: "Cancelled", value: cancelled, helper: "Manual void state", level: cancelled ? "high" : "low" },
  ];
}

export function getPaymentForQr(session: QrPaymentSession): Payment | undefined {
  const order = mockApi.orders().find((item) => item.qrSessionId === session.id);

  if (!order) return undefined;

  return mockApi.payments().find((item) => item.orderId === order.id);
}

export function getQrLifecycleState(session: QrPaymentSession): QrLifecycleState {
  const payment = getPaymentForQr(session);

  if (payment?.status === "failed_mock") return "payment_failed";
  if (session.status === "expired") return "expired";
  if (session.status === "cancelled") return "canceled";
  if (session.status === "paid") return "used";

  return "active";
}

export function getSessionItemCount(session: QrPaymentSession): number {
  return session.items.reduce((total, item) => total + item.quantity, 0);
}

export function getSessionSubtotal(items: CartItemSnapshot[]): number {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function getCartItemNotices(items: CartItemSnapshot[]): CartItemNotice[] {
  return items.map((item) => {
    const product = mockApi.products().find((candidate) => candidate.id === item.productId);

    if (!product) {
      return {
        id: `${item.productId}-missing-product`,
        productName: item.productName,
        level: "high",
        label: "Product snapshot only",
        detail: "The cart item can render from the QR snapshot, but the product catalog record was not found.",
      };
    }

    if (product.stock < item.quantity) {
      return {
        id: `${item.productId}-insufficient-stock`,
        productName: item.productName,
        level: "high",
        label: "Insufficient stock",
        detail: `Requested ${item.quantity} units, but mock catalog stock is ${product.stock}. Future checkout must re-check inventory server-side.`,
      };
    }

    if (product.stock <= 5) {
      return {
        id: `${item.productId}-critical-stock`,
        productName: item.productName,
        level: "medium",
        label: "Critical stock",
        detail: `Mock catalog stock is ${product.stock}. The tablet can preview checkout, but real payment should wait for inventory locking.`,
      };
    }

    return {
      id: `${item.productId}-stock-ok`,
      productName: item.productName,
      level: "low",
      label: "Snapshot OK",
      detail: "Mock catalog stock covers the selected quantity. No live inventory write is performed.",
    };
  });
}

export function getGuestOrder(orderNo: string): GuestOrderDetail {
  const order = mockApi.findOrder(orderNo);
  const items = mockApi.orderItems().filter((item) => order.itemIds.includes(item.id));
  const payment = mockApi.payments().find((item) => item.orderId === order.id);

  return { order, items, payment };
}

export function findGuestOrder(orderNo: string): GuestOrderDetail | null {
  const order = mockApi.orders().find((item) => item.orderNo.toLowerCase() === orderNo.toLowerCase());

  if (!order) return null;

  const items = mockApi.orderItems().filter((item) => order.itemIds.includes(item.id));
  const payment = mockApi.payments().find((item) => item.orderId === order.id);

  return { order, items, payment };
}

export function getGuestOrders(): Order[] {
  return mockApi.orders();
}

export function getGuestOrderSummaries(): CountSummary[] {
  const orders = getGuestOrders();
  const pickup = orders.filter((order) => order.deliveryMethod === "pickup").length;
  const delivery = orders.filter((order) => order.deliveryMethod === "delivery").length;
  const needsAttention = orders.filter((order) =>
    ["refund_requested", "cancelled", "pending_payment"].includes(order.status),
  ).length;

  return [
    { label: "Orders", value: orders.length, helper: "Guest lookup rows", level: "low" },
    { label: "Pickup", value: pickup, helper: "Nursery-handled branch", level: "low" },
    { label: "Delivery", value: delivery, helper: "Tracking API blocked", level: "medium" },
    {
      label: "Needs attention",
      value: needsAttention,
      helper: "Refund/cancel/payment states",
      level: needsAttention ? "high" : "low",
    },
  ];
}

export function getDiscountRate(product: Product): number {
  const { listPrice, closedMallPrice } = product.comparison;

  return Math.max(0, Math.round(((listPrice - closedMallPrice) / listPrice) * 100));
}

export function getStockState(product: Product): { label: string; tone: "red" | "amber" | "green" } {
  if (product.stock <= 5) return { label: "Critical stock", tone: "red" };
  if (product.stock <= 10) return { label: "Low stock", tone: "amber" };

  return { label: "In stock", tone: "green" };
}

export function getProductRisks(product: Product): ProductRisk[] {
  const risks: ProductRisk[] = [];

  if (product.stock <= 5) {
    risks.push({
      id: `${product.id}-critical-stock`,
      label: "Critical stock",
      level: "high",
      detail: "Tablet can show the product, but future inventory writes need server-side locking.",
    });
  } else if (product.stock <= 10) {
    risks.push({
      id: `${product.id}-low-stock`,
      label: "Low stock",
      level: "medium",
      detail: "External inventory sync is not connected in this beta.",
    });
  }

  if (!product.externalProductCode) {
    risks.push({
      id: `${product.id}-missing-external-code`,
      label: "No external code",
      level: "medium",
      detail: "External stock mapping is missing and must stay mock-only.",
    });
  }

  return risks.length
    ? risks
    : [
        {
          id: `${product.id}-stable`,
          label: "No risk flag",
          level: "low",
          detail: "No stock or mapping warning is attached to this mock product.",
        },
      ];
}

export function getFulfillmentLabel(product: Product): string {
  if (product.category === "Food") return "Delivery only";
  if (product.category === "Outing") return "Delivery preferred";

  return "Pickup or delivery";
}

export function getQrStateMessage(session: QrPaymentSession): string {
  if (session.status === "expired") return "This QR is expired in mock state.";
  if (session.status === "paid") return "This QR was already used for mock payment.";
  if (session.status === "cancelled") return "This QR was cancelled in mock state.";

  return "This QR is active and can continue to mock checkout.";
}

export function getMockOrderNo(session: QrPaymentSession): string {
  const order = mockApi.orders().find((item) => item.qrSessionId === session.id);

  if (order) return order.orderNo;

  if (session.shortCode === "SANHO701") return "A5-20260519-002";
  if (session.shortCode === "ASKMOM88") return "A5-20260519-001";
  if (session.shortCode === "ASKNOW44") return "A5-20260519-003";
  if (session.shortCode === "VOID1234") return "A5-20260519-004";
  if (session.shortCode === "CANCEL77") return "A5-20260519-005";
  if (session.shortCode === "DELIV900") return "A5-20260518-012";

  return "A5-20260518-011";
}
