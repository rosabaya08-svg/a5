import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectId = "a5-closed-mall";
const token = String(process.env.FIRESTORE_ACCESS_TOKEN || "").trim();
const execute = process.argv.includes("--execute");
const root = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const auditDir = path.resolve(scriptDir, "..", "..", "order-seller-backfill-audit");
const backupPath = path.join(auditDir, `backup-${runId}.json`);

if (!token) throw new Error("FIRESTORE_ACCESS_TOKEN is required.");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

function documentId(document) {
  return String(document?.name || "").split("/").at(-1) || "";
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return null;
}

function encodeValue(value) {
  if (value === undefined || value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encodeValue(child)])),
      },
    };
  }
  return { stringValue: String(value) };
}

function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
}

function text(value) {
  const result = String(value ?? "").trim();
  return result && !/^[-?]+$/.test(result) ? result : "";
}

function pick(data, keys) {
  for (const key of keys) {
    const value = text(data?.[key]);
    if (value) return value;
  }
  return "";
}

function companyIdOf(item) {
  return pick(item, ["company_id", "companyId", "seller_company_id"]);
}

function orderNoOf(item) {
  return pick(item, ["order_no", "orderNo", "order_id"]);
}

function contactFromCompany(companyId, data) {
  const companyName = pick(data, ["company_name", "companyName", "name", "business_name", "businessName"]);
  const businessNo = pick(data, [
    "business_registration_number",
    "businessRegistrationNumber",
    "business_no",
    "businessNo",
  ]).replace(/\D/g, "");
  const representativeName = pick(data, ["representative_name", "representativeName", "ceo_name", "ceoName"]);
  const customerServicePhone = pick(data, [
    "public_contact_phone",
    "publicContactPhone",
    "customer_service_phone",
    "customerServicePhone",
    "cs_phone",
    "csPhone",
    "contact_phone",
    "contactPhone",
  ]);
  const publicEmail = pick(data, ["public_email", "publicEmail", "customer_service_email", "customerServiceEmail"]);
  const ecommerceLicenseNo = pick(data, [
    "ecommerce_license_no",
    "ecommerceLicenseNo",
    "mail_order_business_number",
    "mailOrderBusinessNumber",
  ]);
  const returnAddress = pick(data, ["return_address", "returnAddress"]);
  return {
    companyId,
    companyName,
    businessNo,
    representativeName,
    customerServicePhone,
    publicEmail,
    ecommerceLicenseNo,
    returnAddress,
    verified: Boolean(companyName && businessNo && customerServicePhone),
  };
}

function contactDocument(contact) {
  return {
    company_id: contact.companyId,
    company_name: contact.companyName || null,
    business_no: contact.businessNo || null,
    representative_name: contact.representativeName || null,
    customer_service_phone: contact.customerServicePhone || null,
    public_email: contact.publicEmail || null,
    ecommerce_license_no: contact.ecommerceLicenseNo || null,
    return_address: contact.returnAddress || null,
    verified: contact.verified,
  };
}

function needsBackfill(item) {
  return !(
    text(item.seller_company_name)
    && text(item.seller_business_no)
    && text(item.seller_customer_service_phone)
    && item.seller_contact_verified === true
  );
}

async function queryAll(collectionId, limit = 5000) {
  const response = await fetch(queryUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        limit,
      },
    }),
  });
  if (!response.ok) throw new Error(`Query ${collectionId} failed: HTTP ${response.status}`);
  return (await response.json()).filter((entry) => entry.document).map((entry) => entry.document);
}

async function getDoc(collection, id) {
  const response = await fetch(`${root}/${collection}/${encodeURIComponent(id)}`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Read ${collection}/${id} failed: HTTP ${response.status}`);
  return response.json();
}

async function patchFields(collection, id, data) {
  const mask = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const response = await fetch(`${root}/${collection}/${encodeURIComponent(id)}?${mask}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!response.ok) throw new Error(`Patch ${collection}/${id} failed: HTTP ${response.status}`);
}

async function createAudit(id, data) {
  const response = await fetch(
    `${root}/audit_logs/${encodeURIComponent(id)}?currentDocument.exists=false`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: encodeFields(data) }),
    },
  );
  if (![200, 409].includes(response.status)) {
    throw new Error(`Create audit ${id} failed: HTTP ${response.status}`);
  }
}

const rawItems = await queryAll("order_items");
const decodedItems = rawItems.map((document) => ({
  document,
  id: documentId(document),
  data: decodeFields(document.fields),
})).filter((item) => item.id && orderNoOf(item.data) && companyIdOf(item.data));

const candidateItems = decodedItems.filter((item) => needsBackfill(item.data));
const companyIds = [...new Set(candidateItems.map((item) => companyIdOf(item.data)))];
const companyDocuments = new Map();
for (const companyId of companyIds) {
  const document = await getDoc("companies", companyId);
  if (document) companyDocuments.set(companyId, document);
}

const contacts = new Map(
  [...companyDocuments.entries()].map(([companyId, document]) => [
    companyId,
    contactFromCompany(companyId, decodeFields(document.fields)),
  ]),
);
const eligibleItems = candidateItems.filter((item) => contacts.get(companyIdOf(item.data))?.verified === true);
const skippedItems = candidateItems.filter((item) => contacts.get(companyIdOf(item.data))?.verified !== true);
const affectedOrderNos = [...new Set(eligibleItems.map((item) => orderNoOf(item.data)))];
const orderDocuments = new Map();
for (const orderNo of affectedOrderNos) {
  const document = await getDoc("orders", orderNo);
  if (document) orderDocuments.set(orderNo, document);
}

await fs.mkdir(auditDir, { recursive: true });
await fs.writeFile(backupPath, JSON.stringify({
  projectId,
  runId,
  mode: execute ? "BEFORE_EXECUTE" : "DRY_RUN",
  affectedOrderItems: eligibleItems.map((item) => item.document),
  affectedOrders: [...orderDocuments.values()],
  sourceCompanies: [...companyDocuments.values()],
}, null, 2), "utf8");

if (!execute) {
  console.log(JSON.stringify({
    projectId,
    mode: "DRY_RUN",
    totalOrderItems: decodedItems.length,
    missingSnapshotItems: candidateItems.length,
    eligibleVerifiedItems: eligibleItems.length,
    skippedUnverifiedItems: skippedItems.length,
    affectedOrders: affectedOrderNos.length,
    verifiedCompanies: [...contacts.values()].filter((contact) => contact.verified).length,
    backupPath,
    writes: 0,
    secretsPrinted: 0,
    personalDataPrinted: 0,
  }, null, 2));
  process.exit(0);
}

const now = new Date().toISOString();
let itemWrites = 0;
let orderWrites = 0;
let auditWrites = 0;

for (const item of eligibleItems) {
  const companyId = companyIdOf(item.data);
  const contact = contacts.get(companyId);
  await patchFields("order_items", item.id, {
    seller_company_id: companyId,
    seller_company_name: contact.companyName,
    seller_business_no: contact.businessNo,
    seller_business_no_normalized: contact.businessNo,
    seller_representative_name: contact.representativeName || null,
    seller_customer_service_phone: contact.customerServicePhone,
    seller_public_email: contact.publicEmail || null,
    seller_ecommerce_license_no: contact.ecommerceLicenseNo || null,
    seller_return_address: contact.returnAddress || null,
    seller_contact_verified: true,
    seller_contact_snapshot: contactDocument(contact),
    seller_contact_snapshot_version: 1,
    seller_contact_snapshot_updated_at: now,
    updated_at: now,
  });
  itemWrites += 1;
  await createAudit(`order-seller-backfill-item-${runId}-${item.id}`, {
    action: "order_item_seller_contact_snapshot_backfilled",
    target: item.id,
    order_no: orderNoOf(item.data),
    company_id: companyId,
    contact_verified: true,
    source: "verified_company_document",
    run_id: runId,
    created_at: now,
  });
  auditWrites += 1;
}

for (const orderNo of affectedOrderNos) {
  const orderDocument = orderDocuments.get(orderNo);
  if (!orderDocument) continue;
  const orderData = decodeFields(orderDocument.fields);
  const orderItems = decodedItems.filter((item) => orderNoOf(item.data) === orderNo);
  const orderContacts = [
    ...new Set(orderItems.map((item) => companyIdOf(item.data))),
  ].map((companyId) => contacts.get(companyId)).filter((contact) => contact?.verified);
  if (!orderContacts.length) continue;

  const itemsSnapshot = Array.isArray(orderData.items_snapshot)
    ? orderData.items_snapshot.map((snapshot) => {
        const companyId = companyIdOf(snapshot);
        const contact = contacts.get(companyId);
        return contact?.verified
          ? {
              ...snapshot,
              seller_company_id: companyId,
              seller_company_name: contact.companyName,
              seller_business_no: contact.businessNo,
              seller_representative_name: contact.representativeName || null,
              seller_customer_service_phone: contact.customerServicePhone,
              seller_public_email: contact.publicEmail || null,
              seller_return_address: contact.returnAddress || null,
            }
          : snapshot;
      })
    : [];

  await patchFields("orders", orderNo, {
    items_snapshot: itemsSnapshot,
    seller_contacts_snapshot: orderContacts.map(contactDocument),
    seller_contact_snapshot_version: 1,
    seller_contact_snapshot_updated_at: now,
    updated_at: now,
  });
  orderWrites += 1;
  await createAudit(`order-seller-backfill-order-${runId}-${orderNo}`, {
    action: "order_seller_contact_snapshot_backfilled",
    target: orderNo,
    company_ids: orderContacts.map((contact) => contact.companyId),
    contact_count: orderContacts.length,
    source: "verified_company_document",
    run_id: runId,
    created_at: now,
  });
  auditWrites += 1;
}

let verifiedItems = 0;
for (const item of eligibleItems) {
  const document = await getDoc("order_items", item.id);
  const data = decodeFields(document?.fields);
  if (
    text(data.seller_company_name)
    && text(data.seller_business_no)
    && text(data.seller_customer_service_phone)
    && data.seller_contact_verified === true
  ) {
    verifiedItems += 1;
  }
}

console.log(JSON.stringify({
  projectId,
  mode: "EXECUTED",
  backupPath,
  totalOrderItems: decodedItems.length,
  missingSnapshotItemsBefore: candidateItems.length,
  eligibleVerifiedItems: eligibleItems.length,
  skippedUnverifiedItems: skippedItems.length,
  itemWrites,
  orderWrites,
  auditWrites,
  verifiedItemsAfter: verifiedItems,
  verificationPassed: verifiedItems === eligibleItems.length,
  secretsPrinted: 0,
  personalDataPrinted: 0,
}, null, 2));

if (verifiedItems !== eligibleItems.length) process.exitCode = 2;
