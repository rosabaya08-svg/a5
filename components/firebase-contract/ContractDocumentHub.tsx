import { contractDocs } from "@/data/firebase-contract/statusMock";
import { ContractRoutePreviewGrid } from "@/components/firebase-contract/ContractRoutePreviewGrid";

export function ContractDocumentHub({ slug }: { slug: string }) {
  const doc = contractDocs.find((item) => item.slug === slug) ?? contractDocs[0];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="rounded-md bg-slate-950 p-6 text-white md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
            Firebase Contract Hub - Mock/Test Beta
          </p>
          <h1 className="mt-4 text-3xl font-bold md:text-5xl">{doc.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{doc.purpose}</p>
          <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-md border border-white/15 bg-white/10 p-3">
              <p className="text-slate-300">Route</p>
              <p className="mt-1 font-bold text-amber-200">{doc.route}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-3">
              <p className="text-slate-300">Source</p>
              <p className="mt-1 font-bold">{doc.source}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-3">
              <p className="text-slate-300">State</p>
              <p className="mt-1 font-bold">{doc.status}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-md border border-slate-200 bg-white p-5 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-950">문서 요약</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
              {doc.highlights.map((item) => (
                <li key={item} className="rounded-md bg-slate-50 px-3 py-2">{item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-md border border-rose-200 bg-rose-50 p-5">
            <h2 className="text-lg font-bold text-rose-950">Blocker</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-rose-900">
              {doc.blockers.map((item) => (
                <li key={item} className="rounded-md bg-white/70 px-3 py-2">{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">Visual smoke checklist</h2>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-700 md:grid-cols-2">
            {doc.smokeChecks.map((item) => (
              <p key={item} className="rounded-md bg-slate-50 px-3 py-2">{item}</p>
            ))}
          </div>
        </section>

        <ContractRoutePreviewGrid />
      </div>
    </main>
  );
}
