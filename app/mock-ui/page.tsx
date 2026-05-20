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
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Mock/test beta</p>
          <h1 className="mt-2 text-3xl font-black">Closed mall UI state preview</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This route collects mock-only empty states, error states, risk badges, filters, sorting controls,
            and detail sections. It does not connect to Firebase, PG, Alimtalk, delivery tracking, or external inventory APIs.
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
