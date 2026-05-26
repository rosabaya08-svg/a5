import type { NurseryExternalMapping, NurseryRoomSelection } from "@/types/nursery";

export const nurseryExternalMappings: NurseryExternalMapping[] = [
  {
    nurseryId: "nursery-test-1004",
    externalNurseryId: "signage-partner-1004",
    businessRegistrationNo: "1004-1004-1004",
    registeredAddress: "서울시 강남구 테스트로 1004",
    roomCount: 2,
    a4SyncStatus: "planned",
  },
];

export const nurseryRoomSelections: NurseryRoomSelection[] = [
  {
    roomId: "room-701",
    roomNumber: "701",
    externalRoomId: "signage-room-701",
    activeTabletId: "tablet-701-a",
    externalTabletId: "signage-tablet-701-a",
    pickupEnabled: true,
  },
  {
    roomId: "room-702",
    roomNumber: "702",
    externalRoomId: "signage-room-702",
    activeTabletId: "tablet-702-a",
    externalTabletId: "signage-tablet-702-a",
    pickupEnabled: true,
  },
];
