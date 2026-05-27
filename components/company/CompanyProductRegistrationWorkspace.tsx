"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ProductCategoryClassificationPanel,
  type ProductCategorySelection,
} from "@/components/company/ProductCategoryClassificationPanel";
import { CertificationEvidenceUploader } from "@/components/company/CertificationEvidenceUploader";
import { LegalNoticeChecklist } from "@/components/company/LegalNoticeChecklist";
import { ProductPricePolicyForm, type ProductPricePolicyValue } from "@/components/company/ProductPricePolicyForm";
import { ReturnPolicyForm } from "@/components/company/ReturnPolicyForm";
import { SellerDisclosureForm } from "@/components/company/SellerDisclosureForm";
import { companyProductCategories } from "@/data/companyProductCategories";
import { mockCompanies } from "@/data/mockCompanies";
import {
  applyCategoryToDraft,
  buildProductDraftCmsRecord,
  buildVariantMatrix,
  calculateFinalSalePrice,
  COMPANY_PRODUCT_DRAFT_STORAGE_KEY,
  createDefaultProductDraft,
  evaluateProductDraftReadiness,
  normalizeDraft,
  toNumber,
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
import { saveCmsRecord, uploadCmsFile } from "@/lib/firebase/contentRepository";
import { getCompanyPgProfile } from "@/lib/payments/infinySettlementPolicy";
import { formatCurrency } from "@/lib/utils/format";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type PendingFiles = Partial<Record<ProductDraftMedia["role"], File>>;

const fulfillmentLabels: Record<ProductFulfillment, string> = {
  delivery: "택배 중심",
  pickup: "현장수령 중심",
  both: "현장수령+택배",
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
  components: "구성품 표",
  caution: "주의사항",
  video: "영상/GIF",
  divider: "구분선",
};

const optionPresetNames = ["색상", "사이즈", "용량", "구성", "향", "타입", "단계", "수량"];

const swatchColors = ["#111827", "#ffffff", "#f5f5dc", "#f4a7b9", "#9ca3af", "#60a5fa", "#34d399", "#f59e0b"];

function withDefaultCategory(draft: ProductDraft) {
  const normalized = normalizeDraft(draft);
  if (normalized.categoryId) return normalized;
  const category = companyProductCategories[0];
  return applyCategoryToDraft(normalized, category, category.subcategories[0]);
}

function readInitialDraft(companyId: string): ProductDraft {
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
  return "rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500";
}

function compactInputClass() {
  return "h-10 min-w-28 rounded-md border border-slate-200 bg-white px-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500";
}

function required(label: string) {
  return (
    <>
      {label} <span className="text-red-600">*</span>
    </>
  );
}

function FieldShell({ label, children, span }: { label: React.ReactNode; children: React.ReactNode; span?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-black text-slate-800 ${span ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function statusLabel(status: ProductDraftStatus) {
  return status === "pending_approval" ? "승인 요청" : "임시 저장";
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
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "");
  const prefix = slug || "option";
  let index = existingIds.length + 1;
  let candidate = `${prefix}-${index}`;
  while (existingIds.includes(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

export function CompanyProductRegistrationWorkspace({ companyId }: { companyId: string }) {
  const [draft, setDraft] = useState<ProductDraft>(() => readInitialDraft(companyId));
  const [pendingFiles, setPendingFiles] = useState<PendingFiles>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [bulkStock, setBulkStock] = useState("");
  const [bulkAdditionalPrice, setBulkAdditionalPrice] = useState("");
  const pgProfile = getCompanyPgProfile(companyId, mockCompanies);
  const pgReady = pgProfile.merchantStatus === "active";
  const readiness = useMemo(() => evaluateProductDraftReadiness(draft, pgReady), [draft, pgReady]);
  const selectedCategory = companyProductCategories.find((category) => category.id === draft.categoryId);
  const completionCount = [
    Boolean(draft.productName.trim()),
    Boolean(draft.brand.trim()),
    Boolean(draft.categoryId),
    draft.media.some((item) => item.role === "representative"),
    draft.detailSections.some((item) => item.body.trim() || item.assetFileName),
    draft.variants.some((item) => item.sku.trim()),
    draft.noticeFields.every((field) => !field.required || field.value.trim()),
    pgReady,
  ].filter(Boolean).length;
  const completionRate = Math.round((completionCount / 8) * 100);

  const handlePricingChange = useCallback((pricing: ProductPricePolicyValue) => {
    setDraft((current) => {
      const variants = current.variants.map((variant) => {
        const baseClosedMallPrice = variant.baseClosedMallPrice || String(pricing.closedMallPrice || "");
        const additionalPrice = variant.additionalPrice || "0";
        const finalSalePrice = calculateFinalSalePrice(baseClosedMallPrice, additionalPrice);

        return {
          ...variant,
          normalPrice: variant.normalPrice || String(pricing.listPrice || ""),
          platformLowestPrice: variant.platformLowestPrice || String(pricing.platformLowestPrice || ""),
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
    setDraft(normalizeDraft({ ...next, updatedAt: new Date().toISOString() }));
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

  function handleMedia(role: ProductDraftMedia["role"], file?: File) {
    if (!file) return;

    setPendingFiles((current) => ({ ...current, [role]: file }));
    setDraft((current) =>
      normalizeDraft({
        ...current,
        media: [
          ...current.media.filter((item) => item.role !== role),
          {
            role,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
          },
        ],
        compliance: role === "evidence" ? { ...current.compliance, evidenceReady: true } : current.compliance,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  async function uploadPendingMedia(currentDraft: ProductDraft) {
    let media = [...currentDraft.media];

    for (const [role, file] of Object.entries(pendingFiles) as Array<[ProductDraftMedia["role"], File]>) {
      const metadata = media.find((item) => item.role === role && item.fileName === file.name);
      if (!metadata) continue;

      const uploaded = await uploadCmsFile("product_detail_pages", currentDraft.id, file, {
        companyId: currentDraft.companyId,
        productId: currentDraft.id,
      });

      media = [
        ...media.filter((item) => item.role !== role),
        {
          ...metadata,
          url: uploaded.url,
          path: uploaded.path,
          fileType: file.type || uploaded.assetType,
        },
      ];
    }

    return normalizeDraft({ ...currentDraft, media });
  }

  async function saveDraft(nextStatus: ProductDraftStatus) {
    const nextDraft = normalizeDraft({
      ...draft,
      status: nextStatus,
      previewCheckedAt: nextStatus === "pending_approval" ? draft.previewCheckedAt || new Date().toISOString() : draft.previewCheckedAt,
      updatedAt: new Date().toISOString(),
    });
    const nextReadiness = evaluateProductDraftReadiness(nextDraft, pgReady);

    if (nextStatus === "pending_approval" && !nextReadiness.approvalReady) {
      setSaveState({ status: "error", message: `승인 요청 전 ${nextReadiness.blockers.length}개 항목을 완료해야 합니다.` });
      return;
    }

    setSaveState({ status: "saving", message: `${statusLabel(nextStatus)} 처리 중입니다.` });

    try {
      const persistedDraft = await uploadPendingMedia(nextDraft);

      const record = buildProductDraftCmsRecord(persistedDraft, nextStatus);
      window.localStorage.setItem(COMPANY_PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(persistedDraft));
      setNormalizedDraft(persistedDraft);

      try {
        await saveCmsRecord("product_detail_pages", record);
        setPendingFiles({});
        setSaveState({
          status: "saved",
          message: nextStatus === "pending_approval" ? "상품 승인 요청이 최고관리자 큐에 저장되었습니다." : "상품 draft가 저장되었습니다.",
        });
      } catch (error) {
        if (error !== undefined) throw error;
        setSaveState({
          status: "saved",
          message: "로컬 draft는 저장되었습니다. Firestore 저장은 권한 또는 네트워크 상태를 확인해야 합니다.",
        });
      }
    } catch (error) {
      void error;
      setSaveState({ status: "error", message: "상품 draft 저장에 실패했습니다. 입력값을 확인해 주세요." });
    }
  }

  return (
    <div className="grid gap-5 pb-24">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">product registration 2.0</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">기업 상품 등록</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              카테고리 선택, 상세페이지, 옵션 조합 SKU, 옵션별 추가금, 재고, 고시정보, 인피니 PG 상태까지 한 번에 검수합니다.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">승인 준비도</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{completionRate}%</p>
            <p className={`mt-2 text-sm font-bold ${pgReady ? "text-emerald-700" : "text-red-700"}`}>
              인피니 PG: {pgReady ? "운영 가능" : "MID 활성화 필요"} / {pgProfile.merchantIdMasked}
            </p>
          </div>
        </div>
      </section>

      <LegalNoticeChecklist />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader eyebrow="step 1" title="기본정보" body="상품명, 브랜드, 제조사, 모델명은 고객 노출과 외부 연동 기준값으로 사용됩니다." />
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
      </section>

      <ProductCategoryClassificationPanel initialCategoryId={draft.categoryId || undefined} onSelectionChange={handleCategoryChange} />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader eyebrow="step 3" title="상세페이지 빌더" body="대표 이미지, 상세 섹션, 고시 표, 주의사항을 검수용 미리보기와 함께 구성합니다." />
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {(Object.keys(mediaLabels) as ProductDraftMedia["role"][]).map((role) => {
            const current = draft.media.find((item) => item.role === role);
            return (
              <label key={role} className="grid min-h-36 cursor-pointer gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-800">
                {mediaLabels[role]}
                <input type="file" className="hidden" accept={role === "video" ? "video/*,image/gif" : role === "evidence" ? "image/*,.pdf" : "image/*"} onChange={(event) => handleMedia(role, event.target.files?.[0])} />
                <span className="grid min-h-20 place-items-center rounded-md bg-white px-3 text-center text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                  {current?.fileName ?? "파일 선택"}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black text-slate-950">상세 섹션</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(sectionTypeLabels) as ProductDetailSectionType[]).filter((type) => type !== "divider").map((type) => (
                <button key={type} type="button" onClick={() => addDetailSection(type)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                  {sectionTypeLabels[type]} 추가
                </button>
              ))}
            </div>
          </div>
          {draft.detailSections.map((section, index) => (
            <div key={section.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[180px_1fr_1.5fr_180px]">
              <select value={section.type} onChange={(event) => updateDetailSection(section.id, { type: event.target.value as ProductDetailSectionType })} className={inputClass()}>
                {Object.entries(sectionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input value={section.title} onChange={(event) => updateDetailSection(section.id, { title: event.target.value })} className={inputClass()} placeholder="섹션 제목" />
              <textarea value={section.body} onChange={(event) => updateDetailSection(section.id, { body: event.target.value })} className={`${inputClass()} min-h-20`} placeholder="상세 설명, 구성품, 주의사항" />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => moveDetailSection(section.id, -1)} disabled={index === 0} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40">
                  위
                </button>
                <button type="button" onClick={() => moveDetailSection(section.id, 1)} disabled={index === draft.detailSections.length - 1} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40">
                  아래
                </button>
                <button type="button" onClick={() => removeDetailSection(section.id)} className="rounded-md bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ProductPricePolicyForm initialPricing={draft.pricing} onPricingChange={handlePricingChange} />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader eyebrow="step 4" title="옵션 조합 SKU" body="색상, 사이즈, 용량, 구성 같은 옵션그룹을 만들고 조합 SKU를 자동 생성합니다. 옵션마다 추가금, 최종 판매가, 재고를 따로 관리합니다." />
        <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="grid content-start gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-950">옵션 프리셋</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedCategory?.optionPresets ?? optionPresetNames).map((name) => (
                  <button key={name} type="button" onClick={() => addOptionGroup(name)} className="rounded-md bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
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
                    <button type="button" onClick={() => removeOptionGroup(group.id)} className="rounded-md bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200">
                      그룹 삭제
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
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
                        <button type="button" onClick={() => removeOptionValue(group.id, value.id)} className="rounded-md border border-slate-200 px-3 text-xs font-black">
                          삭제
                        </button>
                      </div>
                      {group.name.includes("색") ? (
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
                  <button type="button" onClick={() => addOptionValue(group.id)} className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs font-black text-slate-600">
                    옵션값 추가
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={generateVariantMatrix} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
              옵션 조합 SKU 생성
            </button>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]">
              <input value={bulkStock} onChange={(event) => setBulkStock(event.target.value)} className={inputClass()} inputMode="numeric" placeholder="일괄 재고" />
              <input value={bulkAdditionalPrice} onChange={(event) => setBulkAdditionalPrice(event.target.value)} className={inputClass()} inputMode="numeric" placeholder="일괄 추가금" />
              <button type="button" onClick={applyBulkToVariants} className="rounded-md bg-white px-4 py-3 text-sm font-black text-slate-900 ring-1 ring-slate-200">
                일괄 적용
              </button>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-[1280px] border-collapse bg-white text-left text-sm">
                <thead className="bg-slate-100 text-xs font-black text-slate-500">
                  <tr>
                    {["옵션 조합", "SKU *", "바코드", "정상가 *", "플랫폼 최저가 *", "폐쇄몰 기본가 *", "추가금", "최종 판매가", "재고 *", "안전재고", "무게", "외부 상품코드", "외부 옵션코드", "상태"].map((item) => (
                      <th key={item} className="whitespace-nowrap px-3 py-3">{item}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draft.variants.map((variant, index) => (
                    <tr key={variant.id}>
                      <td className="px-3 py-2 font-black text-slate-950">{variant.optionPath}</td>
                      <td className="px-3 py-2"><input value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.barcode} onChange={(event) => updateVariant(index, "barcode", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.normalPrice} onChange={(event) => updateVariant(index, "normalPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.platformLowestPrice} onChange={(event) => updateVariant(index, "platformLowestPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.baseClosedMallPrice} onChange={(event) => updateVariant(index, "baseClosedMallPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.additionalPrice} onChange={(event) => updateVariant(index, "additionalPrice", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2 font-black text-rose-600">{formatCurrency(toNumber(variant.finalSalePrice))}</td>
                      <td className="px-3 py-2"><input value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.safetyStock} onChange={(event) => updateVariant(index, "safetyStock", event.target.value)} inputMode="numeric" className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.weight} onChange={(event) => updateVariant(index, "weight", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.externalProductCode} onChange={(event) => updateVariant(index, "externalProductCode", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2"><input value={variant.externalOptionCode} onChange={(event) => updateVariant(index, "externalOptionCode", event.target.value)} className={compactInputClass()} /></td>
                      <td className="px-3 py-2">
                        <select value={variant.status} onChange={(event) => updateVariant(index, "status", event.target.value)} className={compactInputClass()}>
                          {["판매가능", "품절", "숨김"].map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader eyebrow="step 5" title="배송/반품/AS" body="고객 상세페이지와 기업 주문 처리 기준으로 쓰이는 정책입니다." />
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
      </section>

      <SellerDisclosureForm />
      <ReturnPolicyForm />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader eyebrow="step 6" title="고시정보/KC/증빙" body="선택한 카테고리의 고시 템플릿과 필수 증빙 조건을 검수합니다." />
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
            ["prohibitedProductConfirmed", "금지상품이 아님을 확인"],
            ["kcRequired", "KC/인증 대상 상품"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm font-black text-slate-800">
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
      </section>

      <CertificationEvidenceUploader companyId={companyId} productId={draft.id} productName={draft.productName || draft.id} />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader eyebrow="step 7" title="미리보기/승인 요청" body="태블릿 폐쇄몰에 노출될 상품 상세와 승인 차단 항목을 한 화면에서 확인합니다." />
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="grid aspect-square place-items-center rounded-md bg-white text-center text-xs font-black text-slate-400 ring-1 ring-slate-200">
                {draft.media.find((item) => item.role === "representative")?.fileName ?? "대표 이미지 미등록"}
              </div>
              <div>
                <p className="text-xs font-black text-emerald-700">{draft.brand || "브랜드 미입력"}</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{draft.productName || "상품명 미입력"}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{draft.summary || "상품 요약 미입력"}</p>
                <p className="mt-4 text-3xl font-black text-rose-600">{formatCurrency(draft.pricing.closedMallPrice)}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">{draft.categoryLabel} / {draft.subcategory}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {draft.variants.slice(0, 6).map((variant) => (
                <div key={variant.id} className="grid gap-2 rounded-md bg-white p-3 md:grid-cols-[1fr_auto_auto]">
                  <p className="font-black text-slate-950">{variant.optionPath}</p>
                  <p className="font-black text-rose-600">{formatCurrency(toNumber(variant.finalSalePrice))}</p>
                  <p className={`font-black ${toNumber(variant.stock) > 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {toNumber(variant.stock) > 0 ? `재고 ${variant.stock}` : "품절"}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-md border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-black text-slate-950">승인 차단 항목</h3>
            <div className="mt-3 grid gap-2">
              {readiness.blockers.length ? (
                readiness.blockers.slice(0, 12).map((blocker) => (
                  <p key={blocker} className="rounded-md bg-red-50 p-2 text-xs font-bold leading-5 text-red-700">
                    {blocker}
                  </p>
                ))
              ) : (
                <p className="rounded-md bg-emerald-50 p-3 text-sm font-black text-emerald-800">승인 요청 가능 상태입니다.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => updateDraft("previewCheckedAt", new Date().toISOString())}
              className="mt-4 w-full rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-900"
            >
              미리보기 확인 완료
            </button>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-black ${saveState.status === "error" ? "text-red-700" : saveState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
            {saveState.message || `승인 준비도 ${completionRate}% / 옵션 ${draft.variants.length}개 / 차단 ${readiness.blockers.length}개`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => saveDraft("draft")} disabled={saveState.status === "saving"} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-50">
              임시 저장
            </button>
            <a href="/company/products/preview" className="rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-900">
              상세 미리보기
            </a>
            <button
              type="button"
              onClick={() => saveDraft("pending_approval")}
              disabled={!readiness.approvalReady || saveState.status === "saving"}
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              승인 요청
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
