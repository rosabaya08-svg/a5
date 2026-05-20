import type { StorefrontBenefit } from "@/types/mockStorefrontView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockStoreBenefitStrip({ benefits }: { benefits: StorefrontBenefit[] }) {
  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {benefits.map((benefit) => (
        <article key={benefit.id} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
          <h3 className="text-lg font-black text-slate-950">{benefit.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {benefit.riskStatuses.map((status) => (
              <RiskStatusBadge key={status} status={status} />
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

