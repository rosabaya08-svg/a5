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
      { label: "오늘 매출", value: formatCurrency(paidAmount), helper: "결제 완료 주문 기준", tone: "green" },
      { label: "활성 QR", value: formatNumber(activeQr), helper: "만료 전 결제 대기 QR", tone: "blue" },
      { label: "승인 대기 상품", value: formatNumber(pendingProducts), helper: "관리자 검수 필요", tone: "amber" },
      { label: "정산 보류", value: formatNumber(blockedSettlements), helper: "지급 전 확인 필요", tone: "red" },
    ];
  },

  companyMetrics(companyId = "company-sanho-care"): DashboardMetric[] {
    const companyItems = mockOrderItems.filter((item) => item.companyId === companyId);
    const sales = companyItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const payout = companyItems.reduce((total, item) => total + item.settlementAmount, 0);
    const products = mockProducts.filter((product) => product.companyId === companyId);

    return [
      { label: "입점사 매출", value: formatCurrency(sales), helper: "order_items 기준", tone: "green" },
      { label: "예상 입금", value: formatCurrency(payout), helper: "인피니 7% 공제 기준", tone: "blue" },
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
      { label: "객실", value: formatNumber(rooms.length), helper: "등록 객실", tone: "neutral" },
      { label: "태블릿", value: formatNumber(tablets.length), helper: "활성/점검 포함", tone: "blue" },
      { label: "QR 이력", value: formatNumber(qr.length), helper: "출처 추적", tone: "purple" },
      { label: "현장수령", value: formatNumber(pickupOrders.length), helper: "조리원 처리", tone: "green" },
    ];
  },

  risks(): RiskItem[] {
    return [
      {
        id: "risk-payment-prod",
        title: "운영 PG 연결 확인",
        severity: "high",
        owner: "최고관리자",
        detail: "계약, 테스트 MID, 공식 문서, webhook 검증 완료 후 실제 결제를 열어야 합니다.",
      },
      {
        id: "risk-firebase",
        title: "저장 권한 확인",
        severity: "high",
        owner: "운영/개발",
        detail: "orders, payments, qr_sessions 쓰기는 보안 규칙과 Functions 권한을 기준으로 제한합니다.",
      },
      {
        id: "risk-pg-server",
        title: "PG 서버 confirm 계층 필요",
        severity: "high",
        owner: "개발/PG",
        detail: "Static export 화면에서 secret key를 직접 사용하지 않고 Firebase Functions를 통해 승인합니다.",
      },
      {
        id: "risk-payout",
        title: "정산 지급 검토",
        severity: "medium",
        owner: "재무 검토",
        detail: "order_items 기준 계산 결과를 확인한 뒤 지급 실행 시스템과 연결합니다.",
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
