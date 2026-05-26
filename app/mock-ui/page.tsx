import { MockResponsivePreview } from "@/components/ui/MockResponsivePreview";
import { MockPreviewRouteGrid } from "@/components/ui/MockPreviewRouteGrid";
import { StatePanel } from "@/components/ui/StatePanel";
import { mockPreviewRoutes } from "@/data/mockPreviewRoutes";
import { mockErrorStates } from "@/data/mockUiScenarios";

export default function MockUiPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">모의/테스트 베타</p>
          <h1 className="mt-2 text-3xl font-black">폐쇄몰 UI 상태 미리보기</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            이 화면은 빈 상태, 오류 상태, 위험 배지, 필터, 정렬 컨트롤, 상세 영역을 한곳에 모아 확인하는
            모의 전용 화면입니다. Firebase, PG, 알림톡, 배송조회, 외부 재고 API를 호출하지 않습니다.
          </p>
        </header>

        <MockPreviewRouteGrid routes={mockPreviewRoutes} />

        <MockResponsivePreview />

        <section className="grid gap-3 lg:grid-cols-3">
          {mockErrorStates.map((state) => (
            <StatePanel key={state.id} state={state} />
          ))}
        </section>
      </div>
    </main>
  );
}
