import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const projectId = readArg("--project") || readProjectId();
const companyId = readArg("--company") || process.env.A5_PAYUP_COMPANY_ID || "company-test-1004";
const apply = args.has("--apply") || process.env.A5_RUN_PAYUP_MIGRATION === "1";
const activate = args.has("--activate") || process.env.A5_ACTIVATE_PAYUP_MIGRATION === "1";
const prepareOnly = args.has("--prepare-only") || process.env.A5_PAYUP_PREPARE_ONLY === "1";
const environment = normalizeEnvironment(readArg("--environment") || process.env.PAYUP_ENVIRONMENT || process.env.PG_ENVIRONMENT || "test");
const payupApiBaseUrl =
  readArg("--api-base-url") ||
  process.env.PAYUP_API_BASE_URL ||
  process.env.PG_API_BASE_URL ||
  (environment === "production" ? "https://standard.payup.co.kr" : "https://standard.testpayup.co.kr");
const merchantId = firstText(
  readArg("--merchant-id"),
  process.env.A5_PAYUP_MERCHANT_ID,
  process.env.PAYUP_MERCHANT_ID,
  process.env.PG_MERCHANT_ID,
);
const apiCertKey = firstText(
  process.env.A5_PAYUP_API_KEY,
  process.env.PAYUP_API_KEY,
  process.env.A5_PAYUP_API_CERT_KEY,
  process.env.PAYUP_API_CERT_KEY,
  process.env.PG_SECRET_KEY,
);
const secretKeyRef = firstText(
  readArg("--secret-key-ref"),
  process.env.A5_PAYUP_SECRET_KEY_REF,
  process.env.PAYUP_SECRET_KEY_REF,
);
const encryptedSecret = encryptCredential(apiCertKey);
const canActivate = Boolean(merchantId && (encryptedSecret || secretKeyRef) && !prepareOnly);
const status = activate && canActivate ? "active" : merchantId ? "mid_issued" : "in_review";
const now = new Date().toISOString();

const before = {
  company: await readDocument(`companies/${companyId}`),
  companyPgCredentials: await readDocument(`company_pg_credentials/${companyId}`),
  payupSettings: await readDocument("pg_provider_settings/payup"),
  infinySettings: await readDocument("pg_provider_settings/infiny"),
  legacyInfinyRuntime: await readDocument("pg_gateway_settings/infiny-pg-runtime"),
};
const plan = buildPlan();
const blockers = [];

if (activate && !merchantId) blockers.push("Payup merchant id is required for activation.");
if (activate && !encryptedSecret && !secretKeyRef) blockers.push("Payup apiKey or secret key reference is required for activation.");
if (apiCertKey && !encryptedSecret) blockers.push("PG_CREDENTIAL_ENCRYPTION_KEY is required to encrypt Payup apiKey.");

console.log("[migrate:payup-provider] Payup provider migration");
console.log(`- project: ${projectId}`);
console.log(`- company: ${companyId}`);
console.log(`- apply: ${apply ? "yes" : "no"}`);
console.log(`- prepare only: ${prepareOnly ? "yes" : "no"}`);
console.log(`- requested activation: ${activate ? "yes" : "no"}`);
console.log(`- resulting status: ${status}`);
console.log(`- payup api base url: ${payupApiBaseUrl}`);
console.log(`- payup merchant id: ${mask(merchantId) || "missing"}`);
console.log(`- encrypted api key: ${encryptedSecret ? "yes" : "no"}`);
console.log(`- secret key ref: ${secretKeyRef ? "present" : "missing"}`);
console.log(`- current company provider: ${before.company?.pg_provider || "missing"}`);
console.log(`- current credential provider: ${before.companyPgCredentials?.provider || before.companyPgCredentials?.pg_provider || "missing"}`);

if (blockers.length) {
  for (const blocker of blockers) console.error(`- block: ${blocker}`);
  console.error("[migrate:payup-provider] FAILED. No Firestore writes were executed.");
  process.exit(1);
}

for (const item of plan) {
  console.log(`- plan: ${item.path}`);
}

if (!apply) {
  console.log("[migrate:payup-provider] DRY RUN. Add --apply or A5_RUN_PAYUP_MIGRATION=1 to write.");
  process.exit(0);
}

await commitWrites(plan);
console.log("[migrate:payup-provider] OK. Payup provider migration writes were applied.");

function buildPlan() {
  const companyName = firstText(before.company?.name, before.company?.company_name, before.company?.companyName, companyId);
  const credentialReady = status === "active";
  const encryptedFields = encryptedSecret ? { encrypted_secret_key: encryptedSecret } : {};
  const secretStoragePolicy = encryptedSecret
    ? "firebase_functions_encrypted_firestore_vault"
    : secretKeyRef
      ? "secret_manager_reference_only"
      : "pending_payup_secret";

  return [
    {
      path: "pg_provider_settings/payup",
      data: {
        provider: "payup",
        environment,
        mode: "payup_standard_api",
        status: status === "active" ? "active" : "draft",
        api_base_url: payupApiBaseUrl,
        apiBaseUrl: payupApiBaseUrl,
        payment_mode: "standard",
        checkout_mode: "standard_api",
        documented_endpoints: [
          { method: "POST", path: "/auth/v1/accessToken" },
          { method: "POST", path: "/api/v1/payment" },
          { method: "POST", path: "/api/v1/cancel" },
          { method: "POST", path: "/api/v1/partCancel" },
        ],
        raw_secret_stored: false,
        secret_storage_policy: secretStoragePolicy,
        updated_at: now,
        updated_by: "scripts/migrate-payup-provider.mjs",
      },
    },
    {
      path: `company_pg_credentials/${companyId}`,
      data: {
        company_id: companyId,
        company_name: companyName,
        provider: "payup",
        pg_provider: "payup",
        environment,
        mid: merchantId || null,
        merchant_id: merchantId || null,
        merchantId: merchantId || null,
        pg_merchant_id: merchantId || null,
        payup_mid: merchantId || null,
        infiny_mid: null,
        infiny_mid_status: "disabled",
        pg_module_key: null,
        infiny_module_key: null,
        merchant_serial_no: null,
        merchantSerialNo: null,
        module_key: null,
        moduleKey: null,
        terminal_id: null,
        terminalId: null,
        merchant_password_ref: null,
        sign_key_ref: null,
        webhook_secret_ref: null,
        merchant_id_masked: mask(merchantId) || "MID pending",
        secret_key_ref: secretKeyRef || null,
        secret_key_ref_masked: secretKeyRef ? mask(secretKeyRef) : "Secret pending",
        ...encryptedFields,
        credential_ready: credentialReady,
        credential_status: status,
        status,
        pg_profile: {
          provider: "payup",
          providerLabel: "Payup PG",
          merchantId: merchantId || null,
          merchantIdMasked: mask(merchantId) || "MID pending",
          secretKeyRefMasked: secretKeyRef ? mask(secretKeyRef) : "Secret pending",
          encryptedCredentialStored: Boolean(encryptedSecret),
          merchantStatus: status,
          credentialReady,
          taxationType: "taxable",
          taxFreeEnabled: false,
          adminManaged: true,
          companyEditable: false,
          settlementOwner: "payup",
          settlementExecutionBlocked: true,
        },
        raw_secret_stored: false,
        encrypted_secret_stored: Boolean(encryptedSecret),
        secret_storage_policy: secretStoragePolicy,
        taxation_type: "taxable",
        tax_type: "taxable",
        pg_taxation_type: "taxable",
        tax_free_enabled: false,
        is_tax_free_merchant: false,
        tax_free_amt: 0,
        duty_free_amt: 0,
        migrated_from_provider: firstText(before.companyPgCredentials?.provider, before.companyPgCredentials?.pg_provider, before.company?.pg_provider),
        migrated_at: now,
        updated_at: now,
      },
    },
    {
      path: `companies/${companyId}`,
      data: {
        company_id: companyId,
        name: companyName,
        pg_provider: "payup",
        mid: merchantId || null,
        merchantId: merchantId || null,
        merchant_id: merchantId || null,
        pg_merchant_id: merchantId || null,
        pg_module_key: null,
        pg_merchant_status: status,
        payup_mid: merchantId || null,
        payup_mid_status: status,
        infiny_mid: null,
        infiny_mid_status: "disabled",
        taxation_type: "taxable",
        tax_type: "taxable",
        pg_taxation_type: "taxable",
        tax_free_enabled: false,
        is_tax_free_merchant: false,
        tax_free_amt: 0,
        duty_free_amt: 0,
        pg_profile: {
          provider: "payup",
          providerLabel: "Payup PG",
          merchantId: merchantId || null,
          merchantIdMasked: mask(merchantId) || "MID pending",
          secretKeyRefMasked: secretKeyRef ? mask(secretKeyRef) : "Secret pending",
          encryptedCredentialStored: Boolean(encryptedSecret),
          merchantStatus: status,
          credentialReady,
          taxationType: "taxable",
          taxFreeEnabled: false,
          adminManaged: true,
          companyEditable: false,
          settlementOwner: "payup",
          settlementExecutionBlocked: true,
        },
        migrated_from_provider: firstText(before.company?.pg_provider, before.companyPgCredentials?.provider, before.companyPgCredentials?.pg_provider),
        migrated_at: now,
        updated_at: now,
      },
    },
    {
      path: "pg_provider_settings/infiny",
      data: {
        provider: "infiny",
        enabled: false,
        status: "disabled",
        disabled_reason: "A5 Payup provider migration",
        disabled_at: now,
        updated_at: now,
      },
    },
    {
      path: "pg_gateway_settings/infiny-pg-runtime",
      data: {
        provider: "infiny",
        enabled: false,
        status: "disabled",
        disabled_reason: "A5 Payup provider migration",
        disabled_at: now,
        updated_at: now,
      },
    },
    {
      path: `payment_audit_logs/payup-migration-${companyId}-${now.replace(/\D/g, "")}`,
      data: {
        actorType: "FIREBASE_CLI_MAINTENANCE",
        action: "payup_provider_migration",
        targetType: "company_pg_credentials",
        targetId: companyId,
        before: {
          company_provider: before.company?.pg_provider || null,
          credential_provider: before.companyPgCredentials?.provider || before.companyPgCredentials?.pg_provider || null,
        },
        after: {
          provider: "payup",
          status,
          merchant_id_masked: mask(merchantId) || "MID pending",
          encrypted_secret_stored: Boolean(encryptedSecret),
          legacy_infiny_disabled: true,
        },
        raw_secret_stored: false,
        createdAt: now,
        created_at: now,
        updated_at: now,
      },
    },
  ];
}

async function readDocument(path) {
  const token = await getFirebaseCliAccessToken();
  const response = await fetch(firestoreDocumentUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`${path} read failed: ${response.status} ${JSON.stringify(body)}`);
  return decodeFields(body.fields || {});
}

async function commitWrites(items) {
  const token = await getFirebaseCliAccessToken();
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      writes: items.map((item) => ({
        update: {
          name: `projects/${projectId}/databases/(default)/documents/${item.path}`,
          fields: encodeFields(item.data),
        },
        updateMask: {
          fieldPaths: Object.keys(item.data),
        },
      })),
    }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`Firestore commit failed: ${response.status} ${JSON.stringify(body)}`);
}

async function getFirebaseCliAccessToken() {
  const require = createRequire(import.meta.url);
  const firebaseToolsRoot = join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools");
  const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
  const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));
  const account = auth.getGlobalDefaultAccount();

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }

  const result = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  return result.access_token;
}

function encryptCredential(value) {
  const plainText = firstText(value);
  if (!plainText) return undefined;

  const rawKey = firstText(process.env.PG_CREDENTIAL_ENCRYPTION_KEY, process.env.A5_PG_CREDENTIAL_ENCRYPTION_KEY, process.env.PG_SECRET_KEY);
  if (!rawKey) return undefined;

  const masterKey = createHash("sha256").update(rawKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);

  return {
    version: "aes-256-gcm:v1",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function firestoreDocumentUrl(path) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
}

function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function readArg(name) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

function readProjectId() {
  try {
    const rc = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8"));
    return rc.projects?.default || "a5-closed-mall";
  } catch {
    return "a5-closed-mall";
  }
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeEnvironment(value) {
  return String(value || "").trim().toLowerCase() === "production" ? "production" : "test";
}

function mask(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 4) return "*".repeat(text.length);
  return `${text.slice(0, 3)}${"*".repeat(Math.max(text.length - 6, 4))}${text.slice(-3)}`;
}
