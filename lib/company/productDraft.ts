import type { CompanyProductCategory } from "@/data/companyProductCategories";
import type { CmsRecord } from "@/lib/firebase/contentRepository";

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
  normalDiscountRate: number;
  platformDiscountRate: number;
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
  role: "representative" | "detail" | "evidence" | "video";
  fileName: string;
  fileType: string;
  fileSize: number;
  url?: string;
  path?: string;
};

export type ProductDetailSection = {
  id: string;
  type: ProductDetailSectionType;
  title: string;
  body: string;
  assetFileName?: string;
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
  caution: string;
  pricing: ProductDraftPricing;
  optionGroups: ProductOptionGroup[];
  variants: ProductDraftVariant[];
  skus: ProductDraftSku[];
  detailSections: ProductDetailSection[];
  noticeFields: ProductNoticeField[];
  compliance: ProductDraftCompliance;
  media: ProductDraftMedia[];
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
    normalDiscountRate: 0,
    platformDiscountRate: 0,
    platformPriceInvalid: true,
    exposeBlocked: true,
  };
  const variant = defaultVariant(pricing);

  return {
    id: makeProductDraftId(companyId),
    companyId,
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
    saleStatus: "판매 준비",
    exposureStart: "",
    exposureEnd: "",
    summary: "",
    detailDescription: "",
    returnPolicy: "",
    asPolicy: "",
    deliveryPolicy: "",
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
    updatedAt: now,
  };
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
  const pricing = raw.pricing ?? createDefaultProductDraft(raw.companyId).pricing;
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
    modelName: raw.modelName ?? "",
    noticeTemplate: raw.noticeTemplate ?? "",
    optionGroups: raw.optionGroups?.length ? raw.optionGroups : createDefaultProductDraft(raw.companyId).optionGroups,
    detailSections: raw.detailSections?.length ? raw.detailSections : createDefaultProductDraft(raw.companyId).detailSections,
    noticeFields: raw.noticeFields?.length ? raw.noticeFields : defaultNoticeFields(),
    variants,
    skus: variants,
  };
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

export function evaluateProductDraftReadiness(draft: ProductDraft, pgReady: boolean) {
  const normalized = normalizeDraft(draft);
  const blockers: string[] = [];

  if (!pgReady) blockers.push("결제 설정이 최고관리자에서 확인되어야 승인 요청을 보낼 수 있습니다.");
  if (!normalized.productName.trim()) blockers.push("상품명은 필수입니다.");
  if (!normalized.brand.trim()) blockers.push("브랜드는 필수입니다.");
  if (!normalized.categoryId || !normalized.subcategory) blockers.push("A5 제공 카테고리와 소분류를 선택해야 합니다.");
  if (normalized.pricing.listPrice <= 0) blockers.push("정상가를 입력해야 합니다.");
  if (normalized.pricing.platformLowestPrice <= 0) blockers.push("플랫폼 최저가를 입력해야 합니다.");
  if (normalized.pricing.closedMallPrice <= 0) blockers.push("폐쇄몰 기본가를 입력해야 합니다.");
  if (normalized.pricing.platformPriceInvalid) blockers.push("플랫폼 최저가는 정상가보다 높을 수 없습니다.");
  if (normalized.pricing.exposeBlocked) blockers.push("가격 정책 기준을 충족하지 못했습니다.");
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
    if (toNumber(variant.normalPrice) <= 0) blockers.push(`${variant.optionPath} 정상가를 입력해야 합니다.`);
    if (toNumber(variant.platformLowestPrice) <= 0) blockers.push(`${variant.optionPath} 플랫폼 최저가를 입력해야 합니다.`);
    if (toNumber(variant.finalSalePrice) <= 0) blockers.push(`${variant.optionPath} 최종 판매가를 입력해야 합니다.`);
    if (variant.stock === "" || toNumber(variant.stock) < 0) blockers.push(`${variant.optionPath} 재고를 입력해야 합니다.`);
  }

  if (!normalized.compliance.sellerDisclosureCompleted) blockers.push("판매자 정보 확인이 필요합니다.");
  if (!normalized.compliance.productNoticeCompleted) blockers.push("상품정보제공고시 입력 완료가 필요합니다.");
  if (!normalized.noticeFields.every((field) => !field.required || field.value.trim())) blockers.push("필수 고시정보를 모두 입력해야 합니다.");
  if (!normalized.compliance.returnPolicyCompleted) blockers.push("반품/교환/AS/배송 정책 입력 완료가 필요합니다.");
  if (!normalized.compliance.prohibitedProductConfirmed) blockers.push("금지상품이 아님을 확인해야 합니다.");
  if (normalized.compliance.kcRequired && (!normalized.compliance.kcNumber.trim() || !normalized.compliance.evidenceReady)) {
    blockers.push("KC 대상 상품은 인증번호와 증빙 파일이 필요합니다.");
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
    caution: normalized.caution,
    pricing: normalized.pricing,
    option_groups: normalized.optionGroups,
    variants: normalized.variants,
    skus: normalized.variants,
    compliance: normalized.compliance,
    media: normalized.media,
    preview_checked_at: normalized.previewCheckedAt,
    submitted_at: status === "pending_approval" ? new Date().toISOString() : undefined,
  };
}
