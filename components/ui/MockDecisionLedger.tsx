import type { JourneyDecision } from "@/types/mockJourneyView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockDecisionLedger({ decisions }: { decisions: JourneyDecision[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Decision ledger</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Safe mock choices before live work</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {decisions.map((decision) => (
          <article key={decision.id} className="rounded-md border border-slate-200 p-3">
            <h3 className="font-black text-slate-950">{decision.title}</h3>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-800">Safe mock choice</p>
                <p className="mt-1 leading-6 text-slate-700">{decision.safeMockChoice}</p>
              </div>
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-red-700">Live requirement</p>
                <p className="mt-1 leading-6 text-slate-700">{decision.liveRequirement}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {decision.riskStatuses.map((status) => (
                <RiskStatusBadge key={status} status={status} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

