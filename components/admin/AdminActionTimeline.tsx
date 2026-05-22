import type { AdminDetailTimelineItem } from "@/types/admin";
import { AdminBadge } from "@/components/admin/AdminMockWidgets";

export function AdminActionTimeline({ items }: { items: AdminDetailTimelineItem[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((item, index) => (
        <li key={item.id} className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-400">Step {index + 1}</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{item.actor} / {item.at}</p>
            </div>
            {item.tone ? <AdminBadge tone={item.tone}>{item.tone}</AdminBadge> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
        </li>
      ))}
    </ol>
  );
}
