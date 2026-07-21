"use client";

import { useMemo, useState } from "react";
import { companyProductCategories } from "@/data/companyProductCategories";
import {
  buildProductCatalogCmsRecord,
  buildProductDraftCmsRecord,
  buildProductOptionCmsRecords,
  createDefaultProductDraft,
  normalizeDraft,
  withProductDraftSellerIdentity,
  type ProductDraft,
  type ProductDraftVariant,
} from "@/lib/company/productDraft";
import { readPortalSession } from "@/lib/auth/session";
import { validateProductPriceOrder } from "@/lib/company/priceMetrics";
import { saveCompanyProduct } from "@/lib/firebase/contentRepository";

type CsvCell = string | number | null | undefined;
type Header<T> = { key: keyof T; label: string };

export type CompanyExcelOrderRow = {
  orderNo: string; orderedAt: string; paidAt: string; orderStatus: string; buyerName: string; buyerPhone: string; buyerEmail: string;
  receiverName: string; receiverPhone: string; postalCode: string; address: string; addressDetail: string; productCode: string; productName: string;
  optionName: string; quantity: number; salePrice: number; productAmount: number; shippingFee: number; totalPaidAmount: number; paymentMethod: string;
  carrier: string; invoiceNo: string; deliveryMemo: string; companyId: string; supplierName: string; settlementStatus: string;
};

export type CompanyExcelProductRow = {
  a5ProductCode: string; sabangnetProductCode: string; productName: string; optionName: string; normalPrice: number; platformLowestPrice: number;
  closedMallPrice: number; stock: number; status: string; companyId: string; supplierName: string;
};

type CompanyExcelProductImportRow = {
  externalProductCode: string; productName: string; brandName: string; shoppingMallCategory: string; optionName: string;
  listPrice: number | null; openMallPrice: number | null; closedMallPrice: number; stock: number; representativeImageUrl: string; detailImageUrls: string;
  detailProductVideoUrl: string; orderAvailableFrom: string; orderAvailableTo: string;
  deliveryLeadDays: number; minimumOrderQuantity: number; cancellationOrderAmount: number; refundReturnPolicy: string;
  summary: string; shippingFee: number; freeShipping: string; remoteAreaShippingFee: number; jejuShippingFee: number; saleStatus: string;
};

type ParsedProductImportRow = Omit<CompanyExcelProductImportRow, "listPrice" | "openMallPrice"> & {
  listPrice: number; openMallPrice: number;
  rowNo: number; detailImageUrlList: string[]; errors: string[];
};

type ImportState = { status: "idle" | "ready" | "saving" | "saved" | "error"; message: string };

const orderHeaders: Header<CompanyExcelOrderRow>[] = [
  ["orderNo", "주문번호"], ["orderedAt", "주문일시"], ["paidAt", "결제일시"], ["orderStatus", "주문상태"], ["buyerName", "구매자명"],
  ["buyerPhone", "구매자 연락처"], ["buyerEmail", "구매자 이메일"], ["receiverName", "수령자명"], ["receiverPhone", "수령자 연락처"],
  ["postalCode", "우편번호"], ["address", "주소"], ["addressDetail", "상세주소"], ["productCode", "상품코드"], ["productName", "상품명"],
  ["optionName", "옵션명"], ["quantity", "수량"], ["salePrice", "판매가"], ["productAmount", "상품금액"], ["shippingFee", "배송비"],
  ["totalPaidAmount", "총결제금액"], ["paymentMethod", "결제수단"], ["carrier", "택배사"], ["invoiceNo", "송장번호"],
  ["deliveryMemo", "배송메모"], ["companyId", "입점사 ID"], ["supplierName", "공급사명"], ["settlementStatus", "정산상태"],
].map(([key, label]) => ({ key: key as keyof CompanyExcelOrderRow, label }));

const productHeaders: Header<CompanyExcelProductRow>[] = [
  ["a5ProductCode", "A5 상품코드"], ["sabangnetProductCode", "외부 상품코드"], ["productName", "상품명"], ["optionName", "옵션명"],
  ["normalPrice", "원판매가"], ["platformLowestPrice", "오픈몰 판매가"], ["closedMallPrice", "폐쇄몰 판매가"], ["stock", "재고"],
  ["status", "상태"], ["companyId", "입점사 ID"], ["supplierName", "공급사명"],
].map(([key, label]) => ({ key: key as keyof CompanyExcelProductRow, label }));

const invoiceHeaders: Header<CompanyExcelOrderRow>[] = [
  ["orderNo", "주문번호"], ["productCode", "상품코드"], ["productName", "상품명"], ["optionName", "옵션명"], ["quantity", "수량"],
  ["carrier", "택배사"], ["invoiceNo", "송장번호"], ["deliveryMemo", "배송메모"], ["companyId", "입점사 ID"], ["supplierName", "공급사명"],
].map(([key, label]) => ({ key: key as keyof CompanyExcelOrderRow, label }));

const productImportHeaders: Header<CompanyExcelProductImportRow>[] = [
  ["externalProductCode", "외부상품코드"], ["productName", "상품명"], ["brandName", "브랜드명"], ["shoppingMallCategory", "쇼핑몰카테고리"],
  ["optionName", "옵션명"], ["listPrice", "원판매가"], ["openMallPrice", "오픈몰판매가"], ["closedMallPrice", "판매가"],
  ["stock", "발주가능재고"], ["orderAvailableFrom", "발주가능시작일"], ["orderAvailableTo", "발주가능종료일"],
  ["shippingFee", "배송비"], ["deliveryLeadDays", "배송도착예정일(d+n)"],
  ["minimumOrderQuantity", "최소발주수량"], ["cancellationOrderAmount", "취소발주금액"],
  ["representativeImageUrl", "제품사진URL"], ["detailProductVideoUrl", "상세상품동영상URL"], ["detailImageUrls", "상세이미지URL"],
  ["refundReturnPolicy", "환불반품규정"], ["summary", "상품요약"],
  ["freeShipping", "무료배송여부"], ["remoteAreaShippingFee", "도서산간배송비"], ["jejuShippingFee", "제주배송비"],
  ["saleStatus", "판매상태"],
].map(([key, label]) => ({ key: key as keyof CompanyExcelProductImportRow, label }));

const productImportTemplateRows: CompanyExcelProductImportRow[] = [{
  externalProductCode: "sample-001", productName: "샘플 방울토마토", brandName: "샘플 농가", shoppingMallCategory: "건강식품", optionName: "400g",
  listPrice: null, openMallPrice: null, closedMallPrice: 4000, stock: 100, orderAvailableFrom: "2026-07-15", orderAvailableTo: "2026-08-10",
  shippingFee: 3500, deliveryLeadDays: 2, minimumOrderQuantity: 1, cancellationOrderAmount: 4000,
  representativeImageUrl: "https://example.com/product.jpg", detailProductVideoUrl: "", detailImageUrls: "",
  refundReturnPolicy: "신선식품은 단순 변심 환불 불가. 오배송·파손·상품 이상은 수령 후 24시간 이내 사진과 함께 접수.",
  summary: "폐쇄몰에 노출할 상품 요약을 입력하세요.", freeShipping: "N", remoteAreaShippingFee: 3000, jejuShippingFee: 5000, saleStatus: "판매중",
}];

const allowedProductCategoryLabels = companyProductCategories.map((category) => category.label);
const allowedProductCategorySet = new Set(allowedProductCategoryLabels);

function csvValue(value: CsvCell) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv<T extends object>(headers: Header<T>[], rows: T[]) {
  const headerLine = headers.map((header) => csvValue(header.label)).join(",");
  const body = rows.map((row) => headers.map((header) => csvValue(row[header.key] as CsvCell)).join(","));
  return ["\uFEFF" + headerLine, ...body].join("\r\n");
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadCsv<T extends object>(filename: string, headers: Header<T>[], rows: T[]) {
  downloadBlob(filename, buildCsv(headers, rows), "text/csv;charset=utf-8");
}

function escapeHtml(value: CsvCell) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function worksheet<T extends object>(name: string, headers: Header<T>[], rows: T[]) {
  const headerCells = headers.map((header) => `<th>${escapeHtml(header.label)}</th>`).join("");
  const bodyRows = rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header.key] as CsvCell)}</td>`).join("")}</tr>`).join("");
  return `<h2>${escapeHtml(name)}</h2><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function downloadExcelTemplate() {
  const categoryRows = companyProductCategories.map((category) => ({ category: category.label, code: category.code, note: "상품등록 시 쇼핑몰카테고리 칸에 이 명칭 그대로 입력하세요." }));
  const categoryHeaders = [
    { key: "category", label: "카테고리명" }, { key: "code", label: "카테고리코드" }, { key: "note", label: "입력 안내" },
  ] as Header<(typeof categoryRows)[number]>[];
  const exampleRows = [
    { item: "상세이미지URL", description: "여러 장은 | 기호로 구분합니다." },
    { item: "무료배송여부", description: "Y 또는 N으로 입력합니다." },
    { item: "가격 계산", description: "할인률과 AI 비교금액은 업로드 미리보기에서 자동 계산됩니다." },
  ];
  const exampleHeaders = [
    { key: "item", label: "항목" }, { key: "description", label: "설명" },
  ] as Header<(typeof exampleRows)[number]>[];
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,'Malgun Gothic',sans-serif}table{border-collapse:collapse;margin:16px 0 32px;width:100%}th,td{border:1px solid #d9e2ef;padding:8px;text-align:left}th{background:#f2f6fb;font-weight:400}</style></head><body>${worksheet("상품등록", productImportHeaders, productImportTemplateRows)}${worksheet("카테고리표", categoryHeaders, categoryRows)}${worksheet("입력예시", exampleHeaders, exampleRows)}</body></html>`;
  downloadBlob("A5Mall_상품등록양식.xls", html, "application/vnd.ms-excel;charset=utf-8");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function parseDelimited(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseExcelHtml(text: string) {
  if (typeof DOMParser === "undefined" || !/<table[\s>]/i.test(text)) return [];
  const doc = new DOMParser().parseFromString(text, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];
  const rows = Array.from(table.querySelectorAll("tr")).map((tr) => Array.from(tr.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? ""));
  const headers = rows[0] ?? [];
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function parseImportFileText(text: string) {
  return /<table[\s>]/i.test(text) ? parseExcelHtml(text) : parseDelimited(text);
}

function spreadsheetCellValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (!value || typeof value !== "object") return value;
  const cell = value as { text?: unknown; hyperlink?: unknown; result?: unknown; richText?: Array<{ text?: unknown }> };
  if (typeof cell.text === "string") return cell.text;
  if (cell.result !== undefined) return cell.result;
  if (Array.isArray(cell.richText)) return cell.richText.map((item) => String(item.text ?? "")).join("");
  if (typeof cell.hyperlink === "string") return cell.hyperlink;
  return String(value);
}

async function readImportRecords(file: File): Promise<Record<string, unknown>[]> {
  if (!/\.xlsx$/i.test(file.name)) return parseImportFileText(await file.text());
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()) as never);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const headers = (worksheet.getRow(1).values as unknown[]).slice(1).map((value) => textValue(spreadsheetCellValue(value)));
  const records: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values as unknown[]).slice(1).map(spreadsheetCellValue);
    if (!values.some((value) => textValue(value))) return;
    records.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  });
  return records;
}

function numberValue(value: unknown) {
  const normalized = String(value ?? "").replace(/[^0-9-]/g, "");
  return normalized ? Number(normalized) : 0;
}

function textValue(value: unknown) {
  return String(value ?? "").trim();
}

function productImportValue(record: Record<string, unknown>, key: keyof CompanyExcelProductImportRow) {
  const label = productImportHeaders.find((header) => header.key === key)?.label ?? String(key);
  const aliases: Partial<Record<keyof CompanyExcelProductImportRow, string[]>> = {
    brandName: ["브랜드", "brand"], shoppingMallCategory: ["카테고리", "category"], listPrice: ["일반판매가", "원 판매가", "normalPrice"],
    openMallPrice: ["오픈몰 판매가", "AI 플랫폼 최저가", "platformLowestPrice"], closedMallPrice: ["판매가", "폐쇄몰판매가", "폐쇄몰 판매가", "실판매가", "closedMallPrice"],
    stock: ["발주 가능한 재고", "발주재고", "재고"], orderAvailableFrom: ["발주 가능 시작일", "발주시작일"], orderAvailableTo: ["발주 가능 종료일", "발주종료일"],
    deliveryLeadDays: ["배송도착예정일", "배송예정일", "배송리드타임"],
    minimumOrderQuantity: ["최소 발주 수량", "최소주문수량"], cancellationOrderAmount: ["취소 발주 금액", "취소발주금액(원)"],
    representativeImageUrl: ["상품 사진", "제품 사진", "대표이미지", "대표이미지 URL", "imageUrl"], detailProductVideoUrl: ["상세상품 동영상 URL", "상품동영상URL", "상세동영상URL", "videoUrl"],
    detailImageUrls: ["상세이미지", "상세이미지 URL", "detailImageUrl"], refundReturnPolicy: ["환불,반품 규정", "환불/반품 규정", "반품규정"],
  };
  for (const candidate of [label, String(key), ...(aliases[key] ?? [])]) {
    if (record[candidate] !== undefined) return record[candidate];
  }
  return undefined;
}

function sanitizeId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9가-힣-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function normalizeUrlList(value: string) {
  return value.split(/[|,\n]/g).map((item) => item.trim()).filter(Boolean);
}

function isHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function findProductCategory(label: string) {
  return companyProductCategories.find((category) => category.label === label) ?? null;
}

function makeBulkProductId(companyId: string, row: CompanyExcelProductImportRow, index: number) {
  const source = sanitizeId(row.externalProductCode);
  return `company-${sanitizeId(companyId)}-${source || `invalid-${index + 1}`}`;
}


function parseProductImportRows(records: Record<string, unknown>[]): ParsedProductImportRow[] {
  return records.map((record, index) => {
    const detailImageUrls = textValue(productImportValue(record, "detailImageUrls"));
    const row: ParsedProductImportRow = {
      rowNo: index + 2,
      externalProductCode: textValue(productImportValue(record, "externalProductCode")),
      productName: textValue(productImportValue(record, "productName")),
      brandName: textValue(productImportValue(record, "brandName")),
      shoppingMallCategory: textValue(productImportValue(record, "shoppingMallCategory")),
      optionName: textValue(productImportValue(record, "optionName")) || "기본",
      listPrice: numberValue(productImportValue(record, "listPrice")),
      openMallPrice: numberValue(productImportValue(record, "openMallPrice")),
      closedMallPrice: numberValue(productImportValue(record, "closedMallPrice")),
      stock: numberValue(productImportValue(record, "stock")),
      orderAvailableFrom: textValue(productImportValue(record, "orderAvailableFrom")),
      orderAvailableTo: textValue(productImportValue(record, "orderAvailableTo")),
      deliveryLeadDays: numberValue(productImportValue(record, "deliveryLeadDays")),
      minimumOrderQuantity: numberValue(productImportValue(record, "minimumOrderQuantity")) || 1,
      cancellationOrderAmount: numberValue(productImportValue(record, "cancellationOrderAmount")),
      representativeImageUrl: textValue(productImportValue(record, "representativeImageUrl")),
      detailProductVideoUrl: textValue(productImportValue(record, "detailProductVideoUrl")),
      detailImageUrls,
      detailImageUrlList: normalizeUrlList(detailImageUrls),
      summary: textValue(productImportValue(record, "summary")),
      refundReturnPolicy: textValue(productImportValue(record, "refundReturnPolicy")),
      shippingFee: numberValue(productImportValue(record, "shippingFee")),
      freeShipping: textValue(productImportValue(record, "freeShipping")) || "N",
      remoteAreaShippingFee: numberValue(productImportValue(record, "remoteAreaShippingFee")),
      jejuShippingFee: numberValue(productImportValue(record, "jejuShippingFee")),
      saleStatus: textValue(productImportValue(record, "saleStatus")) || "판매중",
      errors: [],
    };
    const priceInput = {
      listPrice: row.listPrice,
      platformLowestPrice: row.openMallPrice,
      closedMallPrice: row.closedMallPrice,
    };

    if (!row.externalProductCode) row.errors.push("\uC678\uBD80\uC0C1\uD488\uCF54\uB4DC \uD544\uC694");
    if (!row.productName) row.errors.push("상품명 필요");
    if (!row.brandName) row.errors.push("브랜드명 필요");
    if (!allowedProductCategorySet.has(row.shoppingMallCategory)) row.errors.push(`카테고리는 ${allowedProductCategoryLabels.join(", ")} 중 하나여야 합니다.`);
    row.errors.push(...validateProductPriceOrder(priceInput).errors);
    if (row.stock < 0) row.errors.push("재고 확인 필요");
    if (!row.orderAvailableFrom || !row.orderAvailableTo) row.errors.push("발주 가능 일정 필요");
    if (row.orderAvailableFrom && row.orderAvailableTo && Date.parse(row.orderAvailableFrom) > Date.parse(row.orderAvailableTo)) row.errors.push("발주 가능 종료일 확인 필요");
    if (row.deliveryLeadDays < 0) row.errors.push("배송도착예정일 확인 필요");
    if (row.minimumOrderQuantity < 1) row.errors.push("최소발주수량 확인 필요");
    if (!row.representativeImageUrl) row.errors.push("제품사진 URL 필요");
    if (!row.refundReturnPolicy) row.errors.push("환불반품규정 필요");
    if (!isHttpUrl(row.representativeImageUrl)) row.errors.push("제품사진 URL 형식 오류");
    if (row.detailProductVideoUrl && !isHttpUrl(row.detailProductVideoUrl)) row.errors.push("상세상품 동영상 URL 형식 오류");
    if (row.detailImageUrlList.some((url) => !isHttpUrl(url))) row.errors.push("상세이미지 URL 형식 오류");
    return row;
  });
}

function fileNameFromUrl(url: string, fallback: string) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).at(-1) ?? fallback);
  } catch {
    return url.split("/").filter(Boolean).at(-1) ?? fallback;
  }
}

function variantFromImportRow(row: ParsedProductImportRow, index: number): ProductDraftVariant {
  const finalSalePrice = String(row.closedMallPrice);
  return {
    id: `variant-${index + 1}`,
    optionValueIds: [],
    optionPath: row.optionName || "기본",
    optionName: row.optionName || "기본",
    sku: row.externalProductCode ? `${row.externalProductCode}-${index + 1}` : `bulk-sku-${index + 1}`,
    barcode: "",
    normalPrice: String(row.listPrice),
    platformLowestPrice: String(row.openMallPrice),
    baseClosedMallPrice: String(row.closedMallPrice),
    additionalPrice: "0",
    finalSalePrice,
    closedMallPrice: finalSalePrice,
    stock: String(row.stock),
    safetyStock: "",
    weight: "",
    externalProductCode: row.externalProductCode,
    externalOptionCode: row.optionName || "기본",
    imageFileName: undefined,
    status: (row.saleStatus === "판매중지" || row.stock <= 0 ? "품절" : "판매가능") as ProductDraftVariant["status"],
  };
}

function draftFromImportRows(
  companyId: string,
  productId: string,
  rows: ParsedProductImportRow[],
  sellerIdentity: { businessNo?: string; companyName?: string } = {},
): ProductDraft {
  const first = rows[0];
  const category = findProductCategory(first.shoppingMallCategory) ?? companyProductCategories[0];
  const defaults = createDefaultProductDraft(companyId);
  const variants = rows.map(variantFromImportRow);
  const detailSections = [
    { id: "section-summary", type: "text", title: "상품 소개", body: first.summary || first.productName, sortOrder: 1 },
    ...first.detailImageUrlList.map((url, index) => ({
      id: `section-detail-image-${index + 1}`,
      type: "image",
      title: `상세 이미지 ${index + 1}`,
      body: "",
      assetFileName: fileNameFromUrl(url, `detail-${index + 1}.jpg`),
      assetUrl: url,
      sortOrder: index + 2,
    })),
  ] as ProductDraft["detailSections"];
  const media = [
    ...(first.representativeImageUrl ? [{ role: "representative", fileName: fileNameFromUrl(first.representativeImageUrl, "representative.jpg"), fileType: "image", fileSize: 0, url: first.representativeImageUrl }] : []),
    ...first.detailImageUrlList.map((url, index) => ({ role: "detail", fileName: fileNameFromUrl(url, `detail-${index + 1}.jpg`), fileType: "image", fileSize: 0, sectionId: `section-detail-image-${index + 1}`, url })),
  ] as ProductDraft["media"];

  return withProductDraftSellerIdentity(
    normalizeDraft({
      ...defaults,
      id: productId,
      companyId,
      status: "draft",
      productName: first.productName,
      brand: first.brandName,
      categoryId: category.id,
      categoryLabel: category.label,
      categoryCode: category.code,
      subcategory: category.subcategories[0] ?? category.label,
      reviewLevel: category.reviewLevel,
      shelf: category.shelf,
      noticeTemplate: category.noticeTemplate,
      summary: first.summary,
      detailDescription: first.summary,
      returnPolicy: first.refundReturnPolicy,
      deliveryPolicy: first.freeShipping.toUpperCase() === "Y" ? "무료배송" : `기본 배송비 ${first.shippingFee.toLocaleString()}원`,
      shippingFeePolicy: {
        ...defaults.shippingFeePolicy,
        mode: (first.freeShipping.toUpperCase() === "Y" ? "free" : "paid") as ProductDraft["shippingFeePolicy"]["mode"],
        baseFee: first.freeShipping.toUpperCase() === "Y" ? 0 : first.shippingFee,
        remoteAreaEnabled: first.remoteAreaShippingFee > 0,
        remoteAreaFee: first.remoteAreaShippingFee,
        islandAreaEnabled: first.jejuShippingFee > 0,
        islandAreaFee: first.jejuShippingFee,
      },
      pricing: { ...defaults.pricing, listPrice: first.listPrice, platformLowestPrice: first.openMallPrice, closedMallPrice: first.closedMallPrice },
      variants,
      skus: variants,
      media,
      detailSections,
      compliance: { sellerDisclosureCompleted: true, productNoticeCompleted: true, returnPolicyCompleted: true, prohibitedProductConfirmed: true, kcRequired: false, kcNumber: "", evidenceReady: true },
      previewCheckedAt: new Date().toISOString(),
    }),
    sellerIdentity,
  );
}

export function CompanyExcelExportPanel({ companyId, orderRows, productRows }: { companyId: string; orderRows: CompanyExcelOrderRow[]; productRows: CompanyExcelProductRow[] }) {
  const [parsedRows, setParsedRows] = useState<ParsedProductImportRow[]>([]);
  const [importState, setImportState] = useState<ImportState>({ status: "idle", message: "" });
  const companySession = readPortalSession("company");
  const registrationCompanyId = companySession?.role === "company" ? String(companySession.companyId ?? "").trim() : "";
  const registrationBusinessNo = companySession?.role === "company" ? String(companySession.businessNo ?? "").replace(/\D/g, "") : "";
  const companyScopeReady = Boolean(registrationCompanyId && registrationBusinessNo && registrationCompanyId === companyId);
  const sellerIdentity = { businessNo: registrationBusinessNo, companyName: companySession?.displayName };
  const invalidRows = parsedRows.filter((row) => row.errors.length > 0);
  const groupedRows = useMemo(() => parsedRows.reduce((groups, row, index) => {
    const key = sanitizeId(row.externalProductCode) || `invalid-${index}`;
    const rows = groups.get(key) ?? [];
    rows.push(row);
    groups.set(key, rows);
    return groups;
  }, new Map<string, ParsedProductImportRow[]>()), [parsedRows]);

  async function readProductImportFile(file: File | null) {
    if (!file) return;
    const rows = parseProductImportRows(await readImportRecords(file));
    setParsedRows(rows);
    setImportState({ status: rows.length ? "ready" : "error", message: rows.length ? `${rows.length}개 행을 읽었습니다. 오류가 없는 행만 업로드할 수 있습니다.` : "읽을 수 있는 상품 행이 없습니다." });
  }

  async function publishBulkProducts() {
    if (!companyScopeReady) {
      setImportState({ status: "error", message: "로그인한 사업자와 현재 화면의 사업자가 일치하지 않습니다. 다시 로그인해 주세요." });
      return;
    }
    if (!parsedRows.length || invalidRows.length) {
      setImportState({ status: "error", message: "오류가 있는 행을 먼저 수정해야 합니다." });
      return;
    }
    setImportState({ status: "saving", message: "상품을 저장하고 폐쇄몰 노출을 갱신하는 중입니다." });
    try {
      let savedProductCount = 0;
      let index = 0;
      for (const [, rows] of groupedRows) {
        const productId = makeBulkProductId(registrationCompanyId, rows[0], index);
        const draft = draftFromImportRows(registrationCompanyId, productId, rows, sellerIdentity);
        const now = new Date().toISOString();
        const first = rows[0];
        const candidateListPrice = first.listPrice > 0 ? first.listPrice : null;
        const candidateOpenMallPrice = first.openMallPrice > 0 ? first.openMallPrice : null;
        const sharedPriceFields = {
          list_price: null,
          listPrice: null,
          open_mall_price: null,
          openMallPrice: null,
          platform_lowest_price: null,
          platformLowestPrice: null,
          closed_mall_price: first.closedMallPrice,
          closedMallPrice: first.closedMallPrice,
          normal_discount_amount: null,
          normalDiscountAmount: null,
          platform_discount_amount: null,
          platformDiscountAmount: null,
          ai_comparison_amount: null,
          aiComparisonAmount: null,
          normal_discount_rate: null,
          normalDiscountRate: null,
          discount_rate: null,
          discountRate: null,
          platform_discount_rate: null,
          platformDiscountRate: null,
          price_comparison_verified: false,
          priceComparisonVerified: false,
          price_comparison_status: "pending_verification",
          priceComparisonStatus: "pending_verification",
          comparison_candidate_list_price: candidateListPrice,
          comparisonCandidateListPrice: candidateListPrice,
          comparison_candidate_open_mall_price: candidateOpenMallPrice,
          comparisonCandidateOpenMallPrice: candidateOpenMallPrice,
          pricing: {
            ...draft.pricing,
            listPrice: null,
            platformLowestPrice: null,
            closedMallPrice: first.closedMallPrice,
            normalDiscountAmount: null,
            platformDiscountAmount: null,
            normalDiscountRate: null,
            platformDiscountRate: null,
            comparisonComplete: false,
            comparisonVerified: false,
            comparisonStatus: "pending_verification",
          },
          comparison: {
            listPrice: null,
            platformLowestPrice: null,
            closedMallPrice: first.closedMallPrice,
            normalDiscountAmount: null,
            platformDiscountAmount: null,
            normalDiscountRate: null,
            platformDiscountRate: null,
            verified: false,
            status: "pending_verification",
          },
        };
        const supplyProfile = {
          id: productId, product_id: productId, company_id: registrationCompanyId, product_name: first.productName,
          available_order_stock: first.stock,
          order_available_from: first.orderAvailableFrom,
          order_available_to: first.orderAvailableTo,
          shipping_fee: first.shippingFee,
          delivery_lead_days: first.deliveryLeadDays,
          minimum_order_quantity: first.minimumOrderQuantity,
          cancellation_order_amount: first.cancellationOrderAmount,
          product_image_url: first.representativeImageUrl,
          detail_product_video_url: first.detailProductVideoUrl || null,
          refund_return_policy: first.refundReturnPolicy,
          source_channel: "company_excel_bulk_publish",
        };
        const detailRecord = buildProductDraftCmsRecord(draft, "draft");
        Object.assign(detailRecord, sharedPriceFields, supplyProfile);
        Object.assign(detailRecord, {
          id: productId,
          product_id: productId,
          status: "approved",
          approval_status: "approved",
          product_approval_status: "approved",
          company_approval_status: "approved",
          moderation_status: "registered",
          source_channel: "company_excel_bulk_publish",
          approved_at: now,
          updated_at_iso: now,
        });
        const productRecord = buildProductCatalogCmsRecord(draft, "company_excel_bulk_publish");
        Object.assign(productRecord, {
          id: productId,
          product_id: productId,
          status: first.saleStatus === "판매중지" ? "paused" : "active",
          approval_status: "approved",
          product_approval_status: "approved",
          company_approval_status: "approved",
          moderation_status: "registered",
          ...sharedPriceFields,
          ...(supplyProfile as Record<string, unknown>),
          approved_at: now,
          updated_at_iso: now,
        });
        const optionRecords = buildProductOptionCmsRecords(draft, "company_excel_bulk_publish").map((optionRecord) => ({
          ...optionRecord,
          status: productRecord.status === "paused" ? "suspended" : "active",
        }));
        await saveCompanyProduct({
          detailPage: detailRecord,
          product: productRecord,
          options: optionRecords,
          supplyProfile,
          operation: "bulk",
        });
        savedProductCount += 1;
        index += 1;
      }
      setImportState({ status: "saved", message: `${savedProductCount}개 상품을 저장했고 폐쇄몰과 모바일 노출 갱신을 요청했습니다.` });
      window.alert("업로드 되었습니다.\n상품 목록과 폐쇄몰 화면에 반영되었습니다.");
    } catch (error) {
      setImportState({ status: "error", message: error instanceof Error ? `상품 일괄 등록에 실패했습니다. ${error.message}` : "상품 일괄 등록에 실패했습니다." });
    }
  }

  return (
    <section className="grid gap-4">
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">엑셀 상품등록</p>
            <h2 className="mt-1 text-xl font-normal">상품을 한 번에 등록합니다</h2>
            <p className="mt-2 text-sm leading-6">양식을 내려받아 상품 정보를 입력한 뒤 업로드하면 먼저 미리보기 목록을 보여줍니다. 상품 업로드 버튼을 누른 뒤에만 실제 상품 DB와 폐쇄몰 노출 데이터가 저장됩니다.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-normal text-emerald-800 ring-1 ring-emerald-200">즉시등록 방식</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button type="button" onClick={downloadVerifiedExcelTemplate} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">검증된 XLSX 상품등록 양식 다운로드</button>
          <button type="button" onClick={() => downloadCsv(`A5Mall_상품등록양식_${today()}.csv`, productImportHeaders, productImportTemplateRows)} className="rounded-md bg-white px-4 py-3 text-sm font-normal text-slate-950 ring-1 ring-emerald-200">CSV 양식 다운로드</button>
          <button type="button" onClick={() => downloadCsv(`a5-company-products-${today()}.csv`, productHeaders, productRows)} className="rounded-md bg-white px-4 py-3 text-sm font-normal text-slate-950 ring-1 ring-emerald-200">현재 상품 목록 다운로드</button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-slate-500">업로드 파일</p>
            <h2 className="mt-1 text-xl font-normal text-slate-950">상품등록 파일 업로드</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">XLSX·XLS·CSV 파일을 지원합니다. 판매가는 폐쇄몰 최종 판매가로 그대로 저장합니다. 제품 사진과 상세 이미지는 URL로 등록하며, 상세상품 동영상 URL은 선택사항입니다.</p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">허용 카테고리: {allowedProductCategoryLabels.join(", ")}</div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values" onChange={(event) => void readProductImportFile(event.target.files?.[0] ?? null)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal text-slate-900" />
          <button type="button" onClick={() => void publishBulkProducts()} disabled={!companyScopeReady || !parsedRows.length || invalidRows.length > 0 || importState.status === "saving"} className="rounded-md bg-slate-950 px-5 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:opacity-40">현재 사업자로 상품 등록</button>
        </div>
        <p className={`mt-3 rounded-md px-3 py-2 text-sm ${companyScopeReady ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{companyScopeReady ? `${companySession?.displayName || "현재 로그인"} 사업자 계정으로 등록됩니다.` : "사업자 인증 정보가 확인되지 않았습니다. 다시 로그인해 주세요."}</p>
        {importState.message ? <p className={`mt-3 rounded-md px-3 py-2 text-sm ${importState.status === "error" ? "bg-red-50 text-red-700" : importState.status === "saved" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}>{importState.message}</p> : null}
        {parsedRows.length ? (
          <div className="mt-4 overflow-auto rounded-md border border-slate-200">
            <table className="min-w-[1260px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{["행번호", "상태", "상품명", "브랜드", "카테고리", "옵션", "원판매가", "오픈몰 판매가", "판매가", "할인률", "비교금액", "발주재고", "발주일정", "배송", "최소발주", "제품사진", "상세상품동영상"].map((header) => <th key={header} className="border-b border-slate-200 px-3 py-2 font-normal">{header}</th>)}</tr></thead>
              <tbody>{parsedRows.slice(0, 120).map((row) => <tr key={row.rowNo} className="border-b border-slate-100">
                <td className="px-3 py-2">{row.rowNo}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${row.errors.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{row.errors.length ? row.errors.join(", ") : "등록 가능"}</span></td>
                <td className="px-3 py-2 text-slate-950">{row.productName}</td><td className="px-3 py-2">{row.brandName}</td><td className="px-3 py-2">{row.shoppingMallCategory}</td><td className="px-3 py-2">{row.optionName}</td>
                <td className="px-3 py-2 text-right">확인 전</td><td className="px-3 py-2 text-right">확인 전</td><td className="px-3 py-2 text-right text-rose-600">{row.closedMallPrice.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">확인 전</td><td className="px-3 py-2 text-right">확인 전</td><td className="px-3 py-2 text-right">{row.stock.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">{row.orderAvailableFrom}~{row.orderAvailableTo}</td><td className="px-3 py-2 text-right">d+{row.deliveryLeadDays} / {row.shippingFee.toLocaleString()}원</td><td className="px-3 py-2 text-right">{row.minimumOrderQuantity}개</td>
                <td className="max-w-52 truncate px-3 py-2 text-xs text-slate-500">{row.representativeImageUrl || "미입력"}</td><td className="max-w-52 truncate px-3 py-2 text-xs text-slate-500">{row.detailProductVideoUrl || "선택사항"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-normal tracking-[0.14em] text-slate-500">운영 보조 다운로드</p><h2 className="mt-1 text-lg font-normal text-slate-950">주문과 송장 자료 내려받기</h2></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => downloadCsv(`a5-company-orders-${today()}.csv`, orderHeaders, orderRows)} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">주문 CSV</button><button type="button" onClick={() => downloadCsv(`a5-invoice-upload-template-${today()}.csv`, invoiceHeaders, orderRows)} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">송장 양식 CSV</button></div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">{[["주문", `${orderRows.length}건`], ["상품/옵션", `${productRows.length}건`], ["저장 경로", "products, product_options, product_detail_pages"]].map(([label, value]) => <div key={label} className="rounded-md bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-xs font-normal text-slate-500">{label}</p><p className="mt-1 text-base font-normal text-slate-950">{value}</p></div>)}</div>
      </section>
    </section>
  );
}
const productImportTemplateUrl = "/templates/a5-mall-company-product-bulk-upload.xlsx";

function downloadVerifiedExcelTemplate() {
  const anchor = document.createElement("a");
  anchor.href = productImportTemplateUrl;
  anchor.download = "A5Mall_공급사_상품대량등록_양식.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
