type RecordData = Record<string, unknown>;

export const JANDIRO_COMPANY_ID = "business-5583300453";
export const JANDIRO_PRICE_POLICY_ID = "jandiro_fulton_ratio_v1";
export const JANDIRO_PRICE_POLICY_VERSION = 1;
export const JANDIRO_PRICE_VERIFICATION_SOURCE =
  "company_scoped_jandiro_fulton_ratio_policy_v1";

export type CompanyProductOperation = "publish" | "update" | "bulk";

export type JandiroPricePolicyResult = {
  sourcePrice: number;
  listPrice: number;
  openMallPrice: number;
  closedMallPrice: number;
  fields: RecordData;
};

function record(value: unknown): RecordData {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordData)
    : {};
}

function amount(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function productIdOf(input: RecordData) {
  return String(input.id ?? input.product_id ?? input.productId ?? "").trim();
}

function sourcePriceOf(input: RecordData) {
  const comparison = record(input.comparison);
  return amount(
    input.closed_mall_price ??
      input.closedMallPrice ??
      input.final_sale_price ??
      input.finalSalePrice ??
      input.price ??
      input.sale_price ??
      input.salePrice ??
      comparison.closedMallPrice,
  );
}

function existingPolicySourcePrice(existing: RecordData) {
  return amount(
    existing.initial_uploaded_price_for_policy ??
      existing.initialUploadedPriceForPolicy ??
      existing.price_policy_source_price ??
      existing.pricePolicySourcePrice ??
      existing.open_mall_price ??
      existing.openMallPrice,
  );
}

export function isJandiroPaymentTestProduct(input: RecordData) {
  const id = productIdOf(input);
  const source = String(input.source ?? input.source_channel ?? "").toLowerCase();
  const title = String(input.title ?? input.name ?? "");
  return (
    id.startsWith("payup-test-1004-") ||
    source.includes("payup-test") ||
    title.includes("[결제테스트]")
  );
}

export function shouldApplyJandiroPricePolicy(
  companyId: string,
  input: RecordData,
) {
  return (
    companyId === JANDIRO_COMPANY_ID &&
    !isJandiroPaymentTestProduct(input)
  );
}

export function roundedJandiroClosedMallPrice(openMallPrice: number) {
  return Math.max(
    1_000,
    Math.floor((openMallPrice * 0.85) / 1_000) * 1_000,
  );
}

export function roundedJandiroListPrice(openMallPrice: number) {
  const roundedTenPercentPrice =
    Math.floor((openMallPrice * 1.1) / 10_000) * 10_000;
  const nextTenThousand =
    (Math.floor(openMallPrice / 10_000) + 1) * 10_000;
  return Math.max(roundedTenPercentPrice, nextTenThousand);
}

function discountRate(referencePrice: number, salePrice: number) {
  return Math.max(
    0,
    Math.ceil(((referencePrice - salePrice) / referencePrice) * 100),
  );
}

function resolveSourcePrice(
  incoming: RecordData,
  existing: RecordData,
  _operation: CompanyProductOperation,
) {
  const incomingSourcePrice = sourcePriceOf(incoming);
  const existingSourcePrice = existingPolicySourcePrice(existing);

  if (existingSourcePrice > 0) return existingSourcePrice;
  return incomingSourcePrice;
}

export function buildJandiroPricePolicy(
  incoming: RecordData,
  existing: RecordData,
  operation: CompanyProductOperation,
  appliedAtIso: string,
): JandiroPricePolicyResult | undefined {
  const sourcePrice = resolveSourcePrice(incoming, existing, operation);
  if (sourcePrice <= 0) return undefined;

  const listPrice = roundedJandiroListPrice(sourcePrice);
  const openMallPrice = sourcePrice;
  const closedMallPrice = roundedJandiroClosedMallPrice(sourcePrice);
  const normalDiscountAmount = listPrice - closedMallPrice;
  const platformDiscountAmount = openMallPrice - closedMallPrice;
  const normalDiscountRate = discountRate(listPrice, closedMallPrice);
  const platformDiscountRate = discountRate(
    openMallPrice,
    closedMallPrice,
  );
  const shippingFeePolicy = {
    mode: "paid",
    baseFee: 3_000,
    freeThreshold: 0,
    remoteAreaEnabled: true,
    remoteAreaFee: 3_000,
    islandAreaEnabled: true,
    islandAreaFee: 5_000,
  };

  const operationId = `${JANDIRO_PRICE_POLICY_ID}:${appliedAtIso}`;
  return {
    sourcePrice,
    listPrice,
    openMallPrice,
    closedMallPrice,
    fields: {
      price: closedMallPrice,
      sale_price: closedMallPrice,
      salePrice: closedMallPrice,
      closed_mall_price: closedMallPrice,
      closedMallPrice,
      list_price: listPrice,
      listPrice,
      open_mall_price: openMallPrice,
      openMallPrice,
      platform_lowest_price: openMallPrice,
      platformLowestPrice: openMallPrice,
      normal_discount_amount: normalDiscountAmount,
      normalDiscountAmount,
      platform_discount_amount: platformDiscountAmount,
      platformDiscountAmount,
      ai_comparison_amount: platformDiscountAmount,
      aiComparisonAmount: platformDiscountAmount,
      normal_discount_rate: normalDiscountRate,
      normalDiscountRate,
      discount_rate: normalDiscountRate,
      discountRate: normalDiscountRate,
      platform_discount_rate: platformDiscountRate,
      platformDiscountRate,
      price_comparison_verified: true,
      priceComparisonVerified: true,
      price_comparison_status: "verified",
      priceComparisonStatus: "verified",
      comparison_price_verification_source:
        JANDIRO_PRICE_VERIFICATION_SOURCE,
      comparisonPriceVerificationSource:
        JANDIRO_PRICE_VERIFICATION_SOURCE,
      comparison_verified_at: appliedAtIso,
      comparisonVerifiedAt: appliedAtIso,
      initial_uploaded_price_for_policy: sourcePrice,
      initialUploadedPriceForPolicy: sourcePrice,
      price_policy_source_price: sourcePrice,
      pricePolicySourcePrice: sourcePrice,
      price_policy_id: JANDIRO_PRICE_POLICY_ID,
      pricePolicyId: JANDIRO_PRICE_POLICY_ID,
      price_policy_version: JANDIRO_PRICE_POLICY_VERSION,
      pricePolicyVersion: JANDIRO_PRICE_POLICY_VERSION,
      price_policy_applied_at: appliedAtIso,
      pricePolicyAppliedAt: appliedAtIso,
      shipping_fee_policy: shippingFeePolicy,
      shippingFeePolicy,
      price_policy_operation_id: operationId,
      pricePolicyOperationId: operationId,
      shipping_fee_mode: "paid",
      shipping_base_fee: 3_000,
      shipping_free_threshold: 0,
      shipping_remote_area_enabled: true,
      shipping_remote_area_fee: 3_000,
      shipping_island_area_enabled: true,
      shipping_island_area_fee: 5_000,
      pricing: {
        listPrice,
        platformLowestPrice: openMallPrice,
        closedMallPrice,
        normalDiscountAmount,
        platformDiscountAmount,
        normalDiscountRate,
        platformDiscountRate,
        comparisonComplete: true,
        comparisonVerified: true,
        comparisonStatus: "verified",
        verificationSource: JANDIRO_PRICE_VERIFICATION_SOURCE,
      },
      comparison: {
        listPrice,
        platformLowestPrice: openMallPrice,
        closedMallPrice,
        normalDiscountAmount,
        platformDiscountAmount,
        normalDiscountRate,
        platformDiscountRate,
        verified: true,
        status: "verified",
        verificationSource: JANDIRO_PRICE_VERIFICATION_SOURCE,
        verifiedAt: appliedAtIso,
      },
    },
  };
}
