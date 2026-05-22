import Link from "next/link";
import {
  blockedItems,
  completedItems,
  generatedFileGroups,
  generatedScreens,
  humanChecks,
  integrationStatuses,
  nextTasks,
  progressEvents,
  route404Statuses,
  smokeRoutes,
  stateCoverage,
  statusDashboard,
  statusMetrics,
  worktreeRouteStatuses,
  worktreePorts,
  type StatusListItem,
  type StatusMetric,
  type StatusTone,
} from "@/data/my-app/statusMock";

const toneClasses: Record<StatusTone, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-950",
  progress: "border-blue-200 bg-blue-50 text-blue-950",
  blocked: "border-red-200 bg-red-50 text-red-950",
  mock: "border-violet-200 bg-violet-50 text-violet-950",
};

const badgeClasses: Record<StatusTone, string> = {
  complete: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  progress: "bg-blue-100 text-blue-800 ring-blue-200",
  blocked: "bg-red-100 text-red-800 ring-red-200",
  mock: "bg-violet-100 text-violet-800 ring-violet-200",
};

function ToneBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${badgeClasses[tone]}`}>
      {label}
    </span>
  );
}

function MetricCard({ metric }: { metric: StatusMetric }) {
  return (
    <article className={`rounded-md border p-4 ${toneClasses[metric.tone]}`}>
      <p className="text-sm font-bold text-slate-600">{metric.label}</p>
      <p className="mt-2 text-4xl font-black">{metric.value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{metric.helper}</p>
    </article>
  );
}

function StatusList({ title, subtitle, items }: { title: string; subtitle: string; items: StatusListItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{subtitle}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
          {items.length} items
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
              <ToneBadge tone={item.tone} label={item.tone} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RouteMap() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Browser smoke</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Route map</h2>
        </div>
        <ToneBadge tone="mock" label="manual check later" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">Route</th>
              <th className="px-3 py-3">Purpose</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {smokeRoutes.map((route) => (
              <tr key={route.id} className="align-top">
                <td className="px-3 py-3">
                  <Link href={route.route} className="font-black text-slate-950 underline-offset-4 hover:underline">
                    {route.route}
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-600">{route.purpose}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {route.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StateCoverageGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">State coverage</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Empty / loading / error / risk</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {stateCoverage.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-slate-950">{item.label}</h3>
              <ToneBadge tone={item.covered ? "complete" : "blocked"} label={item.covered ? "covered" : "gap"} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function IntegrationStatusGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Live integration status</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">All production connections remain closed</h2>
        </div>
        <ToneBadge tone="blocked" label="no live integration" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrationStatuses.map((item) => (
          <article key={item.id} className={`rounded-md border p-4 ${toneClasses[item.tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{item.name}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{item.state}</p>
              </div>
              <ToneBadge tone={item.tone} label={item.tone} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.summary}</p>
            <p className="mt-3 rounded-md bg-white/70 p-3 text-xs font-semibold leading-5 text-slate-700">
              Before live: {item.requiredBeforeLive}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FileGroupGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Generated file groups</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">What was created in this worktree</h2>
        </div>
        <ToneBadge tone="mock" label="static count" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {generatedFileGroups.map((group) => (
          <article key={group.id} className={`rounded-md border p-4 ${toneClasses[group.tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{group.label}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{group.path}</p>
              </div>
              <span className="rounded-md bg-white px-2.5 py-1 text-xl font-black ring-1 ring-black/5">
                {group.count}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{group.purpose}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorktreePortGuide() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Parallel worktree ports</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Manual browser check guide</h2>
        </div>
        <ToneBadge tone="progress" label="manual start" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {worktreePorts.map((item) => (
          <article key={item.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{item.folder}</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{item.track}</h3>
              </div>
              <span className="rounded-md bg-slate-950 px-3 py-2 text-sm font-black text-white">
                :{item.port}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.purpose}</p>
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-700">
              http://localhost:{item.port}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorktreeRouteStatusGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">All worktree route status</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Manual browser targets by track</h2>
        </div>
        <ToneBadge tone="progress" label="manual smoke pending" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {worktreeRouteStatuses.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  localhost:{item.port}
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{item.track}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p>
              </div>
              <span className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                {item.routeState}
              </span>
            </div>
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-black text-slate-950">
              status route: {item.statusRoute}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.keyRoutes.map((route) => (
                <span key={route} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                  {route}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Route404Matrix() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">404 status log</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Route-by-route 404 record</h2>
        </div>
        <ToneBadge tone="mock" label="static record" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">Route</th>
              <th className="px-3 py-3">Previous</th>
              <th className="px-3 py-3">Current</th>
              <th className="px-3 py-3">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {route404Statuses.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-3 py-3 font-black text-slate-950">{item.route}</td>
                <td className="px-3 py-3 text-slate-600">{item.previousState}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {item.currentState}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">{item.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProgressTimeline() {
  const stateTone: Record<(typeof progressEvents)[number]["state"], StatusTone> = {
    completed: "complete",
    deferred: "progress",
    blocked: "blocked",
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Progress timeline</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">What happened in this worktree</h2>
      </div>
      <ol className="mt-4 grid gap-3">
        {progressEvents.map((event, index) => (
          <li key={event.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Batch marker {index + 1}</p>
                <h3 className="mt-1 font-black text-slate-950">{event.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{event.detail}</p>
              </div>
              <ToneBadge tone={stateTone[event.state]} label={event.state} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StatusDashboard() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-5 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="overflow-hidden rounded-md bg-slate-950 text-white">
          <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
                Local worktree status dashboard
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
                {statusDashboard.track} mock/test beta status
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">
                {statusDashboard.liveWarning} This page is static mock data for browser review and does not query live data.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ToneBadge tone="mock" label={statusDashboard.mode} />
                <ToneBadge tone="blocked" label="not production" />
                <ToneBadge tone="blocked" label="no real payment" />
                <ToneBadge tone="blocked" label="no Firebase connection" />
              </div>
            </div>
            <aside className="rounded-md bg-white p-4 text-slate-950">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Route</p>
              <p className="mt-1 text-2xl font-black">{statusDashboard.route}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${statusDashboard.progressPercent}%` }} />
              </div>
              <p className="mt-2 text-sm font-bold text-slate-600">{statusDashboard.progressPercent}% mock preview ready</p>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Major files</dt>
                  <dd className="font-black">{statusDashboard.generatedMajorFileCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Routes</dt>
                  <dd className="font-black">{statusDashboard.generatedRouteCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Components</dt>
                  <dd className="font-black">{statusDashboard.generatedComponentCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Data/types</dt>
                  <dd className="font-black">{statusDashboard.generatedDataAndTypeCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Reports</dt>
                  <dd className="font-black">{statusDashboard.reportCount}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statusMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </section>

        <FileGroupGrid />

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <StatusList title="Generated screens" subtitle="route inventory" items={generatedScreens} />
          <StatusList title="Mock/test completed" subtitle="done" items={completedItems} />
        </section>

        <IntegrationStatusGrid />

        <WorktreePortGuide />

        <WorktreeRouteStatusGrid />

        <Route404Matrix />

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <StatusList title="Blocked live integrations" subtitle="blockers" items={blockedItems} />
          <StatusList title="Next tasks" subtitle="next 10" items={nextTasks} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <StatusList title="Human checks required" subtitle="manual review" items={humanChecks} />
          <RouteMap />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <StateCoverageGrid />
          <ProgressTimeline />
        </section>
      </div>
    </main>
  );
}
