import type { RiskStatus } from "@/types/mockUi";

export type SessionLifecycleState = "draft_cart" | "qr_active" | "handoff_opened" | "paid_mock" | "expired" | "cancelled";

export type SessionLifecycleStep = {
  id: string;
  state: SessionLifecycleState;
  title: string;
  description: string;
  actor: "tablet" | "guest_mobile" | "admin" | "system_mock";
  riskStatuses: RiskStatus[];
};

export type DeviceContext = {
  id: string;
  nurseryName: string;
  roomName: string;
  tabletLabel: string;
  lastSeenAt: string;
  sourcePolicy: string;
  riskStatuses: RiskStatus[];
};

export type PayerHandoff = {
  id: string;
  shortCode: string;
  type: "purchase" | "ask";
  payerRole: string;
  displayMessage: string;
  expiryMessage: string;
  riskStatuses: RiskStatus[];
};

