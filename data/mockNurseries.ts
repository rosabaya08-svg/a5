import type { Nursery } from "@/types/commerce";

export const mockNurseries: Nursery[] = [
  {
    id: "nursery-gangnam-01",
    name: "라온 산후조리원 강남",
    region: "서울 강남",
    managerName: "정민아",
    roomCount: 28,
    tabletCount: 28,
    status: "approved",
  },
  {
    id: "nursery-bundang-01",
    name: "오브제 산후조리원 분당",
    region: "경기 성남",
    managerName: "최유정",
    roomCount: 18,
    tabletCount: 17,
    status: "approved",
  },
  {
    id: "nursery-songdo-01",
    name: "베이비문 산후조리원 송도",
    region: "인천 송도",
    managerName: "한지우",
    roomCount: 22,
    tabletCount: 20,
    status: "pending",
  },
];
