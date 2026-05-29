"use client";

import { useEffect, useMemo, useState } from "react";
import { HardNavigateLink } from "@/components/storefront/HardNavigateLink";
import {
  mallBrands,
  type MallBanner,
  type MallBrand,
} from "@/data/mockShopContent";
import {
  subscribeCmsRecords,
  type CmsRecord,
} from "@/lib/firebase/contentRepository";
import type { StorefrontContent } from "@/lib/repositories/types";

type RuntimeSlot = {
  id: string;
  recordId: string;
};

const CONFIG_ID = "storefront-home";

const heroSlot: RuntimeSlot = {
  id: "hero-hansan-sanho",
  recordId: "home-hero-hansan-sanho",
};

const promoSlots: RuntimeSlot[] = [
  { id: "promo-clearance-80", recordId: "home-promo-clearance-80" },
  { id: "promo-baby-50", recordId: "home-promo-baby-50" },
  { id: "promo-sanmo-35", recordId: "home-promo-sanmo-35" },
  { id: "promo-new-20", recordId: "home-promo-new-20" },
];

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
    imageUrl: recordText(record, "asset_url", fallback.imageUrl),
  };
}

function HomeImage({ banner, hero = false }: { banner: MallBanner; hero?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-slate-950 ${hero ? "min-h-[420px]" : "min-h-40"}`}>
      <img
        src={banner.imageUrl}
        alt={banner.title}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
      <div className="absolute bottom-5 left-5 right-5 text-white">
        <p className="text-xs font-black text-rose-200">{banner.eyebrow}</p>
        <h2 className={`${hero ? "text-4xl" : "text-2xl"} mt-2 font-black leading-tight`}>{banner.title}</h2>
      </div>
    </div>
  );
}

function HeroBanner({ banner }: { banner: MallBanner }) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-black">
      <HardNavigateLink href={banner.href} className="block" ariaLabel={`${banner.title} 보기`}>
        <HomeImage banner={banner} hero />
      </HardNavigateLink>
    </section>
  );
}

function PromoBannerGrid({ banners }: { banners: MallBanner[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {banners.map((banner) => (
        <HardNavigateLink
          key={banner.id}
          href={banner.href}
          className="group overflow-hidden rounded-md border border-white/15 bg-white/20 backdrop-blur-md"
          ariaLabel={`${banner.title} 보기`}
        >
          <HomeImage banner={banner} />
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
            <p className="text-xs font-black text-rose-600">산후조리원 혜택 안내</p>
            <h3 className="mt-2 text-2xl font-black">객실 전용 특가</h3>
          </div>
        </div>
      </article>
      <article className="rounded-md border border-white/25 bg-white/35 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">산후조리원 혜택 안내</p>
        <h3 className="mt-2 text-3xl font-black">조리원 객실 전용 특가</h3>
      </article>
    </section>
  );
}

function BrandGrid({ brands }: { brands: MallBrand[] }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">공식 입점 브랜드</p>
          <h2 className="mt-2 text-2xl font-black">브랜드관</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {brands.map((brand) => (
          <HardNavigateLink
            key={brand.id}
            href={`/tablet/products/brands/${brand.id}/`}
            className="rounded-md bg-white/35 p-3 text-center text-slate-950 shadow-sm backdrop-blur-md transition hover:bg-white/60 active:scale-[0.99]"
            ariaLabel={`${brand.name} 상품 보기`}
          >
            <div className="flex h-16 items-center justify-center">
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="max-h-12 max-w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.opacity = "0";
                }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">{brand.category}</p>
          </HardNavigateLink>
        ))}
      </div>
    </section>
  );
}

export function TabletHomeRuntimeSections({ fallbackContent }: { fallbackContent: StorefrontContent }) {
  const [homeSections, setHomeSections] = useState<CmsRecord[]>([]);
  const [homeConfigs, setHomeConfigs] = useState<CmsRecord[]>([]);

  useEffect(() => {
    const unsubscribeSections = subscribeCmsRecords("home_sections", setHomeSections, () => undefined);
    const unsubscribeConfigs = subscribeCmsRecords("tablet_home_configs", setHomeConfigs, () => undefined);

    return () => {
      unsubscribeSections();
      unsubscribeConfigs();
    };
  }, []);

  const content = useMemo(() => {
    const hero = mergeBanner(fallbackContent.heroBanner, sectionForSlot(homeSections, heroSlot));
    const promos = promoSlots.map((slot, index) =>
      mergeBanner(fallbackContent.promoBanners[index] ?? fallbackContent.promoBanners[0], sectionForSlot(homeSections, slot)),
    );
    const config = homeConfigs.find((record) => record.id === CONFIG_ID);
    const brandCount = Math.max(
      1,
      Math.min(fallbackContent.brands.length || mallBrands.length, recordNumber(config, "official_brand_count", fallbackContent.brands.length)),
    );

    return {
      hero,
      promos,
      brands: fallbackContent.brands.slice(0, brandCount),
    };
  }, [fallbackContent, homeConfigs, homeSections]);

  return (
    <>
      <HeroBanner banner={content.hero} />
      <PromoBannerGrid banners={content.promos} />
      <VideoAdStrip />
      <BrandGrid brands={content.brands} />
    </>
  );
}
