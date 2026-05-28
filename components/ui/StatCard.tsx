import type { DashboardMetric } from "@/types/commerce";

const toneClasses: Record<NonNullable<DashboardMetric["tone"]>, string> = {
  blue: "bg-blue-600",
  green: "bg-emerald-600",
  amber: "bg-amber-500",
  red: "bg-red-600",
  purple: "bg-violet-600",
  neutral: "bg-slate-500",
};

export function StatCard({ metric }: { metric: DashboardMetric }) {
  const tone = metric.tone ?? "neutral";

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
          <p className="mt-2 text-2xl font-black tracking-normal text-slate-950">{metric.value}</p>
        </div>
        <span className={`mt-1 h-8 w-1.5 rounded-full ${toneClasses[tone]}`} aria-hidden="true" />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{metric.helper}</p>
    </section>
  );
}
