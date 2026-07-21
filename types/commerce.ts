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

export type ShippingFeeMode = "free" | "paid";

export type ShippingFeePolicy = {
  mode: ShippingFeeMode;
  baseFee: number;
  freeThreshold: number;
  remoteAreaEnabled: boolean;
  remoteAreaFee: number;
  islandAreaEnabled: boolean;
  islandAreaFee: number;
};

export type PgProvider = "mock" | "infiny" | "payup" | "toss" | "portone" | "kcp" | "nice";
export type PgMerchantStatus = "not_applied" | "in_review" | "mid_issued" | "active" | "blocked";
export type SettlementOwner = "infiny" | "payup" | "platform" | "manual";

export type CompanyPgProfile = {
  provider: PgProvider;
  providerLabel: string;
  taxationType?: "taxable";
  taxFreeEnabled?: false;
  merchantId?: string;
  merchantIdMasked: string;
  merchantSerialNoStored?: boolean;
  merchantSerialNoMasked?: string;
  moduleKey?: string;
  moduleKeyMasked?: string;
  terminalIdStored?: boolean;
  terminalIdMasked?: string;
  secretKeyRefMasked?: string;
  merchantPasswordRefMasked?: string;
  signKeyRefMasked?: string;
  webhookSecretRefMasked?: string;
  credentialRefsStored?: boolean;
  environment?: "test" | "production";
  credentialReady?: boolean;
  encryptedSecretStored?: boolean;
  vaultReady?: boolean;
  credentialStorageLabel?: string;
  lastConnectionTest?: {
    status: string;
    providerCalled: boolean;
    environment?: string;
    code?: string;
    testedAt?: string;
    blockerCount: number;
  };
  transactions?: { paymentIntents: number; payments: number; orders: number; total: number };
  merchantStatus: PgMerchantStatus;
  adminManaged: boolean;
  companyEditable: boolean;
  pgFeeRate: number;
  platformFeeRate: number;
  totalFeeRate: number;
  settlementOwner: SettlementOwner;
  settlementExecutionBlocked: boolean;
};

export type Company = {
  id: string;
  name: string;
  businessRegistrationNumber?: string;
  businessRegistrationNumberNormalized?: string;
  representativeName?: string;
  managerName: string;
  publicContactPhone?: string;
  publicKakaoChannel?: string;
  publicEmail?: string;
  commerceLicenseNo?: string;
  businessAddress?: string;
  returnAddress?: string;
  signupDocumentStatus?: string;
  status: "pending" | "approved" | "suspended";
  commissionRate: number;
  productCount: number;
  pendingProductCount: number;
  settlementBlocked: boolean;
  pgProfile?: CompanyPgProfile;
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
  sellerCompanyId?: string;
  sellerBusinessNo?: string;
  sellerBusinessNoNormalized?: string;
  sellerCompanyName?: string;
  nurseryId?: string;
  name: string;
  category: string;
  brand?: string;
  subtitle?: string;
  status: ProductStatus;
  price: number;
  stock: number;
  externalProductCode?: string;
  publicPath?: string;
  tabletPath?: string;
  mobilePath?: string;
  canonicalUrl?: string;
  productUrl?: string;
  adTargetPath?: string;
  mobileAdTargetPath?: string;
  businessBrandPath?: string;
  businessProductPath?: string;
  businessBrandUrl?: string;
  businessProductUrl?: string;
  urlVersion?: number;
  comparison: PriceComparison;
  priceComparisonVerified?: boolean;
  priceComparisonStatus?: "pending_verification" | "verified" | "needs_review" | string;
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
  shippingFeePolicy?: ShippingFeePolicy;
  detailSections?: {
    id?: string;
    type?: string;
    title: string;
    body: string;
    assetUrl?: string;
    assetPath?: string;
    assetFileName?: string;
    sortOrder?: number;
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
  optionId?: string;
  productName: string;
  optionName: string;
  unitPrice: number;
  quantity: number;
  companyId: string;
  sellerCompanyId?: string;
  sellerBusinessNo?: string;
  sellerBusinessNoNormalized?: string;
  sellerCompanyName?: string;
  shippingFeePolicy?: ShippingFeePolicy;
};

export type QrPickupLocation = {
  nurseryName: string;
  nurseryAddress: string;
  roomId: string;
  roomName: string;
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
  qrDisplayExpiresAt?: string;
  createdAt: string;
  items: CartItemSnapshot[];
  deliveryMethod: DeliveryMethod;
  totalAmount: number;
  pickupLocation?: QrPickupLocation;
};

export type OrderItem = {
  id: string;
  orderId: string;
  companyId: string;
  sellerCompanyId?: string;
  sellerBusinessNo?: string;
  sellerBusinessNoNormalized?: string;
  sellerCompanyName?: string;
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
