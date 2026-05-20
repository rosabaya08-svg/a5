import type { DashboardMetric } from "@/types/commerce";

const toneClasses: Record<NonNullable<DashboardMetric["tone"]>, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  red: "border-red-200 bg-red-50 text-red-950",
  purple: "border-violet-200 bg-violet-50 text-violet-950",
  neutral: "border-slate-200 bg-white text-slate-950",
};

export function StatCard({ metric }: { metric: DashboardMetric }) {
  const tone = metric.tone ?? "neutral";

  return (
    <section className={`rounded-md border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-medium text-slate-600">{metric.label}</p>
      <p className="mt-2 text-2xl font-bold">{metric.value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{metric.helper}</p>
    </section>
  );
}
