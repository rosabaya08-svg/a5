import type { CmsRecord } from "@/lib/firebase/contentRepository";
import { brandNameKey } from "@/lib/storefront/brandRouting";

export type CompanyBrandMessageStatus = "new" | "answered" | "hidden";

export type CompanyBrandMessage = {
  id: string;
  companyId: string;
  brandName: string;
  brandKey: string;
  nickname: string;
  message: string;
  reply: string;
  status: CompanyBrandMessageStatus;
  createdAt: string;
  updatedAt?: unknown;
};

function recordText(record: CmsRecord | undefined, key: string, fallback = "") {
  const value = record?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

function normalizeStatus(value: string): CompanyBrandMessageStatus {
  if (value === "answered" || value === "hidden") return value;
  return "new";
}

export function companyBrandMessageFromRecord(record: CmsRecord): CompanyBrandMessage {
  const brandName = recordText(record, "brand_name", recordText(record, "brandName"));

  return {
    id: record.id,
    companyId: recordText(record, "company_id", recordText(record, "companyId")),
    brandName,
    brandKey: recordText(record, "brand_key", brandNameKey(brandName)),
    nickname: recordText(record, "nickname", "고객"),
    message: recordText(record, "message"),
    reply: recordText(record, "reply"),
    status: normalizeStatus(recordText(record, "status")),
    createdAt: recordText(record, "created_at"),
    updatedAt: record.updated_at,
  };
}

export function companyBrandMessageMatchesBrand(message: CompanyBrandMessage, brandName: string) {
  return message.brandKey === brandNameKey(brandName) || brandNameKey(message.brandName) === brandNameKey(brandName);
}

export function sortCompanyBrandMessagesByDate(messages: CompanyBrandMessage[]) {
  return [...messages].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt) || 0;
    const rightTime = Date.parse(right.createdAt) || 0;
    return rightTime - leftTime;
  });
}
