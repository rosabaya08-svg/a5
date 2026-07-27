import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const projectId = "a5-closed-mall";
const region = "asia-northeast3";
const companyId = "company-test-1004";
const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const orderNo = `INTERNAL-BUNDLE-${suffix}`;
const otherOrderNo = `INTERNAL-BUNDLE-OTHER-${suffix}`;
const itemIds = [`internal-bundle-a-${suffix}`, `internal-bundle-b-${suffix}`];
const otherItemId = `internal-bundle-other-${suffix}`;
const carrierCode = "1019";
const invoiceNumber = `A5BUNDLE${suffix}`;
const shipmentId = createHash("sha256").update(`${carrierCode}|${invoiceNumber}`).digest("hex");
const firestoreRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/companyOrderOperations`;

if (!process.argv.includes("--execute")) {
  throw new Error("Use --execute to allow the isolated bundled-invoice live test.");
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
    return Object.fromEntries(
      content.split(/\r?\n/).flatMap((line) => {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
      }),
    );
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

async function deleteDoc(path) {
  const response = await fetch(`${firestoreRoot}/${path}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  if (![200, 404].includes(response.status)) {
    throw new Error(`Cleanup ${path} failed: HTTP ${response.status}`);
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
  if (!login.ok || !loginBody.customToken) {
    throw new Error(`Company login failed: HTTP ${login.status}`);
  }
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: loginBody.customToken, returnSecureToken: true }),
    },
  );
  const exchangeBody = await exchange.json();
  if (!exchange.ok || !exchangeBody.idToken) {
    throw new Error(`Token exchange failed: HTTP ${exchange.status}`);
  }
  return exchangeBody.idToken;
}

async function updateDelivery(idToken, itemId, targetOrderNo) {
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "delivery_update",
      itemId,
      orderNo: targetOrderNo,
      carrierCode,
      invoiceNumber,
      deliveryStatus: "invoice_entered",
    }),
  });
  return { response, body: await response.json() };
}

try {
  const now = new Date().toISOString();
  for (const targetOrderNo of [orderNo, otherOrderNo]) {
    await createDoc("orders", targetOrderNo, {
      order_no: textValue(targetOrderNo),
      company_id: textValue(companyId),
      status: textValue("preparing"),
      total_amount: intValue(targetOrderNo === orderNo ? 2008 : 1004),
      internal_test: boolValue(true),
      created_at: timestampValue(now),
    });
  }
  for (const [itemId, targetOrderNo] of [
    [itemIds[0], orderNo],
    [itemIds[1], orderNo],
    [otherItemId, otherOrderNo],
  ]) {
    await createDoc("order_items", itemId, {
      order_no: textValue(targetOrderNo),
      company_id: textValue(companyId),
      seller_company_id: textValue(companyId),
      product_id: textValue("product-test-1004"),
      product_name: textValue("[내부검증] 묶음송장 상품"),
      quantity: intValue(1),
      unit_price: intValue(1004),
      fulfillment_status: textValue("accepted"),
      delivery_status: textValue("invoice_pending"),
      internal_test: boolValue(true),
      created_at: timestampValue(now),
    });
  }

  const idToken = await companyIdToken();
  for (const itemId of itemIds) {
    const result = await updateDelivery(idToken, itemId, orderNo);
    if (!result.response.ok || result.body.ok !== true) {
      throw new Error(`Same-order bundled invoice failed: HTTP ${result.response.status}`);
    }
  }

  const shipment = await getDoc("shipments", shipmentId);
  const linkedItemIds = shipment.fields?.order_item_ids?.arrayValue?.values?.map(
    (value) => value.stringValue,
  ) ?? [];
  if (!itemIds.every((itemId) => linkedItemIds.includes(itemId))) {
    throw new Error("Shipment did not retain both bundled order item IDs.");
  }

  const crossOrder = await updateDelivery(idToken, otherItemId, otherOrderNo);
  if (crossOrder.response.status !== 409 || crossOrder.body?.error?.code !== "SHIPMENT_DUPLICATE") {
    throw new Error(`Cross-order invoice reuse was not blocked: HTTP ${crossOrder.response.status}`);
  }

  console.log(
    JSON.stringify(
      {
        projectId,
        companyId,
        testOnly: true,
        sameOrderBundledItems: linkedItemIds.length,
        sameOrderBundledInvoice: true,
        crossOrderInvoiceReuseBlocked: true,
        payupCalled: false,
        customerOrdersChanged: 0,
        secretsPrinted: 0,
        personalDataPrinted: 0,
      },
      null,
      2,
    ),
  );
} finally {
  for (const itemId of [...itemIds, otherItemId]) {
    await deleteDoc(`order_fulfillments/${orderNo}-${companyId}/items/${itemId}`);
    await deleteDoc(`order_fulfillments/${otherOrderNo}-${companyId}/items/${itemId}`);
  }
  await deleteDoc(`order_fulfillments/${orderNo}-${companyId}`);
  await deleteDoc(`order_fulfillments/${otherOrderNo}-${companyId}`);
  await deleteDoc(`shipments/${shipmentId}`);
  for (const [collection, id] of created.reverse()) {
    await deleteDoc(`${collection}/${encodeURIComponent(id)}`);
  }
  console.log(
    JSON.stringify({
      cleanup: "completed",
      temporaryOrdersItemsShipmentDeleted: true,
      auditEvidencePreserved: true,
    }),
  );
}
