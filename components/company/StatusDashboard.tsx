import { CompanyRoutePreviewGrid } from "@/components/company/CompanyRoutePreviewGrid";
import { companyRoutePreviews, companyStatusSummary } from "@/data/company/statusMock";

const toneClasses: Record<string, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-950",
  mock: "border-blue-200 bg-blue-50 text-blue-950",
  blocked: "border-red-200 bg-red-50 text-red-950",
  neutral: "border-slate-200 bg-white text-slate-950",
};

function StatusCard({
  title,
  value,
  helper,
  tone = "neutral",
}: {
  title: string;
  value: string;
  helper?: string;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <section className={`rounded-md border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-600">{helper}</p> : null}
    </section>
  );
}

function ListCard({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: keyof typeof toneClasses;
}) {
  return (
    <section className={`rounded-md border ${toneClasses[tone]}`}>
      <div className="border-b border-slate-200/70 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      </div>
      <ul className="grid gap-2 p-4 text-sm leading-6">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-white/70 px-3 py-2 text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConnectionGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {companyStatusSummary.connectionStates.map((state) => (
        <StatusCard
          key={state.label}
          title={state.label}
          value={state.value}
          tone={state.tone === "blocked" ? "blocked" : "mock"}
        />
      ))}
    </div>
  );
}

export function StatusDashboard() {
  const summary = companyStatusSummary;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 md:px-6 lg:px-8">
      <section className="rounded-md border border-slate-200 bg-white p-5 md:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
          {summary.mode}
        </p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Company Route Index And Status</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Track: {summary.track}. company_id: {summary.companyId}. This page is a local visual hub for mock/test beta routes.
            </p>
          </div>
          <span className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800">
            {summary.openWarning}
          </span>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Progress" value={`${summary.progressPercent}%`} helper="mock/test beta coverage" tone="done" />
        <StatusCard title="Major files" value={String(summary.generatedMajorFileCount)} helper="company route/components/data/reports" tone="mock" />
        <StatusCard title="Routes" value={String(summary.counts.routePreviews)} helper="preview cards" />
        <StatusCard title="Products/orders" value={`${summary.counts.products}/${summary.counts.orders}`} helper="mock dataset" />
      </section>

      <section className="mt-5">
        <ConnectionGrid />
      </section>

      <section className="mt-5">
        <CompanyRoutePreviewGrid routes={companyRoutePreviews} companyId={summary.companyId} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <ListCard title="mock/test completed" items={summary.completedItems} tone="done" />
        <ListCard title="real integration blockers" items={summary.blockedItems} tone="blocked" />
        <ListCard title="human review required" items={summary.humanReviewItems} tone="mock" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <ListCard title="browser smoke routes" items={summary.smokeRoutes} />
        <ListCard title="next tasks" items={summary.nextTasks} tone="mock" />
      </section>

      <section className="mt-5 rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-950">empty / loading / error / risk coverage</h2>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(summary.stateCoverage).map(([group, items]) => (
            <div key={group} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">{group}</p>
              <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-700">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
