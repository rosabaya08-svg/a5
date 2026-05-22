import { CompanyRiskBadge, CompanySoftPill } from "@/components/company/companyAdminWidgets";
import type { CompanyRiskSeverity, CompanyRiskStatus } from "@/types/company";

export type CompanyRiskPreset =
  | "storage_pending"
  | "missing_pg_docs"
  | "missing_delivery_api"
  | "missing_external_inventory_api";

const presetMap: Record<CompanyRiskPreset, { label: string; severity: CompanyRiskSeverity; status: CompanyRiskStatus }> = {
  storage_pending: { label: "Storage 보류", severity: "medium", status: "blocked" },
  missing_pg_docs: { label: "PG 문서 없음", severity: "high", status: "blocked" },
  missing_delivery_api: { label: "배송 API 없음", severity: "medium", status: "watching" },
  missing_external_inventory_api: { label: "외부 재고 API 없음", severity: "high", status: "blocked" },
};

export function CompanyRiskPresetBadge({ preset }: { preset: CompanyRiskPreset }) {
  const item = presetMap[preset];

  return (
    <span className="inline-flex items-center gap-2">
      <CompanyRiskBadge severity={item.severity} status={item.status} />
      <CompanySoftPill tone="neutral">{item.label}</CompanySoftPill>
    </span>
  );
}

export function CompanyRiskLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(presetMap) as CompanyRiskPreset[]).map((preset) => (
        <CompanyRiskPresetBadge key={preset} preset={preset} />
      ))}
    </div>
  );
}
