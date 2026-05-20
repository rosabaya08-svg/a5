import type { JourneyStep } from "@/types/mockJourneyView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const stateLabels: Record<JourneyStep["mockState"], string> = {
  ready: "Mock ready",
  blocked: "Live blocked",
  manual_review: "Manual review",
};

export function MockJourneyMap({ steps }: { steps: JourneyStep[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Customer journey</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Tablet to mobile QR flow</h2>
      </div>
      <ol className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <li key={step.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Step {index + 1} / {step.actor}
                </p>
                <h3 className="mt-1 font-black text-slate-950">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  Route candidate: {step.routeCandidate}
                </p>
              </div>
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                {stateLabels[step.mockState]}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {step.riskStatuses.map((status) => (
                <RiskStatusBadge key={status} status={status} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

