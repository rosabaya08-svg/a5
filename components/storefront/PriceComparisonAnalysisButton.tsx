"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

type Props = {
  productName: string;
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
  verified?: boolean;
  verificationSource?: string;
  className?: string;
};

export function PriceComparisonAnalysisButton({ productName, listPrice, platformLowestPrice, closedMallPrice, verified = false, verificationSource = "", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savings = useMemo(() => Math.max(0, platformLowestPrice - closedMallPrice), [closedMallPrice, platformLowestPrice]);
  const listPriceDiscountRate = useMemo(
    () => listPrice > closedMallPrice && closedMallPrice > 0
      ? Math.max(0, Math.ceil(((listPrice - closedMallPrice) / listPrice) * 100))
      : 0,
    [closedMallPrice, listPrice],
  );
  const comparisonReady = verified && Boolean(verificationSource.trim()) && listPrice >= platformLowestPrice && platformLowestPrice > closedMallPrice && closedMallPrice > 0;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function openModal(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
    setSearching(true);
    timerRef.current = setTimeout(() => {
      setSearching(false);
      timerRef.current = null;
    }, 1_000);
  }

  function closeModal(event?: MouseEvent<HTMLButtonElement | HTMLDivElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setSearching(false);
    setOpen(false);
  }

  return <>
    <button type="button" onClick={openModal} className={`min-h-12 rounded-md border border-rose-600 px-4 py-3 text-sm font-normal text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] ${className}`} aria-label={`${productName} AI 분석`}>
      AI 분석
    </button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onClick={closeModal}>
      <section role="dialog" aria-modal="true" aria-labelledby="price-analysis-title" className="w-full max-w-sm rounded-md bg-white p-5 text-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="price-analysis-title" className="text-2xl font-normal">AI 가격 비교</h2>
          <button type="button" onClick={closeModal} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg text-slate-700" aria-label="가격 비교 닫기">x</button>
        </div>
        <div className="mt-5 min-h-64" aria-live="polite" aria-busy={searching}>
          {searching ? <div className="grid min-h-64 place-items-center rounded-md bg-slate-50 p-6 text-center">
            <div>
              <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-rose-600" aria-hidden="true" />
              <p className="mt-5 text-lg text-slate-700">AI 가격 비교 분석 중</p>
              <p className="mt-2 text-sm text-slate-500">원가와 오픈몰 가격을 비교하고 있습니다.</p>
            </div>
          </div> : <div className="grid gap-3">
            <dl className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white px-4">
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-slate-500">원가</dt><dd className="text-lg">{comparisonReady ? formatCurrency(listPrice) : "확인 전"}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-slate-500">오픈몰</dt><dd className="text-lg">{comparisonReady ? formatCurrency(platformLowestPrice) : "확인 전"}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-slate-500">산후조리원 판매가</dt><dd className="text-xl text-rose-600">{formatCurrency(closedMallPrice)}</dd></div>
            </dl>
            {comparisonReady ? <div className="grid gap-2">
              <p className="rounded-md bg-rose-50 p-4 text-center text-lg text-rose-700">원가 대비 {listPriceDiscountRate}% 할인</p>
              <p className="rounded-md bg-emerald-50 p-4 text-center text-lg text-emerald-700">오픈몰보다 {formatCurrency(savings)} 저렴합니다.</p>
            </div> : null}
          </div>}
        </div>
      </section>
    </div> : null}
  </>;
}
