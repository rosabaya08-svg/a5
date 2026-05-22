import { worktreePorts } from "@/data/my-app/statusMock";

const mergeChecks = [
  "No .env or secret file was created",
  "No Firebase SDK import was added without approval",
  "No firebase.json, .firebaserc, firestore.rules, or storage.rules file was created",
  "No live PG approval, refund, settlement, or payout code exists",
  "No Alimtalk, delivery tracking, or external inventory live API call exists",
  "Reports are track-local and do not overwrite shared root reports",
  "Lint and build are run manually after review",
  "Browser smoke is reviewed before staging",
];

const mergeOrder = [
  "firebase-contract",
  "qa",
  "admin",
  "company",
  "nursery",
  "tablet-qr",
  "my-app",
];

export function MergeHandoffBoard() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Merge handoff</p>
          <h1 className="mt-3 text-4xl font-black">Worktree merge review board</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Visual handoff board for reviewing parallel worktree output before merging into main. This is not a
            git tool and does not execute merge, push, build, lint, deploy, Firebase, or PG commands.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Suggested order</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Merge review sequence</h2>
            <ol className="mt-4 grid gap-2">
              {mergeOrder.map((track, index) => (
                <li key={track} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span className="font-black text-slate-950">{track}</span>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                    {index + 1}
                  </span>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Pre-merge checks</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Do not merge until reviewed</h2>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {mergeChecks.map((check) => (
                <p key={check} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {check}
                </p>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Port guide</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Parallel browser review targets</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {worktreePorts.map((item) => (
              <article key={item.id} className="rounded-md bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{item.folder}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{item.track}</h3>
                  </div>
                  <span className="rounded-md bg-slate-950 px-3 py-2 text-sm font-black text-white">
                    :{item.port}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.purpose}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

