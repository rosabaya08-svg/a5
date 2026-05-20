import type { SettlementPreviewItem } from "@/types/mockAnalyticsView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const stateLabels: Record<SettlementPreviewItem["state"], string> = {
  review: "Review",
  confirmed_mock: "Confirmed mock",
  payout_blocked: "Payout blocked",
};

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function MockSettlementPreview({ items }: { items: SettlementPreviewItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Settlement preview</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">No real payout action</h2>
        </div>
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
          payout disabled
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Gross</th>
              <th className="px-3 py-3">Commission</th>
              <th className="px-3 py-3">Hold</th>
              <th className="px-3 py-3">Preview payout</th>
              <th className="px-3 py-3">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-3 py-3">
                  <p className="font-black text-slate-950">{item.companyName}</p>
                  <p className="text-xs text-slate-500">{item.period}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.riskStatuses.map((status) => (
                      <RiskStatusBadge key={status} status={status} />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 font-bold text-slate-700">{krw(item.grossAmount)}</td>
                <td className="px-3 py-3 font-bold text-slate-700">{krw(item.commissionAmount)}</td>
                <td className="px-3 py-3 font-bold text-red-700">{krw(item.holdAmount)}</td>
                <td className="px-3 py-3 font-black text-slate-950">{krw(item.payoutPreview)}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {stateLabels[item.state]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

