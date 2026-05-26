"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
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
  const analysis = useMemo(() => {
    const platformSavings = Math.max(0, platformLowestPrice - closedMallPrice);
    const platformRate = platformLowestPrice > 0 ? Math.round((platformSavings / platformLowestPrice) * 100) : 0;

    return { platformSavings, platformRate };
  }, [closedMallPrice, platformLowestPrice]);

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
        className={`rounded-md border border-rose-500 px-3 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-50 active:scale-[0.99] ${className}`}
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

            <div className="mt-5 grid gap-3 rounded-md bg-rose-50 p-4">
              <p className="text-sm font-black text-slate-600">플랫폼 최저가 대비</p>
              <p className="text-3xl font-black text-rose-600">폐쇄몰 {formatCurrency(analysis.platformSavings)} 저렴함</p>
              <p className="text-lg font-black text-emerald-700">{analysis.platformRate}% 추가 할인된 금액</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
