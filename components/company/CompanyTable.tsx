import type { ReactNode } from "react";
import { CompanyDataTable, CompanyFilterSearchSort, type CompanyTableRow } from "@/components/company/companyAdminWidgets";

export type CompanyColumnSpec = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export function CompanyTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: CompanyColumnSpec[];
  rows: CompanyTableRow[];
  emptyLabel?: string;
}) {
  return (
    <CompanyDataTable
      columns={columns.map((column) => column.label)}
      rows={rows}
      emptyLabel={emptyLabel}
    />
  );
}

export function CompanyTableToolbar({
  title,
  query,
  sort,
  chips,
  action,
}: {
  title: string;
  query: string;
  sort: string;
  chips: string[];
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <CompanyFilterSearchSort title={title} query={query} sort={sort} chips={chips} />
      {action ? <div className="flex justify-end">{action}</div> : null}
    </div>
  );
}
