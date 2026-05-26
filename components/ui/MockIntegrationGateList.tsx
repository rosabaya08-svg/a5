import type { IntegrationGate } from "@/types/mockOperationsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const stateLabels: Record<IntegrationGate["currentState"], string> = {
  blocked: "차단",
  mock_ready: "모의 준비 완료",
  docs_needed: "문서 필요",
  approval_needed: "승인 필요",
};

export function MockIntegrationGateList({ gates }: { gates: IntegrationGate[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">연동 게이트</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">실연동 차단 항목</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {gates.map((gate) => (
          <article key={gate.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">{gate.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{gate.blocker}</p>
              </div>
              <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-bold text-white">
                {stateLabels[gate.currentState]}
              </span>
            </div>
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              Next safe step: {gate.nextSafeStep}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {gate.riskStatuses.map((status) => (
                <RiskStatusBadge key={status} status={status} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
