import type { Settlement } from "@/types/commerce";

export const mockSettlements: Settlement[] = [
  {
    id: "settlement-202605-sanho",
    companyId: "company-sanho-care",
    period: "2026-05",
    status: "review",
    grossAmount: 75000,
    commissionAmount: 9000,
    refundHoldAmount: 0,
    payoutAmount: 66000,
  },
  {
    id: "settlement-202605-bebe",
    companyId: "company-bebe-lux",
    period: "2026-05",
    status: "payout_blocked",
    grossAmount: 167000,
    commissionAmount: 25050,
    refundHoldAmount: 39000,
    payoutAmount: 102950,
  },
  {
    id: "settlement-202605-momtable",
    companyId: "company-momtable",
    period: "2026-05",
    status: "draft",
    grossAmount: 0,
    commissionAmount: 0,
    refundHoldAmount: 0,
    payoutAmount: 0,
  },
];
