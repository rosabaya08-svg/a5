import { MockManualChecklist } from "@/components/ui/MockManualChecklist";
import { MockMergePlanBoard } from "@/components/ui/MockMergePlanBoard";
import { MockReleaseReadiness } from "@/components/ui/MockReleaseReadiness";
import { manualChecklistItems, mergeTrackItems, releaseReadinessItems } from "@/data/mockQaView";

export default function MockQaPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">QA preview</p>
          <h1 className="mt-2 text-3xl font-black">Manual merge and release readiness</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Static checklist for next working day review. No git, install, build, lint, deploy, Firebase,
            PG, or external API action is executed by this page.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <MockMergePlanBoard tracks={mergeTrackItems} />
          <MockManualChecklist items={manualChecklistItems} />
        </section>

        <MockReleaseReadiness items={releaseReadinessItems} />
      </div>
    </main>
  );
}

