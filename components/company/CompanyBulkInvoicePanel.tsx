"use client";

import { useMemo, useState } from "react";

export type CompanyCarrierOption = {
  code: string;
  name: string;
  shippingEnabled: boolean;
};

type BulkInvoiceItem = {
  id: string;
  orderNo: string;
  productName: string;
  optionName: string;
  deliveryStatus: string;
};

export type BulkInvoiceRow = {
  itemId: string;
  orderNo: string;
  carrierCode: string;
  invoiceNumber: string;
  deliveryStatus: string;
};

export function CompanyBulkInvoicePanel({
  items,
  carriers,
  disabled,
  onSubmit,
}: {
  items: BulkInvoiceItem[];
  carriers: CompanyCarrierOption[];
  disabled: boolean;
  onSubmit: (rows: BulkInvoiceRow[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<BulkInvoiceRow[]>([]);
  const [message, setMessage] = useState(
    "양식을 내려받아 택배사코드와 송장번호를 입력한 뒤 업로드하세요. 한 번에 최대 100건을 처리합니다.",
  );
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const carrierByCode = useMemo(() => new Map(carriers.map((carrier) => [carrier.code, carrier])), [carriers]);

  async function downloadTemplate() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "A5 Mall";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("송장등록");
    sheet.columns = [
      { header: "주문번호", key: "orderNo", width: 24 },
      { header: "주문고유번호", key: "itemId", width: 34 },
      { header: "택배사코드", key: "carrierCode", width: 16 },
      { header: "송장번호", key: "invoiceNumber", width: 28 },
    ];
    items
      .filter((item) => item.deliveryStatus === "invoice_pending")
      .slice(0, 100)
      .forEach((item) =>
        sheet.addRow({
          orderNo: item.orderNo,
          itemId: item.id,
          carrierCode: "",
          invoiceNumber: "",
        }),
      );
    styleHeader(sheet.getRow(1));
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: `D${Math.max(sheet.rowCount, 1)}` };
    sheet.getColumn(1).numFmt = "@";
    sheet.getColumn(2).numFmt = "@";
    sheet.getColumn(3).numFmt = "@";
    sheet.getColumn(4).numFmt = "@";
    sheet.getColumn(3).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'택배사코드'!$A$2:$A$${Math.max(carriers.length + 1, 2)}`],
        };
      }
    });

    const carrierSheet = workbook.addWorksheet("택배사코드");
    carrierSheet.columns = [
      { header: "택배사코드", key: "code", width: 16 },
      { header: "택배사명", key: "name", width: 24 },
      { header: "송장등록 가능", key: "enabled", width: 18 },
    ];
    carriers.forEach((carrier) =>
      carrierSheet.addRow({
        code: carrier.code,
        name: carrier.name,
        enabled: carrier.shippingEnabled ? "가능" : "업무코드(배송 불가)",
      }),
    );
    styleHeader(carrierSheet.getRow(1));
    carrierSheet.views = [{ state: "frozen", ySplit: 1 }];
    carrierSheet.autoFilter = { from: "A1", to: `C${Math.max(carrierSheet.rowCount, 1)}` };
    carrierSheet.getColumn(1).numFmt = "@";

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `A5Mall_송장등록_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  async function readFile(file?: File) {
    if (!file) return;
    try {
      const parsed = /\.xlsx$/i.test(file.name) ? await readXlsx(file) : readDelimited(await file.text());
      const normalized = parsed
        .map((row) => ({
          itemId: text(row["주문고유번호"] ?? row["주문상품ID"] ?? row.itemId ?? row.orderItemId),
          orderNo: text(row["주문번호"] ?? row.orderNo),
          carrierCode: text(row["택배사코드"] ?? row.carrierCode).replace(/\D/g, ""),
          invoiceNumber: text(row["송장번호"] ?? row.invoiceNumber ?? row.invoiceNo),
          deliveryStatus: "invoice_entered",
        }))
        .filter((row) => row.itemId || row.orderNo || row.carrierCode || row.invoiceNumber);

      const invalid = normalized.filter(
        (row) => !row.itemId || !row.orderNo || !row.carrierCode || !row.invoiceNumber,
      );
      const duplicateIds = normalized.filter(
        (row, index, list) => list.findIndex((candidate) => candidate.itemId === row.itemId) !== index,
      );
      const unknownItems = normalized.filter((row) => !itemById.has(row.itemId));
      const mismatchedOrders = normalized.filter((row) => itemById.get(row.itemId)?.orderNo !== row.orderNo);
      const invalidCarriers = normalized.filter((row) => {
        const carrier = carrierByCode.get(row.carrierCode);
        return !carrier || !carrier.shippingEnabled;
      });

      if (!normalized.length) throw new Error("송장 등록 행이 없습니다.");
      if (normalized.length > 100) throw new Error("한 번에 100건까지만 업로드할 수 있습니다.");
      if (invalid.length) {
        throw new Error(`필수값이 빠진 행이 ${invalid.length}건 있습니다. 네 개 열을 모두 입력해 주세요.`);
      }
      if (duplicateIds.length) throw new Error(`중복 주문고유번호가 ${duplicateIds.length}건 있습니다.`);
      if (unknownItems.length) throw new Error(`현재 업체 주문에 없는 주문고유번호가 ${unknownItems.length}건 있습니다.`);
      if (mismatchedOrders.length) {
        throw new Error(`주문번호와 주문고유번호가 일치하지 않는 행이 ${mismatchedOrders.length}건 있습니다.`);
      }
      if (invalidCarriers.length) {
        throw new Error(`등록할 수 없는 택배사코드가 ${invalidCarriers.length}건 있습니다.`);
      }

      setRows(normalized);
      setMessage(`${normalized.length}건을 읽었습니다. 서버 소유권·중복 송장 검증 후 등록할 수 있습니다.`);
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
        <p className="text-xs leading-5 text-slate-600">
          양식 열 순서는 비즈마켓 호환 구조인 주문번호·주문고유번호·택배사코드·송장번호입니다.
          업로드에 없는 주문은 변경하지 않습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadTemplate()}
            className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm text-blue-900"
          >
            송장 양식·택배사코드 다운로드
          </button>
          <label className="cursor-pointer rounded-md border border-blue-300 bg-white px-4 py-2 text-sm text-blue-900">
            송장 파일 선택
            <input
              type="file"
              accept=".xlsx,.csv,.tsv"
              onChange={(event) => void readFile(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            disabled={disabled || !rows.length}
            onClick={() => void onSubmit(rows)}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {rows.length || 0}건 서버 검증·등록
          </button>
        </div>
        {rows.length ? (
          <div className="max-h-56 overflow-auto rounded-md border border-blue-100 bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  <th className="p-2">주문번호</th>
                  <th className="p-2">주문고유번호</th>
                  <th className="p-2">상품</th>
                  <th className="p-2">택배사</th>
                  <th className="p-2">송장번호</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const item = itemById.get(row.itemId);
                  const carrier = carrierByCode.get(row.carrierCode);
                  return (
                    <tr key={row.itemId} className="border-t border-slate-100">
                      <td className="p-2">{row.orderNo}</td>
                      <td className="p-2">{row.itemId}</td>
                      <td className="p-2">
                        {[item?.productName, item?.optionName].filter(Boolean).join(" / ")}
                      </td>
                      <td className="p-2">
                        {carrier ? `${carrier.name} (${carrier.code})` : row.carrierCode}
                      </td>
                      <td className="p-2">{row.invoiceNumber}</td>
                    </tr>
                  );
                })}
              </tbody>
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
  const sheet = workbook.getWorksheet("송장등록") ?? workbook.worksheets[0];
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

function styleHeader(row: import("exceljs").Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 24;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function text(value: unknown) {
  if (value && typeof value === "object" && "text" in value) {
    return String((value as { text?: unknown }).text ?? "").trim();
  }
  return String(value ?? "").trim();
}
