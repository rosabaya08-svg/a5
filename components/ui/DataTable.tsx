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
  emptyMessage = "표시할 mock 데이터가 없습니다.",
  isLoading = false,
  errorMessage,
  sortLabel,
  paginationLabel,
}: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {(sortLabel || paginationLabel) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
          <span>{sortLabel ?? "정렬: 최신 업데이트순"}</span>
          <span>{paginationLabel ?? `1-${Math.max(rows.length, 1)} / ${rows.length}`}</span>
        </div>
      )}
      {errorMessage ? (
        <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-black">오류 상태 mock</p>
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
          <p className="text-base font-black text-slate-950">검색 결과 없음</p>
          <p className="mt-2 text-sm text-slate-600">{emptyMessage}</p>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-black uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="align-top transition hover:bg-slate-50">
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`} className="px-4 py-3 text-slate-700">
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
