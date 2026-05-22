export type QaStatusTone = "done" | "progress" | "blocked" | "risk" | "info";

export type QaStatusItem = {
  label: string;
  detail: string;
  tone: QaStatusTone;
};

export type QaRouteItem = {
  path: string;
  owner: string;
  purpose: string;
  states: string[];
};

export type QaStatusSummary = {
  track: string;
  route: string;
  modeLabel: string;
  generatedMajorFileCount: number;
  progressPercent: number;
  firebaseStatus: string;
  pgStatus: string;
  alimtalkStatus: string;
  deliveryStatus: string;
  externalInventoryStatus: string;
  storageStatus: string;
  majorScreens: string[];
  completedItems: QaStatusItem[];
  blockedItems: QaStatusItem[];
  nextTasks: string[];
  humanReviewItems: string[];
  smokeRoutes: QaRouteItem[];
  stateCoverage: QaStatusItem[];
};

export const qaStatusSummary: QaStatusSummary = {
  track: "qa",
  route: "/qa/status",
  modeLabel: "Mock/Test Beta - Not Production",
  generatedMajorFileCount: 60,
  progressPercent: 86,
  firebaseStatus: "No real connection",
  pgStatus: "Mock only",
  alimtalkStatus: "Blocker",
  deliveryStatus: "Blocker",
  externalInventoryStatus: "Blocker",
  storageStatus: "Spark limited, deferred",
  majorScreens: [
    "QA status dashboard",
    "QA route index hub",
    "QA visual smoke checklist",
    "QA merge handoff hub",
    "Route smoke checklist hub",
    "Admin route smoke checklist",
    "Company route smoke checklist",
    "Nursery route smoke checklist",
    "Tablet QR route smoke checklist",
    "Release readiness gate",
    "State coverage matrix",
    "Report merge guide",
    "Final QA sign-off template",
  ],
  completedItems: [
    {
      label: "CI draft",
      detail: "GitHub Actions draft includes npm ci, lint, and build steps but has not been executed.",
      tone: "done",
    },
    {
      label: "Route smoke plan",
      detail: "Segmented checklists exist for admin, company, nursery, tablet QR, guest lookup, and contract docs.",
      tone: "done",
    },
    {
      label: "State coverage",
      detail: "empty, loading, error, normal, risk, blocked, mock_ready, and production_blocked states are mapped.",
      tone: "done",
    },
    {
      label: "Browser preview hub",
      detail: "Local QA routes now expose status, route index, visual smoke checklist, and merge handoff screens.",
      tone: "done",
    },
    {
      label: "Report integration",
      detail: "AUTO_REPORT, NEXT_TASKS, and BLOCKERS merge rules are documented.",
      tone: "done",
    },
  ],
  blockedItems: [
    {
      label: "Firebase",
      detail: "Actual Firebase, Firestore/Auth, rules, config, and secrets are blocked until contract approval.",
      tone: "blocked",
    },
    {
      label: "PG/refund/settlement",
      detail: "Real payment, refund, settlement, and payout actions remain prohibited.",
      tone: "blocked",
    },
    {
      label: "Runtime verification",
      detail: "Build, lint, and browser route smoke were intentionally not run in unattended mode.",
      tone: "risk",
    },
    {
      label: "External services",
      detail: "AlimTalk, delivery lookup, external inventory, and Storage upload remain blockers.",
      tone: "blocked",
    },
  ],
  nextTasks: [
    "Review each worktree for prohibited files and out-of-scope edits.",
    "Merge firebase-contract, then qa, then admin, company, nursery, and tablet-qr.",
    "Run clean install after human approval.",
    "Run lint and build after merge.",
    "Run segmented route smoke checklists.",
    "Run screen state coverage matrix.",
    "Run permission coverage matrix against auth claims plan.",
    "Run data ledger coverage matrix against mock fixtures.",
    "Integrate all track blockers with REPORT_MERGE_GUIDE.",
    "Record final decision with FINAL_QA_SIGNOFF_TEMPLATE.",
  ],
  humanReviewItems: [
    "Confirm Node 22 is the intended CI runtime.",
    "Confirm Next.js 16 documentation after dependencies are available.",
    "Confirm fixture IDs after tablet-qr merge.",
    "Confirm PR and issue templates should move from reports/qa into .github templates.",
    "Confirm branch protection settings in the repository host.",
    "Confirm Firebase, PG, Storage, notification, delivery, and inventory transition owners.",
  ],
  smokeRoutes: [
    {
      path: "/qa/status",
      owner: "qa",
      purpose: "Local QA status dashboard for this worktree.",
      states: ["normal", "risk", "blocked", "production_blocked"],
    },
    {
      path: "/qa/routes",
      owner: "qa",
      purpose: "Route index and preview hub for browser review.",
      states: ["normal", "mock_ready"],
    },
    {
      path: "/qa/smoke",
      owner: "qa",
      purpose: "Visual smoke checklist screen for human review.",
      states: ["normal", "risk", "blocked"],
    },
    {
      path: "/qa/handoff",
      owner: "qa",
      purpose: "Merge handoff route for worktree review sequence.",
      states: ["normal", "blocked", "production_blocked"],
    },
    {
      path: "/",
      owner: "tablet-qr + qa",
      purpose: "Entry route and mock beta navigation.",
      states: ["normal", "mock_ready", "production_blocked"],
    },
    {
      path: "/admin/dashboard",
      owner: "admin",
      purpose: "Super admin KPIs, risk alerts, and recent activity.",
      states: ["empty", "loading", "error", "normal", "risk"],
    },
    {
      path: "/company",
      owner: "company",
      purpose: "Company admin entry and scoped dashboard.",
      states: ["normal", "mock_ready", "production_blocked"],
    },
    {
      path: "/nursery",
      owner: "nursery",
      purpose: "Nursery admin entry and scoped dashboard.",
      states: ["normal", "mock_ready", "production_blocked"],
    },
    {
      path: "/tablet/products",
      owner: "tablet-qr",
      purpose: "Tablet closed-mall product browsing.",
      states: ["empty", "loading", "error", "normal", "risk"],
    },
    {
      path: "/tablet/cart",
      owner: "tablet-qr",
      purpose: "Cart, fulfillment choice, and QR pre-check.",
      states: ["empty", "error", "normal", "risk", "production_blocked"],
    },
    {
      path: "/tablet/qr",
      owner: "tablet-qr",
      purpose: "Buy QR and ask-to-pay QR handoff.",
      states: ["loading", "error", "normal", "blocked"],
    },
    {
      path: "/q/SANHO701",
      owner: "tablet-qr",
      purpose: "Customer QR landing.",
      states: ["loading", "error", "normal", "risk", "blocked"],
    },
    {
      path: "/orders/guest/A5-20260519-001",
      owner: "tablet-qr",
      purpose: "Guest order detail and mock refund request.",
      states: ["error", "normal", "risk", "mock_ready"],
    },
  ],
  stateCoverage: [
    { label: "empty", detail: "No rows, no matches, no cart items, and no logs are covered by checklist gates.", tone: "done" },
    { label: "loading", detail: "Mock loading/skeleton expectations are documented but not visually verified.", tone: "progress" },
    { label: "error", detail: "Invalid route, QR, order lookup, and mock payment failures are mapped.", tone: "done" },
    { label: "risk", detail: "Payment failure, settlement hold, low stock, expired QR, and access warnings are mapped.", tone: "done" },
    { label: "blocked", detail: "External service and production-only operations are blocked by policy.", tone: "blocked" },
    { label: "mock_ready", detail: "QA documents are ready for human review after merge.", tone: "progress" },
    { label: "production_blocked", detail: "Dashboard labels real operation and real payment as disabled.", tone: "done" },
  ],
};
