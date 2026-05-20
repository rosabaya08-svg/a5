import type { MockGuestLookupResult } from "@/types/mockCheckoutView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function MockGuestOrderLookup({ result }: { result: MockGuestLookupResult }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <form className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Guest lookup</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Find an order</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-bold text-slate-700">Order number</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
              defaultValue={result.orderNo}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-bold text-slate-700">Phone number</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
              defaultValue={result.phoneMasked}
            />
          </label>
          <button className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white" type="button">
            Search mock order
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          The lookup is static mock UI. It does not store or verify customer personal information.
        </p>
      </form>

      <article className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Order result</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{result.orderNo}</h3>
            <p className="mt-2 text-sm text-slate-600">{result.phoneMasked}</p>
          </div>
          <p className="rounded-md bg-red-50 px-3 py-2 text-lg font-black text-red-600">{krw(result.totalAmount)}</p>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Payment</dt>
            <dd className="mt-1 text-sm font-black text-slate-950">{result.statusLabel}</dd>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Fulfillment</dt>
            <dd className="mt-1 text-sm font-black text-slate-950">{result.fulfillmentLabel}</dd>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Updated</dt>
            <dd className="mt-1 text-sm font-black text-slate-950">{result.lastUpdatedAt}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {result.riskStatuses.map((status) => (
            <RiskStatusBadge key={status} status={status} />
          ))}
        </div>
      </article>
    </section>
  );
}

