import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path) {
  return existsSync(join(root, path));
}

const files = {
  functionsIndex: read("functions/src/index.ts"),
  repositoryIndex: read("lib/repositories/index.ts"),
  catalogPricing: read("functions/src/payments/catalogPricing.ts"),
  paymentsReady: read("functions/src/payments/ready.ts"),
  paymentsConfirm: read("functions/src/payments/confirm.ts"),
  guestShopSession: read("functions/src/guestShop/session.ts"),
  signupSubmit: read("functions/src/company/signupSubmit.ts"),
  signupReview: read("functions/src/company/signupReview.ts"),
  cancelReview: read("functions/src/admin/cancelRequestReview.ts"),
  deliveryUpdate: read("functions/src/company/orderDeliveryUpdate.ts"),
};

const requiredRoutes = [
  "app/admin/products/page.tsx",
  "app/admin/company-ads/page.tsx",
  "app/admin/home-editor/page.tsx",
  "app/admin/pg-settings/page.tsx",
  "app/company/onboarding/page.tsx",
  "app/company/products/new/page.tsx",
  "app/company/products/[productId]/edit/page.tsx",
  "app/company/orders/page.tsx",
  "app/company/deliveries/page.tsx",
  "app/nursery/orders/page.tsx",
  "app/tablet/products/page.tsx",
  "app/tablet/cart/page.tsx",
  "app/q/[code]/checkout/page.tsx",
  "app/orders/guest/[orderNo]/page.tsx",
  "app/m/shop/page.tsx",
  "app/m/shop/checkout/page.tsx",
];

const requiredExports = [
  "paymentsReady",
  "paymentsConfirm",
  "paymentsStatus",
  "cmsUploadFile",
  "adminCmsAssetUpload",
  "companySignupSubmit",
  "companySignupReview",
  "adminProductReview",
  "adminCancelRequestReview",
  "companyOrderDeliveryUpdate",
  "guestOrderLookup",
  "guestShopProducts",
  "guestShopCartSave",
  "tabletDeviceResolve",
  "a4LocalRoomUpsert",
  "a4HandoffCreate",
  "a4HandoffConsume",
];

const routeChecks = requiredRoutes.map((route) => ({
  ok: exists(route),
  message: `route exists: ${route}`,
}));

const exportChecks = requiredExports.map((name) => ({
  ok: files.functionsIndex.includes(`export const ${name} `) || files.functionsIndex.includes(`export const ${name}=`),
  message: `function export exists: ${name}`,
}));

const checks = [
  ...routeChecks,
  ...exportChecks,
  {
    ok: files.repositoryIndex.includes("function shouldAllowMockRepositoryFallback()") &&
      files.repositoryIndex.includes("return false;"),
    message: "central repository mock fallback is disabled by default.",
  },
  {
    ok: files.catalogPricing.includes("A5_ALLOW_QR_CATALOG_MOCK_FALLBACK") &&
      files.catalogPricing.includes('mockFallback: "disabled"'),
    message: "payment catalog pricing does not silently fall back to mock catalog by default.",
  },
  {
    ok: files.paymentsReady.includes("priceCartItemsFromCatalog") &&
      files.paymentsReady.includes("assertAmount") &&
      files.paymentsReady.includes("PAYMENT_READY_SERVER_KEYS_REQUIRED") &&
      !files.paymentsReady.includes('pgReadiness.provider === "mock"'),
    message: "payment ready recalculates amount server-side and does not silently fall back to mock when Payup is not ready.",
  },
  {
    ok: files.paymentsConfirm.includes("confirmPaymentWithConfiguredProvider") &&
      files.paymentsConfirm.includes("mockApprovalRequested") &&
      files.paymentsConfirm.includes("A5_ALLOW_MOCK_PAYMENT_CONFIRM"),
    message: "payment confirm uses provider adapter and gates mock approval.",
  },
  {
    ok: files.signupSubmit.includes('pg_provider: "payup"') &&
      files.signupSubmit.includes("company_signup_requests"),
    message: "company signup writes Payup-oriented onboarding data.",
  },
  {
    ok: files.signupReview.includes("company_pg_credentials") &&
      files.signupReview.includes("payup_mid") &&
      files.signupReview.includes("setCustomUserClaims"),
    message: "company approval provisions Payup credential profile and seller claims.",
  },
  {
    ok: files.cancelReview.includes("cancel_requests") &&
      files.cancelReview.includes("requireSuperAdmin") &&
      files.cancelReview.includes("cancelProviderPayment"),
    message: "admin cancel/refund review processes cancel_requests with super-admin PG approval gate.",
  },
  {
    ok: files.guestShopSession.includes("guestOrderLookupHandler") &&
      files.guestShopSession.includes("cancel_requests") &&
      files.guestShopSession.includes("cancelRequest"),
    message: "guest order lookup returns cancel/refund request status with verified orders.",
  },
  {
    ok: files.deliveryUpdate.includes("order_items") &&
      files.deliveryUpdate.includes("delivery_status") &&
      files.deliveryUpdate.includes("company_id"),
    message: "company delivery update writes order item delivery status with company ownership check.",
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("[check:commerce-linkage] A5 live commerce linkage gate");
for (const check of checks) {
  console.log(`- ${check.ok ? "ok" : "fail"}: ${check.message}`);
}

if (failed.length) {
  console.error(`[check:commerce-linkage] FAILED: ${failed.length} linkage check(s) failed.`);
  process.exit(1);
}

console.log("[check:commerce-linkage] OK. Core live-commerce linkage contracts are present.");
