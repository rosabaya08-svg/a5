import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

const files = {
  providerRuntime: read("functions/src/payments/providerRuntime.ts"),
  providerAdapter: read("functions/src/payments/providerAdapter.ts"),
  innopayRuntime: read("functions/src/payments/innopayRuntime.ts"),
  ready: read("functions/src/payments/ready.ts"),
  browserBridge: read("lib/payments/pgCheckoutBridge.ts"),
  adminPg: read("functions/src/payments/adminPg.ts"),
  pgSettingsPanel: read("components/admin/PgGatewaySettingsPanel.tsx"),
  pgIntegrationRoute: read("app/admin/pg-integration/page.tsx"),
};

const checks = [
  {
    ok: files.providerRuntime.includes("legacyInnopayBlocked") &&
      files.providerRuntime.includes("A5_ENABLE_LEGACY_INNOPAY disabled"),
    message: "providerRuntime must block legacy InnoPay/Infiny unless A5_ENABLE_LEGACY_INNOPAY is enabled.",
  },
  {
    ok: files.providerAdapter.includes("Legacy InnoPay/Infiny is disabled") &&
      files.providerAdapter.includes("isLegacyInnopayEnabled()"),
    message: "providerAdapter must reject legacy InnoPay/Infiny confirm/webhook/cancel paths by default.",
  },
  {
    ok: files.innopayRuntime.includes("if (!isLegacyInnopayEnabled())") &&
      files.innopayRuntime.includes("realCallsEnabled: false"),
    message: "innopayRuntime must return disabled settings when the legacy flag is off.",
  },
  {
    ok: files.ready.includes("isLegacyInnopayEnabled()") &&
      files.ready.includes("const legacySnapshot = isLegacyInnopayEnabled()") &&
      files.ready.includes("const [infinyData, legacyData] = isLegacyInnopayEnabled()"),
    message: "paymentsReady must not unconditionally merge legacy Infiny runtime into Payup runtime.",
  },
  {
    ok: files.browserBridge.includes("NEXT_PUBLIC_A5_ENABLE_LEGACY_INNOPAY") &&
      files.browserBridge.includes("legacy_innopay_disabled") &&
      files.browserBridge.includes("Use Payup server checkout"),
    message: "browser checkout bridge must block legacy InnoPay/Infiny script loading by default.",
  },
  {
    ok: files.adminPg.includes("ADMIN_PG_MOCK_PROVIDER_DISABLED") &&
      !files.adminPg.includes('const allowedProviders: PaymentProviderId[] = ["mock"'),
    message: "admin PG credential save must reject mock as a selectable provider.",
  },
  {
    ok: !files.pgSettingsPanel.includes('const providerOptions: PgProvider[] = ["payup", "mock"'),
    message: "admin PG settings UI must not offer mock as a selectable provider.",
  },
  {
    ok: files.pgIntegrationRoute.includes('redirect("/admin/pg-settings/")') &&
      !files.pgIntegrationRoute.includes("AdminPgIntegrationPage"),
    message: "legacy admin PG integration route must redirect to Payup PG settings.",
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("[check:payment-provider-policy] Payup provider policy gate");
for (const check of checks) {
  console.log(`- ${check.ok ? "ok" : "fail"}: ${check.message}`);
}

if (failed.length) {
  console.error(`[check:payment-provider-policy] FAILED: ${failed.length} policy check(s) failed.`);
  process.exit(1);
}

console.log("[check:payment-provider-policy] OK. Legacy payment paths are gated.");
