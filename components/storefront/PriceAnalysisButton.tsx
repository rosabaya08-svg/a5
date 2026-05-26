"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

type PriceAnalysisButtonProps = {
  productName: string;
  platformLowestPrice: number;
  closedMallPrice: number;
  className?: string;
};

export function PriceAnalysisButton({
  productName,
  platformLowestPrice,
  closedMallPrice,
  className = "",
}: PriceAnalysisButtonProps) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const analysis = useMemo(() => {
    const platformSavings = Math.max(0, platformLowestPrice - closedMallPrice);
    const platformRate = platformLowestPrice > 0 ? Math.round((platformSavings / platformLowestPrice) * 100) : 0;

    return { platformSavings, platformRate };
  }, [closedMallPrice, platformLowestPrice]);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  function openModal(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    window.clearTimeout(timerRef.current);
    setOpen(true);
    setSearching(true);
    timerRef.current = window.setTimeout(() => setSearching(false), 1000);
  }

  function closeModal(event?: MouseEvent<HTMLButtonElement | HTMLDivElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    window.clearTimeout(timerRef.current);
    setOpen(false);
    setSearching(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`min-h-12 rounded-md border border-rose-600 px-4 py-3 text-sm font-black text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] ${className}`}
        aria-label={`${productName} AI 분석`}
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
            className="w-full max-w-sm rounded-md bg-white p-5 text-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="price-analysis-title" className="text-2xl font-black">
                AI 분석
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-700"
                aria-label="AI 분석 닫기"
              >
                x
              </button>
            </div>

            {searching ? (
              <div className="grid min-h-52 place-items-center text-center">
                <div>
                  <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
                  <p className="mt-4 text-sm font-black text-slate-600">오픈플랫폼 최저가 검색 중</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-sm font-black text-slate-500">오픈몰 최저가</p>
                  <p className="mt-1 text-xl font-black">{formatCurrency(platformLowestPrice)}</p>
                </div>
                <div className="rounded-md bg-rose-50 p-3">
                  <p className="text-sm font-black text-rose-700">오픈몰 대비</p>
                  <p className="mt-1 text-3xl font-black text-rose-600">폐쇄몰 {formatCurrency(analysis.platformSavings)} 더 저렴함</p>
                </div>
                <p className="rounded-md bg-emerald-50 p-3 text-lg font-black text-emerald-700">{analysis.platformRate}% 추가 할인된 금액</p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
