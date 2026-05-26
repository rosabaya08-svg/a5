import { MockAnalyticsTiles } from "@/components/ui/MockAnalyticsTiles";
import { MockRiskDistribution } from "@/components/ui/MockRiskDistribution";
import { MockSettlementPreview } from "@/components/ui/MockSettlementPreview";
import { analyticsTiles, riskDistributionItems, settlementPreviewItems } from "@/data/mockAnalyticsView";

export default function MockAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">분석 미리보기</p>
          <h1 className="mt-2 text-3xl font-black">매출, 위험, 정산 가시성 모의 화면</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            최고관리자와 기업 담당자가 검토하는 정적 분석 UI입니다. 정산 숫자는 미리보기 전용이며
            실제 입금, 환불, 회계, 세무 데이터로 사용하면 안 됩니다.
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
