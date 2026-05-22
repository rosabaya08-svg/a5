export type QaHubTone = "ready" | "pending" | "blocked" | "risk";

export type QaRouteGroup = {
  title: string;
  owner: string;
  summary: string;
  routes: Array<{
    label: string;
    path: string;
    viewport: string;
    expected: string;
    states: string[];
    tone: QaHubTone;
  }>;
};

export type QaSmokeCheck = {
  area: string;
  viewport: string;
  checks: string[];
  blockers: string[];
};

export type QaHandoffStep = {
  order: string;
  title: string;
  owner: string;
  inputs: string[];
  exitCriteria: string[];
  blockers: string[];
};

export const qaPreviewRoutes: QaRouteGroup[] = [
  {
    title: "QA hub",
    owner: "qa",
    summary: "Local QA-only routes for seeing status, route index, smoke checks, and merge handoff.",
    routes: [
      {
        label: "Status dashboard",
        path: "/qa/status",
        viewport: "desktop/tablet/mobile",
        expected: "Shows mock beta progress, blockers, service status, next tasks, and smoke links.",
        states: ["normal", "risk", "blocked", "production_blocked"],
        tone: "ready",
      },
      {
        label: "Route index",
        path: "/qa/routes",
        viewport: "desktop/tablet/mobile",
        expected: "Groups all critical browser routes by owner track and review intent.",
        states: ["normal", "mock_ready"],
        tone: "ready",
      },
      {
        label: "Smoke checklist",
        path: "/qa/smoke",
        viewport: "desktop/tablet/mobile",
        expected: "Human visual checklist for route, state, responsive, and production-safety review.",
        states: ["normal", "risk", "blocked"],
        tone: "ready",
      },
      {
        label: "Merge handoff",
        path: "/qa/handoff",
        viewport: "desktop/tablet",
        expected: "Shows merge order, owner handoff, blockers, and exit criteria.",
        states: ["normal", "blocked", "production_blocked"],
        tone: "ready",
      },
    ],
  },
  {
    title: "Admin",
    owner: "admin",
    summary: "Super-admin management screens for platform-wide mock beta review.",
    routes: [
      {
        label: "Admin dashboard",
        path: "/admin/dashboard",
        viewport: "desktop first",
        expected: "KPI cards, risk logs, recent orders, and filters render without live integrations.",
        states: ["empty", "loading", "error", "normal", "risk"],
        tone: "pending",
      },
      {
        label: "Companies",
        path: "/admin/companies",
        viewport: "desktop first",
        expected: "Approval states, tenant detail, masked settlement data, search and sort.",
        states: ["empty", "normal", "risk", "blocked"],
        tone: "pending",
      },
      {
        label: "Products",
        path: "/admin/products",
        viewport: "desktop first",
        expected: "Approval queue, rejection reason, product snapshot, and mock-only controls.",
        states: ["empty", "normal", "risk", "blocked"],
        tone: "pending",
      },
    ],
  },
  {
    title: "Company",
    owner: "company",
    summary: "Company admin product, inventory, delivery, sales, and payout review routes.",
    routes: [
      {
        label: "Company entry",
        path: "/company",
        viewport: "desktop/tablet",
        expected: "Company-scoped entry point with mock/test beta boundary visible.",
        states: ["normal", "mock_ready", "production_blocked"],
        tone: "pending",
      },
      {
        label: "Inventory",
        path: "/company/inventory",
        viewport: "desktop/tablet",
        expected: "Inventory movement and external code mapping without live external API calls.",
        states: ["empty", "normal", "risk", "blocked"],
        tone: "pending",
      },
      {
        label: "Payouts",
        path: "/company/payouts",
        viewport: "desktop/tablet",
        expected: "Settlement states with real payout clearly blocked.",
        states: ["empty", "normal", "risk", "production_blocked"],
        tone: "pending",
      },
    ],
  },
  {
    title: "Nursery",
    owner: "nursery",
    summary: "Nursery admin room, tablet, pickup, QR history, and order review routes.",
    routes: [
      {
        label: "Nursery entry",
        path: "/nursery",
        viewport: "desktop/tablet",
        expected: "Nursery-scoped dashboard with mock/test beta boundary visible.",
        states: ["normal", "mock_ready", "production_blocked"],
        tone: "pending",
      },
      {
        label: "Tablets",
        path: "/nursery/tablets",
        viewport: "desktop/tablet",
        expected: "Tablet active/stale/browser-blocked states and room linkage.",
        states: ["empty", "normal", "risk", "blocked"],
        tone: "pending",
      },
      {
        label: "QR history",
        path: "/nursery/qr-history",
        viewport: "desktop/tablet",
        expected: "Active, expired, used, canceled QR sessions by nursery and room.",
        states: ["empty", "normal", "risk"],
        tone: "pending",
      },
    ],
  },
  {
    title: "Tablet QR and guest",
    owner: "tablet-qr",
    summary: "Customer-visible closed-mall, QR checkout, ask-to-pay, and guest order lookup routes.",
    routes: [
      {
        label: "Products",
        path: "/tablet/products",
        viewport: "tablet/mobile",
        expected: "Product cards, price comparison, category, stock, and fulfillment states.",
        states: ["empty", "loading", "error", "normal", "risk"],
        tone: "pending",
      },
      {
        label: "Cart",
        path: "/tablet/cart",
        viewport: "tablet/mobile",
        expected: "Cart items, quantity, stock warnings, fulfillment split, and QR pre-check.",
        states: ["empty", "normal", "risk", "production_blocked"],
        tone: "pending",
      },
      {
        label: "Customer QR",
        path: "/q/SANHO701",
        viewport: "mobile first",
        expected: "QR session summary, product snapshot, expiration, and mock checkout entry.",
        states: ["loading", "error", "normal", "risk", "blocked"],
        tone: "pending",
      },
      {
        label: "Guest order detail",
        path: "/orders/guest/A5-20260519-001",
        viewport: "mobile first",
        expected: "Order snapshot, fulfillment timeline, and mock refund request boundary.",
        states: ["error", "normal", "risk", "mock_ready"],
        tone: "pending",
      },
    ],
  },
];

export const qaSmokeChecks: QaSmokeCheck[] = [
  {
    area: "Route render",
    viewport: "desktop/tablet/mobile",
    checks: [
      "Route reaches a page without a hard crash.",
      "Mock/test beta boundary is visible.",
      "Primary action is visible and not clipped.",
      "Back or next navigation does not imply production operation.",
    ],
    blockers: ["Route crash", "Blank screen", "Production-only prompt", "Missing owner"],
  },
  {
    area: "State coverage",
    viewport: "desktop/tablet/mobile",
    checks: [
      "empty state is represented where lists can have no data.",
      "loading state is represented without live network dependency.",
      "error and invalid lookup states are visible or documented.",
      "risk and blocked badges distinguish operational danger from mock review.",
    ],
    blockers: ["Missing customer QR error state", "No blocked state for PG", "No production_blocked wording"],
  },
  {
    area: "Responsive visual",
    viewport: "360px, 430px, 768px, 1024px, 1440px",
    checks: [
      "Customer QR and guest order pages fit at 360px.",
      "Tablet product/cart pages work at 768px and 1024px.",
      "Admin/company/nursery tables are scannable at 1440px.",
      "Text does not overlap buttons, badges, or tables.",
    ],
    blockers: ["Hidden pay/confirm action", "Clipped order number", "Overlapping table controls"],
  },
  {
    area: "Production safety",
    viewport: "all",
    checks: [
      "Firebase shows no real connection.",
      "PG remains mock only.",
      "Refund, settlement, notification, delivery, and external inventory remain blocked.",
      "No secret, private key, service account, or config is required.",
    ],
    blockers: ["Live integration visible", "Secret-like value", "Real payment wording"],
  },
];

export const qaHandoffSteps: QaHandoffStep[] = [
  {
    order: "01",
    title: "firebase-contract",
    owner: "contract owner",
    inputs: ["Firestore schema", "Auth claims", "server logic", "seed plan", "blockers"],
    exitCriteria: ["No config/rules files created", "Contract blockers listed", "Adapter boundary clear"],
    blockers: ["Rules approval pending", "Secrets approval pending", "Emulator plan pending"],
  },
  {
    order: "02",
    title: "qa",
    owner: "QA owner",
    inputs: ["CI draft", "route smoke", "state coverage", "report merge guide", "status hub"],
    exitCriteria: ["/qa/status, /qa/routes, /qa/smoke, /qa/handoff exist", "Reports updated", "Commit candidate recorded"],
    blockers: ["Runtime checks not run", "Next docs unavailable until dependencies exist"],
  },
  {
    order: "03",
    title: "admin",
    owner: "admin owner",
    inputs: ["admin routes", "management UI", "risk logs", "settlement/payment blockers"],
    exitCriteria: ["Admin route smoke ready", "No live PG/refund/payout", "Reports complete"],
    blockers: ["Dense table smoke pending", "Approval/risk state coverage pending"],
  },
  {
    order: "04",
    title: "company",
    owner: "company owner",
    inputs: ["company routes", "product/inventory/order/payout mocks", "external API blockers"],
    exitCriteria: ["Company route smoke ready", "Storage and inventory API blocked", "Reports complete"],
    blockers: ["Storage Blaze pending", "External inventory pending"],
  },
  {
    order: "05",
    title: "nursery",
    owner: "nursery owner",
    inputs: ["nursery routes", "room/tablet/pickup/QR history mocks", "access states"],
    exitCriteria: ["Nursery route smoke ready", "Tablet access states visible", "Reports complete"],
    blockers: ["Real customer data policy pending", "Notification pending"],
  },
  {
    order: "06",
    title: "tablet-qr",
    owner: "tablet QR owner",
    inputs: ["tablet routes", "QR checkout", "guest order lookup", "mock fixtures"],
    exitCriteria: ["Mobile smoke ready", "PG mock only", "Stable fixture IDs", "Reports complete"],
    blockers: ["Customer mobile review pending", "PG transition blocked"],
  },
];

