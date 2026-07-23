"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ProductCategoryClassificationPanel,
  type ProductCategorySelection,
} from "@/components/company/ProductCategoryClassificationPanel";
import { ProductPricePolicyForm, type ProductPricePolicyValue } from "@/components/company/ProductPricePolicyForm";
import { companyProductCategories } from "@/data/companyProductCategories";
import {
  applyCategoryToDraft,
  buildProductCatalogCmsRecord,
  buildProductDraftCmsRecord,
  buildProductOptionCmsRecords,
  buildSuspendedProductOptionCmsRecords,
  buildVariantMatrix,
  calculateFinalSalePrice,
  COMPANY_PRODUCT_DRAFT_STORAGE_KEY,
  createProductDraftFromRegisteredProduct,
  createDefaultProductDraft,
  evaluateProductDraftReadiness,
  normalizeDraft,
  toNumber,
  withProductDraftSellerIdentity,
  type ProductDetailSection,
  type ProductDetailSectionType,
  type ProductDraft,
  type ProductDraftMedia,
  type ProductDraftStatus,
  type ProductDraftVariant,
  type ProductFulfillment,
  type ProductNoticeField,
  type ProductOptionGroup,
  type ProductOptionValue,
} from "@/lib/company/productDraft";
import { validateProductPriceOrder } from "@/lib/company/priceMetrics";

import { readPortalSession } from "@/lib/auth/session";

import {
  findLocalCompanySignupRequestForScope,
  type CompanySignupRequestPayload,
} from "@/lib/firebase/signupRequestRepository";
import { saveCompanyProduct, uploadCmsFile } from "@/lib/firebase/contentRepository";

import { formatCurrency } from "@/lib/utils/format";
import type { Company, Product, ProductOption } from "@/types/commerce";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type PendingFile = {
  mediaId: string;
  role: ProductDraftMedia["role"];
  file: File;
  sectionId?: string;
};

type PendingFiles = Record<string, PendingFile>;

const fulfillmentLabels: Record<ProductFulfillment, string> = {
  delivery: "택배 배송",
  pickup: "현장 수령",
  both: "현장 수령+택배",
  voucher: "예약/바우처",
};

const mediaLabels: Record<ProductDraftMedia["role"], string> = {
  representative: "대표 이미지 *",
  detail: "상세 이미지",
  evidence: "KC/인증 증빙",
  video: "상품 영상/GIF",
};

const sectionTypeLabels: Record<ProductDetailSectionType, string> = {
  image: "이미지",
  text: "텍스트",
  image_text: "이미지+텍스트",
  notice_table: "고시정보 표",
  components: "구성품",
  caution: "주의사항",
  video: "영상/GIF",
  divider: "구분선",
};

const optionPresetNames = ["색상", "사이즈", "용량", "구성", "향", "단계", "수량"];

const swatchColors = ["#111827", "#ffffff", "#f5f5dc", "#f4a7b9", "#9ca3af", "#60a5fa", "#34d399", "#f59e0b"];

type ProductRegistrationStep = "basic" | "category" | "detail" | "pricing" | "options" | "delivery" | "compliance";

const productRegistrationSteps: { id: ProductRegistrationStep; label: string; helper: string }[] = [
  { id: "basic", label: "기본 정보", helper: "상품명, 브랜드, 카테고리" },
  { id: "category", label: "카테고리", helper: "지정 카테고리 선택" },
  { id: "detail", label: "상세페이지", helper: "이미지, 상세 섹션" },
  { id: "pricing", label: "가격 정책", helper: "원판매가, 폐쇄몰 판매가" },
  { id: "options", label: "옵션/재고", helper: "옵션 조합, SKU" },
  { id: "delivery", label: "배송/반품", helper: "배송, AS 정책" },
];

function withDefaultCategory(draft: ProductDraft) {
  const normalized = normalizeDraft(draft);
  if (normalized.categoryId) return normalized;
  const category = companyProductCategories[0];
  return applyCategoryToDraft(normalized, category, category.subcategories[0]);
}

function readInitialDraft(companyId: string, editProduct?: Product, editProductOptions: ProductOption[] = []): ProductDraft {
  if (editProduct) return withDefaultCategory(createProductDraftFromRegisteredProduct(companyId, editProduct, editProductOptions));
  if (typeof window === "undefined") return withDefaultCategory(createDefaultProductDraft(companyId));

  try {
    const raw = window.localStorage.getItem(COMPANY_PRODUCT_DRAFT_STORAGE_KEY);
    if (!raw) return withDefaultCategory(createDefaultProductDraft(companyId));
    const parsed = normalizeDraft(JSON.parse(raw) as ProductDraft);
    if (parsed.companyId !== companyId) return withDefaultCategory(createDefaultProductDraft(companyId));
    return withDefaultCategory(parsed);
  } catch {
    return withDefaultCategory(createDefaultProductDraft(companyId));
  }
}

function inputClass() {
  return "rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500";
}

function compactInputClass() {
  return "h-10 min-w-28 rounded-md border border-slate-200 bg-white px-2 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500";
}

function required(label: string) {
  return (
    <>
      {label} <span className="text-red-600">*</span>
    </>
  );
}

function mediaLocalId(role: ProductDraftMedia["role"], file: File, index = 0, sequence = 0) {
  if (role !== "detail") return role;
  const safeName = file.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "image";
  return `detail-${sequence}-${index}-${safeName}`;
}

function mediaAccept(role: ProductDraftMedia["role"]) {
  if (role === "video") return "video/*,image/gif";
  if (role === "evidence") return "image/*,.pdf";
  return "image/*";
}

function shippingPolicyNumberValue(value: number) {
  return value > 0 ? String(value) : "";
}

function FieldShell({ label, children, span }: { label: React.ReactNode; children: React.ReactNode; span?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-normal text-slate-800 ${span ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-normal uppercase tracking-[0.14em] text-emerald-700">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-normal text-slate-950">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function ProductEditorAccordion({
  eyebrow,
  title,
  body,
  children,
  defaultOpen = true,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: "default" | "green";
}) {
  const toneClass = tone === "green" ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white";

  return (
    <details open={defaultOpen} className={`rounded-md border shadow-sm ${toneClass}`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4">
        <SectionHeader eyebrow={eyebrow} title={title} body={body} />
        <span className="mt-1 shrink-0 rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white">열기/닫기</span>
      </summary>
      <div className="border-t border-slate-100 p-4">
        {children}
      </div>
    </details>
  );
}

function ProductRegistrationLivePreview({
  draft,
  blockers,
  completionRate,

  isEditMode,
  mediaPreviewUrls,
  onPreviewChecked,
}: {
  draft: ProductDraft;
  blockers: string[];
  completionRate: number;

  isEditMode: boolean;
  mediaPreviewUrls: Record<string, string>;
  onPreviewChecked: () => void;
}) {
  const representative = draft.media.find((item) => item.role === "representative");
  const representativeUrl = representative ? mediaPreviewUrls[representative.id ?? representative.role] || representative.url : "";
  const visibleVariants = draft.variants.slice(0, 5);
  const visibleSections = draft.detailSections
    .filter((section) => section.title.trim() || section.body.trim() || section.assetFileName || section.assetUrl)
    .slice(0, 3);

  return (
    <aside className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-120px)] xl:overflow-auto">
      <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">폐쇄몰 미리보기</p>
            <h2 className="mt-1 text-xl font-normal text-slate-950">상품 등록 미리보기</h2>
          </div>
          <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-normal text-white">{completionRate}%</span>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-white text-center text-xs font-normal text-slate-400">
            {representativeUrl ? (
              <img src={representativeUrl} alt={draft.productName || representative?.fileName || "대표 이미지"} className="h-full w-full object-cover" />
            ) : (
              <span className="p-4">대표 이미지 미등록</span>
            )}
          </div>
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-normal text-emerald-700">{draft.brand || "브랜드 미입력"}</p>
              <span className="rounded-md bg-white px-2 py-1 text-[11px] font-normal text-slate-600 ring-1 ring-slate-200">
                {draft.categoryLabel || "카테고리 미선택"}
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-normal leading-tight text-slate-950">{draft.productName || "상품명 미입력"}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{draft.summary || "상품 요약 미입력"}</p>
            <p className="mt-4 text-3xl font-normal text-rose-600">{formatCurrency(draft.pricing.closedMallPrice)}</p>
            <div className="mt-3 grid gap-2 text-xs font-normal text-slate-700">
              <p className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-100">AI 가격 비교는 출처 검증 후 표시됩니다.</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-sm font-normal text-slate-950">상품 상세 상단</p>
          <div className="mt-3 grid gap-2 text-xs font-normal text-slate-600">
            <p>제조사: {draft.manufacturer || "미입력"}</p>
            <p>모델명: {draft.modelName || "미입력"}</p>
            <p>원산지: {draft.origin || "미입력"}</p>
            <p>분류: {[draft.categoryLabel, draft.subcategory].filter(Boolean).join(" / ") || "미선택"}</p>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-sm font-normal text-slate-950">옵션 선택 영역</p>
          <div className="mt-3 grid gap-2">
            {draft.optionGroups.length ? (
              draft.optionGroups.map((group) => (
                <div key={group.id} className="rounded-md bg-slate-50 p-2">
                  <p className="text-xs font-normal text-slate-600">{group.name || "옵션 그룹"}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.values.length ? (
                      group.values.slice(0, 6).map((value) => (
                        <span key={value.id} className="rounded-md bg-white px-2 py-1 text-[11px] font-normal text-slate-700 ring-1 ring-slate-200">
                          {value.label || "옵션값"}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-normal text-slate-400">옵션값 미입력</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-md bg-slate-50 p-3 text-xs font-normal text-slate-500">옵션 그룹을 추가하면 고객 선택 영역에 즉시 표시됩니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-sm font-normal text-slate-950">옵션별 판매정보</p>
          <div className="mt-3 grid gap-2">
            {visibleVariants.map((variant) => (
              <div key={variant.id} className="grid gap-1 rounded-md bg-slate-50 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-normal text-slate-950">{variant.optionPath || "기본 옵션"}</span>
                  <span className="font-normal text-rose-600">{formatCurrency(toNumber(variant.finalSalePrice))}</span>
                </div>
                <p className="font-normal text-slate-500">{toNumber(variant.stock) > 0 ? `재고 ${variant.stock}` : "품절/재고 미입력"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-sm font-normal text-slate-950">상세페이지 본문</p>
          <div className="mt-3 grid gap-2">
            {visibleSections.length ? (
              visibleSections.map((section) => {
                const sectionImageUrl = (section.assetMediaId ? mediaPreviewUrls[section.assetMediaId] : "") || section.assetUrl || "";

                return (
                <article key={section.id} className="rounded-md bg-slate-50 p-3">
                  {sectionImageUrl ? (
                    <div className="mb-2 overflow-hidden rounded-md bg-white">
                      <img
                        src={sectionImageUrl}
                        alt={section.title || section.assetFileName || "상세 이미지"}
                        className="max-h-44 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <h4 className="mt-1 text-sm font-normal text-slate-950">{section.title || "제목 미입력"}</h4>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{section.body || section.assetFileName || "내용 미입력"}</p>
                </article>
                );
              })
            ) : (
              <p className="rounded-md bg-slate-50 p-3 text-xs font-normal text-slate-500">상세 섹션을 작성하면 고객 상세 본문에 바로 반영됩니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-normal text-slate-950">등록 상태</p>
            <span className={`rounded-md px-2 py-1 text-[11px] font-normal ${blockers.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
              {isEditMode ? "수정 중" : blockers.length ? "확인 필요" : "등록 가능"}
            </span>
          </div>
          <p className="mt-2 text-xs font-normal leading-5 text-slate-500">필수 상품 정보가 준비되면 바로 등록할 수 있습니다.</p>
          <div className="mt-3 grid gap-2">
            {blockers.length ? (
              blockers.slice(0, 8).map((blocker) => (
                <p key={blocker} className="rounded-md bg-red-50 p-2 text-xs font-normal leading-5 text-red-700">
                  {blocker}
                </p>
              ))
            ) : (
              <p className="rounded-md bg-emerald-50 p-3 text-sm font-normal text-emerald-800">즉시 등록 가능한 상태입니다.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onPreviewChecked}
            className="mt-4 w-full rounded-md border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900"
          >
            {draft.previewCheckedAt ? "미리보기 다시 확인" : "미리보기 확인 완료"}
          </button>
        </div>
      </section>
    </aside>
  );
}

function directPublishBlockers(draft: ProductDraft) {
  const blockers = [
    !draft.productName.trim() ? "상품명은 필수입니다." : "",
    !draft.detailSections.some((section) => section.type !== "divider" && (section.title.trim() || section.body.trim() || section.assetFileName)) ? "상세페이지 섹션은 1개 이상 필요합니다." : "",
    !draft.variants.length ? "옵션은 1개 이상 필요합니다." : "",
    draft.variants.some((variant) => variant.stock === "" || toNumber(variant.stock) < 0) ? "옵션 재고는 0개 이상으로 입력해야 합니다." : "",
  ].filter(Boolean);

  blockers.push(...validateProductPriceOrder(draft.pricing).errors);
  for (const variant of draft.variants) {
    const priceOrder = validateProductPriceOrder({
      listPrice: toNumber(variant.normalPrice),
      platformLowestPrice: toNumber(variant.platformLowestPrice),
      closedMallPrice: toNumber(variant.finalSalePrice),
    });
    blockers.push(...priceOrder.errors.map((error) => `${variant.optionPath}: ${error}`));
  }

  return blockers;
}

function readSignupRequestForProduct(companyId: string) {
  if (typeof window === "undefined") return undefined;

  const session = readPortalSession("company");
  return findLocalCompanySignupRequestForScope(companyId, session?.businessNo);
}

function nextLocalId(prefix: string, existingIds: string[]) {
  let index = existingIds.length + 1;
  let candidate = `${prefix}-${index}`;
  while (existingIds.includes(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

function makeValueId(label: string, existingIds: string[]) {
  const slug = label.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  const prefix = slug || "option";
  let index = existingIds.length + 1;
  let candidate = `${prefix}-${index}`;
  while (existingIds.includes(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

export function CompanyProductRegistrationWorkspace({
  companyId,
  editProduct,
  editProductOptions = [],
  initialCompany,
}: {
  companyId: string;
  editProduct?: Product;
  editProductOptions?: ProductOption[];
  initialCompany?: Company;
}) {
  const isEditMode = Boolean(editProduct);
  const [signupRequest] = useState<CompanySignupRequestPayload | undefined>(() => readSignupRequestForProduct(companyId));
  const companySession = useMemo(() => readPortalSession("company"), []);
  const sellerIdentity = useMemo(
    () => ({
      businessNo: companySession?.businessNo ?? signupRequest?.businessRegistrationNumber,
      companyName: initialCompany?.name ?? companySession?.displayName ?? signupRequest?.companyName,
    }),
    [companySession?.businessNo, companySession?.displayName, initialCompany?.name, signupRequest?.businessRegistrationNumber, signupRequest?.companyName],
  );
  const stampDraftSeller = useCallback(
    (nextDraft: ProductDraft) => withProductDraftSellerIdentity(nextDraft, sellerIdentity),
    [sellerIdentity],
  );
  const [draft, setDraft] = useState<ProductDraft>(() =>
    withProductDraftSellerIdentity(readInitialDraft(companyId, editProduct, editProductOptions), {
      businessNo: signupRequest?.businessRegistrationNumber,
      companyName: initialCompany?.name ?? signupRequest?.companyName,
    }),
  );
  const [pendingFiles, setPendingFiles] = useState<PendingFiles>({});
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<Record<string, string>>({});
  const mediaPreviewUrlsRef = useRef<Record<string, string>>({});
  const mediaSequenceRef = useRef(0);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [activeStep, setActiveStep] = useState<ProductRegistrationStep>("basic");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkAdditionalPrice, setBulkAdditionalPrice] = useState("");
  const readiness = useMemo(() => evaluateProductDraftReadiness(draft), [draft]);
  const selectedCategory = companyProductCategories.find((category) => category.id === draft.categoryId);
  const completionCount = [
    Boolean(draft.productName.trim()),
    Boolean(draft.brand.trim()),
    Boolean(draft.categoryId),
    draft.media.some((item) => item.role === "representative"),
    draft.detailSections.some((item) => item.body.trim() || item.assetFileName),
    draft.variants.some((item) => item.sku.trim()),
    draft.noticeFields.every((field) => !field.required || field.value.trim()),
  ].filter(Boolean).length;
  const completionRate = Math.round((completionCount / 7) * 100);
  const activeStepIndex = Math.max(productRegistrationSteps.findIndex((step) => step.id === activeStep), 0);
  const activeStepMeta = productRegistrationSteps[activeStepIndex] ?? productRegistrationSteps[0];
  const previousStep = productRegistrationSteps[activeStepIndex - 1];
  const nextStep = productRegistrationSteps[activeStepIndex + 1];

  useEffect(() => {
    return () => {
      for (const url of Object.values(mediaPreviewUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);


  const handlePricingChange = useCallback((pricing: ProductPricePolicyValue) => {
    setDraft((current) => {
      const variants = current.variants.map((variant) => {
        const baseClosedMallPrice = String(pricing.closedMallPrice || "");
        const additionalPrice = variant.additionalPrice || "0";
        const finalSalePrice = calculateFinalSalePrice(baseClosedMallPrice, additionalPrice);

        return {
          ...variant,
          normalPrice: String(pricing.listPrice || ""),
          platformLowestPrice: String(pricing.platformLowestPrice || ""),
          baseClosedMallPrice,
          finalSalePrice,
          closedMallPrice: finalSalePrice,
        };
      });

      return normalizeDraft({
        ...current,
        pricing,
        variants,
        skus: variants,
        updatedAt: new Date().toISOString(),
      });
    });
  }, []);

  function setNormalizedDraft(next: ProductDraft) {
    setDraft(stampDraftSeller(normalizeDraft({ ...next, updatedAt: new Date().toISOString() })));
  }

  function updateDraft<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => normalizeDraft({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }

  function updateCompliance<K extends keyof ProductDraft["compliance"]>(key: K, value: ProductDraft["compliance"][K]) {
    setDraft((current) =>
      normalizeDraft({
        ...current,
        compliance: { ...current.compliance, [key]: value },
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function handleCategoryChange(selection: ProductCategorySelection) {
    setDraft((current) => applyCategoryToDraft(current, selection.category, selection.subcategory));
  }

  function addOptionGroup(name = "옵션명") {
    setDraft((current) => {
      const next: ProductOptionGroup = {
        id: nextLocalId("group", current.optionGroups.map((group) => group.id)),
        name,
        required: false,
        displayOrder: current.optionGroups.length + 1,
        values: [],
      };

      return normalizeDraft({ ...current, optionGroups: [...current.optionGroups, next], updatedAt: new Date().toISOString() });
    });
  }

  function updateOptionGroup(groupId: string, patch: Partial<ProductOptionGroup>) {
    setDraft((current) =>
      normalizeDraft({
        ...current,
        optionGroups: current.optionGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function removeOptionGroup(groupId: string) {
    setDraft((current) =>
      normalizeDraft({
        ...current,
        optionGroups: current.optionGroups.filter((group) => group.id !== groupId),
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function addOptionValue(groupId: string, label = "") {
    setDraft((current) =>
      normalizeDraft({
        ...current,
        optionGroups: current.optionGroups.map((group) => {
          if (group.id !== groupId) return group;
          const valueLabel = label || `옵션값 ${group.values.length + 1}`;
          const next: ProductOptionValue = {
            id: makeValueId(valueLabel, group.values.map((value) => value.id)),
            label: valueLabel,
            code: valueLabel.toUpperCase().replace(/\s+/g, "-"),
            displayOrder: group.values.length + 1,
          };
          return { ...group, values: [...group.values, next] };
        }),
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function updateOptionValue(groupId: string, valueId: string, patch: Partial<ProductOptionValue>) {
    setDraft((current) =>
      normalizeDraft({
        ...current,
        optionGroups: current.optionGroups.map((group) =>
          group.id === groupId
            ? { ...group, values: group.values.map((value) => (value.id === valueId ? { ...value, ...patch } : value)) }
            : group,
        ),
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function removeOptionValue(groupId: string, valueId: string) {
    setDraft((current) =>
      normalizeDraft({
        ...current,
        optionGroups: current.optionGroups.map((group) =>
          group.id === groupId ? { ...group, values: group.values.filter((value) => value.id !== valueId) } : group,
        ),
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function generateVariantMatrix() {
    const shouldContinue =
      draft.variants.length <= 1 ||
      !draft.variants.some((variant) => variant.sku || variant.stock || toNumber(variant.additionalPrice) > 0) ||
      window.confirm("옵션 조합을 다시 생성하면 현재 조합과 맞지 않는 SKU 행이 정리됩니다. 계속할까요?");

    if (!shouldContinue) return;

    const variants = buildVariantMatrix(draft.optionGroups, draft.pricing, draft.variants);
    setDraft((current) => normalizeDraft({ ...current, variants, skus: variants, updatedAt: new Date().toISOString() }));
  }

  function updateVariant(index: number, key: keyof ProductDraftVariant, value: string) {
    setDraft((current) => {
      const variants = current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) return variant;
        const next = { ...variant, [key]: value };

        if (key === "baseClosedMallPrice" || key === "additionalPrice") {
          const finalSalePrice = calculateFinalSalePrice(
            key === "baseClosedMallPrice" ? value : next.baseClosedMallPrice,
            key === "additionalPrice" ? value : next.additionalPrice,
          );
          next.finalSalePrice = finalSalePrice;
          next.closedMallPrice = finalSalePrice;
        }

        return next;
      });

      return normalizeDraft({ ...current, variants, skus: variants, updatedAt: new Date().toISOString() });
    });
  }

  function applyBulkToVariants() {
    setDraft((current) => {
      const variants = current.variants.map((variant) => {
        const additionalPrice = bulkAdditionalPrice !== "" ? bulkAdditionalPrice : variant.additionalPrice;
        const finalSalePrice = calculateFinalSalePrice(variant.baseClosedMallPrice, additionalPrice);

        return {
          ...variant,
          stock: bulkStock !== "" ? bulkStock : variant.stock,
          additionalPrice,
          finalSalePrice,
          closedMallPrice: finalSalePrice,
        };
      });

      return normalizeDraft({ ...current, variants, skus: variants, updatedAt: new Date().toISOString() });
    });
  }

  function addDetailSection(type: ProductDetailSectionType = "text") {
    const next: ProductDetailSection = {
      id: nextLocalId("section", draft.detailSections.map((section) => section.id)),
      type,
      title: "",
      body: "",
      sortOrder: draft.detailSections.length + 1,
    };
    updateDraft("detailSections", [...draft.detailSections, next]);
  }

  function updateDetailSection(sectionId: string, patch: Partial<ProductDetailSection>) {
    updateDraft(
      "detailSections",
      draft.detailSections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
    );
  }

  function removeDetailSection(sectionId: string) {
    updateDraft(
      "detailSections",
      draft.detailSections.filter((section) => section.id !== sectionId),
    );
  }

  function moveDetailSection(sectionId: string, direction: -1 | 1) {
    const index = draft.detailSections.findIndex((section) => section.id === sectionId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= draft.detailSections.length) return;
    const next = [...draft.detailSections];
    const [section] = next.splice(index, 1);
    next.splice(targetIndex, 0, section);
    updateDraft(
      "detailSections",
      next.map((item, order) => ({ ...item, sortOrder: order + 1 })),
    );
  }

  function updateNoticeField(fieldId: string, patch: Partial<ProductNoticeField>) {
    updateDraft(
      "noticeFields",
      draft.noticeFields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    );
  }

  function rememberMediaPreview(mediaId: string, file: File) {
    if (!file.type.startsWith("image/") || typeof URL === "undefined") return;
    const previewUrl = URL.createObjectURL(file);
    setMediaPreviewUrls((current) => {
      if (current[mediaId]) URL.revokeObjectURL(current[mediaId]);
      const next = { ...current, [mediaId]: previewUrl };
      mediaPreviewUrlsRef.current = next;
      return next;
    });
  }

  function mediaDisplayUrl(item?: ProductDraftMedia) {
    if (!item) return "";
    return mediaPreviewUrls[item.id ?? item.role] || item.url || "";
  }

  function handleMedia(role: ProductDraftMedia["role"], file?: File, index = 0, targetSectionId?: string) {
    if (!file) return;

    mediaSequenceRef.current += 1;
    const sequence = mediaSequenceRef.current;
    const mediaId = targetSectionId ? `detail-${targetSectionId}-${sequence}` : mediaLocalId(role, file, index, sequence);
    const sectionId = targetSectionId ?? (role === "detail" ? `section-${mediaId}` : undefined);
    rememberMediaPreview(mediaId, file);
    setPendingFiles((current) => {
      const next = { ...current };
      if (role !== "detail") {
        for (const [key, pending] of Object.entries(next)) {
          if (pending.role === role) delete next[key];
        }
      }
      next[mediaId] = { mediaId, role, file, sectionId };
      return next;
    });
    setDraft((current) =>
      normalizeDraft({
        ...current,
        media: [
          ...(role === "detail" ? current.media : current.media.filter((item) => item.role !== role)),
          {
            id: mediaId,
            role,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            sectionId,
          },
        ],
        detailSections: role === "detail"
          ? targetSectionId
            ? current.detailSections.map((section) =>
                section.id === targetSectionId
                  ? {
                      ...section,
                      type: section.type === "text" ? "image_text" : section.type,
                      assetMediaId: mediaId,
                      assetFileName: file.name,
                    }
                  : section,
              )
            : [
                ...current.detailSections,
                {
                  id: sectionId ?? `section-${mediaId}`,
                  type: "image",
                  title: file.name,
                  body: "",
                  assetMediaId: mediaId,
                  assetFileName: file.name,
                  sortOrder: current.detailSections.length + 1,
                },
              ]
          : current.detailSections,
        compliance: role === "evidence" ? { ...current.compliance, evidenceReady: true } : current.compliance,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function handleMediaFiles(role: ProductDraftMedia["role"], files?: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach((file, index) => handleMedia(role, file, index));
  }

  function handleDetailSectionMedia(sectionId: string, file?: File) {
    handleMedia("detail", file, 0, sectionId);
  }

  async function uploadPendingMedia(currentDraft: ProductDraft) {
    let media = [...currentDraft.media];
    let detailSections = [...currentDraft.detailSections];

    for (const pending of Object.values(pendingFiles)) {
      const { mediaId, role, file, sectionId } = pending;
      const metadata = media.find((item) => item.id === mediaId || (item.role === role && item.fileName === file.name));
      if (!metadata) continue;

      const uploaded = await uploadCmsFile("product_detail_pages", currentDraft.id, file, {
        companyId: currentDraft.companyId,
        productId: currentDraft.id,
      }, {
        companyBusinessNo: currentDraft.companyBusinessNo ?? "",
        companyBusinessNoNormalized: currentDraft.companyBusinessNoNormalized ?? "",
      });

      media = media.map((item) =>
        item.id === mediaId || (item.role === role && item.fileName === file.name)
          ? {
              ...metadata,
              id: mediaId,
              sectionId,
              url: uploaded.url,
              path: uploaded.path,
              fileType: file.type || uploaded.assetType,
            }
          : item,
      );

      if (role === "detail" && sectionId) {
        detailSections = detailSections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                assetMediaId: mediaId,
                assetFileName: metadata.fileName,
                assetUrl: uploaded.url,
                assetPath: uploaded.path,
              }
            : section,
        );
      }
    }

    return normalizeDraft({ ...currentDraft, media, detailSections });
  }

  async function saveDraft(nextStatus: ProductDraftStatus) {
    const nextDraft = stampDraftSeller(normalizeDraft({
      ...draft,
      status: nextStatus,
      previewCheckedAt: draft.previewCheckedAt,
      updatedAt: new Date().toISOString(),
    }));

    window.localStorage.setItem(COMPANY_PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    setNormalizedDraft(nextDraft);
    setSaveState({
      status: "saved",
      message: "\uC784\uC2DC \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4. \uC0C1\uD488 \uB4F1\uB85D \uC2DC \uC800\uC7A5\uC640 \uB178\uCD9C \uAC31\uC2E0\uC774 \uD568\uAED8 \uCC98\uB9AC\uB429\uB2C8\uB2E4.",
    });
  }
  async function publishProductNow() {
    const nextDraft = stampDraftSeller(normalizeDraft({
      ...draft,
      status: "draft",
      previewCheckedAt: draft.previewCheckedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const blockers = directPublishBlockers(nextDraft);

    if (blockers.length) {
      setSaveState({ status: "error", message: `상품 등록 전 ${blockers.length}개 항목을 확인해야 합니다. ${blockers[0]}` });
      return;
    }

    setSaveState({ status: "saving", message: "상품을 폐쇄몰과 모바일 쇼핑몰에 즉시 등록하는 중입니다." });

    try {
      const persistedDraft = await uploadPendingMedia(nextDraft);
      const publishedAt = new Date().toISOString();
      const detailRecord = {
        ...buildProductDraftCmsRecord(persistedDraft, "draft"),
        status: "approved",
        approval_status: "approved",
        product_approval_status: "approved",
        company_approval_status: "approved",
        source_channel: "company_product_direct_publish",
        published_at: publishedAt,
        approved_at: publishedAt,
      };
      const productRecord = {
        ...buildProductCatalogCmsRecord(persistedDraft, "company_product_direct_publish"),
        moderation_status: "registered",
        published_at: publishedAt,
        approved_at: publishedAt,
        updated_at_iso: publishedAt,
      };
      const optionRecords = buildProductOptionCmsRecords(persistedDraft, "company_product_direct_publish").map((record) => ({
        ...record,
        moderation_status: "registered",
        published_at: publishedAt,
        approved_at: publishedAt,
      }));

      await saveCompanyProduct({
        detailPage: detailRecord,
        product: productRecord,
        options: optionRecords,
        operation: "publish",
      });
      window.localStorage.setItem(COMPANY_PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(persistedDraft));
      setNormalizedDraft(persistedDraft);
      setPendingFiles({});
      setSaveState({
        status: "saved",
        message: "\uC0C1\uD488\uC744 \uB4F1\uB85D\uD588\uC2B5\uB2C8\uB2E4. \uD3D0\uC1C4\uBAB0\uACFC \uBAA8\uBC14\uC77C \uC0C1\uD488 \uBAA9\uB85D\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4.",      });
    } catch {
      setSaveState({ status: "error", message: "상품 등록에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요. 계속되면 고객센터에 문의해 주세요." });
    }
  }

  async function applyProductUpdate() {
    if (!isEditMode || !editProduct) return;

    const currentEditProduct = editProduct;
    const currentEditProductOptions = editProductOptions;
    const nextDraft = stampDraftSeller(normalizeDraft({
      ...draft,
      status: "draft",
      updatedAt: new Date().toISOString(),
    }));
    const blockers = directPublishBlockers(nextDraft);

    if (blockers.length) {
      setSaveState({ status: "error", message: `수정 적용 전 ${blockers.length}개 항목을 확인해야 합니다. ${blockers[0]}` });
      return;
    }

    setSaveState({ status: "saving", message: "등록 상품 수정 내용을 즉시 적용하는 중입니다." });

    try {
      const persistedDraft = await uploadPendingMedia(nextDraft);
      const appliedAt = new Date().toISOString();
      const detailRecord = {
        ...buildProductDraftCmsRecord(persistedDraft, "draft"),
        id: currentEditProduct.id,
        product_id: currentEditProduct.id,
        status: "approved",
        approval_status: "approved",
        product_approval_status: "approved",
        company_approval_status: "approved",
        source_channel: "company_product_direct_update",
        edit_mode: true,
        original_product_id: currentEditProduct.id,
        applied_at: appliedAt,
        approved_at: appliedAt,
      };
      const productRecord = {
        ...buildProductCatalogCmsRecord(persistedDraft, "company_product_direct_update"),
        id: currentEditProduct.id,
        product_id: currentEditProduct.id,
        moderation_status: "registered",
        edited_at: appliedAt,
        approved_at: appliedAt,
        updated_at_iso: appliedAt,
      };
      const optionRecords = buildProductOptionCmsRecords(persistedDraft, "company_product_direct_update").map((record) => ({
        ...record,
        product_id: currentEditProduct.id,
        moderation_status: "registered",
        edited_at: appliedAt,
        approved_at: appliedAt,
      }));
      const suspendedOptionRecords = buildSuspendedProductOptionCmsRecords(
        currentEditProduct.id,
        persistedDraft.companyId,
        currentEditProductOptions,
        optionRecords.map((record) => record.id),
      ).map((record) => ({
        ...record,
        source_channel: "company_product_direct_update",
        edited_at: appliedAt,
      }));

      await saveCompanyProduct({
        detailPage: detailRecord,
        product: productRecord,
        options: optionRecords,
        suspendedOptions: suspendedOptionRecords,
        operation: "update",
      });
      window.localStorage.setItem(COMPANY_PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(persistedDraft));
      setNormalizedDraft(persistedDraft);
      setPendingFiles({});
      setSaveState({
        status: "saved",
        message: "\uC0C1\uD488 \uC218\uC815 \uB0B4\uC6A9\uC774 \uC801\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uD3D0\uC1C4\uBAB0\uACFC \uBAA8\uBC14\uC77C \uC0C1\uD488 \uC0C1\uC138\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4.",      });
    } catch {
      setSaveState({
        status: "error",
        message: "상품 수정에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요. 계속되면 고객센터에 문의해 주세요.",
      });
    }
  }

  return (
    <div className="grid gap-5 pb-24 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="grid min-w-0 gap-5">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-normal uppercase tracking-[0.14em] text-emerald-700">
              {isEditMode ? "상품 수정 2.0" : "상품 등록 2.0"}
            </p>
            <h1 className="mt-1 text-2xl font-normal text-slate-950">{isEditMode ? "등록 상품 수정" : "기업 상품 등록"}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isEditMode
                ? "이미 등록된 상품의 이미지, 상세페이지, 옵션 조합 SKU, 가격, 재고를 단계별로 수정하고 폐쇄몰/모바일 상품 상세에 바로 적용합니다."
                : "필수 정보, 상세페이지, 가격, 옵션/재고, 배송 정책만 단계별로 입력하면 폐쇄몰과 모바일 쇼핑몰에 즉시 등록됩니다. KC/서류는 운영 보조 자료로 따로 관리합니다."}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-normal text-slate-500">등록 준비도</p>
            <p className="mt-1 text-2xl font-normal text-slate-950">{completionRate}%</p>
            <p className={`mt-2 text-sm font-normal ${readiness.blockers.length ? "text-red-700" : "text-emerald-700"}`}>
              {isEditMode ? "등록 상품 수정 중" : readiness.blockers.length ? `확인 필요 ${readiness.blockers.length}개` : "상품 등록 가능"}
            </p>
            <p className="mt-1 text-xs font-normal leading-5 text-slate-500">상품 정보와 이미지를 확인한 뒤 등록해 주세요.</p>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-md bg-slate-50 p-3">
          <div>
            <p className="text-[11px] font-normal tracking-[0.14em] text-emerald-700">현재 단계</p>
            <h2 className="mt-1 text-lg font-normal text-slate-950">{activeStepMeta.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{activeStepMeta.helper}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => previousStep && setActiveStep(previousStep.id)}
              disabled={!previousStep}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => nextStep && setActiveStep(nextStep.id)}
              disabled={!nextStep}
              className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
        <div role="tablist" aria-label="상품 등록 단계" className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {productRegistrationSteps.map((step, index) => {
            const active = activeStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveStep(step.id)}
                className={`min-h-16 rounded-md border px-3 py-2 text-left transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-white"
                }`}
              >
                <span className="text-[11px] font-normal tracking-[0.12em] text-slate-400">{index + 1}단계</span>
                <span className="mt-1 block text-sm font-normal">{step.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{step.helper}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeStep === "basic" ? (
      <>
      <ProductEditorAccordion eyebrow="1단계" title="기본정보" body="상품명, 브랜드, 제조사, 모델명은 고객 노출과 외부 연동 기준값으로 사용됩니다.">
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FieldShell label={required("상품명")}>
            <input value={draft.productName} onChange={(event) => updateDraft("productName", event.target.value)} className={inputClass()} placeholder="예: 프리미엄 수유 쿠션" />
          </FieldShell>
          <FieldShell label={required("브랜드")}>
            <input value={draft.brand} onChange={(event) => updateDraft("brand", event.target.value)} className={inputClass()} placeholder="예: with.baby" />
          </FieldShell>
          <FieldShell label="제조사">
            <input value={draft.manufacturer} onChange={(event) => updateDraft("manufacturer", event.target.value)} className={inputClass()} />
          </FieldShell>
          <FieldShell label="수입/책임판매업자">
            <input value={draft.importer} onChange={(event) => updateDraft("importer", event.target.value)} className={inputClass()} />
          </FieldShell>
          <FieldShell label="원산지">
            <input value={draft.origin} onChange={(event) => updateDraft("origin", event.target.value)} className={inputClass()} />
          </FieldShell>
          <FieldShell label="모델명">
            <input value={draft.modelName} onChange={(event) => updateDraft("modelName", event.target.value)} className={inputClass()} placeholder="모델명 또는 품번" />
          </FieldShell>
          <FieldShell label="요약 설명" span="lg:col-span-2">
            <textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} className={`${inputClass()} min-h-24`} placeholder="상품 카드와 상세 상단에 사용할 짧은 설명" />
          </FieldShell>
        </div>
      </ProductEditorAccordion>

      </>
      ) : null}

      {activeStep === "category" ? (
      <>
      <ProductEditorAccordion
        eyebrow="2단계"
        title="카테고리 선택"
        body="자동 분류가 아니라 지정된 카테고리 중 하나를 선택합니다. 선택한 카테고리는 상품 목록, 폐쇄몰, 모바일 둘러보기, 브랜드관 분류에 그대로 반영됩니다."
        tone="green"
      >
        <div className="mt-4">
          <ProductCategoryClassificationPanel initialCategoryId={draft.categoryId || undefined} onSelectionChange={handleCategoryChange} />
        </div>
      </ProductEditorAccordion>

      </>
      ) : null}

      {activeStep === "detail" ? (
      <ProductEditorAccordion eyebrow="3단계" title="상세페이지 빌더" body="대표 이미지, 상세 섹션, 고시 및 주의사항을 실시간 미리보기와 함께 구성합니다.">
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {(Object.keys(mediaLabels) as ProductDraftMedia["role"][]).map((role) => {
            const currentItems = draft.media.filter((item) => item.role === role);
            const current = currentItems.at(-1);
            const currentUrl = mediaDisplayUrl(current);
            return (
              <label key={role} className="grid min-h-36 cursor-pointer gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-normal text-slate-800">
                {mediaLabels[role]}
                <input
                  type="file"
                  className="hidden"
                  accept={mediaAccept(role)}
                  multiple={role === "detail"}
                  onChange={(event) => {
                    handleMediaFiles(role, event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <span className="grid min-h-20 place-items-center overflow-hidden rounded-md bg-white text-center text-xs font-normal text-slate-500 ring-1 ring-slate-200">
                  {currentUrl && current?.fileType.startsWith("image/") ? (
                    <img src={currentUrl} alt={current.fileName} className="h-24 w-full object-cover" />
                  ) : (
                    <span className="px-3">{current?.fileName ?? "파일 선택"}</span>
                  )}
                </span>
                {role === "detail" && currentItems.length > 0 ? (
                  <span className="text-xs font-normal text-slate-500">상세 이미지 {currentItems.length}장</span>
                ) : null}
              </label>
            );
          })}
        </div>

        {draft.detailSections.some((section) => section.assetFileName || section.assetUrl || section.assetMediaId) ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-normal text-slate-950">상세 이미지 목록</h3>
                <p className="mt-1 text-sm font-normal text-slate-500">업로드한 순서대로 상품 상세보기에서 세로로 이어집니다.</p>
              </div>
              <button type="button" onClick={() => updateDraft("previewCheckedAt", new Date().toISOString())} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-normal text-white">
                상세보기 미리보기 확인
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {draft.detailSections
                .filter((section) => section.assetFileName || section.assetUrl || section.assetMediaId)
                .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
                .map((section, index) => {
                  const sectionImageUrl = (section.assetMediaId ? mediaPreviewUrls[section.assetMediaId] : "") || section.assetUrl || "";

                  return (
                    <article key={section.id} className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <div className="aspect-[4/3] bg-white">
                        {sectionImageUrl ? (
                          <img src={sectionImageUrl} alt={section.assetFileName || `상세 이미지 ${index + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center px-3 text-center text-xs font-normal text-slate-400">{section.assetFileName || "업로드 대기"}</div>
                        )}
                      </div>
                      <div className="grid gap-2 p-3">
                        <p className="truncate text-sm font-normal text-slate-950">{index + 1}. {section.assetFileName || section.title || "상세 이미지"}</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => moveDetailSection(section.id, -1)} disabled={index === 0} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 disabled:opacity-40">
                            위로
                          </button>
                          <button type="button" onClick={() => moveDetailSection(section.id, 1)} disabled={index === draft.detailSections.length - 1} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 disabled:opacity-40">
                            아래로
                          </button>
                          <button type="button" onClick={() => removeDetailSection(section.id)} className="rounded-md bg-red-50 px-3 py-2 text-xs font-normal text-red-700 ring-1 ring-red-200">
                            삭제
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-normal text-slate-950">상세 섹션</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(sectionTypeLabels) as ProductDetailSectionType[]).filter((type) => type !== "divider").map((type) => (
                <button key={type} type="button" onClick={() => addDetailSection(type)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-normal text-slate-700">
                  {sectionTypeLabels[type]} 추가
                </button>
              ))}
            </div>
          </div>
          {draft.detailSections.map((section, index) => {
            const sectionImageUrl = (section.assetMediaId ? mediaPreviewUrls[section.assetMediaId] : "") || section.assetUrl || "";

            return (
            <div key={section.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[180px_1fr_1.5fr_180px]">
              <select value={section.type} onChange={(event) => updateDetailSection(section.id, { type: event.target.value as ProductDetailSectionType })} className={inputClass()}>
                {Object.entries(sectionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input value={section.title} onChange={(event) => updateDetailSection(section.id, { title: event.target.value })} className={inputClass()} placeholder="섹션 제목" />
              <div className="grid gap-2">
                {sectionImageUrl ? (
                  <img
                    src={sectionImageUrl}
                    alt={section.assetFileName || section.title || "상세 이미지"}
                    className="max-h-40 w-full rounded-md bg-white object-cover ring-1 ring-slate-200"
                  />
                ) : null}
                <textarea value={section.body} onChange={(event) => updateDetailSection(section.id, { body: event.target.value })} className={`${inputClass()} min-h-20`} placeholder="상세 설명, 구성품, 주의사항" />
                <label className="inline-flex w-fit cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700">
                  이미지 연결
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(event) => {
                      handleDetailSectionMedia(section.id, event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => moveDetailSection(section.id, -1)} disabled={index === 0} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-normal disabled:opacity-40">
                  위
                </button>
                <button type="button" onClick={() => moveDetailSection(section.id, 1)} disabled={index === draft.detailSections.length - 1} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-normal disabled:opacity-40">
                  아래
                </button>
                <button type="button" onClick={() => removeDetailSection(section.id)} className="rounded-md bg-red-50 px-3 py-2 text-xs font-normal text-red-700 ring-1 ring-red-200">
                  삭제
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </ProductEditorAccordion>

      ) : null}

      {activeStep === "pricing" ? (
      <ProductEditorAccordion eyebrow="4단계" title="가격 정책" body="폐쇄몰 판매가는 그대로 유지하고 원판매가·오픈몰가 후보는 출처 검증 후 AI 가격 비교에 사용합니다.">
      <ProductPricePolicyForm
        initialPricing={draft.pricing}
        onPricingChange={handlePricingChange}
        productName={draft.productName}
        brandName={draft.brand}
        categoryLabel={[draft.categoryLabel, draft.subcategory].filter(Boolean).join(" / ")}
      />
      </ProductEditorAccordion>

      ) : null}

      {activeStep === "options" ? (
      <ProductEditorAccordion eyebrow="5단계" title="옵션 조합 SKU" body="색상, 사이즈, 용량, 구성 같은 옵션 그룹을 만들고 조합 SKU를 자동 생성합니다. 옵션마다 추가금, 최종 폐쇄몰 판매가, 재고를 따로 관리합니다.">
        <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="grid content-start gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-normal text-slate-950">옵션 프리셋</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedCategory?.optionPresets ?? optionPresetNames).map((name) => (
                  <button key={name} type="button" onClick={() => addOptionGroup(name)} className="rounded-md bg-white px-3 py-2 text-xs font-normal text-slate-700 ring-1 ring-slate-200">
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {draft.optionGroups.map((group) => (
              <div key={group.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <input value={group.name} onChange={(event) => updateOptionGroup(group.id, { name: event.target.value })} className={compactInputClass()} />
                    <button type="button" onClick={() => removeOptionGroup(group.id)} className="rounded-md bg-red-50 px-3 py-2 text-xs font-normal text-red-700 ring-1 ring-red-200">
                      그룹 삭제
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-normal text-slate-600">
                    <input type="checkbox" checked={group.required} onChange={(event) => updateOptionGroup(group.id, { required: event.target.checked })} />
                    필수 옵션
                  </label>
                </div>
                <div className="mt-3 grid gap-2">
                  {group.values.map((value) => (
                    <div key={value.id} className="grid gap-2 rounded-md bg-slate-50 p-2">
                      <div className="grid grid-cols-[1fr_90px_auto] gap-2">
                        <input value={value.label} onChange={(event) => updateOptionValue(group.id, value.id, { label: event.target.value })} className={compactInputClass()} />
                        <input value={value.code} onChange={(event) => updateOptionValue(group.id, value.id, { code: event.target.value })} className={compactInputClass()} />
                        <button type="button" onClick={() => removeOptionValue(group.id, value.id)} className="rounded-md border border-slate-200 px-3 text-xs font-normal">
                          삭제
                        </button>
                      </div>
                      {group.name.includes("색상") ? (
                        <div className="flex flex-wrap gap-1">
                          {swatchColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              aria-label={color}
                              onClick={() => updateOptionValue(group.id, value.id, { swatchColor: color })}
                              className={`h-6 w-6 rounded-full border ${value.swatchColor === color ? "border-slate-950 ring-2 ring-slate-300" : "border-slate-300"}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" onClick={() => addOptionValue(group.id)} className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-normal text-slate-600">
                    옵션값 추가
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={generateVariantMatrix} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
              옵션 조합 SKU 생성
            </button>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]">
              <input value={bulkStock} onChange={(event) => setBulkStock(event.target.value)} className={inputClass()} inputMode="numeric" placeholder="일괄 재고" />
              <input value={bulkAdditionalPrice} onChange={(event) => setBulkAdditionalPrice(event.target.value)} className={inputClass()} inputMode="numeric" placeholder="일괄 추가금" />
              <button type="button" onClick={applyBulkToVariants} className="rounded-md bg-white px-4 py-3 text-sm font-normal text-slate-900 ring-1 ring-slate-200">
                일괄 적용
              </button>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-[1280px] border-collapse bg-white text-left text-sm">
                <thead className="bg-slate-100 text-xs font-normal text-slate-500">
                  <tr>
                    {["옵션 조합", "SKU *", "바코드", "원판매가 *", "오픈몰 판매가 *", "폐쇄몰 판매가 *", "추가금", "최종 폐쇄몰 판매가", "재고 *", "안전재고", "무게", "외부 상품코드", "외부 옵션코드", "상태"].map((item) => (
                      <th key={item} className="whitespace-nowrap px-3 py-3">{item}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draft.variants.map((variant, index) => (
                    <tr key={variant.id}>
                      <td className="px-3 py-2 font-normal text-slate-950">{variant.optionPath}</td>
                      <td className="px-3 py-2"><input value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.barcode} onChange={(event) => updateVariant(index, "barcode", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.normalPrice} onChange={(event) => updateVariant(index, "normalPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.platformLowestPrice} onChange={(event) => updateVariant(index, "platformLowestPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.baseClosedMallPrice} onChange={(event) => updateVariant(index, "baseClosedMallPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.additionalPrice} onChange={(event) => updateVariant(index, "additionalPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2">
                        <p className="font-normal text-rose-600">{formatCurrency(toNumber(variant.finalSalePrice))}</p>
                        <p className="mt-1 text-xs font-normal text-slate-500">AI 가격 비교 확인 전</p>
                      </td>
                      <td className="px-3 py-2"><input value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.safetyStock} onChange={(event) => updateVariant(index, "safetyStock", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.weight} onChange={(event) => updateVariant(index, "weight", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.externalProductCode} onChange={(event) => updateVariant(index, "externalProductCode", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.externalOptionCode} onChange={(event) => updateVariant(index, "externalOptionCode", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2">
                        <select value={variant.status} onChange={(event) => updateVariant(index, "status", event.target.value)} className={compactInputClass()}>
                          {["판매 가능", "품절", "숨김"].map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ProductEditorAccordion>

      ) : null}

      {activeStep === "delivery" ? (
      <ProductEditorAccordion eyebrow="6단계" title="배송/반품/AS" body="고객 상세페이지와 기업 주문 처리 기준으로 사용하는 정책입니다." defaultOpen={false}>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FieldShell label="배송/수령 방식">
            <select value={draft.fulfillment} onChange={(event) => updateDraft("fulfillment", event.target.value as ProductFulfillment)} className={inputClass()}>
              {Object.entries(fulfillmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </FieldShell>
          <FieldShell label="판매 상태">
            <select value={draft.saleStatus} onChange={(event) => updateDraft("saleStatus", event.target.value as ProductDraft["saleStatus"])} className={inputClass()}>
              {["판매 준비", "판매 가능", "숨김"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </FieldShell>
          <FieldShell label="배송비">
            <select
              value={draft.shippingFeePolicy.mode}
              onChange={(event) => updateDraft("shippingFeePolicy", { ...draft.shippingFeePolicy, mode: event.target.value === "paid" ? "paid" : "free" })}
              className={inputClass()}
            >
              <option value="free">무료배송</option>
              <option value="paid">유료배송</option>
            </select>
          </FieldShell>
          <FieldShell label="기본 배송비">
            <input
              value={shippingPolicyNumberValue(draft.shippingFeePolicy.baseFee)}
              onChange={(event) => updateDraft("shippingFeePolicy", { ...draft.shippingFeePolicy, baseFee: toNumber(event.target.value) })}
              inputMode="numeric"
              className={inputClass()}
              placeholder="예: 3000"
            />
          </FieldShell>
          <FieldShell label="무료배송 기준금액">
            <input
              value={shippingPolicyNumberValue(draft.shippingFeePolicy.freeThreshold)}
              onChange={(event) => updateDraft("shippingFeePolicy", { ...draft.shippingFeePolicy, freeThreshold: toNumber(event.target.value) })}
              inputMode="numeric"
              className={inputClass()}
              placeholder="예: 50000"
            />
          </FieldShell>
          <FieldShell label="도서산간 추가 배송비">
            <input
              value={shippingPolicyNumberValue(draft.shippingFeePolicy.remoteAreaFee)}
              onChange={(event) => updateDraft("shippingFeePolicy", { ...draft.shippingFeePolicy, remoteAreaFee: toNumber(event.target.value), remoteAreaEnabled: true })}
              inputMode="numeric"
              className={inputClass()}
              placeholder="예: 3000"
            />
          </FieldShell>
          <FieldShell label="제주/도서 추가 배송비">
            <input
              value={shippingPolicyNumberValue(draft.shippingFeePolicy.islandAreaFee)}
              onChange={(event) => updateDraft("shippingFeePolicy", { ...draft.shippingFeePolicy, islandAreaFee: toNumber(event.target.value), islandAreaEnabled: true })}
              inputMode="numeric"
              className={inputClass()}
              placeholder="예: 5000"
            />
          </FieldShell>
          <div className="rounded-md bg-slate-50 p-3 text-sm font-normal leading-6 text-slate-600 lg:col-span-2">
            고객이 QR 결제 화면에서 주소를 입력하면 제주, 도서, 산간 지역 키워드를 기준으로 추가 배송비가 자동 반영됩니다.
          </div>
          <FieldShell label={required("배송 정책")}>
            <textarea value={draft.deliveryPolicy} onChange={(event) => updateDraft("deliveryPolicy", event.target.value)} className={`${inputClass()} min-h-24`} />
          </FieldShell>
          <FieldShell label={required("반품/교환 정책")}>
            <textarea value={draft.returnPolicy} onChange={(event) => updateDraft("returnPolicy", event.target.value)} className={`${inputClass()} min-h-24`} />
          </FieldShell>
          <FieldShell label="AS 정책">
            <textarea value={draft.asPolicy} onChange={(event) => updateDraft("asPolicy", event.target.value)} className={`${inputClass()} min-h-24`} />
          </FieldShell>
          <FieldShell label="주의사항">
            <textarea value={draft.caution} onChange={(event) => updateDraft("caution", event.target.value)} className={`${inputClass()} min-h-24`} />
          </FieldShell>
        </div>
      </ProductEditorAccordion>

      ) : null}

      {activeStep === "compliance" ? (
      <div className="order-last grid gap-5">

        <ProductEditorAccordion eyebrow="최종 확인" title="고시정보/KC/증빙" body="상품 등록을 막지는 않지만, 운영 중 필요한 고시정보와 증빙을 관리합니다." defaultOpen={false}>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {draft.noticeFields.map((field) => (
            <FieldShell key={field.id} label={field.required ? required(field.label) : field.label}>
              <input value={field.value} onChange={(event) => updateNoticeField(field.id, { value: event.target.value })} className={inputClass()} />
            </FieldShell>
          ))}
        </div>
        <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
          {[
            ["sellerDisclosureCompleted", "판매자 정보 확인 완료"],
            ["productNoticeCompleted", "상품정보제공고시 입력 완료"],
            ["returnPolicyCompleted", "반품/교환/AS 정책 입력 완료"],
            ["prohibitedProductConfirmed", "금지상품 아님 확인"],
            ["kcRequired", "KC/인증 대상 상품"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm font-normal text-slate-800">
              <input
                type="checkbox"
                checked={Boolean(draft.compliance[key as keyof ProductDraft["compliance"]])}
                onChange={(event) => updateCompliance(key as keyof ProductDraft["compliance"], event.target.checked)}
              />
              {label}
            </label>
          ))}
          <FieldShell label="KC/인증번호">
            <input value={draft.compliance.kcNumber} onChange={(event) => updateCompliance("kcNumber", event.target.value)} className={inputClass()} placeholder="대상 상품일 때 필수" />
          </FieldShell>
        </div>
        </ProductEditorAccordion>
      </div>

      ) : null}

      </div>

      <ProductRegistrationLivePreview
        draft={draft}
        blockers={readiness.blockers}
        completionRate={completionRate}

        isEditMode={isEditMode}
        mediaPreviewUrls={mediaPreviewUrls}
        onPreviewChecked={() => updateDraft("previewCheckedAt", new Date().toISOString())}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-normal ${saveState.status === "error" ? "text-red-700" : saveState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
            {saveState.message || `등록 준비도 ${completionRate}% / 옵션 ${draft.variants.length}개 / 확인 필요 ${readiness.blockers.length}개`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => saveDraft("draft")} disabled={saveState.status === "saving"} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 disabled:opacity-50">
              {isEditMode ? "수정 임시 저장" : "임시 저장"}
            </button>
            {isEditMode ? (
              <button
                type="button"
                onClick={() => void applyProductUpdate()}
                disabled={saveState.status === "saving"}
                className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                수정 적용
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void publishProductNow()}
                disabled={saveState.status === "saving"}
                className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                즉시 등록
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
