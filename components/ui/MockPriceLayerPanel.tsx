import type { StorefrontPriceLayer } from "@/types/mockStorefrontView";

export function MockPriceLayerPanel({ layers }: { layers: StorefrontPriceLayer[] }) {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {layers.map((layer) => (
        <article key={layer.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-lg font-black text-emerald-950">{layer.title}</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="rounded-md bg-white px-3 py-2 font-semibold text-slate-700">{layer.normalPriceLabel}</div>
            <div className="rounded-md bg-white px-3 py-2 font-semibold text-slate-700">
              {layer.closedMallPriceLabel}
            </div>
            <div className="rounded-md bg-slate-950 px-3 py-2 font-semibold text-white">{layer.comparisonLabel}</div>
          </div>
          <p className="mt-3 text-xs leading-5 text-emerald-900">{layer.disclaimer}</p>
        </article>
      ))}
    </section>
  );
}

