import { MockCheckoutSummary } from "@/components/ui/MockCheckoutSummary";
import { MockGuestOrderLookup } from "@/components/ui/MockGuestOrderLookup";
import { mockCheckoutSummary, mockGuestLookupResult } from "@/data/mockCheckoutView";

export default function MockCheckoutPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Checkout preview</p>
          <h1 className="mt-2 text-3xl font-black">QR checkout and guest order lookup</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Mock-only checkout and guest lookup patterns for mobile and tablet screens. No Firebase Auth,
            Firestore, PG, Alimtalk, delivery tracking, or external inventory call is performed.
          </p>
        </header>

        <MockCheckoutSummary summary={mockCheckoutSummary} />
        <MockGuestOrderLookup result={mockGuestLookupResult} />
      </div>
    </main>
  );
}

