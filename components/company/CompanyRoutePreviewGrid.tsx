import Link from "next/link";
import type { CompanyRoutePreview } from "@/data/company/statusMock";

const statusTone: Record<CompanyRoutePreview["status"], string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-950",
  mock: "border-blue-200 bg-blue-50 text-blue-950",
  blocked: "border-red-200 bg-red-50 text-red-950",
};

export function CompanyRoutePreviewGrid({
  routes,
  companyId,
}: {
  routes: CompanyRoutePreview[];
  companyId: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
          Preview hub / company_id: {companyId}
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">Route Preview Grid</h2>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {routes.map((route) => (
          <article key={route.href} className={`rounded-md border p-4 ${statusTone[route.status]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  {route.group}
                </p>
                <h3 className="mt-1 text-base font-bold">{route.label}</h3>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-slate-200">
                {route.status}
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">{route.href}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{route.coverage}</p>
            <div className="mt-3 rounded-md bg-white/70 p-3 text-xs leading-5 text-slate-600">
              <p><strong>Blocker:</strong> {route.blocker}</p>
              <p className="mt-1"><strong>Next:</strong> {route.nextTask}</p>
            </div>
            <Link
              href={route.href}
              className="mt-4 inline-flex rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            >
              Open mock route
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
