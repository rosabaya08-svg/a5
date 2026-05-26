import type { OperationMetric } from "@/types/mockOperationsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const trackLabels: Record<OperationMetric["track"], string> = {
  admin: "최고관리자",
  company: "기업 관리자",
  nursery: "조리원 관리자",
  tablet_qr: "태블릿/QR",
  firebase_contract: "파이어베이스 계약",
  qa: "품질 점검",
};

export function MockMetricGrid({ metrics }: { metrics: OperationMetric[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                {trackLabels[metric.track]}
              </p>
              <h3 className="mt-1 text-sm font-black text-slate-950">{metric.label}</h3>
            </div>
            <p className="text-3xl font-black text-slate-950">{metric.value}</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{metric.helper}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {metric.riskStatuses.map((status) => (
              <RiskStatusBadge key={status} status={status} />
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
