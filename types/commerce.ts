import type { UserRole } from "./roles";
import type {
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  QrSessionStatus,
  SettlementStatus,
} from "./status";

export type DeliveryMethod = "delivery" | "pickup";
export type QrSessionType = "purchase" | "ask";
export type AuditAction =
  | "create"
  | "update"
  | "approve"
  | "reject"
  | "status_change"
  | "mock_adapter"
  | "blocked";

export type Money = {
  amount: number;
  currency: "KRW";
};

export type PriceComparison = {
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
};

export type Company = {
  id: string;
  name: string;
  managerName: string;
  status: "pending" | "approved" | "suspended";
  commissionRate: number;
  productCount: number;
  pendingProductCount: number;
  settlementBlocked: boolean;
};

export type Nursery = {
  id: string;
  name: string;
  region: string;
  managerName: string;
  roomCount: number;
  tabletCount: number;
  status: "pending" | "approved" | "suspended";
};

export type Room = {
  id: string;
  nurseryId: string;
  name: string;
  floor: string;
  pickupEnabled: boolean;
  activeTabletId?: string;
};

export type Tablet = {
  id: string;
  nurseryId: string;
  roomId: string;
  label: string;
  status: "active" | "inactive" | "maintenance";
  lastSeenAt: string;
};

export type ProductOption = {
  id: string;
  productId: string;
  name: string;
  priceDelta: number;
  stock: number;
};

export type Product = {
  id: string;
  companyId: string;
  nurseryId?: string;
  name: string;
  category: string;
  brand?: string;
  subtitle?: string;
  status: ProductStatus;
  price: number;
  stock: number;
  externalProductCode?: string;
  comparison: PriceComparison;
  optionIds: string[];
  thumbnailTone: "sage" | "rose" | "sky" | "gold" | "ink";
  imageUrl?: string;
  gallery?: string[];
  tags?: string[];
  badges?: string[];
  fulfillment?: {
    delivery: boolean;
    pickup: boolean;
  };
  detailSections?: {
    title: string;
    body: string;
  }[];
  reviewSummary?: {
    rating: number;
    count: number;
    highlight: string;
  };
  firebaseStatus?: string;
  source?: string;
  seededAt?: string;
};

export type CartItemSnapshot = {
  productId: string;
  productName: string;
  optionName: string;
  unitPrice: number;
  quantity: number;
  companyId: string;
};

export type QrPaymentSession = {
  id: string;
  shortCode: string;
  type: QrSessionType;
  status: QrSessionStatus;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  cartId: string;
  expiresAt: string;
  createdAt: string;
  items: CartItemSnapshot[];
  deliveryMethod: DeliveryMethod;
  totalAmount: number;
};

export type OrderItem = {
  id: string;
  orderId: string;
  companyId: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  deliveryStatus: DeliveryStatus;
  settlementAmount: number;
};

export type Order = {
  id: string;
  orderNo: string;
  qrSessionId: string;
  nurseryId: string;
  roomId: string;
  customerName: string;
  customerPhoneMasked: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  totalAmount: number;
  paidAt?: string;
  createdAt: string;
  itemIds: string[];
};

export type Payment = {
  id: string;
  orderId: string;
  orderNo: string;
  status: PaymentStatus;
  amount: number;
  mockTid: string;
  approvedAt?: string;
};

export type Settlement = {
  id: string;
  companyId: string;
  period: string;
  status: SettlementStatus;
  grossAmount: number;
  commissionAmount: number;
  refundHoldAmount: number;
  payoutAmount: number;
};

export type AuditLog = {
  id: string;
  actorRole: UserRole;
  actorName: string;
  action: AuditAction;
  target: string;
  message: string;
  createdAt: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
  tone?: "blue" | "green" | "amber" | "red" | "purple" | "neutral";
};

export type RiskItem = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  owner: string;
  detail: string;
};
