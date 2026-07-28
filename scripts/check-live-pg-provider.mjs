import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const projectId = readArg("--project") || readProjectId();
const companyId = readArg("--company") || "company-test-1004";
const allowLegacy = args.has("--allow-legacy") || process.env.A5_ALLOW_LEGACY_LIVE_PG_CHECK === "1";
const requiredProvider = readArg("--required-provider") || "payup";

const token = await getFirebaseCliAccessToken();
const documents = {
  company: await readDocument(`companies/${companyId}`),
  companyPgCredentials: await readDocument(`company_pg_credentials/${companyId}`),
  payupSettings: await readDocument("pg_provider_settings/payup"),
  infinySettings: await readDocument("pg_provider_settings/infiny"),
  legacyInfinyRuntime: await readDocument("pg_gateway_settings/infiny-pg-runtime"),
};

const effective = resolveEffectivePgProfile(documents.company, documents.companyPgCredentials);
const blockers = [];
const warnings = [];

if (effective.provider !== requiredProvider) {
  blockers.push(`effective provider is ${effective.provider || "missing"}, expected ${requiredProvider}`);
}

if (!documents.payupSettings) {
  blockers.push("pg_provider_settings/payup is missing");
}

if (effective.provider === "payup") {
  if (!effective.merchantId) blockers.push(`${companyId} is missing Payup merchant id`);
  if (effective.merchantStatus !== "active") blockers.push(`${companyId} merchant status is ${effective.merchantStatus || "missing"}, expected active`);
  if (!effective.secretReady) blockers.push(`${companyId} is missing Payup secret key reference or encrypted secret`);
}

if (documents.infinySettings && !isDisabledLegacyDocument(documents.infinySettings)) warnings.push("pg_provider_settings/infiny still exists and is not disabled");
if (documents.legacyInfinyRuntime && !isDisabledLegacyDocument(documents.legacyInfinyRuntime)) {
  warnings.push("pg_gateway_settings/infiny-pg-runtime still exists and is not disabled");
}
if (documents.company?.pg_provider === "infiny") warnings.push(`${companyId} companies doc still has pg_provider=infiny`);
if (documents.companyPgCredentials?.pg_provider === "infiny" || documents.companyPgCredentials?.provider === "infiny") {
  warnings.push(`${companyId} company_pg_credentials doc still references infiny`);
}

console.log("[check:live-pg-provider] Live Firebase PG provider gate");
console.log(`- project: ${projectId}`);
console.log(`- company: ${companyId}`);
console.log(`- required provider: ${requiredProvider}`);
console.log(`- effective provider: ${effective.provider || "missing"}`);
console.log(`- merchant status: ${effective.merchantStatus || "missing"}`);
console.log(`- merchant id: ${mask(effective.merchantId) || "missing"}`);
console.log(`- secret ready: ${effective.secretReady ? "yes" : "no"}`);
console.log(`- payup settings: ${documents.payupSettings ? "present" : "missing"}`);
console.log(`- legacy infiny settings: ${legacyDocumentState(documents.infinySettings)}`);
console.log(`- legacy infiny runtime: ${legacyDocumentState(documents.legacyInfinyRuntime)}`);

for (const warning of warnings) {
  console.log(`- warn: ${warning}`);
}

if (blockers.length) {
  for (const blocker of blockers) {
    console.error(`- block: ${blocker}`);
  }

  if (!allowLegacy) {
    console.error("[check:live-pg-provider] FAILED. Live PG is not ready for Payup-only operation.");
    process.exit(1);
  }

  console.log("[check:live-pg-provider] WARN. Legacy provider mismatch allowed by --allow-legacy.");
} else {
  console.log("[check:live-pg-provider] OK. Live PG provider is Payup-ready for the checked company.");
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

async function getFirebaseCliAccessToken() {
  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.FIREBASE_TOOLS_ROOT,
    join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools"),
    join(process.env.LOCALAPPDATA ?? "", "npm-cache", "_npx", "7750544ccf494d8b", "node_modules", "firebase-tools"),
  ].filter(Boolean);
  const firebaseToolsRoot = candidates.find((candidate) => existsSync(join(candidate, "lib", "auth.js")));
  if (!firebaseToolsRoot) throw new Error("Firebase Tools runtime was not found.");
  const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
  const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));
  const account = auth.getGlobalDefaultAccount();

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }

  const result = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  return result.access_token;
}

async function readDocument(path) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;

  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(`${path} read failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return decodeFields(body.fields || {});
}

function resolveEffectivePgProfile(company, credential) {
  const data = { ...(company || {}), ...(credential || {}) };
  const pgProfile = asRecord(data.pg_profile || data.pgProfile);
  const provider = normalizeProvider(data.pg_provider || data.provider || pgProfile.provider || "payup");
  const merchantId = provider === "payup"
    ? firstText(
        data.mid,
        data.payup_mid,
        data.merchant_id,
        data.merchantId,
        data.pg_merchant_id,
        pgProfile.mid,
        pgProfile.payup_mid,
        pgProfile.merchant_id,
        pgProfile.merchantId,
        pgProfile.pg_merchant_id,
      )
    : firstText(
        data.mid,
        data.infiny_mid,
        data.pg_merchant_id,
        data.merchant_id,
        data.merchantId,
        pgProfile.mid,
        pgProfile.infiny_mid,
        pgProfile.pg_merchant_id,
        pgProfile.merchant_id,
        pgProfile.merchantId,
      );
  const merchantStatus = firstText(
    data.credential_status,
    data.infiny_mid_status,
    data.pg_merchant_status,
    data.merchantStatus,
    pgProfile.merchantStatus,
  );
  const secretReady = Boolean(
    firstText(data.secret_key_ref, data.secretKeyRef, pgProfile.secretKeyRef) ||
      hasEncryptedCredential(data.encrypted_secret_key) ||
      hasEncryptedCredential(pgProfile.encrypted_secret_key),
  );

  return { provider, merchantId, merchantStatus, secretReady };
}

function normalizeProvider(value) {
  const provider = firstText(value).toLowerCase();
  if (provider === "pg_contract") return "payup";
  return provider;
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function hasEncryptedCredential(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value.version === "aes-256-gcm:v1" &&
      typeof value.iv === "string" &&
      typeof value.authTag === "string" &&
      typeof value.ciphertext === "string",
  );
}

function isDisabledLegacyDocument(document) {
  return document?.enabled === false || firstText(document?.status).toLowerCase() === "disabled";
}

function legacyDocumentState(document) {
  if (!document) return "missing";
  return isDisabledLegacyDocument(document) ? "disabled" : "present";
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

function mask(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 4) return "*".repeat(text.length);
  return `${text.slice(0, 3)}${"*".repeat(Math.max(text.length - 6, 4))}${text.slice(-3)}`;
}
