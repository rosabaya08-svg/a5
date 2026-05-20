import type { MergeTrackItem } from "@/types/mockQaView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const stateLabels: Record<MergeTrackItem["state"], string> = {
  waiting: "Waiting",
  ready_for_review: "Ready for review",
  conflict_risk: "Conflict risk",
  blocked: "Blocked",
};

export function MockMergePlanBoard({ tracks }: { tracks: MergeTrackItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Merge plan</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Worktree review order</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {tracks
          .slice()
          .sort((a, b) => a.mergeOrder - b.mergeOrder)
          .map((track) => (
            <article key={track.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Order {track.mergeOrder} / {track.folder}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{track.track}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{track.notes}</p>
                </div>
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {stateLabels[track.state]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {track.allowedPaths.map((path) => (
                  <span key={path} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {path}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {track.riskStatuses.map((status) => (
                  <RiskStatusBadge key={status} status={status} />
                ))}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

