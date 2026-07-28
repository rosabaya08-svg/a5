import type { CompanyProductCategory } from "@/data/companyProductCategories";
import { calculateProductPriceMetrics, validateProductPriceOrder } from "@/lib/company/priceMetrics";
import type { ProductPriceComparisonStatus } from "@/lib/company/priceMetrics";
import type { CmsRecord } from "@/lib/firebase/contentRepository";
import { defaultShippingFeePolicy, normalizeShippingFeePolicy } from "@/lib/shipping/shippingFee";
import { buildProductUrlFields } from "@/lib/storefront/productUrls";
import type { Product, ProductOption, ShippingFeePolicy } from "@/types/commerce";

export const COMPANY_PRODUCT_DRAFT_STORAGE_KEY = "a5.company.product-registration-draft";

export type ProductDraftStatus = "draft" | "pending_approval";
export type ProductSaleStatus = "판매 준비" | "판매 가능" | "숨김";
export type ProductVariantStatus = "판매가능" | "품절" | "숨김";
export type ProductFulfillment = "delivery" | "pickup" | "both" | "voucher";
export type ProductDetailSectionType = "image" | "text" | "image_text" | "notice_table" | "components" | "caution" | "video" | "divider";

export type ProductDraftPricing = {
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
  normalDiscountAmount: number;
  platformDiscountAmount: number;
  normalDiscountRate: number;
  platformDiscountRate: number;
  comparisonComplete: boolean;
  comparisonVerified: boolean;
  comparisonStatus: ProductPriceComparisonStatus;
  platformPriceInvalid: boolean;
  exposeBlocked: boolean;
};

export type ProductOptionValue = {
  id: string;
  label: string;
  code: string;
  swatchColor?: string;
  displayOrder: number;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  displayOrder: number;
  values: ProductOptionValue[];
};

export type ProductDraftVariant = {
  id: string;
  optionValueIds: string[];
  optionPath: string;
  optionName: string;
  sku: string;
  barcode: string;
  normalPrice: string;
  platformLowestPrice: string;
  baseClosedMallPrice: string;
  additionalPrice: string;
  finalSalePrice: string;
  closedMallPrice: string;
  stock: string;
  safetyStock: string;
  weight: string;
  externalProductCode: string;
  externalOptionCode: string;
  imageFileName?: string;
  status: ProductVariantStatus;
};

// Legacy name kept because older admin/preview screens still import ProductDraftSku.
export type ProductDraftSku = ProductDraftVariant;

export type ProductDraftMedia = {
  id?: string;
  role: "representative" | "detail" | "evidence" | "video";
  fileName: string;
  fileType: string;
  fileSize: number;
  sectionId?: string;
  url?: string;
  path?: string;
};

export type ProductDraftLinkedDocument = {
  id: string;
  source: "company_signup";
  requestId?: string;
  fileName: string;
  storagePath: string;
  downloadUrl?: string;
  documentType?: string;
  documentLabel?: string;
  gmailStatus?: string;
  linkedAt: string;
};

export type ProductDetailSection = {
  id: string;
  type: ProductDetailSectionType;
  title: string;
  body: string;
  assetMediaId?: string;
  assetFileName?: string;
  assetUrl?: string;
  assetPath?: string;
  sortOrder: number;
};

export type ProductNoticeField = {
  id: string;
  label: string;
  value: string;
  required: boolean;
};

export type ProductDraftCompliance = {
  sellerDisclosureCompleted: boolean;
  productNoticeCompleted: boolean;
  returnPolicyCompleted: boolean;
  prohibitedProductConfirmed: boolean;
  kcRequired: boolean;
  kcNumber: string;
  evidenceReady: boolean;
};

export type ProductDraft = {
  id: string;
  companyId: string;
  companyBusinessNo?: string;
  companyBusinessNoNormalized?: string;
  companyName?: string;
  status: ProductDraftStatus;
  productName: string;
  brand: string;
  manufacturer: string;
  importer: string;
  origin: string;
  modelName: string;
  categoryId: string;
  categoryLabel: string;
  categoryCode: string;
  subcategory: string;
  reviewLevel: string;
  shelf: string;
  noticeTemplate: string;
  fulfillment: ProductFulfillment;
  saleStatus: ProductSaleStatus;
  exposureStart: string;
  exposureEnd: string;
  summary: string;
  detailDescription: string;
  returnPolicy: string;
  asPolicy: string;
  deliveryPolicy: string;
  shippingFeePolicy: ShippingFeePolicy;
  caution: string;
  pricing: ProductDraftPricing;
  optionGroups: ProductOptionGroup[];
  variants: ProductDraftVariant[];
  skus: ProductDraftSku[];
  detailSections: ProductDetailSection[];
  noticeFields: ProductNoticeField[];
  compliance: ProductDraftCompliance;
  media: ProductDraftMedia[];
  linkedSignupDocuments: ProductDraftLinkedDocument[];
  previewCheckedAt?: string;
  updatedAt: string;
};

export function makeProductDraftId(companyId: string) {
  return `product-draft-${companyId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeVariantId(index: number) {
  return `variant-${index + 1}`;
}

export function calculateFinalSalePrice(baseClosedMallPrice: string | number, additionalPrice: string | number) {
  const base = typeof baseClosedMallPrice === "number" ? baseClosedMallPrice : toNumber(baseClosedMallPrice);
  const extra = typeof additionalPrice === "number" ? additionalPrice : toNumber(additionalPrice);
  return String(Math.max(base + extra, 0));
}

export function toNumber(value: string | number | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").replace(/[^0-9-]/g, "");
  return normalized ? Number(normalized) : 0;
}

function normalizeBusinessNoValue(value: string | undefined) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function defaultVariant(pricing?: ProductDraftPricing): ProductDraftVariant {
  const normalPrice = pricing?.listPrice ? String(pricing.listPrice) : "";
  const platformLowestPrice = pricing?.platformLowestPrice ? String(pricing.platformLowestPrice) : "";
  const baseClosedMallPrice = pricing?.closedMallPrice ? String(pricing.closedMallPrice) : "";

  return {
    id: makeVariantId(0),
    optionValueIds: [],
    optionPath: "기본",
    optionName: "기본",
    sku: "",
    barcode: "",
    normalPrice,
    platformLowestPrice,
    baseClosedMallPrice,
    additionalPrice: "0",
    finalSalePrice: calculateFinalSalePrice(baseClosedMallPrice, 0),
    closedMallPrice: calculateFinalSalePrice(baseClosedMallPrice, 0),
    stock: "",
    safetyStock: "",
    weight: "",
    externalProductCode: "",
    externalOptionCode: "",
    status: "판매가능",
  };
}

function defaultNoticeFields() {
  return [
    { id: "manufacturer", label: "제조사/책임판매업자", value: "", required: true },
    { id: "origin", label: "제조국/원산지", value: "", required: true },
    { id: "material", label: "소재/성분", value: "", required: true },
    { id: "size", label: "용량/규격/사이즈", value: "", required: true },
    { id: "care", label: "사용/세탁/보관 방법", value: "", required: true },
    { id: "warranty", label: "품질보증/AS 기준", value: "", required: true },
  ];
}

export function createDefaultProductDraft(companyId: string): ProductDraft {
  const now = new Date().toISOString();
  const pricing: ProductDraftPricing = {
    listPrice: 0,
    platformLowestPrice: 0,
    closedMallPrice: 0,
    normalDiscountAmount: 0,
    platformDiscountAmount: 0,
    normalDiscountRate: 0,
    platformDiscountRate: 0,
    comparisonComplete: false,
    comparisonVerified: false,
    comparisonStatus: "pending_verification",
    platformPriceInvalid: true,
    exposeBlocked: true,
  };
  const variant = defaultVariant(pricing);

  return {
    id: makeProductDraftId(companyId),
    companyId,
    companyBusinessNo: "",
    companyBusinessNoNormalized: "",
    companyName: "",
    status: "draft",
    productName: "",
    brand: "",
    manufacturer: "",
    importer: "",
    origin: "",
    modelName: "",
    categoryId: "",
    categoryLabel: "",
    categoryCode: "",
    subcategory: "",
    reviewLevel: "",
    shelf: "",
    noticeTemplate: "",
    fulfillment: "both",
    saleStatus: "판매 가능",
    exposureStart: "",
    exposureEnd: "",
    summary: "",
    detailDescription: "",
    returnPolicy: "",
    asPolicy: "",
    deliveryPolicy: "",
    shippingFeePolicy: defaultShippingFeePolicy,
    caution: "",
    pricing,
    optionGroups: [
      {
        id: "group-color",
        name: "색상",
        required: false,
        displayOrder: 1,
        values: [],
      },
      {
        id: "group-size",
        name: "사이즈",
        required: false,
        displayOrder: 2,
        values: [],
      },
    ],
    variants: [variant],
    skus: [variant],
    detailSections: [
      {
        id: "section-summary",
        type: "text",
        title: "상품 소개",
        body: "",
        sortOrder: 1,
      },
    ],
    noticeFields: defaultNoticeFields(),
    compliance: {
      sellerDisclosureCompleted: false,
      productNoticeCompleted: false,
      returnPolicyCompleted: false,
      prohibitedProductConfirmed: false,
      kcRequired: false,
      kcNumber: "",
      evidenceReady: false,
    },
    media: [],
    linkedSignupDocuments: [],
    updatedAt: now,
  };
}

function slugId(value: string, fallback: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

function fileNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).at(-1) ?? "상품 이미지");
  } catch {
    return url.split("/").filter(Boolean).at(-1) ?? "상품 이미지";
  }
}

function collectUniqueImageUrls(values: Array<string | undefined>, excludeUrl?: string) {
  const seen = new Set<string>();
  const excluded = String(excludeUrl ?? "").trim();
  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value && value !== excluded)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function existingDetailMediaId(index: number) {
  return `detail-existing-${index + 1}`;
}

function optionToValue(option: ProductOption, index: number): ProductOptionValue {
  return {
    id: option.id || `option-${index + 1}`,
    label: option.name || "기본",
    code: slugId(option.id || option.name, `OPT-${index + 1}`).toUpperCase(),
    displayOrder: index + 1,
  };
}

export function createProductDraftFromRegisteredProduct(companyId: string, product: Product, options: ProductOption[] = []): ProductDraft {
  const now = new Date().toISOString();
  const fallbackOption: ProductOption = {
    id: product.optionIds[0] ?? `${product.id}-default`,
    productId: product.id,
    name: "기본",
    priceDelta: 0,
    stock: product.stock,
  };
  const productOptions = options.length ? options : [fallbackOption];
  const pricingMetrics = calculateProductPriceMetrics({
    listPrice: product.comparison.listPrice,
    platformLowestPrice: product.comparison.platformLowestPrice,
    closedMallPrice: product.comparison.closedMallPrice,
  });
  const priceOrder = validateProductPriceOrder({
    listPrice: product.comparison.listPrice,
    platformLowestPrice: product.comparison.platformLowestPrice,
    closedMallPrice: product.comparison.closedMallPrice,
  });
  const pricing: ProductDraftPricing = {
    listPrice: product.comparison.listPrice,
    platformLowestPrice: product.comparison.platformLowestPrice,
    closedMallPrice: product.comparison.closedMallPrice,
    normalDiscountAmount: pricingMetrics.normalDiscountAmount,
    platformDiscountAmount: pricingMetrics.platformDiscountAmount,
    normalDiscountRate: pricingMetrics.normalDiscountRate,
    platformDiscountRate: pricingMetrics.platformDiscountRate,
    comparisonComplete: priceOrder.comparisonComplete,
    comparisonVerified: priceOrder.comparisonVerified,
    comparisonStatus: priceOrder.status,
    platformPriceInvalid: !priceOrder.valid || priceOrder.status === "needs_review",
    exposeBlocked: !priceOrder.valid,
  };
  const optionValues = productOptions.map(optionToValue);
  const variants = productOptions.map((option, index): ProductDraftVariant => {
    const baseClosedMallPrice = String(product.comparison.closedMallPrice || product.price || 0);
    const additionalPrice = String(option.priceDelta || 0);
    const finalSalePrice = calculateFinalSalePrice(baseClosedMallPrice, additionalPrice);

    return {
      id: option.id || makeVariantId(index),
      optionValueIds: productOptions.length > 1 ? [option.id] : [],
      optionPath: option.name || "기본",
      optionName: option.name || "기본",
      sku: option.id || `${product.id}-sku-${index + 1}`,
      barcode: "",
      normalPrice: String(product.comparison.listPrice || ""),
      platformLowestPrice: String(product.comparison.platformLowestPrice || ""),
      baseClosedMallPrice,
      additionalPrice,
      finalSalePrice,
      closedMallPrice: finalSalePrice,
      stock: String(option.stock ?? product.stock ?? 0),
      safetyStock: "",
      weight: "",
      externalProductCode: product.externalProductCode ?? "",
      externalOptionCode: option.id || "",
      status: option.stock > 0 ? "판매가능" : "품절",
    };
  });
  const media: ProductDraftMedia[] = [];

  if (product.imageUrl) {
    media.push({
      role: "representative",
      fileName: fileNameFromUrl(product.imageUrl),
      fileType: "image",
      fileSize: 0,
      url: product.imageUrl,
    });
  }

  const detailSectionAssetUrls = (product.detailSections ?? []).map((section) => section.assetUrl);
  const detailImageUrls = collectUniqueImageUrls([...(product.gallery ?? []), ...detailSectionAssetUrls], product.imageUrl);
  detailImageUrls.forEach((url, index) => {
    media.push({
      id: existingDetailMediaId(index),
      role: "detail",
      fileName: fileNameFromUrl(url),
      fileType: "image",
      fileSize: 0,
      sectionId: `section-existing-image-${index + 1}`,
      url,
    });
  });

  const detailSectionsFromProduct: ProductDetailSection[] = product.detailSections?.length
    ? product.detailSections.map((section, index) => {
        const assetUrl = String(section.assetUrl ?? "").trim();
        const assetIndex = assetUrl ? detailImageUrls.indexOf(assetUrl) : -1;
        const sectionType = section.type === "image" || section.type === "image_text" || section.type === "text" ? section.type : assetUrl ? "image" : "text";
        return {
          id: section.id || `section-${index + 1}`,
          type: sectionType,
          title: section.title,
          body: section.body,
          assetMediaId: assetIndex >= 0 ? existingDetailMediaId(assetIndex) : undefined,
          assetFileName: section.assetFileName ?? (assetUrl ? fileNameFromUrl(assetUrl) : undefined),
          assetUrl: assetUrl || undefined,
          assetPath: section.assetPath,
          sortOrder: section.sortOrder || index + 1,
        };
      })
    : [];
  const detailSectionsFromGallery: ProductDetailSection[] = detailImageUrls
    .filter((url) => !detailSectionsFromProduct.some((section) => section.assetUrl === url))
    .map((url, index) => ({
      id: `section-existing-gallery-${index + 1}`,
      type: "image",
      title: fileNameFromUrl(url),
      body: "",
      assetMediaId: existingDetailMediaId(detailImageUrls.indexOf(url)),
      assetFileName: fileNameFromUrl(url),
      assetUrl: url,
      sortOrder: detailSectionsFromProduct.length + index + 1,
    }));
  const restoredDetailSections = [...detailSectionsFromProduct, ...detailSectionsFromGallery];

  return normalizeDraft({
    ...createDefaultProductDraft(companyId),
    id: product.id,
    companyId,
    companyBusinessNo: product.sellerBusinessNo ?? product.sellerBusinessNoNormalized ?? "",
    companyBusinessNoNormalized: product.sellerBusinessNoNormalized ?? normalizeBusinessNoValue(product.sellerBusinessNo),
    companyName: product.sellerCompanyName ?? product.brand ?? "",
    status: "draft",
    productName: product.name,
    brand: product.brand ?? "",
    categoryId: product.category ? `existing-${slugId(product.category, "category")}` : "",
    categoryLabel: product.category,
    categoryCode: slugId(product.category, "category").toUpperCase(),
    subcategory: product.category,
    fulfillment: product.fulfillment?.pickup && !product.fulfillment.delivery ? "pickup" : product.fulfillment?.delivery && !product.fulfillment.pickup ? "delivery" : "both",
    saleStatus: product.status === "suspended" || product.firebaseStatus === "paused" ? "숨김" : "판매 가능",
    summary: product.subtitle ?? "",
    detailDescription: product.subtitle ?? "",
    shippingFeePolicy: normalizeShippingFeePolicy(product.shippingFeePolicy),
    pricing,
    optionGroups: productOptions.length > 1 ? [{ id: "group-option", name: "옵션", required: false, displayOrder: 1, values: optionValues }] : createDefaultProductDraft(companyId).optionGroups,
    variants,
    skus: variants,
    detailSections: restoredDetailSections.length
      ? restoredDetailSections
      : [{ id: "section-summary", type: "text", title: "상품 소개", body: product.subtitle ?? product.name, sortOrder: 1 }],
    media,
    compliance: {
      sellerDisclosureCompleted: true,
      productNoticeCompleted: true,
      returnPolicyCompleted: true,
      prohibitedProductConfirmed: true,
      kcRequired: false,
      kcNumber: "",
      evidenceReady: true,
    },
    updatedAt: now,
  });
}

export function applyCategoryToDraft(
  draft: ProductDraft,
  category: CompanyProductCategory,
  subcategory: string,
): ProductDraft {
  const kcRequired = category.kcPolicy === "required" || (category.kcPolicy === "conditional" && draft.compliance.kcRequired);

  return normalizeDraft({
    ...draft,
    categoryId: category.id,
    categoryLabel: category.label,
    categoryCode: category.code,
    subcategory,
    reviewLevel: category.reviewLevel,
    shelf: category.shelf,
    noticeTemplate: category.noticeTemplate,
    fulfillment: category.defaultFulfillment === "택배 중심"
      ? "delivery"
      : category.defaultFulfillment === "현장수령 중심"
        ? "pickup"
        : category.defaultFulfillment === "예약/바우처"
          ? "voucher"
          : "both",
    compliance: {
      ...draft.compliance,
      kcRequired,
    },
  });
}

export function normalizeDraft(raw: ProductDraft): ProductDraft {
  const rawPricing = raw.pricing ?? createDefaultProductDraft(raw.companyId).pricing;
  const pricingMetrics = calculateProductPriceMetrics(rawPricing);
  const priceOrder = validateProductPriceOrder(rawPricing);
  const platformPriceInvalid = !priceOrder.valid || priceOrder.status === "needs_review";
  const pricing: ProductDraftPricing = {
    ...rawPricing,
    ...pricingMetrics,
    comparisonComplete: priceOrder.comparisonComplete,
    comparisonVerified: priceOrder.comparisonVerified,
    comparisonStatus: priceOrder.status,
    platformPriceInvalid,
    exposeBlocked: !priceOrder.valid,
  };
  const variants = (raw.variants?.length ? raw.variants : raw.skus?.length ? raw.skus : [defaultVariant(pricing)]).map((variant, index) => {
    const baseClosedMallPrice = variant.baseClosedMallPrice || variant.closedMallPrice || String(pricing.closedMallPrice || "");
    const additionalPrice = variant.additionalPrice || "0";
    const finalSalePrice = calculateFinalSalePrice(baseClosedMallPrice, additionalPrice);

    return {
      ...defaultVariant(pricing),
      ...variant,
      id: variant.id || makeVariantId(index),
      optionPath: variant.optionPath || variant.optionName || "기본",
      optionName: variant.optionName || variant.optionPath || "기본",
      normalPrice: variant.normalPrice || String(pricing.listPrice || ""),
      platformLowestPrice: variant.platformLowestPrice || String(pricing.platformLowestPrice || ""),
      baseClosedMallPrice,
      additionalPrice,
      finalSalePrice,
      closedMallPrice: finalSalePrice,
      status: variant.status || "판매가능",
    };
  });

  return {
    ...createDefaultProductDraft(raw.companyId),
    ...raw,
    companyBusinessNo: raw.companyBusinessNo ?? "",
    companyBusinessNoNormalized: raw.companyBusinessNoNormalized ?? normalizeBusinessNoValue(raw.companyBusinessNo),
    companyName: raw.companyName ?? "",
    modelName: raw.modelName ?? "",
    noticeTemplate: raw.noticeTemplate ?? "",
    optionGroups: raw.optionGroups?.length ? raw.optionGroups : createDefaultProductDraft(raw.companyId).optionGroups,
    detailSections: raw.detailSections?.length
      ? raw.detailSections.map((section, index) => ({
          ...section,
          sortOrder: section.sortOrder || index + 1,
        }))
      : createDefaultProductDraft(raw.companyId).detailSections,
    noticeFields: raw.noticeFields?.length ? raw.noticeFields : defaultNoticeFields(),
    pricing,
    shippingFeePolicy: normalizeShippingFeePolicy(raw.shippingFeePolicy),
    variants,
    skus: variants,
    media: (raw.media ?? []).map((item, index) => ({
      ...item,
      id: item.id || `${item.role}-${index + 1}`,
    })),
    linkedSignupDocuments: raw.linkedSignupDocuments ?? [],
  };
}

export function withProductDraftSellerIdentity(
  draft: ProductDraft,
  identity: { businessNo?: string; companyName?: string } = {},
): ProductDraft {
  const businessNo = identity.businessNo ?? draft.companyBusinessNo ?? draft.companyBusinessNoNormalized ?? "";
  const normalizedBusinessNo = normalizeBusinessNoValue(identity.businessNo ?? draft.companyBusinessNoNormalized ?? businessNo);

  return normalizeDraft({
    ...draft,
    companyBusinessNo: businessNo,
    companyBusinessNoNormalized: normalizedBusinessNo,
    companyName: identity.companyName ?? draft.companyName ?? "",
  });
}

function sellerIdentityFields(draft: ProductDraft): Record<string, unknown> {
  const normalizedBusinessNo = normalizeBusinessNoValue(draft.companyBusinessNoNormalized ?? draft.companyBusinessNo);
  const businessNo = draft.companyBusinessNo ?? normalizedBusinessNo;
  const companyName = draft.companyName?.trim() ?? "";
  const fields: Record<string, unknown> = {
    seller_company_id: draft.companyId,
    sellerCompanyId: draft.companyId,
    pg_owner_company_id: draft.companyId,
  };

  if (companyName) {
    fields.seller_company_name = companyName;
    fields.sellerCompanyName = companyName;
    fields.company_name = companyName;
  }

  if (businessNo) {
    fields.seller_business_no = businessNo;
    fields.sellerBusinessNo = businessNo;
    fields.company_business_no = businessNo;
    fields.companyBusinessNo = businessNo;
    fields.business_registration_number = businessNo;
  }

  if (normalizedBusinessNo) {
    fields.seller_business_no_normalized = normalizedBusinessNo;
    fields.sellerBusinessNoNormalized = normalizedBusinessNo;
    fields.company_business_no_normalized = normalizedBusinessNo;
    fields.companyBusinessNoNormalized = normalizedBusinessNo;
    fields.business_registration_number_normalized = normalizedBusinessNo;
  }

  return fields;
}

export function buildVariantMatrix(
  optionGroups: ProductOptionGroup[],
  pricing: ProductDraftPricing,
  existingVariants: ProductDraftVariant[] = [],
): ProductDraftVariant[] {
  const activeGroups = optionGroups
    .filter((group) => group.values.length > 0)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (activeGroups.length === 0) return [defaultVariant(pricing)];

  const combinations = activeGroups.reduce<ProductOptionValue[][]>(
    (result, group) => result.flatMap((prefix) => group.values.map((value) => [...prefix, value])),
    [[]],
  );

  return combinations.map((values, index) => {
    const optionValueIds = values.map((value) => value.id);
    const optionPath = values.map((value) => value.label).join(" / ");
    const existing = existingVariants.find((variant) =>
      variant.optionValueIds.length === optionValueIds.length &&
      optionValueIds.every((id) => variant.optionValueIds.includes(id)),
    );
    const baseClosedMallPrice = existing?.baseClosedMallPrice || String(pricing.closedMallPrice || "");
    const additionalPrice = existing?.additionalPrice || "0";
    const finalSalePrice = calculateFinalSalePrice(baseClosedMallPrice, additionalPrice);

    return {
      ...defaultVariant(pricing),
      ...existing,
      id: existing?.id || makeVariantId(index),
      optionValueIds,
      optionPath,
      optionName: optionPath,
      normalPrice: existing?.normalPrice || String(pricing.listPrice || ""),
      platformLowestPrice: existing?.platformLowestPrice || String(pricing.platformLowestPrice || ""),
      baseClosedMallPrice,
      additionalPrice,
      finalSalePrice,
      closedMallPrice: finalSalePrice,
    };
  });
}

export function evaluateProductDraftReadiness(draft: ProductDraft) {
  const normalized = normalizeDraft(draft);
  const blockers: string[] = [];

  if (!normalized.productName.trim()) blockers.push("상품명은 필수입니다.");
  if (!normalized.brand.trim()) blockers.push("브랜드는 필수입니다.");
  if (!normalized.categoryId || !normalized.subcategory) blockers.push("A5 제공 카테고리와 소분류를 선택해야 합니다.");
  const priceOrder = validateProductPriceOrder(normalized.pricing);
  blockers.push(...priceOrder.errors);

  if (!normalized.media.some((media) => media.role === "representative")) blockers.push("대표 이미지는 필수입니다.");
  if (!normalized.detailSections.some((section) => section.type !== "divider" && (section.body.trim() || section.assetFileName))) {
    blockers.push("상세페이지 섹션을 1개 이상 작성해야 합니다.");
  }
  if (!normalized.variants.length) blockers.push("옵션 조합 SKU를 1개 이상 생성해야 합니다.");

  const skuSet = new Set<string>();
  for (const variant of normalized.variants) {
    if (!variant.sku.trim()) blockers.push(`${variant.optionPath} SKU를 입력해야 합니다.`);
    if (variant.sku.trim() && skuSet.has(variant.sku.trim())) blockers.push(`${variant.sku} SKU가 중복되었습니다.`);
    if (variant.sku.trim()) skuSet.add(variant.sku.trim());
    const variantPriceOrder = validateProductPriceOrder({
      listPrice: toNumber(variant.normalPrice),
      platformLowestPrice: toNumber(variant.platformLowestPrice),
      closedMallPrice: toNumber(variant.finalSalePrice),
    });
    blockers.push(...variantPriceOrder.errors.map((error) => `${variant.optionPath}: ${error}`));
    if (variant.stock === "" || toNumber(variant.stock) < 0) blockers.push(`${variant.optionPath} 재고를 입력해야 합니다.`);
  }

  const requireOperationalDocumentsBeforePublish = process.env.NEXT_PUBLIC_A5_REQUIRE_PRODUCT_DOCUMENT_GATE === "true";
  if (requireOperationalDocumentsBeforePublish) {
    if (!normalized.compliance.sellerDisclosureCompleted) blockers.push("판매자 정보 확인이 필요합니다.");
    if (!normalized.compliance.productNoticeCompleted) blockers.push("상품정보제공고시 입력 완료가 필요합니다.");
    if (!normalized.noticeFields.every((field) => !field.required || field.value.trim())) blockers.push("필수 고시정보를 모두 입력해야 합니다.");
    if (!normalized.compliance.returnPolicyCompleted) blockers.push("반품/교환/AS/배송 정책 입력 완료가 필요합니다.");
    if (!normalized.compliance.prohibitedProductConfirmed) blockers.push("금지상품이 아님을 확인해야 합니다.");
    if (normalized.compliance.kcRequired && (!normalized.compliance.kcNumber.trim() || !normalized.compliance.evidenceReady)) {
      blockers.push("KC 대상 상품은 인증번호와 증빙 파일이 필요합니다.");
    }
  }

  return {
    approvalReady: blockers.length === 0,
    blockers: [...new Set(blockers)],
  };
}

export function buildProductDraftCmsRecord(draft: ProductDraft, status: ProductDraftStatus): CmsRecord {
  const normalized = normalizeDraft(draft);

  return {
    id: normalized.id,
    title: normalized.productName || "상품명 미입력",
    status,
    approval_status: status,
    source_app: "company",
    company_id: normalized.companyId,
    companyId: normalized.companyId,
    ...sellerIdentityFields(normalized),
    product_id: normalized.id,
    brand: normalized.brand,
    manufacturer: normalized.manufacturer,
    importer: normalized.importer,
    origin: normalized.origin,
    model_name: normalized.modelName,
    category_id: normalized.categoryId,
    category_label: normalized.categoryLabel,
    category_code: normalized.categoryCode,
    subcategory: normalized.subcategory,
    review_level: normalized.reviewLevel,
    shelf: normalized.shelf,
    notice_template: normalized.noticeTemplate,
    fulfillment: normalized.fulfillment,
    sale_status: normalized.saleStatus,
    exposure_start: normalized.exposureStart,
    exposure_end: normalized.exposureEnd,
    summary: normalized.summary,
    detail_description: normalized.detailDescription,
    detail_sections: normalized.detailSections,
    notice_fields: normalized.noticeFields,
    return_policy: normalized.returnPolicy,
    as_policy: normalized.asPolicy,
    delivery_policy: normalized.deliveryPolicy,
    shipping_fee_policy: normalized.shippingFeePolicy,
    shippingFeePolicy: normalized.shippingFeePolicy,
    caution: normalized.caution,
    pricing: normalized.pricing,
    option_groups: normalized.optionGroups,
    variants: normalized.variants,
    skus: normalized.variants,
    compliance: normalized.compliance,
    media: normalized.media,
    linked_signup_documents: normalized.linkedSignupDocuments,
    preview_checked_at: normalized.previewCheckedAt,
    submitted_at: status === "pending_approval" ? new Date().toISOString() : undefined,
  };
}

function stringRecordValue(record: CmsRecord, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function numberRecordValue(record: CmsRecord, key: string, fallback = 0) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function objectRecordValue<T>(record: CmsRecord, key: string, fallback: T): T {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : fallback;
}

function arrayRecordValue<T>(record: CmsRecord, key: string, fallback: T[]): T[] {
  const value = record[key];
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function draftStatusFromRecord(record: CmsRecord): ProductDraftStatus {
  return record.status === "pending_approval" || record.approval_status === "pending_approval" ? "pending_approval" : "draft";
}

export function productDraftFromCmsRecord(record: CmsRecord): ProductDraft | null {
  const companyId = stringRecordValue(record, "company_id", stringRecordValue(record, "companyId"));

  if (!companyId) return null;

  const defaults = createDefaultProductDraft(companyId);
  const pricing = objectRecordValue<ProductDraftPricing>(record, "pricing", defaults.pricing);
  const pricingRecord = pricing as unknown as CmsRecord;
  const variants = arrayRecordValue<ProductDraftVariant>(record, "variants", defaults.variants);

  return normalizeDraft({
    ...defaults,
    id: stringRecordValue(record, "product_id", record.id),
    companyId,
    companyBusinessNo: stringRecordValue(
      record,
      "seller_business_no",
      stringRecordValue(record, "business_registration_number", stringRecordValue(record, "company_business_no")),
    ),
    companyBusinessNoNormalized: stringRecordValue(
      record,
      "seller_business_no_normalized",
      stringRecordValue(record, "business_registration_number_normalized", stringRecordValue(record, "company_business_no_normalized")),
    ),
    companyName: stringRecordValue(record, "seller_company_name", stringRecordValue(record, "company_name")),
    status: draftStatusFromRecord(record),
    productName: stringRecordValue(record, "title", defaults.productName),
    brand: stringRecordValue(record, "brand", defaults.brand),
    manufacturer: stringRecordValue(record, "manufacturer", defaults.manufacturer),
    importer: stringRecordValue(record, "importer", defaults.importer),
    origin: stringRecordValue(record, "origin", defaults.origin),
    modelName: stringRecordValue(record, "model_name", defaults.modelName),
    categoryId: stringRecordValue(record, "category_id", defaults.categoryId),
    categoryLabel: stringRecordValue(record, "category_label", defaults.categoryLabel),
    categoryCode: stringRecordValue(record, "category_code", defaults.categoryCode),
    subcategory: stringRecordValue(record, "subcategory", defaults.subcategory),
    reviewLevel: stringRecordValue(record, "review_level", defaults.reviewLevel),
    shelf: stringRecordValue(record, "shelf", defaults.shelf),
    noticeTemplate: stringRecordValue(record, "notice_template", defaults.noticeTemplate),
    exposureStart: stringRecordValue(record, "exposure_start", defaults.exposureStart),
    exposureEnd: stringRecordValue(record, "exposure_end", defaults.exposureEnd),
    summary: stringRecordValue(record, "summary", defaults.summary),
    detailDescription: stringRecordValue(record, "detail_description", defaults.detailDescription),
    returnPolicy: stringRecordValue(record, "return_policy", defaults.returnPolicy),
    asPolicy: stringRecordValue(record, "as_policy", defaults.asPolicy),
    deliveryPolicy: stringRecordValue(record, "delivery_policy", defaults.deliveryPolicy),
    shippingFeePolicy: normalizeShippingFeePolicy(record.shipping_fee_policy ?? record.shippingFeePolicy),
    caution: stringRecordValue(record, "caution", defaults.caution),
    pricing: {
      ...defaults.pricing,
      ...pricing,
      listPrice: numberRecordValue(pricingRecord, "listPrice", defaults.pricing.listPrice),
      platformLowestPrice: numberRecordValue(pricingRecord, "platformLowestPrice", defaults.pricing.platformLowestPrice),
      closedMallPrice: numberRecordValue(pricingRecord, "closedMallPrice", defaults.pricing.closedMallPrice),
    },
    optionGroups: arrayRecordValue<ProductOptionGroup>(record, "option_groups", defaults.optionGroups),
    variants,
    skus: variants,
    detailSections: arrayRecordValue<ProductDetailSection>(record, "detail_sections", defaults.detailSections),
    noticeFields: arrayRecordValue<ProductNoticeField>(record, "notice_fields", defaults.noticeFields),
    compliance: objectRecordValue<ProductDraftCompliance>(record, "compliance", defaults.compliance),
    media: arrayRecordValue<ProductDraftMedia>(record, "media", defaults.media),
    linkedSignupDocuments: arrayRecordValue<ProductDraftLinkedDocument>(record, "linked_signup_documents", defaults.linkedSignupDocuments),
    previewCheckedAt: stringRecordValue(record, "preview_checked_at", defaults.previewCheckedAt),
    updatedAt: stringRecordValue(record, "submitted_at", defaults.updatedAt),
  });
}

export function buildProductCatalogCmsRecord(draft: ProductDraft, sourceChannel = "company_product_edit_apply"): CmsRecord {
  const normalized = normalizeDraft(draft);
  const representative = normalized.media.find((item) => item.role === "representative");
  const gallery = normalized.media
    .filter((item) => item.url)
    .map((item) => String(item.url));
  const detailImages = normalized.detailSections
    .filter((section) => section.assetUrl)
    .map((section) => ({
      id: section.id,
      title: section.title,
      url: section.assetUrl,
      path: section.assetPath,
      fileName: section.assetFileName,
      sortOrder: section.sortOrder,
    }));
  const activeVariants = normalized.variants.filter((variant) => variant.status !== "숨김");
  const firstVariant = activeVariants[0] ?? normalized.variants[0];
  const optionIds = activeVariants.map((variant) => catalogOptionId(normalized.id, variant.id));
  const stock = activeVariants.reduce((total, variant) => total + toNumber(variant.stock), 0);
  const listPrice = normalized.pricing.listPrice || toNumber(firstVariant?.normalPrice);
  const platformLowestPrice = normalized.pricing.platformLowestPrice || toNumber(firstVariant?.platformLowestPrice);
  const closedMallPrice = normalized.pricing.closedMallPrice || toNumber(firstVariant?.baseClosedMallPrice);
  const priceMetrics = calculateProductPriceMetrics({ listPrice, platformLowestPrice, closedMallPrice });
  const priceOrder = validateProductPriceOrder({ listPrice, platformLowestPrice, closedMallPrice });

  return {
    id: normalized.id,
    product_id: normalized.id,
    title: normalized.productName,
    name: normalized.productName,
    brand: normalized.brand,
    subtitle: normalized.summary,
    category: normalized.categoryLabel || normalized.subcategory,
    category_id: normalized.categoryId,
    category_code: normalized.categoryCode,
    subcategory: normalized.subcategory,
    company_id: normalized.companyId,
    companyId: normalized.companyId,
    ...sellerIdentityFields(normalized),
    status: normalized.saleStatus === "숨김" ? "paused" : "active",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    price: closedMallPrice,
    sale_price: closedMallPrice,
    salePrice: closedMallPrice,
    closed_mall_price: closedMallPrice,
    closedMallPrice,
    platform_lowest_price: platformLowestPrice,
    platformLowestPrice,
    open_mall_price: platformLowestPrice,
    openMallPrice: platformLowestPrice,
    list_price: listPrice,
    listPrice,
    normal_discount_amount: priceMetrics.normalDiscountAmount,
    normalDiscountAmount: priceMetrics.normalDiscountAmount,
    platform_discount_amount: priceMetrics.platformDiscountAmount,
    platformDiscountAmount: priceMetrics.platformDiscountAmount,
    ai_comparison_amount: priceMetrics.platformDiscountAmount,
    aiComparisonAmount: priceMetrics.platformDiscountAmount,
    normal_discount_rate: priceMetrics.normalDiscountRate,
    normalDiscountRate: priceMetrics.normalDiscountRate,
    discount_rate: priceMetrics.normalDiscountRate,
    discountRate: priceMetrics.normalDiscountRate,
    platform_discount_rate: priceMetrics.platformDiscountRate,
    platformDiscountRate: priceMetrics.platformDiscountRate,
    price_comparison_verified: priceOrder.comparisonVerified,
    priceComparisonVerified: priceOrder.comparisonVerified,
    price_comparison_status: priceOrder.status,
    priceComparisonStatus: priceOrder.status,
    comparison: {
      listPrice,
      platformLowestPrice,
      closedMallPrice,
      normalDiscountAmount: priceMetrics.normalDiscountAmount,
      platformDiscountAmount: priceMetrics.platformDiscountAmount,
      normalDiscountRate: priceMetrics.normalDiscountRate,
      platformDiscountRate: priceMetrics.platformDiscountRate,
      verified: priceOrder.comparisonVerified,
      status: priceOrder.status,
    },
    inventory: stock,
    stock,
    option_ids: optionIds,
    ...buildProductUrlFields(normalized.id, {
      businessNo: normalized.companyBusinessNoNormalized || normalized.companyBusinessNo,
    }),
    external_product_code: firstVariant?.externalProductCode || normalized.id,
    image_url: representative?.url ?? "",
    gallery: gallery.length ? gallery : representative?.url ? [representative.url] : [],
    delivery_available: normalized.fulfillment === "delivery" || normalized.fulfillment === "both",
    pickup_available: normalized.fulfillment === "pickup" || normalized.fulfillment === "both",
    shipping_fee_policy: normalized.shippingFeePolicy,
    shippingFeePolicy: normalized.shippingFeePolicy,
    shipping_fee_mode: normalized.shippingFeePolicy.mode,
    shipping_base_fee: normalized.shippingFeePolicy.baseFee,
    shipping_free_threshold: normalized.shippingFeePolicy.freeThreshold,
    shipping_remote_area_enabled: normalized.shippingFeePolicy.remoteAreaEnabled,
    shipping_remote_area_fee: normalized.shippingFeePolicy.remoteAreaFee,
    shipping_island_area_enabled: normalized.shippingFeePolicy.islandAreaEnabled,
    shipping_island_area_fee: normalized.shippingFeePolicy.islandAreaFee,
    detail_images: detailImages,
    detail_sections: normalized.detailSections.map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      body: section.body,
      asset_media_id: section.assetMediaId,
      asset_file_name: section.assetFileName,
      asset_url: section.assetUrl,
      asset_path: section.assetPath,
      sort_order: section.sortOrder,
    })),
    source_app: "company",
    source_channel: sourceChannel,
    source: "company_product_editor",
  };
}

export function buildProductOptionCmsRecords(draft: ProductDraft, sourceChannel = "company_product_edit_apply"): CmsRecord[] {
  const normalized = normalizeDraft(draft);

  return normalized.variants.map((variant) => {
    const optionId = catalogOptionId(normalized.id, variant.id);

    return {
      id: optionId,
      option_id: optionId,
      product_id: normalized.id,
      company_id: normalized.companyId,
      companyId: normalized.companyId,
      ...sellerIdentityFields(normalized),
      name: variant.optionName || variant.optionPath || "기본",
      option_name: variant.optionName || variant.optionPath || "기본",
      price_delta: toNumber(variant.additionalPrice),
      stock: toNumber(variant.stock),
      inventory: toNumber(variant.stock),
      status: variant.status === "숨김" ? "suspended" : "active",
      approval_status: "approved",
      product_approval_status: "approved",
      company_approval_status: "approved",
      external_option_code: variant.externalOptionCode,
      sku: variant.sku,
      barcode: variant.barcode,
      source_app: "company",
      source_channel: sourceChannel,
      source: "company_product_editor",
    };
  });
}

function catalogOptionId(productId: string, optionId: string) {
  const normalizedOptionId = optionId.trim() || "default";

  if (normalizedOptionId.startsWith(`${productId}-`) || normalizedOptionId.startsWith("opt-")) {
    return normalizedOptionId;
  }

  return `${productId}-${normalizedOptionId}`;
}

export function buildSuspendedProductOptionCmsRecords(
  productId: string,
  companyId: string,
  existingOptions: ProductOption[],
  activeOptionIds: string[],
): CmsRecord[] {
  const activeIdSet = new Set(activeOptionIds);

  return existingOptions
    .filter((option) => !activeIdSet.has(option.id))
    .map((option) => ({
      id: option.id,
      option_id: option.id,
      product_id: productId,
      company_id: companyId,
      companyId,
      name: option.name,
      option_name: option.name,
      price_delta: option.priceDelta,
      stock: 0,
      inventory: 0,
      status: "suspended",
      approval_status: "approved",
      product_approval_status: "approved",
      company_approval_status: "approved",
      source_app: "company",
      source_channel: "company_product_edit_apply",
      source: "company_product_editor",
    }));
}
