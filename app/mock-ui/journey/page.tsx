import { MockDecisionLedger } from "@/components/ui/MockDecisionLedger";
import { MockJourneyMap } from "@/components/ui/MockJourneyMap";
import { journeyDecisions, journeySteps } from "@/data/mockJourneyView";

export default function MockJourneyPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Journey preview</p>
          <h1 className="mt-2 text-3xl font-black">Closed mall tablet to QR checkout flow</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            End-to-end mock journey map for product browsing, cart review, QR handoff, mobile checkout,
            result state, and guest order lookup. It does not create orders, payments, refunds, or settlements.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <MockJourneyMap steps={journeySteps} />
          <MockDecisionLedger decisions={journeyDecisions} />
        </section>
      </div>
    </main>
  );
}

