import type { Room } from "@/types/commerce";

export const mockRooms: Room[] = [
  {
    id: "room-701",
    nurseryId: "nursery-gangnam-01",
    name: "Room 701",
    floor: "7F",
    pickupEnabled: true,
    activeTabletId: "tablet-701-a",
  },
  {
    id: "room-702",
    nurseryId: "nursery-gangnam-01",
    name: "Room 702",
    floor: "7F",
    pickupEnabled: true,
    activeTabletId: "tablet-702-a",
  },
  {
    id: "room-501",
    nurseryId: "nursery-bundang-01",
    name: "Room 501",
    floor: "5F",
    pickupEnabled: false,
    activeTabletId: "tablet-501-a",
  },
  {
    id: "room-601",
    nurseryId: "nursery-songdo-01",
    name: "Room 601",
    floor: "6F",
    pickupEnabled: true,
  },
];
