import type { Nursery } from "@/types/commerce";

export const mockNurseries: Nursery[] = [
  {
    id: "nursery-gangnam-01",
    name: "Gangnam Sanho Center",
    region: "Seoul Gangnam",
    managerName: "Jung Bora",
    roomCount: 28,
    tabletCount: 28,
    status: "approved",
  },
  {
    id: "nursery-bundang-01",
    name: "Bundang Love Center",
    region: "Gyeonggi Seongnam",
    managerName: "Choi Yuna",
    roomCount: 18,
    tabletCount: 17,
    status: "approved",
  },
  {
    id: "nursery-songdo-01",
    name: "Songdo Baby Moon",
    region: "Incheon Songdo",
    managerName: "Seo Jimin",
    roomCount: 22,
    tabletCount: 20,
    status: "pending",
  },
];
