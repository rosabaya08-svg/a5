import process from "node:process";

const projectId = "a5-closed-mall";
const token = String(process.env.FIRESTORE_ACCESS_TOKEN || "").trim();
const execute = process.argv.includes("--execute");
const companyId = "company-test-1004";
const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const orderNo = `INTERNAL-PROJECTION-${suffix}`;
const itemId = `internal-projection-item-${suffix}`;
const root = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

if (!token) throw new Error("FIRESTORE_ACCESS_TOKEN is required.");
if (!execute) throw new Error("Use --execute to allow the isolated production trigger test.");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
let orderCreated = false;
let itemCreated = false;

const textValue = (value) => ({ stringValue: String(value) });
const intValue = (value) => ({ integerValue: String(value) });
const boolValue = (value) => ({ booleanValue: Boolean(value) });
const timestampValue = (value) => ({ timestampValue: value });

function fieldText(fields, ...keys) {
  for (const key of keys) {
    const value = fields?.[key];
    const text = String(value?.stringValue ?? "").trim();
    if (text && !/^[-?]+$/.test(text)) return text;
  }
  return "";
}

async function getDoc(collection, id) {
  const response = await fetch(`${root}/${collection}/${encodeURIComponent(id)}`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Read ${collection}/${id} failed: HTTP ${response.status}`);
  return response.json();
}

async function createDoc(collection, id, fields) {
  const response = await fetch(
    `${root}/${collection}/${encodeURIComponent(id)}?currentDocument.exists=false`,
    { method: "PATCH", headers, body: JSON.stringify({ fields }) },
  );
  if (!response.ok) throw new Error(`Create ${collection}/${id} failed: HTTP ${response.status}`);
  return response.json();
}

async function deleteDoc(collection, id) {
  const response = await fetch(`${root}/${collection}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });
  if (![200, 404].includes(response.status)) {
    throw new Error(`Delete ${collection}/${id} failed: HTTP ${response.status}`);
  }
}

async function queryAudit(target) {
  const response = await fetch(queryUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "audit_logs" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "target" },
            op: "EQUAL",
            value: { stringValue: target },
          },
        },
        limit: 10,
      },
    }),
  });
  if (!response.ok) throw new Error(`Audit query failed: HTTP ${response.status}`);
  return (await response.json()).filter((entry) => entry.document);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForProjection() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const [order, item] = await Promise.all([
      getDoc("orders", orderNo),
      getDoc("order_items", itemId),
    ]);
    const orderContacts = order?.fields?.seller_contacts_snapshot?.arrayValue?.values ?? [];
    const itemFields = item?.fields ?? {};
    if (
      orderContacts.length === 1
      && fieldText(itemFields, "seller_company_name")
      && fieldText(itemFields, "seller_business_no")
      && fieldText(itemFields, "seller_customer_service_phone")
      && itemFields.seller_contact_verified?.booleanValue === true
    ) {
      return { order, item, attempts: attempt };
    }
    await delay(1000);
  }
  throw new Error("Projection triggers did not complete within 30 seconds.");
}

async function main() {
  const company = await getDoc("companies", companyId);
  if (!company) throw new Error("Test company document does not exist.");
  const companyFields = company.fields ?? {};
  const companyName = fieldText(companyFields, "company_name", "companyName", "name", "business_name", "businessName");
  const businessNo = fieldText(companyFields, "business_registration_number", "businessRegistrationNumber", "business_no", "businessNo").replace(/\D/g, "");
  const contactPhone = fieldText(companyFields, "public_contact_phone", "publicContactPhone", "customer_service_phone", "customerServicePhone", "cs_phone", "csPhone", "contact_phone", "contactPhone");
  if (!companyName || !businessNo || !contactPhone) {
    throw new Error("Test company is not ready: verified company name, business number, and public contact are required.");
  }

  const now = new Date().toISOString();
  await createDoc("orders", orderNo, {
    order_no: textValue(orderNo),
    company_id: textValue(companyId),
    status: textValue("internal_projection_test"),
    customer_name: textValue("내부검증"),
    customer_phone_masked: textValue("010-****-1004"),
    receiver_name: textValue("내부검증"),
    receiver_phone: textValue("010-0000-1004"),
    delivery_method: textValue("pickup"),
    total_amount: intValue(1004),
    paid_at: timestampValue(now),
    created_at: timestampValue(now),
    internal_test: boolValue(true),
  });
  orderCreated = true;

  await createDoc("order_items", itemId, {
    order_no: textValue(orderNo),
    company_id: textValue(companyId),
    seller_company_id: textValue(companyId),
    product_id: textValue("internal-projection-product-1004"),
    product_name: textValue("[내부검증] 업체정보 보강 1,004원"),
    quantity: intValue(1),
    unit_price: intValue(1004),
    delivery_status: textValue("invoice_pending"),
    created_at: timestampValue(now),
    internal_test: boolValue(true),
  });
  itemCreated = true;

  const projected = await waitForProjection();
  const [orderAudits, itemAudits] = await Promise.all([
    queryAudit(orderNo),
    queryAudit(itemId),
  ]);

  console.log(JSON.stringify({
    projectId,
    testCompanyId: companyId,
    orderNo,
    itemId,
    testOnly: true,
    projectionCompleted: true,
    pollAttempts: projected.attempts,
    companyNameProjected: Boolean(fieldText(projected.item.fields, "seller_company_name")),
    businessNoProjected: Boolean(fieldText(projected.item.fields, "seller_business_no")),
    representativeProjected: Boolean(fieldText(projected.item.fields, "seller_representative_name")),
    publicContactProjected: Boolean(fieldText(projected.item.fields, "seller_customer_service_phone")),
    orderContactSnapshotCount: projected.order.fields.seller_contacts_snapshot.arrayValue.values.length,
    orderAuditCount: orderAudits.length,
    itemAuditCount: itemAudits.length,
    secretsPrinted: 0,
    personalDataPrinted: 0,
  }, null, 2));
}

try {
  await main();
} finally {
  if (itemCreated) await deleteDoc("order_items", itemId);
  if (orderCreated) await deleteDoc("orders", orderNo);
  console.log(JSON.stringify({
    cleanup: "completed",
    testOrderDeleted: orderCreated,
    testItemDeleted: itemCreated,
    auditEvidencePreserved: true,
  }));
}
