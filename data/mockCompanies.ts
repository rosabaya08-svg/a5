import { buildInfinyPgProfile, INFINY_TOTAL_FEE_RATE } from "@/lib/payments/infinySettlementPolicy";
import type { Company } from "@/types/commerce";

export const mockCompanies: Company[] = [
  {
    id: "company-test-1004",
    name: "A5 테스트 기업",
    managerName: "테스트 담당자",
    status: "approved",
    commissionRate: INFINY_TOTAL_FEE_RATE,
    productCount: 2,
    pendingProductCount: 0,
    settlementBlocked: true,
    pgProfile: buildInfinyPgProfile({
      merchantId: "INF-TEST-1004",
      merchantStatus: "active",
    }),
  },
  {
    id: "company-sanho-care",
    name: "Sanho Care",
    managerName: "A5 PG test",
    status: "approved",
    commissionRate: INFINY_TOTAL_FEE_RATE,
    productCount: 3,
    pendingProductCount: 0,
    settlementBlocked: false,
    pgProfile: buildInfinyPgProfile({
      merchantId: "testpay02m",
      merchantStatus: "active",
    }),
  },
  {
    id: "company-bebe-lux",
    name: "Bebe Lux",
    managerName: "A5 PG test",
    status: "approved",
    commissionRate: INFINY_TOTAL_FEE_RATE,
    productCount: 1,
    pendingProductCount: 0,
    settlementBlocked: false,
    pgProfile: buildInfinyPgProfile({
      merchantId: "testpay02m",
      merchantStatus: "active",
    }),
  },
];
