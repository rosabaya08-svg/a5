"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

type PriceAnalysisButtonProps = {
  productName: string;
  platformLowestPrice: number;
  closedMallPrice: number;
  verified?: boolean;
  className?: string;
};

export function PriceAnalysisButton({
  productName,
  platformLowestPrice,
  closedMallPrice,
  verified = false,
  className = "",
}: PriceAnalysisButtonProps) {
  const [open, setOpen] = useState(false);
  const analysis = useMemo(() => {
    const platformSavings = Math.max(0, platformLowestPrice - closedMallPrice);
    const platformRate = platformLowestPrice > 0 ? Math.round((platformSavings / platformLowestPrice) * 100) : 0;

    return { platformSavings, platformRate };
  }, [closedMallPrice, platformLowestPrice]);

  if (!verified || platformLowestPrice <= closedMallPrice || closedMallPrice <= 0) {
    return null;
  }

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
        className={"min-h-12 rounded-md border border-rose-600 px-4 py-3 text-sm font-normal text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] " + className}
        aria-label={productName + " 가격 비교"}
      >
        가격 비교
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
              <h2 id="price-analysis-title" className="text-2xl font-normal">
                확인된 가격 비교
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-normal text-slate-700"
                aria-label="가격 비교 닫기"
              >
                x
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-sm font-normal text-slate-500">오픈몰 확인가</p>
                <p className="mt-1 text-xl font-normal">{formatCurrency(platformLowestPrice)}</p>
              </div>
              <div className="rounded-md bg-rose-50 p-3">
                <p className="text-sm font-normal text-rose-700">폐쇄몰 판매가</p>
                <p className="mt-1 text-2xl font-normal text-rose-600">{formatCurrency(closedMallPrice)}</p>
              </div>
              <p className="rounded-md bg-emerald-50 p-3 text-lg font-normal text-emerald-700">
                오픈몰보다 {formatCurrency(analysis.platformSavings)} 저렴합니다. 차이율은 {analysis.platformRate}%입니다.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
