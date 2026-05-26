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
        AI 분석
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
                  할인 분석
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  기업 어드민에 등록된 정상가와 비교 기준가를 토대로 폐쇄몰가가 얼마나 낮은지 계산한 안내입니다. 실제 AI나 외부 가격 API는 호출하지 않습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-700"
                aria-label="분석 팝업 닫기"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">상품명</p>
              <p className="mt-1 text-lg font-black">{productName}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">입점사 ID: {companyId}</p>
            </div>

            <div className="mt-4 grid gap-2 text-sm font-bold">
              <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2">
                <span>기업 등록 정상가</span>
                <strong>{formatCurrency(listPrice)}</strong>
              </div>
              <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2">
                <span>비교 기준 최저가</span>
                <strong>{formatCurrency(platformLowestPrice)}</strong>
              </div>
              <div className="flex justify-between rounded-md bg-slate-950 px-3 py-2 text-white">
                <span>폐쇄몰 회원가</span>
                <strong>{formatCurrency(closedMallPrice)}</strong>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-rose-50 p-4">
                <p className="text-xs font-black text-rose-700">정상가 대비</p>
                <p className="mt-1 text-3xl font-black text-rose-600">{analysis.discountRate}%</p>
                <p className="mt-1 text-sm font-bold text-slate-600">{formatCurrency(analysis.listSavings)} 절감</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-black text-emerald-700">비교가 대비</p>
                <p className="mt-1 text-3xl font-black text-emerald-700">{analysis.platformRate}%</p>
                <p className="mt-1 text-sm font-bold text-slate-600">{formatCurrency(analysis.platformSavings)} 절감</p>
              </div>
            </div>

            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
              베타 기준: 기업 어드민 등록 금액과 Firestore 상품 가격 필드를 기준으로 계산합니다. PG 실결제, 외부 최저가 API, 실시간 크롤링은 아직 연결하지 않았습니다.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
