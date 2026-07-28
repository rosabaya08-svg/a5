"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OperationsTable, type OperationsTableColumn } from "@/components/ui/OperationsTable";
import { calculateProductPriceMetrics } from "@/lib/company/priceMetrics";
import { manageCompanyProduct, type CompanyProductLifecycleAction } from "@/lib/firebase/contentRepository";
import { productBusinessProductPath, productMobilePath, productTabletPath } from "@/lib/storefront/productUrls";
import { formatCurrency } from "@/lib/utils/format";
import type { Order, OrderItem, Product, ProductOption } from "@/types/commerce";

type CompanyProductManagementPanelProps = {
  products: Product[];
  options: ProductOption[];
  editableProductIds: string[];
  orderItems?: OrderItem[];
  orders?: Order[];
  view?: ProductManagementView;
};

export type ProductManagementView = "dashboard" | "list";
type StockFilter = "all" | "low" | "soldout";
type SortKey = "newest" | "price-low" | "price-high" | "stock-low" | "name" | "discount";
type ProductStatusFilter = Product["status"] | "all";

const statusLabels: Record<Product["status"], string> = {
  draft: "임시 저장",
  pending_approval: "검토 대기",
  approved: "판매중",
  rejected: "반려",
  suspended: "판매중지",
  archived: "보관",
};

const productListColumns: OperationsTableColumn[] = [
  { key: "no", label: "no.", width: "56px", align: "right" },
  { key: "status", label: "상태", width: "110px" },
  { key: "product", label: "상품명", width: "260px", sticky: "left" },
  { key: "brand", label: "브랜드", width: "140px" },
  { key: "businessNo", label: "사업자번호", width: "130px" },
  { key: "category", label: "카테고리", width: "140px" },
  { key: "listPrice", label: "원판매가", width: "120px", align: "right" },
  { key: "openPrice", label: "오픈몰 판매가", width: "130px", align: "right" },
  { key: "closedPrice", label: "폐쇄몰 판매가", width: "130px", align: "right" },
  { key: "discount", label: "할인률", width: "88px", align: "right" },
  { key: "discountBucket", label: "할인 배너", width: "120px" },
  { key: "stock", label: "재고", width: "80px", align: "right" },
  { key: "options", label: "옵션", width: "180px" },
  { key: "sold", label: "판매량", width: "88px", align: "right" },
  { key: "sales", label: "매출", width: "120px", align: "right" },
  { key: "code", label: "상품코드", width: "170px" },
  { key: "pcUrl", label: "폐쇄몰 URL", width: "110px" },
  { key: "businessUrl", label: "사업자 URL", width: "120px" },
  { key: "mobileUrl", label: "모바일 URL", width: "120px" },
  { key: "actions", label: "관리", width: "190px", sticky: "right" },
];

function statusLabel(status: Product["status"]) {
  return statusLabels[status] ?? status;
}

function statusClass(status: Product["status"]) {
  if (status === "approved") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "pending_approval") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (status === "rejected" || status === "suspended") return "bg-rose-50 text-rose-800 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function discountBucket(rate: number) {
  if (rate >= 51) return "51% 이상";
  if (rate >= 36) return "36~50%";
  if (rate >= 21) return "21~35%";
  if (rate >= 10) return "10~20%";
  return "해당 없음";
}

function priceMetrics(product: Product) {
  return calculateProductPriceMetrics({
    listPrice: product.comparison.listPrice,
    platformLowestPrice: product.comparison.platformLowestPrice,
    closedMallPrice: product.comparison.closedMallPrice || product.price,
  });
}

function productBusinessNo(product: Product) {
  return product.sellerBusinessNoNormalized ?? product.sellerBusinessNo ?? product.companyId;
}

function productSearchText(product: Product, options: ProductOption[]) {
  return [
    product.id,
    product.name,
    product.brand,
    product.category,
    product.subtitle,
    product.externalProductCode,
    ...options.map((option) => option.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function timeValue(product: Product) {
  const value = product.seededAt ? Date.parse(product.seededAt) : 0;
  return Number.isFinite(value) ? value : 0;
}

function AiPriceCompareModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const metrics = priceMetrics(product);
  const closedMallPrice = product.comparison.closedMallPrice || product.price;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <section className="w-full max-w-md rounded-sm bg-white p-5 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-rose-600">인공지능 가격 비교</p>
            <h2 className="mt-1 text-2xl font-normal">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-sm bg-slate-100 text-sm font-normal">
            닫기
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {[
            ["원판매가", formatCurrency(product.comparison.listPrice)],
            ["오픈몰 판매가", formatCurrency(product.comparison.platformLowestPrice)],
            ["폐쇄몰 판매가", formatCurrency(closedMallPrice)],
            ["할인률", `${metrics.normalDiscountRate}%`],
            ["인공지능 비교 차액", formatCurrency(metrics.platformDiscountAmount)],
            ["오픈몰 대비 차액률", `${metrics.platformDiscountRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-sm bg-slate-50 p-3 text-sm">
              <span className="font-normal text-slate-500">{label}</span>
              <span className="text-right text-slate-950">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-sm bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
          할인률은 원판매가와 폐쇄몰 판매가 기준으로 계산됩니다. 인공지능 비교 차액은 오픈몰 판매가와 폐쇄몰 판매가의 차이입니다.
        </div>
      </section>
    </div>
  );
}

export function CompanyProductManagementPanel({
  products,
  options,
  editableProductIds,
  orderItems = [],
  orders = [],
  view = "list",
}: CompanyProductManagementPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [selectedAiProduct, setSelectedAiProduct] = useState<Product | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [lifecycleMessage, setLifecycleMessage] = useState("");
  const [pendingProductId, setPendingProductId] = useState("");
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
        if (keyword && !productSearchText(product, productOptions).includes(keyword)) return false;
        if (status !== "all" && product.status !== status) return false;
        if (category !== "all" && product.category !== category) return false;
        if (stockFilter === "low" && product.stock >= 10) return false;
        if (stockFilter === "soldout" && product.stock > 0) return false;
        return true;
      })
      .sort((left, right) => {
        if (sortKey === "newest") return timeValue(right) - timeValue(left) || right.id.localeCompare(left.id);
        if (sortKey === "price-low") return left.price - right.price;
        if (sortKey === "price-high") return right.price - left.price;
        if (sortKey === "stock-low") return left.stock - right.stock;
        if (sortKey === "name") return left.name.localeCompare(right.name, "ko");
        return priceMetrics(right).normalDiscountRate - priceMetrics(left).normalDiscountRate;
      });
  }, [category, optionsByProductId, products, query, sortKey, status, stockFilter]);
  const liveCount = filteredProducts.filter((product) => product.status === "approved").length;
  const stoppedCount = filteredProducts.filter((product) => product.status === "suspended").length;
  const lowStockCount = filteredProducts.filter((product) => product.stock < 10).length;
  const totalStock = products.reduce((total, product) => total + product.stock, 0);
  const soldUnits = orderItems.reduce((total, item) => total + item.quantity, 0);
  const salesAmount = orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const paidOrders = orders.filter((order) => !["pending_payment", "cancelled", "refunded"].includes(order.status)).length;

  async function copyProductUrl(path: string, label: string) {
    const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

    try {
      await window.navigator.clipboard.writeText(url);
      setCopyMessage(`${label} URL 복사 완료: ${url}`);
    } catch {
      setCopyMessage(url);
    }
  }
  async function changeProductLifecycle(product: Product, action: CompanyProductLifecycleAction, hasOrders: boolean) {
    const actionLabel = action === "archive"
      ? "\uC0AD\uC81C(\uD734\uC9C0\uD1B5 \uC774\uB3D9)"
      : action === "suspend"
        ? "\uD310\uB9E4\uC911\uC9C0"
        : "\uBCF5\uAD6C";
    const orderNotice = hasOrders ? " \uC8FC\uBB38 \uC774\uB825\uC740 \uBCF4\uC874\uB429\uB2C8\uB2E4." : "";
    if (!window.confirm(`${product.name}: ${actionLabel}?${orderNotice}`)) return;

    setPendingProductId(product.id);
    setLifecycleMessage(`${product.name}: ${actionLabel} \uCC98\uB9AC \uC911`);
    try {
      await manageCompanyProduct(product.id, action, actionLabel);
      setLifecycleMessage(`${product.name}: ${actionLabel} \uBC18\uC601`);
      router.refresh();
    } catch (error) {
      setLifecycleMessage(error instanceof Error ? `\uC0C1\uD488 \uCC98\uB9AC \uC2E4\uD328: ${error.message}` : "\uC0C1\uD488 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setPendingProductId("");
    }
  }

  return (
    <section className="grid gap-4">
      {view === "dashboard" ? (
        <section id="product-dashboard" className="grid scroll-mt-6 gap-4">
          <div className="overflow-hidden rounded-sm border border-slate-300 bg-white">
            <div className="grid bg-slate-50 text-sm md:grid-cols-4">
              {[
                ["등록 상품", `${products.length}개`, `판매중 ${products.filter((product) => product.status === "approved").length}개`],
                ["판매량", `${soldUnits}개`, `결제 주문 ${paidOrders}건 기준`],
                ["총 재고", `${totalStock}개`, `재고주의 ${products.filter((product) => product.stock < 10).length}개`],
                ["상품 매출", formatCurrency(salesAmount), "주문 항목 기준 매출"],
              ].map(([label, value, helper]) => (
                <div key={label} className="border-b border-r border-slate-300 p-4 last:border-r-0 md:border-b-0">
                  <p className="text-xs font-normal uppercase tracking-[0.12em] text-emerald-700">{label}</p>
                  <p className="mt-2 text-2xl font-normal text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{helper}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="overflow-x-auto rounded-sm border border-slate-300 bg-white">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <caption className="sr-only">상품 현황 요약 목록</caption>
              <thead className="bg-slate-50 text-xs font-normal text-slate-600">
                <tr>
                  {["상품명", "상태", "가격", "할인률", "재고", "최근 등록"].map((header) => (
                    <th key={header} className="border border-slate-300 px-3 py-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 12).map((product) => {
                  const metrics = priceMetrics(product);

                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-3 py-2">
                        <span className="text-slate-950">{product.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{product.brand ?? product.companyId}</span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2">
                        <span className={`rounded-sm px-2 py-1 text-xs font-normal ring-1 ${statusClass(product.status)}`}>
                          {statusLabel(product.status)}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-rose-600">{formatCurrency(product.price)}</td>
                      <td className="border border-slate-300 px-3 py-2">{metrics.normalDiscountRate}%</td>
                      <td className="border border-slate-300 px-3 py-2">{product.stock}</td>
                      <td className="border border-slate-300 px-3 py-2 text-slate-500">{product.seededAt ? product.seededAt.slice(0, 10) : "-"}</td>
                    </tr>
                  );
                })}
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-slate-300 px-3 py-8 text-center text-slate-500">
                      등록된 상품이 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </section>
      ) : null}

      {view === "list" ? (
        <section id="product-list" className="scroll-mt-6 rounded-sm border border-slate-300 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">상품 목록</p>
              <h2 className="mt-1 text-xl font-normal text-slate-950">등록 상품 관리</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                검색, 정렬, 수정, 미리보기, 상품 URL 복사를 표에서 처리합니다.
              </p>
            </div>
            <div className="grid gap-2 text-xs">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <span className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-700">결과 {filteredProducts.length}</span>
                <span className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">판매중 {liveCount}</span>
                <span className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">판매중지 {stoppedCount}</span>
                <span className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">재고주의 {lowStockCount}</span>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Link href="/company/products/new" className="rounded-sm bg-slate-950 px-3 py-2 text-white">
                  상품 등록
                </Link>
                <Link href="/company/excel" className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-700">
                  엑셀 일괄 등록
                </Link>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-300 p-4">
            {copyMessage ? <p className="mb-3 rounded-sm bg-slate-50 px-3 py-2 text-xs text-slate-600">{copyMessage}</p> : null}
            {lifecycleMessage ? <p className="mb-3 rounded-sm bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{lifecycleMessage}</p> : null}
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(140px,1fr))]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="rounded-sm border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
                placeholder="상품명, 브랜드, 카테고리, 옵션명, 상품코드 검색"
              />
              <select value={status} onChange={(event) => setStatus(event.target.value as ProductStatusFilter)} className="rounded-sm border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="all">전체 상태</option>
                <option value="approved">판매중</option>
                <option value="suspended">판매중지</option>
                <option value="draft">임시 저장</option>
                <option value="pending_approval">검토 대기</option>
                <option value="rejected">반려</option>
                <option value="archived">보관</option>
              </select>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-sm border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="all">전체 카테고리</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="rounded-sm border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="all">전체 재고</option>
                <option value="low">10개 미만</option>
                <option value="soldout">품절</option>
              </select>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="rounded-sm border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="newest">최신 등록순</option>
                <option value="discount">할인률 높은순</option>
                <option value="price-low">가격 낮은순</option>
                <option value="price-high">가격 높은순</option>
                <option value="stock-low">재고 낮은순</option>
                <option value="name">상품명순</option>
              </select>
            </div>
          </div>

          <OperationsTable
            caption={`검색 결과 ${filteredProducts.length}개 / 수정, 미리보기, URL 복사를 행 단위로 처리`}
            columns={productListColumns}
            rows={filteredProducts.map((product, index) => {
              const metrics = priceMetrics(product);
              const productOptions = optionsByProductId.get(product.id) ?? [];
              const canEdit = editableIds.has(product.id);
              const productOrderItems = orderItems.filter((item) => item.productName === product.name);
              const soldQuantity = productOrderItems.reduce((total, item) => total + item.quantity, 0);
              const salesTotal = productOrderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
              const closedMallPrice = product.comparison.closedMallPrice || product.price;

              return {
                id: product.id,
                cells: {
                  no: index + 1,
                  status: (
                    <span className={`rounded-sm px-2.5 py-1 text-xs font-normal ring-1 ${statusClass(product.status)}`}>
                      {statusLabel(product.status)}
                    </span>
                  ),
                  product: (
                    <span className="grid gap-1">
                      <span className="font-normal text-slate-950">{product.name}</span>
                      {product.seededAt ? <span className="text-[11px] text-slate-400">{product.seededAt.slice(0, 10)}</span> : null}
                    </span>
                  ),
                  brand: product.brand ?? product.companyId,
                  businessNo: <span className="font-mono text-xs">{productBusinessNo(product)}</span>,
                  category: product.category,
                  listPrice: formatCurrency(product.comparison.listPrice),
                  openPrice: formatCurrency(product.comparison.platformLowestPrice),
                  closedPrice: <span className="font-normal text-rose-600">{formatCurrency(closedMallPrice)}</span>,
                  discount: `${metrics.normalDiscountRate}%`,
                  discountBucket: discountBucket(metrics.normalDiscountRate),
                  stock: <span className={product.stock < 10 ? "font-normal text-amber-700" : "font-normal text-slate-950"}>{product.stock}</span>,
                  options: productOptions.map((option) => option.name).join(", ") || "기본",
                  sold: soldQuantity,
                  sales: formatCurrency(salesTotal),
                  code: <span className="font-mono text-xs">{product.externalProductCode ?? product.id}</span>,
                  pcUrl: (
                    <button type="button" onClick={() => void copyProductUrl(productTabletPath(product), "폐쇄몰")} className="text-xs text-blue-700">
                      복사
                    </button>
                  ),
                  businessUrl: (
                    <button type="button" onClick={() => void copyProductUrl(productBusinessProductPath(product), "사업자")} className="text-xs text-rose-700">
                      복사
                    </button>
                  ),
                  mobileUrl: (
                    <button type="button" onClick={() => void copyProductUrl(productMobilePath(product), "모바일")} className="text-xs text-emerald-700">
                      복사
                    </button>
                  ),
                  actions: (
                    <div className="flex flex-wrap gap-2">
                      {canEdit ? (
                        product.status === "archived" ? (
                          <button type="button" disabled={pendingProductId === product.id} onClick={() => void changeProductLifecycle(product, "restore", productOrderItems.length > 0)} className="rounded-sm bg-emerald-600 px-3 py-2 text-xs text-white disabled:opacity-40">
                            {"\uBCF5\uAD6C"}
                          </button>
                        ) : (
                          <>
                            <button type="button" disabled={pendingProductId === product.id} onClick={() => void changeProductLifecycle(product, product.status === "suspended" ? "restore" : "suspend", productOrderItems.length > 0)} className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 disabled:opacity-40">
                              {product.status === "suspended" ? "\uD310\uB9E4 \uC7AC\uAC1C" : "\uD310\uB9E4\uC911\uC9C0"}
                            </button>
                            <button type="button" disabled={pendingProductId === product.id} onClick={() => void changeProductLifecycle(product, "archive", productOrderItems.length > 0)} className="rounded-sm border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 disabled:opacity-40">
                              {"\uC0AD\uC81C(\uD734\uC9C0\uD1B5)"}
                            </button>
                          </>
                        )
                      ) : null}
                      {canEdit ? (
                        <Link href={`/company/products/${product.id}/edit`} className="rounded-sm bg-slate-950 px-3 py-2 text-xs text-white">
                          수정
                        </Link>
                      ) : (
                        <span className="rounded-sm bg-slate-100 px-3 py-2 text-xs text-slate-400">권한 없음</span>
                      )}
                      <Link href={`/company/products/preview?productId=${encodeURIComponent(product.id)}`} className="rounded-sm bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
                        미리보기
                      </Link>
                      <button type="button" onClick={() => setSelectedAiProduct(product)} className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        가격 비교
                      </button>
                    </div>
                  ),
                },
              };
            })}
            emptyMessage="조건에 맞는 상품이 없습니다."
          />
        </section>
      ) : null}
      {selectedAiProduct ? <AiPriceCompareModal product={selectedAiProduct} onClose={() => setSelectedAiProduct(null)} /> : null}
    </section>
  );
}
