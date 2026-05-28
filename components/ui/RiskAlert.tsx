import type { RiskItem } from "@/types/commerce";

const severityClasses: Record<RiskItem["severity"], string> = {
  high: "border-red-200 bg-red-50 text-red-950",
  medium: "border-amber-200 bg-amber-50 text-amber-950",
  low: "border-slate-200 bg-slate-50 text-slate-900",
};

const severityLabels: Record<RiskItem["severity"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export function RiskAlert({ risks }: { risks: RiskItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-black text-slate-950">주의 항목</h3>
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">risk</span>
      </div>
      <div className="mt-4 grid gap-2">
        {risks.map((risk) => (
          <article key={risk.id} className={`rounded-md border p-3 ${severityClasses[risk.severity]}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{risk.title}</p>
              <span className="text-xs font-black">{severityLabels[risk.severity]} · {risk.owner}</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-700">{risk.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
