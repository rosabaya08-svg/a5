import type { AdminRiskBadgeStatus } from "@/types/admin";

const riskBadgeClasses: Record<AdminRiskBadgeStatus, string> = {
  mock_ready: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  blocked: "bg-red-100 text-red-800 ring-red-200",
  needs_approval: "bg-amber-100 text-amber-900 ring-amber-200",
  production_forbidden: "bg-slate-900 text-white ring-slate-900",
  docs_required: "bg-blue-100 text-blue-800 ring-blue-200",
};

export function AdminRiskBadge({ status }: { status: AdminRiskBadgeStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${riskBadgeClasses[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
