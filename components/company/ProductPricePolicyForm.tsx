"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateProductPriceMetrics,
  validateProductPriceOrder,
  type ProductPriceComparisonStatus,
} from "@/lib/company/priceMetrics";
import { formatCurrency } from "@/lib/utils/format";

type ProductPricePolicyFormProps = {
  initialPricing?: Partial<ProductPricePolicyValue>;
  onPricingChange?: (pricing: ProductPricePolicyValue) => void;
  productName?: string;
  brandName?: string;
  categoryLabel?: string;
};

export type ProductPricePolicyValue = {
  listPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
  normalDiscountAmount: number;
  platformDiscountAmount: number;
  normalDiscountRate: number;
  platformDiscountRate: number;
  platformPriceInvalid: boolean;
  exposeBlocked: boolean;
  comparisonComplete: boolean;
  comparisonVerified: boolean;
  comparisonStatus: ProductPriceComparisonStatus;
};

function toNumber(value: string) {
  const normalized = value.replace(/[^0-9]/g, "");
  return normalized ? Number(normalized) : 0;
}

function comparisonStatusLabel(status: ProductPriceComparisonStatus) {
  if (status === "verified") {
    return { label: "가격 비교 확인 완료", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  }
  if (status === "needs_review") {
    return { label: "가격 재확인 필요", tone: "bg-amber-50 text-amber-900 ring-amber-200" };
  }
  return { label: "가격 비교 확인 전", tone: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function discountBand(rate: number, verified: boolean) {
  if (!verified) return comparisonStatusLabel("pending_verification");
  if (rate >= 51 && rate <= 80) return { label: "51~80% 할인", tone: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (rate >= 36 && rate <= 50) return { label: "36~50% 할인", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (rate >= 21 && rate <= 35) return { label: "21~35% 할인", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  if (rate >= 10 && rate <= 20) return { label: "10~20% 할인", tone: "bg-blue-50 text-blue-800 ring-blue-200" };
  return { label: "할인 배너 대상 아님", tone: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function optionalCurrency(value: number) {
  return value > 0 ? formatCurrency(value) : "확인 전";
}

export function ProductPricePolicyForm({
  initialPricing,
  onPricingChange,
}: ProductPricePolicyFormProps) {
  const [listPriceText, setListPriceText] = useState(String(initialPricing?.listPrice || ""));
  const [openMallPriceText, setOpenMallPriceText] = useState(String(initialPricing?.platformLowestPrice || ""));
  const [closedMallPriceText, setClosedMallPriceText] = useState(String(initialPricing?.closedMallPrice || ""));

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setListPriceText(String(initialPricing?.listPrice || ""));
      setOpenMallPriceText(String(initialPricing?.platformLowestPrice || ""));
      setClosedMallPriceText(String(initialPricing?.closedMallPrice || ""));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialPricing?.closedMallPrice, initialPricing?.listPrice, initialPricing?.platformLowestPrice]);

  const pricing = useMemo(() => {
    const listPrice = toNumber(listPriceText);
    const platformLowestPrice = toNumber(openMallPriceText);
    const closedMallPrice = toNumber(closedMallPriceText);
    const priceOrder = validateProductPriceOrder({ listPrice, platformLowestPrice, closedMallPrice });
    const metrics = calculateProductPriceMetrics({ listPrice, platformLowestPrice, closedMallPrice });
    const platformPriceInvalid = !priceOrder.valid || priceOrder.status === "needs_review";
    const exposeBlocked = !priceOrder.valid;

    return {
      listPrice,
      platformLowestPrice,
      closedMallPrice,
      ...metrics,
      priceOrder,
      platformPriceInvalid,
      exposeBlocked,
      band: discountBand(metrics.normalDiscountRate, priceOrder.comparisonVerified),
    };
  }, [closedMallPriceText, listPriceText, openMallPriceText]);

  useEffect(() => {
    onPricingChange?.({
      listPrice: pricing.listPrice,
      platformLowestPrice: pricing.platformLowestPrice,
      closedMallPrice: pricing.closedMallPrice,
      normalDiscountAmount: pricing.normalDiscountAmount,
      platformDiscountAmount: pricing.platformDiscountAmount,
      normalDiscountRate: pricing.normalDiscountRate,
      platformDiscountRate: pricing.platformDiscountRate,
      platformPriceInvalid: pricing.platformPriceInvalid,
      exposeBlocked: pricing.exposeBlocked,
      comparisonComplete: pricing.priceOrder.comparisonComplete,
      comparisonVerified: pricing.priceOrder.comparisonVerified,
      comparisonStatus: pricing.priceOrder.status,
    });
  }, [onPricingChange, pricing]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 text-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-rose-600">가격 입력</p>
          <h2 className="mt-1 text-xl font-normal">판매가 및 가격 비교</h2>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
            폐쇄몰 판매가는 업로드 파일에 적힌 판매가를 그대로 입력합니다. 원판매가와 오픈몰 판매가는 확인된 근거가 있을 때만 함께 입력합니다.
          </p>
        </div>
        <span className={"rounded-full px-3 py-1 text-xs font-normal ring-1 " + pricing.band.tone}>
          {pricing.band.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-normal">
          원판매가
          <input
            value={listPriceText}
            onChange={(event) => setListPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal"
            placeholder="확인된 원판매가"
          />
        </label>
        <label className="grid gap-2 text-sm font-normal">
          오픈몰 판매가
          <input
            value={openMallPriceText}
            onChange={(event) => setOpenMallPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal"
            placeholder="확인된 오픈몰 판매가"
          />
        </label>
        <label className="grid gap-2 text-sm font-normal">
          폐쇄몰 판매가 <span className="text-red-600">*</span>
          <input
            value={closedMallPriceText}
            onChange={(event) => setClosedMallPriceText(event.target.value)}
            inputMode="numeric"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal"
            placeholder="업로드 파일 판매가"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["원판매가", optionalCurrency(pricing.listPrice)],
          ["오픈몰 판매가", optionalCurrency(pricing.platformLowestPrice)],
          ["폐쇄몰 판매가", formatCurrency(pricing.closedMallPrice)],
          ["원판매가 대비 할인율", pricing.priceOrder.comparisonVerified ? String(pricing.normalDiscountRate) + "%" : "확인 전"],
          ["오픈몰보다 저렴한 금액", pricing.priceOrder.comparisonVerified ? formatCurrency(pricing.platformDiscountAmount) : "확인 전"],
          ["오픈몰 대비 차이율", pricing.priceOrder.comparisonVerified ? String(pricing.platformDiscountRate) + "%" : "확인 전"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-normal text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-normal">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-normal leading-6 text-blue-950">
        할인율 = (원판매가 - 폐쇄몰 판매가) / 원판매가, 오픈몰 비교금액 = 오픈몰 판매가 - 폐쇄몰 판매가로 계산합니다.
        확인되지 않은 비교가격으로는 할인율을 표시하지 않습니다.
      </div>

      {!pricing.priceOrder.valid ? (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-normal text-red-700">
          {pricing.priceOrder.errors[0]}
        </p>
      ) : null}

      {pricing.priceOrder.status === "needs_review" ? (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-normal leading-6 text-amber-900">
          {pricing.priceOrder.warnings[0]} 폐쇄몰 판매가는 변경하지 않고 가격 비교만 확인 대기로 저장합니다.
        </p>
      ) : null}

      {pricing.priceOrder.status === "pending_verification" && pricing.priceOrder.valid ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-normal leading-6 text-slate-700">
          폐쇄몰 판매가는 저장할 수 있습니다. 원판매가와 오픈몰 판매가가 확인되기 전에는 할인율과 가격 비교 문구를 고객 화면에 표시하지 않습니다.
        </p>
      ) : null}

      {pricing.priceOrder.status === "verified" ? (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-normal leading-6 text-emerald-800">
          가격 비교 확인 완료: 할인율 {pricing.normalDiscountRate}%, 오픈몰보다 {formatCurrency(pricing.platformDiscountAmount)} 저렴합니다.
        </p>
      ) : null}
    </section>
  );
}
