export type StatusTone = "complete" | "progress" | "blocked" | "mock";

export type StatusMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
};

export type StatusListItem = {
  id: string;
  title: string;
  detail: string;
  tone: StatusTone;
};

export type SmokeRoute = {
  id: string;
  route: string;
  purpose: string;
  status: "manual_pending" | "preview_ready" | "blocked";
};

export type IntegrationStatus = {
  id: string;
  name: string;
  state: "not_connected" | "mock_only" | "blocker" | "held";
  summary: string;
  requiredBeforeLive: string;
  tone: StatusTone;
};

export type FileGroup = {
  id: string;
  label: string;
  path: string;
  count: number;
  purpose: string;
  tone: StatusTone;
};

export type WorktreePort = {
  id: string;
  track: string;
  port: number;
  folder: string;
  purpose: string;
};

export type WorktreeRouteStatus = {
  id: string;
  track: string;
  port: number;
  statusRoute: string;
  keyRoutes: string[];
  routeState: "ready_for_manual_smoke" | "not_started_locally" | "blocked";
  note: string;
};

export type Route404Status = {
  id: string;
  route: string;
  previousState: "unknown" | "was_404" | "not_checked";
  currentState: "expected_200" | "manual_pending" | "blocked";
  evidence: string;
};

export type StateCoverage = {
  id: string;
  label: string;
  covered: boolean;
  detail: string;
};

export type ProgressEvent = {
  id: string;
  label: string;
  detail: string;
  state: "completed" | "deferred" | "blocked";
};

export const statusDashboard = {
  track: "my-app",
  route: "/mock-ui/status",
  folder: "C:\\Users\\djfhl\\Desktop\\my-app",
  mode: "mock/test beta",
  liveWarning: "Not production, not live payment, not Firebase connected.",
  progressPercent: 96,
  generatedMajorFileCount: 159,
  generatedRouteCount: 94,
  generatedComponentCount: 52,
  generatedDataAndTypeCount: 23,
  reportCount: 17,
};

export const statusMetrics: StatusMetric[] = [
  {
    id: "metric-progress",
    label: "Mock preview progress",
    value: "96%",
    helper: "Static estimate after storefront, QR, guest lookup, marketing admin, build, lint, and browser smoke checks.",
    tone: "progress",
  },
  {
    id: "metric-files",
    label: "Major files",
    value: "159",
    helper: "App routes, components, data/types, and track reports now visible in the integrated worktree.",
    tone: "complete",
  },
  {
    id: "metric-routes",
    label: "Preview routes",
    value: "94",
    helper: "Static export generated 94 routes during the latest build check.",
    tone: "mock",
  },
  {
    id: "metric-blockers",
    label: "Live blockers",
    value: "7",
    helper: "Firebase, PG, Storage, Alimtalk, delivery tracking, external inventory, and deploy stay blocked.",
    tone: "blocked",
  },
];

export const generatedFileGroups: FileGroup[] = [
  {
    id: "group-home",
    label: "Home launcher",
    path: "app/page.tsx",
    count: 1,
    purpose: "localhost:3000 entry point with generated result launcher cards.",
    tone: "complete",
  },
  {
    id: "group-preview-routes",
    label: "Mock preview routes",
    path: "app/mock-ui/**",
    count: 12,
    purpose: "Status, hub, storefront, detail, checkout, session, journey, operations, QA, and analytics previews.",
    tone: "complete",
  },
  {
    id: "group-storefront",
    label: "Closed mall storefront",
    path: "components/storefront/**",
    count: 2,
    purpose: "HANSANYEON-style tablet mall, product detail, cart, QR, checkout, and guest order experiences.",
    tone: "complete",
  },
  {
    id: "group-marketing-admin",
    label: "Marketing admin pages",
    path: "components/marketing/**",
    count: 1,
    purpose: "Admin/company banner, video, brand, exhibition, and product preview mock operations.",
    tone: "complete",
  },
  {
    id: "group-track-components",
    label: "Track dashboard components",
    path: "components/my-app/**",
    count: 1,
    purpose: "Local status dashboard component for browser review.",
    tone: "complete",
  },
  {
    id: "group-shared-components",
    label: "Preview UI components",
    path: "components/ui/**",
    count: 33,
    purpose: "Cards, badges, route maps, checkout, lifecycle, analytics, and readiness preview components.",
    tone: "complete",
  },
  {
    id: "group-track-data",
    label: "Track status data",
    path: "data/my-app/**",
    count: 1,
    purpose: "Static status dashboard data with no live query.",
    tone: "complete",
  },
  {
    id: "group-reports",
    label: "Track-local reports",
    path: "reports/my-app/**",
    count: 17,
    purpose: "Route index, smoke plan, merge handoff, blockers, next tasks, and commit candidate.",
    tone: "progress",
  },
];

export const worktreePorts: WorktreePort[] = [
  {
    id: "port-admin",
    track: "admin",
    port: 3001,
    folder: "my-app-admin",
    purpose: "Highest admin mock screens and operating review.",
  },
  {
    id: "port-company",
    track: "company",
    port: 3002,
    folder: "my-app-company",
    purpose: "Company admin product, inventory, order, and payout mock screens.",
  },
  {
    id: "port-nursery",
    track: "nursery",
    port: 3003,
    folder: "my-app-nursery",
    purpose: "Nursery admin room, tablet, pickup, and QR history mock screens.",
  },
  {
    id: "port-tablet-qr",
    track: "tablet-qr",
    port: 3004,
    folder: "my-app-tablet-qr",
    purpose: "Tablet closed mall, customer QR, checkout, and guest lookup mock screens.",
  },
  {
    id: "port-firebase-contract",
    track: "firebase-contract",
    port: 3005,
    folder: "my-app-firebase-contract",
    purpose: "Firebase contract, schema, rules planning, and server logic documents.",
  },
  {
    id: "port-qa",
    track: "qa",
    port: 3006,
    folder: "my-app-qa",
    purpose: "QA checklist, route smoke plan, merge plan, and release readiness.",
  },
];

export const worktreeRouteStatuses: WorktreeRouteStatus[] = [
  {
    id: "wt-my-app",
    track: "my-app",
    port: 3000,
    statusRoute: "/mock-ui/status",
    keyRoutes: ["/", "/products", "/mock-ui/status", "/mock-ui/smoke", "/mock-ui/merge"],
    routeState: "ready_for_manual_smoke",
    note: "Main launcher and route index are available in this worktree.",
  },
  {
    id: "wt-admin",
    track: "admin",
    port: 3001,
    statusRoute: "/admin/status",
    keyRoutes: ["/admin/dashboard", "/admin/status", "/admin/companies", "/admin/orders"],
    routeState: "ready_for_manual_smoke",
    note: "Admin feature branch was pushed; start that worktree separately for browser review.",
  },
  {
    id: "wt-company",
    track: "company",
    port: 3002,
    statusRoute: "/company/status",
    keyRoutes: ["/company/dashboard", "/company/status", "/company/products", "/company/orders"],
    routeState: "ready_for_manual_smoke",
    note: "Company feature branch was pushed; start that worktree separately for browser review.",
  },
  {
    id: "wt-nursery",
    track: "nursery",
    port: 3003,
    statusRoute: "/nursery/status",
    keyRoutes: ["/nursery/dashboard", "/nursery/status", "/nursery/rooms", "/nursery/tablets"],
    routeState: "ready_for_manual_smoke",
    note: "Nursery feature branch was pushed; start that worktree separately for browser review.",
  },
  {
    id: "wt-tablet-qr",
    track: "tablet-qr",
    port: 3004,
    statusRoute: "/tablet/status",
    keyRoutes: ["/tablet/products", "/tablet/cart", "/tablet/qr", "/q/SANHO701", "/orders/guest"],
    routeState: "ready_for_manual_smoke",
    note: "Tablet/QR feature branch was pushed; start that worktree separately for browser review.",
  },
  {
    id: "wt-firebase-contract",
    track: "firebase-contract",
    port: 3005,
    statusRoute: "/firebase-contract/status",
    keyRoutes: ["/firebase-contract", "/firebase-contract/status", "/firebase-contract/schema"],
    routeState: "ready_for_manual_smoke",
    note: "Contract branch is docs/stub only; no Firebase SDK connection is expected.",
  },
  {
    id: "wt-qa",
    track: "qa",
    port: 3006,
    statusRoute: "/qa/status",
    keyRoutes: ["/qa/status", "/qa/routes", "/qa/smoke", "/qa/handoff"],
    routeState: "ready_for_manual_smoke",
    note: "QA branch was pushed; start that worktree separately for browser review.",
  },
];

export const generatedScreens: StatusListItem[] = [
  {
    id: "screen-hub",
    title: "/mock-ui",
    detail: "Preview hub with common UI state coverage and route index.",
    tone: "complete",
  },
  {
    id: "screen-storefront",
    title: "/mock-ui/storefront",
    detail: "Closed mall banner, category rail, benefits, product cards, and price layer.",
    tone: "complete",
  },
  {
    id: "screen-detail",
    title: "/mock-ui/detail",
    detail: "Product, QR session, and order timeline detail preview.",
    tone: "complete",
  },
  {
    id: "screen-checkout",
    title: "/mock-ui/checkout",
    detail: "QR checkout summary and guest order lookup preview.",
    tone: "complete",
  },
  {
    id: "screen-session",
    title: "/mock-ui/session",
    detail: "QR lifecycle, tablet source, and payer handoff preview.",
    tone: "complete",
  },
  {
    id: "screen-journey",
    title: "/mock-ui/journey",
    detail: "End-to-end tablet to QR checkout journey map.",
    tone: "complete",
  },
  {
    id: "screen-operations",
    title: "/mock-ui/operations",
    detail: "Approval queue, integration gates, and smoke route matrix.",
    tone: "complete",
  },
  {
    id: "screen-qa",
    title: "/mock-ui/qa",
    detail: "Manual merge plan, next-day checklist, and release readiness.",
    tone: "complete",
  },
  {
    id: "screen-analytics",
    title: "/mock-ui/analytics",
    detail: "Mock sales, risk distribution, and settlement visibility.",
    tone: "complete",
  },
  {
    id: "screen-status",
    title: "/mock-ui/status",
    detail: "This local status dashboard for browser review.",
    tone: "progress",
  },
  {
    id: "screen-smoke",
    title: "/mock-ui/smoke",
    detail: "Visual smoke checklist screen for manual click review.",
    tone: "progress",
  },
  {
    id: "screen-merge",
    title: "/mock-ui/merge",
    detail: "Merge handoff board for parallel worktree review.",
    tone: "progress",
  },
];

export const completedItems: StatusListItem[] = [
  {
    id: "done-ui-states",
    title: "Empty/loading/error/risk UI patterns",
    detail: "StatePanel, risk badges, route cards, checklist cards, and blocker panels are available as mock UI.",
    tone: "complete",
  },
  {
    id: "done-storefront",
    title: "Closed mall storefront preview",
    detail: "Tablet/customer storefront structure is visible without touching live customer routes.",
    tone: "complete",
  },
  {
    id: "done-qr",
    title: "QR and guest checkout preview",
    detail: "Checkout summary, payer handoff, QR lifecycle, and guest lookup screens are static mock previews.",
    tone: "complete",
  },
  {
    id: "done-ops",
    title: "Operations and QA previews",
    detail: "Approval queue, integration gates, manual checklist, merge plan, and release readiness are documented in UI.",
    tone: "complete",
  },
  {
    id: "done-reports",
    title: "Track-local reports",
    detail: "Reports stay under reports/my-app to avoid shared report merge conflicts.",
    tone: "complete",
  },
];

export const blockedItems: StatusListItem[] = [
  {
    id: "block-firebase",
    title: "Firebase connection",
    detail: "No Firebase SDK import, config file, Firestore/Auth connection, rules file, or deploy is allowed.",
    tone: "blocked",
  },
  {
    id: "block-pg",
    title: "PG payment",
    detail: "Payment remains mock only. No live approval, refund, cancellation, settlement, or payout code.",
    tone: "blocked",
  },
  {
    id: "block-alimtalk",
    title: "Alimtalk",
    detail: "Official template, provider account, and key approval are missing.",
    tone: "blocked",
  },
  {
    id: "block-delivery",
    title: "Delivery tracking",
    detail: "Carrier API account and approved operating key are not available.",
    tone: "blocked",
  },
  {
    id: "block-inventory",
    title: "External inventory API",
    detail: "External stock provider contract and API key remain blocked.",
    tone: "blocked",
  },
  {
    id: "block-storage",
    title: "Firebase Storage",
    detail: "Storage is held because Spark plan blocks usage. Product media stays placeholder-only.",
    tone: "blocked",
  },
];

export const integrationStatuses: IntegrationStatus[] = [
  {
    id: "integration-firebase",
    name: "Firebase",
    state: "not_connected",
    summary: "No Firebase SDK import, config, Firestore/Auth connection, rules file, or deploy.",
    requiredBeforeLive: "Repository contracts, rules design, Auth claims, dev/prod policy, and explicit approval.",
    tone: "blocked",
  },
  {
    id: "integration-pg",
    name: "PG",
    state: "mock_only",
    summary: "Payment, failure, refund, and settlement states are UI mock only.",
    requiredBeforeLive: "Official PG docs, test keys, webhook verification, refund policy, and server amount recalculation.",
    tone: "mock",
  },
  {
    id: "integration-alimtalk",
    name: "Alimtalk",
    state: "blocker",
    summary: "No provider account, template approval, sender profile, or key.",
    requiredBeforeLive: "Approved message templates, provider contract, and secret management plan.",
    tone: "blocked",
  },
  {
    id: "integration-delivery",
    name: "Delivery tracking",
    state: "blocker",
    summary: "Delivery status labels are static mock data only.",
    requiredBeforeLive: "Carrier API account, official docs, operating key, and retry/failure policy.",
    tone: "blocked",
  },
  {
    id: "integration-inventory",
    name: "External inventory API",
    state: "blocker",
    summary: "External stock sync is not called. Low inventory is mock state only.",
    requiredBeforeLive: "Partner contract, official API docs, key, rate limits, and reconciliation policy.",
    tone: "blocked",
  },
  {
    id: "integration-storage",
    name: "Firebase Storage",
    state: "held",
    summary: "Spark plan blocks Storage usage. Product media remains placeholder-style UI.",
    requiredBeforeLive: "Separate approval for Blaze upgrade, Storage rules, upload workflow, and moderation policy.",
    tone: "progress",
  },
];

export const nextTasks: StatusListItem[] = [
  {
    id: "next-1",
    title: "Manual git status",
    detail: "Next working day operator checks workspace state before staging.",
    tone: "progress",
  },
  {
    id: "next-2",
    title: "Manual pull from origin/main",
    detail: "Refresh baseline before evaluating worktree merge results.",
    tone: "progress",
  },
  {
    id: "next-3",
    title: "Manual lint",
    detail: "Run only after unattended restrictions are lifted.",
    tone: "progress",
  },
  {
    id: "next-4",
    title: "Manual build",
    detail: "Run only after lint and file review.",
    tone: "progress",
  },
  {
    id: "next-5",
    title: "Smoke /mock-ui routes",
    detail: "Check generated preview routes visually in browser.",
    tone: "progress",
  },
  {
    id: "next-6",
    title: "Review generated component scope",
    detail: "Decide which preview components should move into real tablet/customer/admin routes.",
    tone: "progress",
  },
  {
    id: "next-7",
    title: "Check no forbidden files",
    detail: "Confirm no .env, Firebase config, rules, service account, private key, or secret file exists.",
    tone: "progress",
  },
  {
    id: "next-8",
    title: "Review live blockers",
    detail: "Keep Firebase, PG, Storage, Alimtalk, delivery, and external inventory blocked.",
    tone: "progress",
  },
  {
    id: "next-9",
    title: "Merge planning",
    detail: "Compare worktree output and merge only after route/build review.",
    tone: "progress",
  },
  {
    id: "next-10",
    title: "Finalize commit candidate",
    detail: "Use reports/my-app/COMMIT_CANDIDATE.md only after manual checks.",
    tone: "progress",
  },
];

export const humanChecks: StatusListItem[] = [
  {
    id: "human-folder",
    title: "Folder mapping exception",
    detail: "Current folder is my-app, not one of the six named worktree folders. Route was safely set to /mock-ui/status.",
    tone: "progress",
  },
  {
    id: "human-encoding",
    title: "Existing Korean encoding",
    detail: "Some existing page files print garbled Korean in terminal output. Direct edits to those files should be reviewed manually.",
    tone: "progress",
  },
  {
    id: "human-validation",
    title: "Validation completed for this batch",
    detail: "npm.cmd run build passed, npm.cmd run lint passed with no errors and non-blocking no-img-element warnings.",
    tone: "complete",
  },
  {
    id: "human-live",
    title: "Live integration approval",
    detail: "Firebase/PG/Storage/API work still needs separate approval and official keys/docs.",
    tone: "blocked",
  },
];

export const smokeRoutes: SmokeRoute[] = [
  { id: "route-status", route: "/mock-ui/status", purpose: "Local status dashboard", status: "preview_ready" },
  { id: "route-products", route: "/products", purpose: "Customer product list alias for /tablet/products", status: "preview_ready" },
  { id: "route-hub", route: "/mock-ui", purpose: "Preview hub", status: "preview_ready" },
  { id: "route-smoke", route: "/mock-ui/smoke", purpose: "Visual smoke checklist", status: "preview_ready" },
  { id: "route-merge", route: "/mock-ui/merge", purpose: "Merge handoff board", status: "preview_ready" },
  { id: "route-storefront", route: "/mock-ui/storefront", purpose: "Closed mall storefront", status: "preview_ready" },
  { id: "route-detail", route: "/mock-ui/detail", purpose: "Product/QR/order detail", status: "preview_ready" },
  { id: "route-checkout", route: "/mock-ui/checkout", purpose: "Checkout and guest lookup", status: "preview_ready" },
  { id: "route-session", route: "/mock-ui/session", purpose: "QR lifecycle and device source", status: "preview_ready" },
  { id: "route-journey", route: "/mock-ui/journey", purpose: "End-to-end customer journey", status: "preview_ready" },
  { id: "route-operations", route: "/mock-ui/operations", purpose: "Operations board", status: "preview_ready" },
  { id: "route-qa", route: "/mock-ui/qa", purpose: "QA and merge readiness", status: "preview_ready" },
  { id: "route-analytics", route: "/mock-ui/analytics", purpose: "Analytics and settlement visibility", status: "preview_ready" },
  { id: "route-admin-banners", route: "/admin/marketing/banners", purpose: "Admin banner management mock route", status: "preview_ready" },
  { id: "route-admin-videos", route: "/admin/marketing/videos", purpose: "Admin video management mock route", status: "preview_ready" },
  { id: "route-admin-brands", route: "/admin/brands", purpose: "Admin brand logo grid mock route", status: "preview_ready" },
  { id: "route-admin-home-editor", route: "/admin/home-editor", purpose: "Admin shopping home editor mock route", status: "preview_ready" },
  { id: "route-admin-exhibitions", route: "/admin/exhibitions", purpose: "Admin exhibition management mock route", status: "preview_ready" },
  { id: "route-company-preview", route: "/company/products/preview", purpose: "Company product detail preview mock route", status: "preview_ready" },
  { id: "route-company-banner-ads", route: "/company/ads/banners", purpose: "Company banner ad submission mock route", status: "preview_ready" },
  { id: "route-company-video-ads", route: "/company/ads/videos", purpose: "Company video ad submission mock route", status: "preview_ready" },
  { id: "route-company-brand", route: "/company/brand", purpose: "Company brand room mock route", status: "preview_ready" },
  { id: "route-company-exhibitions", route: "/company/exhibitions", purpose: "Company exhibition application mock route", status: "preview_ready" },
  { id: "route-admin-dashboard", route: "/admin/dashboard", purpose: "Existing admin dashboard", status: "manual_pending" },
  { id: "route-company-dashboard", route: "/company/dashboard", purpose: "Existing company dashboard", status: "manual_pending" },
  { id: "route-company-products", route: "/company/products", purpose: "Existing company products route", status: "manual_pending" },
  { id: "route-nursery-dashboard", route: "/nursery/dashboard", purpose: "Existing nursery dashboard", status: "manual_pending" },
  { id: "route-nursery-rooms", route: "/nursery/rooms", purpose: "Existing nursery rooms route", status: "manual_pending" },
  { id: "route-tablet-products", route: "/tablet/products", purpose: "Shopping mall style tablet product route", status: "preview_ready" },
  { id: "route-tablet-product-detail", route: "/tablet/products/product-care-kit", purpose: "Shopping mall product detail mock route", status: "preview_ready" },
  { id: "route-tablet-home", route: "/tablet", purpose: "Existing tablet home route", status: "manual_pending" },
  { id: "route-tablet-cart", route: "/tablet/cart", purpose: "Shopping mall cart and QR creation mock route", status: "preview_ready" },
  { id: "route-tablet-qr", route: "/tablet/qr", purpose: "Existing tablet QR route", status: "manual_pending" },
  { id: "route-customer-qr", route: "/q/SANHO701", purpose: "Mobile customer QR landing route", status: "preview_ready" },
  { id: "route-customer-status", route: "/q/SANHO701/status", purpose: "QR lifecycle status mock route", status: "preview_ready" },
  { id: "route-guest-lookup", route: "/orders/guest", purpose: "Existing guest lookup form route", status: "manual_pending" },
  { id: "route-customer-checkout", route: "/q/SANHO701/checkout", purpose: "Existing customer checkout mock route", status: "manual_pending" },
  { id: "route-guest-order", route: "/orders/guest/A5-20260519-001", purpose: "Existing guest order route", status: "manual_pending" },
  { id: "route-guest-refund", route: "/orders/guest/A5-20260519-001/refund", purpose: "Guest refund request mock route", status: "preview_ready" },
];

export const route404Statuses: Route404Status[] = [
  {
    id: "404-products",
    route: "/products",
    previousState: "was_404",
    currentState: "expected_200",
    evidence: "Created app/products/page.tsx and reused TabletProductsPage from /tablet/products.",
  },
  {
    id: "404-tablet-products",
    route: "/tablet/products",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "Browser smoke loaded the storefront page and showed the HANSANYEON closed mall hero.",
  },
  {
    id: "404-tablet-cart",
    route: "/tablet/cart",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "Browser smoke loaded the cart mock page without a 404.",
  },
  {
    id: "404-tablet-qr",
    route: "/tablet/qr",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "Existing route; browser smoke still pending.",
  },
  {
    id: "404-q-landing",
    route: "/q/SANHO701",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "Browser smoke loaded the mobile QR landing page without a 404.",
  },
  {
    id: "404-q-checkout",
    route: "/q/SANHO701/checkout",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "Existing dynamic checkout route; browser smoke still pending.",
  },
  {
    id: "404-orders-guest",
    route: "/orders/guest",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "Existing guest lookup route; browser smoke still pending.",
  },
  {
    id: "404-orders-detail",
    route: "/orders/guest/A5-20260519-001",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "Existing dynamic guest order route; browser smoke still pending.",
  },
  {
    id: "404-q-status",
    route: "/q/SANHO701/status",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "Browser smoke loaded the QR status mock page without a 404.",
  },
  {
    id: "404-guest-refund",
    route: "/orders/guest/A5-20260519-001/refund",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "Browser smoke loaded the guest refund request mock page without a 404.",
  },
  {
    id: "404-admin-banners",
    route: "/admin/marketing/banners",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "Browser smoke loaded the admin banner management route without a 404.",
  },
  {
    id: "404-company-preview",
    route: "/company/products/preview",
    previousState: "not_checked",
    currentState: "expected_200",
    evidence: "Browser smoke loaded the company product preview route without a 404.",
  },
  {
    id: "404-company-dashboard",
    route: "/company/dashboard",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "Existing company route; browser smoke still pending.",
  },
  {
    id: "404-nursery-dashboard",
    route: "/nursery/dashboard",
    previousState: "not_checked",
    currentState: "manual_pending",
    evidence: "Existing nursery route; browser smoke still pending.",
  },
];

export const stateCoverage: StateCoverage[] = [
  {
    id: "coverage-empty",
    label: "Empty",
    covered: true,
    detail: "Empty product, order, and QR session states are represented by StatePanel scenarios.",
  },
  {
    id: "coverage-loading",
    label: "Loading",
    covered: true,
    detail: "Loading is represented as manual-pending preview state; live loading behavior still requires real route testing.",
  },
  {
    id: "coverage-error",
    label: "Error",
    covered: true,
    detail: "Expired QR, mock payment failure, and integration-blocked states are represented.",
  },
  {
    id: "coverage-risk",
    label: "Risk",
    covered: true,
    detail: "RiskStatusBadge covers blocked, mock-only, integration pending, payment failed, settlement hold, and inventory low.",
  },
  {
    id: "coverage-mobile",
    label: "Mobile/tablet responsive",
    covered: true,
    detail: "Preview layouts use responsive grid and sticky mobile action bar patterns.",
  },
];

export const progressEvents: ProgressEvent[] = [
  {
    id: "event-docs",
    label: "Track-local reports prepared",
    detail: "AUTO_REPORT, NEXT_TASKS, BLOCKERS, progress, route index, handoff, and status summary exist under reports/my-app.",
    state: "completed",
  },
  {
    id: "event-preview",
    label: "Mock preview routes generated",
    detail: "Generated status, storefront, detail, checkout, session, journey, operations, QA, analytics, and hub routes.",
    state: "completed",
  },
  {
    id: "event-ui",
    label: "Reusable mock UI components generated",
    detail: "Cards, route matrix, state panels, checkout summary, QR lifecycle, journey map, and analytics preview components exist.",
    state: "completed",
  },
  {
    id: "event-validation",
    label: "Validation completed",
    detail: "npm.cmd run build passed, npm.cmd run lint passed with no errors, and selected browser smoke routes loaded without 404.",
    state: "completed",
  },
  {
    id: "event-live",
    label: "Live integrations blocked",
    detail: "Firebase, PG, Storage, Alimtalk, delivery tracking, and external inventory remain blocked.",
    state: "blocked",
  },
];
