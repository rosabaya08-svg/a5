import type { MockQrSessionCard as MockQrSessionCardData } from "@/types/mockCommerceView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function MockQrSessionCard({ session }: { session: MockQrSessionCardData }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">QR 세션</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{session.shortCode}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {session.nurseryName} / {session.roomName}
          </p>
        </div>
        <div className="rounded-md bg-slate-950 px-3 py-2 text-right text-white">
          <p className="text-xs font-semibold text-slate-300">합계</p>
          <p className="text-lg font-black">{krw(session.totalAmount)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">만료</p>
          <p className="mt-1 font-bold">{session.expiresAt}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">상품</p>
          <p className="mt-1 font-bold">{session.itemCount}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {session.riskStatuses.map((status) => (
          <RiskStatusBadge key={status} status={status} />
        ))}
      </div>
    </article>
  );
}
