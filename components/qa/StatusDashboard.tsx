import type { ReactNode } from "react";
import { qaStatusSummary, type QaStatusItem, type QaStatusTone } from "@/data/qa/statusMock";

const toneClasses: Record<QaStatusTone, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-950",
  progress: "border-blue-200 bg-blue-50 text-blue-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
  risk: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-slate-200 bg-white text-slate-950",
};

const badgeClasses: Record<QaStatusTone, string> = {
  done: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  progress: "bg-blue-100 text-blue-800 ring-blue-200",
  blocked: "bg-rose-100 text-rose-800 ring-rose-200",
  risk: "bg-amber-100 text-amber-900 ring-amber-200",
  info: "bg-slate-100 text-slate-700 ring-slate-200",
};

function StatusPill({ tone, children }: { tone: QaStatusTone; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClasses[tone]}`}>
      {children}
    </span>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section>
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p> : null}
      <h2 className="mt-1 text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ItemList({ items }: { items: QaStatusItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-md border p-4 ${toneClasses[item.tone]}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold">{item.label}</h3>
            <StatusPill tone={item.tone}>{item.tone}</StatusPill>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function NumberCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </section>
  );
}

export function StatusDashboard() {
  const summary = qaStatusSummary;
  const integrationStatuses: Array<{ label: string; value: string; tone: QaStatusTone }> = [
    { label: "Firebase", value: summary.firebaseStatus, tone: "blocked" },
    { label: "PG", value: summary.pgStatus, tone: "progress" },
    { label: "AlimTalk", value: summary.alimtalkStatus, tone: "blocked" },
    { label: "Delivery lookup", value: summary.deliveryStatus, tone: "blocked" },
    { label: "External inventory", value: summary.externalInventoryStatus, tone: "blocked" },
    { label: "Storage", value: summary.storageStatus, tone: "risk" },
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone="progress">{summary.modeLabel}</StatusPill>
            <StatusPill tone="blocked">No production open</StatusPill>
            <StatusPill tone="blocked">No real payment</StatusPill>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-normal sm:text-5xl">
            QA status dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Track `{summary.track}` is a local mock/test beta dashboard for human review. It summarizes generated QA
            files, smoke routes, blockers, next tasks, and state coverage without querying real services.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberCard label="Track" value={summary.track} helper={`Status route: ${summary.route}`} />
          <NumberCard
            label="Major files"
            value={`${summary.generatedMajorFileCount}+`}
            helper="QA docs, reports, workflow draft, data, component, and route files."
          />
          <NumberCard label="Progress" value={`${summary.progressPercent}%`} helper="Documentation-ready, runtime checks pending." />
          <NumberCard label="Mode" value="Mock only" helper="Firebase and PG remain disconnected." />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Panel title="Integration status" eyebrow="blocked live services">
              <div className="grid gap-3 sm:grid-cols-2">
              {integrationStatuses.map(({ label, value, tone }) => (
                <div key={label} className={`rounded-md border p-4 ${toneClasses[tone]}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-bold">{value}</p>
                </div>
              ))}
              </div>
            </Panel>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Panel title="Completed mock/test items" eyebrow="done">
              <ItemList items={summary.completedItems} />
            </Panel>
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Panel title="Major generated screens and docs" eyebrow="inventory">
              <ul className="grid gap-2 text-sm leading-6 text-slate-700">
                {summary.majorScreens.map((screen) => (
                  <li key={screen} className="rounded-md bg-slate-50 px-3 py-2 font-medium">
                    {screen}
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Panel title="Blocker cards" eyebrow="must stay blocked">
              <ItemList items={summary.blockedItems} />
            </Panel>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Panel title="Next 10 tasks" eyebrow="human queue">
              <ol className="grid list-decimal gap-2 pl-5 text-sm leading-6 text-slate-700">
                {summary.nextTasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ol>
            </Panel>
          </section>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <Panel title="Browser smoke routes" eyebrow="route map">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {summary.smokeRoutes.map((route) => (
                <a
                  key={route.path}
                  href={route.path}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="font-mono text-sm font-bold text-blue-800">{route.path}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{route.owner}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{route.purpose}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {route.states.map((state) => (
                      <span
                        key={state}
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                      >
                        {state}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Panel title="State coverage" eyebrow="empty loading error risk">
              <ItemList items={summary.stateCoverage} />
            </Panel>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Panel title="Human review needed" eyebrow="decision queue">
              <ul className="grid gap-3 text-sm leading-6 text-slate-700">
                {summary.humanReviewItems.map((item) => (
                  <li key={item} className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </section>
        </section>
      </div>
    </main>
  );
}
