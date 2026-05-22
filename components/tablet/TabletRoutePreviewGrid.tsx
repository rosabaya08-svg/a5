import Link from "next/link";
import type { StatusRoute, StatusRouteGroup, StatusTone } from "@/data/tablet-qr/statusMock";

const toneClasses: Record<StatusTone, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-900",
  progress: "border-sky-200 bg-sky-50 text-sky-900",
  blocked: "border-red-200 bg-red-50 text-red-900",
  review: "border-amber-200 bg-amber-50 text-amber-950",
};

export function TabletRoutePreviewGrid({
  groups,
  qrStates,
}: {
  groups: StatusRouteGroup[];
  qrStates: StatusRoute[];
}) {
  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-slate-500">Preview hub</p>
            <h2 className="mt-1 text-2xl font-black">Tablet and QR route index</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <SafetyBadge label="mock/test beta" tone="complete" />
            <SafetyBadge label="Firebase none" tone="review" />
            <SafetyBadge label="PG mock only" tone="blocked" />
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.title} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">{group.title}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">{group.helper}</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
              {group.routes.length} routes
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.routes.map((route) => (
              <RouteCard key={route.href} route={route} />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h3 className="text-xl font-black">QR state preview cards</h3>
        <p className="mt-1 text-sm text-slate-600">Active, expired, used, payment_failed, and canceled branches.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {qrStates.map((route) => (
            <RouteCard key={route.href} route={route} compact />
          ))}
        </div>
      </section>
    </section>
  );
}

function RouteCard({ route, compact = false }: { route: StatusRoute; compact?: boolean }) {
  return (
    <Link
      href={route.href}
      className={`rounded-md border p-3 transition hover:bg-white ${toneClasses[route.state]}`}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className={`${compact ? "text-base" : "text-lg"} font-black text-slate-950`}>{route.label}</p>
            <SafetyBadge label={route.state} tone={route.state} />
          </div>
          <p className="mt-2 break-words text-sm font-black text-slate-800">{route.href}</p>
          <p className="mt-2 text-sm leading-5 text-slate-600">{route.detail}</p>
        </div>
        <span className="text-xs font-black uppercase text-slate-500">Open route</span>
      </div>
    </Link>
  );
}

function SafetyBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`rounded-md border px-2 py-1 text-xs font-black ${toneClasses[tone]}`}>{label}</span>;
}
