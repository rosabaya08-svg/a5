import {
  statusMockContext,
  statusRoutePreviewGroups,
} from "@/data/nursery/statusMock";

const stateClasses: Record<string, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-950",
  risk: "border-red-200 bg-red-50 text-red-950",
  preview: "border-blue-200 bg-blue-50 text-blue-950",
  blocked: "border-amber-200 bg-amber-50 text-amber-950",
};

export function NurseryRoutePreviewGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Route Preview Hub</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            브라우저에서 nursery mock 화면을 육안 확인하기 위한 route 카드입니다. 모든 카드는 mock/test beta이며 실제 연결을 수행하지 않습니다.
          </p>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
          운영/실결제 아님
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">nursery_id</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-950">{statusMockContext.nurseryId}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">room_id</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-950">{statusMockContext.roomId}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">tablet_id</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-950">{statusMockContext.tabletId}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statusRoutePreviewGroups.map((route) => (
          <a
            key={route.id}
            href={route.href}
            className={`rounded-md border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${stateClasses[route.state] ?? stateClasses.preview}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-bold">{route.title}</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold ring-1 ring-slate-200">
                {route.state}
              </span>
            </div>
            <p className="mt-3 break-words text-xs font-bold">{route.href}</p>
            <p className="mt-2 text-xs leading-5 text-slate-700">{route.helper}</p>
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {route.context}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
