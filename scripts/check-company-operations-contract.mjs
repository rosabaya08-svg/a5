import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const files = {
  operations: read("functions/src/company/orderOperations.ts"),
  guestClaims: read("functions/src/company/guestClaims.ts"),
  guestContacts: read("functions/src/company/guestOrderContacts.ts"),
  itemProjection: read("functions/src/company/orderItemProjection.ts"),
  functionsIndex: read("functions/src/index.ts"),
  productDraft: read("lib/company/productDraft.ts"),
  excel: read("components/company/CompanyExcelExportPanel.tsx"),
  companyPages: read("components/pages/companyPages.tsx"),
  navigation: read("components/layout/navigation.ts"),
  orderPages: read("components/storefront/GuestOrderPagesClient.tsx"),
};

const checks = [
  ["company actor comes from verified Firebase claims", files.operations.includes("verifyIdToken(token)") && files.operations.includes("claims.company_id ?? claims.companyId")],
  ["order item ownership is rechecked on the server", files.operations.includes("itemCompanyId !== actor.companyId")],
  ["bulk invoices are bounded, duplicate checked, and audited", files.operations.includes("rows.length > 100") && files.operations.includes("BULK_DELIVERY_DUPLICATE") && files.operations.includes("company_order_delivery_bulk_update")],
  ["claims use server quantities and server prices", files.operations.includes("requestedQuantity <= 0") && files.operations.includes("unitPrice * requestedQuantity")],
  ["guest claims require token or phone verification", files.guestClaims.includes("guest_lookup_token_hash") && files.guestClaims.includes("customer_phone_last4") && files.guestClaims.includes("if (!tokenOk && !phoneOk)")],
  ["guest claim items use real order_items document IDs", files.guestContacts.includes("id: item.id") && files.guestContacts.includes('collection("order_items").where("order_no", "==", orderNo)')],
  ["seller contact snapshot runs for every created order item", files.functionsIndex.includes('document: "order_items/{itemId}"') && files.itemProjection.includes("seller_contact_snapshot")],
  ["public comparison prices remain hidden until verified", files.productDraft.includes("comparison_candidate_list_price") && files.productDraft.includes("price_comparison_verified: false") && files.productDraft.includes("list_price: null")],
  ["uploaded sale price remains the closed-mall price", files.excel.includes("closed_mall_price: first.closedMallPrice") && files.excel.includes("판매가는 폐쇄몰 최종 판매가로 그대로 저장")],
  ["same external product code rows are consistency checked", files.excel.includes("validateImportGroupConsistency") && files.excel.includes("같은 외부상품코드에 중복 옵션명 존재")],
  ["active company pages use secure order operations", files.companyPages.includes("CompanyOrderOperationsPanel") && !files.companyPages.includes("CompanyLiveOrdersPanel")],
  ["company payment navigation opens PayUp, not A5 settlement", files.navigation.includes('href: "/company/payup"') && files.navigation.includes("PayUp 관리자")],
  ["guest order pages use verified seller contacts and claims", files.orderPages.includes("GuestSellerContacts") && files.orderPages.includes("GuestClaimRequestForm") && !files.orderPages.includes("GuestRefundRequestBridge")],
];

let failed = 0;
console.log("[check:company-operations-contract] A5 Mall company operation contracts");
for (const [name, passed] of checks) {
  console.log(`- ${passed ? "ok" : "fail"}: ${name}`);
  if (!passed) failed += 1;
}
if (failed) {
  console.error(`[check:company-operations-contract] FAILED: ${failed} contract(s) failed.`);
  process.exit(1);
}
console.log(`[check:company-operations-contract] OK: ${checks.length} contracts passed.`);
