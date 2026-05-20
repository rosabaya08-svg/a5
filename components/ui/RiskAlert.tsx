import type { RiskItem } from "@/types/commerce";

const severityClasses: Record<RiskItem["severity"], string> = {
  high: "border-red-200 bg-red-50 text-red-950",
  medium: "border-amber-200 bg-amber-50 text-amber-950",
  low: "border-slate-200 bg-slate-50 text-slate-900",
};

export function RiskAlert({ risks }: { risks: RiskItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-bold text-slate-950">차단/주의 항목</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          BLOCKERS
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {risks.map((risk) => (
          <article key={risk.id} className={`rounded-md border p-3 ${severityClasses[risk.severity]}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{risk.title}</p>
              <span className="text-xs font-semibold">{risk.owner}</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-700">{risk.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
