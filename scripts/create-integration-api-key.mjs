import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const args = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [key, ...rest] = item.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const companyId = String(args.companyId ?? args.company_id ?? "").trim();
const platformType = String(args.platformType ?? args.platform_type ?? "ALL").trim().toUpperCase();
const projectId = String(args.projectId ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "a5-closed-mall").trim();

if (!companyId) {
  console.error("Usage: node scripts/create-integration-api-key.mjs --companyId=company-test-1004 --platformType=ALL");
  process.exit(1);
}

const apiKey = `a5_live_${crypto.randomBytes(24).toString("base64url")}`;
const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
const keyId = `intkey_${companyId}_${Date.now().toString(36)}`;
const now = new Date().toISOString();

const record = {
  company_id: companyId,
  platform_type: platformType,
  key_hash: keyHash,
  status: "active",
  scopes: ["orders:read", "orders:status", "shipments:write", "products:read", "claims:read", "events:read", "events:write"],
  created_at: now,
  updated_at: now,
  source: "script_create_integration_api_key",
};

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: firestoreFields(value) } };
  }
  return { stringValue: String(value) };
}

function firestoreFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firestoreValue(value)]));
}

function firebaseToolsAuthModule() {
  const searchPaths = [process.cwd()];

  if (process.env.APPDATA) {
    searchPaths.push(`${process.env.APPDATA}\\npm\\node_modules`);
  }

  const modulePath = require.resolve("firebase-tools/lib/auth.js", { paths: searchPaths });
  return require(modulePath);
}

async function writeWithFirebaseAdmin() {
  const admin = require("../functions/node_modules/firebase-admin");

  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }

  await admin.firestore().collection("integration_api_keys").doc(keyId).set(record);
}

async function writeWithFirebaseCliRest() {
  const authModule = firebaseToolsAuthModule();
  const account =
    authModule.getProjectDefaultAccount?.(process.cwd()) ||
    authModule.getGlobalDefaultAccount?.() ||
    authModule.getAllAccounts?.()[0];

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }

  const tokenResult = await authModule.getAccessToken(account.tokens.refresh_token, [
    "email",
    "openid",
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  const accessToken = typeof tokenResult === "string" ? tokenResult : tokenResult?.access_token;

  if (!accessToken) {
    throw new Error("Firebase CLI access token could not be issued.");
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/${projectId}/databases/(default)/documents/integration_api_keys/${keyId}`,
              fields: firestoreFields(record),
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore REST commit failed: ${response.status} ${body}`);
  }
}

try {
  await writeWithFirebaseAdmin();
} catch (error) {
  if (args.adminOnly === "true") {
    throw error;
  }

  await writeWithFirebaseCliRest();
}

console.log(JSON.stringify({ projectId, keyId, companyId, platformType, apiKey }, null, 2));
