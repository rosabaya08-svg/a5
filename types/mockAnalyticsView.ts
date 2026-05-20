import type { RiskStatus } from "@/types/mockUi";

export type AnalyticsTile = {
  id: string;
  label: string;
  value: string;
  trendLabel: string;
  helper: string;
  riskStatuses: RiskStatus[];
};

export type RiskDistributionItem = {
  id: string;
  label: string;
  count: number;
  percentage: number;
  riskStatuses: RiskStatus[];
};

export type SettlementPreviewItem = {
  id: string;
  companyName: string;
  period: string;
  grossAmount: number;
  commissionAmount: number;
  holdAmount: number;
  payoutPreview: number;
  state: "review" | "confirmed_mock" | "payout_blocked";
  riskStatuses: RiskStatus[];
};

