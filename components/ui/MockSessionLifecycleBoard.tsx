import type { SessionLifecycleStep } from "@/types/mockSessionLifecycle";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const actorLabels: Record<SessionLifecycleStep["actor"], string> = {
  tablet: "태블릿",
  guest_mobile: "고객 모바일",
  admin: "관리자",
  system_mock: "시스템",
};

export function MockSessionLifecycleBoard({ steps }: { steps: SessionLifecycleStep[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">QR 생명주기</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">서버 전환 전 세션 상태</h2>
      </div>
      <ol className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <li key={step.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Step {index + 1} / {actorLabels[step.actor]}
                </p>
                <h3 className="mt-1 font-black text-slate-950">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {step.state}
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
