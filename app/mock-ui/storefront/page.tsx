import { MockMallProductCard } from "@/components/ui/MockMallProductCard";
import { MockCategoryRail } from "@/components/ui/MockCategoryRail";
import { MockPriceLayerPanel } from "@/components/ui/MockPriceLayerPanel";
import { MockStoreBenefitStrip } from "@/components/ui/MockStoreBenefitStrip";
import { MockStoreHero } from "@/components/ui/MockStoreHero";
import { mockMallProducts } from "@/data/mockCommerceView";
import {
  storefrontBanner,
  storefrontBenefits,
  storefrontCategories,
  storefrontPriceLayers,
} from "@/data/mockStorefrontView";

export default function MockStorefrontPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-5 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <MockStoreHero banner={storefrontBanner} />
        <MockCategoryRail categories={storefrontCategories} />
        <MockStoreBenefitStrip benefits={storefrontBenefits} />

        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Recommended</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Closed mall product cards</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              Static mock data
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mockMallProducts.map((product) => (
              <MockMallProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <MockPriceLayerPanel layers={storefrontPriceLayers} />
      </div>
    </main>
  );
}

