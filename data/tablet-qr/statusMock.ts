export type StatusTone = "complete" | "progress" | "blocked" | "review";

export type StatusCard = {
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
};

export type StatusRoute = {
  href: string;
  label: string;
  state: StatusTone;
  detail: string;
};

export type StatusRouteGroup = {
  title: string;
  helper: string;
  routes: StatusRoute[];
};

export type StatusItem = {
  title: string;
  detail: string;
  state: StatusTone;
};

export type QrStateDetail = {
  state: "active" | "expired" | "used" | "payment_failed" | "canceled";
  route: string;
  headline: string;
  customerAction: string;
  blockedAction: string;
  reviewNote: string;
  tone: StatusTone;
};

export const tabletQrStatusMock = {
  track: "tablet-qr",
  statusRoute: "/tablet/status",
  mode: "mock/test beta",
  releaseWarning: "Not production. No real payment, Firebase, Firestore, Auth, refund, notification, delivery, or stock API is connected.",
  generatedFileCount: 38,
  progressPercent: 84,
  progressCards: [
    { label: "Generated files", value: "38", helper: "UI, mock data, status route, route index, and reports", tone: "complete" },
    { label: "Customer screens", value: "20", helper: "Tablet, QR, checkout, expired, refund, lookup, status", tone: "complete" },
    { label: "Mock states", value: "5", helper: "empty, loading, error, risk, blocked", tone: "complete" },
    { label: "Real integrations", value: "0", helper: "All external services remain blocked", tone: "blocked" },
  ] as StatusCard[],
  majorScreens: [
    "/tablet/products",
    "/tablet/products/[id]",
    "/tablet/cart",
    "/tablet/qr",
    "/tablet/ask",
    "/tablet/status",
    "/q/[code]",
    "/q/[code]/checkout",
    "/q/[code]/loading",
    "/q/[code]/success",
    "/q/[code]/failed",
    "/q/[code]/expired",
    "/q/[code]/status",
    "/orders/guest",
    "/orders/guest/[orderNo]",
    "/orders/guest/[orderNo]/refund",
  ],
  completedItems: [
    "Tablet closed-mall product list with category, price, stock, receive, search, and sort mock controls.",
    "Product cards show list price, closed mall price, discount rate, comparison saving, stock, and fulfillment badges.",
    "Product detail includes placeholder gallery, option selection mock, quantity mock, inventory guide, and policy panels.",
    "Cart includes cart_items snapshot, quantity controls, inventory guard, delete/recalculate mock actions, and fulfillment split.",
    "QR creation separates purchase QR from ask-payer QR with source, short code, session id, and expiry metadata.",
    "Customer QR landing shows product summary, QR identity, amount, fulfillment, expiry, and state-aware actions.",
    "Checkout includes payer fields, validation copy, payment method mock, loading mock, and blocked bank transfer.",
    "Guest order lookup includes order/phone input, mismatch safe-error copy, summaries, route matrix, and order detail.",
  ],
  inProgressItems: [
    "Visual browser smoke needs a dev server or screenshot pass after command restrictions are lifted.",
    "Static filter controls need repository-backed mock behavior before real server filters.",
    "QA route matrices should be hidden or gated before any external beta review.",
  ],
  blockers: [
    { title: "Firebase", detail: "Actual connection is intentionally absent. No Firebase SDK import is allowed.", state: "blocked" },
    { title: "PG", detail: "Payment state is mock only. No PG SDK, redirect, approval, cancel, or webhook exists.", state: "blocked" },
    { title: "AlimTalk", detail: "Notification sending is blocked until template, consent, and provider policy are approved.", state: "blocked" },
    { title: "Delivery tracking", detail: "Carrier tracking is blocked. Delivery status is static mock data only.", state: "blocked" },
    { title: "External inventory API", detail: "Supplier stock sync is blocked. Inventory risk is heuristic mock UI.", state: "blocked" },
    { title: "Storage", detail: "Spark limit keeps real Storage usage on hold. Product images are placeholder panels.", state: "blocked" },
  ] as StatusItem[],
  smokeRoutes: [
    { href: "/tablet/status", label: "Track status dashboard", state: "complete", detail: "Local visual progress dashboard." },
    { href: "/tablet/products", label: "Tablet catalog", state: "complete", detail: "Filters, category tabs, product cards, empty/error sections." },
    { href: "/tablet/products/product-monitor", label: "Critical stock detail", state: "complete", detail: "Risk badge and inventory warning." },
    { href: "/tablet/cart", label: "Cart snapshot", state: "complete", detail: "Quantity mock, inventory guard, fulfillment split." },
    { href: "/tablet/qr", label: "QR issue", state: "complete", detail: "Purchase/ask QR split and state preview links." },
    { href: "/q/SANHO701", label: "Active QR landing", state: "complete", detail: "Active customer checkout path." },
    { href: "/q/SANHO701/loading", label: "Payment loading", state: "complete", detail: "Mock loading before deterministic result." },
    { href: "/q/SANHO701/expired", label: "Expired page", state: "blocked", detail: "Dedicated checkout blocked page." },
    { href: "/q/OLDQR22/status", label: "Expired QR", state: "blocked", detail: "Blocked checkout state." },
    { href: "/q/VOID1234/status", label: "Payment failed QR", state: "blocked", detail: "Mock failed payment branch." },
    { href: "/orders/guest", label: "Guest lookup", state: "complete", detail: "Order/phone input and mismatch copy." },
    { href: "/orders/guest/A5-20260519-001/refund", label: "Refund request mock", state: "blocked", detail: "No real refund action." },
    { href: "/orders/guest/UNKNOWN-ORDER", label: "Unknown order", state: "review", detail: "Safe error route." },
  ] as StatusRoute[],
  routeGroups: [
    {
      title: "Tablet Flow",
      helper: "Room tablet browsing, cart, ask-payer, and QR generation.",
      routes: [
        { href: "/tablet", label: "Tablet Home", state: "complete", detail: "Entry redirects into the tablet catalog experience." },
        { href: "/tablet/products", label: "Products", state: "complete", detail: "Category, price, stock, fulfillment, search, and sort mock UI." },
        { href: "/tablet/products/product-care-kit", label: "Product Detail", state: "complete", detail: "Gallery placeholder, options, quantity, policy, and risk panels." },
        { href: "/tablet/cart", label: "Cart", state: "complete", detail: "Snapshot, quantity, inventory guard, fulfillment branch, and total." },
        { href: "/tablet/ask", label: "Ask / 조르기", state: "complete", detail: "Guardian payer QR preview." },
        { href: "/tablet/qr", label: "QR Generate", state: "complete", detail: "Purchase QR and ask QR split." },
      ],
    },
    {
      title: "QR Customer Flow",
      helper: "Customer mobile route from scan to checkout result.",
      routes: [
        { href: "/q/SANHO701", label: "QR Landing", state: "complete", detail: "Active QR product summary and checkout entry." },
        { href: "/q/SANHO701/checkout", label: "Checkout", state: "complete", detail: "Payer form, method mock, validation, and PG blocked copy." },
        { href: "/q/SANHO701/loading", label: "Loading", state: "complete", detail: "Payment progress mock with success/failure exits." },
        { href: "/q/SANHO701/success", label: "Success", state: "complete", detail: "Order number and fulfillment snapshot." },
        { href: "/q/SANHO701/failed", label: "Failed", state: "blocked", detail: "Failure preview without PG retry." },
        { href: "/q/SANHO701/expired", label: "Expired", state: "blocked", detail: "Dedicated expired QR route." },
      ],
    },
    {
      title: "Guest Order Flow",
      helper: "Non-member order lookup and refund request preview.",
      routes: [
        { href: "/orders/guest", label: "Guest Order Lookup", state: "complete", detail: "Order number and phone mock verification." },
        { href: "/orders/guest/A5-20260519-001", label: "Guest Order Detail", state: "complete", detail: "Order, payment, delivery/pickup, and item snapshot." },
        { href: "/orders/guest/A5-20260519-001/refund", label: "Refund Request Mock", state: "blocked", detail: "UI-only refund request with admin approval copy." },
      ],
    },
  ] as StatusRouteGroup[],
  qrStatePreviews: [
    { href: "/q/SANHO701/status", label: "active", state: "complete", detail: "Can continue to mock checkout." },
    { href: "/q/OLDQR22/status", label: "expired", state: "blocked", detail: "Checkout blocked by expiry." },
    { href: "/q/USED701/status", label: "used", state: "review", detail: "Already paid and routes toward order lookup." },
    { href: "/q/VOID1234/status", label: "payment_failed", state: "blocked", detail: "Mock failed payment branch." },
    { href: "/q/CANCEL77/status", label: "canceled", state: "blocked", detail: "Operator-cancelled QR branch." },
  ] as StatusRoute[],
  qrStateDetails: [
    {
      state: "active",
      route: "/q/SANHO701/status",
      headline: "Active QR can enter checkout",
      customerAction: "Show checkout button and payer fields.",
      blockedAction: "No real PG request, no Firebase write, no inventory decrement.",
      reviewNote: "Confirm active QR copy before beta room test.",
      tone: "complete",
    },
    {
      state: "expired",
      route: "/q/OLDQR22/status",
      headline: "Expired QR blocks checkout",
      customerAction: "Show expiry warning and route to order lookup or tablet QR issue.",
      blockedAction: "No server expiry validation yet; no regeneration write.",
      reviewNote: "Decide whether expired QR gets regenerated or abandoned.",
      tone: "blocked",
    },
    {
      state: "used",
      route: "/q/USED701/status",
      headline: "Used QR routes to order lookup",
      customerAction: "Show already-paid guidance and related order link.",
      blockedAction: "No real single-use lock validation yet.",
      reviewNote: "Confirm duplicate-scan copy for guardian payer scenarios.",
      tone: "review",
    },
    {
      state: "payment_failed",
      route: "/q/VOID1234/status",
      headline: "Payment failed remains retry-only UI",
      customerAction: "Show failure reason and mock retry link.",
      blockedAction: "No PG retry, cancellation, refund, or webhook.",
      reviewNote: "Confirm retry policy before real PG contract.",
      tone: "blocked",
    },
    {
      state: "canceled",
      route: "/q/CANCEL77/status",
      headline: "Canceled QR blocks retry",
      customerAction: "Show operator-cancelled guidance and related order path.",
      blockedAction: "No operator audit write and no new QR generation.",
      reviewNote: "Confirm operator cancellation ownership.",
      tone: "blocked",
    },
  ] as QrStateDetail[],
  coverage: [
    { title: "Empty state", detail: "Tablet catalog no-products and guest lookup no-results placeholders exist.", state: "complete" },
    { title: "Loading state", detail: "`/q/[code]/loading` and checkout loading panels exist.", state: "complete" },
    { title: "Error state", detail: "Unknown order, external inventory unavailable, and payment record missing states exist.", state: "complete" },
    { title: "Risk state", detail: "Critical stock, missing external code, payment_failed, cancelled, expired, and blocked bank transfer states exist.", state: "complete" },
  ] as StatusItem[],
  nextTasks: [
    "Open `/tablet/status` and click every route card after dev server use is allowed.",
    "Run build and lint after command restrictions are lifted.",
    "Review `/q/SANHO701/expired` copy with QR expiry policy.",
    "Review `/orders/guest/A5-20260519-001/refund` copy with refund policy.",
    "Hide or gate QA route matrices before external beta review.",
    "Convert catalog filters to repository-backed mock filters.",
    "Add stale cart and insufficient stock route examples.",
    "Finalize guest lookup verification policy.",
    "Finalize guardian payer copy and consent wording.",
    "Plan Storage upgrade or static asset replacement for product imagery.",
  ],
  humanChecks: [
    "Confirm the status dashboard can remain visible in local beta only.",
    "Confirm Spark Storage hold and image placeholder strategy.",
    "Confirm no real customer data is entered during room-tablet demos.",
    "Confirm delivery and pickup timelines match nursery operations.",
    "Confirm external inventory blockers before any company admin merge.",
  ],
};
