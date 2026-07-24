import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { VisitTracker } from "@/components/analytics/VisitTracker";
import { HardNavigateLink } from "@/components/storefront/HardNavigateLink";
import { AddToCartPanel, FloatingCartButton, LiveCartPage, LiveQrSessionPanel, LiveTabletOrderHistoryPage } from "@/components/storefront/LiveShopClient";
import { BrandProductCollectionClient } from "@/components/storefront/BrandProductCollectionClient";
import { PriceAnalysisButton } from "@/components/storefront/PriceAnalysisButton";
import { ProductDetailTabs } from "@/components/storefront/ProductDetailTabs";
import { TabletHomeRuntimeSections } from "@/components/storefront/TabletHomeRuntimeSections";
import { FloatingHistoryButtons } from "@/components/tablet/FloatingHistoryButtons";
import { TabletAccessGate, TabletAutoEntryProbe, TabletContextBadge } from "@/components/tablet/TabletAccessFlow";
import { companyProductCategories } from "@/data/companyProductCategories";
import type { MallBrand, MallProductProfile } from "@/types/storefrontContent";
import { readBackendStorefrontProductDetail } from "@/lib/firebase/liveShopBackend";

import type { StorefrontContent } from "@/lib/repositories/types";
import { brandIdForProductBrand, brandNameKey, isRegisteredProductForBrandPage, productBrandName } from "@/lib/storefront/brandRouting";
import { categoryLabelForRouteId, categoryTabletPathFromLabel } from "@/lib/storefront/categoryRouting";
import { normalizeStorefrontBusinessNo, productTabletPath } from "@/lib/storefront/productUrls";
import { readSharedClosedMallProducts } from "@/lib/storefront/readSharedClosedMallProducts";
import { safeStorefrontMediaUrl } from "@/lib/storefront/safeMediaUrl";
import { readStorefrontContentSnapshot } from "@/lib/storefront/storefrontSnapshot";
import { REGISTERED_CLOSED_MALL_BUSINESS_NO, normalizeSharedClosedMallProducts } from "@/lib/storefront/sharedClosedMallCatalog";
import { remoteShippingFeeLabel, shippingFeeLabel } from "@/lib/shipping/shippingFee";
import { formatCurrency } from "@/lib/utils/format";
import type { Product } from "@/types/commerce";

const SHOP_HOME_HREF = "/tablet/products/";
const tabletNavLinks = [
  { href: "/orders/guest/", label: "\uC8FC\uBB38\uC870\uD68C" },
];

const dealFilters = [
  { id: "discount-51", bannerId: "promo-discount-51", title: "최대 51~80% 할인", eyebrow: "할인 상품", min: 51, max: 80 },
  { id: "discount-36-50", bannerId: "promo-discount-36-50", title: "최대 36~50% 할인", eyebrow: "할인 상품", min: 36, max: 50 },
  { id: "discount-21-35", bannerId: "promo-discount-21-35", title: "최대 21~35% 할인", eyebrow: "할인 상품", min: 21, max: 35 },
  { id: "discount-10-20", bannerId: "promo-discount-10-20", title: "최대 10~20% 할인", eyebrow: "할인 상품", min: 10, max: 20 },
  { id: "discount-26-35", bannerId: "promo-discount-26-35", title: "최대 21~35% 할인", eyebrow: "할인 상품", min: 21, max: 35 },
  { id: "discount-10-25", bannerId: "promo-discount-10-25", title: "최대 10~20% 할인", eyebrow: "할인 상품", min: 10, max: 20 },
  { id: "clearance-80", bannerId: "promo-clearance-80", title: "최대 51~80% 할인", eyebrow: "할인 상품", min: 51, max: 80 },
  { id: "baby-50", bannerId: "promo-baby-50", title: "최대 36~50% 할인", eyebrow: "할인 상품", min: 36, max: 50 },
  { id: "sanmo-35", bannerId: "promo-sanmo-35", title: "최대 21~35% 할인", eyebrow: "할인 상품", min: 21, max: 35 },
  { id: "new-20", bannerId: "promo-new-20", title: "최대 10~20% 할인", eyebrow: "할인 상품", min: 10, max: 20 },
] as const;

export const dealPageIds = dealFilters.map((deal) => deal.id);
export const brandPageIds: string[] = [];

function brandsFromProducts(products: Product[]): MallBrand[] {
  const byBrand = new Map<string, Product[]>();

  for (const product of products) {
    if (!isRegisteredProductForBrandPage(product)) continue;
    const brandName = productBrandName(product);
    if (!brandName.trim()) continue;
    const key = `${product.companyId}:${brandNameKey(brandName)}`;
    const current = byBrand.get(key) ?? [];
    current.push(product);
    byBrand.set(key, current);
  }

  return [...byBrand.values()].map((items) => {
    const first = items[0];
    const name = productBrandName(first);
    const businessNo = productBusinessNoForStorefront(first);

    return {
      id: brandIdForProductBrand(name, first.id === "product-test-1004" ? REGISTERED_CLOSED_MALL_BUSINESS_NO : first.companyId),
      name,
      logoUrl: safeStorefrontMediaUrl(first.imageUrl) || safeStorefrontMediaUrl(first.gallery?.[0]),
      category: first.category,
      status: "featured",
      companyId: first.companyId,
      businessNo,
    };
  });
}

export async function getBrandPageStaticParams() {
  const products = await getApprovedProducts();
  const ids = new Set(brandsFromProducts(products).map((brand) => brand.id));
  ids.add(brandIdForProductBrand(REGISTERED_CLOSED_MALL_BUSINESS_NO, REGISTERED_CLOSED_MALL_BUSINESS_NO));

  return [...ids].map((brandId) => ({ brandId }));
}

async function getApprovedProducts() {
  return readSharedClosedMallProducts();
}

async function getClosedMallContent(products: Product[]) {
  const content = await readStorefrontContentSnapshot();
  return contentForClosedMallProducts(content, products);
}

function contentForClosedMallProducts(content: StorefrontContent, products: Product[]): StorefrontContent {
  const productIds = new Set(products.map((product) => product.id));
  const productBrands = brandsFromProducts(products);
  const brands = new Map<string, MallBrand>();

  for (const brand of content.brands) {
    brands.set(brand.id, brand);
  }

  for (const brand of productBrands) {
    brands.set(brand.id, brand);
  }

  const categories = [...new Map(products.map((product) => [product.category, product.category])).values()]
    .filter(Boolean)
    .map((category) => ({ id: category, label: category, helper: "" }));

  return {
    ...content,
    brands: [...brands.values()],
    categories,
    productProfiles: content.productProfiles.filter((profile) => productIds.has(profile.productId)),
  };
}

const getPublicProductDetail = cache(async (productId: string) => {
  const result = await readBackendStorefrontProductDetail(productId);
  return result.ok ? result.data : undefined;
});

async function getProduct(productId: string) {
  const detail = await getPublicProductDetail(productId);
  const product = detail?.product;

  if (!product) {
    notFound();
  }

  const normalized = normalizeSharedClosedMallProducts([product])[0];

  if (!normalized) {
    notFound();
  }

  return normalized;
}

async function getProductOptions(productId: string) {
  const detail = await getPublicProductDetail(productId);
  return detail?.options ?? [];
}

function discountRate(product: Product) {
  if (product.priceComparisonVerified !== true) return 0;
  const { listPrice, closedMallPrice } = product.comparison;
  if (!(listPrice > closedMallPrice && closedMallPrice > 0)) return 0;
  return Math.max(0, Math.round(((listPrice - closedMallPrice) / listPrice) * 100));
}

function normalDeal(product: Product) {
  if (product.priceComparisonVerified !== true) return { savings: 0, rate: 0 };
  const { listPrice, closedMallPrice } = product.comparison;
  if (!(listPrice > closedMallPrice && closedMallPrice > 0)) return { savings: 0, rate: 0 };
  const savings = listPrice - closedMallPrice;
  const rate = Math.round((savings / listPrice) * 100);
  return { savings, rate };
}

function ProductPriceSummary({ product, productName, large = false }: { product: Product; productName: string; large?: boolean }) {
  const comparisonVerified = product.priceComparisonVerified === true;
  const deal = normalDeal(product);
  const { listPrice, closedMallPrice, platformLowestPrice } = product.comparison;

  return (
    <div className="grid gap-3 rounded-md bg-white/35 p-4">
      {comparisonVerified && deal.rate > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-normal text-slate-500">
            원판매가 <span className="line-through">{formatCurrency(listPrice)}</span>
          </p>
          <span className="rounded-md bg-rose-600 px-2 py-1 text-xs font-normal text-white">{deal.rate}% 할인</span>
        </div>
      ) : null}
      <p className={`${large ? "text-4xl" : "text-2xl"} font-normal text-rose-600`}>폐쇄몰 판매가 {formatCurrency(closedMallPrice)}</p>
      {comparisonVerified && deal.rate > 0 ? (
        <p className={`${large ? "text-lg" : "text-sm"} font-normal text-slate-600`}>절약 금액 {formatCurrency(deal.savings)}</p>
      ) : null}
      <PriceAnalysisButton
        productName={productName}
        closedMallPrice={closedMallPrice}
        platformLowestPrice={platformLowestPrice}
        verified={comparisonVerified}
      />
    </div>
  );
}

function sortByNormalPriceDiscount(products: Product[]) {
  return [...products]
    .filter((product) => discountRate(product) >= 10)
    .sort((left, right) => discountRate(right) - discountRate(left));
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

function productsForDeal(products: Product[], dealId: string) {
  const deal = dealFilters.find((candidate) => candidate.id === dealId) ?? dealFilters[0];

  return sortByNormalPriceDiscount(products).filter((product) => {
    const rate = discountRate(product);
    return rate >= deal.min && rate <= deal.max;
  });
}

function brandHref(brandId: string) {
  return `/tablet/products/brands/${brandId}/`;
}

function businessBrandHref(businessNo: string) {
  const normalized = normalizeStorefrontBusinessNo(businessNo);
  return normalized ? `/a5mall/${normalized}/` : "/tablet/products/";
}

function businessNoFromA5MallPath(value?: string) {
  const text = String(value ?? "");
  const match = text.match(/\/a5mall\/([^/?#]+)/);
  return match ? normalizeStorefrontBusinessNo(decodeURIComponent(match[1])) : "";
}

function productBusinessNoForStorefront(product: Product) {
  const explicitBusinessNo = normalizeStorefrontBusinessNo(product.sellerBusinessNoNormalized ?? product.sellerBusinessNo);
  if (explicitBusinessNo) return explicitBusinessNo;

  const pathBusinessNo =
    businessNoFromA5MallPath(product.businessProductPath) ||
    businessNoFromA5MallPath(product.businessBrandPath) ||
    businessNoFromA5MallPath(product.businessProductUrl) ||
    businessNoFromA5MallPath(product.businessBrandUrl);
  if (pathBusinessNo) return pathBusinessNo;

  return product.id === "product-test-1004" ? REGISTERED_CLOSED_MALL_BUSINESS_NO : "";
}

function brandForId(brandId: string, content?: StorefrontContent, products: Product[] = []): MallBrand | undefined {
  return (
    content?.brands.find((brand) => brand.id === brandId) ??
    brandsFromProducts(products).find((brand) => brand.id === brandId)
  );
}

function productsForBusinessNo(products: Product[], businessNo: string) {
  const normalized = normalizeStorefrontBusinessNo(businessNo);
  if (!normalized) return [];
  return products.filter((product) => productBusinessNoForStorefront(product) === normalized);
}

function brandForBusinessNo(businessNo: string, content?: StorefrontContent, products: Product[] = []): MallBrand | undefined {
  const normalized = normalizeStorefrontBusinessNo(businessNo);
  const businessProducts = productsForBusinessNo(products, normalized);
  const first = businessProducts[0];
  const directContentBrand = content?.brands.find((brand) => {
    const brandBusinessNo = normalizeStorefrontBusinessNo(brand.businessNo);
    const companyBusinessNo = normalizeStorefrontBusinessNo(brand.companyId);
    return (
      brandBusinessNo === normalized ||
      companyBusinessNo === normalized ||
      brand.companyId === `business-${normalized}` ||
      Boolean(first && brand.companyId === first.companyId)
    );
  });
  if (directContentBrand) return directContentBrand;
  if (!first) return undefined;

  const generatedId = brandIdForProductBrand(productBrandName(first), normalized);

  return {
    id: generatedId,
    name: productBrandName(first),
    logoUrl: safeStorefrontMediaUrl(first.imageUrl) || safeStorefrontMediaUrl(first.gallery?.[0]),
    category: first.category,
    status: "featured",
    companyId: first.companyId,
    businessNo: normalized,
  };
}

function productsForBrand(products: Product[], brand: MallBrand | undefined, content?: StorefrontContent) {
  if (!brand) return [];

  return products.filter((product) => {
    const brandBusinessNo = normalizeStorefrontBusinessNo(brand.businessNo);
    if (brandBusinessNo && productBusinessNoForStorefront(product) === brandBusinessNo) return true;
    if (brand.companyId && product.companyId === brand.companyId) return true;

    const profile = profileFor(product, content);
    return (
      brandNameKey(profile.brand) === brandNameKey(brand.name) ||
      brandNameKey(product.brand ?? "") === brandNameKey(brand.name) ||
      searchableProductText(product, content).includes(brand.name)
    );
  });
}

function profileFor(product: Product, content?: StorefrontContent): MallProductProfile {
  const productGallery = (product.gallery ?? []).map((item) => safeStorefrontMediaUrl(item)).filter(Boolean);
  const productImage = safeStorefrontMediaUrl(product.imageUrl) || productGallery[0] || "";
  const contentProfile = content?.productProfiles.find((profile) => profile.productId === product.id);
  const contentGallery = (contentProfile?.gallery ?? []).map((item) => safeStorefrontMediaUrl(item)).filter(Boolean);
  const contentImage = safeStorefrontMediaUrl(contentProfile?.imageUrl);

  return {
    productId: product.id,
    brand: product.brand ?? contentProfile?.brand ?? "A5 입점사",
    displayName: product.name || contentProfile?.displayName || product.id,
    subtitle: product.subtitle ?? contentProfile?.subtitle ?? "\uC0B0\uD6C4\uC870\uB9AC\uC6D0 \uD56B\uB51C \uC804\uC6A9 \uC0C1\uD488",
    category: product.category || contentProfile?.category || "",
    imageUrl: productImage || contentImage,
    gallery: productGallery.length ? productGallery : contentGallery.length ? contentGallery : productImage ? [productImage] : contentImage ? [contentImage] : [],
    badges: product.badges?.length ? product.badges : contentProfile?.badges ?? [],
    tags: product.tags?.length ? product.tags : contentProfile?.tags ?? [product.category],
    review: product.reviewSummary ?? contentProfile?.review ?? { rating: 4.5, count: 0, highlight: "" },
    detailTabs: product.detailSections?.length ? product.detailSections : contentProfile?.detailTabs ?? [],
  };
}

function HansanyeonLegalFooter() {
  return (
    <footer className="mx-auto mt-10 max-w-7xl border-t border-white/25 px-4 py-6 text-xs font-normal leading-6 text-slate-700 md:px-6">
      <div className="rounded-md bg-white/35 p-4 shadow-sm backdrop-blur-xl">
        <nav aria-label={"\uBC95\uC801 \uACE0\uC9C0"} className="mb-3 flex flex-wrap gap-3 text-slate-950">
          <a href="https://www.sanmo.kr/bbs/content.php?co_id=provision" target="_blank" rel="noreferrer" className="font-normal underline-offset-4 hover:underline">
            {"\uC11C\uBE44\uC2A4 \uC774\uC6A9\uC57D\uAD00"}
          </a>
          <a href="https://www.sanmo.kr/bbs/content.php?co_id=privacy" target="_blank" rel="noreferrer" className="font-normal underline-offset-4 hover:underline">
            {"\uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68"}
          </a>
        </nav>
        <p>
          {"(\uC8FC)\uD55C\uAD6D\uC0B0\uD6C4\uC870\uB9AC\uC6D0\uC5F0\uD569\uD68C \uB300\uD45C\uC790 : \uC774\uC11D\uBC94 \uB300\uD45C\uC804\uD654 : 02-2038-2203 \uD329\uC2A4 : 02-2038-2203 \uC0AC\uC5C5\uC790\uB4F1\uB85D\uBC88\uD638 : 760-86-03326"}
        </p>
        <p>
          {"\uD1B5\uC2E0\uD310\uB9E4\uC5C5\uC2E0\uACE0\uBC88\uD638 : \uC81C2025-\uC11C\uC6B8\uAC15\uB0A8-00065 (\uB2F4\uB2F9\uC790 : \uC774\uC11D\uBC94) \uAC1C\uC778\uC815\uBCF4\uBCF4\uD638\uCC45\uC784\uC790 : \uC774\uC11D\uBC94 \uC774\uBA54\uC77C : hansy0619@naver.com"}
        </p>
        <p>
          {"\uC2A4\uB9C8\uD2B8\uB9C8\uCF13(\uD55C\uAD6D\uC0B0\uD6C4\uC870\uB9AC\uC6D0\uC5F0\uD569\uD68C)\uC740 \uD1B5\uC2E0\uD310\uB9E4\uC911\uAC1C\uC790\uC774\uBA70, \uD310\uB9E4\uC790\uAC00 \uB4F1\uB85D\uD55C \uC0C1\uD488 \uBC0F \uAC70\uB798\uC5D0 \uB300\uD55C \uC815\uBCF4 \uB4F1\uC758 \uCC45\uC784\uC740 \uAC01 \uD310\uB9E4\uC790\uC5D0\uAC8C \uC788\uC2B5\uB2C8\uB2E4."}
        </p>
        <p className="mt-3 text-slate-500">{"Copyright \uD55C\uAD6D\uC0B0\uD6C4\uC870\uB9AC\uC6D0\uC5F0\uD569\uD68C Inc. All rights reserved."}</p>
      </div>
    </footer>
  );
}

function ProductMediaFrame({ src, alt, square = false }: { src: string; alt: string; square?: boolean }) {
  const imageUrl = safeStorefrontMediaUrl(src);
  const shapeClass = square ? "aspect-square w-full" : "h-full w-full";

  if (!imageUrl || imageUrl === "/file.svg") {
    return <div className={`${shapeClass} bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_48%,#e0f2fe_100%)]`} aria-label={alt} />;
  }

  return <img src={imageUrl} alt={alt} draggable={false} className={`${shapeClass} object-cover transition group-hover:scale-[1.03]`} />;
}

function productFulfillmentLabel(product: Product) {
  const delivery = product.fulfillment?.delivery;
  const pickup = product.fulfillment?.pickup;

  if (delivery && pickup) return "\uD604\uC7A5\uC218\uB839 + \uD0DD\uBC30";
  if (pickup) return "\uD604\uC7A5\uC218\uB839";
  if (delivery) return "\uD0DD\uBC30\uBC30\uC1A1";
  return "\uC218\uB839 \uBC29\uC2DD \uD655\uC778";
}

function productStockLabel(product: Product) {
  if (product.stock <= 0) return "\uD488\uC808";
  if (product.stock <= 5) return `\uC794\uC5EC ${product.stock}\uAC1C`;
  return "\uC7AC\uACE0 \uC5EC\uC720";
}

const officialCategoryLabels = companyProductCategories.map((category) => category.label);

function closedMallCategoryLabels(products: Product[]) {
  const categorySet = new Set(products.map((product) => product.category).filter(Boolean));
  const officialLabels = officialCategoryLabels.filter((category) => categorySet.has(category));
  const extraLabels = [...categorySet]
    .filter((category) => !officialCategoryLabels.includes(category))
    .sort((left, right) => left.localeCompare(right, "ko-KR"));

  return [...officialLabels, ...extraLabels];
}

function sortStorefrontProducts(products: Product[]) {
  return [...products].sort((left, right) => {
    const rightInStock = right.stock > 0 ? 1 : 0;
    const leftInStock = left.stock > 0 ? 1 : 0;
    if (rightInStock !== leftInStock) return rightInStock - leftInStock;

    const discountDelta = discountRate(right) - discountRate(left);
    if (discountDelta !== 0) return discountDelta;

    return left.name.localeCompare(right.name, "ko-KR");
  });
}

function productsForClosedMallCategory(products: Product[], category: string) {
  return sortStorefrontProducts(products.filter((product) => product.category === category));
}

function productsForClosedMallCategoryId(products: Product[], categoryId: string) {
  const category = categoryLabelForRouteId(categoryId, closedMallCategoryLabels(products));
  return {
    category,
    products: productsForClosedMallCategory(products, category),
  };
}

function StoreShell({
  children,
  requireTabletAccess = true,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  requireTabletAccess?: boolean;
}) {
  const shell = (
      <main className="a5-tablet-store-shell min-h-screen bg-transparent text-white">
        <VisitTracker channel="closed_mall_tablet" sourceApp="a5" />
        <TabletAutoEntryProbe />
        <header className="sticky top-0 z-20 border-b border-white/25 bg-white/35 text-slate-950 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/30">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:flex-nowrap md:px-6">
            <HardNavigateLink href={SHOP_HOME_HREF} className="flex items-center gap-3" ariaLabel="\uD3D0\uC1C4\uBAB0 \uD648">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-lg font-normal text-white">H</span>
              <span>
                <span className="block text-base font-normal tracking-[0.18em]">HANSANYEON</span>
                <span className="block text-[11px] font-normal text-rose-600">\uD3D0\uC1C4\uBAB0 \uD56B\uB51C</span>
              </span>
            </HardNavigateLink>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <nav className="flex flex-wrap items-center gap-2" aria-label="tablet mall navigation">
                {tabletNavLinks.map((item) => (
                  <HardNavigateLink
                    key={item.href}
                    href={item.href}
                    className="rounded-md bg-white/65 px-3 py-2 text-xs font-normal text-slate-800 ring-1 ring-white/70 transition hover:bg-white"
                    ariaLabel={`${item.label} \uD398\uC774\uC9C0`}
                  >
                    {item.label}
                  </HardNavigateLink>
                ))}
              </nav>
              <TabletContextBadge />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">{children}</div>
        <HansanyeonLegalFooter />
        <FloatingHistoryButtons />
        <FloatingCartButton />
      </main>
  );

  if (!requireTabletAccess) return shell;

  return <TabletAccessGate>{shell}</TabletAccessGate>;
}

function ProductCard({ product, content }: { product: Product; content?: StorefrontContent }) {
  const profile = profileFor(product, content);
  const productHref = productTabletPath(product);
  const rate = discountRate(product);
  const visibleBadges = [...new Set([productFulfillmentLabel(product), shippingFeeLabel(product.shippingFeePolicy), productStockLabel(product), ...profile.badges])].slice(0, 3);

  return (
    <article className="group overflow-hidden rounded-md bg-white/45 text-slate-950 shadow-sm ring-1 ring-white/25 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/65 hover:shadow-2xl">
      <HardNavigateLink
        href={productHref}
        className="relative block aspect-[4/5] cursor-pointer overflow-hidden bg-slate-100 touch-manipulation focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/60"
        ariaLabel={`${profile.displayName} \uC0C1\uC138 \uD398\uC774\uC9C0`}
        title={`${profile.displayName} \uC0C1\uC138 \uD398\uC774\uC9C0`}
      >
        <ProductMediaFrame src={profile.imageUrl} alt={profile.displayName} />
        {rate > 0 ? <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-1 text-xs font-normal text-white">{rate}%</span> : null}
      </HardNavigateLink>
      <div className="grid gap-3 p-4">
        <Link href={productHref} className="block">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-normal text-rose-600">{profile.brand}</p>
            <span className="rounded-md bg-white/65 px-2 py-1 text-[11px] font-normal text-slate-600">{profile.category}</span>
          </div>
          <h3 className="mt-1 text-base font-normal leading-6">{profile.displayName}</h3>
        </Link>
        <ProductPriceSummary product={product} productName={profile.displayName} />
        {remoteShippingFeeLabel(product.shippingFeePolicy) ? (
          <p className="rounded-md bg-white/55 px-3 py-2 text-xs font-normal text-slate-600">{remoteShippingFeeLabel(product.shippingFeePolicy)}</p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {visibleBadges.map((badge) => (
            <span key={badge} className="rounded-md bg-white/70 px-2 py-1 text-[11px] font-normal text-slate-700 ring-1 ring-white/80">
              {badge}
            </span>
          ))}
        </div>
        <form action={productHref}>
          <button type="submit" className="w-full rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-normal text-white">
            {"\uC0C1\uD488 \uC0C1\uC138 \uBCF4\uAE30"}
          </button>
        </form>
      </div>
    </article>
  );
}

function categoryAnchorId(category: string) {
  return `category-${encodeURIComponent(category || "all")}`;
}

function CategoryProductSections({ products, content }: { products: Product[]; content?: StorefrontContent }) {
  const categories = closedMallCategoryLabels(products);

  if (products.length === 0) return null;

  return (
    <section id="closed-mall-products" className="grid gap-4">
      {categories.map((category) => {
        const categoryProducts = productsForClosedMallCategory(products, category);
        const visibleProducts = categoryProducts.slice(0, 12);

        return (
          <section key={category} id={categoryAnchorId(category)} className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-normal uppercase tracking-[0.18em] text-rose-400">등록 상품</p>
                <h2 className="mt-1 text-2xl font-normal">{category}</h2>
              </div>
              <Link
                href={categoryTabletPathFromLabel(category)}
                className="rounded-md bg-white/70 px-3 py-2 text-sm font-normal text-slate-800 ring-1 ring-white/70 transition hover:bg-white"
              >
                전체보기 {categoryProducts.length}개
              </Link>
            </div>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
              {visibleProducts.map((product) => (
                <div key={`${category}-${product.id}`} className="w-[220px] shrink-0 snap-start md:w-[250px]">
                  <ProductCard product={product} content={content} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
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
        <p className="text-xs font-normal uppercase tracking-[0.18em] text-rose-700">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-normal">{title}</h2>
      </div>
      {products.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={`${title}-${product.id}`} product={product} content={content} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-white/25 bg-white/35 p-8 text-center text-slate-950 shadow-sm backdrop-blur-xl">
          <p className="text-lg font-normal">{"\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
        </div>
      )}
    </section>
  );
}

function ProductTrustPanel({ product, profile }: { product: Product; profile: MallProductProfile }) {
  return (
    <section className="grid gap-3 rounded-md bg-white/45 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["수령", productFulfillmentLabel(product)],
          ["배송비", shippingFeeLabel(product.shippingFeePolicy)],
          ["재고", productStockLabel(product)],
          ["후기", `${profile.review.rating.toFixed(1)} / ${profile.review.count}개`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-white/60 p-3 ring-1 ring-white/70">
            <p className="text-xs font-normal text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-normal text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      {profile.review.highlight ? <p className="rounded-md bg-rose-50 p-3 text-sm font-normal text-rose-900">{profile.review.highlight}</p> : null}
    </section>
  );
}

function ProductGallery({ product, content }: { product: Product; content?: StorefrontContent }) {
  const profile = profileFor(product, content);
  const images = (profile.gallery.length ? profile.gallery : [profile.imageUrl]).map((item) => safeStorefrontMediaUrl(item)).filter(Boolean);
  const primaryImage = images[0] ?? "";

  return (
    <section className="grid gap-3">
      <div className="overflow-hidden rounded-md bg-white/35 shadow-sm backdrop-blur-md">
        <ProductMediaFrame src={primaryImage} alt={profile.displayName} square />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(images.length ? images : [primaryImage]).slice(0, 3).map((image, index) => (
          <div key={`${image}-${index}`} className="overflow-hidden rounded-md bg-white/35 shadow-sm backdrop-blur-md">
            <ProductMediaFrame src={image} alt={`${profile.displayName} ${index + 1}`} square />
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
  const products = await getApprovedProducts();
  const content = await getClosedMallContent(products);

  return (
    <StoreShell title="폐쇄몰 상품" subtitle="태블릿 핫딜" requireTabletAccess={false}>
      <div className="grid gap-3 md:gap-4">
        <TabletHomeRuntimeSections fallbackContent={content} products={products} />
        <CategoryProductSections products={products} content={content} />
      </div>
    </StoreShell>
  );
}

export async function TabletDealProductsPage({ dealId }: { dealId: string }) {
  const products = await getApprovedProducts();
  const content = await getClosedMallContent(products);
  const deal = dealFilters.find((candidate) => candidate.id === dealId) ?? dealFilters[0];

  return (
    <StoreShell title={deal.title} subtitle={deal.eyebrow} requireTabletAccess={false}>
      <FilteredProductCollection title={deal.title} eyebrow={deal.eyebrow} products={productsForDeal(products, deal.id)} content={content} />
    </StoreShell>
  );
}

export async function TabletCategoryProductsPage({ categoryId }: { categoryId: string }) {
  const products = await getApprovedProducts();
  const content = await getClosedMallContent(products);
  const category = productsForClosedMallCategoryId(products, categoryId);

  return (
    <StoreShell title={category.category} subtitle="카테고리 상품" requireTabletAccess={false}>
      <FilteredProductCollection title={category.category} eyebrow="카테고리 상품" products={category.products} content={content} />
    </StoreShell>
  );
}

export async function TabletBrandProductsPage({ brandId }: { brandId: string }) {
  const products = await getApprovedProducts();
  const content = await getClosedMallContent(products);
  const brand = brandForId(brandId, content, products);
  const brandProducts = productsForBrand(products, brand, content);
  const currentBrandHref = brandHref(brand?.id ?? brandId);

  return (
    <StoreShell title={brand?.name ?? "브랜드 상품"} subtitle="브랜드관" requireTabletAccess={false}>
      <BrandProductCollectionClient
        brandName={brand?.name ?? "브랜드 상품"}
        brandCategory={brand?.category ?? "브랜드관"}
        brandLogoUrl={brand?.logoUrl}
        products={brandProducts}
        content={content}
        brandHref={currentBrandHref}
        newsHref={`${currentBrandHref}news/`}
        initialView="products"
      />
    </StoreShell>
  );
}

export async function TabletBrandNewsPage({ brandId }: { brandId: string }) {
  const products = await getApprovedProducts();
  const content = await getClosedMallContent(products);
  const brand = brandForId(brandId, content, products);
  const brandProducts = productsForBrand(products, brand, content);
  const currentBrandHref = brandHref(brand?.id ?? brandId);

  return (
    <StoreShell title={brand?.name ?? "브랜드 소식"} subtitle="브랜드 소식" requireTabletAccess={false}>
      <BrandProductCollectionClient
        brandName={brand?.name ?? "브랜드 소식"}
        brandCategory={brand?.category ?? "브랜드관"}
        brandLogoUrl={brand?.logoUrl}
        products={brandProducts}
        content={content}
        brandHref={currentBrandHref}
        newsHref={`${currentBrandHref}news/`}
        initialView="news"
      />
    </StoreShell>
  );
}

export async function TabletBusinessBrandPage({ businessNo }: { businessNo: string }) {
  const products = await getApprovedProducts();
  const businessProducts = productsForBusinessNo(products, businessNo);
  const content = await getClosedMallContent(businessProducts);
  const brand = brandForBusinessNo(businessNo, content, products);
  const currentBrandHref = businessBrandHref(businessNo);

  return (
    <StoreShell title={brand?.name ?? businessNo} subtitle={brand?.category ?? ""} requireTabletAccess={false}>
      <BrandProductCollectionClient
        brandName={brand?.name ?? businessNo}
        brandCategory={brand?.category ?? ""}
        brandLogoUrl={brand?.logoUrl}
        products={businessProducts}
        content={content}
        brandHref={currentBrandHref}
        newsHref={`${currentBrandHref}news/`}
        initialView="products"
      />
    </StoreShell>
  );
}

export async function TabletBusinessProductDetailPage({ businessNo, productId }: { businessNo: string; productId: string }) {
  const product = await getProduct(productId);
  const normalizedBusinessNo = normalizeStorefrontBusinessNo(businessNo);

  if (!normalizedBusinessNo || productBusinessNoForStorefront(product) !== normalizedBusinessNo) {
    notFound();
  }

  return <TabletProductDetailPage productId={productId} />;
}

export async function TabletProductDetailPage({ productId }: { productId: string }) {
  const product = await getProduct(productId);
  const options = await getProductOptions(product.id);
  const content = await getClosedMallContent([product]);
  const profile = profileFor(product, content);

  return (
    <StoreShell title={profile.displayName} subtitle={profile.subtitle} requireTabletAccess={false}>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ProductGallery product={product} content={content} />
        <section className="grid gap-4">
          <div className="rounded-md bg-white/45 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-normal text-rose-600">{profile.brand}</p>
              <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-normal text-slate-600">{profile.category}</span>
            </div>
            <h2 className="mt-2 text-4xl font-normal">{profile.displayName}</h2>
            <div className="mt-5">
              <ProductPriceSummary product={product} productName={profile.displayName} large />
            </div>
          </div>

          <AddToCartPanel product={product} options={options} />
          <ProductTrustPanel product={product} profile={profile} />
        </section>
      </div>
      <ProductDetailTabs product={product} profile={profile} />
    </StoreShell>
  );
}

export async function TabletCartPage() {
  return (
    <StoreShell title="장바구니" subtitle="태블릿 장바구니" requireTabletAccess>
      <LiveCartPage fallbackItems={[]} />
    </StoreShell>
  );
}

export async function TabletOrdersPage() {
  return (
    <StoreShell title="주문내역" subtitle="태블릿 주문내역" requireTabletAccess>
      <LiveTabletOrderHistoryPage />
    </StoreShell>
  );
}

export async function TabletQrPage() {
  return (
    <StoreShell title="결제 QR" subtitle="고객 모바일 결제 QR" requireTabletAccess>
      <LiveQrSessionPanel />
    </StoreShell>
  );
}
