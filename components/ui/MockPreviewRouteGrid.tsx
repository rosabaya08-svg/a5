import Link from "next/link";
import type { MockPreviewRoute } from "@/types/mockPreviewRoute";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const areaLabels: Record<MockPreviewRoute["area"], string> = {
  storefront: "Storefront",
  checkout: "Checkout",
  session: "Session",
  operations: "Operations",
  qa: "QA",
  analytics: "Analytics",
  detail: "Detail",
};

export function MockPreviewRouteGrid({ routes }: { routes: MockPreviewRoute[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Preview routes</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Mock UI route index</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          Manual smoke later
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {routes.map((route) => (
          <Link
            key={route.id}
            href={route.href}
            className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-950 hover:bg-white"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              {areaLabels[route.area]}
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">{route.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{route.description}</p>
            <p className="mt-3 text-sm font-black text-slate-950">{route.href}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {route.riskStatuses.map((status) => (
                <RiskStatusBadge key={status} status={status} />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

