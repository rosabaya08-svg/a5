import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "components/company/CompanyOrderOperationsPanel.tsx"),
  "utf8",
);

const checks = [
  ["shipping worklist Excel remains available", source.includes("배송 작업목록 다운로드 (Excel)")],
  ["picking list print action exists", source.includes("피킹리스트 인쇄") && source.includes("printPickingList(filteredItems)")],
  ["packing slip print action exists", source.includes("포장명세서 인쇄") && source.includes("printPackingSlips(filteredItems, orderByNo)")],
  ["transaction statement print action exists", source.includes("거래명세서 인쇄") && source.includes("printTransactionStatements(filteredItems, orderByNo)")],
  ["picking rows aggregate quantity", source.includes("current.quantity += item.quantity")],
  ["packing slip contains receiver information", source.includes("formatDeliveryAddress(order)") && source.includes("order?.deliveryMemo")],
  ["seller snapshot is used", source.includes("seller?.sellerBusinessNo") && source.includes("seller?.sellerRepresentativeName")],
  ["print output escapes untrusted values", source.includes("function escapePrintHtml") && source.includes('.replaceAll("<", "&lt;")')],
  ["popup failure is reported", source.includes("브라우저의 팝업 차단을 해제한 뒤 다시 시도해 주세요.")],
  ["statement is not represented as settlement", source.includes("정산서, 세금계산서 또는 결제 영수증이 아닙니다.")],
  ["all actions use filtered company items", (source.match(/filteredItems/g) ?? []).length >= 8],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
}
if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`PASS ${checks.length}/${checks.length}: company fulfillment document contract`);
}
