"use client";

import { useMemo, useState } from "react";
import { categoryRegistrationFields, companyProductCategories } from "@/data/companyProductCategories";
import type { CompanyProductCategory } from "@/data/companyProductCategories";

function reviewTone(level: CompanyProductCategory["reviewLevel"]) {
  if (level === "전문가 검토") return "bg-red-50 text-red-700 ring-red-200";
  if (level === "증빙 필수") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (level === "관리자 확인") return "bg-blue-50 text-blue-800 ring-blue-200";
  return "bg-emerald-50 text-emerald-800 ring-emerald-200";
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-md bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductCategoryClassificationPanel() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(companyProductCategories[0].id);
  const [selectedSubcategory, setSelectedSubcategory] = useState(companyProductCategories[0].subcategories[0]);

  const selectedCategory = useMemo(
    () => companyProductCategories.find((category) => category.id === selectedCategoryId) ?? companyProductCategories[0],
    [selectedCategoryId],
  );
  const subcategoryCount = companyProductCategories.reduce((total, category) => total + category.subcategories.length, 0);
  const reviewRequiredCount = companyProductCategories.filter((category) => category.reviewLevel !== "기본 검수").length;

  function selectCategory(category: CompanyProductCategory) {
    setSelectedCategoryId(category.id);
    setSelectedSubcategory(category.subcategories[0]);
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">enterprise taxonomy</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">기업 상품 분류</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            산후조리원 폐쇄몰 기준으로 대분류, 세분류, 승인 검수, 노출관, 수령 방식을 함께 고정합니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${reviewTone(selectedCategory.reviewLevel)}`}>
          {selectedCategory.reviewLevel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricCell label="대분류" value={`${companyProductCategories.length}개`} />
        <MetricCell label="세분류" value={`${subcategoryCount}개`} />
        <MetricCell label="증빙/검수 카테고리" value={`${reviewRequiredCount}개`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 md:grid-cols-2">
            {companyProductCategories.map((category) => {
              const selected = category.id === selectedCategory.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectCategory(category)}
                  className={`min-h-28 rounded-md border p-3 text-left transition ${
                    selected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                  }`}
                >
                  <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black ring-1 ${selected ? "bg-white text-slate-950 ring-white" : reviewTone(category.reviewLevel)}`}>
                    {category.reviewLevel}
                  </span>
                  <span className="mt-2 block text-sm font-black">{category.label}</span>
                  <span className={`mt-1 block text-xs leading-5 ${selected ? "text-slate-200" : "text-slate-500"}`}>{category.description}</span>
                  <span className={`mt-2 block text-[11px] font-bold ${selected ? "text-slate-300" : "text-slate-500"}`}>
                    {category.subcategories.length}개 세분류 / {category.defaultFulfillment}
                  </span>
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
              세분류
              <select
                value={selectedSubcategory}
                onChange={(event) => setSelectedSubcategory(event.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
              >
                {selectedCategory.subcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-800">
              분류 코드
              <input readOnly value={selectedCategory.code} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600" />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-800">
              노출관
              <input readOnly value={selectedCategory.shelf} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600" />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-800">
              기본 수령 방식
              <input readOnly value={selectedCategory.defaultFulfillment} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600" />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-800">
              승인 레벨
              <input readOnly value={selectedCategory.reviewLevel} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600" />
            </label>
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-950">{selectedCategory.label}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{selectedSubcategory} / {selectedCategory.code}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${reviewTone(selectedCategory.reviewLevel)}`}>
                {selectedCategory.reviewLevel}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selectedCategory.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCategory.channelTags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <DetailList title="필수 등록 필드" items={selectedCategory.requiredFields} />
            <DetailList title="승인 체크" items={selectedCategory.complianceChecks} />
            <DetailList title="운영 메모" items={selectedCategory.approvalNotes} />
            <DetailList title="상품 예시" items={selectedCategory.examples} />
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-950">등록 필드 프리셋</h3>
          <span className="text-xs font-bold text-slate-500">{categoryRegistrationFields.length}개 필드</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categoryRegistrationFields.map((field) => (
            <span key={field} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
              {field}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">대분류</th>
              <th className="whitespace-nowrap px-4 py-3">노출관</th>
              <th className="whitespace-nowrap px-4 py-3">검수</th>
              <th className="whitespace-nowrap px-4 py-3">대표 세분류</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {companyProductCategories.map((category) => (
              <tr key={category.id} className={category.id === selectedCategory.id ? "bg-emerald-50" : undefined}>
                <td className="px-4 py-3 font-black text-slate-950">{category.label}</td>
                <td className="px-4 py-3 text-slate-700">{category.shelf}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${reviewTone(category.reviewLevel)}`}>{category.reviewLevel}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{category.subcategories.slice(0, 3).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
