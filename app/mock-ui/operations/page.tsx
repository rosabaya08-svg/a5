import { MockApprovalQueue } from "@/components/ui/MockApprovalQueue";
import { MockIntegrationGateList } from "@/components/ui/MockIntegrationGateList";
import { MockMetricGrid } from "@/components/ui/MockMetricGrid";
import { MockRouteSmokeMatrix } from "@/components/ui/MockRouteSmokeMatrix";
import {
  approvalQueueItems,
  integrationGates,
  operationMetrics,
  smokeRouteCandidates,
} from "@/data/mockOperationsView";

export default function MockOperationsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-white p-5 ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Operations preview</p>
          <h1 className="mt-2 text-3xl font-black">Mock operations board</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Review-only board for approvals, integration gates, and future smoke routes. This preview does
            not run git, build, lint, Firebase, PG, deployment, or external API commands.
          </p>
        </header>

        <MockMetricGrid metrics={operationMetrics} />

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <MockApprovalQueue items={approvalQueueItems} />
          <MockIntegrationGateList gates={integrationGates} />
        </section>

        <MockRouteSmokeMatrix routes={smokeRouteCandidates} />
      </div>
    </main>
  );
}

