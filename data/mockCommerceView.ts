import type { MockMallProduct, MockQrSessionCard, MockTimelineStep } from "@/types/mockCommerceView";

export const mockMallProducts: MockMallProduct[] = [
  {
    id: "mall-care-001",
    name: "Recovery care premium kit",
    category: "Recovery",
    listPrice: 158000,
    closedMallPrice: 119000,
    platformLowestPrice: 132000,
    fulfillment: "both",
    stockState: "low_stock",
    stockCount: 4,
    riskStatuses: ["inventory_low", "mock_only"],
    tone: "sage",
  },
  {
    id: "mall-gift-002",
    name: "Newborn visitor gift set",
    category: "Gift",
    listPrice: 86000,
    closedMallPrice: 69000,
    platformLowestPrice: 76000,
    fulfillment: "delivery",
    stockState: "in_stock",
    stockCount: 22,
    riskStatuses: ["mock_only"],
    tone: "rose",
  },
  {
    id: "mall-care-003",
    name: "Room pickup snack bundle",
    category: "Care",
    listPrice: 42000,
    closedMallPrice: 35000,
    platformLowestPrice: 39000,
    fulfillment: "pickup",
    stockState: "in_stock",
    stockCount: 12,
    riskStatuses: ["mock_only"],
    tone: "gold",
  },
];

export const mockQrSessionCards: MockQrSessionCard[] = [
  {
    id: "qr-preview-001",
    shortCode: "SANHO701",
    nurseryName: "Sanho Postpartum Care",
    roomName: "Room 701",
    expiresAt: "2026-05-20 23:10",
    totalAmount: 154000,
    itemCount: 3,
    riskStatuses: ["mock_only", "integration_pending"],
  },
  {
    id: "qr-preview-002",
    shortCode: "ASKMOM88",
    nurseryName: "Sanho Postpartum Care",
    roomName: "Room 808",
    expiresAt: "2026-05-20 22:30",
    totalAmount: 69000,
    itemCount: 1,
    riskStatuses: ["expired", "mock_only"],
  },
];

export const mockOrderTimeline: MockTimelineStep[] = [
  {
    id: "created",
    label: "주문 생성",
    description: "장바구니 스냅샷과 QR 세션을 모의 데이터로 기록합니다.",
    state: "done",
    at: "2026-05-20 20:15",
  },
  {
    id: "paid",
    label: "모의 결제 승인",
    description: "PG 요청은 전송하지 않고 결제 성공 UI만 미리 보여줍니다.",
    state: "done",
    at: "2026-05-20 20:18",
  },
  {
    id: "fulfillment",
    label: "Fulfillment pending",
    description: "Delivery tracking and pickup confirmation are not connected.",
    state: "current",
  },
  {
    id: "settlement",
    label: "Settlement blocked",
    description: "Real settlement must stay blocked until PG and finance policy are approved.",
    state: "blocked",
  },
];
