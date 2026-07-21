import type { ReactNode } from "react";

export type DataTableRow = {
  id: string;
  cells: ReactNode[];
};

type DataTableProps = {
  columns: string[];
  rows: DataTableRow[];
  emptyMessage?: string;
  isLoading?: boolean;
  errorMessage?: string;
  sortLabel?: string;
  paginationLabel?: string;
};

export function DataTable({
  columns,
  rows,
  emptyMessage = "표시할 데이터가 없습니다.",
  isLoading = false,
  errorMessage,
  sortLabel,
  paginationLabel,
}: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-slate-300 bg-white">
      {(sortLabel || paginationLabel) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-normal text-slate-600">
          <span>{sortLabel ?? "정렬: 최신 업데이트순"}</span>
          <span>{paginationLabel ?? `1-${Math.max(rows.length, 1)} / ${rows.length}`}</span>
        </div>
      )}
      {errorMessage ? (
        <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-normal">오류가 발생했습니다</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-2 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-base font-normal text-slate-950">검색 결과 없음</p>
          <p className="mt-2 text-sm text-slate-600">{emptyMessage}</p>
        </div>
      ) : (
        <div className="a5-console-scrollbar overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-normal uppercase tracking-[0.04em] text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="whitespace-nowrap border-b border-r border-slate-300 px-3 py-2 last:border-r-0">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="align-top transition hover:bg-slate-50">
                  {row.cells.map((cell, index) => (
                    <td key={`${row.id}-${index}`} className="border-b border-r border-slate-200 px-3 py-2 text-slate-700 last:border-r-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
