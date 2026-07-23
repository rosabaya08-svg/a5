"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OperationsTable, type OperationsTableColumn } from "@/components/ui/OperationsTable";
import { calculateProductPriceMetrics } from "@/lib/company/priceMetrics";
import { productMobilePath, productTabletPath } from "@/lib/storefront/productUrls";
import { formatCurrency } from "@/lib/utils/format";
import type { OrderItem, Product, ProductOption } from "@/types/commerce";

type CompanyProductOperationsGridProps = {
  products: Product[];
  options: ProductOption[];
  orderItems: OrderItem[];
  editableProductIds: string[];
};

type StockFilter = "all" | "low" | "soldout";
type SortKey = "newest" | "discount" | "price-low" | "price-high" | "stock-low" | "name";

const columns: OperationsTableColumn[] = [
  { key: "no", label: "no.", width: "56px", align: "right", sticky: "left" },
  { key: "status", label: "상태", width: "100px" },
  { key: "product", label: "상품명", width: "260px", sticky: "left" },
  { key: "category", label: "카테고리", width: "140px" },
  { key: "listPrice", label: "원판매가", width: "120px", align: "right" },
  { key: "openPrice", label: "오픈몰 판매가", width: "120px", align: "right" },
  { key: "closedPrice", label: "폐쇄몰 판매가", width: "130px", align: "right" },
  { key: "discount", label: "할인율", width: "90px", align: "right" },
  { key: "bucket", label: "할인배너", width: "110px" },
  { key: "stock", label: "재고", width: "80px", align: "right" },
  { key: "options", label: "옵션", width: "180px" },
  { key: "sold", label: "판매량", width: "90px", align: "right" },
  { key: "sales", label: "매출", width: "120px", align: "right" },
  { key: "urls", label: "URL", width: "170px" },
  { key: "actions", label: "관리", width: "190px", sticky: "right" },
];

function statusPill(status: Product["status"]) {
  const label: Record<Product["status"], string> = {
    draft: "임시저장",
    pending_approval: "검토중",
    approved: "판매중",
    rejected: "반려",
    suspended: "판매중지",
    archived: "보관",
  };
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : status === "pending_approval"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : status === "rejected" || status === "suspended"
          ? "bg-rose-50 text-rose-800 ring-rose-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${tone}`}>{label[status] ?? status}</span>;
}

function discountRate(product: Product) {
  if (product.priceComparisonVerified !== true || !product.comparisonVerificationSource?.trim()) return 0;

  return calculateProductPriceMetrics({
    listPrice: product.comparison.listPrice,
    platformLowestPrice: product.comparison.platformLowestPrice,
    closedMallPrice: product.comparison.closedMallPrice || product.price,
  }).normalDiscountRate;
}

function discountBucket(rate: number) {
  if (rate >= 51) return "51% 이상";
  if (rate >= 36) return "36~50%";
  if (rate >= 26) return "26~35%";
  if (rate >= 10) return "10~25%";
  return "해당 없음";
}

function timeValue(product: Product) {
  const value = product.seededAt ? Date.parse(product.seededAt) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function CompanyProductOperationsGrid({
  products,
  options,
  orderItems,
  editableProductIds,
}: CompanyProductOperationsGridProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Product["status"] | "all">("all");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [copyMessage, setCopyMessage] = useState("");
  const editableIds = useMemo(() => new Set(editableProductIds), [editableProductIds]);
  const optionsByProductId = useMemo(() => {
    const byId = new Map<string, ProductOption[]>();

    for (const option of options) {
      const rows = byId.get(option.productId) ?? [];
      rows.push(option);
      byId.set(option.productId, rows);
    }

    return byId;
  }, [options]);
  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);
  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return products
      .filter((product) => {
        const productOptions = optionsByProductId.get(product.id) ?? [];
        const searchText = [
          product.id,
          product.name,
          product.brand,
          product.category,
          product.subtitle,
          product.externalProductCode,
          ...productOptions.map((option) => option.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (keyword && !searchText.includes(keyword)) return false;
        if (status !== "all" && product.status !== status) return false;
        if (category !== "all" && product.category !== category) return false;
        if (stockFilter === "low" && product.stock >= 10) return false;
        if (stockFilter === "soldout" && product.stock > 0) return false;
        return true;
      })
      .sort((left, right) => {
        if (sortKey === "newest") return timeValue(right) - timeValue(left) || right.id.localeCompare(left.id);
        if (sortKey === "discount") return discountRate(right) - discountRate(left);
        if (sortKey === "price-low") return left.price - right.price;
        if (sortKey === "price-high") return right.price - left.price;
        if (sortKey === "stock-low") return left.stock - right.stock;
        return left.name.localeCompare(right.name, "ko");
      });
  }, [category, optionsByProductId, products, query, sortKey, status, stockFilter]);

  async function copyProductUrl(path: string, label: string) {
    const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

    try {
      await window.navigator.clipboard.writeText(url);
      setCopyMessage(`${label} URL 복사 완료`);
    } catch {
      setCopyMessage(url);
    }
  }

  return (
    <section className="grid gap-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">상품 운영</p>
            <h2 className="mt-1 text-xl font-normal text-slate-950">상품관리 엑셀 목록</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-normal">
            <span className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">전체 {products.length}</span>
            <span className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">판매중 {products.filter((product) => product.status === "approved").length}</span>
            <span className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">재고주의 {products.filter((product) => product.stock < 10).length}</span>
          </div>
        </div>
        {copyMessage ? <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-normal text-slate-600">{copyMessage}</p> : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(140px,1fr))]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-emerald-500"
            placeholder="상품명, 브랜드, 카테고리, 옵션명, 상품코드 검색"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value as Product["status"] | "all")} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal">
            <option value="all">전체 상태</option>
            <option value="approved">판매중</option>
            <option value="suspended">판매중지</option>
            <option value="draft">임시저장</option>
            <option value="pending_approval">검토중</option>
            <option value="rejected">반려</option>
            <option value="archived">보관</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal">
            <option value="all">전체 카테고리</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal">
            <option value="all">전체 재고</option>
            <option value="low">10개 미만</option>
            <option value="soldout">품절</option>
          </select>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal">
            <option value="newest">최신 등록순</option>
            <option value="discount">할인율 높은순</option>
            <option value="price-low">가격 낮은순</option>
            <option value="price-high">가격 높은순</option>
            <option value="stock-low">재고 낮은순</option>
            <option value="name">상품명순</option>
          </select>
        </div>
      </section>

      <OperationsTable
        caption={`검색 결과 ${filteredProducts.length}개 / 목록에서 수정, 미리보기, PC·모바일 URL 복사를 바로 처리`}
        columns={columns}
        rows={filteredProducts.map((product, index) => {
          const productOptions = optionsByProductId.get(product.id) ?? [];
          const rate = discountRate(product);
          const productOrderItems = orderItems.filter((item) => item.productName === product.name);
          const soldQuantity = productOrderItems.reduce((total, item) => total + item.quantity, 0);
          const salesAmount = productOrderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
          const canEdit = editableIds.has(product.id);

          return {
            id: product.id,
            cells: {
              no: index + 1,
              status: statusPill(product.status),
              product: (
                <span className="grid gap-1">
                  <span className="font-normal text-slate-950">{product.name}</span>
                  <span className="font-mono text-xs text-slate-500">{product.externalProductCode ?? product.id}</span>
                </span>
              ),
              category: product.category,
              listPrice: formatCurrency(product.comparison.listPrice),
              openPrice: formatCurrency(product.comparison.platformLowestPrice),
              closedPrice: <span className="font-normal text-rose-600">{formatCurrency(product.comparison.closedMallPrice || product.price)}</span>,
              discount: `${rate}%`,
              bucket: discountBucket(rate),
              stock: <span className={product.stock < 10 ? "font-normal text-amber-700" : "font-normal text-slate-950"}>{product.stock}</span>,
              options: productOptions.map((option) => option.name).join(", ") || "기본",
              sold: soldQuantity,
              sales: formatCurrency(salesAmount),
              urls: (
                <span className="grid gap-1 text-xs">
                  <button type="button" onClick={() => void copyProductUrl(productTabletPath(product), "PC")} className="text-left text-blue-700">PC URL 복사</button>
                  <button type="button" onClick={() => void copyProductUrl(productMobilePath(product), "모바일")} className="text-left text-emerald-700">모바일 URL 복사</button>
                </span>
              ),
              actions: (
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <Link href={`/company/products/${product.id}/edit`} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white">수정</Link>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-normal text-slate-400">권한 없음</span>
                  )}
                  <Link href={`/company/products/preview?productId=${encodeURIComponent(product.id)}`} className="rounded-md bg-white px-3 py-2 text-xs font-normal text-slate-700 ring-1 ring-slate-200">미리보기</Link>
                </div>
              ),
            },
          };
        })}
        emptyMessage="조건에 맞는 상품이 없습니다."
      />
    </section>
  );
}
