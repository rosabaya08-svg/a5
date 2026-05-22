import Link from "next/link";
import type { StatusRoute, StatusTone } from "@/data/tablet-qr/statusMock";

const toneClasses: Record<StatusTone, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-900",
  progress: "border-sky-200 bg-sky-50 text-sky-900",
  blocked: "border-red-200 bg-red-50 text-red-900",
  review: "border-amber-200 bg-amber-50 text-amber-950",
};

export function GuestRoutePreviewGrid({ routes }: { routes: StatusRoute[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-slate-500">Customer route preview</p>
          <h2 className="mt-1 text-2xl font-black">Guest QR and order smoke routes</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Each card opens a customer-visible mock route. Real Firebase, PG, refund, delivery, and notification calls remain blocked.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PreviewBadge label="mock/test beta" tone="complete" />
          <PreviewBadge label="PG mock only" tone="blocked" />
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {routes.map((route) => (
          <Link key={route.href} href={route.href} className={`rounded-md border p-3 hover:bg-white ${toneClasses[route.state]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{route.label}</p>
                <p className="mt-1 break-words text-sm font-black text-slate-800">{route.href}</p>
                <p className="mt-2 text-sm leading-5 text-slate-600">{route.detail}</p>
              </div>
              <PreviewBadge label={route.state} tone={route.state} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PreviewBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-black ${toneClasses[tone]}`}>{label}</span>;
}
