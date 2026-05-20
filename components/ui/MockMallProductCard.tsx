import type { MockMallProduct } from "@/types/mockCommerceView";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

const toneClasses: Record<MockMallProduct["tone"], string> = {
  sage: "bg-emerald-100 text-emerald-950",
  rose: "bg-rose-100 text-rose-950",
  sky: "bg-sky-100 text-sky-950",
  gold: "bg-amber-100 text-amber-950",
  ink: "bg-slate-200 text-slate-950",
};

const fulfillmentLabels: Record<MockMallProduct["fulfillment"], string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  both: "Delivery / pickup",
};

const stockLabels: Record<MockMallProduct["stockState"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  sold_out: "Sold out",
};

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function discountRate(product: MockMallProduct) {
  return Math.round(((product.listPrice - product.closedMallPrice) / product.listPrice) * 100);
}

export function MockMallProductCard({ product }: { product: MockMallProduct }) {
  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className={`flex h-36 items-center justify-center p-5 text-center ${toneClasses[product.tone]}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em]">{product.category}</p>
          <p className="mt-2 text-3xl font-black">{discountRate(product)}%</p>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <h3 className="text-lg font-black leading-6 text-slate-950">{product.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{fulfillmentLabels[product.fulfillment]}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 line-through">List {krw(product.listPrice)}</p>
          <p className="text-2xl font-black text-red-600">{krw(product.closedMallPrice)}</p>
          <p className="text-xs font-semibold text-emerald-700">
            Saves {krw(product.platformLowestPrice - product.closedMallPrice)} vs. mock lowest price
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {stockLabels[product.stockState]} {product.stockCount}
          </span>
          {product.riskStatuses.map((status) => (
            <RiskStatusBadge key={status} status={status} />
          ))}
        </div>
      </div>
    </article>
  );
}

