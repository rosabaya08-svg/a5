import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const firebaseToolsRoot = join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools");
const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "a5-closed-mall";
const origin = trimSlash(process.env.A5_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_A5_PUBLIC_ORIGIN || "https://signage-ai-a5.co.kr");
const allowWrites = process.env.A5_BACKFILL_PRODUCT_BUSINESS_URLS === "1";
const nowIso = new Date().toISOString();
const oauthToken = await getFirebaseCliAccessToken();

const products = await listCollection("products");
const candidates = products
  .map((doc) => {
    if (isArchivedProduct(doc.data)) return null;
    const businessNo = resolveBusinessNo(doc.id, doc.data);
    if (!businessNo) return null;
    const expected = buildUrlFields(doc.id, businessNo);
    const patch = {};

    for (const [key, value] of Object.entries(expected)) {
      if (doc.data[key] !== value) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) return null;

    return {
      id: doc.id,
      businessNo,
      status: doc.data.status ?? doc.data.approval_status ?? "",
      patch: {
        ...patch,
        url_backfilled_at: nowIso,
        updated_at: nowIso,
      },
    };
  })
  .filter(Boolean);

console.log(
  JSON.stringify(
    {
      projectId,
      origin,
      mode: allowWrites ? "write" : "dry-run",
      scanned: products.length,
      updateCandidates: candidates.length,
      candidates: candidates.map((item) => ({
        id: item.id,
        businessNo: item.businessNo,
        status: item.status,
        business_brand_path: item.patch.business_brand_path,
        business_product_path: item.patch.business_product_path,
      })),
    },
    null,
    2,
  ),
);

if (!allowWrites) {
  console.log("Dry run only. Set A5_BACKFILL_PRODUCT_BUSINESS_URLS=1 to write Firestore changes.");
} else {
  for (const candidate of candidates) {
    await patchFirestoreDocument("products", candidate.id, candidate.patch);
    console.log(`[updated] products/${candidate.id}`);
  }

  console.log(`Done. Updated ${candidates.length} product documents.`);
}

function resolveBusinessNo(productId, data) {
  const direct = normalizeBusinessNo(
    data.sellerBusinessNoNormalized ??
      data.seller_business_no_normalized ??
      data.sellerBusinessNo ??
      data.seller_business_no ??
      data.companyBusinessNoNormalized ??
      data.company_business_no_normalized ??
      data.companyBusinessNo ??
      data.company_business_no ??
      data.business_registration_number_normalized ??
      data.business_registration_number,
  );

  if (direct) return direct;
  if (productId === "product-test-1004") return "7592901311";
  return "";
}

function isArchivedProduct(data) {
  const status = String(data.status ?? data.approval_status ?? data.visibility ?? "").toLowerCase();
  return ["archived", "deleted", "removed"].includes(status);
}

function buildUrlFields(productId, businessNo) {
  const encodedProductId = encodeURIComponent(productId);
  const encodedBusinessNo = encodeURIComponent(businessNo);
  const tabletPath = `/tablet/products/${encodedProductId}/`;
  const mobilePath = `/m/shop/product/${encodedProductId}/`;
  const businessBrandPath = `/a5mall/${encodedBusinessNo}/`;
  const businessProductPath = `/a5mall/${encodedBusinessNo}/${encodedProductId}/`;

  return {
    public_path: tabletPath,
    tablet_path: tabletPath,
    mobile_path: mobilePath,
    canonical_url: `${origin}${tabletPath}`,
    product_url: `${origin}${tabletPath}`,
    ad_target_path: tabletPath,
    mobile_ad_target_path: mobilePath,
    business_brand_path: businessBrandPath,
    businessBrandPath: businessBrandPath,
    business_product_path: businessProductPath,
    businessProductPath: businessProductPath,
    business_brand_url: `${origin}${businessBrandPath}`,
    businessBrandUrl: `${origin}${businessBrandPath}`,
    business_product_url: `${origin}${businessProductPath}`,
    businessProductUrl: `${origin}${businessProductPath}`,
    a5mall_brand_path: businessBrandPath,
    a5mall_product_path: businessProductPath,
    url_version: 2,
  };
}

async function getFirebaseCliAccessToken() {
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }
  const token = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  return token.access_token;
}

async function listCollection(collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=1000`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${oauthToken}` },
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`${collection} list failed: ${response.status} ${JSON.stringify(body).slice(0, 500)}`);

  return (body.documents || []).map((doc) => ({
    id: String(doc.name || "").split("/").pop(),
    name: doc.name,
    data: decodeFirestoreFields(doc.fields || {}),
  }));
}

async function patchFirestoreDocument(collection, id, data) {
  const query = Object.keys(data).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const response = await fetch(`${firestoreDocumentUrl(collection, id)}?${query}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });

  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`${collection}/${id} patch failed: ${response.status} ${JSON.stringify(body).slice(0, 500)}`);
  return body;
}

function firestoreDocumentUrl(collection, id) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`;
}

function encodeFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = encodeFirestoreValue(value);
  }
  return fields;
}

function encodeFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function decodeFirestoreFields(fields) {
  const data = {};
  for (const [key, value] of Object.entries(fields)) {
    data[key] = decodeFirestoreValue(value);
  }
  return data;
}

function decodeFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function normalizeBusinessNo(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}
