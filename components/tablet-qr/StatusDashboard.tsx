import Link from "next/link";
import { tabletQrStatusMock, type StatusItem, type StatusRoute, type StatusTone } from "@/data/tablet-qr/statusMock";

const toneClasses: Record<StatusTone, { card: string; badge: string; bar: string }> = {
  complete: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
  },
  progress: {
    card: "border-sky-200 bg-sky-50",
    badge: "bg-sky-100 text-sky-800",
    bar: "bg-sky-500",
  },
  blocked: {
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-800",
    bar: "bg-red-500",
  },
  review: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-900",
    bar: "bg-amber-500",
  },
};

export function StatusDashboard() {
  const status = tabletQrStatusMock;

  return (
    <main className="min-h-screen bg-[#f5f6f1] px-4 py-5 text-slate-950 md:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="bg-slate-950 p-5 text-white md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-emerald-200">{status.mode}</p>
                <h1 className="mt-2 text-3xl font-black md:text-5xl">tablet-qr local status</h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">{status.releaseWarning}</p>
              </div>
              <div className="rounded-md bg-white px-4 py-3 text-slate-950">
                <p className="text-xs font-bold uppercase text-slate-500">Status route</p>
                <p className="mt-1 text-lg font-black">{status.statusRoute}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-4 md:p-5">
            <InfoTile label="Track" value={status.track} helper="Current worktree only" />
            <InfoTile label="Firebase" value="No connection" helper="SDK import blocked" />
            <InfoTile label="PG" value="Mock only" helper="No real payment" />
            <InfoTile label="Storage" value="On hold" helper="Spark limit" />
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <ProgressPanel />
          <section className="grid gap-3 sm:grid-cols-2">
            {status.progressCards.map((card) => (
              <div key={card.label} className={`rounded-md border p-4 ${toneClasses[card.tone].card}`}>
                <p className="text-xs font-black uppercase text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{card.helper}</p>
              </div>
            ))}
          </section>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <ListCard title="Generated Major Screens" items={status.majorScreens} />
          <StateItemCard
            title="Mock/Test Completed"
            items={status.completedItems.map((item) => ({
              title: item,
              detail: "Mock/test beta complete.",
              state: "complete" as const,
            }))}
          />
          <StateItemCard
            title="In Progress"
            items={status.inProgressItems.map((item) => ({
              title: item,
              detail: "Needs human review or command approval.",
              state: "progress" as const,
            }))}
          />
          <StateItemCard title="Blocked Integrations" items={status.blockers} />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <RouteCard routes={status.smokeRoutes} />
          <StateItemCard title="State Coverage" items={status.coverage} />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <ListCard title="Next Tasks" items={status.nextTasks} numbered />
          <ListCard title="Human Review Required" items={status.humanChecks} />
        </section>
      </div>
    </main>
  );
}

function ProgressPanel() {
  const status = tabletQrStatusMock;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Progress</p>
          <h2 className="mt-1 text-4xl font-black">{status.progressPercent}%</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Local mock/test beta progress for tablet closed mall, QR checkout, ask-payer, and guest order lookup.
          </p>
        </div>
        <span className="rounded-md bg-red-100 px-3 py-2 text-xs font-black text-red-700">Not production</span>
      </div>
      <div className="mt-5 h-4 overflow-hidden rounded-md bg-slate-100">
        <div className="h-full rounded-md bg-emerald-500" style={{ width: `${status.progressPercent}%` }} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <StatusRow label="Firebase connection" value="Actual connection none" tone="blocked" />
        <StatusRow label="PG state" value="mock only" tone="blocked" />
        <StatusRow label="AlimTalk" value="blocker" tone="blocked" />
        <StatusRow label="Delivery lookup" value="blocker" tone="blocked" />
        <StatusRow label="External stock API" value="blocker" tone="blocked" />
      </div>
    </section>
  );
}

function InfoTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: StatusTone }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className={`rounded-md px-2 py-1 text-xs font-black ${toneClasses[tone].badge}`}>{value}</span>
    </div>
  );
}

function ListCard({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <div key={item} className="flex gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm leading-5">
            <span className="font-black text-slate-400">{numbered ? String(index + 1).padStart(2, "0") : "-"}</span>
            <span className="font-semibold text-slate-700">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StateItemCard({ title, items }: { title: string; items: StatusItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.title} className={`rounded-md border p-3 ${toneClasses[item.state].card}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{item.detail}</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${toneClasses[item.state].badge}`}>
                {item.state}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RouteCard({ routes }: { routes: StatusRoute[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Browser Smoke Routes</h2>
      <div className="mt-3 grid gap-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`rounded-md border p-3 transition hover:bg-white ${toneClasses[route.state].card}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{route.href}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{route.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{route.detail}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-black ${toneClasses[route.state].badge}`}>
                {route.state}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
