import type { SmokeRouteCandidate } from "@/types/mockOperationsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const stateLabels: Record<SmokeRouteCandidate["expectedState"], string> = {
  preview: "미리보기",
  mock_page: "모의 화면",
  blocked_until_validation: "검증 전 차단",
};

export function MockRouteSmokeMatrix({ routes }: { routes: SmokeRouteCandidate[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">경로 점검표</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">수동 확인 대상 경로</h2>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">경로</th>
              <th className="px-3 py-3">목적</th>
              <th className="px-3 py-3">예상 상태</th>
              <th className="px-3 py-3">위험</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {routes.map((route) => (
              <tr key={route.id} className="align-top">
                <td className="whitespace-nowrap px-3 py-3 font-black text-slate-950">{route.route}</td>
                <td className="px-3 py-3 text-slate-600">{route.purpose}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {stateLabels[route.expectedState]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    {route.riskStatuses.map((status) => (
                      <RiskStatusBadge key={status} status={status} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
