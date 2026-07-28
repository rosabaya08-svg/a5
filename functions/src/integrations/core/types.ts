export type IntegrationPlatformType = "SABANGNET" | "STANDARD" | "ERP" | "WMS" | "CUSTOM";

export type IntegrationOrderStatus =
  | "paid"
  | "ready_to_ship"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "exchange_requested"
  | "exchanged";

export type IntegrationOrderItem = {
  id: string;
  orderNo: string;
  companyId: string;
  productId: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  deliveryStatus: string;
  settlementAmount: number;
  sheetNo?: string;
  carrierCode?: string;
};

export type IntegrationOrder = {
  id: string;
  orderNo: string;
  companyId: string;
  status: IntegrationOrderStatus;
  paidAt: string;
  createdAt: string;
  customerName: string;
  customerPhoneMasked: string;
  receiverAddress?: string;
  receiverAddressDetail?: string;
  deliveryMethod: "pickup" | "delivery";
  totalAmount: number;
  items: IntegrationOrderItem[];
};

export type IntegrationAuthContext = {
  companyId: string;
  apiKey?: string;
  platformType: IntegrationPlatformType;
  logContext?: {
    requestId: string;
    startedAt: number;
    method: string;
    path: string;
    requiredScope?: string;
    userAgent: string;
    remoteIp: string;
  };
};

export type IntegrationPage<T> = {
  items: T[];
  nextCursor?: string;
};

export type IntegrationProduct = {
  id: string;
  companyId: string;
  name: string;
  modelNo: string;
  brandName: string;
  makerName: string;
  salePrice: number;
  stockQty: number;
  status: string;
  imageUrl: string;
  updatedAt: string;
};
