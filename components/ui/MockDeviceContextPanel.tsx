import type { DeviceContext } from "@/types/mockSessionLifecycle";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockDeviceContextPanel({ devices }: { devices: DeviceContext[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">기기 정보</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">조리원, 객실, 태블릿 출처</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {devices.map((device) => (
          <article key={device.id} className="rounded-md border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">조리원</p>
                <p className="mt-1 font-black text-slate-950">{device.nurseryName}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">객실</p>
                <p className="mt-1 font-black text-slate-950">{device.roomName}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">태블릿</p>
                <p className="mt-1 font-black text-slate-950">{device.tabletLabel}</p>
              </div>
            </div>
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {device.sourcePolicy}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500">마지막 접속 {device.lastSeenAt}</span>
              <div className="flex flex-wrap gap-2">
                {device.riskStatuses.map((status) => (
                  <RiskStatusBadge key={status} status={status} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
