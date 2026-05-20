import { MockDeviceContextPanel } from "@/components/ui/MockDeviceContextPanel";
import { MockPayerHandoffCard } from "@/components/ui/MockPayerHandoffCard";
import { MockSessionLifecycleBoard } from "@/components/ui/MockSessionLifecycleBoard";
import { deviceContexts, payerHandoffs, sessionLifecycleSteps } from "@/data/mockSessionLifecycle";

export default function MockSessionPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Session preview</p>
          <h1 className="mt-2 text-3xl font-black">QR session lifecycle and device source</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Static preview for tablet source tracking, one-time QR handoff, expiration, and mock payment result
            states. No live session, Firebase document, or PG transaction is created.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <MockSessionLifecycleBoard steps={sessionLifecycleSteps} />
          <MockDeviceContextPanel devices={deviceContexts} />
        </section>

        <MockPayerHandoffCard handoffs={payerHandoffs} />
      </div>
    </main>
  );
}

