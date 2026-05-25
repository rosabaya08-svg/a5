import type { NurseryExternalMapping, NurseryRoomSelection } from "@/types/nursery";

export const nurseryExternalMappings: NurseryExternalMapping[] = [
  {
    nurseryId: "nursery-gangnam-01",
    externalNurseryId: "A4-NURSERY-GANGNAM-01",
    businessRegistrationNo: "123-45-67890",
    registeredAddress: "서울 강남구 테헤란로 701",
    roomCount: 24,
    a4SyncStatus: "planned",
  },
];

export const nurseryRoomSelections: NurseryRoomSelection[] = [
  {
    roomId: "room-701",
    roomNumber: "701",
    externalRoomId: "A4-ROOM-701",
    activeTabletId: "tablet-701-a",
    externalTabletId: "A4-TABLET-701-A",
    pickupEnabled: true,
  },
  {
    roomId: "room-702",
    roomNumber: "702",
    externalRoomId: "A4-ROOM-702",
    activeTabletId: "tablet-702-a",
    externalTabletId: "A4-TABLET-702-A",
    pickupEnabled: true,
  },
];
