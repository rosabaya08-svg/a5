import type { RiskStatus } from "@/types/mockUi";

const riskToneClasses: Record<RiskStatus, string> = {
  needs_review: "bg-amber-50 text-amber-900 ring-amber-200",
  blocked: "bg-red-50 text-red-800 ring-red-200",
  expired: "bg-slate-100 text-slate-700 ring-slate-200",
  payment_failed: "bg-red-50 text-red-800 ring-red-200",
  settlement_hold: "bg-violet-50 text-violet-800 ring-violet-200",
  inventory_low: "bg-orange-50 text-orange-900 ring-orange-200",
  integration_pending: "bg-blue-50 text-blue-800 ring-blue-200",
  mock_only: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

const riskLabels: Record<RiskStatus, string> = {
  needs_review: "검토 필요",
  blocked: "차단",
  expired: "만료",
  payment_failed: "결제 실패",
  settlement_hold: "정산 보류",
  inventory_low: "재고 부족",
  integration_pending: "연동 대기",
  mock_only: "모의 전용",
};

type RiskStatusBadgeProps = {
  status: RiskStatus;
  label?: string;
};

export function RiskStatusBadge({ status, label }: RiskStatusBadgeProps) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${riskToneClasses[status]}`}
    >
      {label ?? riskLabels[status]}
    </span>
  );
}
