import type { RiskStatus } from "@/types/mockUi";

export type OperationTrack = "admin" | "company" | "nursery" | "tablet_qr" | "firebase_contract" | "qa";

export type OperationMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  track: OperationTrack;
  riskStatuses: RiskStatus[];
};

export type ApprovalQueueItem = {
  id: string;
  title: string;
  owner: string;
  track: OperationTrack;
  statusLabel: string;
  requestedAt: string;
  riskStatuses: RiskStatus[];
};

export type IntegrationGate = {
  id: string;
  name: string;
  currentState: "blocked" | "mock_ready" | "docs_needed" | "approval_needed";
  blocker: string;
  nextSafeStep: string;
  riskStatuses: RiskStatus[];
};

export type SmokeRouteCandidate = {
  id: string;
  route: string;
  area: OperationTrack;
  purpose: string;
  expectedState: "preview" | "mock_page" | "blocked_until_validation";
  riskStatuses: RiskStatus[];
};

