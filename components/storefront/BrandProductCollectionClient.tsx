"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HardNavigateLink } from "@/components/storefront/HardNavigateLink";
import { PriceAnalysisButton } from "@/components/storefront/PriceAnalysisButton";
import {
  companyBrandPageConfigFromRecord,
  companyBrandPageConfigMatchesBrand,
  isLiveCompanyBrandPageConfig,
} from "@/lib/company/brandPageConfig";
import {
  companyBrandEventNoticeFromRecord,
  companyBrandEventNoticeMatchesBrand,
  isLiveCompanyBrandEventNotice,
  sortCompanyBrandEventNoticesByDate,
  type CompanyBrandEventNotice,
} from "@/lib/company/brandEventNotice";
import {
  companyBrandMessageFromRecord,
  companyBrandMessageMatchesBrand,
  sortCompanyBrandMessagesByDate,
} from "@/lib/company/brandMessage";
import { createCmsId, saveCmsRecord, subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import type { StorefrontContent } from "@/lib/repositories/types";
import { brandNameKey } from "@/lib/storefront/brandRouting";
import { productBusinessProductPath } from "@/lib/storefront/productUrls";
import { safeStorefrontMediaUrl } from "@/lib/storefront/safeMediaUrl";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Product } from "@/types/commerce";

type SortMode = "default" | "price_asc" | "discount_desc" | "price_desc";
type BrandView = "products" | "news";

type BrandProductCollectionClientProps = {
  brandName: string;
  brandCategory: string;
  brandLogoUrl?: string;
  products: Product[];
  content: StorefrontContent;
  brandHref?: string;
  newsHref?: string;
  initialView?: BrandView;
};

const sortOptions: Array<{ id: SortMode; label: string }> = [
  { id: "default", label: "전체" },
  { id: "price_asc", label: "낮은가격순" },
  { id: "discount_desc", label: "할인률순" },
  { id: "price_desc", label: "높은가격순" },
];

function discountRate(product: Product) {
  if (product.priceComparisonVerified !== true) return 0;
  const { listPrice, closedMallPrice } = product.comparison;
  if (!(listPrice > closedMallPrice && closedMallPrice > 0)) return 0;
  return Math.max(0, Math.round(((listPrice - closedMallPrice) / listPrice) * 100));
}

function profileFor(product: Product, content: StorefrontContent) {
  const productGallery = (product.gallery ?? []).map((item) => safeStorefrontMediaUrl(item)).filter(Boolean);
  const productImage = safeStorefrontMediaUrl(product.imageUrl) || productGallery[0] || "";

  return (
    content.productProfiles.find((profile) => profile.productId === product.id) ?? {
      productId: product.id,
      brand: product.brand ?? "A5 Partner",
      displayName: product.name,
      subtitle: product.subtitle ?? "",
      category: product.category,
      imageUrl: productImage,
      gallery: productGallery.length ? productGallery : productImage ? [productImage] : [],
      badges: product.badges ?? [],
      tags: product.tags ?? [product.category],
      review: product.reviewSummary ?? { rating: 0, count: 0, highlight: "" },
      detailTabs: product.detailSections ?? [],
    }
  );
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const imageUrl = safeStorefrontMediaUrl(src);

  if (!imageUrl || imageUrl === "/file.svg") {
    return <div className="h-full w-full bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_48%,#e0f2fe_100%)]" aria-label={alt} />;
  }

  return <img src={imageUrl} alt={alt} className="h-full w-full object-cover transition hover:scale-[1.03]" />;
}

function productCategory(product: Product, content: StorefrontContent) {
  return profileFor(product, content).category || product.category || "기타";
}

function sortProducts(products: Product[], sortMode: SortMode) {
  const next = [...products];

  if (sortMode === "price_asc") {
    return next.sort((left, right) => left.comparison.closedMallPrice - right.comparison.closedMallPrice);
  }

  if (sortMode === "discount_desc") {
    return next.sort((left, right) => discountRate(right) - discountRate(left));
  }

  if (sortMode === "price_desc") {
    return next.sort((left, right) => right.comparison.closedMallPrice - left.comparison.closedMallPrice);
  }

  return next;
}

function localDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function popupStorageKey(notice: CompanyBrandEventNotice) {
  return `a5-brand-event-popup:${notice.id}:${localDateKey()}`;
}

function ProductCard({ product, content }: { product: Product; content: StorefrontContent }) {
  const profile = profileFor(product, content);
  const productHref = productBusinessProductPath(product);
  const comparisonVerified = product.priceComparisonVerified === true;
  const rate = discountRate(product);

  return (
    <article className="overflow-hidden rounded-md bg-white/45 text-slate-950 shadow-sm ring-1 ring-white/25 backdrop-blur-xl transition hover:bg-white/65">
      <HardNavigateLink
        href={productHref}
        className="relative block aspect-[4/5] overflow-hidden bg-slate-100"
        ariaLabel={`${profile.displayName} 상세`}
      >
        <ProductImage src={profile.imageUrl} alt={profile.displayName} />
        {rate > 0 ? <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-1 text-xs font-normal text-white">{rate}%</span> : null}
      </HardNavigateLink>
      <div className="grid gap-3 p-4">
        <Link href={productHref}>
          <p className="text-xs font-normal text-rose-600">{profile.brand}</p>
          <h3 className="mt-1 text-base font-normal leading-6">{profile.displayName}</h3>
        </Link>
        <div className="grid gap-1 rounded-md bg-white/40 p-3">
          {comparisonVerified ? (
            <p className="text-xs font-normal text-slate-500 line-through">{formatCurrency(product.comparison.listPrice)}</p>
          ) : null}
          <p className="text-2xl font-normal text-rose-600">{formatCurrency(product.comparison.closedMallPrice)}</p>
          <p className="text-xs font-normal text-slate-500">{productCategory(product, content)}</p>
          <PriceAnalysisButton
            productName={profile.displayName}
            closedMallPrice={product.comparison.closedMallPrice}
            platformLowestPrice={product.comparison.platformLowestPrice}
            verified={comparisonVerified}
            className="mt-2 w-full bg-white/70"
          />
        </div>
        <form action={productHref}>
          <button type="submit" className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
            상품 보기
          </button>
        </form>
      </div>
    </article>
  );
}

export function BrandProductCollectionClient({
  brandName,
  brandCategory,
  brandLogoUrl,
  products,
  content,
  brandHref = "/tablet/products/",
  newsHref,
  initialView = "products",
}: BrandProductCollectionClientProps) {
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [eventRecords, setEventRecords] = useState<CmsRecord[]>([]);
  const [messageRecords, setMessageRecords] = useState<CmsRecord[]>([]);
  const [view, setView] = useState<BrandView>(initialView);
  const [category, setCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [popupOpen, setPopupOpen] = useState(false);
  const [todayDismissChecked, setTodayDismissChecked] = useState(false);
  const [nickname, setNickname] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerConsent, setCustomerConsent] = useState(false);
  const [messageStatus, setMessageStatus] = useState("");

  useEffect(() => {
    const unsubscribePages = subscribeCmsRecords("company_brand_pages", setRecords, () => undefined);
    const unsubscribeEvents = subscribeCmsRecords("company_brand_events", setEventRecords, () => undefined);
    const unsubscribeMessages = subscribeCmsRecords("company_brand_messages", setMessageRecords, () => undefined);

    return () => {
      unsubscribePages();
      unsubscribeEvents();
      unsubscribeMessages();
    };
  }, []);

  const brandConfig = useMemo(
    () =>
      records
        .map(companyBrandPageConfigFromRecord)
        .find((config) => companyBrandPageConfigMatchesBrand(config, brandName) && isLiveCompanyBrandPageConfig(config)),
    [brandName, records],
  );
  const categories = useMemo(
    () => [...new Set(products.map((product) => productCategory(product, content)).filter(Boolean))].sort((left, right) => left.localeCompare(right, "ko")),
    [content, products],
  );
  const visibleProducts = useMemo(() => {
    const filtered = category === "all"
      ? products
      : products.filter((product) => brandNameKey(productCategory(product, content)) === brandNameKey(category));

    return sortProducts(filtered, sortMode);
  }, [category, content, products, sortMode]);
  const brandEventNotices = useMemo(
    () =>
      sortCompanyBrandEventNoticesByDate(
        eventRecords
          .map(companyBrandEventNoticeFromRecord)
          .filter((notice) => companyBrandEventNoticeMatchesBrand(notice, brandName) && isLiveCompanyBrandEventNotice(notice)),
      ),
    [brandName, eventRecords],
  );
  const brandMessages = useMemo(
    () =>
      sortCompanyBrandMessagesByDate(
        messageRecords
          .map(companyBrandMessageFromRecord)
          .filter((message) => companyBrandMessageMatchesBrand(message, brandName) && message.status === "answered"),
      ),
    [brandName, messageRecords],
  );
  const popupNotice = brandEventNotices.find((notice) => notice.popupEnabled);
  const brandCompanyId = brandConfig?.companyId || products[0]?.companyId || "";
  const bannerImage =
    safeStorefrontMediaUrl(brandConfig?.bannerImageUrl) ||
    safeStorefrontMediaUrl(brandLogoUrl) ||
    safeStorefrontMediaUrl(products[0]?.imageUrl);
  const bannerTitle = brandConfig?.title || brandName;
  const bannerSubtitle = brandConfig?.subtitle || brandCategory;
  const noticeCards = brandConfig?.noticeCards ?? [];
  const brandSections = brandConfig?.sections ?? [];
  const hasEventNotice = Boolean(brandConfig?.eventTitle || brandConfig?.eventBody || noticeCards.length);
  const brandNewsHref = newsHref ?? `${brandHref.replace(/\/?$/, "/")}news/`;

  useEffect(() => {
    queueMicrotask(() => {
      if (!popupNotice) {
        setPopupOpen(false);
        return;
      }

      try {
        setPopupOpen(window.localStorage.getItem(popupStorageKey(popupNotice)) !== "hidden");
      } catch {
        setPopupOpen(true);
      }
      setTodayDismissChecked(false);
    });
  }, [popupNotice]);

  function closePopup() {
    if (popupNotice && todayDismissChecked) {
      try {
        window.localStorage.setItem(popupStorageKey(popupNotice), "hidden");
      } catch {
        // localStorage can be unavailable in restricted browsers.
      }
    }
    setPopupOpen(false);
  }

  async function submitCustomerMessage() {
    const safeNickname = nickname.trim() || "고객";
    const safeMessage = customerMessage.trim();

    if (!safeMessage) {
      setMessageStatus("메시지를 입력해야 합니다.");
      return;
    }

    if (!customerConsent) {
      setMessageStatus("공개 소통함 등록 안내에 동의해야 합니다.");
      return;
    }

    setMessageStatus("브랜드에 메시지를 전달하는 중입니다.");

    try {
      await saveCmsRecord("company_brand_messages", {
        id: createCmsId("brand-message"),
        company_id: brandCompanyId,
        brand_name: brandName,
        brand_key: brandNameKey(brandName),
        nickname: safeNickname.slice(0, 30),
        message: safeMessage.slice(0, 700),
        reply: "",
        status: "new",
        created_at: new Date().toISOString(),
        source_app: "tablet",
        source_channel: "brand_customer_message",
      });
      setNickname("");
      setCustomerMessage("");
      setCustomerConsent(false);
      setMessageStatus("메시지를 전달했습니다. 기업 답변 후 브랜드관에 공개됩니다.");
    } catch (error) {
      setMessageStatus(error instanceof Error ? `메시지 전달에 실패했습니다. ${error.message}` : "메시지 전달에 실패했습니다.");
    }
  }

  return (
    <section className="grid gap-5">
      {popupOpen && popupNotice ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="brand-event-popup-title" className="w-full max-w-lg rounded-md bg-white p-5 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-normal tracking-[0.16em] text-rose-700">이벤트 안내</p>
                <h2 id="brand-event-popup-title" className="mt-2 text-2xl font-normal">
                  {popupNotice.title}
                </h2>
              </div>
              <button type="button" onClick={closePopup} className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-lg font-normal text-slate-700" aria-label="이벤트 안내 닫기">
                x
              </button>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm font-normal leading-6 text-slate-700">{popupNotice.body}</p>
            {popupNotice.ctaLabel && popupNotice.ctaHref ? (
              <HardNavigateLink href={popupNotice.ctaHref} className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white" ariaLabel={popupNotice.ctaLabel}>
                {popupNotice.ctaLabel}
              </HardNavigateLink>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <label className="flex items-center gap-2 text-sm font-normal text-slate-700">
                <input type="checkbox" checked={todayDismissChecked} onChange={(event) => setTodayDismissChecked(event.target.checked)} className="h-5 w-5 accent-slate-950" />
                오늘은 그만보기
              </label>
              <button type="button" onClick={closePopup} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
                닫기
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-white/25 bg-slate-950 text-white shadow-sm">
        <div className="relative min-h-[260px] md:min-h-[340px]">
          {bannerImage ? <img src={bannerImage} alt={bannerTitle} className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null}
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="relative flex min-h-[260px] flex-col justify-end p-5 md:min-h-[340px] md:p-8">
            <p className="text-sm font-normal text-rose-200">{brandCategory}</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-normal md:text-5xl">{bannerTitle}</h1>
            {bannerSubtitle ? <p className="mt-3 max-w-2xl text-base font-normal leading-7 text-white/85">{bannerSubtitle}</p> : null}
          </div>
        </div>
      </div>

      {hasEventNotice ? (
        <div className="rounded-md border border-white/25 bg-white/40 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-normal tracking-[0.16em] text-rose-700">브랜드 이벤트</p>
              {brandConfig?.eventTitle ? <h2 className="mt-2 text-3xl font-normal">{brandConfig.eventTitle}</h2> : null}
              {brandConfig?.eventBody ? <p className="mt-3 max-w-3xl whitespace-pre-line text-sm font-normal leading-6 text-slate-700">{brandConfig.eventBody}</p> : null}
            </div>
            {brandConfig?.eventCtaLabel && brandConfig.eventCtaHref ? (
              <HardNavigateLink
                href={brandConfig.eventCtaHref}
                className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white"
                ariaLabel={brandConfig.eventCtaLabel}
              >
                {brandConfig.eventCtaLabel}
              </HardNavigateLink>
            ) : null}
          </div>
          {noticeCards.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {noticeCards.map((card, index) => (
                <article key={`${card.title}-${index}`} className="rounded-md bg-white/65 p-4 ring-1 ring-white/60">
                  {card.title ? <h3 className="text-base font-normal">{card.title}</h3> : null}
                  {card.body ? <p className="mt-2 whitespace-pre-line text-sm font-normal leading-6 text-slate-600">{card.body}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {brandSections.length ? (
        <div className="grid gap-4">
          {brandSections
            .filter((section) => section.type !== "hero")
            .map((section) => {
              const sectionProducts = section.productIds?.length
                ? products.filter((product) => section.productIds?.includes(product.id))
                : products.slice(0, 4);

              if (section.type === "product_grid") {
                return (
                  <section key={section.id} className="rounded-md border border-white/25 bg-white/40 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-normal tracking-[0.16em] text-rose-700">선택 상품</p>
                        <h2 className="mt-2 text-2xl font-normal">{section.title || "대표 상품"}</h2>
                        {section.body ? <p className="mt-2 text-sm font-normal leading-6 text-slate-600">{section.body}</p> : null}
                      </div>
                    </div>
                    {sectionProducts.length ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sectionProducts.slice(0, 8).map((product) => (
                          <ProductCard key={product.id} product={product} content={content} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-md bg-white/65 p-4 text-sm font-normal text-slate-500 ring-1 ring-white/60">선택된 대표 상품이 없습니다.</p>
                    )}
                  </section>
                );
              }

              if (section.type === "cta") {
                return (
                  <section key={section.id} className="rounded-md border border-white/25 bg-slate-950 p-5 text-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-normal tracking-[0.16em] text-rose-200">브랜드 작업</p>
                        <h2 className="mt-2 text-2xl font-normal">{section.title}</h2>
                        {section.body ? <p className="mt-2 text-sm font-normal leading-6 text-white/75">{section.body}</p> : null}
                      </div>
                      {section.ctaLabel && section.ctaHref ? (
                        <HardNavigateLink href={section.ctaHref} className="rounded-md bg-white px-4 py-3 text-sm font-normal text-slate-950" ariaLabel={section.ctaLabel}>
                          {section.ctaLabel}
                        </HardNavigateLink>
                      ) : null}
                    </div>
                  </section>
                );
              }

              return (
                <section key={section.id} className="rounded-md border border-white/25 bg-white/40 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
                  <p className="text-xs font-normal uppercase tracking-[0.16em] text-rose-700">
                    {section.type === "event" ? "브랜드 이벤트" : section.type === "notice" ? "브랜드 공지" : "브랜드 이야기"}
                  </p>
                  <h2 className="mt-2 text-2xl font-normal">{section.title}</h2>
                  {section.body ? <p className="mt-3 whitespace-pre-line text-sm font-normal leading-6 text-slate-700">{section.body}</p> : null}
                  {section.ctaLabel && section.ctaHref ? (
                    <HardNavigateLink href={section.ctaHref} className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white" ariaLabel={section.ctaLabel}>
                      {section.ctaLabel}
                    </HardNavigateLink>
                  ) : null}
                </section>
              );
            })}
        </div>
      ) : null}

      <nav className="flex flex-wrap items-center gap-2 rounded-md border border-white/25 bg-white/35 px-4 py-3 text-sm font-normal text-slate-700 shadow-sm backdrop-blur-xl" aria-label="브랜드관 위치">
        <HardNavigateLink href="/tablet/products/" className="underline-offset-4 hover:underline" ariaLabel="폐쇄몰 홈으로 이동">
          폐쇄몰 홈
        </HardNavigateLink>
        <span className="text-slate-400">/</span>
        <HardNavigateLink href={brandHref} className="underline-offset-4 hover:underline" ariaLabel={`${brandName} 브랜드관 상품으로 이동`}>
          브랜드관
        </HardNavigateLink>
        <span className="text-slate-400">/</span>
        <span>{brandName}</span>
        <span className="text-slate-400">/</span>
        <span className="text-rose-600">{view === "news" ? "소식통" : "상품"}</span>
      </nav>

      {view === "news" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/25 bg-white/40 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
          <div>
            <p className="text-xs font-normal tracking-[0.16em] text-rose-700">브랜드 소식</p>
            <h2 className="mt-1 text-2xl font-normal">소식통</h2>
          </div>
          <HardNavigateLink href={brandHref} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white" ariaLabel={`${brandName} 상품으로 이동`}>
            상품 보기
          </HardNavigateLink>
        </div>
      ) : null}

      {view === "news" && brandEventNotices.length ? (
        <div className="rounded-md border border-white/25 bg-white/40 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-normal tracking-[0.16em] text-rose-700">이벤트 게시판</p>
              <h2 className="mt-2 text-2xl font-normal">이벤트 안내 게시판</h2>
            </div>
            <p className="text-sm font-normal text-slate-500">등록일 최신순</p>
          </div>
          <div className="mt-4 grid gap-3">
            {brandEventNotices.map((notice) => (
              <article key={notice.id} className="rounded-md bg-white/65 p-4 ring-1 ring-white/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-normal">{notice.title}</h3>
                  <span className="text-xs font-normal text-slate-500">{formatDateTime(notice.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm font-normal leading-6 text-slate-600">{notice.body}</p>
                {notice.ctaLabel && notice.ctaHref ? (
                  <HardNavigateLink href={notice.ctaHref} className="mt-3 inline-flex rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white" ariaLabel={notice.ctaLabel}>
                    {notice.ctaLabel}
                  </HardNavigateLink>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {view === "news" ? (
      <div className="rounded-md border border-white/25 bg-white/40 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section>
            <p className="text-xs font-normal tracking-[0.16em] text-rose-700">고객 소통</p>
            <h2 className="mt-2 text-2xl font-normal">브랜드 소통함</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                className="rounded-md border border-white/60 bg-white/70 px-3 py-3 text-sm font-normal text-slate-950 outline-none"
                placeholder="닉네임"
              />
              <textarea
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                className="min-h-28 rounded-md border border-white/60 bg-white/70 px-3 py-3 text-sm font-normal text-slate-950 outline-none"
                placeholder="브랜드에 전하고 싶은 문의, 응원, 행사 요청을 남겨주세요. 전화번호, 주소, 병실 등 개인정보는 입력하지 마세요."
              />
              <label className="flex items-start gap-2 text-xs font-normal leading-5 text-slate-600">
                <input type="checkbox" checked={customerConsent} onChange={(event) => setCustomerConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-slate-950" />
                개인정보를 입력하지 않았으며, 기업 답변 후 내 메시지가 브랜드관 소통함에 공개될 수 있음을 확인했습니다.
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void submitCustomerMessage()} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
                  브랜드에 전달
                </button>
                {messageStatus ? <p className="text-xs font-normal text-slate-600">{messageStatus}</p> : null}
              </div>
            </div>
          </section>

          <section className="grid content-start gap-3">
            <p className="text-sm font-normal text-slate-600">기업 답변</p>
            {brandMessages.length ? (
              brandMessages.slice(0, 6).map((item) => (
                <article key={item.id} className="rounded-md bg-white/65 p-4 ring-1 ring-white/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-normal text-slate-950">{item.nickname}</p>
                    <span className="text-xs font-normal text-slate-500">{item.createdAt ? formatDateTime(item.createdAt) : ""}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm font-normal leading-6 text-slate-600">{item.message}</p>
                  <div className="mt-3 rounded-md bg-slate-950 p-3 text-white">
                    <p className="text-xs font-normal text-rose-200">{brandName} 답변</p>
                    <p className="mt-2 whitespace-pre-line text-sm font-normal leading-6">{item.reply}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-md bg-white/65 p-4 text-sm font-normal text-slate-500 ring-1 ring-white/60">
                아직 공개된 고객 소통 답변이 없습니다.
              </div>
            )}
          </section>
        </div>
      </div>
      ) : null}

      {view === "products" ? (
      <>
      <div className="rounded-md border border-white/25 bg-white/35 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => {
              setView("products");
              setCategory("all");
            }}
            className={`text-sm font-normal underline-offset-4 ${category === "all" ? "text-rose-600 underline" : "text-slate-700"}`}
          >
            전체
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setView("products");
                setCategory(item);
              }}
              className={`text-sm font-normal underline-offset-4 ${category === item ? "text-rose-600 underline" : "text-slate-700"}`}
            >
              {item}
            </button>
          ))}
          </div>
          <HardNavigateLink href={brandNewsHref} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white" ariaLabel={`${brandName} 소식통으로 이동`}>
            소식통
          </HardNavigateLink>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/50 pt-4">
          <p className="text-sm font-normal text-slate-600">{visibleProducts.length}개 상품</p>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSortMode(option.id)}
                className={`rounded-md px-3 py-2 text-xs font-normal ring-1 ${
                  sortMode === option.id ? "bg-slate-950 text-white ring-slate-950" : "bg-white/60 text-slate-700 ring-white/60"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleProducts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} content={content} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-white/25 bg-white/35 p-8 text-center text-slate-950 shadow-sm backdrop-blur-xl">
          <p className="text-lg font-normal">현재 표시할 상품이 없습니다.</p>
        </div>
      )}
      </>
      ) : null}
    </section>
  );
}
