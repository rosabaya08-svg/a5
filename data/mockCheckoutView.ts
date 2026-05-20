import type { MockCheckoutSummary, MockGuestLookupResult } from "@/types/mockCheckoutView";

export const mockCheckoutSummary: MockCheckoutSummary = {
  id: "checkout-preview-001",
  shortCode: "SANHO701",
  orderNo: "A5-20260520-101",
  nurseryName: "Sanho Postpartum Care",
  roomName: "Room 701",
  payerLabel: "Guest mobile payer",
  expiresAt: "2026-05-20 23:10",
  deliveryFee: 0,
  discountAmount: 26000,
  riskStatuses: ["mock_only", "integration_pending"],
  items: [
    {
      id: "checkout-line-001",
      name: "Recovery care premium kit",
      optionName: "Standard",
      quantity: 1,
      unitPrice: 119000,
      fulfillment: "delivery",
    },
    {
      id: "checkout-line-002",
      name: "Room pickup snack bundle",
      optionName: "Pickup pack",
      quantity: 1,
      unitPrice: 35000,
      fulfillment: "pickup",
    },
  ],
};

export const mockGuestLookupResult: MockGuestLookupResult = {
  orderNo: "A5-20260519-001",
  phoneMasked: "010-****-8601",
  statusLabel: "Mock payment approved",
  fulfillmentLabel: "Pickup ready",
  totalAmount: 154000,
  lastUpdatedAt: "2026-05-20 21:20",
  riskStatuses: ["mock_only", "integration_pending"],
};

