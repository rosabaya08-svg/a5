import { qaSmokeChecks } from "@/data/qa/routeHubMock";

export function VisualSmokeChecklist() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-200">Visual smoke checklist</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black sm:text-5xl">Manual browser review plan</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Use this screen after a human starts the app. It records what to look for without running build, lint,
            deploy, Firebase, or PG from unattended mode.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-950">
          Stop immediately if a route implies real payment, real refund, settlement payout, production Firebase, deploy,
          secrets, or external API execution.
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {qaSmokeChecks.map((section) => (
            <section key={section.area} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{section.viewport}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{section.area}</h2>
              <div className="mt-4 grid gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Checks</h3>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
                    {section.checks.map((check) => (
                      <li key={check} className="rounded-md bg-slate-50 px-3 py-2">
                        {check}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900">Blockers</h3>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-rose-900">
                    {section.blockers.map((blocker) => (
                      <li key={blocker} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

