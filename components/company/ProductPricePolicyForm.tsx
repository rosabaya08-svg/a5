"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

type DiscountMode = "rate" | "amount";

export type ProductPricePolicyValue = {
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
  normalDiscountRate: number;
  platformDiscountRate: number;
  platformPriceInvalid: boolean;
  exposeBlocked: boolean;
};

function toNumber(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : 0;
}

function discountBand(rate: number) {
  if (rate >= 51 && rate <= 80) return { label: "대폭 할인", tone: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (rate >= 36 && rate <= 50) return { label: "프로모션 강화", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (rate >= 21 && rate <= 35) return { label: "권장 할인", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  if (rate >= 10 && rate <= 20) return { label: "기본 노출 가능", tone: "bg-blue-50 text-blue-800 ring-blue-200" };
  return { label: "노출 기준 미달", tone: "bg-slate-100 text-slate-700 ring-slate-200" };
}

export function ProductPricePolicyForm({
  initialPricing,
  onPricingChange,
}: {
  initialPricing?: Partial<ProductPricePolicyValue>;
  onPricingChange?: (pricing: ProductPricePolicyValue) => void;
}) {
  const [listPriceText, setListPriceText] = useState(String(initialPricing?.listPrice || ""));
  const [platformLowestPriceText, setPlatformLowestPriceText] = useState(String(initialPricing?.platformLowestPrice || ""));
  const [mode, setMode] = useState<DiscountMode>("rate");
  const [discountRateText, setDiscountRateText] = useState("10");
  const [discountAmountText, setDiscountAmountText] = useState("");
  const [manualClosedMallPriceText, setManualClosedMallPriceText] = useState(String(initialPricing?.closedMallPrice || ""));

  const pricing = useMemo(() => {
    const listPrice = toNumber(listPriceText);
    const platformLowestPrice = toNumber(platformLowestPriceText);
    const discountRate = Math.min(80, Math.max(0, toNumber(discountRateText)));
    const discountAmount = Math.max(0, toNumber(discountAmountText));
    const manualClosedMallPrice = toNumber(manualClosedMallPriceText);
    const calculatedClosedMallPrice =
      mode === "rate"
        ? Math.max(0, Math.round(platformLowestPrice * (1 - discountRate / 100)))
        : Math.max(0, platformLowestPrice - discountAmount);
    const closedMallPrice = manualClosedMallPrice || calculatedClosedMallPrice;
    const normalDiscountRate = listPrice > 0 ? Math.round(((listPrice - closedMallPrice) / listPrice) * 100) : 0;
    const platformDiscountRate = platformLowestPrice > 0 ? Math.round(((platformLowestPrice - closedMallPrice) / platformLowestPrice) * 100) : 0;
    const platformPriceInvalid = platformLowestPrice <= 0 || listPrice <= 0 || platformLowestPrice > listPrice;
    const exposeBlocked = normalDiscountRate < 10 || normalDiscountRate > 80 || platformPriceInvalid || closedMallPrice <= 0;

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
  }, [discountAmountText, discountRateText, listPriceText, manualClosedMallPriceText, mode, platformLowestPriceText]);

  useEffect(() => {
    onPricingChange?.({
      listPrice: pricing.listPrice,
      platformLowestPrice: pricing.platformLowestPrice,
      closedMallPrice: pricing.closedMallPrice,
      normalDiscountRate: pricing.normalDiscountRate,
      platformDiscountRate: pricing.platformDiscountRate,
      platformPriceInvalid: pricing.platformPriceInvalid,
      exposeBlocked: pricing.exposeBlocked,
    });
  }, [onPricingChange, pricing]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 text-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">required pricing</p>
          <h2 className="mt-1 text-xl font-black">가격 정책 *필수 입력</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            정상가, 플랫폼 최저가, 폐쇄몰 기본가는 승인 요청 필수값입니다. 옵션별 추가금은 다음 단계의 SKU 매트릭스에서 최종 판매가에 합산됩니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${pricing.band.tone}`}>{pricing.band.label}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-black">
          정상가 <span className="text-red-600">*</span>
          <input
            value={listPriceText}
            onChange={(event) => setListPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
            placeholder="예: 159000"
          />
        </label>
        <label className="grid gap-2 text-sm font-black">
          플랫폼 최저가 <span className="text-red-600">*</span>
          <input
            value={platformLowestPriceText}
            onChange={(event) => setPlatformLowestPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
            placeholder="예: 142000"
          />
        </label>
        <label className="grid gap-2 text-sm font-black">
          폐쇄몰 기본가 <span className="text-red-600">*</span>
          <input
            value={manualClosedMallPriceText}
            onChange={(event) => setManualClosedMallPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
            placeholder="자동 계산값을 쓰려면 비워 둠"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr_1fr]">
        <label className="grid gap-2 text-sm font-black">
          계산 방식
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
        {[
          ["정상가", formatCurrency(pricing.listPrice)],
          ["플랫폼 최저가", formatCurrency(pricing.platformLowestPrice)],
          ["폐쇄몰 기본가", formatCurrency(pricing.closedMallPrice)],
          ["정상가 대비", `${pricing.normalDiscountRate}% 할인`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-black">{value}</p>
          </div>
        ))}
      </div>

      {pricing.platformPriceInvalid ? (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
          플랫폼 최저가는 정상가보다 높을 수 없습니다. 두 값 모두 필수입니다.
        </p>
      ) : null}
      {pricing.exposeBlocked ? (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-900">
          노출 전 확인 필요: 정상가 대비 10% 미만 할인, 80% 초과 할인, 가격 미입력 상품은 승인 요청이 제한됩니다.
        </p>
      ) : (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          가격 기준 통과: 플랫폼 최저가 대비 {pricing.platformDiscountRate}% 추가 할인입니다.
        </p>
      )}
    </section>
  );
}
