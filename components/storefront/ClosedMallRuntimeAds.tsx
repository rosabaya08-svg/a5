"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import {
  activeCmsAssetRecords,
  cmsRecordText,
  visibleCompanyAdsFromRecords,
} from "@/lib/storefront/runtimeCmsExposure";
import type { CompanyAdAsset } from "@/lib/company/companyAd";

type ClosedMallRuntimeAdsProps = {
  mode: "tablet" | "mobile";
  includeMarketing?: boolean;
  includeCompany?: boolean;
  sessionId?: string;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function fallbackHref(mode: ClosedMallRuntimeAdsProps["mode"], sessionId?: string) {
  if (mode === "mobile") {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    return `/m/shop/${query}`;
  }

  return "/tablet/products/";
}

function mediaHref(record: CmsRecord, mode: ClosedMallRuntimeAdsProps["mode"], sessionId?: string) {
  const videoActionType = cmsRecordText(record, "video_action_type", cmsRecordText(record, "action_type")).trim();

  if (videoActionType === "none") return "";

  const videoTarget = cmsRecordText(record, "video_action_target", cmsRecordText(record, "action_target")).trim();
  if (videoTarget) return videoTarget;

  return cmsRecordText(record, "href", cmsRecordText(record, "click_target", fallbackHref(mode, sessionId)));
}

function mediaTitle(record: CmsRecord, fallback: string) {
  return cmsRecordText(record, "title", fallback);
}

function mediaBody(record: CmsRecord) {
  return cmsRecordText(record, "subtitle", cmsRecordText(record, "body", cmsRecordText(record, "placement")));
}

function isVideoAsset(record: CmsRecord) {
  const assetType = cmsRecordText(record, "asset_type").toLowerCase();
  const assetUrl = cmsRecordText(record, "asset_url").toLowerCase();
  return assetType === "video" || [".mp4", ".webm", ".mov", ".m4v"].some((extension) => assetUrl.includes(extension));
}

function RuntimeLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }

  return (
    <a href={href} className={className} target={isExternalHref(href) ? "_blank" : undefined} rel={isExternalHref(href) ? "noreferrer" : undefined}>
      {children}
    </a>
  );
}

function MarketingAssetCard({
  record,
  mode,
  sessionId,
  index,
}: {
  record: CmsRecord;
  mode: ClosedMallRuntimeAdsProps["mode"];
  sessionId?: string;
  index: number;
}) {
  const assetUrl = cmsRecordText(record, "asset_url");
  const title = mediaTitle(record, `ad ${index + 1}`);
  const body = mediaBody(record);
  const href = mediaHref(record, mode, sessionId);
  const compact = mode === "mobile";

  return (
    <RuntimeLink
      href={href}
      className="group overflow-hidden rounded-md border border-white/15 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={compact ? "grid gap-0" : "grid gap-0 md:grid-cols-[minmax(0,1fr)_240px]"}>
        <div className="relative aspect-video overflow-hidden bg-slate-950">
          {isVideoAsset(record) ? (
            <video src={assetUrl} className="h-full w-full object-cover" controls playsInline muted />
          ) : (
            <img src={assetUrl} alt={title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          )}
        </div>
        <div className={compact ? "p-3" : "p-5"}>
          <p className="text-xs font-normal text-rose-600">A5 폐쇄몰</p>
          <h3 className={compact ? "mt-1 text-base font-normal" : "mt-2 text-2xl font-normal"}>{title}</h3>
          {body ? <p className={compact ? "mt-1 line-clamp-2 text-xs font-normal text-slate-600" : "mt-2 text-sm font-normal leading-6 text-slate-600"}>{body}</p> : null}
        </div>
      </div>
    </RuntimeLink>
  );
}

function CompanyAdCard({ ad, mode }: { ad: CompanyAdAsset; mode: ClosedMallRuntimeAdsProps["mode"] }) {
  const compact = mode === "mobile";

  return (
    <RuntimeLink
      href={ad.linkUrl}
      className="group overflow-hidden rounded-md border border-rose-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={compact ? "grid gap-0" : "grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]"}>
        <div className={compact ? "aspect-[16/9] overflow-hidden bg-slate-100" : "aspect-square overflow-hidden bg-slate-100"}>
          <img src={ad.assetUrl} alt={ad.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        </div>
        <div className={compact ? "p-3" : "p-5"}>
          <p className="text-xs font-normal text-rose-600">입점사 광고</p>
          <h3 className={compact ? "mt-1 text-base font-normal" : "mt-2 text-2xl font-normal"}>{ad.title}</h3>
          {ad.body ? <p className={compact ? "mt-1 line-clamp-2 text-xs font-normal text-slate-600" : "mt-2 text-sm font-normal leading-6 text-slate-600"}>{ad.body}</p> : null}
        </div>
      </div>
    </RuntimeLink>
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function PopupAd({ ad, mode }: { ad: CompanyAdAsset; mode: ClosedMallRuntimeAdsProps["mode"] }) {
  const storageKey = `a5-company-ad-popup:${mode}:${ad.id}`;
  const [hidden, setHidden] = useState(true);
  const [hideToday, setHideToday] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(storageKey);
      setHidden(stored === todayKey());
    });
  }, [storageKey]);

  function closePopup() {
    if (hideToday) {
      window.localStorage.setItem(storageKey, todayKey());
    }
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <section className="w-full max-w-md overflow-hidden rounded-md bg-white text-slate-950 shadow-2xl">
        <img src={ad.assetUrl} alt={ad.title} className="aspect-video w-full object-cover" />
        <div className="grid gap-3 p-4">
          <div>
            <p className="text-xs font-normal text-rose-600">입점사 팝업</p>
            <h2 className="mt-1 text-2xl font-normal">{ad.title}</h2>
            {ad.body ? <p className="mt-2 text-sm font-normal leading-6 text-slate-600">{ad.body}</p> : null}
          </div>
          {ad.linkUrl ? (
            <a href={ad.linkUrl} target={isExternalHref(ad.linkUrl) ? "_blank" : undefined} rel={isExternalHref(ad.linkUrl) ? "noreferrer" : undefined} className="rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-normal text-white">
              자세히 보기
            </a>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-normal text-slate-600">
            <input type="checkbox" checked={hideToday} onChange={(event) => setHideToday(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            오늘은 그만보기
          </label>
          <button type="button" onClick={closePopup} className="rounded-md bg-slate-100 px-4 py-3 text-sm font-normal text-slate-900">
            닫기
          </button>
        </div>
      </section>
    </div>
  );
}

export function ClosedMallRuntimeAds({
  mode,
  includeMarketing = true,
  includeCompany = true,
  sessionId,
}: ClosedMallRuntimeAdsProps) {
  const [marketingBanners, setMarketingBanners] = useState<CmsRecord[]>([]);
  const [marketingVideos, setMarketingVideos] = useState<CmsRecord[]>([]);
  const [companyAdRecords, setCompanyAdRecords] = useState<CmsRecord[]>([]);

  useEffect(() => {
    const unsubscribers = [
      includeMarketing ? subscribeCmsRecords("marketing_banners", setMarketingBanners, () => undefined) : undefined,
      includeMarketing ? subscribeCmsRecords("marketing_videos", setMarketingVideos, () => undefined) : undefined,
      includeCompany ? subscribeCmsRecords("company_ad_assets", setCompanyAdRecords, () => undefined) : undefined,
    ].filter(Boolean) as Array<() => void>;

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [includeCompany, includeMarketing]);

  const marketingAssets = useMemo(
    () => (includeMarketing ? activeCmsAssetRecords([...marketingVideos, ...marketingBanners]) : []),
    [includeMarketing, marketingBanners, marketingVideos],
  );
  const companyAds = useMemo(
    () => (includeCompany ? visibleCompanyAdsFromRecords(companyAdRecords) : []),
    [companyAdRecords, includeCompany],
  );
  const popupAd = companyAds.find((ad) => ad.adType === "popup");
  const imageAds = companyAds.filter((ad) => ad.adType === "image");

  if (marketingAssets.length === 0 && imageAds.length === 0 && !popupAd) {
    return null;
  }

  const wrapperClass = mode === "mobile" ? "grid gap-3" : "grid gap-4";
  const companyGridClass = mode === "mobile" ? "grid gap-3" : "grid gap-4 xl:grid-cols-2";

  return (
    <>
      <section className={wrapperClass}>
        {marketingAssets.slice(0, mode === "mobile" ? 4 : 6).map((record, index) => (
          <MarketingAssetCard key={record.id} record={record} mode={mode} sessionId={sessionId} index={index} />
        ))}
        {imageAds.length > 0 ? (
          <div className={companyGridClass}>
            {imageAds.slice(0, mode === "mobile" ? 4 : 6).map((ad) => (
              <CompanyAdCard key={ad.id} ad={ad} mode={mode} />
            ))}
          </div>
        ) : null}
      </section>
      {popupAd ? <PopupAd ad={popupAd} mode={mode} /> : null}
    </>
  );
}
