import type { RiskDistributionItem } from "@/types/mockAnalyticsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockRiskDistribution({ items }: { items: RiskDistributionItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Risk distribution</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Mock-only status mix</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">{item.label}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.count} mock records</p>
              </div>
              <p className="text-2xl font-black text-slate-950">{item.percentage}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-slate-950" style={{ width: `${item.percentage}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.riskStatuses.map((status) => (
                <RiskStatusBadge key={status} status={status} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

