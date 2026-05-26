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
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategory.id);
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialCategory.subcategories[0]);

  const selectedCategory = useMemo(
    () => companyProductCategories.find((category) => category.id === selectedCategoryId) ?? companyProductCategories[0],
    [selectedCategoryId],
  );

  const filteredCategories = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return companyProductCategories;
    return companyProductCategories.filter((category) =>
      [category.label, category.code, category.description, ...category.subcategories, ...category.examples]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [query]);

  function selectCategory(category: CompanyProductCategory) {
    const subcategory = category.subcategories[0];
    setSelectedCategoryId(category.id);
    setSelectedSubcategory(subcategory);
    onSelectionChange?.({ category, subcategory });
  }

  function selectSubcategory(subcategory: string) {
    setSelectedSubcategory(subcategory);
    onSelectionChange?.({ category: selectedCategory, subcategory });
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">A5 taxonomy</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">쇼핑몰 제공 카테고리 선택</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            판매자가 직접 카테고리를 입력하지 않습니다. A5 표준 분류를 선택하면 필수 고시정보, 옵션 프리셋, KC/증빙 기준이 자동으로 연결됩니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${reviewTone(selectedCategory.reviewLevel)}`}>
          {selectedCategory.reviewLevel}
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="grid gap-3">
          <label className="grid gap-2 text-sm font-black text-slate-800">
            카테고리 검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-500"
              placeholder="예: 수유, 젖병, 화장품, 사이즈"
            />
          </label>
          <div className="grid max-h-[520px] gap-2 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
            {filteredCategories.map((category) => {
              const selected = category.id === selectedCategory.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className={`rounded-md border p-3 text-left transition ${
                    selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black">{category.label}</span>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-black ring-1 ${selected ? "bg-white text-slate-950 ring-white" : reviewTone(category.reviewLevel)}`}>
                      {category.reviewLevel}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs leading-5 ${selected ? "text-slate-200" : "text-slate-500"}`}>{category.description}</p>
                  <p className={`mt-2 text-[11px] font-bold ${selected ? "text-slate-300" : "text-slate-500"}`}>{category.code}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-slate-800">
              대분류
              <select
                value={selectedCategory.id}
                onChange={(event) => {
                  const category = companyProductCategories.find((item) => item.id === event.target.value) ?? companyProductCategories[0];
                  selectCategory(category);
                }}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
              >
                {companyProductCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-800">
              소분류
              <select
                value={selectedSubcategory}
                onChange={(event) => selectSubcategory(event.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
              >
                {selectedCategory.subcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </label>
            {[
              ["분류 코드", selectedCategory.code],
              ["진열관", selectedCategory.shelf],
              ["기본 수령 방식", selectedCategory.defaultFulfillment],
              ["고시 템플릿", selectedCategory.noticeTemplate],
            ].map(([label, value]) => (
              <label key={label} className="grid gap-2 text-sm font-black text-slate-800">
                {label}
                <input readOnly value={value} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600" />
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-black text-emerald-700">선택된 분류</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              {selectedCategory.label} / {selectedSubcategory}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">{selectedCategory.description}</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {[
              ["필수 입력", selectedCategory.requiredFields],
              ["승인 체크", selectedCategory.complianceChecks],
              ["옵션 프리셋", selectedCategory.optionPresets],
              ["운영 메모", selectedCategory.approvalNotes],
            ].map(([title, items]) => (
              <div key={title as string} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-sm font-black text-slate-950">{title as string}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(items as string[]).map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
