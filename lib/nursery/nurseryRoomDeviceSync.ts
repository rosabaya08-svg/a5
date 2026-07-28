import type { A4RoomSyncResponse } from "@/types/nursery";
import type { Room, Tablet } from "@/types/commerce";

export const NURSERY_ROOM_DEVICE_SYNC_STORAGE_KEY = "a5.nursery.room-device-sync";

export type SyncedNurseryRoom = Room & {
  externalNurseryId?: string;
  externalRoomId?: string;
  externalTabletId?: string;
  importSource: "A4_SYNC" | "A4_EXISTING";
  importedAt: string;
};

export type SyncedNurseryTablet = Tablet & {
  externalNurseryId?: string;
  externalRoomId?: string;
  externalTabletId?: string;
  importSource: "A4_SYNC";
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
      rooms: Array.isArray(parsed.rooms)
        ? parsed.rooms.filter((room) => (room as { importSource?: string }).importSource !== "A4_LOCAL_FALLBACK")
        : [],
      tablets: Array.isArray(parsed.tablets)
        ? parsed.tablets.filter((tablet) => (tablet as { importSource?: string }).importSource !== "A4_LOCAL_FALLBACK")
        : [],
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
