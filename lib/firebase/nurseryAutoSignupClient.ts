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
  rooms?: TabletNurseryRoomOption[];
  error?: {
    code?: string;
    message?: string;
    httpStatus?: number;
  };
};

export type TabletNurseryRoomOption = {
  roomId: string;
  roomNumber: string;
  roomName: string;
  floor: string;
  pickupEnabled: boolean;
  activeTabletId: string;
};

export type NurseryProfileLookupResult = {
  profile: NurseryAutoSignupProfile | null;
  rooms?: TabletNurseryRoomOption[];
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

function normalizeFunctionRooms(rooms: NurseryLoginFunctionResponse["rooms"]): TabletNurseryRoomOption[] {
  return (rooms ?? [])
    .map((room): TabletNurseryRoomOption | null => {
      const roomId = String(room.roomId ?? "").trim();
      const roomNumber = displayRoomNumber(String(room.roomNumber ?? room.roomName ?? "").trim());
      if (!roomId || !roomNumber) return null;

      return {
        roomId,
        roomNumber,
        roomName: displayRoomNumber(String(room.roomName ?? room.roomNumber ?? "").trim()) || roomNumber,
        floor: String(room.floor ?? "").trim(),
        pickupEnabled: room.pickupEnabled !== false,
        activeTabletId: String(room.activeTabletId ?? "").trim(),
      };
    })
    .filter((room): room is TabletNurseryRoomOption => Boolean(room?.roomId && (room.roomName || room.roomNumber)));
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function roomSortKey(value: string) {
  const normalized = value.replace(/\s+/g, "");
  const numeric = normalized.match(/\d+/)?.[0] ?? "";
  return {
    numeric: numeric ? Number(numeric) : Number.MAX_SAFE_INTEGER,
    text: normalized,
  };
}

function sortRooms(left: TabletNurseryRoomOption, right: TabletNurseryRoomOption) {
  const leftKey = roomSortKey(left.roomNumber || left.roomName || left.roomId);
  const rightKey = roomSortKey(right.roomNumber || right.roomName || right.roomId);

  if (leftKey.numeric !== rightKey.numeric) return leftKey.numeric - rightKey.numeric;
  return leftKey.text.localeCompare(rightKey.text, "ko");
}

function displayRoomNumber(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/\d/.test(text) && text.endsWith("호")) return text;

  return text.match(/\d+/g)?.join("") ?? "";
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
      ? { profile, rooms: normalizeFunctionRooms(data.rooms) }
      : {
          profile: null,
          rooms: normalizeFunctionRooms(data.rooms),
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

async function readLinkedRoomsByNursery(nurseryId: string): Promise<TabletNurseryRoomOption[]> {
  const db = getFirebaseDb();
  if (!db || !nurseryId) return [];

  const snapshot = await getDocs(query(collection(db, "rooms"), where("nursery_id", "==", nurseryId)));

  return snapshot.docs
    .map((document): TabletNurseryRoomOption | null => {
      const data = document.data();
      const roomId = asString(data.room_id ?? data.roomId, document.id);
      const roomNumber = displayRoomNumber(asString(data.room_number ?? data.roomNumber ?? data.name, roomId));
      if (!roomNumber) return null;

      return {
        roomId,
        roomNumber,
        roomName: displayRoomNumber(asString(data.name ?? data.room_name ?? data.roomName, roomNumber)) || roomNumber,
        floor: asString(data.floor),
        pickupEnabled: data.pickup_enabled !== false && data.pickupEnabled !== false,
        activeTabletId: asString(data.active_tablet_id ?? data.activeTabletId),
      };
    })
    .filter((room): room is TabletNurseryRoomOption => Boolean(room?.roomId && (room.roomName || room.roomNumber)))
    .sort(sortRooms);
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
    if (serverResult.profile) {
      return serverResult.rooms && serverResult.rooms.length > 0
        ? serverResult
        : { ...serverResult, rooms: await readLinkedRoomsByNursery(serverResult.profile.nurseryId) };
    }
    serverError = serverResult.error;

    await ensureAnonymousFirebaseUser();
    const profile =
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "business_registration_no_normalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "businessRegistrationNoNormalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "business_registration_no", businessRegistrationNo.trim())) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "businessRegistrationNo", businessRegistrationNo.trim()));

    return profile
      ? { profile, rooms: await readLinkedRoomsByNursery(profile.nurseryId) }
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
