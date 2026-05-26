import type { Room } from "@/types/commerce";
import type { A4ReadOnlyRoom, A4RoomImportPreviewRow, ImportedNurseryRoom } from "@/types/nursery";

function normalizeRoomNumber(value: string) {
  return value.replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function inferFloor(roomNumber: string) {
  const digits = roomNumber.replace(/[^0-9]/g, "");
  return digits.length >= 3 ? `${digits.slice(0, -2)}F` : "";
}

function roomName(roomNumber: string) {
  return roomNumber.endsWith("호") ? roomNumber : `${roomNumber}호`;
}

function existingRoomNumber(room: Room) {
  return normalizeRoomNumber(room.name || room.id);
}

function importedRoomNumber(room: ImportedNurseryRoom) {
  return normalizeRoomNumber(room.roomNumber || room.name || room.id);
}

export function buildA4RoomImportPreview(
  a4Rooms: A4ReadOnlyRoom[],
  a5Rooms: Room[],
  importedRooms: ImportedNurseryRoom[] = [],
): A4RoomImportPreviewRow[] {
  return a4Rooms.map((room) => {
    const roomNumberKey = normalizeRoomNumber(room.roomNumber);
    const alreadyImported =
      a5Rooms.some((item) => item.id === room.roomId) ||
      importedRooms.some((item) => item.externalRoomId === room.externalRoomId || item.id === room.roomId);
    const numberConflict =
      !alreadyImported &&
      (a5Rooms.some((item) => existingRoomNumber(item) === roomNumberKey) ||
        importedRooms.some((item) => importedRoomNumber(item) === roomNumberKey));

    return {
      externalRoomId: room.externalRoomId,
      roomNumber: room.roomNumber,
      targetRoomId: room.roomId,
      roomName: roomName(room.roomNumber),
      floor: inferFloor(room.roomNumber),
      pickupEnabled: room.pickupEnabled,
      activeTabletId: room.activeTabletId,
      externalTabletId: room.externalTabletId,
      externalNurseryId: room.externalNurseryId,
      status: alreadyImported ? "already_imported" : numberConflict ? "room_number_conflict" : "new",
      reason: alreadyImported
        ? "A5 운영본에 같은 객실 ID 또는 외부 객실 ID가 있습니다."
        : numberConflict
          ? "A5 운영본에 같은 객실명이 있어 자동 가져오기를 보류합니다."
          : "A5 운영본으로 가져올 수 있습니다.",
    };
  });
}

export function createImportedNurseryRooms(
  previewRows: A4RoomImportPreviewRow[],
  selectedExternalRoomIds: string[],
  nurseryId: string,
  importedAt: string,
): ImportedNurseryRoom[] {
  const selected = new Set(selectedExternalRoomIds);

  return previewRows
    .filter((row) => row.status === "new" && selected.has(row.externalRoomId))
    .map((row) => ({
      id: row.targetRoomId,
      nurseryId,
      roomNumber: row.roomNumber,
      name: row.roomName,
      floor: row.floor,
      pickupEnabled: row.pickupEnabled,
      activeTabletId: row.activeTabletId,
      externalNurseryId: row.externalNurseryId,
      externalRoomId: row.externalRoomId,
      externalTabletId: row.externalTabletId,
      importSource: "A4_READ_ONLY",
      importedAt,
      localUpdatedAt: importedAt,
      localOnly: true,
    }));
}

export function mergeImportedNurseryRooms(current: ImportedNurseryRoom[], incoming: ImportedNurseryRoom[]) {
  const currentKeys = new Set(current.flatMap((room) => [room.id, room.externalRoomId].filter(Boolean) as string[]));
  return [
    ...current,
    ...incoming.filter((room) => !currentKeys.has(room.id) && (!room.externalRoomId || !currentKeys.has(room.externalRoomId))),
  ];
}
