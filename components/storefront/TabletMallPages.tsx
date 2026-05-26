import Link from "next/link";
import { AddToCartPanel, FloatingCartButton, LiveCartPage, LiveQrSessionPanel } from "@/components/storefront/LiveShopClient";
import { FloatingHistoryButtons } from "@/components/tablet/FloatingHistoryButtons";
import { TabletAccessGate, TabletContextBadge } from "@/components/tablet/TabletAccessFlow";
import { staticProductIds } from "@/data/staticSmokeRoutes";
import type { MallProductProfile } from "@/data/mockShopContent";
import {
  getLiveApprovedProducts,
  getLiveNurseryById,
  getLiveProductById,
  getLiveProductOptions,
  getLiveQrSessionByShortCode,
  getLiveRoomById,
  getLiveStorefrontContent,
} from "@/lib/repositories/liveCommerceRepository";
import type { StorefrontContent } from "@/lib/repositories/types";
import { formatCurrency } from "@/lib/utils/format";
import type { Nursery, Product, QrPaymentSession, Room } from "@/types/commerce";

type StoreContext = {
  session: QrPaymentSession;
  nursery?: Nursery;
  room?: Room;
  content: StorefrontContent;
};

async function getContext(shortCode = "SANHO701"): Promise<StoreContext> {
  const [{ data: session }, content] = await Promise.all([
    getLiveQrSessionByShortCode(shortCode),
    getLiveStorefrontContent(),
  ]);
  const [nursery, room] = await Promise.all([
    getLiveNurseryById(session.nurseryId),
    getLiveRoomById(session.roomId),
  ]);

  return { session, nursery: nursery.data, room: room.data, content };
}

async function getApprovedProducts() {
  return (await getLiveApprovedProducts()).data.filter((product) => staticProductIds.includes(product.id));
}

async function getProduct(productId: string) {
  return (await getLiveProductById(productId)).data;
}

async function getProductOptions(productId: string) {
  return (await getLiveProductOptions(productId)).data;
}

function discountRate(product: Product) {
  const { listPrice, closedMallPrice } = product.comparison;
  if (listPrice <= 0) return 0;
  return Math.max(0, Math.round(((listPrice - closedMallPrice) / listPrice) * 100));
}

function platformDeal(product: Product) {
  const { platformLowestPrice, closedMallPrice } = product.comparison;
  const savings = Math.max(0, platformLowestPrice - closedMallPrice);
  const rate = platformLowestPrice > 0 ? Math.round((savings / platformLowestPrice) * 100) : 0;
  return { savings, rate };
}

function AiPriceSummary({ product, large = false, defaultOpen = true }: { product: Product; large?: boolean; defaultOpen?: boolean }) {
  const deal = platformDeal(product);

  return (
    <details className="group rounded-md bg-white/35 p-3" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-center rounded-md border border-rose-600 px-4 py-3 text-sm font-black text-rose-600 transition hover:bg-rose-50 [&::-webkit-details-marker]:hidden">
        AI 분석
      </summary>
      <div className="mt-3 grid gap-2 rounded-md bg-white/40 p-3">
        <p className="text-sm font-black text-slate-500">플랫폼 최저가 대비</p>
        <p className={`${large ? "text-4xl" : "text-xl"} font-black text-rose-600`}>폐쇄몰 {formatCurrency(deal.savings)} 저렴함</p>
        <p className={`${large ? "text-xl" : "text-sm"} font-black text-emerald-700`}>{deal.rate}% 추가 할인된 금액</p>
      </div>
    </details>
  );
}

const discountBands = [
  { title: "베스트 할인", eyebrow: "플랫폼 최저가 대비", min: 36, max: 80 },
  { title: "베이비 특가", eyebrow: "폐쇄몰 추가 할인", min: 10, max: 35 },
] as const;

function sortByNormalPriceDiscount(products: Product[]) {
  return [...products]
    .filter((product) => discountRate(product) >= 10)
    .sort((left, right) => discountRate(right) - discountRate(left));
}

function productsForDiscountBand(products: Product[], min: number, max: number) {
  return sortByNormalPriceDiscount(products).filter((product) => {
    const rate = discountRate(product);
    return rate >= min && rate <= max;
  });
}

function profileFor(product: Product, content?: StorefrontContent): MallProductProfile {
  return (
    content?.productProfiles.find((profile) => profile.productId === product.id) ?? {
      productId: product.id,
      brand: product.brand ?? "A5 Partner",
      displayName: product.name,
      subtitle: product.subtitle ?? "폐쇄몰 전용 상품",
      category: product.category,
      imageUrl: product.imageUrl ?? "/file.svg",
      gallery: product.gallery ?? [product.imageUrl ?? "/file.svg"],
      badges: product.badges ?? [],
      tags: product.tags ?? [product.category],
      review: product.reviewSummary ?? { rating: 4.5, count: 0, highlight: "" },
      detailTabs: product.detailSections ?? [],
    }
  );
}

function StoreShell({ children }: { title?: string; subtitle?: string; context: StoreContext; children: React.ReactNode }) {
  return (
    <TabletAccessGate>
      <main className="min-h-screen bg-transparent text-white">
        <header className="sticky top-0 z-20 border-b border-white/25 bg-white/35 text-slate-950 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/30">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:flex-nowrap md:px-6">
            <Link href="/tablet" className="flex items-center gap-3" aria-label="태블릿 폐쇄몰 메인으로 이동">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-lg font-black text-white">H</span>
              <span>
                <span className="block text-base font-black tracking-[0.18em]">HANSANYEON</span>
                <span className="block text-[11px] font-bold text-rose-600">전용 멤버십 폐쇄몰</span>
              </span>
            </Link>
            <TabletContextBadge />
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">{children}</div>
        <FloatingHistoryButtons />
        <FloatingCartButton />
      </main>
    </TabletAccessGate>
  );
}

function HeroBanner({ content }: { content: StorefrontContent }) {
  const { heroBanner } = content;

  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-black">
      <Link href={heroBanner.href} className="block">
        <div className="relative min-h-[420px]">
          <img src={heroBanner.imageUrl} alt={heroBanner.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="relative flex min-h-[420px] flex-col justify-end p-5 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">{heroBanner.eyebrow}</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-6xl">{heroBanner.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{heroBanner.subtitle}</p>
          </div>
        </div>
      </Link>
    </section>
  );
}

function PromoBannerGrid({ content }: { content: StorefrontContent }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {content.promoBanners.map((banner) => (
        <Link key={banner.id} href={banner.href} className="group overflow-hidden rounded-md border border-white/15 bg-white/20 backdrop-blur-md">
          <div className="relative min-h-40">
            <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-black/15" />
            <div className="relative p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em]">{banner.eyebrow}</p>
              <h3 className="mt-3 text-3xl font-black">{banner.title}</h3>
              <p className="mt-2 text-sm font-semibold">{banner.subtitle}</p>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}

function VideoAdStrip() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <article className="overflow-hidden rounded-md border border-white/25 bg-white/40 text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="grid gap-0 md:grid-cols-[1fr_280px]">
          <div className="grid aspect-video place-items-center bg-slate-950 text-center text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">광고 슬롯</p>
              <h2 className="mt-2 text-3xl font-black">태블릿 홈 영상</h2>
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-black text-rose-600">폐쇄몰 안내</p>
            <h3 className="mt-2 text-2xl font-black">객실 전용 특가</h3>
          </div>
        </div>
      </article>
      <article className="rounded-md border border-white/25 bg-white/35 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">폐쇄몰 안내</p>
        <h3 className="mt-2 text-3xl font-black">조리원 객실 전용 특가</h3>
      </article>
    </section>
  );
}

function BrandGrid({ content }: { content: StorefrontContent }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">공식 입점 브랜드</p>
          <h2 className="mt-2 text-2xl font-black">브랜드관</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {content.brands.map((brand) => (
          <article key={brand.id} className="rounded-md bg-white/35 p-3 text-center text-slate-950 shadow-sm backdrop-blur-md">
            <div className="flex h-16 items-center justify-center">
              <img src={brand.logoUrl} alt={brand.name} className="max-h-12 max-w-full object-contain" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">{brand.category}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, content }: { product: Product; content?: StorefrontContent }) {
  const profile = profileFor(product, content);
  const rate = discountRate(product);

  return (
    <article className="group overflow-hidden rounded-md bg-white/45 text-slate-950 shadow-sm ring-1 ring-white/25 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/65 hover:shadow-2xl">
      <Link href={`/tablet/products/${product.id}`} className="block" aria-label={`${profile.displayName} 상세 보기`}>
        <div className="relative aspect-[4/5] bg-slate-100">
          <img src={profile.imageUrl} alt={profile.displayName} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
          <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-1 text-xs font-black text-white">{rate}%</span>
        </div>
      </Link>
      <div className="grid gap-3 p-4">
        <Link href={`/tablet/products/${product.id}`} className="block">
          <p className="text-xs font-black text-rose-600">{profile.brand}</p>
          <h3 className="mt-1 text-base font-black leading-6">{profile.displayName}</h3>
        </Link>
        <AiPriceSummary product={product} />
      </div>
    </article>
  );
}

function ProductRail({
  title,
  eyebrow,
  products,
  content,
}: {
  title: string;
  eyebrow: string;
  products: Product[];
  content?: StorefrontContent;
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black">{title}</h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={`${title}-${product.id}`} product={product} content={content} />
        ))}
      </div>
    </section>
  );
}

function DiscountBandRails({ products, content }: { products: Product[]; content?: StorefrontContent }) {
  return (
    <>
      {discountBands.map((band) => (
        <ProductRail
          key={band.title}
          title={band.title}
          eyebrow={band.eyebrow}
          products={productsForDiscountBand(products, band.min, band.max)}
          content={content}
        />
      ))}
    </>
  );
}

function ProductGallery({ product, content }: { product: Product; content?: StorefrontContent }) {
  const profile = profileFor(product, content);
  const images = profile.gallery.length ? profile.gallery : [profile.imageUrl];

  return (
    <section className="grid gap-3">
      <div className="overflow-hidden rounded-md bg-white/35 shadow-sm backdrop-blur-md">
        <img src={images[0]} alt={profile.displayName} className="aspect-square w-full object-cover" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {images.slice(0, 3).map((image, index) => (
          <div key={`${image}-${index}`} className="overflow-hidden rounded-md bg-white/35 shadow-sm backdrop-blur-md">
            <img src={image} alt={`${profile.displayName} ${index + 1}`} className="aspect-square w-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}

export async function TabletHomePage() {
  return <TabletProductsPage />;
}

export async function TabletProductsPage() {
  const context = await getContext();
  const products = await getApprovedProducts();

  return (
    <StoreShell title="폐쇄몰 쇼핑 홈" subtitle="태블릿 폐쇄몰" context={context}>
      <div className="grid gap-8">
        <HeroBanner content={context.content} />
        <PromoBannerGrid content={context.content} />
        <VideoAdStrip />
        <BrandGrid content={context.content} />
        <DiscountBandRails products={products} content={context.content} />
      </div>
    </StoreShell>
  );
}

export async function TabletProductDetailPage({ productId }: { productId: string }) {
  const context = await getContext();
  const product = await getProduct(productId);
  const options = await getProductOptions(product.id);
  const profile = profileFor(product, context.content);

  return (
    <StoreShell title={profile.displayName} subtitle={profile.subtitle} context={context}>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ProductGallery product={product} content={context.content} />
        <section className="grid gap-4">
          <div className="rounded-md bg-white/45 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
            <p className="text-sm font-black text-rose-600">{profile.brand}</p>
            <h2 className="mt-2 text-4xl font-black">{profile.displayName}</h2>
            <div className="mt-5">
              <AiPriceSummary product={product} large />
            </div>
          </div>

          <AddToCartPanel product={product} options={options} />
        </section>
      </div>
    </StoreShell>
  );
}

export async function TabletCartPage() {
  const context = await getContext();
  const { session } = context;

  return (
    <StoreShell title="장바구니" subtitle="태블릿 장바구니" context={context}>
      <LiveCartPage fallbackItems={session.items} />
    </StoreShell>
  );
}

export async function TabletQrPage() {
  const context = await getContext();
  const { session } = context;

  return (
    <StoreShell title="구매 QR" subtitle="고객 휴대폰 결제용 QR" context={context}>
      <LiveQrSessionPanel fallbackSession={session} />
    </StoreShell>
  );
}
