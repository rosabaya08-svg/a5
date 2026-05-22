import type { Tablet } from "@/types/commerce";

export const mockTablets: Tablet[] = [
  {
    id: "tablet-701-a",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-701",
    label: "Gangnam 701 main",
    status: "active",
    lastSeenAt: "2026-05-19T16:42:00+09:00",
  },
  {
    id: "tablet-702-a",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-702",
    label: "Gangnam 702 main",
    status: "active",
    lastSeenAt: "2026-05-19T16:37:00+09:00",
  },
  {
    id: "tablet-501-a",
    nurseryId: "nursery-bundang-01",
    roomId: "room-501",
    label: "Bundang 501 main",
    status: "maintenance",
    lastSeenAt: "2026-05-19T09:12:00+09:00",
  },
];
