import type { CmsRecord } from "@/lib/firebase/contentRepository";

export type CompanyAdType = "image" | "popup";
export type CompanyAdStatus = "draft" | "pending_review" | "live" | "paused" | "restricted";

export type CompanyAdAsset = {
  id: string;
  companyId: string;
  title: string;
  body: string;
  adType: CompanyAdType;
  status: CompanyAdStatus;
  assetUrl: string;
  assetPath?: string;
  linkUrl: string;
  moderationStatus: "registered" | "approved" | "restricted";
  moderationReason: string;
  moderatedAt: string;
  createdAt: string;
  updatedAt?: unknown;
};

function recordText(record: CmsRecord | undefined, key: string, fallback = "") {
  const value = record?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

function normalizeAdType(value: string): CompanyAdType {
  return value === "popup" ? "popup" : "image";
}

function normalizeStatus(value: string): CompanyAdStatus {
  if (value === "draft" || value === "live" || value === "paused" || value === "restricted") return value;
  return "pending_review";
}

function normalizeModerationStatus(value: string): CompanyAdAsset["moderationStatus"] {
  if (value === "approved" || value === "restricted") return value;
  return "registered";
}

export function companyAdAssetFromRecord(record: CmsRecord): CompanyAdAsset {
  return {
    id: record.id,
    companyId: recordText(record, "company_id", recordText(record, "companyId")),
    title: recordText(record, "title"),
    body: recordText(record, "body"),
    adType: normalizeAdType(recordText(record, "ad_type")),
    status: normalizeStatus(recordText(record, "status")),
    assetUrl: recordText(record, "asset_url"),
    assetPath: recordText(record, "asset_path") || undefined,
    linkUrl: recordText(record, "link_url"),
    moderationStatus: normalizeModerationStatus(recordText(record, "moderation_status")),
    moderationReason: recordText(record, "moderation_reason"),
    moderatedAt: recordText(record, "moderated_at"),
    createdAt: recordText(record, "created_at"),
    updatedAt: record.updated_at,
  };
}

export function isRestrictedCompanyAd(ad: CompanyAdAsset) {
  return ad.status === "restricted" || ad.moderationStatus === "restricted";
}

export const companyAdRestrictionMessage = "관리자로부터 해당 광고는 제재를 받았습니다. 관리자에게 문의 해주세요";
