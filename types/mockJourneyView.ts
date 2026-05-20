import type { RiskStatus } from "@/types/mockUi";

export type JourneyStepKind =
  | "tablet_browse"
  | "cart_review"
  | "qr_generate"
  | "mobile_checkout"
  | "payment_result"
  | "guest_lookup";

export type JourneyStep = {
  id: string;
  kind: JourneyStepKind;
  title: string;
  routeCandidate: string;
  actor: string;
  description: string;
  mockState: "ready" | "blocked" | "manual_review";
  riskStatuses: RiskStatus[];
};

export type JourneyDecision = {
  id: string;
  title: string;
  safeMockChoice: string;
  liveRequirement: string;
  riskStatuses: RiskStatus[];
};

