import type { CmsRecord } from "@/lib/firebase/contentRepository";
import { brandNameKey } from "@/lib/storefront/brandRouting";

export type CompanyBrandPageConfig = {
  id: string;
  companyId: string;
  brandName: string;
  brandId?: string;
  template?: string;
  title: string;
  subtitle: string;
  logoUrl: string;
  logoAssetPath?: string;
  bannerImageUrl: string;
  bannerAssetPath?: string;
  eventTitle: string;
  eventBody: string;
  eventCtaLabel: string;
  eventCtaHref: string;
  noticeCards: CompanyBrandPageNoticeCard[];
  sections: CompanyBrandPageSection[];
  publishedSnapshot?: CompanyBrandPagePublishedSnapshot;
  version?: number;
  status: "live" | "paused";
  updatedAt?: unknown;
};

export type CompanyBrandPageNoticeCard = {
  title: string;
  body: string;
};

export type CompanyBrandPageSectionType = "hero" | "intro" | "product_grid" | "event" | "notice" | "cta";

export type CompanyBrandPageSection = {
  id: string;
  type: CompanyBrandPageSectionType;
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  productIds?: string[];
  layout?: string;
};

export type CompanyBrandPagePublishedSnapshot = {
  title: string;
  subtitle: string;
  sections: CompanyBrandPageSection[];
  productIds: string[];
  publishedAt: string;
};

function safeConfigIdPart(value: string) {
  return value.trim().replace(/[\\/]+/g, "-").replace(/\s+/g, "-").slice(0, 120) || "brand";
}

function recordText(record: CmsRecord | undefined, key: string, fallback = "") {
  const value = record?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

function noticeCardsFromRecord(record: CmsRecord): CompanyBrandPageNoticeCard[] {
  const value = record.notice_cards;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
      }

      const recordItem = item as Record<string, unknown>;
      const title = typeof recordItem.title === "string" ? recordItem.title : "";
      const body = typeof recordItem.body === "string" ? recordItem.body : "";

      return title || body ? { title, body } : undefined;
    })
    .filter((item): item is CompanyBrandPageNoticeCard => Boolean(item));
}

function sectionType(value: unknown): CompanyBrandPageSectionType {
  return value === "hero" || value === "intro" || value === "product_grid" || value === "event" || value === "notice" || value === "cta"
    ? value
    : "intro";
}

function sectionsFromRecord(record: CmsRecord): CompanyBrandPageSection[] {
  const value = record.sections;

  if (!Array.isArray(value)) {
    return [];
  }

  const sections: CompanyBrandPageSection[] = [];

  value.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return;
    }

    const recordItem = item as Record<string, unknown>;
    const id = typeof recordItem.id === "string" && recordItem.id.trim() ? recordItem.id : `section-${index + 1}`;
    const title = typeof recordItem.title === "string" ? recordItem.title : "";
    const body = typeof recordItem.body === "string" ? recordItem.body : "";
    const ctaLabel = typeof recordItem.ctaLabel === "string" ? recordItem.ctaLabel : "";
    const ctaHref = typeof recordItem.ctaHref === "string" ? recordItem.ctaHref : "";
    const layout = typeof recordItem.layout === "string" ? recordItem.layout : "";
    const productIds = Array.isArray(recordItem.productIds) ? recordItem.productIds.filter((id): id is string => typeof id === "string") : [];

    sections.push({
      id,
      type: sectionType(recordItem.type),
      title,
      body,
      ctaLabel,
      ctaHref,
      productIds,
      layout,
    });
  });

  return sections;
}

function publishedSnapshotFromRecord(record: CmsRecord): CompanyBrandPagePublishedSnapshot | undefined {
  const value = record.published_snapshot;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const snapshot = value as Record<string, unknown>;
  const sections = Array.isArray(snapshot.sections) ? sectionsFromRecord({ id: record.id, sections: snapshot.sections }) : [];
  const productIds = Array.isArray(snapshot.productIds) ? snapshot.productIds.filter((id): id is string => typeof id === "string") : [];

  return {
    title: typeof snapshot.title === "string" ? snapshot.title : "",
    subtitle: typeof snapshot.subtitle === "string" ? snapshot.subtitle : "",
    sections,
    productIds,
    publishedAt: typeof snapshot.publishedAt === "string" ? snapshot.publishedAt : "",
  };
}

export function companyBrandPageConfigId(companyId: string, brandName: string) {
  return `${safeConfigIdPart(companyId)}__${safeConfigIdPart(brandName)}`;
}

export function companyBrandPageConfigFromRecord(record: CmsRecord): CompanyBrandPageConfig {
  const status = recordText(record, "status", "paused");

  return {
    id: record.id,
    companyId: recordText(record, "company_id", recordText(record, "companyId")),
    brandId: recordText(record, "brand_id", recordText(record, "brandId")) || undefined,
    brandName: recordText(record, "brand_name", recordText(record, "brandName")),
    template: recordText(record, "template"),
    title: recordText(record, "title", recordText(record, "banner_title")),
    subtitle: recordText(record, "subtitle", recordText(record, "banner_subtitle")),
    logoUrl: recordText(record, "logo_url", recordText(record, "logoUrl")),
    logoAssetPath: recordText(record, "logo_asset_path", recordText(record, "logoAssetPath")) || undefined,
    bannerImageUrl: recordText(record, "asset_url", recordText(record, "banner_image_url")),
    bannerAssetPath: recordText(record, "asset_path", recordText(record, "banner_asset_path")) || undefined,
    eventTitle: recordText(record, "event_title"),
    eventBody: recordText(record, "event_body"),
    eventCtaLabel: recordText(record, "event_cta_label"),
    eventCtaHref: recordText(record, "event_cta_href"),
    noticeCards: noticeCardsFromRecord(record),
    sections: sectionsFromRecord(record),
    publishedSnapshot: publishedSnapshotFromRecord(record),
    version: typeof record.version === "number" ? record.version : undefined,
    status: status === "live" ? "live" : "paused",
    updatedAt: record.updated_at,
  };
}

export function isLiveCompanyBrandPageConfig(config: CompanyBrandPageConfig | undefined) {
  return Boolean(config && config.status === "live");
}

export function companyBrandPageConfigMatchesBrand(config: CompanyBrandPageConfig, brandName: string) {
  return brandNameKey(config.brandName) === brandNameKey(brandName);
}
