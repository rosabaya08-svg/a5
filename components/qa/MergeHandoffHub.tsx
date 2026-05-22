import { qaHandoffSteps } from "@/data/qa/routeHubMock";

export function MergeHandoffHub() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-200">Merge handoff</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black sm:text-5xl">Worktree merge sequence and blockers</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            A browser-readable handoff for the next human review day. It keeps the mock/test beta merge order explicit
            and leaves production integrations blocked.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Merge order</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {qaHandoffSteps.map((step) => (
              <article key={step.order} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                    {step.order}
                  </span>
                  <div>
                    <h3 className="font-black text-slate-950">{step.title}</h3>
                    <p className="text-sm font-semibold text-slate-500">{step.owner}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-4">
          {qaHandoffSteps.map((step) => (
            <section key={`${step.order}-${step.title}`} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">{step.order}</span>
                <h2 className="text-xl font-black text-slate-950">{step.title}</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 ring-1 ring-blue-200">
                  {step.owner}
                </span>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Inputs</h3>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
                    {step.inputs.map((item) => (
                      <li key={item} className="rounded-md bg-slate-50 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Exit criteria</h3>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-emerald-900">
                    {step.exitCriteria.map((item) => (
                      <li key={item} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900">Blockers</h3>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-rose-900">
                    {step.blockers.map((item) => (
                      <li key={item} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
                        {item}
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

