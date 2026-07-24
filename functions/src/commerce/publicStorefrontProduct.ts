import type { Firestore } from "firebase-admin/firestore";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function timestampString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return undefined;
  const timestamp = value as { seconds?: number; toDate?: () => Date };
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (typeof timestamp.seconds === "number") {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function normalizeBusinessNo(value: unknown): string | undefined {
  const normalized = String(value ?? "").replace(/\D/g, "");
  return normalized || undefined;
}

function normalizeShippingFeePolicy(value: unknown) {
  const policy = asRecord(value);
  const mode = policy.mode === "paid" ? "paid" : "free";
  return {
    mode,
    baseFee: mode === "paid" ? Math.max(0, asNumber(policy.baseFee ?? policy.base_fee)) : 0,
    freeThreshold: Math.max(0, asNumber(policy.freeThreshold ?? policy.free_threshold)),
    remoteAreaEnabled: policy.remoteAreaEnabled === true || policy.remote_area_enabled === true,
    remoteAreaFee: Math.max(0, asNumber(policy.remoteAreaFee ?? policy.remote_area_fee)),
    islandAreaEnabled: policy.islandAreaEnabled === true || policy.island_area_enabled === true,
    islandAreaFee: Math.max(0, asNumber(policy.islandAreaFee ?? policy.island_area_fee)),
  };
}

export function toPublicStorefrontProduct(documentId: string, data: RecordValue) {
  const comparison = asRecord(data.comparison);
  const closedMallPrice = asNumber(
    data.closed_mall_price ?? data.closedMallPrice ?? comparison.closedMallPrice,
    asNumber(data.price),
  );
  const platformLowestPrice = asNumber(
    data.open_mall_price ??
      data.openMallPrice ??
      data.platform_lowest_price ??
      data.platformLowestPrice ??
      comparison.platformLowestPrice,
  );
  const listPrice = asNumber(data.list_price ?? data.listPrice ?? comparison.listPrice);
  const imageUrl = optionalString(data.image_url ?? data.imageUrl) ?? "/file.svg";
  const gallery = stringArray(data.gallery);
  const priceComparisonVerified =
    data.price_comparison_verified === true ||
    data.priceComparisonVerified === true ||
    comparison.verified === true;

  return {
    id: optionalString(data.product_id ?? data.productId) ?? documentId,
    companyId: optionalString(data.company_id ?? data.companyId) ?? "company-unknown",
    sellerCompanyId: optionalString(
      data.seller_company_id ??
        data.sellerCompanyId ??
        data.pg_owner_company_id ??
        data.company_id ??
        data.companyId,
    ),
    sellerBusinessNo: optionalString(
      data.seller_business_no ??
        data.sellerBusinessNo ??
        data.company_business_no ??
        data.companyBusinessNo ??
        data.business_registration_number,
    ),
    sellerBusinessNoNormalized: normalizeBusinessNo(
      data.seller_business_no_normalized ??
        data.sellerBusinessNoNormalized ??
        data.company_business_no_normalized ??
        data.companyBusinessNoNormalized ??
        data.business_registration_number_normalized ??
        data.seller_business_no,
    ),
    sellerCompanyName: optionalString(
      data.seller_company_name ?? data.sellerCompanyName ?? data.company_name ?? data.companyName,
    ),
    nurseryId: optionalString(data.nursery_id ?? data.nurseryId) ?? "",
    name: optionalString(data.title ?? data.name) ?? "Untitled product",
    brand: optionalString(data.brand) ?? "A5 Partner",
    subtitle: optionalString(data.subtitle) ?? "",
    category: optionalString(data.category) ?? "uncategorized",
    status: "approved" as const,
    price: closedMallPrice,
    stock: asNumber(data.inventory ?? data.stock),
    externalProductCode: optionalString(data.external_product_code ?? data.externalProductCode),
    publicPath: optionalString(data.public_path ?? data.publicPath),
    tabletPath: optionalString(data.tablet_path ?? data.tabletPath),
    mobilePath: optionalString(data.mobile_path ?? data.mobilePath),
    comparison: { listPrice, platformLowestPrice, closedMallPrice },
    priceComparisonVerified,
    priceComparisonStatus:
      optionalString(data.price_comparison_status ?? data.priceComparisonStatus ?? comparison.status) ??
      "pending_verification",
    comparisonVerificationSource: optionalString(
      data.comparison_verification_source ??
        data.comparisonVerificationSource ??
        data.comparison_price_verification_source ??
        data.price_comparison_verification_source,
    ),
    comparisonVerifiedAt: timestampString(
      data.comparison_verified_at ?? data.comparisonVerifiedAt ?? data.price_comparison_verified_at,
    ),
    optionIds: stringArray(data.option_ids ?? data.optionIds),
    thumbnailTone: "sage" as const,
    imageUrl,
    gallery: gallery.length ? gallery : [imageUrl],
    tags: stringArray(data.tags),
    badges: stringArray(data.badges),
    fulfillment: {
      delivery: data.delivery_available ?? data.deliveryAvailable ?? true,
      pickup: data.pickup_available ?? data.pickupAvailable ?? true,
    },
    shippingFeePolicy: normalizeShippingFeePolicy(data.shipping_fee_policy ?? data.shippingFeePolicy),
  };
}

export function toPublicStorefrontProductOption(documentId: string, data: RecordValue) {
  return {
    id: optionalString(data.option_id ?? data.optionId) ?? documentId,
    productId: optionalString(data.product_id ?? data.productId) ?? "",
    name: optionalString(data.name ?? data.option_name ?? data.optionName) ?? "default",
    priceDelta: asNumber(data.price_delta ?? data.priceDelta),
    stock: asNumber(data.stock ?? data.inventory),
  };
}

export async function readApprovedCompanyIds(db: Firestore) {
  const snapshot = await db
    .collection("companies")
    .where("status", "in", ["active", "approved"])
    .limit(500)
    .get();
  const ids = new Set<string>();
  for (const document of snapshot.docs) {
    const data = document.data() as RecordValue;
    const approvalStatus = optionalString(data.approval_status ?? data.approvalStatus) ?? "approved";
    if (approvalStatus !== "approved") continue;
    ids.add(optionalString(data.company_id ?? data.companyId) ?? document.id);
  }
  return ids;
}

export function isApprovedPublicProduct(data: RecordValue, approvedCompanyIds: Set<string>) {
  const companyId = optionalString(data.company_id ?? data.companyId) ?? "";
  const approvalStatus = optionalString(data.approval_status ?? data.approvalStatus);
  const productApprovalStatus =
    optionalString(data.product_approval_status ?? data.productApprovalStatus ?? approvalStatus) ?? "";
  const companyApprovalStatus =
    optionalString(data.company_approval_status ?? data.companyApprovalStatus ?? approvalStatus) ?? "";
  return (
    approvedCompanyIds.has(companyId) &&
    productApprovalStatus === "approved" &&
    companyApprovalStatus === "approved"
  );
}
