import type { CmsRecord } from "@/lib/firebase/contentRepository";
import { brandNameKey } from "@/lib/storefront/brandRouting";

export type CompanyBrandEventNoticeStatus = "live" | "paused" | "draft";

export type CompanyBrandEventNotice = {
  id: string;
  companyId: string;
  brandName: string;
  brandKey: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  popupEnabled: boolean;
  status: CompanyBrandEventNoticeStatus;
  createdAt: string;
  updatedAt?: unknown;
};

function recordText(record: CmsRecord | undefined, key: string, fallback = "") {
  const value = record?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

function recordBoolean(record: CmsRecord | undefined, key: string, fallback = false) {
  const value = record?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function normalizeStatus(value: string): CompanyBrandEventNoticeStatus {
  if (value === "live" || value === "paused" || value === "draft") return value;
  return "draft";
}

export function companyBrandEventNoticeFromRecord(record: CmsRecord): CompanyBrandEventNotice {
  const brandName = recordText(record, "brand_name", recordText(record, "brandName"));

  return {
    id: record.id,
    companyId: recordText(record, "company_id", recordText(record, "companyId")),
    brandName,
    brandKey: recordText(record, "brand_key", brandNameKey(brandName)),
    title: recordText(record, "title"),
    body: recordText(record, "body"),
    ctaLabel: recordText(record, "cta_label"),
    ctaHref: recordText(record, "cta_href"),
    popupEnabled: recordBoolean(record, "popup_enabled"),
    status: normalizeStatus(recordText(record, "status")),
    createdAt: recordText(record, "created_at"),
    updatedAt: record.updated_at,
  };
}

export function companyBrandEventNoticeMatchesBrand(notice: CompanyBrandEventNotice, brandName: string) {
  return notice.brandKey === brandNameKey(brandName) || brandNameKey(notice.brandName) === brandNameKey(brandName);
}

export function isLiveCompanyBrandEventNotice(notice: CompanyBrandEventNotice) {
  return notice.status === "live";
}

export function sortCompanyBrandEventNoticesByDate(notices: CompanyBrandEventNotice[]) {
  return [...notices].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt) || 0;
    const rightTime = Date.parse(right.createdAt) || 0;
    return rightTime - leftTime;
  });
}
