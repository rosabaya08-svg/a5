import type { ReactNode } from "react";

export type OperationsTableColumn = {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  sticky?: "left" | "right";
};

export type OperationsTableRow = {
  id: string;
  cells: Record<string, ReactNode>;
};

type OperationsTableProps = {
  columns: OperationsTableColumn[];
  rows: OperationsTableRow[];
  caption?: string;
  emptyMessage?: string;
};

function alignClass(align: OperationsTableColumn["align"]) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function stickyClass(sticky: OperationsTableColumn["sticky"], isHeader = false) {
  if (sticky === "left") return `${isHeader ? "z-30" : "z-20"} sticky left-0 border-r border-slate-200 bg-inherit`;
  if (sticky === "right") return `${isHeader ? "z-30" : "z-20"} sticky right-0 border-l border-slate-200 bg-inherit`;
  return "";
}

export function OperationsTable({
  columns,
  rows,
  caption,
  emptyMessage = "표시할 데이터가 없습니다.",
}: OperationsTableProps) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {caption ? (
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-normal text-slate-600">
          {caption}
        </div>
      ) : null}
      <div className="a5-console-scrollbar overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-normal uppercase tracking-[0.04em] text-slate-600">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap border-b border-slate-300 px-3 py-2 ${alignClass(column.align)} ${stickyClass(column.sticky, true)}`}
                  style={column.width ? { minWidth: column.width } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.id} className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/55"} transition hover:bg-blue-50/70`}>
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.key}`}
                    className={`whitespace-nowrap px-3 py-2 align-middle text-slate-800 ${alignClass(column.align)} ${stickyClass(column.sticky)}`}
                    style={column.width ? { minWidth: column.width } : undefined}
                  >
                    {row.cells[column.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <div className="border-t border-slate-100 bg-white p-8 text-center text-sm font-normal text-slate-500">
          {emptyMessage}
        </div>
      ) : null}
    </section>
  );
}
