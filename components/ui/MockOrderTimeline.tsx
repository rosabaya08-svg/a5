import type { MockTimelineStep } from "@/types/mockCommerceView";

const stateClasses: Record<MockTimelineStep["state"], string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-950",
  current: "border-blue-200 bg-blue-50 text-blue-950",
  waiting: "border-slate-200 bg-white text-slate-700",
  blocked: "border-red-200 bg-red-50 text-red-950",
};

export function MockOrderTimeline({ steps }: { steps: MockTimelineStep[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Order state</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Mock fulfillment timeline</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          No live API calls
        </span>
      </div>
      <ol className="mt-4 grid gap-3">
        {steps.map((step) => (
          <li key={step.id} className={`rounded-md border p-3 ${stateClasses[step.state]}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-black">{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{step.description}</p>
              </div>
              {step.at ? <span className="text-xs font-bold text-slate-500">{step.at}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

