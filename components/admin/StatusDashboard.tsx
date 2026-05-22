import Link from "next/link";
import type { ReactNode } from "react";
import { AdminRoutePreviewGrid } from "@/components/admin/AdminRoutePreviewGrid";
import {
  adminStatusBlockers,
  adminStatusCards,
  adminStatusCompleted,
  adminStatusCoverage,
  adminStatusForbidden,
  adminStatusHumanReview,
  adminStatusNextTasks,
  adminRouteStateMatrix,
  adminRoutePreviewCards,
  adminStatusRoutes,
  adminStatusSummary,
} from "@/data/admin/statusMock";

const toneClasses: Record<string, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  red: "border-red-200 bg-red-50 text-red-950",
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  slate: "border-slate-200 bg-white text-slate-950",
};

function StatusPill({ value }: { value: string }) {
  const tone =
    value.includes("blocked") || value.includes("forbidden") || value.includes("blocker")
      ? "red"
      : value.includes("partial") || value.includes("hold") || value.includes("mock only")
        ? "amber"
        : value.includes("covered") || value.includes("mock")
          ? "green"
          : "slate";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[tone]}`}>
      {value}
    </span>
  );
}

function Panel({
  title,
  children,
  eyebrow,
}: {
  title: string;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p> : null}
      <h2 className="mt-1 text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatusDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="rounded-md border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-700">
              {adminStatusSummary.mode}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
              {adminStatusSummary.workspace} status dashboard
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Track: {adminStatusSummary.track}. Route: {adminStatusSummary.statusRoute}. This is a local visual status page for mock/test beta progress.
            </p>
          </div>
          <StatusPill value="not production / not real payment" />
        </div>
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
          Operating notice: mock/test beta only. 실제 Firebase/PG 연결 없음. No payout, no refund execution, no notification send, no delivery lookup, no external inventory API.
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {adminStatusCards.map((card) => (
          <article key={card.id} className={`rounded-md border p-4 ${toneClasses[card.tone]}`}>
            <p className="text-sm font-semibold text-slate-600">{card.label}</p>
            <p className="mt-2 text-3xl font-black">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500">Progress</p>
            <p className="mt-1 text-2xl font-black">{adminStatusSummary.progressPercent}% mock/test package</p>
          </div>
          <div className="text-sm font-semibold text-slate-600">
            {adminStatusSummary.totalMajorFiles} major files / {adminStatusSummary.appRouteFiles} route files
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${adminStatusSummary.progressPercent}%` }} />
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Preview hub</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Admin route index</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Every card opens a mock/test beta admin route for visual smoke review. These screens do not read real data and do not connect to Firebase, PG, refund, payout, notifications, delivery lookup, or external inventory APIs.
            </p>
          </div>
          <StatusPill value={`${adminRoutePreviewCards.length} preview cards`} />
        </div>
        <div className="mt-5">
          <AdminRoutePreviewGrid routes={adminRoutePreviewCards} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Generated route smoke list" eyebrow="Browser smoke routes">
          <div className="grid max-h-[520px] gap-2 overflow-auto pr-1 sm:grid-cols-2">
            {adminStatusRoutes.map((route) => (
              <Link
                key={route}
                href={route}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                {route}
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Blocked real connections" eyebrow="Production forbidden">
          <div className="grid gap-3">
            {adminStatusBlockers.map((blocker) => (
              <article key={blocker.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{blocker.label}</p>
                  <StatusPill value={blocker.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{blocker.detail}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Mock/test completed" eyebrow="Done">
          <ul className="grid gap-2">
            {adminStatusCompleted.map((item) => (
              <li key={item} className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Still forbidden" eyebrow="Do not connect">
          <ul className="grid gap-2">
            {adminStatusForbidden.map((item) => (
              <li key={item} className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Next 10 tasks" eyebrow="Human follow-up">
          <ol className="grid list-decimal gap-2 pl-5">
            {adminStatusNextTasks.map((item) => (
              <li key={item} className="text-sm font-semibold leading-6 text-slate-700">
                {item}
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Human review required" eyebrow="Manual checks">
          <div className="grid gap-2">
            {adminStatusHumanReview.map((item) => (
              <div key={item} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="State coverage" eyebrow="Empty/loading/error/risk">
          <div className="grid gap-2 sm:grid-cols-2">
            {adminStatusCoverage.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm font-bold">{item.label}</span>
                <StatusPill value={item.status} />
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-6">
        <Panel title="Route state coverage matrix" eyebrow="Empty / loading / error / risk">
          <div className="grid gap-3">
            {adminRouteStateMatrix.map((item) => (
              <article key={item.route} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={item.route} className="text-sm font-black text-blue-700 hover:text-blue-900">
                    {item.route}
                  </Link>
                  <StatusPill value="state covered" />
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <p className="leading-6 text-slate-600">
                    <span className="font-bold text-slate-950">Empty:</span> {item.empty}
                  </p>
                  <p className="leading-6 text-slate-600">
                    <span className="font-bold text-slate-950">Loading:</span> {item.loading}
                  </p>
                  <p className="leading-6 text-slate-600">
                    <span className="font-bold text-slate-950">Error:</span> {item.error}
                  </p>
                  <p className="leading-6 text-slate-600">
                    <span className="font-bold text-slate-950">Risk:</span> {item.risk}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
