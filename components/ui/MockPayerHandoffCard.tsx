import type { PayerHandoff } from "@/types/mockSessionLifecycle";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const typeLabels: Record<PayerHandoff["type"], string> = {
  purchase: "구매",
  ask: "조르기 결제",
};

export function MockPayerHandoffCard({ handoffs }: { handoffs: PayerHandoff[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {handoffs.map((handoff) => (
        <article key={handoff.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                {typeLabels[handoff.type]}
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">{handoff.shortCode}</h3>
              <p className="mt-1 text-sm font-bold text-slate-600">{handoff.payerRole}</p>
            </div>
              <span className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">모바일</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{handoff.displayMessage}</p>
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{handoff.expiryMessage}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {handoff.riskStatuses.map((status) => (
              <RiskStatusBadge key={status} status={status} />
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
