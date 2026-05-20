import type { RiskStatus } from "@/types/mockUi";

export type MockPreviewRoute = {
  id: string;
  href: string;
  title: string;
  description: string;
  area: "storefront" | "checkout" | "session" | "operations" | "qa" | "analytics" | "detail";
  riskStatuses: RiskStatus[];
};

