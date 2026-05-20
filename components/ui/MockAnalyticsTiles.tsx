import type { AnalyticsTile } from "@/types/mockAnalyticsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockAnalyticsTiles({ tiles }: { tiles: AnalyticsTile[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <article key={tile.id} className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-600">{tile.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{tile.value}</p>
          <p className="mt-1 text-xs font-bold text-emerald-700">{tile.trendLabel}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{tile.helper}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tile.riskStatuses.map((status) => (
              <RiskStatusBadge key={status} status={status} />
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

