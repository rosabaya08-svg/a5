"use client";

import Link from "next/link";
import { useState } from "react";
import {
  COMPANY_PRODUCT_DRAFT_STORAGE_KEY,
  normalizeDraft,
  toNumber,
  type ProductDraft,
} from "@/lib/company/productDraft";
import { formatCurrency } from "@/lib/utils/format";

function readDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COMPANY_PRODUCT_DRAFT_STORAGE_KEY);
    return raw ? normalizeDraft(JSON.parse(raw) as ProductDraft) : null;
  } catch {
    return null;
  }
}

export function CompanyProductDraftPreview() {
  const [draft] = useState<ProductDraft | null>(() => readDraft());

  if (!draft) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-black text-slate-950">저장된 상품 draft가 없습니다.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          상품 등록 화면에서 기본정보, 카테고리, 상세페이지, 옵션 조합 SKU를 작성한 뒤 임시 저장하면 검수용 미리보기를 볼 수 있습니다.
        </p>
        <Link href="/company/products/new" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          상품 등록으로 이동
        </Link>
      </section>
    );
  }

  const representative = draft.media.find((item) => item.role === "representative");

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="grid aspect-[4/3] place-items-center rounded-md bg-white p-4 text-center text-sm font-black text-slate-400">
              {representative?.fileName ?? "대표 이미지 미등록"}
            </div>
            <p className="mt-4 text-xs font-black text-emerald-700">{draft.brand || "브랜드 미입력"}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{draft.productName || "상품명 미입력"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{draft.summary || "상품 요약 미입력"}</p>
            <p className="mt-4 text-3xl font-black text-rose-600">{formatCurrency(draft.pricing.closedMallPrice)}</p>
          </div>
          <div className="grid content-start gap-3">
            {[
              ["상태", draft.status === "pending_approval" ? "승인 요청" : "임시 저장"],
              ["company_id", draft.companyId],
              ["product_id", draft.id],
              ["카테고리", `${draft.categoryLabel} / ${draft.subcategory}`],
              ["분류 코드", draft.categoryCode],
              ["검수 단계", draft.reviewLevel],
              ["진열관", draft.shelf],
              ["고시 템플릿", draft.noticeTemplate],
              ["정상가", formatCurrency(draft.pricing.listPrice)],
              ["플랫폼 최저가", formatCurrency(draft.pricing.platformLowestPrice)],
              ["폐쇄몰 기본가", formatCurrency(draft.pricing.closedMallPrice)],
              ["옵션 조합", `${draft.variants.length}개`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-md bg-slate-50 p-3 text-sm">
                <span className="font-black text-slate-500">{label}</span>
                <span className="text-right font-black text-slate-950">{value || "미입력"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-black text-slate-950">옵션 조합 SKU 미리보기</h3>
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                {["옵션", "SKU", "정상가", "플랫폼 최저가", "기본가", "추가금", "최종 판매가", "재고", "외부 상품코드", "외부 옵션코드", "상태"].map((item) => (
                  <th key={item} className="px-4 py-3">{item}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {draft.variants.map((variant) => (
                <tr key={variant.id}>
                  <td className="px-4 py-3 font-bold text-slate-950">{variant.optionPath || "기본"}</td>
                  <td className="px-4 py-3">{variant.sku || "미입력"}</td>
                  <td className="px-4 py-3">{variant.normalPrice ? formatCurrency(toNumber(variant.normalPrice)) : "미입력"}</td>
                  <td className="px-4 py-3">{variant.platformLowestPrice ? formatCurrency(toNumber(variant.platformLowestPrice)) : "미입력"}</td>
                  <td className="px-4 py-3">{variant.baseClosedMallPrice ? formatCurrency(toNumber(variant.baseClosedMallPrice)) : "미입력"}</td>
                  <td className="px-4 py-3">{formatCurrency(toNumber(variant.additionalPrice))}</td>
                  <td className="px-4 py-3 font-black text-rose-600">{formatCurrency(toNumber(variant.finalSalePrice))}</td>
                  <td className="px-4 py-3">{variant.stock || "미입력"}</td>
                  <td className="px-4 py-3">{variant.externalProductCode || "미등록"}</td>
                  <td className="px-4 py-3">{variant.externalOptionCode || "미등록"}</td>
                  <td className="px-4 py-3">{variant.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-black text-slate-950">상세페이지 섹션</h3>
        <div className="mt-4 grid gap-3">
          {draft.detailSections.map((section) => (
            <article key={section.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{section.type}</p>
              <h4 className="mt-1 text-base font-black text-slate-950">{section.title || "제목 미입력"}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{section.body || "내용 미입력"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
