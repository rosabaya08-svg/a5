import Link from "next/link";
import type { QrStateDetail, StatusTone } from "@/data/tablet-qr/statusMock";

const toneClasses: Record<StatusTone, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-900",
  progress: "border-sky-200 bg-sky-50 text-sky-900",
  blocked: "border-red-200 bg-red-50 text-red-900",
  review: "border-amber-200 bg-amber-50 text-amber-950",
};

export function QrStateScenarioGrid({ states }: { states: QrStateDetail[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-slate-500">QR state scenarios</p>
          <h2 className="mt-1 text-2xl font-black">Active, expired, used, failed, canceled</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            These cards define the customer-facing branch and the real actions that remain blocked.
          </p>
        </div>
        <span className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-black text-red-800">PG/Firebase blocked</span>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-5">
        {states.map((item) => (
          <Link key={item.state} href={item.route} className={`rounded-md border p-3 hover:bg-white ${toneClasses[item.tone]}`}>
            <div className="flex h-full flex-col justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-black text-slate-950">{item.state}</p>
                  <span className={`rounded-md border px-2 py-1 text-xs font-black ${toneClasses[item.tone]}`}>
                    {item.tone}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-slate-800">{item.headline}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.customerAction}</p>
                <p className="mt-2 text-xs leading-5 text-red-700">{item.blockedAction}</p>
              </div>
              <p className="text-xs leading-5 text-slate-500">{item.reviewNote}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
