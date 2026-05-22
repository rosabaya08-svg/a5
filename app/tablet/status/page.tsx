import { GuestRoutePreviewGrid } from "@/components/guest/GuestRoutePreviewGrid";
import { QrStateScenarioGrid } from "@/components/guest/QrStateScenarioGrid";
import { TabletRoutePreviewGrid } from "@/components/tablet/TabletRoutePreviewGrid";
import { tabletQrStatusMock } from "@/data/tablet-qr/statusMock";

export default function Page() {
  const status = tabletQrStatusMock;
  const guestRoutes = status.smokeRoutes.filter(
    (route) => route.href.startsWith("/q/") || route.href.startsWith("/orders/guest"),
  );

  return (
    <main className="min-h-screen bg-[#f5f6f1] px-4 py-5 text-slate-950 md:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="bg-slate-950 p-5 text-white md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-emerald-200">{status.mode}</p>
                <h1 className="mt-2 text-3xl font-black md:text-5xl">tablet-qr preview hub</h1>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">{status.releaseWarning}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge label="mock/test beta" tone="green" />
                  <Badge label="Firebase none" tone="slate" />
                  <Badge label="PG mock only" tone="red" />
                  <Badge label="Not production" tone="amber" />
                </div>
              </div>
              <div className="rounded-md bg-white px-4 py-3 text-slate-950">
                <p className="text-xs font-bold uppercase text-slate-500">Status route</p>
                <p className="mt-1 text-lg font-black">{status.statusRoute}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-4 md:p-5">
            {status.progressCards.map((card) => (
              <section key={card.label} className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{card.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{card.helper}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase text-slate-500">Progress</p>
            <h2 className="mt-1 text-5xl font-black">{status.progressPercent}%</h2>
            <div className="mt-5 h-4 overflow-hidden rounded-md bg-slate-100">
              <div className="h-full rounded-md bg-emerald-500" style={{ width: `${status.progressPercent}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <StatusLine label="Firebase connection" value="actual connection none" />
              <StatusLine label="PG state" value="mock only" />
              <StatusLine label="AlimTalk state" value="blocker" />
              <StatusLine label="Delivery lookup" value="blocker" />
              <StatusLine label="External stock API" value="blocker" />
              <StatusLine label="Storage state" value="Spark hold" />
            </div>
          </section>
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase text-slate-500">Human checks</p>
            <h2 className="mt-1 text-2xl font-black">Human review required</h2>
            <div className="mt-3 grid gap-2">
              {status.humanChecks.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="mt-5">
          <TabletRoutePreviewGrid groups={status.routeGroups} qrStates={status.qrStatePreviews} />
        </section>

        <section className="mt-5">
          <GuestRoutePreviewGrid routes={guestRoutes} />
        </section>

        <section className="mt-5">
          <QrStateScenarioGrid states={status.qrStateDetails} />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-3">
          <MiniList title="Mock/test completed" items={status.completedItems} />
          <MiniList title="Next 10 tasks" items={status.nextTasks} numbered />
          <MiniList title="Empty/loading/error/risk coverage" items={status.coverage.map((item) => `${item.title}: ${item.detail}`)} />
        </section>
      </div>
    </main>
  );
}

function Badge({ label, tone }: { label: string; tone: "green" | "slate" | "red" | "amber" }) {
  const classes = {
    green: "bg-emerald-100 text-emerald-900",
    slate: "bg-slate-100 text-slate-900",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-950",
  };

  return <span className={`rounded-md px-2.5 py-1 text-xs font-black ${classes[tone]}`}>{label}</span>;
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-black text-red-800">{value}</span>
    </div>
  );
}

function MiniList({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
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
