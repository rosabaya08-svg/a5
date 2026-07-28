import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const projectId = readProjectId();
const allowArchive = process.env.A5_ARCHIVE_E2E_ARTIFACTS === "1";
const explicitProductIds = String(process.env.A5_ARCHIVE_E2E_PRODUCT_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!allowArchive) {
  console.error("Refusing to archive live E2E artifacts without A5_ARCHIVE_E2E_ARTIFACTS=1.");
  process.exit(2);
}

const oauthToken = await getFirebaseCliAccessToken();
const productDocs =
  explicitProductIds.length > 0
    ? await readExplicitProducts(explicitProductIds)
    : (await queryFirestore("products", "status", "active")).filter((doc) => doc.id.startsWith("e2e-product-"));

const archived = [];
for (const product of productDocs) {
  assertE2eId(product.id, "e2e-product-", "productId");
  const productId = product.id;
  const nowIso = new Date().toISOString();
  const archiveFields = {
    status: "archived",
    visibility: "hidden",
    is_visible: false,
    live_write_e2e_archived: true,
    archived_at: nowIso,
    archived_reason: "manual_live_e2e_cleanup",
    updated_at: nowIso,
  };

  await patchFirestoreDocument("products", productId, {
    ...archiveFields,
    approval_status: "archived",
    product_approval_status: "archived",
  });

  const optionDocs = await queryFirestore("product_options", "product_id", productId);
  for (const option of optionDocs) {
    if (!option.id.startsWith(productId)) continue;
    await patchFirestoreDocument("product_options", option.id, archiveFields);
  }

  const detailDocs = await queryFirestore("product_detail_pages", "product_id", productId);
  for (const detail of detailDocs) {
    if (!detail.id.startsWith("e2e-product-draft-")) continue;
    await patchFirestoreDocument("product_detail_pages", detail.id, {
      ...archiveFields,
      approval_status: "archived",
    });
  }

  archived.push({
    productId,
    optionCount: optionDocs.length,
    detailCount: detailDocs.length,
  });
}

console.log(JSON.stringify({ ok: true, projectId, archivedCount: archived.length, archived }, null, 2));

async function readExplicitProducts(ids) {
  const docs = [];
  for (const id of ids) {
    assertE2eId(id, "e2e-product-", "productId");
    const doc = await getFirestoreDocument("products", id);
    if (doc.exists) docs.push(doc);
  }
  return docs;
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

  const token = await auth.getAccessToken(account.tokens.refresh_token, [
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
  ]);
  return token.access_token;
}

async function getFirestoreDocument(collection, id) {
  const response = await fetch(firestoreDocumentUrl(collection, id), {
    headers: { Authorization: `Bearer ${oauthToken}` },
  });

  if (response.status === 404) return { exists: false, id, fields: {} };

  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(`${collection}/${id} read failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  return {
    exists: true,
    id,
    name: body.name,
    fields: decodeFirestoreFields(body.fields || {}),
  };
}

async function queryFirestore(collection, fieldPath, equalsValue) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "EQUAL",
            value: encodeFirestoreValue(equalsValue),
          },
        },
      },
    }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(`${collection} query failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  return (Array.isArray(body) ? body : [])
    .filter((entry) => entry.document)
    .map((entry) => ({
      exists: true,
      id: String(entry.document.name || "").split("/").pop(),
      name: entry.document.name,
      fields: decodeFirestoreFields(entry.document.fields || {}),
    }));
}

async function patchFirestoreDocument(collection, id, data) {
  const query = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const response = await fetch(`${firestoreDocumentUrl(collection, id)}?${query}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(`${collection}/${id} patch failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function firestoreDocumentUrl(collection, id) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

function encodeFirestoreFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)]));
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function readProjectId() {
  try {
    const rc = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8"));
    return rc.projects?.default || "a5-closed-mall";
  } catch {
    return "a5-closed-mall";
  }
}

function assertE2eId(value, expectedPrefix, label) {
  const id = String(value || "");
  if (!id.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to archive non-E2E ${label}: ${id || "missing"}`);
  }
}
