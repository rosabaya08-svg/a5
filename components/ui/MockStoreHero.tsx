import type { StorefrontBanner } from "@/types/mockStorefrontView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockStoreHero({ banner }: { banner: StorefrontBanner }) {
  return (
    <header className="overflow-hidden rounded-md bg-slate-950 text-white">
      <div className="grid gap-4 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">{banner.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-5xl">{banner.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">{banner.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {banner.riskStatuses.map((status) => (
              <RiskStatusBadge key={status} status={status} />
            ))}
          </div>
        </div>
        <div className="grid gap-3 rounded-md bg-white p-4 text-slate-950">
          <div className="rounded-md bg-emerald-50 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-800">Nursery</p>
            <p className="mt-1 text-xl font-black">{banner.nurseryName}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Room</p>
              <p className="mt-1 font-black">{banner.roomName}</p>
            </div>
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-red-700">Expires</p>
              <p className="mt-1 font-black">{banner.expiresAt}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

