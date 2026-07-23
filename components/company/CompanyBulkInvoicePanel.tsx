"use client";

import { useState } from "react";

type BulkInvoiceItem = {
  id: string;
  orderNo: string;
  productName: string;
  optionName: string;
  deliveryStatus: string;
};

type BulkInvoiceRow = {
  itemId: string;
  orderNo: string;
  productName: string;
  carrierCode: string;
  invoiceNumber: string;
  deliveryStatus: string;
};

export function CompanyBulkInvoicePanel({
  items,
  disabled,
  onSubmit,
}: {
  items: BulkInvoiceItem[];
  disabled: boolean;
  onSubmit: (rows: BulkInvoiceRow[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<BulkInvoiceRow[]>([]);
  const [message, setMessage] = useState("양식을 내려받아 송장번호를 입력한 뒤 업로드하세요. 한 번에 최대 100건을 처리합니다.");

  async function downloadTemplate() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("송장등록");
    sheet.columns = [
      { header: "주문상품ID", key: "itemId", width: 32 },
      { header: "주문번호", key: "orderNo", width: 24 },
      { header: "상품명", key: "productName", width: 36 },
      { header: "택배사코드", key: "carrierCode", width: 18 },
      { header: "송장번호", key: "invoiceNumber", width: 24 },
      { header: "배송상태", key: "deliveryStatus", width: 18 },
    ];
    items
      .filter((item) => item.deliveryStatus === "invoice_pending")
      .slice(0, 100)
      .forEach((item) => sheet.addRow({
        itemId: item.id,
        orderNo: item.orderNo,
        productName: [item.productName, item.optionName].filter(Boolean).join(" / "),
        carrierCode: "",
        invoiceNumber: "",
        deliveryStatus: "invoice_entered",
      }));
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `A5Mall_송장등록_${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function readFile(file?: File) {
    if (!file) return;
    try {
      const parsed = /\.xlsx$/i.test(file.name) ? await readXlsx(file) : readDelimited(await file.text());
      const normalized = parsed
        .map((row) => ({
          itemId: text(row["주문상품ID"] ?? row.itemId),
          orderNo: text(row["주문번호"] ?? row.orderNo),
          productName: text(row["상품명"] ?? row.productName),
          carrierCode: text(row["택배사코드"] ?? row.carrierCode),
          invoiceNumber: text(row["송장번호"] ?? row.invoiceNumber),
          deliveryStatus: text(row["배송상태"] ?? row.deliveryStatus) || "invoice_entered",
        }))
        .filter((row) => row.itemId || row.invoiceNumber);
      const invalid = normalized.filter((row) => !row.itemId || !row.invoiceNumber);
      const duplicateIds = normalized.filter((row, index, list) => list.findIndex((candidate) => candidate.itemId === row.itemId) !== index);
      if (!normalized.length) throw new Error("송장 등록 행이 없습니다.");
      if (normalized.length > 100) throw new Error("한 번에 100건까지만 업로드할 수 있습니다.");
      if (invalid.length) throw new Error(`주문상품ID 또는 송장번호가 빠진 행이 ${invalid.length}건 있습니다.`);
      if (duplicateIds.length) throw new Error(`중복 주문상품ID가 ${duplicateIds.length}건 있습니다.`);
      setRows(normalized);
      setMessage(`${normalized.length}건을 읽었습니다. 서버 검증 후 등록 버튼을 눌러 주세요.`);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    }
  }

  return (
    <details className="rounded-md border border-blue-200 bg-blue-50 p-4">
      <summary className="cursor-pointer text-base font-medium text-slate-950">대량 송장 등록</summary>
      <div className="mt-4 grid gap-3">
        <p className="text-sm text-slate-700">{message}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void downloadTemplate()} className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm text-blue-900">엑셀 양식 다운로드</button>
          <label className="cursor-pointer rounded-md border border-blue-300 bg-white px-4 py-2 text-sm text-blue-900">
            엑셀 업로드
            <input type="file" accept=".xlsx,.csv,.tsv" onChange={(event) => void readFile(event.target.files?.[0])} className="sr-only" />
          </label>
          <button type="button" disabled={disabled || !rows.length} onClick={() => void onSubmit(rows)} className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-40">{rows.length || 0}건 서버 검증·등록</button>
        </div>
        {rows.length ? (
          <div className="max-h-56 overflow-auto rounded-md border border-blue-100 bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">주문번호</th><th className="p-2">상품</th><th className="p-2">택배사</th><th className="p-2">송장번호</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.itemId} className="border-t border-slate-100"><td className="p-2">{row.orderNo}</td><td className="p-2">{row.productName}</td><td className="p-2">{row.carrierCode || "미입력"}</td><td className="p-2">{row.invoiceNumber}</td></tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </div>
    </details>
  );
}

async function readXlsx(file: File) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()) as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(text);
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values as unknown[]).slice(1);
    if (!values.some((value) => text(value))) return;
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  });
  return rows;
}

function readDelimited(source: string) {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function text(value: unknown) {
  if (value && typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text ?? "").trim();
  return String(value ?? "").trim();
}
