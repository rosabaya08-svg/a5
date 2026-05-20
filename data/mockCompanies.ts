import type { Company } from "@/types/commerce";

export const mockCompanies: Company[] = [
  {
    id: "company-sanho-care",
    name: "산호케어",
    managerName: "김서윤",
    status: "approved",
    commissionRate: 12,
    productCount: 18,
    pendingProductCount: 2,
    settlementBlocked: false,
  },
  {
    id: "company-bebe-lux",
    name: "베베럭스",
    managerName: "박도현",
    status: "approved",
    commissionRate: 15,
    productCount: 11,
    pendingProductCount: 1,
    settlementBlocked: true,
  },
  {
    id: "company-momtable",
    name: "맘테이블",
    managerName: "이하린",
    status: "pending",
    commissionRate: 10,
    productCount: 4,
    pendingProductCount: 4,
    settlementBlocked: true,
  },
];
