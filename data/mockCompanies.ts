import type { Company } from "@/types/commerce";

export const mockCompanies: Company[] = [
  {
    id: "company-sanho-care",
    name: "Sanho Care",
    managerName: "Kim Seoyun",
    status: "approved",
    commissionRate: 12,
    productCount: 18,
    pendingProductCount: 2,
    settlementBlocked: false,
  },
  {
    id: "company-bebe-lux",
    name: "Bebe Lux",
    managerName: "Park Doyun",
    status: "approved",
    commissionRate: 15,
    productCount: 11,
    pendingProductCount: 1,
    settlementBlocked: true,
  },
  {
    id: "company-momtable",
    name: "Mom Table",
    managerName: "Lee Hari",
    status: "pending",
    commissionRate: 10,
    productCount: 4,
    pendingProductCount: 4,
    settlementBlocked: true,
  },
];
