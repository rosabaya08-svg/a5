import type { ApprovalQueueItem } from "@/types/mockOperationsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const trackLabels: Record<ApprovalQueueItem["track"], string> = {
  admin: "Admin",
  company: "Company",
  nursery: "Nursery",
  tablet_qr: "Tablet/QR",
  firebase_contract: "Firebase",
  qa: "QA",
};

export function MockApprovalQueue({ items }: { items: ApprovalQueueItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Approval queue</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Review-only mock approvals</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          No live action
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

