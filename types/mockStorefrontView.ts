import type { RiskStatus } from "@/types/mockUi";

export type StorefrontBanner = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  nurseryName: string;
  roomName: string;
  expiresAt: string;
  riskStatuses: RiskStatus[];
};

export type StorefrontCategory = {
  id: string;
  label: string;
  itemCount: number;
  helper: string;
};

export type StorefrontBenefit = {
  id: string;
  title: string;
  description: string;
  riskStatuses: RiskStatus[];
};

export type StorefrontPriceLayer = {
  id: string;
  title: string;
  normalPriceLabel: string;
  closedMallPriceLabel: string;
  comparisonLabel: string;
  disclaimer: string;
};

