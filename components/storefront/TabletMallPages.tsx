import Link from "next/link";
import { HardNavigateLink } from "@/components/storefront/HardNavigateLink";
import { AddToCartPanel, FloatingCartButton, LiveCartPage, LiveQrSessionPanel, LiveTabletOrderHistoryPage } from "@/components/storefront/LiveShopClient";
import { PriceAnalysisButton } from "@/components/storefront/PriceAnalysisButton";
import { FloatingHistoryButtons } from "@/components/tablet/FloatingHistoryButtons";
import { TabletAccessGate, TabletContextBadge } from "@/components/tablet/TabletAccessFlow";
import { staticProductIds } from "@/data/staticSmokeRoutes";
import { mallBrands, type MallBrand, type MallProductProfile } from "@/data/mockShopContent";
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

const SHOP_HOME_HREF = "/tablet/products/";

const dealFilters = [
  { id: "clearance-80", bannerId: "promo-clearance-80", title: "최대 할인 상품", eyebrow: "오늘의 메가 할인", min: 30, max: 80 },
  { id: "baby-50", bannerId: "promo-baby-50", title: "베이비 베스트 특가", eyebrow: "베이비케어 할인", min: 10, max: 50, keywords: ["베이비", "신생아", "수딩"] },
  { id: "sanmo-35", bannerId: "promo-sanmo-35", title: "산모 케어 특가", eyebrow: "산모케어 할인", min: 10, max: 35, keywords: ["산모", "회복", "티", "로브", "필로우"] },
  { id: "new-20", bannerId: "promo-new-20", title: "신상품 할인", eyebrow: "신규 입점 브랜드 기획전", min: 10, max: 25, keywords: ["신상품", "신규"] },
] as const;

export const dealPageIds = dealFilters.map((deal) => deal.id);
export const brandPageIds = mallBrands.map((brand) => brand.id);

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

function normalDeal(product: Product) {
  const { listPrice, closedMallPrice } = product.comparison;
  const savings = Math.max(0, listPrice - closedMallPrice);
  const rate = listPrice > 0 ? Math.round((savings / listPrice) * 100) : 0;
  return { savings, rate };
}

function ProductPriceSummary({ product, productName, large = false }: { product: Product; productName: string; large?: boolean }) {
  const deal = normalDeal(product);
  const { listPrice, closedMallPrice, platformLowestPrice } = product.comparison;

  return (
    <div className="grid gap-3 rounded-md bg-white/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-500">
          정상가 <span className="line-through">{formatCurrency(listPrice)}</span>
        </p>
        <span className="rounded-md bg-rose-600 px-2 py-1 text-xs font-black text-white">{deal.rate}% 할인</span>
      </div>
      <p className={`${large ? "text-4xl" : "text-2xl"} font-black text-rose-600`}>산후조리원 핫딜가 {formatCurrency(closedMallPrice)}</p>
      <p className={`${large ? "text-lg" : "text-sm"} font-black text-slate-600`}>정상가 대비 {formatCurrency(deal.savings)} 할인</p>
      <PriceAnalysisButton productName={productName} closedMallPrice={closedMallPrice} platformLowestPrice={platformLowestPrice} />
    </div>
  );
}

const discountBands = [
  { title: "베스트 할인", eyebrow: "플랫폼 최저가 대비", min: 36, max: 80 },
  { title: "베이비 특가", eyebrow: "산후조리원 핫딜 추가 할인", min: 10, max: 35 },
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

function searchableProductText(product: Product, content?: StorefrontContent) {
  const profile = profileFor(product, content);
  return [
    product.name,
    product.brand,
    product.category,
    product.subtitle,
    ...(product.tags ?? []),
    ...(product.badges ?? []),
    profile.brand,
    profile.displayName,
    profile.subtitle,
    profile.category,
    ...profile.tags,
    ...profile.badges,
  ]
    .filter(Boolean)
    .join(" ");
}

function productsForDeal(products: Product[], dealId: string, content?: StorefrontContent) {
  const deal = dealFilters.find((candidate) => candidate.id === dealId) ?? dealFilters[0];

  return sortByNormalPriceDiscount(products).filter((product) => {
    const rate = discountRate(product);
    if (rate < deal.min || rate > deal.max) return false;

    if (!("keywords" in deal)) return true;

    const searchable = searchableProductText(product, content);
    return deal.keywords.some((keyword) => searchable.includes(keyword));
  });
}

function dealHrefForBanner(bannerId: string) {
  const deal = dealFilters.find((candidate) => candidate.bannerId === bannerId);
  return deal ? `/tablet/products/deals/${deal.id}/` : SHOP_HOME_HREF;
}

function brandHref(brandId: string) {
  return `/tablet/products/brands/${brandId}/`;
}

function brandForId(brandId: string, content?: StorefrontContent): MallBrand | undefined {
  return content?.brands.find((brand) => brand.id === brandId) ?? mallBrands.find((brand) => brand.id === brandId);
}

function productsForBrand(products: Product[], brand: MallBrand | undefined, content?: StorefrontContent) {
  if (!brand) return [];

  return sortByNormalPriceDiscount(products).filter((product) => {
    const profile = profileFor(product, content);
    return profile.brand === brand.name || product.brand === brand.name || searchableProductText(product, content).includes(brand.name);
  });
}

function profileFor(product: Product, content?: StorefrontContent): MallProductProfile {
  return (
    content?.productProfiles.find((profile) => profile.productId === product.id) ?? {
      productId: product.id,
      brand: product.brand ?? "A5 Partner",
      displayName: product.name,
      subtitle: product.subtitle ?? "산후조리원 핫딜 전용 상품",
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
            <HardNavigateLink href={SHOP_HOME_HREF} className="flex items-center gap-3" ariaLabel="한산연몰 첫페이지로 이동">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-lg font-black text-white">H</span>
              <span>
                <span className="block text-base font-black tracking-[0.18em]">HANSANYEON</span>
                <span className="block text-[11px] font-bold text-rose-600">전용 멤버십 산후조리원 핫딜</span>
              </span>
            </HardNavigateLink>
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
      <HardNavigateLink href={heroBanner.href || SHOP_HOME_HREF} className="block" ariaLabel={heroBanner.title}>
        <div className="relative min-h-[420px]">
          <img src={heroBanner.imageUrl} alt={heroBanner.title} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </HardNavigateLink>
    </section>
  );
}

function PromoBannerGrid({ content }: { content: StorefrontContent }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {content.promoBanners.map((banner) => (
        <HardNavigateLink
          key={banner.id}
          href={dealHrefForBanner(banner.id)}
          className="group overflow-hidden rounded-md border border-white/15 bg-white/20 backdrop-blur-md"
          ariaLabel={`${banner.title} 상품 보기`}
        >
          <div className="relative min-h-40">
            <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]" />
          </div>
        </HardNavigateLink>
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
            <p className="text-xs font-black text-rose-600">산후조리원 핫딜 안내</p>
            <h3 className="mt-2 text-2xl font-black">객실 전용 특가</h3>
          </div>
        </div>
      </article>
      <article className="rounded-md border border-white/25 bg-white/35 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">산후조리원 핫딜 안내</p>
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
          <HardNavigateLink
            key={brand.id}
            href={brandHref(brand.id)}
            className="rounded-md bg-white/35 p-3 text-center text-slate-950 shadow-sm backdrop-blur-md transition hover:bg-white/60 active:scale-[0.99]"
            ariaLabel={`${brand.name} 상품 보기`}
          >
            <div className="flex h-16 items-center justify-center">
              <img src={brand.logoUrl} alt={brand.name} className="max-h-12 max-w-full object-contain" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">{brand.category}</p>
          </HardNavigateLink>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, content }: { product: Product; content?: StorefrontContent }) {
  const profile = profileFor(product, content);
  const productHref = `/tablet/products/${product.id}/`;
  const rate = discountRate(product);

  return (
    <article className="group overflow-hidden rounded-md bg-white/45 text-slate-950 shadow-sm ring-1 ring-white/25 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/65 hover:shadow-2xl">
      <HardNavigateLink
        href={productHref}
        className="relative block aspect-[4/5] cursor-pointer overflow-hidden bg-slate-100 touch-manipulation focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/60"
        ariaLabel={`${profile.displayName} 상세페이지로 이동`}
        title={`${profile.displayName} 상세페이지`}
      >
        <img src={profile.imageUrl} alt={profile.displayName} draggable={false} className="pointer-events-none h-full w-full object-cover transition group-hover:scale-[1.03]" />
        <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-1 text-xs font-black text-white">{rate}%</span>
      </HardNavigateLink>
      <div className="grid gap-3 p-4">
        <Link href={productHref} className="block">
          <p className="text-xs font-black text-rose-600">{profile.brand}</p>
          <h3 className="mt-1 text-base font-black leading-6">{profile.displayName}</h3>
        </Link>
        <ProductPriceSummary product={product} productName={profile.displayName} />
        <form action={productHref}>
          <button type="submit" className="w-full rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
            상품 둘러보기
          </button>
        </form>
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

function FilteredProductCollection({
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
  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-white/25 bg-white/35 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>
      </div>
      {products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={`${title}-${product.id}`} product={product} content={content} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-white/25 bg-white/35 p-8 text-center text-slate-950 shadow-sm backdrop-blur-xl">
          <p className="text-lg font-black">현재 표시할 상품이 없습니다.</p>
        </div>
      )}
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
    <StoreShell title="산후조리원 핫딜 쇼핑 홈" subtitle="태블릿 산후조리원 핫딜" context={context}>
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

export async function TabletDealProductsPage({ dealId }: { dealId: string }) {
  const context = await getContext();
  const products = await getApprovedProducts();
  const deal = dealFilters.find((candidate) => candidate.id === dealId) ?? dealFilters[0];

  return (
    <StoreShell title={deal.title} subtitle={deal.eyebrow} context={context}>
      <FilteredProductCollection title={deal.title} eyebrow={deal.eyebrow} products={productsForDeal(products, deal.id, context.content)} content={context.content} />
    </StoreShell>
  );
}

export async function TabletBrandProductsPage({ brandId }: { brandId: string }) {
  const context = await getContext();
  const products = await getApprovedProducts();
  const brand = brandForId(brandId, context.content);

  return (
    <StoreShell title={brand?.name ?? "브랜드 상품"} subtitle="브랜드관" context={context}>
      <FilteredProductCollection
        title={brand ? `${brand.name} 상품` : "브랜드 상품"}
        eyebrow={brand?.category ?? "브랜드관"}
        products={productsForBrand(products, brand, context.content)}
        content={context.content}
      />
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
              <ProductPriceSummary product={product} productName={profile.displayName} large />
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

export async function TabletOrdersPage() {
  const context = await getContext();

  return (
    <StoreShell title="주문 완료 내역" subtitle="태블릿 개인정보 보호 주문 조회" context={context}>
      <LiveTabletOrderHistoryPage />
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
