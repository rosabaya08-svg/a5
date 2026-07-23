import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const files = {
  adminLayout: read("app/admin/layout.tsx"),
  companyLayout: read("app/company/layout.tsx"),
  layoutGuard: read("components/auth/PortalLayoutGuard.tsx"),
  roleGuard: read("components/auth/RoleGuard.tsx"),
  appShell: read("components/layout/AppShell.tsx"),
  companyAuth: read("lib/auth/companyFirebaseAuth.ts"),
  orderPanel: read("components/company/CompanyOrderOperationsPanel.tsx"),
  orderServer: read("functions/src/company/orderOperations.ts"),
};

const checks = [
  [
    "admin and company authentication guards live in persistent route layouts",
    files.adminLayout.includes('<PortalLayoutGuard role="admin"') &&
      files.companyLayout.includes('<PortalLayoutGuard role="company"') &&
      files.layoutGuard.includes("usePathname"),
  ],
  [
    "page-level app shells no longer remount admin or company guards",
    files.appShell.includes('const guardedRole = accent === "nursery" ? accent : null;'),
  ],
  [
    "server-confirmed sessions render immediately without a false login-required screen",
    files.roleGuard.includes("initiallyAllowed = false") &&
      files.roleGuard.includes("useState(initiallyAllowed)") &&
      !files.roleGuard.includes(">로그인이 필요합니다<"),
  ],
  [
    "company auth restoration waits for Firebase initialization without forced token refresh",
    files.companyAuth.includes("timeoutMs = 8000") &&
      files.companyAuth.includes("auth.authStateReady()") &&
      files.companyAuth.includes("user.getIdTokenResult()") &&
      !files.companyAuth.includes("user.getIdTokenResult(true)"),
  ],
  [
    "transient Firebase errors do not erase an otherwise valid portal session",
    files.roleGuard.includes("error instanceof CompanyFirebaseAuthMismatchError") &&
      files.roleGuard.includes("else {\n              ok = true;"),
  ],
  [
    "order and delivery pages provide payment/order date ranges and quick presets",
    files.orderPanel.includes('<option value="paidAt">결제일</option>') &&
      files.orderPanel.includes('<option value="createdAt">주문 접수일</option>') &&
      files.orderPanel.includes('type="date"') &&
      ["오늘", "어제", "3일", "7일", "10일", "20일", "30일", "90일"].every((label) =>
        files.orderPanel.includes(`label: "${label}"`),
      ),
  ],
  [
    "order items are grouped by Korean calendar date with daily order/item/amount totals",
    files.orderPanel.includes("timeZone: \"Asia/Seoul\"") &&
      files.orderPanel.includes("groupedItems.map") &&
      files.orderPanel.includes("group.orderCount") &&
      files.orderPanel.includes("group.totalAmount"),
  ],
  [
    "order status and delivery status filters stay separate",
    files.orderPanel.includes('mode === "orders" ? orderStatusLabels : deliveryStatusLabels'),
  ],
  [
    "company-scoped order reads are sorted, bounded, and report truncation",
    files.orderServer.includes('.where("company_id", "==", companyId)') &&
      files.orderServer.includes('.orderBy("created_at", "desc")') &&
      files.orderServer.includes("const itemLimit = 1000") &&
      files.orderServer.includes("resultMeta: { itemLimit, truncated }"),
  ],
];

let failed = 0;
console.log("[check:portal-auth-order-date-contract] portal auth and dated order contracts");
for (const [name, passed] of checks) {
  console.log(`- ${passed ? "ok" : "fail"}: ${name}`);
  if (!passed) failed += 1;
}
if (failed) {
  console.error(`[check:portal-auth-order-date-contract] FAILED: ${failed} contract(s) failed.`);
  process.exit(1);
}
console.log(`[check:portal-auth-order-date-contract] OK: ${checks.length} contracts passed.`);
