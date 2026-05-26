import { getFirebaseAuthClient } from "@/lib/firebase/client";
import type { A4RoomSyncResponse } from "@/types/nursery";

export type SyncA4RoomsInput = {
  nurseryId: string;
  businessRegistrationNo?: string;
  externalNurseryId?: string;
  selectedExternalRoomIds?: string[];
};

const roomSyncTimeoutMs = 15000;

function getFunctionsBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? "https://asia-northeast3-a5-closed-mall.cloudfunctions.net"
  ).replace(/\/$/, "");
}

function getRoomSyncUrl() {
  return (process.env.NEXT_PUBLIC_A5_ROOM_SYNC_URL ?? "").replace(/\/$/, "") || `${getFunctionsBaseUrl()}/a4RoomsSync`;
}

async function getFirebaseIdToken() {
  try {
    return (await getFirebaseAuthClient()?.currentUser?.getIdToken()) ?? "";
  } catch {
    return "";
  }
}

export async function syncA4RoomsToA5(input: SyncA4RoomsInput): Promise<A4RoomSyncResponse> {
  const url = getRoomSyncUrl();

  if (!url || url === "/a4RoomsSync") {
    return {
      ok: false,
      error: {
        code: "A4_ROOM_SYNC_URL_MISSING",
        message: "A5 room sync function URL is not configured.",
        httpStatus: 0,
      },
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), roomSyncTimeoutMs);
  const token = await getFirebaseIdToken();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-A5-Client": "nursery-admin",
        "X-A5-Beta-Room-Sync": "enabled",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const data = (await response.json()) as A4RoomSyncResponse;

    if (!response.ok && data.ok !== false) {
      return {
        ok: false,
        error: {
          code: "A4_ROOM_SYNC_HTTP_ERROR",
          message: `HTTP ${response.status}`,
          httpStatus: response.status,
        },
      };
    }

    return data;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "A4_ROOM_SYNC_REQUEST_FAILED",
        message: error instanceof Error ? error.message : "Room sync request failed.",
        httpStatus: 0,
      },
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
