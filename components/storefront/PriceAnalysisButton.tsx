"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

type PriceAnalysisButtonProps = {
  productName: string;
  brand: string;
  companyId: string;
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
};

export function PriceAnalysisButton({
  productName,
  brand,
  companyId,
  listPrice,
  platformLowestPrice,
  closedMallPrice,
}: PriceAnalysisButtonProps) {
  const [open, setOpen] = useState(false);
  const analysis = useMemo(() => {
    const listSavings = Math.max(0, listPrice - closedMallPrice);
    const platformSavings = Math.max(0, platformLowestPrice - closedMallPrice);
    const discountRate = listPrice > 0 ? Math.round((listSavings / listPrice) * 100) : 0;
    const platformRate = platformLowestPrice > 0 ? Math.round((platformSavings / platformLowestPrice) * 100) : 0;

    return { listSavings, platformSavings, discountRate, platformRate };
  }, [closedMallPrice, listPrice, platformLowestPrice]);

  function openModal(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  }

  function closeModal(event?: MouseEvent<HTMLButtonElement | HTMLDivElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md border border-rose-500 px-3 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-50 active:scale-[0.99]"
      >
        AI 가격 비교
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={closeModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="price-analysis-title"
            className="w-full max-w-lg rounded-xl bg-white p-5 text-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-rose-600">{brand}</p>
                <h2 id="price-analysis-title" className="mt-1 text-2xl font-black">
                  AI 가격 비교
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  실제 AI나 외부 가격 API를 호출하지 않고, 기업 어드민에 등록된 정상가와 플랫폼 최저가를 기준으로 폐쇄몰가 절감폭을 계산합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-700"
                aria-label="가격 비교 팝업 닫기"
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">상품명</p>
              <p className="mt-1 text-lg font-black">{productName}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">입점사 ID: {companyId}</p>
            </div>

            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-slate-950">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">가격 비교 레이어</p>
                  <h3 className="mt-1 text-xl font-black">실제 AI가 아닌 가격 비교 모의 레이어</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-900 shadow-sm">
                  {analysis.discountRate}% 절감
                </span>
              </div>
              <div className="grid gap-2 text-sm font-bold">
                <div className="flex justify-between rounded-md bg-white px-3 py-2">
                  <span>정상가</span>
                  <strong>{formatCurrency(listPrice)}</strong>
                </div>
                <div className="flex justify-between rounded-md bg-white px-3 py-2">
                  <span>플랫폼 최저가</span>
                  <strong>{formatCurrency(platformLowestPrice)}</strong>
                </div>
                <div className="flex justify-between rounded-md bg-slate-950 px-3 py-2 text-white">
                  <span>폐쇄몰가</span>
                  <strong>{formatCurrency(closedMallPrice)}</strong>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-rose-50 p-4">
                <p className="text-xs font-black text-rose-700">정상가 대비</p>
                <p className="mt-1 text-3xl font-black text-rose-600">{analysis.discountRate}%</p>
                <p className="mt-1 text-sm font-bold text-slate-600">{formatCurrency(analysis.listSavings)} 절감</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-black text-emerald-700">플랫폼 최저가 대비</p>
                <p className="mt-1 text-3xl font-black text-emerald-700">{analysis.platformRate}%</p>
                <p className="mt-1 text-sm font-bold text-slate-600">{formatCurrency(analysis.platformSavings)} 절감</p>
              </div>
            </div>

            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
              노출 기준: 정상가 대비 10% 이하 할인 상품은 폐쇄몰 홈 노출 대상에서 제외합니다. 실제 외부 최저가 API 연동은 PG/외부 API 승인 후 별도 작업입니다.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
