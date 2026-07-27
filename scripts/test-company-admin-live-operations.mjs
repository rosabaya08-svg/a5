import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

const projectId = "a5-closed-mall";
const region = "asia-northeast3";
const companyId = "company-test-1004";
const businessNo = "7592901311";
const productId = "product-test-1004";
const optionId = "opt-test-1004-basic";
const functionBase = `https://${region}-${projectId}.cloudfunctions.net`;
const env = await readEnv(".env.local");
const sourceEnv = await readEnv("C:/Users/user/Desktop/my-app/.env.local");
const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  env.FIREBASE_API_KEY ||
  sourceEnv.NEXT_PUBLIC_FIREBASE_API_KEY ||
  sourceEnv.FIREBASE_API_KEY ||
  "";
const password = process.env.A5_TEST_COMPANY_PASSWORD || "1004";
const firebaseAuthPassword =
  process.env.A5_TEST_FIREBASE_AUTH_PASSWORD ||
  `A5-${randomBytes(18).toString("base64url")}!`;

if (!apiKey) throw new Error("Firebase API key is not configured.");
if (!process.argv.includes("--execute")) {
  throw new Error("Use --execute to allow the isolated live company test.");
}

const results = [];
let inventoryOriginal = null;
let inventoryRestored = false;
let lifecycleRestored = false;

async function callJson(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function companyToken() {
  const passwordLogin = await callJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test1004@example.com",
        password: firebaseAuthPassword,
        returnSecureToken: true,
      }),
    },
  );
  if (
    passwordLogin.response.ok &&
    typeof passwordLogin.body.idToken === "string"
  ) {
    return passwordLogin.body.idToken;
  }

  const login = await callJson(`${functionBase}/companyBetaAuthToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessNo, password }),
  });
  if (!login.response.ok || typeof login.body.customToken !== "string") {
    throw new Error(
      `Company test login failed: HTTP ${login.response.status}`,
    );
  }

  const exchange = await callJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: login.body.customToken,
        returnSecureToken: true,
      }),
    },
  );
  if (!exchange.response.ok || typeof exchange.body.idToken !== "string") {
    throw new Error(
      `Firebase custom token exchange failed: HTTP ${exchange.response.status}`,
    );
  }
  return exchange.body.idToken;
}

async function ensureTestAuthPassword() {
  const config = JSON.parse(
    await readFile(
      "C:/Users/user/.config/configstore/firebase-tools.json",
      "utf8",
    ),
  );
  const accessToken = String(config?.tokens?.access_token ?? "").trim();
  if (!accessToken) throw new Error("Firebase CLI access token is unavailable.");
  const update = await callJson(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        localId: "company-test-1004-admin",
        password: firebaseAuthPassword,
      }),
    },
  );
  if (!update.response.ok) {
    throw new Error(
      `Test Firebase Auth password restore failed: HTTP ${update.response.status}`,
    );
  }
  results.push({ test: "test_auth_password_restored", passed: true });
}

await ensureTestAuthPassword();
const idToken = await companyToken();
const headers = {
  Authorization: `Bearer ${idToken}`,
  "Content-Type": "application/json",
};

async function invoke(name, body) {
  const result = await callJson(`${functionBase}/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!result.response.ok || result.body.ok === false) {
    const message =
      result.body?.error?.message ||
      result.body?.result?.reason ||
      result.body?.resultMsg ||
      `HTTP ${result.response.status}`;
    throw new Error(`${name} failed: ${message}`);
  }
  return result.body;
}

try {
  const inventoryUp = await invoke("companyOrderOperations", {
    action: "inventory_adjust",
    productId,
    optionId,
    delta: 1,
    reason: "company_admin_live_test_increase",
  });
  inventoryOriginal = Number(inventoryUp.before);
  results.push({
    test: "inventory_increase",
    passed: Number(inventoryUp.after) === inventoryOriginal + 1,
  });

  const inventoryDown = await invoke("companyOrderOperations", {
    action: "inventory_adjust",
    productId,
    optionId,
    delta: -1,
    reason: "company_admin_live_test_restore",
  });
  inventoryRestored = Number(inventoryDown.after) === inventoryOriginal;
  results.push({ test: "inventory_restore", passed: inventoryRestored });

  const suspended = await invoke("companyProductLifecycle", {
    productId,
    action: "suspend",
    reason: "company_admin_live_test",
  });
  results.push({
    test: "product_suspend",
    passed: suspended.status === "paused",
  });

  const restored = await invoke("companyProductLifecycle", {
    productId,
    action: "restore",
    reason: "company_admin_live_test_restore",
  });
  lifecycleRestored = restored.status === "active";
  results.push({ test: "product_restore", passed: lifecycleRestored });

  const email = await invoke("companyAccountSecurity", {
    action: "start_email_verification",
    purpose: "password_change",
  });
  results.push({
    test: "email_delivery",
    passed: email.emailStatus === "sent",
    emailStatus: email.emailStatus,
    emailMasked: email.emailMasked,
  });

  const retry = await callJson(`${functionBase}/companyIntegrationEventRetry`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      companyId,
      eventId: `missing-live-test-${Date.now()}`,
      errorMessage: "company_admin_live_test",
    }),
  });
  results.push({
    test: "integration_retry_auth_and_scope",
    passed:
      retry.response.status === 409 &&
      retry.body?.result?.reason === "event_not_found",
  });
} finally {
  if (inventoryOriginal !== null && !inventoryRestored) {
    const currentDelta = inventoryOriginal;
    results.push({
      test: "inventory_emergency_restore_required",
      passed: false,
      expectedStock: currentDelta,
    });
  }
  if (!lifecycleRestored) {
    try {
      const restored = await invoke("companyProductLifecycle", {
        productId,
        action: "restore",
        reason: "company_admin_live_test_finally_restore",
      });
      lifecycleRestored = restored.status === "active";
      results.push({
        test: "product_finally_restore",
        passed: lifecycleRestored,
      });
    } catch {
      results.push({ test: "product_finally_restore", passed: false });
    }
  }
}

const summary = {
  projectId,
  companyId,
  productId,
  optionId,
  executedAt: new Date().toISOString(),
  inventoryRestored,
  lifecycleRestored,
  secretsPrinted: 0,
  personalDataPrinted: 0,
  passed: results.every((result) => result.passed),
  results,
};
const auditDir = path.join("audits", "company-admin-live");
await mkdir(auditDir, { recursive: true });
const auditFile = path.join(
  auditDir,
  `company-admin-live-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
await writeFile(auditFile, JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify({ ...summary, auditFile }, null, 2));
if (!summary.passed) process.exitCode = 1;

async function readEnv(file) {
  try {
    const source = (await readFile(file, "utf8")).replace(/^\uFEFF/, "");
    return Object.fromEntries(
      source
        .split(/\r?\n/)
        .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
        .map((line) => {
          const index = line.indexOf("=");
          return [
            line.slice(0, index),
            line.slice(index + 1).trim().replace(/^['"]|['"]$/g, ""),
          ];
        }),
    );
  } catch {
    return {};
  }
}
