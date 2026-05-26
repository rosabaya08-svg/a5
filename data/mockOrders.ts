import { calculateInfinySettlement } from "@/lib/payments/infinySettlementPolicy";
import type { AuditLog, Order, OrderItem, Payment } from "@/types/commerce";

export const mockOrders: Order[] = [
  {
    id: "order-001",
    orderNo: "A5-20260519-001",
    qrSessionId: "qr-001",
    nurseryId: "nursery-test-1004",
    roomId: "room-701",
    customerName: "김*영",
    customerPhoneMasked: "010-****-2388",
    status: "paid",
    deliveryMethod: "pickup",
    totalAmount: 127000,
    paidAt: "2026-05-19T10:09:00+09:00",
    createdAt: "2026-05-19T10:05:00+09:00",
    itemIds: ["order-item-001", "order-item-002"],
  },
];

export const mockOrderItems: OrderItem[] = [
  {
    id: "order-item-001",
    orderId: "order-001",
    companyId: "company-test-1004",
    productName: "산모 회복 케어 키트",
    optionName: "기본 구성",
    quantity: 1,
    unitPrice: 69000,
    deliveryStatus: "pickup_ready",
    settlementAmount: calculateInfinySettlement(69000).payoutAmount,
  },
  {
    id: "order-item-002",
    orderId: "order-001",
    companyId: "company-test-1004",
    productName: "수유 자세 서포트 필로우",
    optionName: "단품",
    quantity: 1,
    unitPrice: 58000,
    deliveryStatus: "pickup_ready",
    settlementAmount: calculateInfinySettlement(58000).payoutAmount,
  },
];

export const mockPayments: Payment[] = [
  {
    id: "payment-001",
    orderId: "order-001",
    orderNo: "A5-20260519-001",
    status: "approved_mock",
    amount: 127000,
    mockTid: "TEST-TID-20260519-001",
    approvedAt: "2026-05-19T10:09:00+09:00",
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "audit-001",
    actorRole: "SUPER_ADMIN",
    actorName: "최고관리자",
    action: "approve",
    target: "company-test-1004",
    message: "테스트 기업 승인",
    createdAt: "2026-05-19T09:30:00+09:00",
  },
];
