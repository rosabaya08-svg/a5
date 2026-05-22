import { contractCards, type ContractCard } from "@/data/firebase-contract/statusMock";

const statusClasses: Record<ContractCard["status"], string> = {
  documented: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  mock: "bg-sky-100 text-sky-800 ring-sky-200",
  blocked: "bg-rose-100 text-rose-800 ring-rose-200",
  "needs-review": "bg-amber-100 text-amber-900 ring-amber-200",
};

export function ContractRoutePreviewGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Preview Hub</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">계약 문서 route index</h2>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">mock/test only</span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contractCards.map((card) => (
          <a
            key={`${card.title}-${card.route}`}
            href={card.route}
            className="rounded-md border border-slate-200 p-4 transition hover:border-sky-300 hover:bg-sky-50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-950">{card.title}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClasses[card.status]}`}>
                {card.status}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{card.document}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{card.summary}</p>
            <div className="mt-4 grid gap-2 text-xs leading-5">
              <p className="rounded-md bg-rose-50 px-3 py-2 text-rose-900">
                <span className="font-bold">Blocker:</span> {card.blocker}
              </p>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-950">
                <span className="font-bold">Human check:</span> {card.humanCheck}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
