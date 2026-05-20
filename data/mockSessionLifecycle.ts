import type { DeviceContext, PayerHandoff, SessionLifecycleStep } from "@/types/mockSessionLifecycle";

export const sessionLifecycleSteps: SessionLifecycleStep[] = [
  {
    id: "step-cart",
    state: "draft_cart",
    title: "Tablet cart snapshot",
    description: "The tablet collects product, option, quantity, fulfillment, and room context as mock data.",
    actor: "tablet",
    riskStatuses: ["mock_only"],
  },
  {
    id: "step-qr",
    state: "qr_active",
    title: "QR session active",
    description: "A short code is displayed with an expiration message. No server session is created here.",
    actor: "system_mock",
    riskStatuses: ["mock_only", "integration_pending"],
  },
  {
    id: "step-handoff",
    state: "handoff_opened",
    title: "Mobile payer opens link",
    description: "The guest or guardian sees a mobile checkout preview without customer login.",
    actor: "guest_mobile",
    riskStatuses: ["mock_only"],
  },
  {
    id: "step-paid",
    state: "paid_mock",
    title: "Mock payment result",
    description: "The UI can show success or failure states without sending a PG request.",
    actor: "system_mock",
    riskStatuses: ["payment_failed", "mock_only"],
  },
  {
    id: "step-expired",
    state: "expired",
    title: "Expired or already used",
    description: "Expired and one-time-use cases must be blocked by server logic before live integration.",
    actor: "system_mock",
    riskStatuses: ["expired", "blocked"],
  },
];

export const deviceContexts: DeviceContext[] = [
  {
    id: "device-room-701",
    nurseryName: "Sanho Postpartum Care",
    roomName: "Room 701",
    tabletLabel: "Tablet 701-A",
    lastSeenAt: "2026-05-20 21:25",
    sourcePolicy: "Tablet-only closed mall entry. General browser access is a mock blocked state.",
    riskStatuses: ["mock_only"],
  },
  {
    id: "device-room-808",
    nurseryName: "Sanho Postpartum Care",
    roomName: "Room 808",
    tabletLabel: "Tablet 808-B",
    lastSeenAt: "2026-05-20 19:42",
    sourcePolicy: "Maintenance state should prevent QR creation until staff review.",
    riskStatuses: ["needs_review", "mock_only"],
  },
];

export const payerHandoffs: PayerHandoff[] = [
  {
    id: "handoff-purchase",
    shortCode: "SANHO701",
    type: "purchase",
    payerRole: "Guest mobile payer",
    displayMessage: "Review product snapshots and mock payable amount before entering payment preview.",
    expiryMessage: "Expires at 2026-05-20 23:10",
    riskStatuses: ["mock_only", "integration_pending"],
  },
  {
    id: "handoff-ask",
    shortCode: "ASKMOM88",
    type: "ask",
    payerRole: "Guardian payer",
    displayMessage: "Ask-payment link preview for a guardian outside the nursery room.",
    expiryMessage: "Expired sessions must show a safe blocked state.",
    riskStatuses: ["expired", "mock_only"],
  },
];

