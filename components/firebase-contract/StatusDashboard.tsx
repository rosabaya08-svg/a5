import { firebaseContractStatus, type StatusItem, type RouteStatus } from "@/data/firebase-contract/statusMock";
import { ContractRoutePreviewGrid } from "@/components/firebase-contract/ContractRoutePreviewGrid";

const toneClasses: Record<StatusItem["tone"], string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-950",
  active: "border-sky-200 bg-sky-50 text-sky-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
  risk: "border-amber-200 bg-amber-50 text-amber-950",
  neutral: "border-slate-200 bg-white text-slate-950",
};

const badgeClasses: Record<RouteStatus["state"], string> = {
  ready: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  mock: "bg-sky-100 text-sky-800 ring-sky-200",
  blocked: "bg-rose-100 text-rose-800 ring-rose-200",
};

function StatusCard({ item }: { item: StatusItem }) {
  return (
    <article className={`rounded-md border p-4 ${toneClasses[item.tone]}`}>
      <p className="text-sm font-semibold">{item.label}</p>
      <p className="mt-2 text-2xl font-bold">{item.detail}</p>
    </article>
  );
}

function ListCard({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-slate-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RouteMap({ routes }: { routes: readonly RouteStatus[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">브라우저 smoke route</h2>
      <div className="mt-4 grid gap-2">
        {routes.map((route) => (
          <a
            key={route.path}
            href={route.path}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm transition hover:border-sky-300 hover:bg-sky-50"
          >
            <span>
              <span className="font-semibold text-slate-950">{route.label}</span>
              <span className="ml-2 text-slate-500">{route.path}</span>
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClasses[route.state]}`}>
              {route.state}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function StatusDashboard() {
  const status = firebaseContractStatus;
  const completion = Math.round((status.completed.length / (status.completed.length + status.inProgress.length + status.blocked.length)) * 100);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="rounded-md bg-slate-950 p-6 text-white md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">{status.betaLabel}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px] lg:items-end">
            <div>
              <h1 className="text-3xl font-bold md:text-5xl">Firebase Contract Status</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{status.summary}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              <p className="text-sm text-slate-300">현재 트랙</p>
              <p className="mt-1 text-2xl font-bold">{status.track}</p>
              <p className="mt-3 text-sm text-slate-300">Status route</p>
              <p className="mt-1 font-semibold text-amber-200">{status.route}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard item={{ label: "진행률", detail: `${completion}%`, tone: "active" }} />
          <StatusCard item={{ label: "주요 파일 수", detail: `${status.generatedFiles.length}`, tone: "complete" }} />
          <StatusCard item={{ label: "Firebase", detail: "연결 없음", tone: "blocked" }} />
          <StatusCard item={{ label: "PG", detail: "mock only", tone: "risk" }} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <ListCard title="완료 항목" items={status.completed} />
          <ListCard title="진행중 항목" items={status.inProgress} />
          <ListCard title="차단 항목" items={status.blocked} />
        </section>

        <ContractRoutePreviewGrid />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <RouteMap routes={status.smokeRoutes} />
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">연동 상태</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {status.integrationStatus.map((item) => (
                <StatusCard key={item.label} item={item} />
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ListCard title="다음 작업 10개" items={status.nextTasks} />
          <ListCard title="사람 확인 필요" items={status.humanChecks} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">empty/loading/error/risk 커버리지</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {status.stateCoverage.map((item) => (
                <StatusCard key={item.label} item={item} />
              ))}
            </div>
          </section>
          <ListCard title="주요 화면/문서 목록" items={status.majorScreens} />
        </section>

        <ListCard title="Blocker 목록" items={status.blockers} />
      </div>
    </main>
  );
}
