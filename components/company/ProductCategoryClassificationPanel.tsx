"use client";

import { useMemo, useState } from "react";
import { companyProductCategories } from "@/data/companyProductCategories";
import type { CompanyProductCategory } from "@/data/companyProductCategories";

export type ProductCategorySelection = {
  category: CompanyProductCategory;
  subcategory: string;
};

function reviewTone(level: CompanyProductCategory["reviewLevel"]) {
  if (level === "전문가 검수") return "bg-red-50 text-red-700 ring-red-200";
  if (level === "증빙 필수") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (level === "관리자 확인") return "bg-blue-50 text-blue-800 ring-blue-200";
  return "bg-emerald-50 text-emerald-800 ring-emerald-200";
}

export function ProductCategoryClassificationPanel({
  initialCategoryId = companyProductCategories[0].id,
  onSelectionChange,
}: {
  initialCategoryId?: string;
  onSelectionChange?: (selection: ProductCategorySelection) => void;
}) {
  const initialCategory = companyProductCategories.find((category) => category.id === initialCategoryId) ?? companyProductCategories[0];
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategory.id);

  const selectedCategory = useMemo(
    () => companyProductCategories.find((category) => category.id === selectedCategoryId) ?? companyProductCategories[0],
    [selectedCategoryId],
  );

  function selectCategory(category: CompanyProductCategory) {
    const subcategory = category.subcategories[0] ?? category.label;
    setSelectedCategoryId(category.id);
    onSelectionChange?.({ category, subcategory });
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">카테고리</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">상품 카테고리 선택</h2>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
            상품 등록 시 아래 고정 카테고리 중 하나를 선택합니다. 선택한 값이 폐쇄몰, 모바일 둘러보기, 브랜드관 상품 분류에 그대로 사용됩니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-normal ring-1 ${reviewTone(selectedCategory.reviewLevel)}`}>
          {selectedCategory.reviewLevel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="grid gap-2">
          {companyProductCategories.map((category) => {
            const selected = category.id === selectedCategory.id;

            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectCategory(category)}
                className={`rounded-md border p-4 text-left transition ${
                  selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-normal">{category.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-normal ring-1 ${selected ? "bg-white text-slate-950 ring-white" : reviewTone(category.reviewLevel)}`}>
                    {category.reviewLevel}
                  </span>
                </div>
                <p className={`mt-2 text-sm font-normal leading-6 ${selected ? "text-slate-200" : "text-slate-500"}`}>{category.description}</p>
              </button>
            );
          })}
        </section>

        <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-normal text-slate-800">
              선택 카테고리
              <select
                value={selectedCategory.id}
                onChange={(event) => {
                  const category = companyProductCategories.find((item) => item.id === event.target.value) ?? companyProductCategories[0];
                  selectCategory(category);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-normal"
              >
                {companyProductCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["분류 코드", selectedCategory.code],
                ["폐쇄몰 분류", selectedCategory.shelf],
                ["기본 수령 방식", selectedCategory.defaultFulfillment],
                ["고시 기준", selectedCategory.noticeTemplate],
              ].map(([label, value]) => (
                <label key={label} className="grid gap-2 text-sm font-normal text-slate-800">
                  {label}
                  <input readOnly value={value} className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-600" />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-normal text-emerald-700">선택된 카테고리</p>
            <h3 className="mt-1 text-lg font-normal text-slate-950">{selectedCategory.label}</h3>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-700">
              이 상품은 {selectedCategory.label} 카테고리 상품 목록에 등록됩니다.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
