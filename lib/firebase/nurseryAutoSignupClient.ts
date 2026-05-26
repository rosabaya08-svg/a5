import { normalizeBusinessNo } from "@/lib/auth/session";
import {
  NURSERY_DEFAULT_PASSWORD,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";

type NurseryAutoSignupFunctionResponse = {
  ok: boolean;
  profile?: {
    nurseryId?: string;
    businessRegistrationNo?: string;
    businessRegistrationNoNormalized?: string;
    nurseryName?: string;
    representativeName?: string;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    businessAddress?: string;
    roomCount?: string | number;
    externalNurseryId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
};

function getFunctionsBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? "https://asia-northeast3-a5-closed-mall.cloudfunctions.net"
  ).replace(/\/$/, "");
}

function getNurseryAutoSignupUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_NURSERY_AUTO_SIGNUP_URL?.replace(/\/$/, "") ||
    `${getFunctionsBaseUrl()}/a4NurseryAutoSignup`
  );
}

export async function requestSignagePartnerNurseryAutoSignup(
  businessRegistrationNo: string,
): Promise<NurseryAutoSignupProfile | null> {
  if (typeof window === "undefined") return null;

  const normalized = normalizeBusinessNo(businessRegistrationNo);
  if (!normalized) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(getNurseryAutoSignupUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Client": "nursery-admin",
        "X-A5-Nursery-Auto-Signup": "enabled",
      },
      body: JSON.stringify({
        businessRegistrationNo,
        password: NURSERY_DEFAULT_PASSWORD,
      }),
      signal: controller.signal,
    });
    const data = (await response.json()) as NurseryAutoSignupFunctionResponse;
    const profile = data.profile;

    if (!response.ok || !data.ok || !profile?.nurseryId) {
      return null;
    }

    const now = new Date().toISOString();
    const profileBusinessNo = profile.businessRegistrationNo || businessRegistrationNo;

    return {
      id: profileBusinessNo,
      nurseryId: profile.nurseryId,
      businessRegistrationNo: profileBusinessNo,
      businessRegistrationNoNormalized:
        profile.businessRegistrationNoNormalized || normalizeBusinessNo(profileBusinessNo),
      nurseryName: profile.nurseryName || "산후조리원",
      representativeName: profile.representativeName || "",
      managerName: profile.managerName || "",
      managerPhone: profile.managerPhone || "",
      managerEmail: profile.managerEmail || "",
      businessAddress: profile.businessAddress || "",
      roomCount: String(profile.roomCount ?? ""),
      defaultPassword: NURSERY_DEFAULT_PASSWORD,
      externalNurseryId: profile.externalNurseryId,
      source: "signage_partner",
      status: "approved",
      createdAt: profile.createdAt || now,
      updatedAt: profile.updatedAt || now,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
