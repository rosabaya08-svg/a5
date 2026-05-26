import type { ApprovalQueueItem } from "@/types/mockOperationsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const trackLabels: Record<ApprovalQueueItem["track"], string> = {
  admin: "최고관리자",
  company: "기업 관리자",
  nursery: "조리원 관리자",
  tablet_qr: "태블릿/QR",
  firebase_contract: "파이어베이스",
  qa: "품질 점검",
};

export function MockApprovalQueue({ items }: { items: ApprovalQueueItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">승인 대기열</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">검토 전용 승인 항목</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          실제 처리 없음
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500">{trackLabels[item.track]}</p>
                <h3 className="mt-1 font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {item.owner} / {item.requestedAt}
                </p>
              </div>
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {item.statusLabel}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.riskStatuses.map((status) => (
                <RiskStatusBadge key={status} status={status} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
