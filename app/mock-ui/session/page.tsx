import { MockDeviceContextPanel } from "@/components/ui/MockDeviceContextPanel";
import { MockPayerHandoffCard } from "@/components/ui/MockPayerHandoffCard";
import { MockSessionLifecycleBoard } from "@/components/ui/MockSessionLifecycleBoard";
import { deviceContexts, payerHandoffs, sessionLifecycleSteps } from "@/data/mockSessionLifecycle";

export default function MockSessionPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">세션 미리보기</p>
          <h1 className="mt-2 text-3xl font-black">QR 세션 생명주기와 태블릿 출처</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            태블릿 출처 추적, 1회용 QR 전달, 만료, 모의 결제 결과 상태를 정적으로 미리봅니다.
            실제 세션, Firebase 문서, PG 거래는 생성하지 않습니다.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <MockSessionLifecycleBoard steps={sessionLifecycleSteps} />
          <MockDeviceContextPanel devices={deviceContexts} />
        </section>

        <MockPayerHandoffCard handoffs={payerHandoffs} />
      </div>
    </main>
  );
}
