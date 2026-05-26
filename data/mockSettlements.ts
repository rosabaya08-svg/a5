import { calculateInfinySettlement } from "@/lib/payments/infinySettlementPolicy";
import type { Settlement } from "@/types/commerce";

export const mockSettlements: Settlement[] = [
  {
    id: "settlement-202605-sanho",
    companyId: "company-sanho-care",
    period: "2026-05",
    status: "payout_blocked",
    grossAmount: 75000,
    commissionAmount: calculateInfinySettlement(75000).totalFeeAmount,
    refundHoldAmount: 0,
    payoutAmount: calculateInfinySettlement(75000).payoutAmount,
  },
  {
    id: "settlement-202605-bebe",
    companyId: "company-bebe-lux",
    period: "2026-05",
    status: "payout_blocked",
    grossAmount: 167000,
    commissionAmount: calculateInfinySettlement(167000).totalFeeAmount,
    refundHoldAmount: 39000,
    payoutAmount: calculateInfinySettlement(167000).payoutAmount - 39000,
  },
  {
    id: "settlement-202605-momtable",
    companyId: "company-momtable",
    period: "2026-05",
    status: "payout_blocked",
    grossAmount: 0,
    commissionAmount: 0,
    refundHoldAmount: 0,
    payoutAmount: 0,
  },
];
