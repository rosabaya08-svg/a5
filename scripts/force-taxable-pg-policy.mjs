import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const firebaseToolsRoot = join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools");
const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));

const taxableMerchantPolicy = {
  taxation_type: "taxable",
  tax_type: "taxable",
  pg_taxation_type: "taxable",
  tax_free_enabled: false,
  is_tax_free_merchant: false,
  tax_free_amt: 0,
  duty_free_amt: 0,
  updated_at: new Date().toISOString(),
};
const test1004CompanyId = "company-test-1004";
const test1004BusinessNo = "7592901311";
const innopayWebviewSampleMid = "testpay01m";

function test1004MidPatch() {
  return {
    mid: innopayWebviewSampleMid,
    merchantId: innopayWebviewSampleMid,
    pgMerchantId: innopayWebviewSampleMid,
    pg_merchant_id: innopayWebviewSampleMid,
    infiny_mid: innopayWebviewSampleMid,
    pg_profile: {
      provider: "infiny",
      providerLabel: "InnoPay PG",
      merchantId: innopayWebviewSampleMid,
      merchantStatus: "active",
      taxationType: "taxable",
      taxFreeEnabled: false,
      adminManaged: true,
      companyEditable: false,
      settlementOwner: "infiny",
      settlementExecutionBlocked: true,
    },
  };
}

function projectIdFromRc() {
  try {
    const rc = JSON.parse(readFileSync(".firebaserc", "utf8"));
    return rc.projects?.default ?? "a5-closed-mall";
  } catch {
    return "a5-closed-mall";
  }
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  }
  return { stringValue: String(value) };
}

function firestoreFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firestoreValue(value)]));
}

async function getToken() {
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }
  const token = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  return token.access_token;
}

async function listDocuments(projectId, token, collection) {
  const result = [];
  let pageToken = "";

  do {
    const url =
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}` +
      `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`${collection} list failed: ${response.status} ${JSON.stringify(body)}`);
    }
    result.push(...(Array.isArray(body.documents) ? body.documents : []));
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);

  return result;
}

async function patchDocument(projectId, token, collection, id, data) {
  const query = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/` +
    `${encodeURIComponent(collection)}/${encodeURIComponent(id)}?${query}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields(data) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${collection}/${id} patch failed: ${response.status} ${body}`);
  }
}

function documentId(documentName) {
  return String(documentName ?? "").split("/").pop();
}

function stringValue(fields, key) {
  return fields?.[key]?.stringValue ?? "";
}

function shouldPatchCompany(document) {
  const fields = document.fields ?? {};
  const provider = stringValue(fields, "pg_provider") || stringValue(fields, "provider");
  const status = stringValue(fields, "status") || stringValue(fields, "approval_status");
  return provider === "infiny" || status === "approved" || status === "active";
}

function isTest1004Document(collection, id, document) {
  const fields = document.fields ?? {};
  return (
    id === test1004CompanyId ||
    stringValue(fields, "company_id") === test1004CompanyId ||
    stringValue(fields, "companyId") === test1004CompanyId ||
    stringValue(fields, "approvedCompanyId") === test1004CompanyId ||
    stringValue(fields, "approved_company_id") === test1004CompanyId ||
    stringValue(fields, "businessRegistrationNumber") === test1004BusinessNo ||
    stringValue(fields, "business_registration_number") === test1004BusinessNo ||
    stringValue(fields, "business_registration_no") === test1004BusinessNo ||
    (collection === "company_pg_credentials" && id === test1004CompanyId)
  );
}

const projectId = projectIdFromRc();
const token = await getToken();
const collections = ["companies", "company_pg_credentials", "company_signup_requests"];
const patched = [];

for (const collection of collections) {
  const docs = await listDocuments(projectId, token, collection);
  for (const doc of docs) {
    const id = documentId(doc.name);
    if (!id) continue;
    if (collection === "companies" && !shouldPatchCompany(doc)) continue;
    const patchData = {
      ...taxableMerchantPolicy,
      ...(isTest1004Document(collection, id, doc) ? test1004MidPatch() : {}),
    };
    await patchDocument(projectId, token, collection, id, patchData);
    patched.push(`${collection}/${id}`);
  }
}

console.log(JSON.stringify({ ok: true, projectId, patchedCount: patched.length, patched }, null, 2));
