import type { RiskStatus } from "@/types/mockUi";

export type MockFulfillment = "delivery" | "pickup" | "both";

export type MockStockState = "in_stock" | "low_stock" | "sold_out";

export type MockMallProduct = {
  id: string;
  name: string;
  category: string;
  listPrice: number;
  closedMallPrice: number;
  platformLowestPrice: number;
  fulfillment: MockFulfillment;
  stockState: MockStockState;
  stockCount: number;
  riskStatuses: RiskStatus[];
  tone: "sage" | "rose" | "sky" | "gold" | "ink";
};

export type MockTimelineState = "done" | "current" | "waiting" | "blocked";

export type MockTimelineStep = {
  id: string;
  label: string;
  description: string;
  state: MockTimelineState;
  at?: string;
};

export type MockQrSessionCard = {
  id: string;
  shortCode: string;
  nurseryName: string;
  roomName: string;
  expiresAt: string;
  totalAmount: number;
  itemCount: number;
  riskStatuses: RiskStatus[];
};

