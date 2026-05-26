import { calculateInfinySettlement } from "@/lib/payments/infinySettlementPolicy";
import type { Settlement } from "@/types/commerce";

const settlement = calculateInfinySettlement(127000);

export const mockSettlements: Settlement[] = [
  {
    id: "settlement-202605-test",
    companyId: "company-test-1004",
    period: "2026-05",
    status: "payout_blocked",
    grossAmount: 127000,
    commissionAmount: settlement.totalFeeAmount,
    refundHoldAmount: 0,
    payoutAmount: settlement.payoutAmount,
  },
];
