import {
  buildNurseryProfilesFromA2Mappings,
  NURSERY_DEFAULT_PASSWORD,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";

type A2NurseryBulkSignupResponse = {
  ok: boolean;
  importedCount?: number;
  skippedCount?: number;
  profiles?: Array<Partial<NurseryAutoSignupProfile>>;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export type A2NurseryBulkSyncSuccess = {
  ok: true;
  source: "firebase_functions" | "local_a2_mapping";
  importedCount: number;
  skippedCount: number;
  profiles: NurseryAutoSignupProfile[];
  message: string;
};

export type A2NurseryBulkSyncResult =
  | A2NurseryBulkSyncSuccess
  | {
      ok: false;
      source: "firebase_functions";
      error: {
        code: string;
        message: string;
      };
    };

function getFunctionsBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? "https://asia-northeast3-a5-closed-mall.cloudfunctions.net"
  ).replace(/\/$/, "");
}

function getA2NurseryBulkSignupUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_NURSERY_BULK_SIGNUP_URL?.replace(/\/$/, "") ||
    `${getFunctionsBaseUrl()}/a4NurseryBulkSignup`
  );
}

function normalizeProfile(profile: Partial<NurseryAutoSignupProfile>): NurseryAutoSignupProfile | null {
  const normalized = String(profile.businessRegistrationNoNormalized ?? profile.businessRegistrationNo ?? "").replace(/\D/g, "");

  if (!normalized) return null;

  const now = new Date().toISOString();
  const businessRegistrationNo = String(profile.businessRegistrationNo ?? normalized);

  return {
    id: String(profile.id ?? businessRegistrationNo),
    nurseryId: String(profile.nurseryId ?? `nursery-${normalized}`),
    businessRegistrationNo,
    businessRegistrationNoNormalized: normalized,
    nurseryName: String(profile.nurseryName ?? "산후조리원"),
    representativeName: String(profile.representativeName ?? ""),
    managerName: String(profile.managerName ?? ""),
    managerPhone: String(profile.managerPhone ?? ""),
    managerEmail: String(profile.managerEmail ?? ""),
    businessAddress: String(profile.businessAddress ?? ""),
    roomCount: String(profile.roomCount ?? ""),
    defaultPassword: NURSERY_DEFAULT_PASSWORD,
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

export async function requestA2NurseryBulkSignup(): Promise<A2NurseryBulkSyncResult> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      source: "firebase_functions",
      error: { code: "BROWSER_REQUIRED", message: "브라우저에서만 조리원 일괄 연동을 실행할 수 있습니다." },
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(getA2NurseryBulkSignupUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Client": "super-admin",
        "X-A5-Nursery-Bulk-Sync": "enabled",
      },
      body: JSON.stringify({ source: "a2_signage_partner", password: NURSERY_DEFAULT_PASSWORD }),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    let data: A2NurseryBulkSignupResponse;

    try {
      data = rawBody ? (JSON.parse(rawBody) as A2NurseryBulkSignupResponse) : { ok: false };
    } catch {
      return {
        ok: false,
        source: "firebase_functions",
        error: {
          code: "A2_NURSERY_BULK_SYNC_NON_JSON_RESPONSE",
          message: `A2 연동 함수가 JSON이 아닌 응답을 반환했습니다. ${rawBody.slice(0, 160) || "응답 본문 없음"}`,
        },
      };
    }

    const profiles = (data.profiles ?? []).map(normalizeProfile).filter(Boolean) as NurseryAutoSignupProfile[];

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        source: "firebase_functions",
        error: {
          code: data.error?.code ?? "A2_NURSERY_BULK_SYNC_FAILED",
          message: data.error?.message ?? "A2 산후조리원 가입자 일괄 연동에 실패했습니다.",
        },
      };
    }

    return {
      ok: true,
      source: "firebase_functions",
      importedCount: data.importedCount ?? profiles.length,
      skippedCount: data.skippedCount ?? 0,
      profiles,
      message: data.message ?? "A2 산후조리원 가입자 자료를 A5로 연동했습니다.",
    };
  } catch (error) {
    return {
      ok: false,
      source: "firebase_functions",
      error: {
        code: "A2_NURSERY_BULK_SYNC_UNAVAILABLE",
        message: error instanceof Error ? error.message : "A2 산후조리원 가입자 일괄 연동 함수를 호출할 수 없습니다.",
      },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function buildLocalA2NurseryBulkSyncResult(reason: string): A2NurseryBulkSyncSuccess {
  const profiles = buildNurseryProfilesFromA2Mappings();

  return {
    ok: true,
    source: "local_a2_mapping",
    importedCount: profiles.length,
    skippedCount: 0,
    profiles,
    message: `${reason} 현재 A5에 포함된 A2 매핑 자료 ${profiles.length}건을 관리자 화면에 반영했습니다.`,
  };
}
