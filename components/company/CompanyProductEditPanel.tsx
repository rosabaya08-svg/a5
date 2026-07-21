"use client";

import { useMemo, useState } from "react";
import { companyProductCategories } from "@/data/companyProductCategories";
import { saveCmsRecord } from "@/lib/firebase/contentRepository";
import { formatCurrency } from "@/lib/utils/format";
import type { Product } from "@/types/commerce";
import type { ProductStatus } from "@/types/status";

type ProductEditDraft = {
  productId: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  externalProductCode: string;
  status: ProductStatus;
  summary: string;
};

const statusOptions: ProductStatus[] = ["draft", "pending_approval", "approved", "rejected", "suspended", "archived"];
const storageKey = "a5.company.product-edit-requests";

function draftFromProduct(product: Product): ProductEditDraft {
  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    price: String(product.price),
    stock: String(product.stock),
    externalProductCode: product.externalProductCode ?? "",
    status: product.status,
    summary: product.subtitle ?? "",
  };
}

function readLocalRequests() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRequest(record: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const current = readLocalRequests();
  window.localStorage.setItem(storageKey, JSON.stringify([record, ...current].slice(0, 30)));
}

function changedFields(product: Product, draft: ProductEditDraft) {
  return {
    name: product.name !== draft.name,
    category: product.category !== draft.category,
    price: product.price !== Number(draft.price || 0),
    stock: product.stock !== Number(draft.stock || 0),
    externalProductCode: (product.externalProductCode ?? "") !== draft.externalProductCode,
    status: product.status !== draft.status,
    summary: (product.subtitle ?? "") !== draft.summary,
  };
}

export function CompanyProductEditPanel({ companyId, products }: { companyId: string; products: Product[] }) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const [draft, setDraft] = useState<ProductEditDraft>(() => (selectedProduct ? draftFromProduct(selectedProduct) : {
    productId: "",
    name: "",
    category: "",
    price: "0",
    stock: "0",
    externalProductCode: "",
    status: "draft",
    summary: "",
  }));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const changed = useMemo(() => (selectedProduct ? changedFields(selectedProduct, draft) : null), [draft, selectedProduct]);
  const changedCount = changed ? Object.values(changed).filter(Boolean).length : 0;

  function selectProduct(product: Product) {
    setSelectedProductId(product.id);
    setDraft(draftFromProduct(product));
    setMessage("");
  }

  function update<K extends keyof ProductEditDraft>(key: K, value: ProductEditDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveEditRequest() {
    if (!selectedProduct) return;

    setSaving(true);
    setMessage("");

    const now = new Date().toISOString();
    const record = {
      id: `product-edit-${companyId}-${selectedProduct.id}-${Date.now().toString(36)}`,
      company_id: companyId,
      product_id: selectedProduct.id,
      title: draft.name,
      status: "pending_approval",
      approval_status: "pending_approval",
      source_app: "company",
      source_channel: "company_product_edit",
      original: {
        name: selectedProduct.name,
        category: selectedProduct.category,
        price: selectedProduct.price,
        stock: selectedProduct.stock,
        external_product_code: selectedProduct.externalProductCode ?? "",
        status: selectedProduct.status,
        summary: selectedProduct.subtitle ?? "",
      },
      requested: {
        name: draft.name.trim(),
        category: draft.category.trim(),
        price: Number(draft.price || 0),
        stock: Number(draft.stock || 0),
        external_product_code: draft.externalProductCode.trim(),
        status: draft.status,
        summary: draft.summary.trim(),
      },
      changed_fields: changed,
      requested_at: now,
    };

    try {
      writeLocalRequest(record);
      await saveCmsRecord("company_product_edit_requests", record);
      setMessage("상품 수정 요청을 저장했습니다. 최고관리자 검수 후 반영됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? `로컬 저장 완료, Firebase 저장 실패: ${error.message}` : "로컬 저장 완료, Firebase 저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedProduct) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-normal text-slate-950">상품 수정</h2>
        <p className="mt-2 text-sm font-normal text-slate-600">수정할 등록 상품이 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">등록 상품</p>
          <h2 className="mt-1 text-lg font-normal text-slate-950">등록 상품 선택</h2>
        </div>
        <div className="grid gap-2 p-3">
          {products.map((product) => {
            const selected = product.id === selectedProduct.id;

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => selectProduct(product)}
                className={`rounded-md p-3 text-left ring-1 ${selected ? "bg-emerald-50 ring-emerald-300" : "bg-white ring-slate-200"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-normal text-slate-950">{product.name}</p>
                    <p className="mt-1 text-xs font-normal text-slate-500">{product.category} / {product.status}</p>
                  </div>
                  <span className="text-sm text-rose-600">{formatCurrency(product.price)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-blue-700">수정 요청</p>
            <h2 className="mt-1 text-xl font-normal text-slate-950">상품 수정 요청</h2>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-normal text-slate-700">{changedCount}개 변경</span>
        </div>
        {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-normal text-blue-900">{message}</p> : null}
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-normal text-slate-800">
            상품명
            <input value={draft.name} onChange={(event) => update("name", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm font-normal text-slate-800">
            카테고리
            <select value={draft.category} onChange={(event) => update("category", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
              {companyProductCategories.map((category) => (
                <option key={category.id} value={category.label}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-normal text-slate-800">
              폐쇄몰가
              <input value={draft.price} inputMode="numeric" onChange={(event) => update("price", event.target.value.replace(/[^0-9]/g, ""))} className="rounded-md border border-slate-200 px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm font-normal text-slate-800">
              재고
              <input value={draft.stock} inputMode="numeric" onChange={(event) => update("stock", event.target.value.replace(/[^0-9]/g, ""))} className="rounded-md border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-normal text-slate-800">
            외부 상품코드
            <input value={draft.externalProductCode} onChange={(event) => update("externalProductCode", event.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm font-normal text-slate-800">
            상태
            <select value={draft.status} onChange={(event) => update("status", event.target.value as ProductStatus)} className="rounded-md border border-slate-200 px-3 py-2">
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-normal text-slate-800">
            상품 요약
            <textarea value={draft.summary} onChange={(event) => update("summary", event.target.value)} className="min-h-24 rounded-md border border-slate-200 px-3 py-2" />
          </label>
          <button
            type="button"
            onClick={() => void saveEditRequest()}
            disabled={saving || changedCount === 0}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "저장 중" : "수정 요청 저장"}
          </button>
        </div>
      </aside>
    </section>
  );
}
