import { MockDecisionLedger } from "@/components/ui/MockDecisionLedger";
import { MockJourneyMap } from "@/components/ui/MockJourneyMap";
import { journeyDecisions, journeySteps } from "@/data/mockJourneyView";

export default function MockJourneyPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">고객 여정 미리보기</p>
          <h1 className="mt-2 text-3xl font-black">태블릿 산후조리원 핫딜에서 QR 결제까지</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            상품 탐색, 장바구니 확인, QR 전달, 모바일 결제, 결과 상태, 비회원 주문조회까지
            전체 흐름을 모의로 보여줍니다. 실제 주문, 결제, 환불, 정산은 생성하지 않습니다.
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
