import Link from "next/link";
import { smokeRoutes } from "@/data/my-app/statusMock";

const smokeSteps = [
  {
    id: "smoke-home",
    title: "Open home launcher",
    route: "/",
    checks: ["Original six domain cards are visible", "자동 생성 결과 확인 section is visible", "Safety badges are visible"],
  },
  {
    id: "smoke-status",
    title: "Open integrated status",
    route: "/mock-ui/status",
    checks: ["Progress card is visible", "File groups are visible", "Worktree port guide is visible"],
  },
  {
    id: "smoke-hub",
    title: "Open mock UI hub",
    route: "/mock-ui",
    checks: ["Route cards are visible", "Empty/error/risk previews are visible", "Filter controls are readable"],
  },
  {
    id: "smoke-tablet",
    title: "Open tablet flow",
    route: "/products",
    checks: [
      "/products no longer returns 404",
      "/tablet/products opens",
      "/tablet/cart opens",
      "/tablet/qr opens",
      "No live payment wording appears",
    ],
  },
  {
    id: "smoke-customer",
    title: "Open customer QR flow",
    route: "/q/SANHO701",
    checks: ["/q/SANHO701/checkout opens", "Guest checkout is mock only", "No customer login required"],
  },
  {
    id: "smoke-guest",
    title: "Open guest order detail",
    route: "/orders/guest/A5-20260519-001",
    checks: ["Order status is readable", "Refund/settlement remain mock", "No personal data verification is implied"],
  },
  {
    id: "smoke-company",
    title: "Open company routes",
    route: "/company/dashboard",
    checks: ["/company/products opens", "Company routes remain mock/test beta", "No payout action is live"],
  },
  {
    id: "smoke-nursery",
    title: "Open nursery routes",
    route: "/nursery/dashboard",
    checks: ["/nursery/rooms opens", "Nursery routes remain mock/test beta", "No real customer data is queried"],
  },
];

export function VisualSmokeChecklist() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Visual smoke checklist</p>
          <h1 className="mt-3 text-4xl font-black">localhost:3000 manual click path</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Browser-only review checklist. This page does not run lint, build, git, Firebase, PG, deployment,
            Alimtalk, delivery tracking, or external inventory commands.
          </p>
        </header>

        <section className="grid gap-3 lg:grid-cols-2">
          {smokeSteps.map((step, index) => (
            <article key={step.id} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Step {index + 1}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{step.title}</h2>
                </div>
                <Link href={step.route} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                  {step.route}
                </Link>
              </div>
              <ul className="mt-4 grid gap-2">
                {step.checks.map((check) => (
                  <li key={check} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    {check}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Route inventory</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Clickable smoke route list</h2>
            </div>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
              manual only
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {smokeRoutes.map((route) => (
              <Link key={route.id} href={route.route} className="rounded-md bg-slate-50 p-3 hover:bg-white">
                <p className="font-black text-slate-950">{route.route}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{route.purpose}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
