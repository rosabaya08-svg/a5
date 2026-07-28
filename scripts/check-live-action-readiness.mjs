import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const defaultLocalBaseUrl = "http://localhost:5002";
const defaultFunctionBaseUrl = "https://asia-northeast3-a5-closed-mall.cloudfunctions.net";
const requestTimeoutMs = Number(process.env.A5_ACTION_CHECK_TIMEOUT_MS || 15000);

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path) {
  return existsSync(join(root, path));
}

function readDotenv(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return {};

  const result = {};
  for (const line of readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

const dotenv = readDotenv(".env.local");
const localBaseUrl = trimSlash(process.env.A5_LOCAL_BASE_URL || defaultLocalBaseUrl);
const functionBaseUrl = trimSlash(
  process.env.A5_FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    dotenv.NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    dotenv.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    defaultFunctionBaseUrl,
);

const requiredSourceFiles = [
  "components/auth/BetaAdminLogin.tsx",
  "components/company/CompanyProductRegistrationWorkspace.tsx",
  "components/admin/CompanySignupRequestsPanel.tsx",
  "components/admin/AdminProductModerationPanel.tsx",
  "components/admin/AdminCancelRequestsPanel.tsx",
  "components/company/CompanyDeliveryActionPanel.tsx",
  "components/nursery/A4RoomImportPanel.tsx",
  "components/storefront/GuestOrderLookupClient.tsx",
  "functions/src/a4/syncRooms.ts",
  "functions/src/company/signupSubmit.ts",
  "functions/src/company/signupReview.ts",
  "functions/src/admin/productReview.ts",
  "functions/src/company/productUpsert.ts",
  "functions/src/admin/productModeration.ts",
  "functions/src/admin/cancelRequestReview.ts",
  "functions/src/auth/bootstrap.ts",
  "functions/src/company/orderDeliveryUpdate.ts",
  "functions/src/guestShop/session.ts",
  "functions/src/payments/adminPg.ts",
  "functions/src/payments/ready.ts",
  "functions/src/payments/confirm.ts",
  "functions/src/payments/providerAdapter.ts",
  "functions/src/payments/payupClient.ts",
  "lib/firebase/a4RoomSyncClient.ts",
  "lib/payments/paymentEndpoints.ts",
];

const localRoutes = [
  "/admin/dashboard/",
  "/admin/companies/",
  "/admin/products/",
  "/admin/home-editor/",
  "/admin/marketing/banners/",
  "/admin/marketing/videos/",
  "/admin/orders/",
  "/admin/payments/",
  "/company/dashboard/",
  "/company/onboarding/",
  "/company/products/",
  "/company/products/dashboard/",
  "/company/products/list/",
  "/company/products/new/",
  "/company/orders/",
  "/company/deliveries/",
  "/company/sales/",
  "/company/brand-page/",
  "/nursery/dashboard/",
  "/nursery/orders/",
  "/nursery/rooms/",
  "/nursery/tablets/",
  "/nursery/qr-history/",
  "/nursery/pickups/",
  "/products/",
  "/tablet/products/",
  "/tablet/cart/",
  "/tablet/login/",
  "/q/live/",
  "/m/shop/",
  "/m/shop/brand/brand-7592901311-7592901311/",
  "/m/shop/checkout/",
  "/orders/guest/",
];

const localRedirectChecks = [
  { route: "/admin/pg-integration/", expected: 307, location: "/admin/pg-settings/" },
];

const remoteFunctionChecks = [
  { name: "paymentsStatus missing query", method: "GET", path: "/paymentsStatus", expected: 400 },
  { name: "authBootstrap status", method: "GET", path: "/authBootstrap", expected: 200 },
  { name: "companySignupSubmit wrong method", method: "GET", path: "/companySignupSubmit", expected: 405 },
  { name: "adminProductReview legacy compatibility wrong method", method: "GET", path: "/adminProductReview", expected: 405 },
  { name: "companyProductUpsert wrong method", method: "GET", path: "/companyProductUpsert", expected: 405 },
  { name: "adminProductModeration wrong method", method: "GET", path: "/adminProductModeration", expected: 405 },
  { name: "adminCancelRequestReview wrong method", method: "GET", path: "/adminCancelRequestReview", expected: 405 },
  { name: "cmsUploadFile wrong method", method: "GET", path: "/cmsUploadFile", expected: 405 },
  { name: "guestShopProducts missing scope", method: "GET", path: "/guestShopProducts", expected: 400 },
  { name: "guestOrderLookup missing query", method: "GET", path: "/guestOrderLookup", expected: 400 },
  { name: "paymentsReady wrong method", method: "GET", path: "/paymentsReady", expected: 405 },
  { name: "qrCreate empty POST", method: "POST", path: "/qrCreate", body: {}, expected: 400 },
  { name: "qrLookup empty POST", method: "POST", path: "/qrLookup", body: {}, expected: 400 },
  { name: "companySignupSubmit empty POST", method: "POST", path: "/companySignupSubmit", body: {}, expected: 400 },
  { name: "cmsUploadFile empty POST", method: "POST", path: "/cmsUploadFile", body: {}, expected: 400 },
  { name: "guestShopClaim empty POST", method: "POST", path: "/guestShopClaim", body: {}, expected: 400 },
  { name: "guestShopCartSave empty POST", method: "POST", path: "/guestShopCartSave", body: {}, expected: 400 },
  { name: "companyOrderDeliveryUpdate empty POST", method: "POST", path: "/companyOrderDeliveryUpdate", body: {}, expected: 400 },
  { name: "authBootstrap empty POST requires admin token", method: "POST", path: "/authBootstrap", body: {}, expected: 401 },
  { name: "companySignupReview empty POST requires admin token", method: "POST", path: "/companySignupReview", body: {}, expected: 401 },
  { name: "adminProductReview legacy flow disabled", method: "POST", path: "/adminProductReview", body: {}, expected: 410 },
  { name: "companyProductUpsert valid shape requires company token", method: "POST", path: "/companyProductUpsert", body: { product: { id: "readiness-probe", company_id: "readiness-company" }, detailPage: { id: "readiness-probe", company_id: "readiness-company" } }, expected: 401 },
  { name: "adminProductModeration empty POST requires admin token", method: "POST", path: "/adminProductModeration", body: {}, expected: 401 },
  { name: "adminCancelRequestReview empty POST requires admin token", method: "POST", path: "/adminCancelRequestReview", body: {}, expected: 401 },
  { name: "adminPgCredentialSave empty POST requires admin token", method: "POST", path: "/adminPgCredentialSave", body: {}, expected: 401 },
  { name: "adminPgConnectionTest empty POST requires admin token", method: "POST", path: "/adminPgConnectionTest", body: {}, expected: 401 },
  { name: "adminPgActivation empty POST requires admin token", method: "POST", path: "/adminPgActivation", body: {}, expected: 401 },
  { name: "paymentsReady empty POST", method: "POST", path: "/paymentsReady", body: {}, expected: 400 },
  { name: "paymentsConfirm empty POST", method: "POST", path: "/paymentsConfirm", body: {}, expected: 400 },
];

function withTimeout(promise, timeoutMs, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);

  return {
    signal: controller.signal,
    run: promise(controller.signal).finally(() => clearTimeout(timeout)),
  };
}

async function fetchStatus(url, options = {}) {
  const request = withTimeout(
    (signal) =>
      fetch(url, {
        redirect: "manual",
        signal,
        ...options,
      }),
    requestTimeoutMs,
    url,
  );

  const response = await request.run;
  return response.status;
}

async function fetchManualResponse(url, options = {}) {
  const request = withTimeout(
    (signal) =>
      fetch(url, {
        redirect: "manual",
        signal,
        ...options,
      }),
    requestTimeoutMs,
    url,
  );

  return request.run;
}

function isRedirectStatus(status) {
  return [301, 302, 307, 308].includes(status);
}

function resolveLocation(location, baseUrl) {
  if (!location) return "";
  try {
    return new URL(location, baseUrl).toString();
  } catch {
    return "";
  }
}

function isCanonicalSlashRedirect(fromUrl, toUrl) {
  if (!toUrl) return false;
  return fromUrl.replace(/\/+$/, "") === toUrl.replace(/\/+$/, "");
}

async function fetchRouteStatusFollowingCanonical(url) {
  const response = await fetchManualResponse(url);
  const location = response.headers.get("location") || "";
  const nextUrl = resolveLocation(location, url);

  if (isRedirectStatus(response.status) && isCanonicalSlashRedirect(url, nextUrl)) {
    const followed = await fetchManualResponse(nextUrl);
    return {
      status: followed.status,
      initialStatus: response.status,
      canonicalLocation: location,
    };
  }

  return { status: response.status, initialStatus: response.status, canonicalLocation: "" };
}

function assertSourceContracts() {
  const files = Object.fromEntries(requiredSourceFiles.map((path) => [path, exists(path) ? read(path) : ""]));
  const a4LocalRoomUpsertSource =
    files["functions/src/a4/syncRooms.ts"]
      .split("export async function a4LocalRoomUpsertHandler")[1]
      ?.split("export async function a4RoomsSyncHandler")[0] ?? "";

  const checks = [
    ...requiredSourceFiles.map((path) => ({
      ok: exists(path),
      message: `source exists: ${path}`,
    })),
    {
      ok: files["components/auth/BetaAdminLogin.tsx"].includes("submitCompanySignupRequest") &&
        files["components/auth/BetaAdminLogin.tsx"].includes("representativeId") &&
        files["components/auth/BetaAdminLogin.tsx"].includes("isValidSignupPassword"),
      message: "company signup UI submits through Functions with required representative document and password policy.",
    },
    {
      ok: files["functions/src/company/signupSubmit.ts"].includes("company_signup_requests") &&
        files["functions/src/company/signupSubmit.ts"].includes('pg_provider: "payup"') &&
        files["functions/src/company/signupSubmit.ts"].includes("company_documents"),
      message: "company signup writes request, company, documents, and Payup-oriented profile data.",
    },
    {
      ok: files["functions/src/company/signupReview.ts"].includes("setCustomUserClaims") &&
        files["functions/src/company/signupReview.ts"].includes("company_pg_credentials") &&
        files["functions/src/company/signupReview.ts"].includes("payup_mid"),
      message: "company approval provisions seller claims and Payup credential profile.",
    },
    {
      ok: files["functions/src/auth/bootstrap.ts"].includes("requireSuperAdmin") &&
        files["functions/src/auth/bootstrap.ts"].includes("Firebase ID token is required") &&
        files["functions/src/auth/bootstrap.ts"].includes("setCustomUserClaims"),
      message: "auth bootstrap requires a SUPER_ADMIN Firebase ID token before claims or invite writes.",
    },
    {
      ok: a4LocalRoomUpsertSource.includes("getAdminDb()") &&
        a4LocalRoomUpsertSource.includes('targetDb.collection("rooms")') &&
        a4LocalRoomUpsertSource.includes('targetDb.collection("tablets")') &&
        a4LocalRoomUpsertSource.includes("authorizeRoomSync") &&
        !a4LocalRoomUpsertSource.includes("getAdminDbForProject") &&
        files["lib/firebase/a4RoomSyncClient.ts"].includes("saveA5LocalRoomToFirestore") &&
        files["components/nursery/A4RoomImportPanel.tsx"].includes("saveA5LocalRoomToFirestore"),
      message: "A4 room local add/rename writes only A5 rooms/tablets through Functions and keeps signage-partner read-only.",
    },
    {
      ok: files["functions/src/admin/productReview.ts"].includes("A5_LEGACY_PRODUCT_APPROVAL_ENABLED") &&
        files["functions/src/admin/productReview.ts"].includes("LEGACY_PRODUCT_APPROVAL_DISABLED") &&
        files["functions/src/company/productUpsert.ts"].includes("publishStorefrontRuntimeSnapshot") &&
        files["functions/src/company/productUpsert.ts"].includes("product_options") &&
        files["functions/src/company/productUpsert.ts"].includes("product_detail_pages"),
      message: "legacy product approval is disabled by default; company product upsert writes the live product graph and republishes the storefront snapshot.",
    },
    {
      ok: files["functions/src/admin/productModeration.ts"].includes("publishStorefrontRuntimeSnapshot") &&
        files["functions/src/admin/productModeration.ts"].includes("product_moderation_logs") &&
        files["lib/payments/paymentEndpoints.ts"].includes("adminProductModeration") &&
        files["components/admin/AdminProductModerationPanel.tsx"].includes("moderateProduct"),
      message: "admin product moderation suspends/restores live products, logs the action, and republishes storefront snapshots.",
    },
    {
      ok: files["functions/src/admin/cancelRequestReview.ts"].includes("cancel_requests") &&
        files["functions/src/admin/cancelRequestReview.ts"].includes("requireSuperAdmin") &&
        files["functions/src/admin/cancelRequestReview.ts"].includes("cancelProviderPayment") &&
        files["components/admin/AdminCancelRequestsPanel.tsx"].includes("adminCancelRequestReview"),
      message: "admin cancel/refund review reads cancel_requests and gates PG cancel approval behind SUPER_ADMIN Functions.",
    },
    {
      ok: files["functions/src/payments/adminPg.ts"].includes("ADMIN_PG_MOCK_PROVIDER_DISABLED") &&
        files["functions/src/payments/adminPg.ts"].includes('const allowedProviders: PaymentProviderId[] = ["pg_contract", "payup"'),
      message: "admin PG credential save rejects mock provider selection and defaults to Payup.",
    },
    {
      ok: files["functions/src/company/orderDeliveryUpdate.ts"].includes("order_items") &&
        files["functions/src/company/orderDeliveryUpdate.ts"].includes("company_id") &&
        files["functions/src/company/orderDeliveryUpdate.ts"].includes("delivery_status"),
      message: "company delivery update writes company-scoped order item delivery status.",
    },
    {
      ok: files["functions/src/guestShop/session.ts"].includes("guestOrderLookupHandler") &&
        files["functions/src/guestShop/session.ts"].includes("orders") &&
        files["functions/src/guestShop/session.ts"].includes("cancel_requests") &&
        files["functions/src/guestShop/session.ts"].includes("guest_lookup_enabled") &&
        files["functions/src/guestShop/session.ts"].includes("hashLookupToken"),
      message: "guest order lookup reads verified order and cancel/refund snapshots through Functions.",
    },
    {
      ok: files["functions/src/payments/providerAdapter.ts"].includes("requestPayupKeyinApproval") &&
        files["functions/src/payments/providerAdapter.ts"].includes("requestPayupStandardApproval") &&
        files["functions/src/payments/providerAdapter.ts"].includes("requestPayupCancel") &&
        files["functions/src/payments/payupClient.ts"].includes("/auth/v1/accessToken") &&
        files["functions/src/payments/payupClient.ts"].includes("/api/v1/payment") &&
        files["functions/src/payments/payupClient.ts"].includes("/api/v1/cancel") &&
        files["functions/src/payments/payupClient.ts"].includes("/api/v1/partCancel") &&
        files["functions/src/payments/payupClient.ts"].includes("/v2/api/payment/") &&
        files["functions/src/payments/payupClient.ts"].includes("maskPayupPayload"),
      message: "Payup standard token approval/cancel APIs are wired, legacy key-in remains isolated, and provider payloads are masked.",
    },
    {
      ok: files["functions/src/payments/confirm.ts"].includes("orders") &&
        files["functions/src/payments/confirm.ts"].includes("order_items") &&
        files["functions/src/payments/confirm.ts"].includes("payments") &&
        files["functions/src/payments/confirm.ts"].includes("inventory"),
      message: "payment confirm writes order, order item, payment, and inventory flow records.",
    },
    {
      ok: files["lib/payments/paymentEndpoints.ts"].includes("companySignupSubmit") &&
        files["lib/payments/paymentEndpoints.ts"].includes("companyProductUpsert") &&
        files["lib/payments/paymentEndpoints.ts"].includes("adminProductModeration") &&
        files["lib/payments/paymentEndpoints.ts"].includes("adminCancelRequestReview") &&
        files["lib/payments/paymentEndpoints.ts"].includes("companyOrderDeliveryUpdate") &&
        files["lib/payments/paymentEndpoints.ts"].includes("qrCreate") &&
        files["lib/payments/paymentEndpoints.ts"].includes("qrLookup") &&
        files["lib/payments/paymentEndpoints.ts"].includes("guestOrderLookup"),
      message: "frontend endpoint map includes signup, company product upsert, moderation, cancel review, delivery update, QR, and guest lookup functions.",
    },
  ];

  return checks;
}

function findTextIntegrityWarnings() {
  const u = (...codes) => String.fromCodePoint(...codes);
  const suspiciousFragments = [
    u(0xfffd),
    u(0xf9e4),
    u(0x6e72),
    u(0x6028),
    u(0x5bc3),
    u(0x8adb),
    u(0x8e42),
    u(0x4e8c, 0xc1f0),
    u(0xf9cf),
    u(0x5ac4),
    u(0x5a9b),
    u(0x8e30),
    u(0x6c85),
    u(0x9858),
    u(0x6028, 0xc889),
    u(0x3f, 0xb301),
    u(0x3f, 0xacf9),
    u(0x3f, 0xba84),
    u(0x3f, 0xc10f),
    u(0x3f, 0xc495),
    u(0x3f, 0xb6af),
    u(0x3f, 0xb349),
    u(0x3f, 0xbdbe),
    u(0x3f, 0x3bb),
    u(0x3f, 0xafa8),
  ];
  const targetFiles = [
    "components/admin/AdminInvitePanel.tsx",
    "components/admin/PgGatewaySettingsPanel.tsx",
    "components/admin/PgPaymentLogMonitoringPanel.tsx",
    "components/storefront/LiveShopClient.tsx",
    "components/storefront/TabletHomeRuntimeSections.tsx",
    "components/storefront/GuestQrExperience.tsx",
  ];

  return targetFiles
    .filter((path) => exists(path))
    .map((path) => {
      const text = read(path);
      const lines = text.split(/\r?\n/);
      const hits = [];
      for (let index = 0; index < lines.length; index += 1) {
        if (suspiciousFragments.some((fragment) => lines[index].includes(fragment))) {
          hits.push(index + 1);
        }
      }
      return { path, hits };
    })
    .filter((item) => item.hits.length > 0);
}

async function checkLocalRoutes() {
  const results = [];
  for (const route of localRoutes) {
    const url = `${localBaseUrl}${route}`;
    try {
      const routeStatus = await fetchRouteStatusFollowingCanonical(url);
      results.push({ ok: routeStatus.status === 200, route, ...routeStatus });
    } catch (error) {
      results.push({ ok: false, route, status: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

async function checkLocalRedirects() {
  const results = [];
  for (const check of localRedirectChecks) {
    const url = `${localBaseUrl}${check.route}`;
    try {
      const firstResponse = await fetchManualResponse(url);
      const firstLocation = firstResponse.headers.get("location") || "";
      const firstNextUrl = resolveLocation(firstLocation, url);
      const response = isRedirectStatus(firstResponse.status) && isCanonicalSlashRedirect(url, firstNextUrl)
        ? await fetchManualResponse(firstNextUrl)
        : firstResponse;
      const location = response.headers.get("location") || "";
      results.push({
        ...check,
        ok: response.status === check.expected && location === check.location,
        status: response.status,
        actualLocation: location,
      });
    } catch (error) {
      results.push({
        ...check,
        ok: false,
        status: 0,
        actualLocation: "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

async function checkRemoteFunctions() {
  const results = [];
  for (const check of remoteFunctionChecks) {
    const url = `${functionBaseUrl}${check.path}`;
    const options = {
      method: check.method,
      headers: check.method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: check.body === undefined ? undefined : JSON.stringify(check.body),
    };

    try {
      const status = await fetchStatus(url, options);
      results.push({ ...check, ok: status === check.expected, status });
    } catch (error) {
      results.push({
        ...check,
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

console.log("[check:live-action-readiness] A5 live action readiness gate");
console.log(`- local base: ${localBaseUrl}`);
console.log(`- functions base: ${functionBaseUrl}`);

const sourceChecks = assertSourceContracts();
for (const check of sourceChecks) {
  console.log(`- ${check.ok ? "ok" : "fail"}: ${check.message}`);
}

const localResults = await checkLocalRoutes();
for (const result of localResults) {
  const suffix = result.error ? ` (${result.error})` : "";
  console.log(`- ${result.ok ? "ok" : "fail"}: local ${result.route} -> ${result.status}${suffix}`);
}

const localRedirectResults = await checkLocalRedirects();
for (const result of localRedirectResults) {
  const suffix = result.error ? ` (${result.error})` : "";
  console.log(`- ${result.ok ? "ok" : "fail"}: local redirect ${result.route} -> ${result.status} ${result.actualLocation}, expected ${result.expected} ${result.location}${suffix}`);
}

const remoteResults = await checkRemoteFunctions();
for (const result of remoteResults) {
  const suffix = result.error ? ` (${result.error})` : "";
  console.log(`- ${result.ok ? "ok" : "fail"}: remote ${result.name} -> ${result.status}, expected ${result.expected}${suffix}`);
}

const textWarnings = findTextIntegrityWarnings();
if (textWarnings.length) {
  console.warn("[check:live-action-readiness] WARN: suspicious Korean text/mojibake patterns found in operator-facing files.");
  for (const warning of textWarnings) {
    console.warn(`- warn: ${warning.path} lines ${warning.hits.slice(0, 12).join(", ")}${warning.hits.length > 12 ? ` ... +${warning.hits.length - 12}` : ""}`);
  }
}

const failed = [
  ...sourceChecks.filter((check) => !check.ok),
  ...localResults.filter((result) => !result.ok),
  ...localRedirectResults.filter((result) => !result.ok),
  ...remoteResults.filter((result) => !result.ok),
];

if (failed.length) {
  console.error(`[check:live-action-readiness] FAILED: ${failed.length} readiness check(s) failed.`);
  process.exit(1);
}

console.log("[check:live-action-readiness] OK. Local routes, remote guard responses, and live-action source contracts are ready.");
