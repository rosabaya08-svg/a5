import { companyAdAssetFromRecord, isRestrictedCompanyAd, type CompanyAdAsset } from "@/lib/company/companyAd";
import type { CmsRecord } from "@/lib/firebase/contentRepository";

export function cmsRecordText(record: CmsRecord | undefined, key: string, fallback = "") {
  const value = record?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

export function cmsRecordNumber(record: CmsRecord | undefined, key: string, fallback: number) {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function isCmsRecordLive(record: CmsRecord | undefined) {
  const status = cmsRecordText(record, "status", cmsRecordText(record, "approval_status", ""));
  return ["active", "approved", "live", "published", "scheduled"].includes(status);
}

export function cmsDisplayOrder(record: CmsRecord) {
  return cmsRecordNumber(record, "display_order", cmsRecordNumber(record, "order", 999));
}

export function activeCmsAssetRecords(records: CmsRecord[]) {
  return records
    .filter((record) => isCmsRecordLive(record) && Boolean(cmsRecordText(record, "asset_url")))
    .sort((left, right) => cmsDisplayOrder(left) - cmsDisplayOrder(right));
}

function companyAdCreatedTime(ad: CompanyAdAsset) {
  const time = new Date(ad.createdAt || ad.moderatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function isVisibleCompanyAdAsset(ad: CompanyAdAsset) {
  return ad.status === "live" && ad.moderationStatus === "approved" && !isRestrictedCompanyAd(ad) && Boolean(ad.assetUrl);
}

export function visibleCompanyAdsFromRecords(records: CmsRecord[]) {
  return records
    .map(companyAdAssetFromRecord)
    .filter(isVisibleCompanyAdAsset)
    .sort((left, right) => companyAdCreatedTime(right) - companyAdCreatedTime(left));
}
