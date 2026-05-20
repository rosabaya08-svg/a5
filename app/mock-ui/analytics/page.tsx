import { MockAnalyticsTiles } from "@/components/ui/MockAnalyticsTiles";
import { MockRiskDistribution } from "@/components/ui/MockRiskDistribution";
import { MockSettlementPreview } from "@/components/ui/MockSettlementPreview";
import { analyticsTiles, riskDistributionItems, settlementPreviewItems } from "@/data/mockAnalyticsView";

export default function MockAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Analytics preview</p>
          <h1 className="mt-2 text-3xl font-black">Mock sales, risk, and settlement visibility</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Static analytics UI for admin and company review. The settlement numbers are preview-only and
            must never be treated as real payout, refund, accounting, or tax data.
          </p>
        </header>

        <MockAnalyticsTiles tiles={analyticsTiles} />

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <MockRiskDistribution items={riskDistributionItems} />
          <MockSettlementPreview items={settlementPreviewItems} />
        </section>
      </div>
    </main>
  );
}

