import type { ReleaseReadinessItem } from "@/types/mockQaView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockReleaseReadiness({ items }: { items: ReleaseReadinessItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Release readiness</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Live launch blockers remain closed</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-md bg-slate-50 p-3">
            <h3 className="text-lg font-black text-slate-950">{item.area}</h3>
            <dl className="mt-3 grid gap-3 text-sm">
              <div>
                <dt className="font-bold text-slate-500">Requirement</dt>
                <dd className="mt-1 leading-6 text-slate-700">{item.requirement}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Current state</dt>
                <dd className="mt-1 leading-6 text-slate-700">{item.currentState}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Required before live</dt>
                <dd className="mt-1 leading-6 text-slate-700">{item.requiredBeforeLive}</dd>
              </div>
            </dl>
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

