import { mockCompanies } from "@/data/mockCompanies";
import { mockNurseries } from "@/data/mockNurseries";
import { mockOrders, mockOrderItems, mockPayments, mockAuditLogs } from "@/data/mockOrders";
import { mockProducts, mockProductOptions } from "@/data/mockProducts";
import { mockQrSessions } from "@/data/mockQrSessions";
import { mockRooms } from "@/data/mockRooms";
import { mockSettlements } from "@/data/mockSettlements";
import { mockTablets } from "@/data/mockTablets";
import type { DashboardMetric, RiskItem } from "@/types/commerce";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

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
      { label: "오늘 모의 매출", value: formatCurrency(paidAmount), helper: "실결제 아님", tone: "green" },
      { label: "활성 QR", value: formatNumber(activeQr), helper: "2~3시간 만료 대상", tone: "blue" },
      { label: "승인 대기 상품", value: formatNumber(pendingProducts), helper: "관리자 검수 필요", tone: "amber" },
      { label: "정산 보류", value: formatNumber(blockedSettlements), helper: "실지급 금지", tone: "red" },
    ];
  },

  companyMetrics(companyId = "company-sanho-care"): DashboardMetric[] {
    const companyItems = mockOrderItems.filter((item) => item.companyId === companyId);
    const sales = companyItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const payout = companyItems.reduce((total, item) => total + item.settlementAmount, 0);
    const products = mockProducts.filter((product) => product.companyId === companyId);

    return [
      { label: "입점사 모의 매출", value: formatCurrency(sales), helper: "order_items 기준", tone: "green" },
      { label: "예상 입금", value: formatCurrency(payout), helper: "인피니 7% 공제 / 실지급 아님", tone: "blue" },
      { label: "상품 수", value: formatNumber(products.length), helper: "승인/대기 포함", tone: "neutral" },
      {
        label: "재고 부족",
        value: formatNumber(products.filter((product) => product.stock < 10).length),
        helper: "10개 미만",
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
      { label: "객실", value: formatNumber(rooms.length), helper: "모의 등록 객실", tone: "neutral" },
      { label: "태블릿", value: formatNumber(tablets.length), helper: "활성/점검 포함", tone: "blue" },
      { label: "QR 이력", value: formatNumber(qr.length), helper: "출처 추적", tone: "purple" },
      { label: "현장수령", value: formatNumber(pickupOrders.length), helper: "조리원 처리", tone: "green" },
    ];
  },

  risks(): RiskItem[] {
    return [
      {
        id: "risk-payment-prod",
        title: "운영 PG 연결 금지",
        severity: "high",
        owner: "대표님 승인",
        detail: "계약, 테스트 MID, 공식 문서 전까지 모의 어댑터만 허용.",
      },
      {
        id: "risk-firebase",
        title: "Firebase write 권한 미확정",
        severity: "high",
        owner: "운영/개발",
        detail: "products read 외 orders/payments/qr_sessions write는 보안 규칙 확정 전 연결 금지.",
      },
      {
        id: "risk-pg-server",
        title: "PG 서버 confirm 계층 필요",
        severity: "high",
        owner: "개발/PG사",
        detail: "Static export 화면에서는 secret key를 사용할 수 없어 Functions, Cloud Run, Workers 중 하나가 필요.",
      },
      {
        id: "risk-payout",
        title: "정산 지급 차단",
        severity: "medium",
        owner: "재무 검토",
        detail: "베타는 order_items 기준 계산 초안만 표시.",
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
