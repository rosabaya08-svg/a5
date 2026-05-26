"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

type DiscountMode = "rate" | "amount";

function toNumber(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : 0;
}

function discountBand(rate: number) {
  if (rate >= 51 && rate <= 80) return { label: "80%~51% 최상단 메가 할인", tone: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (rate >= 36 && rate <= 50) return { label: "50%~36% 베스트 특가", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (rate >= 21 && rate <= 35) return { label: "35%~21% 산모케어 특가", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  if (rate >= 10 && rate <= 20) return { label: "20%~10% 기본 노출 가능", tone: "bg-blue-50 text-blue-800 ring-blue-200" };
  return { label: "정상가 대비 10% 이하 노출 금지", tone: "bg-slate-100 text-slate-700 ring-slate-200" };
}

export function ProductPricePolicyForm() {
  const [listPriceText, setListPriceText] = useState("159000");
  const [platformLowestPriceText, setPlatformLowestPriceText] = useState("142000");
  const [mode, setMode] = useState<DiscountMode>("rate");
  const [discountRateText, setDiscountRateText] = useState("10");
  const [discountAmountText, setDiscountAmountText] = useState("14000");

  const pricing = useMemo(() => {
    const listPrice = toNumber(listPriceText);
    const platformLowestPrice = toNumber(platformLowestPriceText);
    const discountRate = Math.min(80, Math.max(0, toNumber(discountRateText)));
    const discountAmount = Math.max(0, toNumber(discountAmountText));
    const closedMallPrice =
      mode === "rate"
        ? Math.max(0, Math.round(platformLowestPrice * (1 - discountRate / 100)))
        : Math.max(0, platformLowestPrice - discountAmount);
    const normalDiscountRate = listPrice > 0 ? Math.round(((listPrice - closedMallPrice) / listPrice) * 100) : 0;
    const platformDiscountRate = platformLowestPrice > 0 ? Math.round(((platformLowestPrice - closedMallPrice) / platformLowestPrice) * 100) : 0;
    const platformPriceInvalid = platformLowestPrice <= 0 || listPrice <= 0 || platformLowestPrice > listPrice;
    const exposeBlocked = normalDiscountRate < 10 || normalDiscountRate > 80 || platformPriceInvalid;

    return {
      listPrice,
      platformLowestPrice,
      closedMallPrice,
      normalDiscountRate,
      platformDiscountRate,
      platformPriceInvalid,
      exposeBlocked,
      band: discountBand(normalDiscountRate),
    };
  }, [discountAmountText, discountRateText, listPriceText, mode, platformLowestPriceText]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 text-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">가격 정책 필수 입력</p>
          <h2 className="mt-1 text-xl font-black">정상가/플랫폼 최저가 기준 폐쇄몰가 설정</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업 어드민 상품 등록 시 정상가와 플랫폼 최저가는 필수입니다. 폐쇄몰가는 플랫폼 최저가보다 낮아야 하며, 정상가 대비 10% 이하 할인은 쇼핑몰 노출 금지로 처리합니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${pricing.band.tone}`}>{pricing.band.label}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-black">
          정상가 *
          <input
            value={listPriceText}
            onChange={(event) => setListPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
            placeholder="예: 159000"
          />
        </label>
        <label className="grid gap-2 text-sm font-black">
          플랫폼 최저가 *
          <input
            value={platformLowestPriceText}
            onChange={(event) => setPlatformLowestPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
            placeholder="예: 142000"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr_1fr]">
        <label className="grid gap-2 text-sm font-black">
          할인 방식
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as DiscountMode)}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
          >
            <option value="rate">할인율</option>
            <option value="amount">할인금액</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black">
          플랫폼 최저가 대비 할인율
          <input
            value={discountRateText}
            onChange={(event) => setDiscountRateText(event.target.value)}
            disabled={mode !== "rate"}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold disabled:opacity-45"
            placeholder="예: 10"
          />
        </label>
        <label className="grid gap-2 text-sm font-black">
          플랫폼 최저가 대비 할인금액
          <input
            value={discountAmountText}
            onChange={(event) => setDiscountAmountText(event.target.value)}
            disabled={mode !== "amount"}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold disabled:opacity-45"
            placeholder="예: 14000"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">정상가</p>
          <p className="mt-1 text-lg font-black">{formatCurrency(pricing.listPrice)}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">플랫폼 최저가</p>
          <p className="mt-1 text-lg font-black">{formatCurrency(pricing.platformLowestPrice)}</p>
        </div>
        <div className="rounded-md bg-slate-950 p-3 text-white">
          <p className="text-xs font-black text-slate-300">계산된 폐쇄몰가</p>
          <p className="mt-1 text-lg font-black">{formatCurrency(pricing.closedMallPrice)}</p>
        </div>
        <div className="rounded-md bg-emerald-50 p-3 text-emerald-900">
          <p className="text-xs font-black">정상가 대비</p>
          <p className="mt-1 text-lg font-black">{pricing.normalDiscountRate}% 할인</p>
        </div>
      </div>

      {pricing.platformPriceInvalid ? (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">플랫폼 최저가는 정상가보다 높을 수 없습니다. 두 값은 모두 필수입니다.</p>
      ) : null}
      {pricing.exposeBlocked ? (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-900">
          쇼핑몰 노출 차단: 정상가 대비 10% 이하 할인 또는 80% 초과 할인은 관리자 검토 전 노출하지 않습니다.
        </p>
      ) : (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          노출 가능: 상품은 {pricing.band.label} 구간에 자동 배치됩니다. 플랫폼 최저가 대비 {pricing.platformDiscountRate}% 추가 할인입니다.
        </p>
      )}
    </section>
  );
}
