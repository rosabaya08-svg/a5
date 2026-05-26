import { buildInfinyPgProfile, INFINY_TOTAL_FEE_RATE } from "@/lib/payments/infinySettlementPolicy";
import type { Company } from "@/types/commerce";

export const mockCompanies: Company[] = [
  {
    id: "company-sanho-care",
    name: "산호케어",
    managerName: "김서윤",
    status: "approved",
    commissionRate: INFINY_TOTAL_FEE_RATE,
    productCount: 18,
    pendingProductCount: 2,
    settlementBlocked: true,
    pgProfile: buildInfinyPgProfile({
      merchantId: "INF-SANHO-250526",
      merchantStatus: "active",
    }),
  },
  {
    id: "company-bebe-lux",
    name: "베베럭스",
    managerName: "박도현",
    status: "approved",
    commissionRate: INFINY_TOTAL_FEE_RATE,
    productCount: 11,
    pendingProductCount: 1,
    settlementBlocked: true,
    pgProfile: buildInfinyPgProfile({
      merchantId: "INF-BEBE-250526",
      merchantStatus: "active",
    }),
  },
  {
    id: "company-momtable",
    name: "맘테이블",
    managerName: "이하린",
    status: "approved",
    commissionRate: INFINY_TOTAL_FEE_RATE,
    productCount: 4,
    pendingProductCount: 4,
    settlementBlocked: true,
    pgProfile: buildInfinyPgProfile({
      merchantId: "INF-MOMTABLE-250526",
      merchantStatus: "active",
    }),
  },
];
