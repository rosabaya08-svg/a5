"use client";

import { useEffect, useMemo, useState } from "react";
import { HardNavigateLink } from "@/components/storefront/HardNavigateLink";
import { companyProductCategories } from "@/data/companyProductCategories";
import type { MallBanner, MallBrand } from "@/types/storefrontContent";
import { subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import type { StorefrontContent } from "@/lib/repositories/types";
import { brandIdForProductBrand } from "@/lib/storefront/brandRouting";
import { categoryTabletPathFromLabel } from "@/lib/storefront/categoryRouting";
import { normalizeStorefrontBusinessNo } from "@/lib/storefront/productUrls";
import { firstSafeStorefrontMediaUrl, safeStorefrontMediaUrl } from "@/lib/storefront/safeMediaUrl";
import type { Product } from "@/types/commerce";

type RuntimeSlot = {
  id: string;
  recordId: string;
};

type HomeLayoutMode = "tablet" | "mobile";

const HOME_BANNER_INTERVAL_MS = 6500;

const CONFIG_ID = "storefront-home";

const heroSlot: RuntimeSlot = {
  id: "hero-hansan-sanho",
  recordId: "home-hero-hansan-sanho",
};

const carouselSlots: RuntimeSlot[] = Array.from({ length: 5 }, (_, index) => ({
  id: `main-carousel-${index + 1}`,
  recordId: `home-main-carousel-${index + 1}`,
}));

const promoSlots: RuntimeSlot[] = [
  { id: "promo-clearance-80", recordId: "home-promo-clearance-80" },
  { id: "promo-baby-50", recordId: "home-promo-baby-50" },
  { id: "promo-sanmo-35", recordId: "home-promo-sanmo-35" },
  { id: "promo-new-20", recordId: "home-promo-new-20" },
];

const automaticDiscountPromoBands = [
  { title: "최대 51~80% 할인", eyebrow: "할인 상품", subtitle: "입점사 등록 상품 자동 구간", href: "/tablet/products/deals/discount-51/", min: 51, max: 80 },
  { title: "최대 36~50% 할인", eyebrow: "할인 상품", subtitle: "입점사 등록 상품 자동 구간", href: "/tablet/products/deals/discount-36-50/", min: 36, max: 50 },
  { title: "최대 21~35% 할인", eyebrow: "할인 상품", subtitle: "입점사 등록 상품 자동 구간", href: "/tablet/products/deals/discount-21-35/", min: 21, max: 35 },
  { title: "최대 10~20% 할인", eyebrow: "할인 상품", subtitle: "입점사 등록 상품 자동 구간", href: "/tablet/products/deals/discount-10-20/", min: 10, max: 20 },
] as const;

function recordText(record: CmsRecord | undefined, key: string, fallback = "") {
  const value = record?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

function recordNumber(record: CmsRecord | undefined, key: string, fallback: number) {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function recordBoolean(record: CmsRecord | undefined, key: string, fallback?: boolean) {
  const value = record?.[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function discountRate(product: Product) {
  if (product.priceComparisonVerified !== true) return 0;
  const listPrice = product.comparison.listPrice;
  const closedMallPrice = product.comparison.closedMallPrice;
  if (!(listPrice > closedMallPrice && closedMallPrice > 0)) return 0;
  return Math.max(0, Math.ceil(((listPrice - closedMallPrice) / listPrice) * 100));
}

function productsInDiscountBand(products: Product[], min: number, max: number) {
  return products.filter((product) => {
    const rate = discountRate(product);
    return rate >= min && rate <= max;
  });
}

function buildAutomaticDiscountPromos(sourceBanners: MallBanner[], products: Product[]) {
  return automaticDiscountPromoBands.map((band, index) => {
    const base = sourceBanners[index] ?? sourceBanners[0] ?? {
      id: `auto-discount-${index + 1}`,
      title: band.title,
      subtitle: band.subtitle,
      eyebrow: band.eyebrow,
      href: band.href,
      imageUrl: "",
      tone: "rose" as const,
    };
    const hasImage = Boolean(safeStorefrontMediaUrl(base.imageUrl));
    const autoCopyEnabled = hasImage ? false : (base.autoDiscountCopyEnabled ?? true);
    const showOverlay = hasImage ? false : (base.overlayEnabled ?? true);
    const showText = hasImage ? false : (base.textOverlayEnabled ?? true);
    const showBadge = hasImage ? false : (base.badgeEnabled ?? true);
    const productCount = productsInDiscountBand(products, band.min, band.max).length;

    return {
      ...base,
      title: autoCopyEnabled ? band.title : base.title,
      eyebrow: autoCopyEnabled ? band.eyebrow : base.eyebrow,
      subtitle: autoCopyEnabled ? (productCount > 0 ? `${productCount}개 상품 자동 연결` : band.subtitle) : base.subtitle,
      href: autoCopyEnabled ? band.href : base.href || band.href,
      overlayEnabled: showOverlay,
      textOverlayEnabled: showText,
      badgeEnabled: showBadge,
      autoDiscountCopyEnabled: autoCopyEnabled,
    };
  });
}

function isLive(record: CmsRecord | undefined) {
  const status = recordText(record, "status", recordText(record, "approval_status", ""));
  return ["live", "approved", "scheduled"].includes(status);
}

function sectionForSlot(records: CmsRecord[], slot: RuntimeSlot) {
  const record = records.find((item) => item.id === slot.recordId || recordText(item, "slot_id") === slot.id);
  return isLive(record) ? record : undefined;
}

function mergeBanner(fallback: MallBanner, record?: CmsRecord): MallBanner {
  if (!record) return fallback;

  return {
    ...fallback,
    title: recordText(record, "title", fallback.title),
    eyebrow: recordText(record, "eyebrow", fallback.eyebrow),
    subtitle: recordText(record, "subtitle", fallback.subtitle),
    href: recordText(record, "href", recordText(record, "click_target", fallback.href)),
    imageUrl: firstSafeStorefrontMediaUrl(record?.asset_url, fallback.imageUrl),
    overlayEnabled: recordBoolean(record, "overlay_enabled", fallback.overlayEnabled),
    textOverlayEnabled: recordBoolean(record, "text_overlay_enabled", fallback.textOverlayEnabled),
    badgeEnabled: recordBoolean(record, "badge_enabled", fallback.badgeEnabled),
    autoDiscountCopyEnabled: recordBoolean(record, "auto_discount_copy_enabled", fallback.autoDiscountCopyEnabled),
  };
}

function activeMarketingVideos(records: CmsRecord[]) {
  return records
    .filter((record) => isLive(record) && Boolean(safeStorefrontMediaUrl(recordText(record, "asset_url"))))
    .sort(
      (left, right) =>
        recordNumber(left, "display_order", recordNumber(left, "order", 999)) -
        recordNumber(right, "display_order", recordNumber(right, "order", 999)),
    )
    .slice(0, 5);
}

function brandFromCompanyBrandPage(record: CmsRecord): MallBrand | undefined {
  if (!isLive(record)) return undefined;

  const brandName = recordText(record, "brand_name", recordText(record, "name"));
  const companyId = recordText(record, "company_id", recordText(record, "companyId", "company"));
  const businessNo = normalizeStorefrontBusinessNo(
    recordText(
      record,
      "business_registration_number_normalized",
      recordText(
        record,
        "businessRegistrationNumberNormalized",
        recordText(
          record,
          "business_registration_number",
          recordText(record, "businessRegistrationNumber", companyId),
        ),
      ),
    ),
  );
  const logoUrl = firstSafeStorefrontMediaUrl(record?.logo_url, record?.asset_url);

  if (!brandName) return undefined;

  return {
    id: recordText(record, "brand_id", brandIdForProductBrand(brandName, companyId)),
    name: brandName,
    logoUrl,
    category: recordText(record, "category", recordText(record, "subtitle", "입점 브랜드")),
    status: "featured",
    companyId,
    businessNo,
  };
}

function isVideoAsset(record: CmsRecord) {
  const assetType = recordText(record, "asset_type").toLowerCase();
  const assetUrl = recordText(record, "asset_url").toLowerCase();
  return (
    assetType === "video" ||
    assetType === "gif" ||
    [".mp4", ".webm", ".mov", ".m4v", ".gif"].some((extension) => assetUrl.includes(extension))
  );
}

function normalizeActionType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function videoClickHref(record: CmsRecord) {
  const actionType = normalizeActionType(recordText(record, "video_action_type", recordText(record, "action_type")));
  const explicitTarget =
    recordText(record, "video_action_target") ||
    recordText(record, "action_target") ||
    recordText(record, "href") ||
    recordText(record, "click_target") ||
    recordText(record, "link_url");

  if (["none", "disabled", "off", "no_action", "기능없음", "해당없음"].includes(actionType)) return "";
  if (explicitTarget) return explicitTarget;
  if (["hotdeal", "hot_deal", "deal", "deals", "핫딜"].includes(actionType)) return "/tablet/products/deals/discount-51/";
  if (["luxury", "premium", "luxury_hall", "명품관"].includes(actionType)) return "/luxury/";
  if (["advertiser", "advertiser_url", "external", "광고주", "광고주_url"].includes(actionType)) return "";

  return "/tablet/products/";
}

function HomeImage({ banner, hero = false, mode = "tablet" }: { banner: MallBanner; hero?: boolean; mode?: HomeLayoutMode }) {
  const imageUrl = safeStorefrontMediaUrl(banner.imageUrl);
  const fallbackMode = !imageUrl;
  const showOverlay = fallbackMode ? (banner.overlayEnabled ?? true) : false;
  const showText = fallbackMode ? (banner.textOverlayEnabled ?? true) : false;

  if (imageUrl && mode === "mobile") {
    return (
      <div className="relative overflow-hidden rounded-md bg-white">
        <img
          src={imageUrl}
          alt={banner.title}
          className="block h-auto w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[linear-gradient(135deg,#020617_0%,#4c0519_52%,#111827_100%)] ${
        hero ? "min-h-[220px] md:min-h-[280px]" : "min-h-24"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={banner.title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      ) : null}
      {showOverlay ? <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" /> : null}
      {showText ? (
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <p className="text-xs font-normal text-rose-200">{banner.eyebrow}</p>
          <h2 className={`${hero ? "text-4xl" : "text-2xl"} mt-2 font-normal leading-tight`}>{banner.title}</h2>
        </div>
      ) : null}
    </div>
  );
}

function HeroBannerCarousel({ banners, mode = "tablet" }: { banners: MallBanner[]; mode?: HomeLayoutMode }) {
  const safeBanners = banners.length > 0 ? banners.slice(0, 5) : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const showControls = safeBanners.length > 1;

  useEffect(() => {
    if (safeBanners.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeBanners.length);
    }, HOME_BANNER_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [safeBanners.length]);

  if (safeBanners.length === 0) return null;

  const activeBanner = safeBanners[Math.min(activeIndex, safeBanners.length - 1)];
  const moveBanner = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + safeBanners.length) % safeBanners.length);
  };

  return (
    <section className="grid gap-2 overflow-hidden rounded-md bg-transparent" aria-label="메인 배너">
      <div className="relative">
      <HardNavigateLink href={activeBanner.href} className="block" ariaLabel={`${activeBanner.title} 보기`}>
        <HomeImage banner={activeBanner} hero mode={mode} />
      </HardNavigateLink>
        {showControls ? (
          <>
            <button
              type="button"
              onClick={() => moveBanner(-1)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-xl font-normal text-slate-950 shadow-sm backdrop-blur transition hover:bg-white"
              aria-label="이전 메인 배너"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={() => moveBanner(1)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-xl font-normal text-slate-950 shadow-sm backdrop-blur transition hover:bg-white"
              aria-label="다음 메인 배너"
            >
              {">"}
            </button>
          </>
        ) : null}
      </div>
      {showControls ? (
        <div className="flex items-center justify-center gap-1.5" aria-label="메인 배너 순서">
          {safeBanners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-7 bg-slate-950" : "w-1.5 bg-slate-300"}`}
              aria-label={`메인 배너 ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PromoBannerRail({ banners, products, mode = "tablet" }: { banners: MallBanner[]; products: Product[]; mode?: HomeLayoutMode }) {
  const railBanners = buildAutomaticDiscountPromos(banners, products).slice(0, 4);

  return (
    <aside
      className={mode === "mobile" ? "grid grid-cols-1 gap-1.5" : "grid h-full grid-cols-1 grid-rows-4 gap-2"}
      aria-label="discount banner rail"
    >
      {railBanners.map((banner, index) => (
        <PromoBannerItem key={banner.id} banner={banner} index={index} mode={mode} />
      ))}
    </aside>
  );
}

function PromoBannerItem({ banner, index, mode = "tablet" }: { banner: MallBanner; index: number; mode?: HomeLayoutMode }) {
  const imageUrl = safeStorefrontMediaUrl(banner.imageUrl);
  const fallbackMode = !imageUrl;
  const showOverlay = fallbackMode ? (banner.overlayEnabled ?? true) : false;
  const showText = fallbackMode ? (banner.textOverlayEnabled ?? true) : false;
  const showBadge = fallbackMode ? (banner.badgeEnabled ?? true) : false;

  if (imageUrl && mode === "mobile") {
    return (
      <HardNavigateLink
        href={banner.href}
        className="group block overflow-hidden rounded-md bg-white shadow-sm"
        ariaLabel={`${banner.title} view`}
      >
        <img
          src={imageUrl}
          alt={banner.title}
          className="block h-auto w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      </HardNavigateLink>
    );
  }

  return (
    <HardNavigateLink
      href={banner.href}
      className={`group relative min-h-0 overflow-hidden rounded-md shadow-sm ${
        fallbackMode ? "bg-[linear-gradient(135deg,#020617_0%,#831843_52%,#111827_100%)] text-white" : "bg-white text-slate-950"
      }`}
      ariaLabel={`${banner.title} view`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={banner.title}
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      ) : null}
      {showOverlay ? <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/20 to-transparent" /> : null}
      {showBadge || showText ? (
        <div className="relative flex h-full min-h-0 items-center gap-3 p-3">
          {showBadge ? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-rose-600 text-sm font-normal text-white">{index + 1}</span>
          ) : null}
          {showText ? (
            <span>
              <span className={`block text-xs font-normal ${fallbackMode || showOverlay ? "text-rose-100" : "text-slate-500"}`}>{banner.eyebrow}</span>
              <span className="mt-1 block text-lg font-normal leading-tight">{banner.title}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </HardNavigateLink>
  );
}

function VideoAdStrip({
  records,
  mode = "tablet",
  allowTapSound = true,
}: {
  records: CmsRecord[];
  mode?: HomeLayoutMode;
  allowTapSound?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const record = records[Math.min(activeIndex, Math.max(records.length - 1, 0))];
  const frameClass =
    mode === "mobile"
      ? "relative aspect-video min-h-0 overflow-hidden rounded-md bg-slate-950 text-left text-white shadow-sm backdrop-blur-xl"
      : "relative min-h-[360px] overflow-hidden rounded-md bg-slate-950 text-left text-white shadow-sm backdrop-blur-xl";
  const mediaFitClass = mode === "mobile" ? "object-contain" : "object-cover";

  useEffect(() => {
    if (records.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % records.length);
    }, HOME_BANNER_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [records.length]);

  if (!record) {
    return (
      <article
        className={
          mode === "mobile"
            ? "grid aspect-video place-items-center overflow-hidden rounded-md bg-slate-950 text-center text-white shadow-sm"
            : "grid min-h-[220px] place-items-center overflow-hidden rounded-md bg-slate-950 text-center text-white shadow-sm"
        }
      >
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-rose-300">영상 광고</p>
          <h2 className="mt-2 text-2xl font-normal">등록된 영상이 없습니다</h2>
        </div>
      </article>
    );
  }

  const assetUrl = safeStorefrontMediaUrl(recordText(record, "asset_url"));
  const href = videoClickHref(record);
  const content = (
    <>
      {isVideoAsset(record) ? (
        <video
          src={assetUrl}
          className={`absolute inset-0 h-full w-full ${mediaFitClass}`}
          muted
          playsInline
          autoPlay
          loop
          preload="metadata"
          onPointerDown={
            allowTapSound
              ? (event) => {
                  event.currentTarget.muted = false;
                  event.currentTarget.volume = 1;
                  void event.currentTarget.play();
                }
              : undefined
          }
        />
      ) : (
        <img
          src={assetUrl}
          alt={recordText(record, "title", "video ad")}
          className={`absolute inset-0 h-full w-full ${mediaFitClass}`}
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      )}
      {records.length > 1 ? (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {records.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveIndex(index);
              }}
              className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-7 bg-white" : "w-1.5 bg-white/45"}`}
              aria-label={`영상 ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </>
  );

  if (!href) {
    return <article className={frameClass}>{content}</article>;
  }

  return (
    <HardNavigateLink
      href={href}
      className={`block ${frameClass}`}
      ariaLabel="영상 광고 이동"
    >
      {content}
    </HardNavigateLink>
  );
}

function VideoPromoStage({
  records,
  banners,
  products,
  mode = "tablet",
  allowTapSound = true,
}: {
  records: CmsRecord[];
  banners: MallBanner[];
  products: Product[];
  mode?: HomeLayoutMode;
  allowTapSound?: boolean;
}) {
  return (
    <section
      className={
        mode === "mobile"
          ? "grid items-stretch gap-1.5"
          : "grid items-stretch gap-1 md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_360px]"
      }
    >
      <VideoAdStrip records={records} mode={mode} allowTapSound={allowTapSound} />
      <PromoBannerRail banners={banners} products={products} mode={mode} />
    </section>
  );
}
function BrandGrid({ brands }: { brands: MallBrand[] }) {
  if (brands.length === 0) return null;

  return (
    <section id="enterprise-brand-hall">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-slate-400">공식 브랜드</p>
          <h2 className="mt-1 text-xl font-normal">브랜드관</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {brands.map((brand) => (
          <BrandTile key={brand.id} brand={brand} />
        ))}
      </div>
    </section>
  );
}

function BrandTile({ brand }: { brand: MallBrand }) {
  const logoUrl = safeStorefrontMediaUrl(brand.logoUrl);
  const hasLogoImage = Boolean(logoUrl && logoUrl !== "/file.svg");
  const href = brand.businessNo
    ? `/a5mall/${brand.businessNo}/`
    : `/tablet/products/brands/${brand.id}/`;

  return (
    <HardNavigateLink
      href={href}
      className="rounded-md bg-white/35 p-2 text-center text-slate-950 shadow-sm backdrop-blur-md transition hover:bg-white/60 active:scale-[0.99]"
      ariaLabel={`${brand.name} 브랜드관 열기`}
    >
      <div className="flex h-16 items-center justify-center">
        {hasLogoImage ? (
          <img
            src={logoUrl}
            alt={brand.name}
            className="max-h-12 max-w-full object-contain"
            onError={(event) => {
              event.currentTarget.style.opacity = "0";
            }}
          />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-md bg-slate-950 text-sm font-normal text-white">{brand.name.slice(0, 1)}</span>
        )}
      </div>
      <p className="mt-1 truncate text-sm font-normal text-slate-900">{brand.name}</p>
      <p className="mt-0.5 truncate text-xs font-normal text-slate-500">{brand.category}</p>
    </HardNavigateLink>
  );
}

const categoryVisuals = {
  "baby-goods": { shell: "bg-[#fff5f7] ring-[#f8d9e1]", accent: "bg-[#ef4979]", soft: "bg-[#ffdce7]", kind: "baby-bottle" },
  electronics: { shell: "bg-[#edf7ff] ring-[#cfe9ff]", accent: "bg-[#2877c9]", soft: "bg-[#d9efff]", kind: "device" },
  "baby-cosmetics": { shell: "bg-[#fff9ed] ring-[#f7e6bf]", accent: "bg-[#d49a24]", soft: "bg-[#fff0c8]", kind: "cream-jar" },
  "women-cosmetics": { shell: "bg-[#f7f1ff] ring-[#e3d3ff]", accent: "bg-[#7b5dd6]", soft: "bg-[#ece1ff]", kind: "dropper" },
  "women-goods": { shell: "bg-[#f1fbf7] ring-[#cfeee1]", accent: "bg-[#1e9b72]", soft: "bg-[#dcf7ec]", kind: "pouch" },
  "health-food": { shell: "bg-[#fff6ee] ring-[#f4d9c3]", accent: "bg-[#e06d2f]", soft: "bg-[#ffe6d4]", kind: "capsule" },
} as const;

const fallbackCategoryVisuals = Object.values(categoryVisuals);

function categoryProductCount(products: Product[], label: string) {
  return products.filter((product) => product.category === label).length;
}

function categoryVisualFor(categoryId: string, index: number) {
  return categoryVisuals[categoryId as keyof typeof categoryVisuals] ?? fallbackCategoryVisuals[index % fallbackCategoryVisuals.length];
}

function CategoryVisualIcon({ kind, accent, soft }: { kind: string; accent: string; soft: string }) {
  if (kind === "device") {
    return (
      <span className="relative block h-9 w-9">
        <span className={`absolute left-2 top-1 h-7 w-5 rounded-md ${accent} shadow-sm`} />
        <span className="absolute left-[11px] top-[7px] h-4 w-3.5 rounded-sm bg-white/90" />
        <span className="absolute bottom-1.5 left-[17px] h-1 w-1 rounded-full bg-white/90" />
      </span>
    );
  }

  if (kind === "cream-jar") {
    return (
      <span className="relative block h-9 w-9">
        <span className={`absolute left-2 top-3 h-5 w-5 rounded-b-lg rounded-t-sm ${soft} ring-1 ring-black/5`} />
        <span className={`absolute left-3 top-2 h-2 w-3 rounded-sm ${accent}`} />
        <span className="absolute left-[13px] top-[19px] h-1.5 w-3 rounded-full bg-white/80" />
      </span>
    );
  }

  if (kind === "dropper") {
    return (
      <span className="relative block h-9 w-9">
        <span className={`absolute left-[15px] top-1 h-3 w-2 rounded-full ${accent}`} />
        <span className="absolute left-[17px] top-3 h-3.5 w-1 rounded-full bg-slate-400/70" />
        <span className={`absolute left-3 top-[18px] h-4 w-3.5 rounded-b-md rounded-t-sm ${soft} ring-1 ring-black/5`} />
        <span className={`absolute left-[11px] top-[15px] h-1.5 w-4 rounded-full ${accent}`} />
      </span>
    );
  }

  if (kind === "pouch") {
    return (
      <span className="relative block h-9 w-9">
        <span className={`absolute left-2 top-3 h-5 w-5 rounded-md ${soft} ring-1 ring-black/5`} />
        <span className="absolute left-[11px] top-1.5 h-4 w-3.5 rounded-t-full border-2 border-slate-500/60" />
        <span className={`absolute left-[13px] top-[19px] h-1.5 w-3 rounded-full ${accent}`} />
      </span>
    );
  }

  if (kind === "capsule") {
    return (
      <span className="relative block h-9 w-9">
        <span className={`absolute left-2 top-[15px] h-3 w-6 rotate-[-28deg] rounded-full ${soft} ring-1 ring-black/5`} />
        <span className={`absolute left-2 top-[15px] h-3 w-3 rotate-[-28deg] rounded-l-full ${accent}`} />
        <span className={`absolute left-[14px] top-2 h-3 w-5 rotate-[32deg] rounded-full ${soft} ring-1 ring-black/5`} />
        <span className={`absolute left-[14px] top-2 h-3 w-2.5 rotate-[32deg] rounded-l-full ${accent}`} />
      </span>
    );
  }

  return (
    <span className="relative block h-9 w-9">
      <span className={`absolute left-[13px] top-1 h-2 w-3 rounded-sm ${accent}`} />
      <span className={`absolute left-2 top-3 h-5 w-5 rounded-lg ${soft} ring-1 ring-black/5`} />
      <span className={`absolute left-[13px] top-[17px] h-1.5 w-3 rounded-full ${accent}`} />
      <span className="absolute left-[13px] top-[21px] h-1 w-3 rounded-full bg-white/80" />
    </span>
  );
}

function CategoryCircleRail({ products }: { products: Product[] }) {
  return (
    <section className="grid gap-2 rounded-md bg-white/60 px-3 py-2 text-slate-950 shadow-sm backdrop-blur-xl" aria-label="closed mall category shortcuts">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-rose-600">카테고리</p>
          <h2 className="mt-1 text-xl font-normal">카테고리 바로가기</h2>
        </div>
        <span className="text-xs font-normal text-slate-500">좌우로 밀어서 선택</span>
      </div>
      <nav className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1" aria-label="category icon row">
        {companyProductCategories.map((category, index) => {
          const count = categoryProductCount(products, category.label);
          const visual = categoryVisualFor(category.id, index);

          return (
            <HardNavigateLink
              key={category.id}
              href={categoryTabletPathFromLabel(category.label)}
              className="group grid w-[76px] shrink-0 snap-start justify-items-center gap-1 rounded-md px-1 py-1 text-center transition hover:-translate-y-0.5"
              ariaLabel={`${category.label} category`}
            >
              <span className={`grid h-[58px] w-[58px] place-items-center rounded-2xl ${visual.shell} ring-1 shadow-sm transition group-hover:shadow-md`}>
                <CategoryVisualIcon kind={visual.kind} accent={visual.accent} soft={visual.soft} />
              </span>
              <span className="min-h-[30px] text-xs font-normal leading-4 text-slate-800">{category.label}</span>
              <span className="text-[11px] font-normal text-slate-500">{count}개</span>
            </HardNavigateLink>
          );
        })}
      </nav>
    </section>
  );
}

export function TabletHomeRuntimeSections({
  fallbackContent,
  products = [],
  mode = "tablet",
  allowTapSound,
}: {
  fallbackContent: StorefrontContent;
  products?: Product[];
  mode?: HomeLayoutMode;
  allowTapSound?: boolean;
}) {
  const [homeSections, setHomeSections] = useState<CmsRecord[]>([]);
  const [homeConfigs, setHomeConfigs] = useState<CmsRecord[]>([]);
  const [marketingVideos, setMarketingVideos] = useState<CmsRecord[]>([]);
  const [companyBrandPages, setCompanyBrandPages] = useState<CmsRecord[]>([]);

  useEffect(() => {
    const unsubscribeSections = subscribeCmsRecords("home_sections", setHomeSections, () => undefined);
    const unsubscribeConfigs = subscribeCmsRecords("tablet_home_configs", setHomeConfigs, () => undefined);
    const unsubscribeMarketingVideos = subscribeCmsRecords("marketing_videos", setMarketingVideos, () => undefined);
    const unsubscribeCompanyBrandPages = subscribeCmsRecords("company_brand_pages", setCompanyBrandPages, () => undefined);

    return () => {
      unsubscribeSections();
      unsubscribeConfigs();
      unsubscribeMarketingVideos();
      unsubscribeCompanyBrandPages();
    };
  }, []);

  const content = useMemo(() => {
    const legacyHero = mergeBanner(fallbackContent.heroBanner, sectionForSlot(homeSections, heroSlot));
    const carouselBanners = carouselSlots
      .map((slot) => sectionForSlot(homeSections, slot))
      .filter((record): record is CmsRecord => Boolean(record))
      .map((record, index) => mergeBanner({ ...fallbackContent.heroBanner, id: `main-carousel-${index + 1}` }, record));
    const heroBanners = carouselBanners.length > 0 ? carouselBanners : [legacyHero];
    const promos = promoSlots.map((slot, index) =>
      mergeBanner(fallbackContent.promoBanners[index] ?? fallbackContent.promoBanners[0], sectionForSlot(homeSections, slot)),
    );
    const config = homeConfigs.find((record) => record.id === CONFIG_ID);
    const runtimeBrands = companyBrandPages
      .map(brandFromCompanyBrandPage)
      .filter((brand): brand is MallBrand => Boolean(brand));
    const brandSource = runtimeBrands.length > 0 ? runtimeBrands : fallbackContent.brands;
    const brandCount = Math.max(
      0,
      Math.min(brandSource.length, recordNumber(config, "official_brand_count", brandSource.length)),
    );
    const videoRecords = activeMarketingVideos(marketingVideos);

    return {
      heroBanners,
      promos,
      videoRecords,
      brands: brandSource.slice(0, brandCount),
    };
  }, [companyBrandPages, fallbackContent, homeConfigs, homeSections, marketingVideos]);

  return (
    <>
      <section className="grid gap-1">
        <HeroBannerCarousel banners={content.heroBanners} mode={mode} />
        <VideoPromoStage
          records={content.videoRecords}
          banners={content.promos}
          products={products ?? []}
          mode={mode}
          allowTapSound={allowTapSound ?? mode !== "mobile"}
        />
      </section>
      <BrandGrid brands={content.brands} />
      <CategoryCircleRail products={products ?? []} />
    </>
  );
}
