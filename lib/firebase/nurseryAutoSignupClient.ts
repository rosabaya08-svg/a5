import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { normalizeBusinessNo } from "@/lib/auth/session";
import { ensureAnonymousFirebaseUser, getFirebaseDb } from "@/lib/firebase/client";
import {
  buildNurseryProfileFromCmsRecord,
  NURSERY_DEFAULT_PASSWORD,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";

type NurseryLoginFunctionResponse = {
  ok: boolean;
  profile?: Partial<NurseryAutoSignupProfile> & { sourceCollection?: string };
  error?: {
    code?: string;
    message?: string;
    httpStatus?: number;
  };
};

export type NurseryProfileLookupResult = {
  profile: NurseryAutoSignupProfile | null;
  error?: {
    code: string;
    message: string;
  };
};

function getFunctionsBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? "https://asia-northeast3-a5-closed-mall.cloudfunctions.net"
  ).replace(/\/$/, "");
}

function getTabletNurseryLoginUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_TABLET_NURSERY_LOGIN_URL?.replace(/\/$/, "") ||
    `${getFunctionsBaseUrl()}/tabletNurseryLogin`
  );
}

function normalizeFunctionProfile(
  profile: NurseryLoginFunctionResponse["profile"],
  businessRegistrationNo: string,
): NurseryAutoSignupProfile | null {
  const normalized = normalizeBusinessNo(String(profile?.businessRegistrationNo ?? businessRegistrationNo));
  const nurseryId = String(profile?.nurseryId ?? "").trim();

  if (!profile || !normalized || !nurseryId) return null;

  const now = new Date().toISOString();

  return {
    id: String(profile.id ?? profile.businessRegistrationNo ?? businessRegistrationNo),
    nurseryId,
    businessRegistrationNo: String(profile.businessRegistrationNo ?? businessRegistrationNo),
    businessRegistrationNoNormalized: String(profile.businessRegistrationNoNormalized ?? normalized),
    nurseryName: String(profile.nurseryName ?? "산후조리원"),
    representativeName: String(profile.representativeName ?? ""),
    managerName: String(profile.managerName ?? ""),
    managerPhone: String(profile.managerPhone ?? ""),
    managerEmail: String(profile.managerEmail ?? ""),
    businessAddress: String(profile.businessAddress ?? ""),
    roomCount: String(profile.roomCount ?? ""),
    defaultPassword: String(profile.defaultPassword ?? NURSERY_DEFAULT_PASSWORD),
    externalNurseryId: profile.externalNurseryId ? String(profile.externalNurseryId) : undefined,
    source: profile.source === "manual_profile" ? "manual_profile" : "signage_partner",
    status: profile.status === "suspended" ? "suspended" : "approved",
    createdAt: String(profile.createdAt ?? now),
    updatedAt: String(profile.updatedAt ?? now),
    termsAcceptedAt: profile.termsAcceptedAt,
    privacyAcceptedAt: profile.privacyAcceptedAt,
    marketingConsentAt: profile.marketingConsentAt,
    firstLoginCompletedAt: profile.firstLoginCompletedAt,
  };
}

async function requestTabletNurseryLoginProfile(
  businessRegistrationNo: string,
  password: string,
): Promise<NurseryProfileLookupResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(getTabletNurseryLoginUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Client": "tablet-closed-mall",
      },
      body: JSON.stringify({ businessRegistrationNo, password }),
      signal: controller.signal,
    });
    const data = (await response.json()) as NurseryLoginFunctionResponse;

    if (!response.ok || !data.ok) {
      return {
        profile: null,
        error: {
          code: data.error?.code ?? `HTTP_${response.status}`,
          message: data.error?.message ?? "Firebase server nursery lookup failed.",
        },
      };
    }

    const profile = normalizeFunctionProfile(data.profile, businessRegistrationNo);
    return profile
      ? { profile }
      : {
          profile: null,
          error: {
            code: "TABLET_NURSERY_LOGIN_PROFILE_INVALID",
            message: "Firebase server returned an invalid nursery profile.",
          },
        };
  } catch {
    return {
      profile: null,
      error: {
        code: "TABLET_NURSERY_LOGIN_NETWORK_ERROR",
        message: "Firebase server nursery lookup request failed.",
      },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readFirstLinkedNurseryProfile(collectionName: "nursery_auto_signup_profiles", field: string, value: string) {
  const db = getFirebaseDb();
  if (!db || !value) return null;

  const snapshot = await getDocs(query(collection(db, collectionName), where(field, "==", value), limit(1)));
  const document = snapshot.docs[0];
  return document ? buildNurseryProfileFromCmsRecord({ id: document.id, ...document.data() }) : null;
}

export async function readLinkedNurseryProfileByBusinessNo(
  businessRegistrationNo: string,
  password = NURSERY_DEFAULT_PASSWORD,
): Promise<NurseryAutoSignupProfile | null> {
  const result = await lookupLinkedNurseryProfileByBusinessNo(businessRegistrationNo, password);
  return result.profile;
}

export async function lookupLinkedNurseryProfileByBusinessNo(
  businessRegistrationNo: string,
  password = NURSERY_DEFAULT_PASSWORD,
): Promise<NurseryProfileLookupResult> {
  if (typeof window === "undefined") {
    return {
      profile: null,
      error: {
        code: "CLIENT_RUNTIME_REQUIRED",
        message: "Nursery profile lookup must run in the browser.",
      },
    };
  }

  const normalized = normalizeBusinessNo(businessRegistrationNo);
  if (!normalized) {
    return {
      profile: null,
      error: {
        code: "BUSINESS_NO_MISSING",
        message: "Business registration number is required.",
      },
    };
  }

  let serverError: NurseryProfileLookupResult["error"];

  try {
    const serverResult = await requestTabletNurseryLoginProfile(businessRegistrationNo, password);
    if (serverResult.profile) return serverResult;
    serverError = serverResult.error;

    await ensureAnonymousFirebaseUser();
    const profile =
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "business_registration_no_normalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "businessRegistrationNoNormalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "business_registration_no", businessRegistrationNo.trim())) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "businessRegistrationNo", businessRegistrationNo.trim()));

    return profile
      ? { profile }
      : {
          profile: null,
          error: serverError ?? {
            code: "NURSERY_PROFILE_NOT_FOUND",
            message: "No nursery profile matched the business registration number.",
          },
        };
  } catch {
    return {
      profile: null,
      error: serverError ?? {
        code: "NURSERY_PROFILE_LOOKUP_FAILED",
        message: "Nursery profile lookup failed.",
      },
    };
  }
}
