import { mockQrSessions } from "@/data/mockQrSessions";
import type { AuditLog, Order, OrderItem, Payment } from "@/types/commerce";

const bulkQrSessions = mockQrSessions.filter((session) => session.id.startsWith("qr-bulk-"));

const bulkOrders: Order[] = bulkQrSessions.map((session, index) => {
  const seq = index + 10;
  const isPaid = session.status === "paid";
  const isCancelled = session.status === "cancelled";
  const isExpired = session.status === "expired";
  const isPickup = session.deliveryMethod === "pickup";
  const status: Order["status"] = isCancelled
    ? "cancelled"
    : isExpired
      ? "pending_payment"
      : isPaid && isPickup
        ? "picked_up"
        : isPaid
          ? "delivered"
          : "pending_payment";

  return {
    id: `order-bulk-${String(seq).padStart(3, "0")}`,
    orderNo: `A5-202605${index < 12 ? "19" : "18"}-${String(seq).padStart(3, "0")}`,
    qrSessionId: session.id,
    nurseryId: session.nurseryId,
    roomId: session.roomId,
    customerName: `Sample Guest ${seq}`,
    customerPhoneMasked: `010-****-${String(2300 + seq).padStart(4, "0")}`,
    status,
    deliveryMethod: session.deliveryMethod,
    totalAmount: session.totalAmount,
    paidAt: isPaid ? session.createdAt.replace(":10:00", ":18:00") : undefined,
    createdAt: session.createdAt,
    itemIds: [`order-item-bulk-${String(seq).padStart(3, "0")}`],
  };
});

const bulkOrderItems: OrderItem[] = bulkOrders.map((order, index) => {
  const session = bulkQrSessions[index];
  const item = session.items[0];
  const deliveryStatus: OrderItem["deliveryStatus"] =
    order.status === "delivered"
      ? "delivered"
      : order.status === "picked_up"
        ? "picked_up"
        : order.deliveryMethod === "pickup"
          ? "pickup_ready"
          : "invoice_pending";

  return {
    id: order.itemIds[0],
    orderId: order.id,
    companyId: item.companyId,
    productName: item.productName,
    optionName: item.optionName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    deliveryStatus,
    settlementAmount: order.status === "cancelled" ? 0 : Math.round(order.totalAmount * 0.88),
  };
});

const bulkPayments: Payment[] = bulkOrders.map((order, index) => {
  const session = bulkQrSessions[index];
  const status: Payment["status"] =
    session.status === "paid"
      ? "approved_mock"
      : session.status === "cancelled"
        ? "cancelled_mock"
        : session.status === "expired"
          ? "failed_mock"
          : "ready";

  return {
    id: `payment-bulk-${String(index + 10).padStart(3, "0")}`,
    orderId: order.id,
    orderNo: order.orderNo,
    status,
    amount: order.totalAmount,
    mockTid: `MOCK-TID-BULK-${String(index + 10).padStart(3, "0")}`,
    approvedAt: status === "approved_mock" ? order.paidAt : undefined,
  };
});

export const mockOrders: Order[] = [
  {
    id: "order-001",
    orderNo: "A5-20260519-001",
    qrSessionId: "qr-002",
    nurseryId: "nursery-bundang-01",
    roomId: "room-501",
    customerName: "Kim B.",
    customerPhoneMasked: "010-****-2388",
    status: "paid",
    deliveryMethod: "delivery",
    totalAmount: 128000,
    paidAt: "2026-05-19T10:09:00+09:00",
    createdAt: "2026-05-19T10:05:00+09:00",
    itemIds: ["order-item-001"],
  },
  {
    id: "order-002",
    orderNo: "A5-20260519-002",
    qrSessionId: "qr-001",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-701",
    customerName: "Park R.",
    customerPhoneMasked: "010-****-7811",
    status: "ready_for_pickup",
    deliveryMethod: "pickup",
    totalAmount: 147000,
    paidAt: "2026-05-19T15:28:00+09:00",
    createdAt: "2026-05-19T15:22:00+09:00",
    itemIds: ["order-item-002", "order-item-004"],
  },
  {
    id: "order-004",
    orderNo: "A5-20260519-003",
    qrSessionId: "qr-005",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-701",
    customerName: "Guardian P.",
    customerPhoneMasked: "010-****-4455",
    status: "paid",
    deliveryMethod: "pickup",
    totalAmount: 58000,
    paidAt: "2026-05-19T16:08:00+09:00",
    createdAt: "2026-05-19T16:01:00+09:00",
    itemIds: ["order-item-005"],
  },
  {
    id: "order-003",
    orderNo: "A5-20260518-011",
    qrSessionId: "qr-003",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-702",
    customerName: "Lee M.",
    customerPhoneMasked: "010-****-4402",
    status: "refund_requested",
    deliveryMethod: "pickup",
    totalAmount: 39000,
    paidAt: "2026-05-18T21:02:00+09:00",
    createdAt: "2026-05-18T20:56:00+09:00",
    itemIds: ["order-item-003"],
  },
  {
    id: "order-005",
    orderNo: "A5-20260519-004",
    qrSessionId: "qr-006",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-702",
    customerName: "Choi H.",
    customerPhoneMasked: "010-****-6631",
    status: "cancelled",
    deliveryMethod: "delivery",
    totalAmount: 97000,
    createdAt: "2026-05-19T11:45:00+09:00",
    itemIds: ["order-item-006"],
  },
  {
    id: "order-007",
    orderNo: "A5-20260519-005",
    qrSessionId: "qr-008",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-701",
    customerName: "Sample C.",
    customerPhoneMasked: "010-****-7710",
    status: "cancelled",
    deliveryMethod: "pickup",
    totalAmount: 39000,
    createdAt: "2026-05-19T17:05:00+09:00",
    itemIds: ["order-item-008"],
  },
  {
    id: "order-006",
    orderNo: "A5-20260518-012",
    qrSessionId: "qr-007",
    nurseryId: "nursery-bundang-01",
    roomId: "room-501",
    customerName: "Han S.",
    customerPhoneMasked: "010-****-9042",
    status: "delivered",
    deliveryMethod: "delivery",
    totalAmount: 47000,
    paidAt: "2026-05-18T13:28:00+09:00",
    createdAt: "2026-05-18T13:20:00+09:00",
    itemIds: ["order-item-007"],
  },
  ...bulkOrders,
];

export const mockOrderItems: OrderItem[] = [
  {
    id: "order-item-001",
    orderId: "order-001",
    companyId: "company-bebe-lux",
    productName: "Premium Diaper Tote Bag",
    optionName: "Cream",
    quantity: 1,
    unitPrice: 128000,
    deliveryStatus: "invoice_pending",
    settlementAmount: 108800,
  },
  {
    id: "order-item-002",
    orderId: "order-002",
    companyId: "company-sanho-care",
    productName: "Mother Care Recovery Kit",
    optionName: "Family refill",
    quantity: 1,
    unitPrice: 75000,
    deliveryStatus: "pickup_ready",
    settlementAmount: 66000,
  },
  {
    id: "order-item-004",
    orderId: "order-002",
    companyId: "company-momtable",
    productName: "Nursing Rooibos Tea Set",
    optionName: "20 sachets",
    quantity: 2,
    unitPrice: 36000,
    deliveryStatus: "pickup_ready",
    settlementAmount: 64800,
  },
  {
    id: "order-item-003",
    orderId: "order-003",
    companyId: "company-bebe-lux",
    productName: "Newborn Air Blanket",
    optionName: "Basic",
    quantity: 1,
    unitPrice: 39000,
    deliveryStatus: "picked_up",
    settlementAmount: 33150,
  },
  {
    id: "order-item-005",
    orderId: "order-004",
    companyId: "company-sanho-care",
    productName: "Nursing Position Support Pillow",
    optionName: "Pillow",
    quantity: 1,
    unitPrice: 58000,
    deliveryStatus: "pickup_ready",
    settlementAmount: 51040,
  },
  {
    id: "order-item-006",
    orderId: "order-005",
    companyId: "company-bebe-lux",
    productName: "Compact Baby Room Monitor",
    optionName: "Single unit",
    quantity: 1,
    unitPrice: 97000,
    deliveryStatus: "invoice_pending",
    settlementAmount: 0,
  },
  {
    id: "order-item-008",
    orderId: "order-007",
    companyId: "company-bebe-lux",
    productName: "Newborn Air Blanket",
    optionName: "Basic",
    quantity: 1,
    unitPrice: 39000,
    deliveryStatus: "invoice_pending",
    settlementAmount: 0,
  },
  {
    id: "order-item-007",
    orderId: "order-006",
    companyId: "company-sanho-care",
    productName: "Mother Baby Wrap Set",
    optionName: "Soft set",
    quantity: 1,
    unitPrice: 47000,
    deliveryStatus: "delivered",
    settlementAmount: 41360,
  },
  ...bulkOrderItems,
];

export const mockPayments: Payment[] = [
  {
    id: "payment-001",
    orderId: "order-001",
    orderNo: "A5-20260519-001",
    status: "approved_mock",
    amount: 128000,
    mockTid: "MOCK-TID-20260519-001",
    approvedAt: "2026-05-19T10:09:00+09:00",
  },
  {
    id: "payment-002",
    orderId: "order-002",
    orderNo: "A5-20260519-002",
    status: "approved_mock",
    amount: 147000,
    mockTid: "MOCK-TID-20260519-002",
    approvedAt: "2026-05-19T15:28:00+09:00",
  },
  {
    id: "payment-003",
    orderId: "order-003",
    orderNo: "A5-20260518-011",
    status: "cancel_requested",
    amount: 39000,
    mockTid: "MOCK-TID-20260518-011",
    approvedAt: "2026-05-18T21:02:00+09:00",
  },
  {
    id: "payment-004",
    orderId: "order-004",
    orderNo: "A5-20260519-003",
    status: "approved_mock",
    amount: 58000,
    mockTid: "MOCK-TID-20260519-003",
    approvedAt: "2026-05-19T16:08:00+09:00",
  },
  {
    id: "payment-005",
    orderId: "order-005",
    orderNo: "A5-20260519-004",
    status: "failed_mock",
    amount: 97000,
    mockTid: "MOCK-TID-FAILED-20260519-004",
  },
  {
    id: "payment-006",
    orderId: "order-006",
    orderNo: "A5-20260518-012",
    status: "approved_mock",
    amount: 47000,
    mockTid: "MOCK-TID-20260518-012",
    approvedAt: "2026-05-18T13:28:00+09:00",
  },
  ...bulkPayments,
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "audit-001",
    actorRole: "SUPER_ADMIN",
    actorName: "Ops admin",
    action: "approve",
    target: "product-care-kit",
    message: "Approved product in mock approval queue.",
    createdAt: "2026-05-19T09:30:00+09:00",
  },
  {
    id: "audit-002",
    actorRole: "COMPANY_ADMIN",
    actorName: "Sanho Care",
    action: "update",
    target: "order-002",
    message: "Changed pickup order to pickup ready in mock state.",
    createdAt: "2026-05-19T15:40:00+09:00",
  },
  {
    id: "audit-003",
    actorRole: "SUPER_ADMIN",
    actorName: "Ops admin",
    action: "blocked",
    target: "settlement-payout",
    message: "Blocked real payout execution for beta safety.",
    createdAt: "2026-05-19T16:10:00+09:00",
  },
];
