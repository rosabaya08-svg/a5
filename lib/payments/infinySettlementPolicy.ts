import type { CartItemSnapshot, Company, CompanyPgProfile, PgMerchantStatus } from "@/types/commerce";

export const INFINY_PROVIDER = "infiny";
export const INFINY_PROVIDER_LABEL = "인피니 PG";
export const INFINY_PG_FEE_RATE = 2.5;
export const A5_PLATFORM_FEE_RATE = 4.5;
export const INFINY_TOTAL_FEE_RATE = INFINY_PG_FEE_RATE + A5_PLATFORM_FEE_RATE;
export const INFINY_PAYOUT_RATE = 1 - INFINY_TOTAL_FEE_RATE / 100;

export type InfinySettlementAmounts = {
  grossAmount: number;
  pgFeeAmount: number;
  platformFeeAmount: number;
  totalFeeAmount: number;
  payoutAmount: number;
};

export type InfinyCartCompanyLine = {
  companyId: string;
  companyName: string;
  amount: number;
  itemCount: number;
  merchantId?: string;
  merchantIdMasked: string;
  merchantStatus: PgMerchantStatus;
};

export type InfinyCartAnalysis = {
  totalAmount: number;
  companyLines: InfinyCartCompanyLine[];
  uniqueCompanyCount: number;
  uniqueMidCount: number;
  missingMidCount: number;
  allCompaniesHaveMid: boolean;
  singleMidCart: boolean;
  canUseSingleApproval: boolean;
  requiresSplitSettlementApi: boolean;
  blockerReason: string;
  recommendedMode: "single_mid" | "infiny_marketplace_split" | "split_checkout" | "blocked_missing_mid";
};

export function calculateInfinySettlement(grossAmount: number): InfinySettlementAmounts {
  const pgFeeAmount = Math.round(grossAmount * (INFINY_PG_FEE_RATE / 100));
  const platformFeeAmount = Math.round(grossAmount * (A5_PLATFORM_FEE_RATE / 100));
  const totalFeeAmount = pgFeeAmount + platformFeeAmount;

  return {
    grossAmount,
    pgFeeAmount,
    platformFeeAmount,
    totalFeeAmount,
    payoutAmount: Math.max(grossAmount - totalFeeAmount, 0),
  };
}

export function maskMerchantId(merchantId?: string) {
  if (!merchantId) return "MID 발급 대기";
  if (merchantId.length <= 8) return merchantId;

  return `${merchantId.slice(0, 4)}-${"*".repeat(Math.max(merchantId.length - 9, 4))}-${merchantId.slice(-4)}`;
}

export function buildInfinyPgProfile(input: {
  merchantId?: string;
  merchantStatus: PgMerchantStatus;
}): CompanyPgProfile {
  return {
    provider: INFINY_PROVIDER,
    providerLabel: INFINY_PROVIDER_LABEL,
    merchantId: input.merchantId,
    merchantIdMasked: maskMerchantId(input.merchantId),
    merchantStatus: input.merchantStatus,
    adminManaged: true,
    companyEditable: false,
    pgFeeRate: INFINY_PG_FEE_RATE,
    platformFeeRate: A5_PLATFORM_FEE_RATE,
    totalFeeRate: INFINY_TOTAL_FEE_RATE,
    settlementOwner: "infiny",
    settlementExecutionBlocked: true,
  };
}

export function defaultInfinyPgProfile(): CompanyPgProfile {
  return buildInfinyPgProfile({ merchantStatus: "not_applied" });
}

export function getCompanyPgProfile(companyId: string, companies: Company[]) {
  return companies.find((company) => company.id === companyId)?.pgProfile ?? defaultInfinyPgProfile();
}

export function analyzeInfinyCart(items: CartItemSnapshot[], companies: Company[]): InfinyCartAnalysis {
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const lineMap = new Map<string, InfinyCartCompanyLine>();

  for (const item of items) {
    const company = companyMap.get(item.companyId);
    const profile = company?.pgProfile ?? defaultInfinyPgProfile();
    const amount = item.unitPrice * item.quantity;
    const current = lineMap.get(item.companyId);

    if (current) {
      current.amount += amount;
      current.itemCount += 1;
      continue;
    }

    lineMap.set(item.companyId, {
      companyId: item.companyId,
      companyName: company?.name ?? item.companyId,
      amount,
      itemCount: 1,
      merchantId: profile.merchantId,
      merchantIdMasked: profile.merchantIdMasked,
      merchantStatus: profile.merchantStatus,
    });
  }

  const companyLines = [...lineMap.values()];
  const mids = new Set(companyLines.map((line) => line.merchantId).filter((mid): mid is string => Boolean(mid)));
  const missingMidCount = companyLines.filter((line) => !line.merchantId || line.merchantStatus !== "active").length;
  const singleMidCart = mids.size <= 1 && missingMidCount === 0;
  const canUseSingleApproval = singleMidCart;

  let recommendedMode: InfinyCartAnalysis["recommendedMode"] = "single_mid";
  let blockerReason = "동일 MID 장바구니라 단일 승인 구조로 처리할 수 있습니다.";

  if (missingMidCount > 0) {
    recommendedMode = "blocked_missing_mid";
    blockerReason = "MID가 없거나 활성 상태가 아닌 기업 상품이 포함되어 실결제 승인을 열 수 없습니다.";
  } else if (mids.size > 1) {
    recommendedMode = "infiny_marketplace_split";
    blockerReason = "서로 다른 기업 MID가 섞인 장바구니는 인피니의 단일 결제 분할정산 API 확인 전까지 단일 승인을 열면 안 됩니다.";
  }

  return {
    totalAmount: companyLines.reduce((total, line) => total + line.amount, 0),
    companyLines,
    uniqueCompanyCount: companyLines.length,
    uniqueMidCount: mids.size,
    missingMidCount,
    allCompaniesHaveMid: missingMidCount === 0,
    singleMidCart,
    canUseSingleApproval,
    requiresSplitSettlementApi: mids.size > 1,
    blockerReason,
    recommendedMode,
  };
}
