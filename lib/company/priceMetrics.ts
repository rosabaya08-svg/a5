export type ProductPriceMetricInput = {
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
};

export type ProductPriceComparisonStatus = "pending_verification" | "verified" | "needs_review";

export type ProductPriceOrderValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  comparisonComplete: boolean;
  comparisonVerified: boolean;
  status: ProductPriceComparisonStatus;
};

export function validateProductPriceOrder(input: ProductPriceMetricInput): ProductPriceOrderValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const listPriceValid = Number.isFinite(input.listPrice) && input.listPrice > 0;
  const openMallPriceValid = Number.isFinite(input.platformLowestPrice) && input.platformLowestPrice > 0;
  const closedMallPriceValid = Number.isFinite(input.closedMallPrice) && input.closedMallPrice > 0;
  const comparisonComplete = listPriceValid && openMallPriceValid;

  if (!closedMallPriceValid) {
    errors.push("폐쇄몰 판매가를 입력해야 합니다.");
  }

  if (listPriceValid !== openMallPriceValid) {
    errors.push("원판매가와 오픈몰 판매가는 함께 입력하거나 함께 비워야 합니다.");
  }

  let status: ProductPriceComparisonStatus = "pending_verification";
  let comparisonVerified = false;

  if (comparisonComplete && closedMallPriceValid) {
    comparisonVerified = input.listPrice >= input.platformLowestPrice && input.platformLowestPrice > input.closedMallPrice;
    status = comparisonVerified ? "verified" : "needs_review";

    if (!comparisonVerified) {
      warnings.push("확인된 가격 순서는 원판매가가 오픈몰 판매가보다 높거나 같고, 오픈몰 판매가가 폐쇄몰 판매가보다 높아야 합니다.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    comparisonComplete,
    comparisonVerified,
    status,
  };
}

export function calculateDiscountAmount(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || !Number.isFinite(salePrice)) return 0;
  return Math.max(0, Math.round(referencePrice - salePrice));
}

export function calculateDiscountRate(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return 0;
  return Math.max(0, Math.round((calculateDiscountAmount(referencePrice, salePrice) / referencePrice) * 100));
}

function calculateSignedDifference(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || !Number.isFinite(salePrice)) return 0;
  return Math.round(referencePrice - salePrice);
}

function calculateSignedDifferenceRate(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return 0;
  return Math.round((calculateSignedDifference(referencePrice, salePrice) / referencePrice) * 100);
}

export function calculateProductPriceMetrics(input: ProductPriceMetricInput) {
  const validation = validateProductPriceOrder(input);

  if (!validation.comparisonVerified) {
    return {
      normalDiscountAmount: 0,
      platformDiscountAmount: 0,
      normalDiscountRate: 0,
      platformDiscountRate: 0,
    };
  }

  return {
    normalDiscountAmount: calculateDiscountAmount(input.listPrice, input.closedMallPrice),
    platformDiscountAmount: calculateSignedDifference(input.platformLowestPrice, input.closedMallPrice),
    normalDiscountRate: calculateDiscountRate(input.listPrice, input.closedMallPrice),
    platformDiscountRate: calculateSignedDifferenceRate(input.platformLowestPrice, input.closedMallPrice),
  };
}
