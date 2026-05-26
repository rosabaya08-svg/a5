export type NurseryExternalMapping = {
  nurseryId: string;
  externalNurseryId: string;
  businessRegistrationNo: string;
  registeredAddress: string;
  roomCount: number;
  a4SyncStatus: "planned" | "blocked" | "ready_for_mapping";
};

export type NurseryRoomSelection = {
  roomId: string;
  roomNumber: string;
  externalRoomId: string;
  activeTabletId?: string;
  externalTabletId?: string;
  pickupEnabled: boolean;
};

export type A4ReadOnlyRoom = NurseryRoomSelection & {
  nurseryId: string;
  externalNurseryId: string;
  sourceProjectId: "signage-partner";
};

export type A4RoomImportStatus = "new" | "already_imported" | "room_number_conflict" | "excluded";

export type A4RoomImportPreviewRow = {
  externalRoomId: string;
  roomNumber: string;
  targetRoomId: string;
  roomName: string;
  floor: string;
  pickupEnabled: boolean;
  activeTabletId?: string;
  externalTabletId?: string;
  externalNurseryId: string;
  status: A4RoomImportStatus;
  reason: string;
};

export type ImportedNurseryRoom = {
  id: string;
  nurseryId: string;
  roomNumber: string;
  name: string;
  floor: string;
  pickupEnabled: boolean;
  activeTabletId?: string;
  externalNurseryId?: string;
  externalRoomId?: string;
  externalTabletId?: string;
  importSource: "A4_READ_ONLY" | "A5_LOCAL";
  importedAt: string;
  localUpdatedAt: string;
  localOnly: boolean;
};

export type A4RoomSyncImportedRoom = {
  externalRoomId: string;
  targetRoomId: string;
  roomNumber: string;
  name: string;
  floor: string;
  pickupEnabled: boolean;
  activeTabletId?: string;
  externalTabletId?: string;
};

export type A4RoomSyncSkippedRoom = {
  externalRoomId: string;
  roomNumber?: string;
  reason: string;
  existingRoomId?: string;
};

export type A4RoomSyncSuccessResponse = {
  ok: true;
  mode: "firestore";
  sourceProjectId: string;
  sourcePath: string;
  sourceNurseryPath?: string;
  sourceNurseryField?: string;
  sourceBusinessField?: string;
  sourceReadCount: number;
  importedCount: number;
  skippedCount: number;
  nurseryId: string;
  externalNurseryId: string;
  businessRegistrationNo?: string;
  imported: A4RoomSyncImportedRoom[];
  skipped: A4RoomSyncSkippedRoom[];
  actor: string;
  message: string;
};

export type A4RoomSyncErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    httpStatus: number;
    details?: unknown;
  };
};

export type A4RoomSyncResponse = A4RoomSyncSuccessResponse | A4RoomSyncErrorResponse;
