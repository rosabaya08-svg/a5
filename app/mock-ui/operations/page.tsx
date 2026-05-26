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
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">운영 미리보기</p>
          <h1 className="mt-2 text-3xl font-black">모의 운영 보드</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            승인 대기열, 연동 차단선, 향후 화면 점검 경로를 검토하는 보드입니다.
            이 미리보기는 git, 빌드, 린트, Firebase, PG, 배포, 외부 API 명령을 실행하지 않습니다.
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
