import Link from "next/link";
import type { AdminRoutePreview } from "@/data/admin/statusMock";

const statusClass: Record<AdminRoutePreview["status"], string> = {
  ready_mock: "border-emerald-200 bg-emerald-50 text-emerald-950",
  partial_mock: "border-amber-200 bg-amber-50 text-amber-950",
  blocked_real_connection: "border-red-200 bg-red-50 text-red-950",
};

const groupClass: Record<string, string> = {
  Core: "bg-blue-50 text-blue-800 ring-blue-200",
  Partners: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  "Nursery Ops": "bg-teal-50 text-teal-800 ring-teal-200",
  Commerce: "bg-violet-50 text-violet-800 ring-violet-200",
  Money: "bg-amber-50 text-amber-800 ring-amber-200",
  "External Ops": "bg-red-50 text-red-800 ring-red-200",
  Governance: "bg-slate-100 text-slate-800 ring-slate-200",
};

function StatusLabel({ status }: { status: AdminRoutePreview["status"] }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function AdminRoutePreviewGrid({ routes }: { routes: AdminRoutePreview[] }) {
  const groups = Array.from(new Set(routes.map((route) => route.group)));

  return (
    <section className="grid gap-5">
      {groups.map((group) => (
        <div key={group} className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">{group}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${groupClass[group] ?? groupClass["Governance"]}`}>
              {routes.filter((route) => route.group === group).length} routes
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {routes
              .filter((route) => route.group === group)
              .map((route) => (
                <article key={route.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{route.group}</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">{route.title}</h3>
                    </div>
                    <StatusLabel status={route.status} />
                  </div>
                  <Link
                    href={route.path}
                    className="mt-3 inline-flex w-full items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 hover:bg-blue-100"
                  >
                    <span>{route.path}</span>
                    <span aria-hidden="true">Open</span>
                  </Link>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="font-bold text-slate-950">Coverage</dt>
                      <dd className="mt-1 leading-6 text-slate-600">{route.coverage}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-950">Blocker</dt>
                      <dd className="mt-1 leading-6 text-red-700">{route.blocker}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-950">Next task</dt>
                      <dd className="mt-1 leading-6 text-slate-600">{route.nextTask}</dd>
                    </div>
                  </dl>
                </article>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}
