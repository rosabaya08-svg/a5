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
