import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { normalizeBusinessNo } from "@/lib/auth/session";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { NURSERY_DEFAULT_PASSWORD, type NurseryAutoSignupProfile } from "@/lib/nursery/nurseryAutoSignup";
import type { TabletNurseryRoomOption } from "@/lib/firebase/nurseryAutoSignupClient";

type TabletDeviceResolveResponse = {
  ok: boolean;
  profile?: Partial<NurseryAutoSignupProfile>;
  room?: Partial<TabletNurseryRoomOption>;
  rooms?: Partial<TabletNurseryRoomOption>[];
  customToken?: string;
  error?: {
    code?: string;
    message?: string;
    httpStatus?: number;
  };
};

export type TabletDeviceResolveResult = {
  profile: NurseryAutoSignupProfile | null;
  room: TabletNurseryRoomOption | null;
  rooms: TabletNurseryRoomOption[];
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

function getTabletDeviceResolveUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_TABLET_DEVICE_RESOLVE_URL?.replace(/\/$/, "") ||
    `${getFunctionsBaseUrl()}/tabletDeviceResolve`
  );
}

function normalizeProfile(profile: TabletDeviceResolveResponse["profile"]): NurseryAutoSignupProfile | null {
  const nurseryId = String(profile?.nurseryId ?? "").trim();
  const businessRegistrationNo = String(profile?.businessRegistrationNo ?? "").trim();
  const normalized = normalizeBusinessNo(String(profile?.businessRegistrationNoNormalized ?? businessRegistrationNo));

  if (!profile || !nurseryId || !normalized) return null;

  const now = new Date().toISOString();

  return {
    id: String(profile.id ?? nurseryId),
    nurseryId,
    businessRegistrationNo,
    businessRegistrationNoNormalized: normalized,
    nurseryName: String(profile.nurseryName ?? nurseryId),
    representativeName: String(profile.representativeName ?? ""),
    managerName: String(profile.managerName ?? ""),
    managerPhone: String(profile.managerPhone ?? ""),
    managerEmail: String(profile.managerEmail ?? ""),
    businessAddress: String(profile.businessAddress ?? ""),
    roomCount: String(profile.roomCount ?? ""),
    defaultPassword: String(profile.defaultPassword ?? NURSERY_DEFAULT_PASSWORD),
    externalNurseryId: profile.externalNurseryId ? String(profile.externalNurseryId) : undefined,
    source: "signage_partner",
    status: profile.status === "suspended" ? "suspended" : "approved",
    createdAt: String(profile.createdAt ?? now),
    updatedAt: String(profile.updatedAt ?? now),
    termsAcceptedAt: profile.termsAcceptedAt,
    privacyAcceptedAt: profile.privacyAcceptedAt,
    marketingConsentAt: profile.marketingConsentAt,
    firstLoginCompletedAt: profile.firstLoginCompletedAt,
  };
}

function normalizeRoom(room: TabletDeviceResolveResponse["room"]): TabletNurseryRoomOption | null {
  const roomId = String(room?.roomId ?? "").trim();
  const roomNumber = String(room?.roomNumber ?? room?.roomName ?? "").trim();

  if (!room || !roomId || !roomNumber) return null;

  return {
    roomId,
    roomNumber,
    roomName: String(room.roomName ?? roomNumber).trim() || roomNumber,
    floor: String(room.floor ?? "").trim(),
    pickupEnabled: room.pickupEnabled !== false,
    activeTabletId: String(room.activeTabletId ?? "").trim(),
  };
}

async function signInTabletFirebaseAuth(customToken?: string) {
  const token = customToken?.trim();
  if (!token) return;

  const auth = getFirebaseAuthClient();
  if (!auth) {
    throw new Error("TABLET_FIREBASE_AUTH_NOT_CONFIGURED");
  }

  await setPersistence(auth, browserLocalPersistence);
  await signInWithCustomToken(auth, token);
}

export async function resolveTabletDeviceAccessByDeviceId(deviceId: string): Promise<TabletDeviceResolveResult> {
  if (typeof window === "undefined") {
    return {
      profile: null,
      room: null,
      rooms: [],
      error: {
        code: "CLIENT_RUNTIME_REQUIRED",
        message: "Tablet device resolve must run in the browser.",
      },
    };
  }

  const cleanDeviceId = deviceId.trim();
  if (!cleanDeviceId) {
    return {
      profile: null,
      room: null,
      rooms: [],
      error: {
        code: "TABLET_DEVICE_ID_MISSING",
        message: "deviceId is required.",
      },
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(getTabletDeviceResolveUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Client": "tablet-closed-mall",
      },
      body: JSON.stringify({ deviceId: cleanDeviceId }),
      signal: controller.signal,
    });
    const data = (await response.json()) as TabletDeviceResolveResponse;

    if (!response.ok || !data.ok) {
      return {
        profile: null,
        room: null,
        rooms: [],
        error: {
          code: data.error?.code ?? `HTTP_${response.status}`,
          message: data.error?.message ?? "Tablet device resolve failed.",
        },
      };
    }

    const profile = normalizeProfile(data.profile);
    const room = normalizeRoom(data.room);
    const rooms = (data.rooms ?? []).map(normalizeRoom).filter((item): item is TabletNurseryRoomOption => Boolean(item));
    const normalizedRooms = rooms.length > 0 ? rooms : room ? [room] : [];

    if (!profile || !room) {
      return {
        profile: null,
        room: null,
        rooms: normalizedRooms,
        error: {
          code: "TABLET_DEVICE_RESOLVE_INVALID",
          message: "Tablet device resolve returned an incomplete session.",
        },
      };
    }

    await signInTabletFirebaseAuth(data.customToken);
    return { profile, room, rooms: normalizedRooms };
  } catch {
    return {
      profile: null,
      room: null,
      rooms: [],
      error: {
        code: "TABLET_DEVICE_RESOLVE_NETWORK_ERROR",
        message: "Tablet device resolve request failed.",
      },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
