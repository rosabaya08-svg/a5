import { nurseryExternalMappings } from "@/data/nursery/a4Mapping";
import { normalizeBusinessNo } from "@/lib/auth/session";
import type { CmsRecord } from "@/lib/firebase/contentRepository";

export const NURSERY_AUTO_SIGNUP_STORAGE_KEY = "a5.nursery.auto-signup-profiles";
export const NURSERY_DEFAULT_PASSWORD = "1004";

export type NurseryAutoSignupSource = "signage_partner" | "manual_profile";

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
  status: "approved" | "pending_review";
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
    status: "pending_review",
    createdAt: now,
    updatedAt: now,
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
  return {
    id: `nursery-auto-${profile.businessRegistrationNoNormalized}`,
    title: `${profile.nurseryName} 자동 가입`,
    status: profile.status === "approved" ? "approved" : "pending_approval",
    approval_status: profile.status,
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
