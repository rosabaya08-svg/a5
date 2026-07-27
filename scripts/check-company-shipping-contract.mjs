import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const files = {
  carriers: read("functions/src/company/carrierCatalog.ts"),
  shipments: read("functions/src/company/shipmentOperations.ts"),
  operations: read("functions/src/company/orderOperations.ts"),
  bulkPanel: read("components/company/CompanyBulkInvoicePanel.tsx"),
  operationsPanel: read("components/company/CompanyOrderOperationsPanel.tsx"),
  receiverForm: read("components/storefront/QrReceiverForm.tsx"),
  checkout: read("components/guest/ServerCheckoutFlow.tsx"),
  paymentTypes: read("functions/src/payments/types.ts"),
  confirm: read("functions/src/payments/confirm.ts"),
};

const carrierCodes = [...files.carriers.matchAll(/code: "(\d{4})"/g)].map((match) => match[1]);
const expectedCarrierCodes = [
  "1001", "1002", "1004", "1007", "1008", "1010", "1011", "1012", "1013", "1014",
  "1015", "1016", "1018", "1019", "1020", "1021", "1022", "1023", "1025", "1026",
  "1027", "1028", "1029", "1030", "1031", "1032", "1033", "1034", "1035", "1036",
];

const checks = [
  [
    "carrier catalog matches the supplied 30-code list",
    JSON.stringify(carrierCodes) === JSON.stringify(expectedCarrierCodes),
  ],
  [
    "non-shipping business codes are rejected for shipment invoices",
    files.carriers.includes('{ code: "1031", name: "대체출고", shippingEnabled: false }') &&
      files.carriers.includes('{ code: "1032", name: "계좌환불", shippingEnabled: false }') &&
      files.carriers.includes("CARRIER_CODE_NOT_SHIPPING"),
  ],
  [
    "company operations handler delegates only to the safe shipment module",
    files.operations.includes("updateCompanyShipment(getAdminDb(), actor.actor, body)") &&
      files.operations.includes("updateCompanyShipmentsBulk(getAdminDb(), actor.actor, body)") &&
      !files.operations.includes("async function updateDelivery(") &&
      !files.operations.includes("async function updateDeliveriesBulk("),
  ],
  [
    "shipment writes are transactional, per item, and audited",
    files.shipments.includes("db.runTransaction") &&
      files.shipments.includes('collection("shipments")') &&
      files.shipments.includes('fulfillmentRef.collection("items").doc(itemId)') &&
      files.shipments.includes("company_order_delivery_bulk_update"),
  ],
  [
    "same-order bundled invoices are allowed but cross-order reuse is blocked",
    files.shipments.includes("SHIPMENT_DUPLICATE") &&
      files.shipments.includes("existingCompanyId !== companyId || existingOrderNo !== orderNo") &&
      files.shipments.includes("order_item_ids: FieldValue.arrayUnion(itemId)") &&
      files.shipments.includes('createHash("sha256")'),
  ],
  [
    "bulk upload validates company item, order number, carrier, and invoice",
    files.shipments.includes("COMPANY_SCOPE_FORBIDDEN") &&
      files.shipments.includes("ORDER_NUMBER_MISMATCH") &&
      files.shipments.includes("requireShippingCarrier") &&
      files.shipments.includes("BULK_DELIVERY_ROW_INVALID"),
  ],
  [
    "bulk workbook uses the required four-column Bizmarket-compatible contract",
    files.bulkPanel.includes('{ header: "주문번호", key: "orderNo"') &&
      files.bulkPanel.includes('{ header: "주문고유번호", key: "itemId"') &&
      files.bulkPanel.includes('{ header: "택배사코드", key: "carrierCode"') &&
      files.bulkPanel.includes('{ header: "송장번호", key: "invoiceNumber"'),
  ],
  [
    "company delivery UI has status queues, carrier selection, and worklist export",
    files.operationsPanel.includes("queueCounts") &&
      files.operationsPanel.includes("택배사 선택") &&
      files.operationsPanel.includes("배송 작업목록 다운로드"),
  ],
  [
    "new delivery orders require and carry postal code and delivery memo",
    files.receiverForm.includes("postalCode: string") &&
      files.receiverForm.includes("deliveryMemo: string") &&
      files.checkout.includes("receiverPostalCode: receiver.postalCode.trim()") &&
      files.checkout.includes("deliveryMemo: receiver.deliveryMemo.trim()"),
  ],
  [
    "confirmed order stores scoped full receiver logistics fields",
    files.paymentTypes.includes("receiverPhone?: string") &&
      files.confirm.includes("receiver_phone:") &&
      files.confirm.includes("receiver_postal_code:") &&
      files.confirm.includes("delivery_memo:"),
  ],
  [
    "API response returns carrier catalog and never returns payment credentials",
    files.operations.includes("carriers: companyCarriers") &&
      !files.operations.includes("api_key") &&
      !files.operations.includes("auth_key") &&
      !files.operations.includes("credential_ciphertext"),
  ],
];

let failed = 0;
console.log("[check:company-shipping-contract] A5 Mall shipping contracts");
for (const [name, passed] of checks) {
  console.log(`- ${passed ? "ok" : "fail"}: ${name}`);
  if (!passed) failed += 1;
}
if (failed) {
  console.error(`[check:company-shipping-contract] FAILED: ${failed} contract(s) failed.`);
  process.exit(1);
}
console.log(`[check:company-shipping-contract] OK: ${checks.length} contracts passed.`);
