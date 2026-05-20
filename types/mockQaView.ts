import type { RiskStatus } from "@/types/mockUi";

export type MergeTrackState = "waiting" | "ready_for_review" | "conflict_risk" | "blocked";

export type MergeTrackItem = {
  id: string;
  track: string;
  folder: string;
  allowedPaths: string[];
  mergeOrder: number;
  state: MergeTrackState;
  notes: string;
  riskStatuses: RiskStatus[];
};

export type ManualChecklistItem = {
  id: string;
  title: string;
  commandOrRoute: string;
  reason: string;
  state: "todo" | "blocked" | "manual_only";
  riskStatuses: RiskStatus[];
};

export type ReleaseReadinessItem = {
  id: string;
  area: string;
  requirement: string;
  currentState: string;
  requiredBeforeLive: string;
  riskStatuses: RiskStatus[];
};

