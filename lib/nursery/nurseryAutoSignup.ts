import { nurseryExternalMappings } from "@/data/nursery/a4Mapping";
import { normalizeBusinessNo } from "@/lib/auth/session";
import type { CmsRecord } from "@/lib/firebase/contentRepository";

export const NURSERY_AUTO_SIGNUP_STORAGE_KEY = "a5.nursery.auto-signup-profiles";
export const NURSERY_LOGIN_BUSINESS_DRAFT_KEY = "a5.nursery.login.business-no-draft";
export const NURSERY_DEFAULT_PASSWORD = "1004";

export type NurseryAutoSignupSource = "signage_partner" | "manual_profile";
export type NurseryAutoSignupStatus = "approved" | "suspended";

export type NurseryAutoSignupProfile = {
  id: string;
  nurseryId: string;
  businessRegistrationNo: string;
  businessRegistrationNoNormalized: string;
  nurseryName: string;
  representativeName: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  businessAddress: string;
  roomCount: string;
  defaultPassword: string;
  externalNurseryId?: string;
  source: NurseryAutoSignupSource;
  status: NurseryAutoSignupStatus;
  createdAt: string;
  updatedAt: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  marketingConsentAt?: string;
  firstLoginCompletedAt?: string;
};

export type NurseryAutoSignupInput = {
  businessRegistrationNo: string;
  nurseryName: string;
  representativeName: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  businessAddress: string;
  roomCount: string;
};

function makeNurseryId(normalizedBusinessNo: string) {
  return `nursery-${normalizedBusinessNo}`;
}

function asString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asSource(value: unknown): NurseryAutoSignupSource {
  return value === "signage_partner" ? "signage_partner" : "manual_profile";
}

function asStatus(value: unknown): NurseryAutoSignupStatus {
  return value === "suspended" ? "suspended" : "approved";
}

function asDateString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }

  return fallback;
}

export function buildNurseryProfileFromSignagePartnerFallback(
  businessRegistrationNo: string,
): NurseryAutoSignupProfile | null {
  const normalized = normalizeBusinessNo(businessRegistrationNo);
  const mapping = nurseryExternalMappings.find(
    (item) => normalizeBusinessNo(item.businessRegistrationNo) === normalized,
  );

  if (!mapping) return null;

  const now = new Date().toISOString();

  return {
    id: mapping.businessRegistrationNo,
    nurseryId: mapping.nurseryId || makeNurseryId(normalized),
    businessRegistrationNo: mapping.businessRegistrationNo,
    businessRegistrationNoNormalized: normalized,
    nurseryName: "A5 테스트 산후조리원",
    representativeName: "",
    managerName: "",
    managerPhone: "",
    managerEmail: "",
    businessAddress: mapping.registeredAddress,
    roomCount: String(mapping.roomCount),
    defaultPassword: NURSERY_DEFAULT_PASSWORD,
    externalNurseryId: mapping.externalNurseryId,
    source: "signage_partner",
    status: "approved",
    createdAt: now,
    updatedAt: now,
  };
}

export function createManualNurseryProfile(input: NurseryAutoSignupInput): NurseryAutoSignupProfile {
  const normalized = normalizeBusinessNo(input.businessRegistrationNo);
  const now = new Date().toISOString();

  return {
    id: input.businessRegistrationNo,
    nurseryId: makeNurseryId(normalized),
    businessRegistrationNo: input.businessRegistrationNo,
    businessRegistrationNoNormalized: normalized,
    nurseryName: input.nurseryName,
    representativeName: input.representativeName,
    managerName: input.managerName,
    managerPhone: input.managerPhone,
    managerEmail: input.managerEmail,
    businessAddress: input.businessAddress,
    roomCount: input.roomCount,
    defaultPassword: NURSERY_DEFAULT_PASSWORD,
    source: "manual_profile",
    status: "approved",
    createdAt: now,
    updatedAt: now,
  };
}

export function buildNurseryProfilesFromA2Mappings(): NurseryAutoSignupProfile[] {
  return nurseryExternalMappings.map((mapping) => {
    const normalized = normalizeBusinessNo(mapping.businessRegistrationNo);
    const now = new Date().toISOString();

    return {
      id: mapping.businessRegistrationNo,
      nurseryId: mapping.nurseryId || makeNurseryId(normalized),
      businessRegistrationNo: mapping.businessRegistrationNo,
      businessRegistrationNoNormalized: normalized,
      nurseryName: "A5 테스트 산후조리원",
      representativeName: "",
      managerName: "",
      managerPhone: "",
      managerEmail: "",
      businessAddress: mapping.registeredAddress,
      roomCount: String(mapping.roomCount),
      defaultPassword: NURSERY_DEFAULT_PASSWORD,
      externalNurseryId: mapping.externalNurseryId,
      source: "signage_partner",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function buildNurseryProfileFromCmsRecord(record: CmsRecord): NurseryAutoSignupProfile | null {
  const businessRegistrationNo = asString(record.business_registration_no ?? record.businessRegistrationNo);
  const normalized = asString(
    record.business_registration_no_normalized ?? record.businessRegistrationNoNormalized,
    normalizeBusinessNo(businessRegistrationNo),
  );

  if (!normalized) return null;

  const now = new Date().toISOString();

  return {
    id: asString(record.id, `nursery-auto-${normalized}`),
    nurseryId: asString(record.nursery_id ?? record.nurseryId, makeNurseryId(normalized)),
    businessRegistrationNo: businessRegistrationNo || normalized,
    businessRegistrationNoNormalized: normalized,
    nurseryName: asString(record.nursery_name ?? record.nurseryName ?? record.title, "산후조리원"),
    representativeName: asString(record.representative_name ?? record.representativeName),
    managerName: asString(record.manager_name ?? record.managerName),
    managerPhone: asString(record.manager_phone ?? record.managerPhone),
    managerEmail: asString(record.manager_email ?? record.managerEmail),
    businessAddress: asString(record.business_address ?? record.businessAddress),
    roomCount: asString(record.room_count ?? record.roomCount),
    defaultPassword: NURSERY_DEFAULT_PASSWORD,
    externalNurseryId: asString(record.external_nursery_id ?? record.externalNurseryId),
    source: asSource(record.signup_source ?? record.signupSource),
    status: asStatus(record.account_status ?? record.accountStatus ?? record.status),
    createdAt: asDateString(record.created_at ?? record.createdAt, now),
    updatedAt: asDateString(record.updated_at ?? record.updatedAt, now),
    termsAcceptedAt: asString(record.terms_accepted_at ?? record.termsAcceptedAt) || undefined,
    privacyAcceptedAt: asString(record.privacy_accepted_at ?? record.privacyAcceptedAt) || undefined,
    marketingConsentAt: asString(record.marketing_consent_at ?? record.marketingConsentAt) || undefined,
    firstLoginCompletedAt: asString(record.first_login_completed_at ?? record.firstLoginCompletedAt) || undefined,
  };
}

export function readNurseryAutoSignupProfiles(): NurseryAutoSignupProfile[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NURSERY_AUTO_SIGNUP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NurseryAutoSignupProfile[]) : [];
  } catch {
    return [];
  }
}

export function saveNurseryAutoSignupProfile(profile: NurseryAutoSignupProfile) {
  if (typeof window === "undefined") return;

  const current = readNurseryAutoSignupProfiles();
  window.localStorage.setItem(
    NURSERY_AUTO_SIGNUP_STORAGE_KEY,
    JSON.stringify([
      profile,
      ...current.filter(
        (item) => item.businessRegistrationNoNormalized !== profile.businessRegistrationNoNormalized,
      ),
    ]),
  );
}

export function findLocalNurseryProfile(businessRegistrationNo: string) {
  const normalized = normalizeBusinessNo(businessRegistrationNo);
  return (
    readNurseryAutoSignupProfiles().find(
      (profile) => profile.businessRegistrationNoNormalized === normalized,
    ) ?? null
  );
}

export function validateNurseryProfileInput(input: NurseryAutoSignupInput) {
  const required: Array<[keyof NurseryAutoSignupInput, string]> = [
    ["nurseryName", "산후조리원명"],
    ["businessRegistrationNo", "사업자등록번호"],
    ["representativeName", "대표자명"],
    ["managerName", "담당자명"],
    ["managerPhone", "담당자 연락처"],
    ["managerEmail", "담당자 이메일"],
    ["businessAddress", "사업장 주소"],
    ["roomCount", "객실 수"],
  ];

  return required
    .filter(([key]) => !String(input[key] ?? "").trim())
    .map(([, label]) => label);
}

export function buildNurseryAutoSignupCmsRecord(profile: NurseryAutoSignupProfile): CmsRecord {
  const accountStatus = profile.status === "suspended" ? "suspended" : "active";

  return {
    id: `nursery-auto-${profile.businessRegistrationNoNormalized}`,
    title: `${profile.nurseryName} 자동 가입`,
    status: profile.status === "suspended" ? "paused" : "approved",
    approval_status: "approved",
    account_status: accountStatus,
    source_app: "nursery",
    nursery_id: profile.nurseryId,
    business_registration_no: profile.businessRegistrationNo,
    business_registration_no_normalized: profile.businessRegistrationNoNormalized,
    nursery_name: profile.nurseryName,
    representative_name: profile.representativeName,
    manager_name: profile.managerName,
    manager_phone: profile.managerPhone,
    manager_email: profile.managerEmail,
    business_address: profile.businessAddress,
    room_count: profile.roomCount,
    default_password_policy: NURSERY_DEFAULT_PASSWORD,
    external_nursery_id: profile.externalNurseryId,
    source_project_id: profile.source === "signage_partner" ? "signage-partner" : "a5-manual",
    signup_source: profile.source,
    created_at: profile.createdAt,
    terms_accepted_at: profile.termsAcceptedAt,
    privacy_accepted_at: profile.privacyAcceptedAt,
    marketing_consent_at: profile.marketingConsentAt,
    first_login_completed_at: profile.firstLoginCompletedAt,
  };
}
