import type { Tablet } from "@/types/commerce";

export const mockTablets: Tablet[] = [
  {
    id: "tablet-701-a",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-701",
    label: "강남 701 메인",
    status: "active",
    lastSeenAt: "2026-05-19T16:42:00+09:00",
  },
  {
    id: "tablet-702-a",
    nurseryId: "nursery-gangnam-01",
    roomId: "room-702",
    label: "강남 702 메인",
    status: "active",
    lastSeenAt: "2026-05-19T16:37:00+09:00",
  },
  {
    id: "tablet-501-a",
    nurseryId: "nursery-bundang-01",
    roomId: "room-501",
    label: "분당 501 메인",
    status: "maintenance",
    lastSeenAt: "2026-05-19T09:12:00+09:00",
  },
];
