import { mockCompanies } from "@/data/mockCompanies";
import { mockNurseries } from "@/data/mockNurseries";
import { mockOrders, mockOrderItems, mockPayments, mockAuditLogs } from "@/data/mockOrders";
import { mockProducts, mockProductOptions } from "@/data/mockProducts";
import { mockQrSessions } from "@/data/mockQrSessions";
import { mockRooms } from "@/data/mockRooms";
import { mockSettlements } from "@/data/mockSettlements";
import { mockTablets } from "@/data/mockTablets";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import type { DashboardMetric, RiskItem } from "@/types/commerce";

export const mockApi = {
  companies: () => mockCompanies,
  nurseries: () => mockNurseries,
  rooms: () => mockRooms,
  tablets: () => mockTablets,
  products: () => mockProducts,
  productOptions: () => mockProductOptions,
  qrSessions: () => mockQrSessions,
  orders: () => mockOrders,
  orderItems: () => mockOrderItems,
  payments: () => mockPayments,
  settlements: () => mockSettlements,
  auditLogs: () => mockAuditLogs,

  adminMetrics(): DashboardMetric[] {
    const paidAmount = mockOrders
      .filter((order) => order.status !== "cancelled")
      .reduce((total, order) => total + order.totalAmount, 0);
    const activeQr = mockQrSessions.filter((session) => session.status === "active").length;
    const pendingProducts = mockProducts.filter(
      (product) => product.status === "pending_approval",
    ).length;
    const blockedSettlements = mockSettlements.filter(
      (settlement) => settlement.status === "payout_blocked",
    ).length;

    return [
      { label: "Mock sales", value: formatCurrency(paidAmount), helper: "Orders only, no PG", tone: "green" },
      { label: "Active QR", value: formatNumber(activeQr), helper: "Short lived QR sessions", tone: "blue" },
      {
        label: "Products pending",
        value: formatNumber(pendingProducts),
        helper: "Approval queue mock",
        tone: "amber",
      },
      {
        label: "Payout blocks",
        value: formatNumber(blockedSettlements),
        helper: "Real payouts disabled",
        tone: "red",
      },
    ];
  },

  companyMetrics(companyId = "company-sanho-care"): DashboardMetric[] {
    const companyItems = mockOrderItems.filter((item) => item.companyId === companyId);
    const sales = companyItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const payout = companyItems.reduce((total, item) => total + item.settlementAmount, 0);
    const products = mockProducts.filter((product) => product.companyId === companyId);

    return [
      { label: "Company sales", value: formatCurrency(sales), helper: "order_items basis", tone: "green" },
      { label: "Expected payout", value: formatCurrency(payout), helper: "No real transfer", tone: "blue" },
      { label: "Products", value: formatNumber(products.length), helper: "Approved and pending", tone: "neutral" },
      {
        label: "Low stock",
        value: formatNumber(products.filter((product) => product.stock < 10).length),
        helper: "Under 10 units",
        tone: "amber",
      },
    ];
  },

  nurseryMetrics(nurseryId = "nursery-gangnam-01"): DashboardMetric[] {
    const rooms = mockRooms.filter((room) => room.nurseryId === nurseryId);
    const tablets = mockTablets.filter((tablet) => tablet.nurseryId === nurseryId);
    const qr = mockQrSessions.filter((session) => session.nurseryId === nurseryId);
    const pickupOrders = mockOrders.filter(
      (order) => order.nurseryId === nurseryId && order.deliveryMethod === "pickup",
    );

    return [
      { label: "Rooms", value: formatNumber(rooms.length), helper: "Mock registered rooms", tone: "neutral" },
      { label: "Tablets", value: formatNumber(tablets.length), helper: "Active and maintenance", tone: "blue" },
      { label: "QR sessions", value: formatNumber(qr.length), helper: "Source tracking", tone: "purple" },
      { label: "Pickup orders", value: formatNumber(pickupOrders.length), helper: "Nursery handled", tone: "green" },
    ];
  },

  risks(): RiskItem[] {
    return [
      {
        id: "risk-payment-prod",
        title: "Real PG connection blocked",
        severity: "high",
        owner: "Executive approval",
        detail: "The beta uses mock payment states until contract, test MID, and official docs are ready.",
      },
      {
        id: "risk-firebase",
        title: "Firebase environment not connected",
        severity: "high",
        owner: "Ops and engineering",
        detail: "No Firebase SDK, Auth, Firestore, Storage, rules, or deploy configuration is created here.",
      },
      {
        id: "risk-payout",
        title: "Real payout execution blocked",
        severity: "medium",
        owner: "Finance review",
        detail: "Settlement amounts are shown as order item snapshots only.",
      },
    ];
  },

  findProduct(productId: string) {
    return mockProducts.find((product) => product.id === productId) ?? mockProducts[0];
  },

  findQr(shortCode: string) {
    return (
      mockQrSessions.find(
        (session) => session.shortCode.toLowerCase() === shortCode.toLowerCase(),
      ) ?? mockQrSessions[0]
    );
  },

  findOrder(orderNo: string) {
    return mockOrders.find((order) => order.orderNo === orderNo) ?? mockOrders[0];
  },
};
