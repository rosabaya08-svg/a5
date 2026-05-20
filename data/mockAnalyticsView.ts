import type { AnalyticsTile, RiskDistributionItem, SettlementPreviewItem } from "@/types/mockAnalyticsView";

export const analyticsTiles: AnalyticsTile[] = [
  {
    id: "tile-orders",
    label: "Mock orders",
    value: "38",
    trendLabel: "+12 today",
    helper: "Includes paid, pending, failed, pickup, and refund request mock states.",
    riskStatuses: ["mock_only"],
  },
  {
    id: "tile-qr",
    label: "QR sessions",
    value: "51",
    trendLabel: "8 expired",
    helper: "Static state counts for active, paid, expired, and cancelled sessions.",
    riskStatuses: ["mock_only", "expired"],
  },
  {
    id: "tile-sales",
    label: "Mock gross sales",
    value: "KRW 4.8M",
    trendLabel: "Preview only",
    helper: "Not accounting data. Do not use for real payout or settlement.",
    riskStatuses: ["settlement_hold", "mock_only"],
  },
  {
    id: "tile-risk",
    label: "Integration blockers",
    value: "5",
    trendLabel: "All blocked",
    helper: "Firebase, PG, Storage, Alimtalk, and delivery tracking remain closed.",
    riskStatuses: ["blocked", "integration_pending"],
  },
];

export const riskDistributionItems: RiskDistributionItem[] = [
  {
    id: "risk-mock-only",
    label: "Mock only",
    count: 42,
    percentage: 52,
    riskStatuses: ["mock_only"],
  },
  {
    id: "risk-integration",
    label: "Integration pending",
    count: 18,
    percentage: 22,
    riskStatuses: ["integration_pending"],
  },
  {
    id: "risk-inventory",
    label: "Low inventory",
    count: 7,
    percentage: 9,
    riskStatuses: ["inventory_low"],
  },
  {
    id: "risk-blocked",
    label: "Blocked",
    count: 14,
    percentage: 17,
    riskStatuses: ["blocked"],
  },
];

export const settlementPreviewItems: SettlementPreviewItem[] = [
  {
    id: "settlement-preview-001",
    companyName: "A5 Care Supplies",
    period: "2026-05-W3",
    grossAmount: 1840000,
    commissionAmount: 184000,
    holdAmount: 0,
    payoutPreview: 1656000,
    state: "confirmed_mock",
    riskStatuses: ["mock_only", "settlement_hold"],
  },
  {
    id: "settlement-preview-002",
    companyName: "Recovery Gift Co.",
    period: "2026-05-W3",
    grossAmount: 960000,
    commissionAmount: 96000,
    holdAmount: 120000,
    payoutPreview: 744000,
    state: "review",
    riskStatuses: ["needs_review", "settlement_hold"],
  },
  {
    id: "settlement-preview-003",
    companyName: "External Inventory Partner",
    period: "2026-05-W3",
    grossAmount: 420000,
    commissionAmount: 42000,
    holdAmount: 378000,
    payoutPreview: 0,
    state: "payout_blocked",
    riskStatuses: ["blocked", "integration_pending"],
  },
];

