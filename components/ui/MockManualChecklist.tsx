import type { ManualChecklistItem } from "@/types/mockQaView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const stateLabels: Record<ManualChecklistItem["state"], string> = {
  todo: "Todo",
  blocked: "Blocked in unattended mode",
  manual_only: "Manual only",
};

export function MockManualChecklist({ items }: { items: ManualChecklistItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Manual checklist</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Next working day checks</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-white">
                  {item.commandOrRoute}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {stateLabels[item.state]}
              </span>
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

