import { calculateInfinySettlement } from "@/lib/payments/infinySettlementPolicy";
import type { AnalyticsTile, RiskDistributionItem, SettlementPreviewItem } from "@/types/mockAnalyticsView";

export const analyticsTiles: AnalyticsTile[] = [
  {
    id: "tile-orders",
    label: "모의 주문",
    value: "38",
    trendLabel: "오늘 +12",
    helper: "결제 완료, 대기, 실패, 현장수령, 환불 요청 모의 상태를 포함합니다.",
    riskStatuses: ["mock_only"],
  },
  {
    id: "tile-qr",
    label: "QR 세션",
    value: "51",
    trendLabel: "만료 8건",
    helper: "활성, 결제 완료, 만료, 취소 세션의 정적 상태 집계입니다.",
    riskStatuses: ["mock_only", "expired"],
  },
  {
    id: "tile-sales",
    label: "모의 총매출",
    value: "480만원",
    trendLabel: "미리보기 전용",
    helper: "회계 데이터가 아니며 실제 입금 또는 정산에 사용하면 안 됩니다.",
    riskStatuses: ["settlement_hold", "mock_only"],
  },
  {
    id: "tile-risk",
    label: "연동 차단 항목",
    value: "5",
    trendLabel: "전부 차단",
    helper: "Firebase, PG, Storage, 알림톡, 배송조회가 차단 상태로 남아 있습니다.",
    riskStatuses: ["blocked", "integration_pending"],
  },
];

export const riskDistributionItems: RiskDistributionItem[] = [
  {
    id: "risk-mock-only",
    label: "모의 전용",
    count: 42,
    percentage: 52,
    riskStatuses: ["mock_only"],
  },
  {
    id: "risk-integration",
    label: "연동 대기",
    count: 18,
    percentage: 22,
    riskStatuses: ["integration_pending"],
  },
  {
    id: "risk-inventory",
    label: "재고 부족",
    count: 7,
    percentage: 9,
    riskStatuses: ["inventory_low"],
  },
  {
    id: "risk-blocked",
    label: "차단",
    count: 14,
    percentage: 17,
    riskStatuses: ["blocked"],
  },
];

export const settlementPreviewItems: SettlementPreviewItem[] = [
  {
    id: "settlement-preview-001",
    companyName: "A5 케어 서플라이",
    period: "2026-05-W3",
    grossAmount: 1840000,
    commissionAmount: calculateInfinySettlement(1840000).totalFeeAmount,
    holdAmount: 0,
    payoutPreview: calculateInfinySettlement(1840000).payoutAmount,
    state: "confirmed_mock",
    riskStatuses: ["mock_only", "settlement_hold"],
  },
  {
    id: "settlement-preview-002",
    companyName: "회복 선물 상사",
    period: "2026-05-W3",
    grossAmount: 960000,
    commissionAmount: calculateInfinySettlement(960000).totalFeeAmount,
    holdAmount: 120000,
    payoutPreview: calculateInfinySettlement(960000).payoutAmount - 120000,
    state: "review",
    riskStatuses: ["needs_review", "settlement_hold"],
  },
  {
    id: "settlement-preview-003",
    companyName: "외부 재고 파트너",
    period: "2026-05-W3",
    grossAmount: 420000,
    commissionAmount: calculateInfinySettlement(420000).totalFeeAmount,
    holdAmount: calculateInfinySettlement(420000).payoutAmount,
    payoutPreview: 0,
    state: "payout_blocked",
    riskStatuses: ["blocked", "integration_pending"],
  },
];
