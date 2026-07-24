import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("FIRESTORE_EMULATOR_HOST is required. Refusing to run against a non-emulator database.");
}

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "a5-closed-mall";
if (!getApps().length) initializeApp({ projectId });

const db = getFirestore();
const { companyOrderCreatedProjectionHandler } = await import("../lib/company/orderProjection.js");
const { companyOrderItemCreatedProjectionHandler } = await import("../lib/company/orderItemProjection.js");

const companyId = "company-projection-emulator-test";
const now = new Date().toISOString();
const contact = {
  company_id: companyId,
  company_name: "투영검증 테스트사업자",
  business_registration_number: "100-00-01004",
  representative_name: "테스트대표",
  public_contact_phone: "02-0000-1004",
  public_email: "projection-test@example.invalid",
  ecommerce_license_no: "TEST-1004",
  return_address: "테스트 반품주소",
};

await db.collection("companies").doc(companyId).set(contact);

const itemOrderNo = "EMULATOR-ITEM-PROJECTION-1004";
const itemId = "emulator-item-projection-1004";
const itemSeed = {
  order_no: itemOrderNo,
  company_id: companyId,
  product_name: "보강 함수 내부검증 상품",
  quantity: 1,
  unit_price: 1004,
  created_at: now,
};
await db.collection("orders").doc(itemOrderNo).set({
  order_no: itemOrderNo,
  status: "paid",
  created_at: now,
});
await db.collection("order_items").doc(itemId).set(itemSeed);
await companyOrderItemCreatedProjectionHandler({
  params: { itemId },
  data: { data: () => itemSeed },
});

const projectedItem = (await db.collection("order_items").doc(itemId).get()).data() || {};
const projectedItemOrder = (await db.collection("orders").doc(itemOrderNo).get()).data() || {};

const orderNo = "EMULATOR-ORDER-PROJECTION-1004";
const orderItemId = "emulator-order-item-projection-1004";
const orderSeed = {
  order_no: orderNo,
  status: "paid",
  items_snapshot: [{ company_id: companyId, product_name: "주문 보강 내부검증 상품" }],
  created_at: now,
};
await db.collection("orders").doc(orderNo).set(orderSeed);
await db.collection("order_items").doc(orderItemId).set({
  order_no: orderNo,
  company_id: companyId,
  product_name: "주문 보강 내부검증 상품",
  quantity: 1,
  unit_price: 1004,
  created_at: now,
});
await companyOrderCreatedProjectionHandler({
  params: { orderId: orderNo },
  data: {
    data: () => orderSeed,
    ref: {
      set: (data, options) => db.collection("orders").doc(orderNo).set(data, options),
    },
  },
});

const projectedOrderItem = (await db.collection("order_items").doc(orderItemId).get()).data() || {};
const projectedOrder = (await db.collection("orders").doc(orderNo).get()).data() || {};
const audits = await db.collection("audit_logs").get();

const checks = [
  ["item trigger writes company name", projectedItem.seller_company_name === contact.company_name],
  ["item trigger writes normalized business number", projectedItem.seller_business_no === "1000001004"],
  ["item trigger writes representative", projectedItem.seller_representative_name === contact.representative_name],
  ["item trigger writes public contact", projectedItem.seller_customer_service_phone === contact.public_contact_phone],
  ["item trigger writes public email", projectedItem.seller_public_email === contact.public_email],
  ["item trigger writes return address", projectedItem.seller_return_address === contact.return_address],
  ["item trigger marks verified contact", projectedItem.seller_contact_verified === true],
  ["item trigger projects contact to order", Array.isArray(projectedItemOrder.seller_contacts_snapshot) && projectedItemOrder.seller_contacts_snapshot.length === 1],
  ["order trigger projects company name to item", projectedOrderItem.seller_company_name === contact.company_name],
  ["order trigger projects company name to items snapshot", projectedOrder.items_snapshot?.[0]?.seller_company_name === contact.company_name],
  ["order trigger writes order contact snapshot", Array.isArray(projectedOrder.seller_contacts_snapshot) && projectedOrder.seller_contacts_snapshot.length === 1],
  ["both triggers write audit records", audits.size === 2],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}
console.log(JSON.stringify({
  emulator: true,
  writesToProduction: 0,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
}, null, 2));

if (failed.length) process.exitCode = 1;
