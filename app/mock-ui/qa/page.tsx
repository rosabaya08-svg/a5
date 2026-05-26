import { MockManualChecklist } from "@/components/ui/MockManualChecklist";
import { MockMergePlanBoard } from "@/components/ui/MockMergePlanBoard";
import { MockReleaseReadiness } from "@/components/ui/MockReleaseReadiness";
import { manualChecklistItems, mergeTrackItems, releaseReadinessItems } from "@/data/mockQaView";

export default function MockQaPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">QA 미리보기</p>
          <h1 className="mt-2 text-3xl font-black">수동 병합과 출시 준비 상태</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            다음 근무일 검토를 위한 정적 체크리스트입니다. 이 화면은 git, 설치, 빌드, 린트,
            배포, Firebase, PG, 외부 API 작업을 실행하지 않습니다.
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
