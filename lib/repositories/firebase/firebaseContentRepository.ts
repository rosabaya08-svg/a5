import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ContentRepository, StorefrontContent } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { MallBanner, MallBrand, MallProductProfile, MarketingSlot } from "@/types/storefrontContent";
import { normalizeStorefrontBusinessNo } from "@/lib/storefront/productUrls";
import { safeStorefrontMediaUrl } from "@/lib/storefront/safeMediaUrl";

type CmsDoc = {
  id: string;
  data: Record<string, unknown>;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asRecordArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function isVisibleRecord(data: Record<string, unknown>) {
  const status = asString(data.status ?? data.approval_status, "active").toLowerCase();
  const approval = asString(data.approval_status ?? data.product_approval_status, status).toLowerCase();
  return ["active", "approved", "published", "live"].includes(status) || ["approved", "published", "live"].includes(approval);
}

function asBannerTone(value: unknown): MallBanner["tone"] {
  if (value === "dark" || value === "gold" || value === "rose" || value === "sage") return value;
  return "gold";
}

function asBrandStatus(value: unknown): MallBrand["status"] {
  if (value === "new" || value === "review") return value;
  return "featured";
}

function asMarketingStatus(value: unknown): MarketingSlot["status"] {
  if (value === "draft" || value === "pending_approval" || value === "rejected") return value;
  return "approved";
}

function firstMediaUrl(data: Record<string, unknown>) {
  const direct = safeStorefrontMediaUrl(asString(data.image_url ?? data.asset_url ?? data.thumbnail_url ?? data.video_url));
  if (direct) return direct;

  for (const item of asRecordArray(data.media)) {
    const url = safeStorefrontMediaUrl(asString(item.url ?? item.asset_url ?? item.downloadUrl));
    if (url) return url;
  }

  return "";
}

function galleryUrls(data: Record<string, unknown>) {
  const urls = new Set<string>();

  for (const url of asStringArray(data.gallery)) {
    const safeUrl = safeStorefrontMediaUrl(url);
    if (safeUrl) urls.add(safeUrl);
  }

  for (const item of asRecordArray(data.media)) {
    const url = safeStorefrontMediaUrl(asString(item.url ?? item.asset_url ?? item.downloadUrl));
    if (url) urls.add(url);
  }

  const first = firstMediaUrl(data);
  if (first) urls.add(first);

  return [...urls];
}

function mapMarketingSlot(collectionName: "marketing_banners" | "marketing_videos", doc: CmsDoc): MarketingSlot {
  const isVideo = collectionName === "marketing_videos";
  const data = doc.data;

  return {
    id: doc.id,
    title: asString(data.title, isVideo ? "Video CMS item" : "Banner CMS item"),
    placement: asString(data.placement, isVideo ? "home_video_strip" : "shopping_home_top"),
    target: asString(data.target ?? data.scope_id, "all_nurseries"),
    period: `${asString(data.visible_from ?? data.starts_at, "start unset")} ~ ${asString(data.visible_to ?? data.ends_at, "end unset")}`,
    status: asMarketingStatus(data.status ?? data.approval_status),
    owner: asString(data.company_id ?? data.companyId ?? data.owner_type, "unknown"),
    performance: isVideo ? "Firestore video" : "Firestore banner",
    assetUrl: firstMediaUrl(data),
    assetType: asString(data.asset_type, isVideo ? "video" : "image"),
    body: asString(data.body ?? data.subtitle ?? data.summary),
    href: asString(data.href ?? data.click_target ?? data.link_url ?? data.video_action_target ?? data.action_target, "/tablet/products/"),
    videoActionType: asString(data.video_action_type ?? data.action_type, "none"),
    videoActionTarget: asString(data.video_action_target ?? data.action_target),
    videoCtaText: asString(data.video_cta_text ?? data.cta_text),
    videoCtaColor: asString(data.video_cta_color),
    videoCtaFont: asString(data.video_cta_font),
    videoCtaPosition: asString(data.video_cta_position),
    videoCtaMotion: asString(data.video_cta_motion),
    videoCtaStartSeconds: asNumber(data.video_cta_start_seconds, 1),
    videoCtaDurationSeconds: asNumber(data.video_cta_duration_seconds, 8),
    displayOrder: asNumber(data.display_order ?? data.order, 999),
  };
}

function mapBanner(doc: CmsDoc, fallbackPlacement: string): MallBanner {
  const data = doc.data;

  return {
    id: doc.id,
    title: asString(data.title, doc.id),
    subtitle: asString(data.subtitle ?? data.body ?? data.summary),
    eyebrow: asString(data.eyebrow ?? data.placement, fallbackPlacement),
    href: asString(data.href ?? data.click_target ?? data.link_url, "/tablet/products/"),
    imageUrl: firstMediaUrl(data),
    tone: asBannerTone(data.tone),
  };
}

function mapBrand(doc: CmsDoc): MallBrand {
  const data = doc.data;
  const companyId = asString(data.company_id ?? data.companyId);
  const businessNo = normalizeStorefrontBusinessNo(
    asString(
      data.business_registration_number_normalized ??
        data.businessRegistrationNumberNormalized ??
        data.business_registration_number ??
        data.businessRegistrationNumber ??
        companyId,
    ),
  );

  return {
    id: asString(data.brand_id, doc.id),
    name: asString(data.name ?? data.brand_name ?? data.title, doc.id),
    logoUrl: asString(data.logo_url ?? data.asset_url),
    category: asString(data.category ?? data.category_label),
    status: asBrandStatus(data.status),
    companyId,
    businessNo,
  };
}

function reviewFor(data: Record<string, unknown>): MallProductProfile["review"] {
  const review = data.review;
  if (review && typeof review === "object" && !Array.isArray(review)) {
    const record = review as Record<string, unknown>;

    return {
      rating: asNumber(record.rating),
      count: asNumber(record.count),
      highlight: asString(record.highlight),
    };
  }

  return {
    rating: asNumber(data.review_rating),
    count: asNumber(data.review_count),
    highlight: asString(data.review_highlight),
  };
}

function detailTabsFor(data: Record<string, unknown>): MallProductProfile["detailTabs"] {
  const sections = asRecordArray(data.detail_sections)
    .map((section) => ({
      title: asString(section.title, "Detail"),
      body: asString(section.body ?? section.description),
    }))
    .filter((section) => section.title || section.body);

  if (sections.length) return sections;

  const detail = asString(data.detail_description ?? data.description ?? data.body);
  return detail ? [{ title: "Detail", body: detail }] : [];
}

function mapProductProfile(doc: CmsDoc): MallProductProfile {
  const data = doc.data;
  const productId = asString(data.product_id ?? data.productId, doc.id);
  const gallery = galleryUrls(data);
  const badges = asStringArray(data.badges);
  const tags = asStringArray(data.tags);
  const brand = asString(data.brand ?? data.brand_name ?? data.company_name);
  const category = asString(data.category_label ?? data.category ?? data.subcategory);

  return {
    productId,
    brand,
    displayName: asString(data.product_name ?? data.name ?? data.title, productId),
    subtitle: asString(data.subtitle ?? data.summary),
    category,
    imageUrl: gallery[0] ?? "",
    gallery,
    badges: badges.length ? badges : [asString(data.sale_status), asString(data.fulfillment)].filter(Boolean),
    tags: tags.length ? tags : [brand, category].filter(Boolean),
    review: reviewFor(data),
    detailTabs: detailTabsFor(data),
  };
}

function categoryFor(profile: MallProductProfile) {
  const id = profile.category || profile.brand || profile.productId;
  return {
    id: id.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || profile.productId,
    label: profile.category || profile.brand || "Category",
    helper: profile.brand || profile.displayName,
  };
}

async function readCollection(collectionName: string) {
  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase web config is missing.");
  }

  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
}

async function readMarketingSlots(type?: "banner" | "video") {
  const shouldReadBanners = !type || type === "banner";
  const shouldReadVideos = !type || type === "video";
  const slots: MarketingSlot[] = [];

  if (shouldReadBanners) {
    const banners = await readCollection("marketing_banners");
    slots.push(...banners.filter((doc) => isVisibleRecord(doc.data)).map((doc) => mapMarketingSlot("marketing_banners", doc)));
  }

  if (shouldReadVideos) {
    const videos = await readCollection("marketing_videos");
    slots.push(...videos.filter((doc) => isVisibleRecord(doc.data)).map((doc) => mapMarketingSlot("marketing_videos", doc)));
  }

  return slots;
}

async function readStorefrontContent(): Promise<StorefrontContent> {
  const [homeSections, marketingBanners, marketingVideos, brands, brandPages, productDetailPages] = await Promise.all([
    readCollection("home_sections"),
    readCollection("marketing_banners"),
    readCollection("marketing_videos"),
    readCollection("brands"),
    readCollection("company_brand_pages"),
    readCollection("product_detail_pages"),
  ]);

  const visibleHomeSections = homeSections.filter((doc) => isVisibleRecord(doc.data));
  const visibleMarketingBanners = marketingBanners.filter((doc) => isVisibleRecord(doc.data));
  const visibleMarketingVideos = marketingVideos.filter((doc) => isVisibleRecord(doc.data));
  const visibleProductProfiles = productDetailPages.filter((doc) => isVisibleRecord(doc.data)).map(mapProductProfile);
  const visibleBrands = [...brands, ...brandPages].filter((doc) => isVisibleRecord(doc.data)).map(mapBrand);
  const marketingSlots = [
    ...visibleMarketingBanners.map((doc) => mapMarketingSlot("marketing_banners", doc)),
    ...visibleMarketingVideos.map((doc) => mapMarketingSlot("marketing_videos", doc)),
  ];

  const heroSource =
    visibleHomeSections.find((doc) => asString(doc.data.section_type).includes("hero") || asString(doc.data.placement).includes("hero")) ??
    visibleMarketingBanners[0];
  const heroBanner = heroSource
    ? mapBanner(heroSource, "shopping_home_hero")
    : {
        id: "firestore-empty-hero",
        title: "A5",
        subtitle: "",
        eyebrow: "Firestore",
        href: "/tablet/products/",
        imageUrl: "",
        tone: "gold" as const,
      };
  const promoBanners = [
    ...visibleHomeSections
      .filter((doc) => doc.id !== heroSource?.id)
      .map((doc) => mapBanner(doc, "shopping_home_promo")),
    ...visibleMarketingBanners
      .filter((doc) => doc.id !== heroSource?.id)
      .map((doc) => mapBanner(doc, "shopping_home_promo")),
  ];
  const categoriesById = new Map<string, StorefrontContent["categories"][number]>();

  for (const profile of visibleProductProfiles) {
    const category = categoryFor(profile);
    categoriesById.set(category.id, category);
  }

  return {
    heroBanner,
    promoBanners,
    brands: visibleBrands,
    categories: [...categoriesById.values()],
    productProfiles: visibleProductProfiles,
    marketingSlots,
  };
}

export const firebaseContentRepository: ContentRepository = {
  async getStorefrontContent() {
    try {
      return repositoryOk(await readStorefrontContent());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore content read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore storefront content read failed. ${message}`);
    }
  },

  async getStorefrontRuntimeSnapshot() {
    const contentResult = await this.getStorefrontContent();

    if (!contentResult.ok) {
      return repositoryError(contentResult.error.code, contentResult.error.message, contentResult.error.target);
    }

    return repositoryOk({
      content: contentResult.data,
      products: [],
      generatedAt: new Date().toISOString(),
      source: "firebase-content-repository",
    });
  },

  async getProductProfileById(productId) {
    try {
      const profiles = await readCollection("product_detail_pages");
      const match = profiles
        .filter((doc) => isVisibleRecord(doc.data))
        .map(mapProductProfile)
        .find((profile) => profile.productId === productId);

      return match
        ? repositoryOk(match)
        : repositoryError("NOT_FOUND", "Firestore product profile not found.", productId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore product profile read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore product profile read failed. ${message}`, productId);
    }
  },

  async listMarketingSlots(filters) {
    try {
      return repositoryOk(await readMarketingSlots(filters?.type));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore marketing slot read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore marketing slots read failed. ${message}`);
    }
  },
};



