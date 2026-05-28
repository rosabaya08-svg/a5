import { listA4RoomsReadOnly } from "@/lib/integrations/a4/readOnlyRooms";
import { normalizeBusinessNo } from "@/lib/auth/session";
import type { NurseryAutoSignupProfile } from "@/lib/nursery/nurseryAutoSignup";
import type { A4RoomSyncResponse } from "@/types/nursery";
import type { Room, Tablet } from "@/types/commerce";

export const NURSERY_ROOM_DEVICE_SYNC_STORAGE_KEY = "a5.nursery.room-device-sync";

export type SyncedNurseryRoom = Room & {
  externalNurseryId?: string;
  externalRoomId?: string;
  externalTabletId?: string;
  importSource: "A4_SYNC" | "A4_EXISTING" | "A4_LOCAL_FALLBACK";
  importedAt: string;
};

export type SyncedNurseryTablet = Tablet & {
  externalNurseryId?: string;
  externalRoomId?: string;
  externalTabletId?: string;
  importSource: "A4_SYNC" | "A4_LOCAL_FALLBACK";
  importedAt: string;
};

export type NurseryRoomDeviceSyncState = {
  rooms: SyncedNurseryRoom[];
  tablets: SyncedNurseryTablet[];
  updatedAt?: string;
};

function safeParseState(value: string | null): NurseryRoomDeviceSyncState {
  if (!value) return { rooms: [], tablets: [] };

  try {
    const parsed = JSON.parse(value) as Partial<NurseryRoomDeviceSyncState>;
    return {
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      tablets: Array.isArray(parsed.tablets) ? parsed.tablets : [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { rooms: [], tablets: [] };
  }
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const byId = new Map<string, T>();

  for (const item of items) {
    byId.set(item.id, { ...byId.get(item.id), ...item });
  }

  return [...byId.values()];
}

function roomName(roomNumber: string) {
  return roomNumber.endsWith("호") ? roomNumber : `${roomNumber}호`;
}

function fallbackRoomId(profile: NurseryAutoSignupProfile, index: number) {
  const normalized = profile.businessRegistrationNoNormalized || normalizeBusinessNo(profile.businessRegistrationNo);
  return `room-${normalized}-${String(index + 1).padStart(3, "0")}`;
}

function fallbackTabletId(roomId: string) {
  return `tablet-${roomId.replace(/^room-/, "")}-a`;
}

export function readLocalNurseryRoomDeviceSync(): NurseryRoomDeviceSyncState {
  if (typeof window === "undefined") return { rooms: [], tablets: [] };
  return safeParseState(window.localStorage.getItem(NURSERY_ROOM_DEVICE_SYNC_STORAGE_KEY));
}

export function saveLocalNurseryRoomDeviceSync(
  incoming: Partial<NurseryRoomDeviceSyncState>,
): NurseryRoomDeviceSyncState {
  if (typeof window === "undefined") return { rooms: [], tablets: [] };

  const current = readLocalNurseryRoomDeviceSync();
  const next: NurseryRoomDeviceSyncState = {
    rooms: uniqueById([...(current.rooms ?? []), ...(incoming.rooms ?? [])]),
    tablets: uniqueById([...(current.tablets ?? []), ...(incoming.tablets ?? [])]),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(NURSERY_ROOM_DEVICE_SYNC_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function countRoomDevicesForNursery(state: NurseryRoomDeviceSyncState, nurseryId: string) {
  return {
    rooms: state.rooms.filter((room) => room.nurseryId === nurseryId).length,
    tablets: state.tablets.filter((tablet) => tablet.nurseryId === nurseryId).length,
  };
}

export function buildRoomDeviceLinksFromA4Sync(
  result: Extract<A4RoomSyncResponse, { ok: true }>,
  importedAt = new Date().toISOString(),
): NurseryRoomDeviceSyncState {
  const importedRooms: SyncedNurseryRoom[] = result.imported.map((room) => ({
    id: room.targetRoomId,
    nurseryId: result.nurseryId,
    name: room.name,
    floor: "",
    pickupEnabled: room.pickupEnabled,
    activeTabletId: room.activeTabletId,
    externalNurseryId: result.externalNurseryId,
    externalRoomId: room.externalRoomId,
    externalTabletId: room.externalTabletId,
    importSource: "A4_SYNC",
    importedAt,
  }));
  const existingRooms: SyncedNurseryRoom[] = result.skipped
    .filter((room) => Boolean(room.existingRoomId))
    .map((room) => ({
      id: room.existingRoomId as string,
      nurseryId: result.nurseryId,
      name: room.roomNumber ? roomName(room.roomNumber) : (room.existingRoomId as string),
      floor: "",
      pickupEnabled: true,
      externalNurseryId: result.externalNurseryId,
      externalRoomId: room.externalRoomId,
      importSource: "A4_EXISTING",
      importedAt,
    }));
  const tablets: SyncedNurseryTablet[] = result.imported
    .filter((room) => Boolean(room.activeTabletId || room.externalTabletId))
    .map((room) => {
      const tabletId = room.activeTabletId || fallbackTabletId(room.targetRoomId);

      return {
        id: tabletId,
        nurseryId: result.nurseryId,
        roomId: room.targetRoomId,
        label: `${room.name} 태블릿`,
        status: "active",
        lastSeenAt: importedAt,
        externalNurseryId: result.externalNurseryId,
        externalRoomId: room.externalRoomId,
        externalTabletId: room.externalTabletId,
        importSource: "A4_SYNC",
        importedAt,
      };
    });

  return { rooms: [...importedRooms, ...existingRooms], tablets, updatedAt: importedAt };
}

export function buildFallbackRoomDeviceLinks(
  profile: NurseryAutoSignupProfile,
  importedAt = new Date().toISOString(),
): NurseryRoomDeviceSyncState {
  const a4Rooms = listA4RoomsReadOnly(profile.nurseryId);

  if (a4Rooms.length > 0) {
    const rooms: SyncedNurseryRoom[] = a4Rooms.map((room) => ({
      id: room.roomId,
      nurseryId: profile.nurseryId,
      name: roomName(room.roomNumber),
      floor: "",
      pickupEnabled: room.pickupEnabled,
      activeTabletId: room.activeTabletId,
      externalNurseryId: room.externalNurseryId,
      externalRoomId: room.externalRoomId,
      externalTabletId: room.externalTabletId,
      importSource: "A4_LOCAL_FALLBACK",
      importedAt,
    }));
    const tablets: SyncedNurseryTablet[] = a4Rooms
      .filter((room) => Boolean(room.activeTabletId || room.externalTabletId))
      .map((room) => {
        const tabletId = room.activeTabletId || fallbackTabletId(room.roomId);

        return {
          id: tabletId,
          nurseryId: profile.nurseryId,
          roomId: room.roomId,
          label: `${roomName(room.roomNumber)} 태블릿`,
          status: "active",
          lastSeenAt: importedAt,
          externalNurseryId: room.externalNurseryId,
          externalRoomId: room.externalRoomId,
          externalTabletId: room.externalTabletId,
          importSource: "A4_LOCAL_FALLBACK",
          importedAt,
        };
      });

    return { rooms, tablets, updatedAt: importedAt };
  }

  const roomCount = Math.max(Number(profile.roomCount) || 0, 0);
  const rooms: SyncedNurseryRoom[] = Array.from({ length: roomCount }).map((_, index) => {
    const id = fallbackRoomId(profile, index);
    const roomNumber = String(index + 1).padStart(3, "0");

    return {
      id,
      nurseryId: profile.nurseryId,
      name: roomName(roomNumber),
      floor: "",
      pickupEnabled: true,
      activeTabletId: fallbackTabletId(id),
      externalNurseryId: profile.externalNurseryId,
      importSource: "A4_LOCAL_FALLBACK",
      importedAt,
    };
  });
  const tablets: SyncedNurseryTablet[] = rooms.map((room) => ({
    id: room.activeTabletId ?? fallbackTabletId(room.id),
    nurseryId: profile.nurseryId,
    roomId: room.id,
    label: `${room.name} 태블릿`,
    status: "active",
    lastSeenAt: importedAt,
    externalNurseryId: profile.externalNurseryId,
    importSource: "A4_LOCAL_FALLBACK",
    importedAt,
  }));

  return { rooms, tablets, updatedAt: importedAt };
}
