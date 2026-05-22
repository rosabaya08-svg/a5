import type { ReactNode } from "react";
import { DataTable, type DataTableRow } from "@/components/ui/DataTable";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPagination,
  AdminSearchSortBar,
} from "@/components/admin/AdminMockWidgets";

export function AdminDataSurface({
  title,
  searchLabel,
  searchValue,
  filters,
  sortOptions,
  activeSort,
  columns,
  rows,
  emptyTitle,
  emptyDescription,
  errorCode,
  errorDescription,
  footer,
}: {
  title: string;
  searchLabel: string;
  searchValue: string;
  filters: string[];
  sortOptions: string[];
  activeSort: string;
  columns: string[];
  rows: DataTableRow[];
  emptyTitle: string;
  emptyDescription: string;
  errorCode?: string;
  errorDescription?: string;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <div className="mt-4">
        <AdminSearchSortBar
          searchLabel={searchLabel}
          searchValue={searchValue}
          filters={filters}
          sortOptions={sortOptions}
          activeSort={activeSort}
          resultCount={rows.length}
        />
      </div>
      {errorCode && errorDescription ? (
        <AdminErrorState title="Mock query warning" description={errorDescription} code={errorCode} />
      ) : rows.length === 0 ? (
        <AdminEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <AdminPagination page={1} pageSize={10} total={rows.length} />
        </>
      )}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
