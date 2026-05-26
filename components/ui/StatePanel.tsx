import type { ReactNode } from "react";
import type { MockUiState, MockUiTone } from "@/types/mockUi";

const toneClasses: Record<MockUiTone, string> = {
  neutral: "border-slate-200 bg-white text-slate-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-red-200 bg-red-50 text-red-950",
};

const kindLabels: Record<MockUiState["kind"], string> = {
  empty: "빈 상태",
  error: "오류 상태",
  blocked: "차단",
  expired: "만료",
  pending: "대기",
  ready: "준비 완료",
};

type StatePanelProps = {
  state: MockUiState;
  footer?: ReactNode;
};

export function StatePanel({ state, footer }: StatePanelProps) {
  const tone = state.tone ?? "neutral";

  return (
    <section className={`rounded-md border p-5 ${toneClasses[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold ring-1 ring-black/5">
            {kindLabels[state.kind]}
          </span>
          <h3 className="mt-3 text-lg font-black">{state.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{state.description}</p>
        </div>
        {state.action ? (
          <span className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
            {state.action.label}
          </span>
        ) : null}
      </div>
      {state.action?.description ? (
        <p className="mt-3 text-xs font-semibold text-slate-600">{state.action.description}</p>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
