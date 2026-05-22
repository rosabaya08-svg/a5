import { qaPreviewRoutes, type QaHubTone } from "@/data/qa/routeHubMock";

const toneClasses: Record<QaHubTone, string> = {
  ready: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  pending: "bg-blue-100 text-blue-800 ring-blue-200",
  blocked: "bg-rose-100 text-rose-800 ring-rose-200",
  risk: "bg-amber-100 text-amber-900 ring-amber-200",
};

function BetaNotice() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
      Mock/test beta only. No production open, no real Firebase, no real PG, no refund, no settlement, no deploy.
    </div>
  );
}

export function RouteIndexHub() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-200">QA route index</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black sm:text-5xl">Preview hub for mock beta routes</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            A browser-visible index for the routes that must be checked after the worktrees merge. Links are static and
            do not call live services.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <BetaNotice />
        {qaPreviewRoutes.map((group) => (
          <section key={group.title} className="grid gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{group.owner}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{group.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{group.summary}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.routes.map((route) => (
                <a
                  key={`${group.title}-${route.path}`}
                  href={route.path}
                  className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[route.tone]}`}>
                      {route.tone}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {route.viewport}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{route.label}</h3>
                  <p className="mt-2 font-mono text-sm font-bold text-blue-800">{route.path}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{route.expected}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {route.states.map((state) => (
                      <span key={state} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {state}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

