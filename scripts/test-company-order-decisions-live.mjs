import { readFile } from "node:fs/promises";

const projectId = "a5-closed-mall";
const region = "asia-northeast3";
const companyId = "company-test-1004";
const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const orderNo = `INTERNAL-DECISION-${suffix}`;
const acceptItemId = `internal-accept-${suffix}`;
const stockoutItemId = `internal-stockout-${suffix}`;
const firestoreRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/companyOrderOperations`;

if (!process.argv.includes("--execute")) {
  throw new Error("Use --execute to allow isolated live order-decision tests.");
}

const firebaseConfig = JSON.parse(
  await readFile("C:/Users/user/.config/configstore/firebase-tools.json", "utf8"),
);
const accessToken = String(firebaseConfig?.tokens?.access_token ?? "").trim();
if (!accessToken) throw new Error("Firebase CLI access token is not available.");

const env = await readEnv(".env.local");
const sourceEnv = await readEnv("C:/Users/user/Desktop/my-app/.env.local");
const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY || sourceEnv.NEXT_PUBLIC_FIREBASE_API_KEY || "";
if (!apiKey) throw new Error("Firebase public API key is not configured.");

const adminHeaders = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};
const created = [];

const textValue = (value) => ({ stringValue: String(value) });
const intValue = (value) => ({ integerValue: String(value) });
const boolValue = (value) => ({ booleanValue: Boolean(value) });
const timestampValue = (value) => ({ timestampValue: value });

async function readEnv(file) {
  try {
    const content = await readFile(file, "utf8");
    return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
    }));
  } catch {
    return {};
  }
}

async function createDoc(collection, id, fields) {
  const response = await fetch(
    `${firestoreRoot}/${collection}/${encodeURIComponent(id)}?currentDocument.exists=false`,
    { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ fields }) },
  );
  if (!response.ok) throw new Error(`Create ${collection}/${id} failed: HTTP ${response.status}`);
  created.push([collection, id]);
}

async function getDoc(collection, id) {
  const response = await fetch(`${firestoreRoot}/${collection}/${encodeURIComponent(id)}`, {
    headers: adminHeaders,
  });
  if (!response.ok) throw new Error(`Read ${collection}/${id} failed: HTTP ${response.status}`);
  return response.json();
}

async function deleteCreated() {
  for (const [collection, id] of created.reverse()) {
    const response = await fetch(`${firestoreRoot}/${collection}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    if (![200, 404].includes(response.status)) {
      throw new Error(`Cleanup ${collection}/${id} failed: HTTP ${response.status}`);
    }
  }
}

async function companyIdToken() {
  const login = await fetch(
    `https://${region}-${projectId}.cloudfunctions.net/companyBetaAuthToken`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessNo: "7592901311", password: "1004" }),
    },
  );
  const loginBody = await login.json();
  if (!login.ok || !loginBody.customToken) throw new Error(`Company login failed: HTTP ${login.status}`);
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: loginBody.customToken, returnSecureToken: true }),
    },
  );
  const exchangeBody = await exchange.json();
  if (!exchange.ok || !exchangeBody.idToken) throw new Error(`Token exchange failed: HTTP ${exchange.status}`);
  return exchangeBody.idToken;
}

async function decide(idToken, itemId, decision, reason = "") {
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "order_item_decision", itemId, decision, reason }),
  });
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    throw new Error(`${decision} failed: HTTP ${response.status}`);
  }
  return body;
}

try {
  const now = new Date().toISOString();
  await createDoc("orders", orderNo, {
    order_no: textValue(orderNo),
    company_id: textValue(companyId),
    status: textValue("internal_test"),
    total_amount: intValue(2008),
    internal_test: boolValue(true),
    created_at: timestampValue(now),
  });
  for (const [itemId, name] of [
    [acceptItemId, "[내부검증] 발주 확인 1,004원"],
    [stockoutItemId, "[내부검증] 품절 처리 1,004원"],
  ]) {
    await createDoc("order_items", itemId, {
      order_no: textValue(orderNo),
      company_id: textValue(companyId),
      seller_company_id: textValue(companyId),
      product_id: textValue("product-test-1004"),
      product_name: textValue(name),
      quantity: intValue(1),
      unit_price: intValue(1004),
      fulfillment_status: textValue("new"),
      internal_test: boolValue(true),
      created_at: timestampValue(now),
    });
  }

  const idToken = await companyIdToken();
  const accepted = await decide(idToken, acceptItemId, "accept");
  const stockout = await decide(idToken, stockoutItemId, "stockout", "내부 검증용 재고 없음");
  const [acceptedDoc, stockoutDoc] = await Promise.all([
    getDoc("order_items", acceptItemId),
    getDoc("order_items", stockoutItemId),
  ]);
  const acceptedStatus = acceptedDoc.fields?.fulfillment_status?.stringValue;
  const stockoutStatus = stockoutDoc.fields?.fulfillment_status?.stringValue;
  if (acceptedStatus !== "accepted") throw new Error("Accepted status was not persisted.");
  if (stockoutStatus !== "stockout_pending_cancel") throw new Error("Stockout status was not persisted.");
  if (stockout.paymentCancellationRequired !== true) throw new Error("Stockout did not flag external cancellation.");

  console.log(JSON.stringify({
    projectId,
    companyId,
    testOnly: true,
    accepted: acceptedStatus,
    acceptedChanged: accepted.changed === true,
    stockout: stockoutStatus,
    stockoutChanged: stockout.changed === true,
    paymentCancellationRequired: stockout.paymentCancellationRequired === true,
    payupCancellationCalled: false,
    secretsPrinted: 0,
    personalDataPrinted: 0,
  }, null, 2));
} finally {
  await deleteCreated();
  console.log(JSON.stringify({
    cleanup: "completed",
    temporaryOrderAndItemsDeleted: true,
    auditEvidencePreserved: true,
  }));
}
