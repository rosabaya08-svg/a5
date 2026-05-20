import type {
  ApprovalQueueItem,
  IntegrationGate,
  OperationMetric,
  SmokeRouteCandidate,
} from "@/types/mockOperationsView";

export const operationMetrics: OperationMetric[] = [
  {
    id: "metric-admin-orders",
    label: "Admin order states",
    value: "12",
    helper: "Paid, failed, pickup, refund request, and settlement hold mock states.",
    track: "admin",
    riskStatuses: ["mock_only"],
  },
  {
    id: "metric-company-products",
    label: "Company product states",
    value: "9",
    helper: "Draft, approval pending, rejected, approved, suspended, and low inventory states.",
    track: "company",
    riskStatuses: ["needs_review", "mock_only"],
  },
  {
    id: "metric-nursery-tablets",
    label: "Nursery device states",
    value: "6",
    helper: "Active, inactive, maintenance, and QR source tracking states.",
    track: "nursery",
    riskStatuses: ["mock_only"],
  },
  {
    id: "metric-qr-sessions",
    label: "QR session variants",
    value: "8",
    helper: "Active, expired, paid, cancelled, and ask-payment mock flows.",
    track: "tablet_qr",
    riskStatuses: ["integration_pending", "mock_only"],
  },
];

export const approvalQueueItems: ApprovalQueueItem[] = [
  {
    id: "approval-product-001",
    title: "Premium recovery kit approval",
    owner: "Company admin",
    track: "company",
    statusLabel: "Pending approval",
    requestedAt: "2026-05-20 19:40",
    riskStatuses: ["needs_review", "mock_only"],
  },
  {
    id: "approval-refund-001",
    title: "Refund request review",
    owner: "Super admin",
    track: "admin",
    statusLabel: "Review only",
    requestedAt: "2026-05-20 20:10",
    riskStatuses: ["blocked", "mock_only"],
  },
  {
    id: "approval-storage-001",
    title: "Storage upgrade decision",
    owner: "Firebase owner",
    track: "firebase_contract",
    statusLabel: "Approval needed",
    requestedAt: "2026-05-20 21:00",
    riskStatuses: ["integration_pending", "blocked"],
  },
];

export const integrationGates: IntegrationGate[] = [
  {
    id: "gate-firebase",
    name: "Firebase connection",
    currentState: "approval_needed",
    blocker: "Firestore rules are locked and config files must not be generated yet.",
    nextSafeStep: "Finalize repository contracts and rules plan before SDK import.",
    riskStatuses: ["blocked", "integration_pending"],
  },
  {
    id: "gate-pg",
    name: "PG payment",
    currentState: "docs_needed",
    blocker: "Official PG docs, test keys, refund policy, and settlement flow are not approved.",
    nextSafeStep: "Keep payment adapter in mock mode and document live handoff gates.",
    riskStatuses: ["blocked", "payment_failed"],
  },
  {
    id: "gate-storage",
    name: "Firebase Storage",
    currentState: "blocked",
    blocker: "Spark plan blocks Storage usage. Blaze upgrade is a separate approval item.",
    nextSafeStep: "Use placeholder product media until product registration is approved.",
    riskStatuses: ["blocked", "integration_pending"],
  },
  {
    id: "gate-delivery",
    name: "Delivery tracking",
    currentState: "mock_ready",
    blocker: "No carrier API account or operating key is approved.",
    nextSafeStep: "Keep delivery status as mock state labels only.",
    riskStatuses: ["mock_only", "integration_pending"],
  },
];

export const smokeRouteCandidates: SmokeRouteCandidate[] = [
  {
    id: "route-mock-ui",
    route: "/mock-ui",
    area: "qa",
    purpose: "Common state, filter, and detail preview.",
    expectedState: "preview",
    riskStatuses: ["mock_only"],
  },
  {
    id: "route-mock-detail",
    route: "/mock-ui/detail",
    area: "qa",
    purpose: "Product, QR, and order detail mock preview.",
    expectedState: "preview",
    riskStatuses: ["mock_only"],
  },
  {
    id: "route-mock-checkout",
    route: "/mock-ui/checkout",
    area: "tablet_qr",
    purpose: "QR checkout and guest lookup preview.",
    expectedState: "preview",
    riskStatuses: ["mock_only", "integration_pending"],
  },
  {
    id: "route-mock-operations",
    route: "/mock-ui/operations",
    area: "admin",
    purpose: "Operations, approvals, gates, and smoke route matrix.",
    expectedState: "preview",
    riskStatuses: ["mock_only"],
  },
];

