import { MockMallProductCard } from "@/components/ui/MockMallProductCard";
import { MockOrderTimeline } from "@/components/ui/MockOrderTimeline";
import { MockQrSessionCard } from "@/components/ui/MockQrSessionCard";
import { mockMallProducts, mockOrderTimeline, mockQrSessionCards } from "@/data/mockCommerceView";

export default function MockUiDetailPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Detail mock page</p>
          <h1 className="mt-2 text-3xl font-black">Shopping, QR, and order detail patterns</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            This page previews product cards, QR session summaries, and order timeline states without wiring
            Firebase, PG, Alimtalk, delivery tracking, or external inventory APIs.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockMallProducts.map((product) => (
            <MockMallProductCard key={product.id} product={product} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            {mockQrSessionCards.map((session) => (
              <MockQrSessionCard key={session.id} session={session} />
            ))}
          </div>
          <MockOrderTimeline steps={mockOrderTimeline} />
        </section>
      </div>
    </main>
  );
}

