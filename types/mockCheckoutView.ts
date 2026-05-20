import type { RiskStatus } from "@/types/mockUi";

export type MockCheckoutItem = {
  id: string;
  name: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  fulfillment: "delivery" | "pickup";
};

export type MockCheckoutSummary = {
  id: string;
  shortCode: string;
  orderNo: string;
  nurseryName: string;
  roomName: string;
  payerLabel: string;
  expiresAt: string;
  items: MockCheckoutItem[];
  deliveryFee: number;
  discountAmount: number;
  riskStatuses: RiskStatus[];
};

export type MockGuestLookupResult = {
  orderNo: string;
  phoneMasked: string;
  statusLabel: string;
  fulfillmentLabel: string;
  totalAmount: number;
  lastUpdatedAt: string;
  riskStatuses: RiskStatus[];
};

