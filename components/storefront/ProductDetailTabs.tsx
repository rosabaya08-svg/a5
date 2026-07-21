"use client";

import { useMemo, useState } from "react";
import { normalizeShippingFeePolicy, remoteShippingFeeLabel, shippingFeeLabel } from "@/lib/shipping/shippingFee";
import { safeStorefrontMediaUrl } from "@/lib/storefront/safeMediaUrl";
import { formatCurrency } from "@/lib/utils/format";
import type { Product } from "@/types/commerce";

type ProductDetailSection = {
  id?: string;
  type?: string;
  title?: string;
  body?: string;
  assetUrl?: string;
  assetPath?: string;
  assetFileName?: string;
  sortOrder?: number;
};

export type ProductDetailTabsProfile = {
  displayName: string;
  brand?: string;
  category?: string;
  subtitle?: string;
  imageUrl?: string;
  gallery?: string[];
  detailTabs?: ProductDetailSection[];
};

type ProductDetailTabsProps = {
  product: Product;
  profile: ProductDetailTabsProfile;
  compact?: boolean;
};

type TabId = "page" | "description" | "shipping";

const tabs: { id: TabId; label: string }[] = [
  { id: "page", label: "상품 페이지" },
  { id: "description", label: "상품설명" },
  { id: "shipping", label: "배송반품" },
];

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function fulfillmentLabel(product: Product) {
  const delivery = product.fulfillment?.delivery;
  const pickup = product.fulfillment?.pickup;

  if (delivery && pickup) return "택배배송 / 현장수령";
  if (pickup) return "현장수령";
  if (delivery) return "택배배송";
  return "수령 조건 확인 필요";
}

function policyRows(product: Product) {
  const policy = normalizeShippingFeePolicy(product.shippingFeePolicy);
  const remoteLabel = remoteShippingFeeLabel(product.shippingFeePolicy);

  return [
    ["배송 방식", fulfillmentLabel(product)],
    ["배송비", shippingFeeLabel(product.shippingFeePolicy)],
    ["기본 배송비", policy.mode === "paid" ? formatCurrency(policy.baseFee) : "0원"],
    ["무료배송 기준", policy.freeThreshold > 0 ? `${formatCurrency(policy.freeThreshold)} 이상` : "기준 없음"],
    ["도서산간 추가", policy.remoteAreaEnabled ? formatCurrency(policy.remoteAreaFee) : "추가 없음"],
    ["제주/도서 추가", policy.islandAreaEnabled ? formatCurrency(policy.islandAreaFee) : "추가 없음"],
    ["현장수령", product.fulfillment?.pickup ? "가능" : "미지원"],
    ["추가 배송 안내", remoteLabel || "등록된 추가 배송비 없음"],
  ];
}

function hasShippingKeyword(section: ProductDetailSection) {
  return /배송|반품|교환|환불|AS|A\/S|cs|CS/i.test(`${section.title ?? ""} ${section.body ?? ""}`);
}

function sectionImageUrl(section: ProductDetailSection) {
  return safeStorefrontMediaUrl(section.assetUrl);
}

function sectionOrder(section: ProductDetailSection, fallbackIndex: number) {
  return typeof section.sortOrder === "number" && Number.isFinite(section.sortOrder) ? section.sortOrder : fallbackIndex + 1;
}

export function ProductDetailTabs({ product, profile, compact = false }: ProductDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("page");
  const detailSections = useMemo(
    () =>
      (profile.detailTabs ?? product.detailSections ?? [])
        .map((section, index) => ({ ...section, sortOrder: sectionOrder(section, index) }))
        .sort((left, right) => sectionOrder(left, 0) - sectionOrder(right, 0))
        .filter((section) => section.title || section.body || sectionImageUrl(section)),
    [product.detailSections, profile.detailTabs],
  );
  const shippingSections = detailSections.filter(hasShippingKeyword);
  const images = useMemo(() => {
    const primaryImage = safeStorefrontMediaUrl(profile.imageUrl ?? product.imageUrl);
    const gallery = (profile.gallery ?? product.gallery ?? []).map((item) => safeStorefrontMediaUrl(item));
    const detailImages = detailSections.map(sectionImageUrl);

    return uniqueValues([primaryImage, ...gallery, ...detailImages]);
  }, [detailSections, product.gallery, product.imageUrl, profile.gallery, profile.imageUrl]);

  return (
    <section className={`overflow-hidden rounded-md bg-white text-slate-950 shadow-sm ${compact ? "" : "mt-6"}`} aria-label="상품 상세 정보">
      <div className="sticky top-0 z-10 grid grid-cols-3 border-b border-slate-100 bg-white/95 backdrop-blur">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-3 py-4 text-sm font-normal transition ${
              activeTab === tab.id ? "border-rose-600 text-rose-600" : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "page" ? (
        <div className="bg-white">
          {images.length ? (
            <div className="grid gap-0">
              {images.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={`${profile.displayName} 상세 이미지 ${index + 1}`}
                  draggable={false}
                  className="block w-full object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm font-normal text-slate-500">등록된 상세 이미지가 없습니다.</p>
          )}
        </div>
      ) : null}

      {activeTab === "description" ? (
        <div className="grid gap-5 px-4 py-5">
          <div className="grid gap-2 rounded-md bg-slate-50 p-4">
            <p className="text-xs font-normal text-rose-600">{profile.brand || product.brand || product.companyId}</p>
            <h2 className="text-2xl font-normal text-slate-950">{profile.displayName || product.name}</h2>
            {profile.category || product.category ? <p className="text-sm font-normal text-slate-600">{profile.category || product.category}</p> : null}
            {profile.subtitle || product.subtitle ? <p className="whitespace-pre-line text-sm font-normal leading-6 text-slate-700">{profile.subtitle || product.subtitle}</p> : null}
          </div>

          {detailSections.length ? (
            <div className="grid gap-4">
              {detailSections.map((section, index) => (
                <article key={`${section.id ?? section.title ?? section.assetFileName ?? "section"}-${index}`} className="rounded-md border border-slate-100 p-4">
                  {section.title ? <h3 className="text-base font-normal text-slate-950">{section.title}</h3> : null}
                  {section.body ? <p className="mt-2 whitespace-pre-line text-sm font-normal leading-7 text-slate-700">{section.body}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-slate-50 px-4 py-5 text-sm font-normal text-slate-600">등록된 상품 설명이 없습니다.</p>
          )}
        </div>
      ) : null}

      {activeTab === "shipping" ? (
        <div className="grid gap-5 px-4 py-5">
          <div className="overflow-hidden rounded-md border border-slate-100">
            {policyRows(product).map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_1fr] border-b border-slate-100 last:border-b-0">
                <div className="bg-slate-50 px-3 py-3 text-sm font-normal text-slate-600">{label}</div>
                <div className="px-3 py-3 text-sm font-normal text-slate-950">{value}</div>
              </div>
            ))}
          </div>

          {shippingSections.length ? (
            <div className="grid gap-3">
              {shippingSections.map((section, index) => (
                <article key={`${section.id ?? section.title ?? section.assetFileName ?? "shipping"}-${index}`} className="rounded-md border border-slate-100 p-4">
                  {section.title ? <h3 className="text-base font-normal text-slate-950">{section.title}</h3> : null}
                  {section.body ? <p className="mt-2 whitespace-pre-line text-sm font-normal leading-7 text-slate-700">{section.body}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-slate-50 px-4 py-5 text-sm font-normal text-slate-600">등록된 배송반품 상세 정책이 없습니다.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
