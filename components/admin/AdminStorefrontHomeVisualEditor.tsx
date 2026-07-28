"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { getFirebaseRuntimeStatus } from "@/lib/firebase/client";
import {
  saveCmsRecord,
  subscribeCmsRecords,
  uploadCmsFile,
  type CmsRecord,
} from "@/lib/firebase/contentRepository";
import type { MallBanner, MallBrand } from "@/types/storefrontContent";
import {
  optimizeUploadAsset,
  type OptimizedUploadAsset,
} from "@/lib/media/optimizeUploadAsset";
import { grantMobilePreviewAccess } from "@/lib/storefront/mobilePreviewAccess";
import { buildProductUrlFields } from "@/lib/storefront/productUrls";
import { firstSafeStorefrontMediaUrl, safeStorefrontMediaUrl } from "@/lib/storefront/safeMediaUrl";

type EditableSlotKind = "hero" | "carousel" | "promo";

type EditableSlot = {
  id: string;
  recordId: string;
  kind: EditableSlotKind;
  label: string;
  placement: string;
  displayOrder: number;
  fallback: MallBanner;
};

type SlotDraft = {
  title: string;
  eyebrow: string;
  subtitle: string;
  href: string;
  status: string;
  overlayEnabled: boolean;
  textOverlayEnabled: boolean;
  badgeEnabled: boolean;
  autoDiscountCopyEnabled: boolean;
};

const CONFIG_ID = "storefront-home";
const MOBILE_CONFIG_ID = "storefront-mobile-preview";
const DEFAULT_MOBILE_PREVIEW_PATH = "/m/shop/?sessionId=dev-mobile-preview&adminPreview=1";
const INLINE_HOME_BANNER_MAX_BYTES = 650 * 1024;
const EMPTY_ADMIN_HOME_BANNER: MallBanner = {
  id: "admin-home-empty-banner",
  title: "",
  subtitle: "",
  eyebrow: "",
  href: "/tablet/products/",
  imageUrl: "",
  tone: "dark",
};
const ADMIN_HOME_BRANDS: MallBrand[] = [];
const ADMIN_HOME_CAROUSEL_SLOTS = 5;
const ADMIN_HOME_PROMO_SLOTS = 4;

function emptyAdminPromoBanner(index: number): MallBanner {
  return {
    ...EMPTY_ADMIN_HOME_BANNER,
    id: `admin-home-empty-promo-${index + 1}`,
  };
}

function clampBrandCount(value: number) {
  const maxBrands = ADMIN_HOME_BRANDS.length;
  return Math.max(0, Math.min(maxBrands, value));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  });
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeMobilePreviewPath(value: string) {
  const rawPath = value.trim() || DEFAULT_MOBILE_PREVIEW_PATH;

  try {
    const url = new URL(rawPath, "https://a5.local");
    if (url.pathname.replace(/\/$/, "") === "/m/shop" && url.searchParams.get("sessionId") === "dev-mobile-preview") {
      url.searchParams.set("adminPreview", "1");
      return `${url.pathname}?${url.searchParams.toString()}`;
    }
  } catch {
    return rawPath;
  }

  return rawPath;
}

const editableSlots: EditableSlot[] = [
  {
    id: "hero-hansan-sanho",
    recordId: "home-hero-hansan-sanho",
    kind: "hero",
    label: "기존 메인 배너",
    placement: "tablet_home_hero",
    displayOrder: 1,
    fallback: EMPTY_ADMIN_HOME_BANNER,
  },
  ...Array.from({ length: ADMIN_HOME_CAROUSEL_SLOTS }, (_, index) => {
    const banner = {
      ...EMPTY_ADMIN_HOME_BANNER,
      id: `admin-home-main-carousel-${index + 1}`,
    };

    return {
      id: `main-carousel-${index + 1}`,
      recordId: `home-main-carousel-${index + 1}`,
      kind: "carousel" as const,
      label: `메인 배너 ${index + 1}`,
      placement: "tablet_home_carousel",
      displayOrder: index + 2,
      fallback: banner,
    };
  }),
  ...Array.from({ length: ADMIN_HOME_PROMO_SLOTS }, (_, index) => {
    const banner = emptyAdminPromoBanner(index);
    return {
      id: banner.id,
      recordId: `home-${banner.id}`,
      kind: "promo" as const,
      label: `할인 배너 ${index + 1}`,
      placement: "tablet_home_promo",
      displayOrder: index + 20,
      fallback: banner,
    };
  }),
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

function productRecordId(record: CmsRecord) {
  return recordText(record, "product_id", record.id);
}

function productRecordTitle(record: CmsRecord) {
  return recordText(record, "title", recordText(record, "name", productRecordId(record)));
}

function productRecordTabletPath(record: CmsRecord) {
  const productId = productRecordId(record);
  return (
    recordText(record, "tablet_path") ||
    recordText(record, "public_path") ||
    recordText(record, "ad_target_path") ||
    buildProductUrlFields(productId).tablet_path
  );
}

function isApprovedProductRecord(record: CmsRecord) {
  const status = recordText(record, "status", "active");
  const approval = recordText(record, "product_approval_status", recordText(record, "approval_status", "approved"));
  return ["active", "approved"].includes(status) && approval === "approved";
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toLocaleString("ko-KR", {
    maximumFractionDigits: index === 0 ? 0 : 1,
  })}${units[index]}`;
}

function defaultDisplayOptions(slot: EditableSlot, banner: MallBanner) {
  const hasImage = Boolean(safeStorefrontMediaUrl(banner.imageUrl));
  const imageOnly = hasImage && (slot.kind === "carousel" || slot.kind === "promo");

  return {
    overlayEnabled: slot.kind === "hero" ? !hasImage : !imageOnly,
    textOverlayEnabled: slot.kind === "hero" ? !hasImage : !imageOnly,
    badgeEnabled: slot.kind === "promo" && !imageOnly,
    autoDiscountCopyEnabled: slot.kind === "promo" && !imageOnly,
  };
}

function bannerFromRecord(slot: EditableSlot, record?: CmsRecord): MallBanner {
  const banner = {
    ...slot.fallback,
    title: recordText(record, "title", slot.fallback.title),
    eyebrow: recordText(record, "eyebrow", slot.fallback.eyebrow),
    subtitle: recordText(record, "subtitle", slot.fallback.subtitle),
    href: recordText(record, "href", recordText(record, "click_target", slot.fallback.href)),
    imageUrl: firstSafeStorefrontMediaUrl(record?.asset_url, slot.fallback.imageUrl),
  };
  const defaults = defaultDisplayOptions(slot, banner);

  return {
    ...banner,
    overlayEnabled: recordBoolean(record, "overlay_enabled", defaults.overlayEnabled),
    textOverlayEnabled: recordBoolean(record, "text_overlay_enabled", defaults.textOverlayEnabled),
    badgeEnabled: recordBoolean(record, "badge_enabled", defaults.badgeEnabled),
    autoDiscountCopyEnabled: recordBoolean(record, "auto_discount_copy_enabled", defaults.autoDiscountCopyEnabled),
  };
}

function draftFromBanner(slot: EditableSlot, banner: MallBanner, status = "live"): SlotDraft {
  const defaults = defaultDisplayOptions(slot, banner);

  return {
    title: banner.title,
    eyebrow: banner.eyebrow,
    subtitle: banner.subtitle,
    href: banner.href,
    status,
    overlayEnabled: banner.overlayEnabled ?? defaults.overlayEnabled,
    textOverlayEnabled: banner.textOverlayEnabled ?? defaults.textOverlayEnabled,
    badgeEnabled: banner.badgeEnabled ?? defaults.badgeEnabled,
    autoDiscountCopyEnabled: banner.autoDiscountCopyEnabled ?? defaults.autoDiscountCopyEnabled,
  };
}

function activeRecordForSlot(records: CmsRecord[], slot: EditableSlot) {
  return records.find((record) => record.id === slot.recordId || recordText(record, "slot_id") === slot.id);
}

function isLiveRecord(record: CmsRecord | undefined) {
  const status = recordText(record, "status", recordText(record, "approval_status", ""));
  return ["active", "approved", "live", "published", "scheduled"].includes(status);
}

function displayOrder(record: CmsRecord) {
  return recordNumber(record, "display_order", recordNumber(record, "order", 999));
}

function activeAssetRecords(records: CmsRecord[]) {
  return records
    .filter((record) => isLiveRecord(record) && Boolean(safeStorefrontMediaUrl(recordText(record, "asset_url"))))
    .sort((left, right) => displayOrder(left) - displayOrder(right));
}

function isVideoAsset(record: CmsRecord) {
  const assetType = recordText(record, "asset_type").toLowerCase();
  const assetUrl = recordText(record, "asset_url").toLowerCase();
  return assetType === "video" || [".mp4", ".webm", ".mov", ".m4v"].some((extension) => assetUrl.includes(extension));
}

function AdminSlotImage({ banner, selected }: { banner: MallBanner; selected: boolean }) {
  const imageUrl = safeStorefrontMediaUrl(banner.imageUrl);
  const fallbackMode = !imageUrl;
  const showOverlay = fallbackMode ? (banner.overlayEnabled ?? true) : false;
  const showText = fallbackMode ? (banner.textOverlayEnabled ?? true) : false;

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-md bg-[linear-gradient(135deg,#020617_0%,#4c0519_52%,#111827_100%)] ${
        selected ? "ring-4 ring-blue-500 ring-offset-2" : "ring-1 ring-slate-200"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={banner.title}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />
      ) : null}
      {showOverlay ? <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" /> : null}
      {showText ? (
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-normal text-rose-200">{banner.eyebrow}</p>
          <p className="mt-1 text-xl font-normal leading-tight">{banner.title}</p>
        </div>
      ) : null}
    </div>
  );
}

function AdminPromoRail({
  promos,
  selectedSlotId,
  onSelect,
}: {
  promos: { slot: EditableSlot; banner: MallBanner }[];
  selectedSlotId: string;
  onSelect: (slotId: string) => void;
}) {
  return (
    <aside className="grid h-full grid-cols-1 grid-rows-4 gap-3">
      {promos.slice(0, 4).map(({ slot, banner }) => {
        const selected = selectedSlotId === slot.id;
        const imageUrl = safeStorefrontMediaUrl(banner.imageUrl);
        const fallbackMode = !imageUrl;
        const showOverlay = fallbackMode ? (banner.overlayEnabled ?? true) : false;
        const showText = fallbackMode ? (banner.textOverlayEnabled ?? true) : false;
        const showBadge = fallbackMode ? (banner.badgeEnabled ?? true) : false;

        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelect(slot.id)}
            className={`group overflow-hidden rounded-md border border-white/15 bg-white/20 text-left shadow-sm backdrop-blur-md ${
              selected ? "ring-4 ring-blue-500 ring-offset-2" : "ring-1 ring-slate-200"
            }`}
            aria-label={`${slot.label} ?좏깮`}
          >
            <div className="relative h-full min-h-[108px] overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#831843_52%,#111827_100%)]">
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
              {showOverlay ? <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/30 to-transparent" /> : null}
              {showBadge || showText ? (
                <div className="relative z-10 flex h-full min-h-[108px] items-end gap-2 p-3 text-white">
                  {showBadge ? (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-rose-600 text-sm font-normal text-white">
                      {promos.findIndex((item) => item.slot.id === slot.id) + 1}
                    </span>
                  ) : null}
                  {showText ? (
                    <span className="min-w-0">
                      <span className="block text-[11px] font-normal text-rose-200">{banner.eyebrow}</span>
                      <span className="mt-1 block text-base font-normal leading-tight">{banner.title}</span>
                      <span className="mt-1 block truncate text-xs font-normal text-white/85">{banner.subtitle}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </aside>
  );
}

function AdminVideoPreview({ videos }: { videos: CmsRecord[] }) {
  const record = videos[0];

  if (record) {
    const assetUrl = safeStorefrontMediaUrl(recordText(record, "asset_url"));
    const title = recordText(record, "title", "등록 영상");
    const body = recordText(record, "body", recordText(record, "placement", "태블릿 폐쇄몰 영상"));

    return (
      <article className="relative min-h-[420px] overflow-hidden rounded-md border border-slate-200 bg-slate-950 text-white shadow-sm">
        {assetUrl && isVideoAsset(record) ? (
          <video src={assetUrl} className="absolute inset-0 h-full w-full object-cover" controls playsInline muted />
        ) : assetUrl ? (
          <img src={assetUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-normal text-rose-200">최고관리자 등록 콘텐츠</p>
          <h3 className="mt-2 text-2xl font-normal leading-tight">{title}</h3>
          {body ? <p className="mt-2 max-w-2xl text-xs font-normal leading-5 text-white/85">{body}</p> : null}
        </div>
      </article>
    );
  }

  return (
    <article className="relative min-h-[420px] overflow-hidden rounded-md border border-slate-200 bg-slate-950 text-white shadow-sm">
      <div className="absolute inset-0 grid place-items-center bg-slate-950 text-center">
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-rose-300">영상 광고</p>
          <h2 className="mt-2 text-2xl font-normal">등록된 영상 없음</h2>
        </div>
      </div>
    </article>
  );
}

function AdminPromoVideoStage({
  videos,
  promos,
  selectedSlotId,
  onSelect,
}: {
  videos: CmsRecord[];
  promos: { slot: EditableSlot; banner: MallBanner }[];
  selectedSlotId: string;
  onSelect: (slotId: string) => void;
}) {
  return (
    <section className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <AdminVideoPreview videos={videos} />
      <AdminPromoRail promos={promos} selectedSlotId={selectedSlotId} onSelect={onSelect} />
    </section>
  );
}

export function AdminStorefrontHomeVisualEditor() {
  const runtime = useMemo(() => getFirebaseRuntimeStatus(), []);
  const [homeSections, setHomeSections] = useState<CmsRecord[]>([]);
  const [mobileConfigs, setMobileConfigs] = useState<CmsRecord[]>([]);
  const [marketingVideos, setMarketingVideos] = useState<CmsRecord[]>([]);
  const [productRecords, setProductRecords] = useState<CmsRecord[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState(editableSlots[0].id);
  const [draftBySlot, setDraftBySlot] = useState<Record<string, SlotDraft>>({});
  const [file, setFile] = useState<File | null>(null);
  const [mainBannerFiles, setMainBannerFiles] = useState<File[]>([]);
  const [optimizedAsset, setOptimizedAsset] = useState<OptimizedUploadAsset | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [brandCount, setBrandCount] = useState(clampBrandCount(Math.min(8, ADMIN_HOME_BRANDS.length)));
  const [mobilePreviewPath, setMobilePreviewPath] = useState(DEFAULT_MOBILE_PREVIEW_PATH);
  const [mobilePreviewStatus, setMobilePreviewStatus] = useState("live");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [savingMainBanners, setSavingMainBanners] = useState(false);
  const [savingMobilePreview, setSavingMobilePreview] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const selectedSlot = useMemo(
    () => editableSlots.find((slot) => slot.id === selectedSlotId) ?? editableSlots[0],
    [selectedSlotId],
  );
  const selectedRecord = useMemo(() => activeRecordForSlot(homeSections, selectedSlot), [homeSections, selectedSlot]);
  const selectedBanner = useMemo(() => bannerFromRecord(selectedSlot, selectedRecord), [selectedRecord, selectedSlot]);
  const approvedProducts = useMemo(
    () => productRecords.filter(isApprovedProductRecord).sort((left, right) => productRecordTitle(left).localeCompare(productRecordTitle(right), "ko-KR")),
    [productRecords],
  );
  const selectedDefaultDraft = useMemo(
    () => draftFromBanner(selectedSlot, selectedBanner, recordText(selectedRecord, "status", "live")),
    [selectedBanner, selectedRecord, selectedSlot],
  );
  const draft = draftBySlot[selectedSlot.id] ?? selectedDefaultDraft;
  const uploadedFile = optimizedAsset?.file ?? file;

  const renderedBanners = editableSlots.map((slot) => {
    const savedBanner = bannerFromRecord(slot, activeRecordForSlot(homeSections, slot));
    const localDraft = draftBySlot[slot.id];
    const previewImage = slot.id === selectedSlotId && optimizedAsset?.previewUrl ? optimizedAsset.previewUrl : savedBanner.imageUrl;

    return {
      slot,
      banner: {
        ...savedBanner,
        ...(localDraft
          ? {
              title: localDraft.title,
              eyebrow: localDraft.eyebrow,
              subtitle: localDraft.subtitle,
              href: localDraft.href,
              overlayEnabled: localDraft.overlayEnabled,
              textOverlayEnabled: localDraft.textOverlayEnabled,
              badgeEnabled: localDraft.badgeEnabled,
              autoDiscountCopyEnabled: localDraft.autoDiscountCopyEnabled,
            }
          : {}),
        imageUrl: previewImage,
      },
    };
  });

  const carouselBanners = renderedBanners.filter(({ slot }) => slot.kind === "carousel");
  const hero = carouselBanners[0] ?? renderedBanners.find(({ slot }) => slot.kind === "hero") ?? renderedBanners[0];
  const promos = renderedBanners.filter(({ slot }) => slot.kind === "promo");
  const officialBrands = ADMIN_HOME_BRANDS.slice(0, brandCount);
  const marketingVideoPreviews = useMemo(() => activeAssetRecords(marketingVideos), [marketingVideos]);

  useEffect(() => {
    if (!runtime.configured) {
      return;
    }

    const unsubscribeHome = subscribeCmsRecords("home_sections", setHomeSections, setMessage);
    const unsubscribeConfig = subscribeCmsRecords(
      "tablet_home_configs",
      (records) => {
        const config = records.find((record) => record.id === CONFIG_ID);
        if (config) {
          setBrandCount(clampBrandCount(recordNumber(config, "official_brand_count", Math.min(8, ADMIN_HOME_BRANDS.length))));
        }
      },
      setMessage,
    );
    const unsubscribeMobile = subscribeCmsRecords(
      "mobile_home_configs",
      (records) => {
        setMobileConfigs(records);
        const config = records.find((record) => record.id === MOBILE_CONFIG_ID);
        if (config) {
          setMobilePreviewPath(normalizeMobilePreviewPath(recordText(config, "preview_path", DEFAULT_MOBILE_PREVIEW_PATH)));
          setMobilePreviewStatus(recordText(config, "status", "live"));
        }
      },
      setMessage,
    );
    const unsubscribeMarketingVideos = subscribeCmsRecords("marketing_videos", setMarketingVideos, setMessage);
    const unsubscribeProducts = subscribeCmsRecords("products", setProductRecords, setMessage);

    return () => {
      unsubscribeHome();
      unsubscribeConfig();
      unsubscribeMobile();
      unsubscribeMarketingVideos();
      unsubscribeProducts();
    };
  }, [runtime.configured]);

  function clearSelectedUpload() {
    setFile(null);
    setOptimizedAsset((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setFileInputKey((current) => current + 1);
  }

  function selectSlot(slotId: string) {
    setSelectedSlotId(slotId);
    clearSelectedUpload();
  }

  useEffect(() => {
    grantMobilePreviewAccess();
  }, []);

  useEffect(() => {
    return () => {
      if (optimizedAsset?.previewUrl) URL.revokeObjectURL(optimizedAsset.previewUrl);
    };
  }, [optimizedAsset?.previewUrl]);

  function updateDraft(key: keyof SlotDraft, value: string | boolean) {
    setDraftBySlot((current) => ({
      ...current,
      [selectedSlot.id]: {
        ...draft,
        [key]: value,
      },
    }));
  }

  function selectProductUrl(productId: string) {
    const product = approvedProducts.find((item) => productRecordId(item) === productId);
    if (!product) return;
    updateDraft("href", productRecordTabletPath(product));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setOptimizedAsset(null);
    setMessage("");

    if (!selectedFile) return;

    setOptimizing(true);
    try {
      const optimized = await optimizeUploadAsset(selectedFile, "image");
      setFile(optimized.file);
      setOptimizedAsset(optimized);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 최적화에 실패했습니다.");
      setFile(selectedFile);
    } finally {
      setOptimizing(false);
    }
  }

  function handleMainBannerFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []).filter((item) => item.type.startsWith("image/")).slice(0, ADMIN_HOME_CAROUSEL_SLOTS);
    setMainBannerFiles(selectedFiles);
    setMessage(selectedFiles.length ? `메인 배너 이미지 ${selectedFiles.length}장을 선택했습니다.` : "");
  }

  async function saveBrandCount(nextCount = brandCount) {
    if (!runtime.configured) {
      setMessage("Firebase 설정값이 없어 저장할 수 없습니다.");
      return;
    }

    await saveCmsRecord("tablet_home_configs", {
      id: CONFIG_ID,
      official_brand_count: clampBrandCount(nextCount),
      source_app: "admin",
      status: "live",
    });
  }

  async function saveMobilePreviewConfig() {
    if (!runtime.configured) {
      setMessage("Firebase is not configured. Mobile preview settings cannot be saved.");
      return;
    }

    setSavingMobilePreview(true);
    setMessage("");

    try {
      const normalizedPath = normalizeMobilePreviewPath(mobilePreviewPath);
      await saveCmsRecord("mobile_home_configs", {
        id: MOBILE_CONFIG_ID,
        title: "모바일 둘러보기 미리보기",
        preview_path: normalizedPath,
        preview_url: normalizedPath,
        session_id: normalizedPath.includes("sessionId=") ? normalizedPath.split("sessionId=").at(-1)?.split("&")[0] : "dev-mobile-preview",
        status: mobilePreviewStatus,
        source_app: "admin",
        source_channel: "admin_home_editor",
      });
      setMobilePreviewPath(normalizedPath);
      setMessage("Mobile preview settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mobile preview settings failed to save.");
    } finally {
      setSavingMobilePreview(false);
    }
  }

  async function saveSlotRecord(slot: EditableSlot, slotDraft: SlotDraft, assetPatch: Partial<CmsRecord> = {}) {
    const currentRecord = activeRecordForSlot(homeSections, slot);
    const assetUrl = firstSafeStorefrontMediaUrl(assetPatch.asset_url, currentRecord?.asset_url, slot.fallback.imageUrl);
    const imageOnlySlot = Boolean(assetUrl) && (slot.kind === "carousel" || slot.kind === "promo");

    await saveCmsRecord("home_sections", {
      id: slot.recordId,
      section_type: slot.kind === "promo" ? "promo_banner" : "hero_banner",
      slot_id: slot.id,
      source_banner_id: slot.fallback.id,
      placement: slot.placement,
      title: slotDraft.title,
      eyebrow: slotDraft.eyebrow,
      subtitle: slotDraft.subtitle,
      href: slotDraft.href,
      click_target: slotDraft.href,
      display_order: slot.displayOrder,
      asset_url: assetUrl,
      asset_type: recordText(currentRecord, "asset_type", "image"),
      overlay_enabled: imageOnlySlot ? false : slotDraft.overlayEnabled,
      text_overlay_enabled: imageOnlySlot ? false : slotDraft.textOverlayEnabled,
      badge_enabled: imageOnlySlot ? false : slotDraft.badgeEnabled,
      auto_discount_copy_enabled: imageOnlySlot ? false : slotDraft.autoDiscountCopyEnabled,
      status: slotDraft.status,
      approval_status: slotDraft.status,
      source_app: "admin",
      ...assetPatch,
    });
  }

  async function saveMediaAsset(slot: EditableSlot, title: string, assetUrl: string, assetPatch: Partial<CmsRecord> = {}) {
    if (!assetUrl) return;

    await saveCmsRecord("media_assets", {
      id: `asset-${slot.recordId}`,
      title,
      source_collection: "home_sections",
      source_record_id: slot.recordId,
      asset_type: "image",
      asset_url: assetUrl,
      owner_type: "admin",
      status: "uploaded",
      source_app: "admin",
      ...assetPatch,
    });
  }

  async function registerVisibleBanners() {
    if (!runtime.configured) {
      setMessage("Firebase 설정값이 없어 저장할 수 없습니다.");
      return;
    }

    setBulkSaving(true);
    setMessage("");

    try {
      for (const { slot, banner } of renderedBanners) {
        const slotDraft = draftBySlot[slot.id] ?? draftFromBanner(slot, banner, recordText(activeRecordForSlot(homeSections, slot), "status", "live"));
        await saveSlotRecord(slot, slotDraft, {
          asset_url: banner.imageUrl,
          asset_type: "image",
        });
        await saveMediaAsset(slot, slotDraft.title, banner.imageUrl, {
          external_url: banner.imageUrl,
        });
      }

      await saveBrandCount();
      setMessage("현재 좌측 미리보기의 배너 슬롯을 실제 홈 배너로 등록했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "배너 일괄 등록에 실패했습니다.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function registerMainBannerFiles() {
    if (!runtime.configured) {
      setMessage("Firebase 설정값이 없어 저장할 수 없습니다.");
      return;
    }

    if (mainBannerFiles.length === 0) {
      setMessage("메인 배너 이미지 1~5장을 먼저 선택해 주세요.");
      return;
    }

    setSavingMainBanners(true);
    setMessage("");

    try {
      const carouselSlots = editableSlots.filter((slot) => slot.kind === "carousel").slice(0, ADMIN_HOME_CAROUSEL_SLOTS);

      for (const [index, selectedFile] of mainBannerFiles.entries()) {
        const slot = carouselSlots[index];
        if (!slot) continue;

        const uploaded = await uploadCmsFile("home_sections", slot.recordId, selectedFile, {
          productId: slot.recordId,
        });
        const currentBanner = bannerFromRecord(slot, activeRecordForSlot(homeSections, slot));
        const slotDraft = draftFromBanner(slot, currentBanner, "live");

        await saveSlotRecord(
          slot,
          {
            ...slotDraft,
            title: currentBanner.title || `메인 배너 ${index + 1}`,
            eyebrow: currentBanner.eyebrow || "",
            subtitle: currentBanner.subtitle || "",
            overlayEnabled: false,
            textOverlayEnabled: false,
            badgeEnabled: false,
            autoDiscountCopyEnabled: false,
            status: "live",
          },
          {
            asset_url: uploaded.url,
            asset_path: uploaded.path,
            asset_type: uploaded.assetType,
            asset_original_name: selectedFile.name,
            asset_original_size: selectedFile.size,
          },
        );

        await saveMediaAsset(slot, `메인 배너 ${index + 1}`, uploaded.url, {
          asset_type: uploaded.assetType,
          asset_path: uploaded.path,
          original_name: selectedFile.name,
          original_size: selectedFile.size,
        });
      }

      await saveBrandCount();
      setMainBannerFiles([]);
      setMessage(`메인 배너 ${mainBannerFiles.length}장을 등록했습니다. 폐쇄몰에서 좌우 이동과 6.5초 자동 롤링으로 노출됩니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "메인 배너 등록에 실패했습니다.");
    } finally {
      setSavingMainBanners(false);
    }
  }

  async function applySelectedSlot() {
    if (!runtime.configured) {
      setMessage("Firebase 설정값이 없어 저장할 수 없습니다.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let uploadedPatch: Partial<CmsRecord> = {};

      if (uploadedFile) {
        try {
          const uploaded = await uploadCmsFile("home_sections", selectedSlot.recordId, uploadedFile, {
            productId: selectedSlot.recordId,
          });

          uploadedPatch = {
            asset_url: uploaded.url,
            asset_path: uploaded.path,
            asset_type: uploaded.assetType,
            asset_original_name: optimizedAsset?.original.name ?? uploadedFile.name,
            asset_original_size: optimizedAsset?.original.size ?? uploadedFile.size,
            asset_optimized_name: optimizedAsset?.optimized.name ?? uploadedFile.name,
            asset_optimized_size: optimizedAsset?.optimized.size ?? uploadedFile.size,
            asset_width: optimizedAsset?.optimized.width,
            asset_height: optimizedAsset?.optimized.height,
            asset_reduction_ratio: optimizedAsset?.reductionRatio ?? 0,
          };

          await saveMediaAsset(selectedSlot, uploadedFile.name, uploaded.url, {
            asset_type: uploaded.assetType,
            asset_path: uploaded.path,
            original_name: optimizedAsset?.original.name ?? uploadedFile.name,
            original_size: optimizedAsset?.original.size ?? uploadedFile.size,
            optimized_size: optimizedAsset?.optimized.size ?? uploadedFile.size,
            width: optimizedAsset?.optimized.width,
            height: optimizedAsset?.optimized.height,
            reduction_ratio: optimizedAsset?.reductionRatio ?? 0,
          });
        } catch (uploadError) {
          if (!uploadedFile.type.startsWith("image/") || uploadedFile.size > INLINE_HOME_BANNER_MAX_BYTES) {
            throw uploadError;
          }

          uploadedPatch = {
            asset_url: await fileToDataUrl(uploadedFile),
            asset_type: "image",
            asset_storage_mode: "firestore_inline",
            asset_upload_fallback_reason: errorText(uploadError).slice(0, 500),
            asset_original_name: optimizedAsset?.original.name ?? uploadedFile.name,
            asset_original_size: optimizedAsset?.original.size ?? uploadedFile.size,
            asset_optimized_name: optimizedAsset?.optimized.name ?? uploadedFile.name,
            asset_optimized_size: optimizedAsset?.optimized.size ?? uploadedFile.size,
            asset_width: optimizedAsset?.optimized.width,
            asset_height: optimizedAsset?.optimized.height,
            asset_reduction_ratio: optimizedAsset?.reductionRatio ?? 0,
          };
        }
      }

      const persistedImageUrl = recordText(selectedRecord, "asset_url", selectedSlot.fallback.imageUrl);
      await saveSlotRecord(selectedSlot, draft, uploadedPatch);
      await saveMediaAsset(selectedSlot, draft.title, recordText(uploadedPatch as CmsRecord, "asset_url", persistedImageUrl), uploadedPatch);
      await saveBrandCount();
      setMessage(`${selectedSlot.label} 배너를 실제 홈 배너로 등록하고 적용했습니다.`);
      clearSelectedUpload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "배너 적용에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-180px)] gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-normal tracking-[0.16em] text-slate-500">태블릿 홈 미리보기</p>
            <h2 className="mt-1 text-lg font-normal text-slate-950">미리보기에서 영역을 선택하세요</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-xs font-normal text-slate-900 ring-1 ring-slate-200">
              메인 배너 5장 선택
              <input type="file" accept="image/*" multiple onChange={handleMainBannerFilesChange} className="hidden" />
            </label>
            <button
              type="button"
              onClick={registerMainBannerFiles}
              disabled={savingMainBanners || !runtime.configured || mainBannerFiles.length === 0}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {savingMainBanners ? "등록 중" : `메인 배너 ${mainBannerFiles.length || 5}장 등록`}
            </button>
            <button
              type="button"
              onClick={registerVisibleBanners}
              disabled={bulkSaving || !runtime.configured}
              className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {bulkSaving ? "등록 중" : "현재 미리보기 전체 등록"}
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-250px)] overflow-auto bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
            <aside className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-normal uppercase tracking-[0.16em] text-slate-500">배너 선택</p>
              <div className="mt-3 grid gap-2">
                {renderedBanners.map(({ slot }) => {
                  const isSelected = selectedSlotId === slot.id;
                  const registered = Boolean(activeRecordForSlot(homeSections, slot));

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => selectSlot(slot.id)}
                      className={`rounded-md px-3 py-2 text-left text-sm font-normal ${
                        isSelected ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                      }`}
                    >
                      <span className="block">{slot.label}</span>
                      <span className={`mt-1 block text-[11px] ${isSelected ? "text-blue-100" : registered ? "text-emerald-700" : "text-slate-400"}`}>
                        {registered ? "등록됨" : "미등록"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs font-normal leading-5 text-slate-500">
                좌측 목록 또는 우측 미리보기 배너를 클릭하면 오른쪽 옵션 패널이 해당 배너로 바뀝니다.
              </p>
            </aside>

            <div className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-lg font-normal text-white">H</span>
                  <div>
                    <p className="text-sm font-normal tracking-[0.18em]">HANSANYEON</p>
                    <p className="text-xs font-normal text-rose-600">전용 멤버십 산후조리원 혜택</p>
                  </div>
                </div>
                <p className="text-sm font-normal">산후조리원 / 새봄관</p>
              </header>

              <div className="grid gap-7 p-5">
                <button
                  type="button"
                  onClick={() => selectSlot(hero.slot.id)}
                  className="block text-left"
                  aria-label={`${hero.slot.label} ?좏깮`}
                >
                  <div className="aspect-[16/6]">
                    <AdminSlotImage banner={hero.banner} selected={selectedSlotId === hero.slot.id} />
                  </div>
                </button>

                <AdminPromoVideoStage
                  videos={marketingVideoPreviews}
                  promos={promos}
                  selectedSlotId={selectedSlotId}
                  onSelect={selectSlot}
                />

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-normal uppercase tracking-[0.16em] text-slate-500">공식 입점 브랜드</p>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-600">{brandCount}개 노출</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {officialBrands.map((brand) => (
                      <div key={brand.id} className="rounded-md border border-slate-200 bg-white p-3 text-center shadow-sm">
                        <div className="flex h-14 items-center justify-center">
                          <img src={brand.logoUrl} alt={brand.name} className="max-h-10 max-w-full object-contain" />
                        </div>
                        <p className="mt-2 text-xs font-normal text-slate-500">{brand.category}</p>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="rounded-md border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
              <p className="text-xs font-normal tracking-[0.16em] text-blue-600">선택 영역</p>
            <h2 className="mt-1 text-2xl font-normal">{selectedSlot.label}</h2>
            <p className="mt-1 text-sm font-normal text-slate-500">{selectedSlot.placement}</p>
          </div>
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-normal text-emerald-800">
            {draft.status === "live" ? "노출중" : draft.status}
          </span>
        </div>

        {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-normal text-blue-900">{message}</p> : null}
        {!runtime.configured ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-normal text-amber-900">
            Firebase 환경값을 먼저 설정해야 저장할 수 있습니다.
          </p>
        ) : null}

        <div className="mt-5 rounded-md border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-normal tracking-[0.16em] text-blue-700">모바일 미리보기</p>
              <h3 className="mt-1 text-lg font-normal text-slate-950">모바일 쇼핑몰 입장</h3>
              <p className="mt-1 text-xs font-normal text-slate-600">{mobileConfigs.length ? "Firebase 설정 불러옴" : "기본 미리보기 경로"}</p>
            </div>
            <a
              href={normalizeMobilePreviewPath(mobilePreviewPath)}
              onMouseDown={grantMobilePreviewAccess}
              onClick={grantMobilePreviewAccess}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white px-3 py-2 text-xs font-normal text-blue-800 ring-1 ring-blue-200"
            >
              열기
            </a>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-normal text-slate-900">
              미리보기 경로
              <input
                value={mobilePreviewPath}
                onChange={(event) => setMobilePreviewPath(event.target.value)}
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm font-normal text-slate-900">
              노출 상태
              <select
                value={mobilePreviewStatus}
                onChange={(event) => setMobilePreviewStatus(event.target.value)}
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm"
              >
                <option value="live">노출중</option>
                <option value="paused">일시중지</option>
                <option value="draft">초안</option>
              </select>
            </label>
            <button
              type="button"
              onClick={saveMobilePreviewConfig}
              disabled={savingMobilePreview || !runtime.configured}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {savingMobilePreview ? "저장 중" : "모바일 미리보기 저장"}
            </button>
            <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-white p-2 shadow-sm">
              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                <iframe
                  title="mobile shop preview"
                  src={normalizeMobilePreviewPath(mobilePreviewPath)}
                  onLoad={grantMobilePreviewAccess}
                  className="h-[520px] w-full bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-normal">
            제목
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-normal">
            상단 문구
            <input
              value={draft.eyebrow}
              onChange={(event) => updateDraft("eyebrow", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-normal">
            설명
            <textarea
              value={draft.subtitle}
              onChange={(event) => updateDraft("subtitle", event.target.value)}
              className="min-h-20 rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-normal">
            연결 경로
              <input
                value={draft.href}
                onChange={(event) => updateDraft("href", event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2"
              />
              <select value="" onChange={(event) => selectProductUrl(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
                <option value="">상품 URL 선택</option>
                {approvedProducts.map((product) => {
                  const productId = productRecordId(product);

                  return (
                    <option key={product.id} value={productId}>
                      {productRecordTitle(product)}
                    </option>
                  );
                })}
              </select>
            </label>
          <label className="grid gap-1 text-sm font-normal">
            노출 상태
            <select
              value={draft.status}
              onChange={(event) => updateDraft("status", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            >
              <option value="live">노출중</option>
              <option value="paused">일시중지</option>
            </select>
          </label>
          <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-normal text-slate-900">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.textOverlayEnabled}
                onChange={(event) => updateDraft("textOverlayEnabled", event.target.checked)}
              />
              <span>이미지 위 문구 표시</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.overlayEnabled}
                onChange={(event) => updateDraft("overlayEnabled", event.target.checked)}
              />
              <span>어두운 효과 사용</span>
            </label>
            {selectedSlot.kind === "promo" ? (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.badgeEnabled}
                    onChange={(event) => updateDraft("badgeEnabled", event.target.checked)}
                  />
                  <span>번호 배지 표시</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.autoDiscountCopyEnabled}
                    onChange={(event) => updateDraft("autoDiscountCopyEnabled", event.target.checked)}
                  />
                  <span>자동 할인 문구 사용</span>
                </label>
              </>
            ) : null}
          </div>
          <label className="grid gap-1 text-sm font-normal">
            배너 이미지 등록
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>

          {optimizing ? (
            <p className="rounded-md bg-slate-50 p-3 text-sm font-normal text-slate-700">이미지를 최적화하고 있습니다.</p>
          ) : null}

          {optimizedAsset ? (
            <div className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-normal uppercase text-slate-500">업로드 미리보기</p>
                  <p className="mt-1 text-sm font-normal">{optimizedAsset.optimized.name}</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-normal text-emerald-800">
                  {formatBytes(optimizedAsset.original.size)}{" -> "}{formatBytes(optimizedAsset.optimized.size)}
                </span>
              </div>
              <img src={optimizedAsset.previewUrl} alt="" className="mt-3 aspect-video w-full rounded-md object-cover" />
            </div>
          ) : safeStorefrontMediaUrl(selectedBanner.imageUrl) ? (
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-normal uppercase text-slate-500">현재 적용 이미지</p>
              <img src={safeStorefrontMediaUrl(selectedBanner.imageUrl)} alt="" className="mt-3 aspect-video w-full rounded-md bg-slate-950 object-cover" />
            </div>
          ) : null}

          <button
            type="button"
            onClick={applySelectedSlot}
            disabled={saving || optimizing || !runtime.configured}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "적용 중" : "배너 이미지 등록 및 적용"}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-normal tracking-[0.16em] text-slate-500">브랜드 노출</p>
              <h3 className="text-lg font-normal">공식 입점 브랜드 수</h3>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-700">{brandCount}개</span>
          </div>
          <div className="mt-4 grid gap-3">
            <input
              type="range"
              min={0}
              max={ADMIN_HOME_BRANDS.length}
              value={brandCount}
              onChange={(event) => setBrandCount(clampBrandCount(Number(event.target.value)))}
              className="w-full"
            />
            <input
              type="number"
              min={0}
              max={ADMIN_HOME_BRANDS.length}
              value={brandCount}
              onChange={(event) => setBrandCount(clampBrandCount(Number(event.target.value) || 0))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal"
            />
            <button
              type="button"
              onClick={() => {
                void saveBrandCount().then(() => setMessage("공식 입점 브랜드 노출 수를 적용했습니다."));
              }}
              disabled={!runtime.configured}
              className="rounded-md bg-white px-4 py-2 text-sm font-normal text-slate-900 ring-1 ring-slate-200 disabled:opacity-50"
            >
              브랜드 수 적용
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}
