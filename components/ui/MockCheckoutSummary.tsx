import type { MockCheckoutSummary as MockCheckoutSummaryData } from "@/types/mockCheckoutView";
import { MockMobileActionBar } from "@/components/ui/MockMobileActionBar";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function subtotal(summary: MockCheckoutSummaryData) {
  return summary.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

function payable(summary: MockCheckoutSummaryData) {
  return subtotal(summary) + summary.deliveryFee - summary.discountAmount;
}

export function MockCheckoutSummary({ summary }: { summary: MockCheckoutSummaryData }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3">
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">QR checkout</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{summary.shortCode}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {summary.nurseryName} / {summary.roomName} / {summary.payerLabel}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.riskStatuses.map((status) => (
              <RiskStatusBadge key={status} status={status} />
            ))}
          </div>
        </article>

        {summary.items.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">{item.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {item.optionName} / Qty {item.quantity} / {item.fulfillment}
                </p>
              </div>
              <p className="text-lg font-black text-slate-950">{krw(item.unitPrice * item.quantity)}</p>
            </div>
          </article>
        ))}
      </div>

      <aside className="grid gap-3">
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-950">Payment summary</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-bold">{krw(subtotal(summary))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Delivery fee</dt>
              <dd className="font-bold">{krw(summary.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Mock discount</dt>
              <dd className="font-bold text-emerald-700">-{krw(summary.discountAmount)}</dd>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between text-lg">
                <dt className="font-black">Payable mock amount</dt>
                <dd className="font-black text-red-600">{krw(payable(summary))}</dd>
              </div>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-slate-500">Expires at {summary.expiresAt}. No PG request is made.</p>
        </section>

        <MockMobileActionBar
          helper="Mock CTA only. Real PG approval is blocked."
          primaryLabel="Preview mock payment"
          secondaryLabel="Back to cart"
        />
      </aside>
    </section>
  );
}

