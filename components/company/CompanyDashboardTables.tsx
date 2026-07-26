"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Order, Product } from "@/types/commerce";

type ProductFilter = "all" | "selling" | "pending" | "low_stock";
type OrderFilter = "all" | "paid" | "preparing" | "shipping";

function Controls<T extends string>({
  value,
  options,
  search,
  placeholder,
  onValueChange,
  onSearchChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  search: string;
  placeholder: string;
  onValueChange: (value: T) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={`rounded-md border px-3 py-2 text-xs ${
              value === option.value
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompanyDashboardTables({ products, orders }: { products: Product[]; orders: Order[] }) {
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [productSearch, setProductSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [orderSearch, setOrderSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const keyword = productSearch.trim().toLocaleLowerCase("ko-KR");
    return products.filter((product) => {
      if (keyword && !`${product.name} ${product.externalProductCode ?? ""}`.toLocaleLowerCase("ko-KR").includes(keyword)) return false;
      if (productFilter === "selling" && !["active", "approved"].includes(String(product.status))) return false;
      if (productFilter === "pending" && !["draft", "pending", "pending_review"].includes(String(product.status))) return false;
      if (productFilter === "low_stock" && product.stock >= 10) return false;
      return true;
    });
  }, [productFilter, productSearch, products]);

  const filteredOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLocaleLowerCase("ko-KR");
    return orders.filter((order) => {
      if (keyword && !`${order.orderNo} ${order.customerName}`.toLocaleLowerCase("ko-KR").includes(keyword)) return false;
      if (orderFilter === "paid" && String(order.status) !== "paid") return false;
      if (orderFilter === "preparing" && !["preparing", "ready_to_ship"].includes(String(order.status))) return false;
      if (orderFilter === "shipping" && !["shipping", "in_transit"].includes(String(order.status))) return false;
      return true;
    });
  }, [orderFilter, orderSearch, orders]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section>
        <Controls
          value={productFilter}
          options={[
            { value: "all", label: "전체" },
            { value: "selling", label: "판매중" },
            { value: "pending", label: "검토 대기" },
            { value: "low_stock", label: "재고 부족" },
          ]}
          search={productSearch}
          placeholder="상품명 또는 외부상품코드 검색"
          onValueChange={setProductFilter}
          onSearchChange={setProductSearch}
        />
        <p className="mb-2 text-xs text-slate-500">{filteredProducts.length.toLocaleString()}건</p>
        <DataTable
          columns={["상품", "상태", "판매가", "재고"]}
          rows={filteredProducts.map((product) => ({
            id: product.id,
            cells: [product.name, <StatusBadge key="status" status={product.status} />, formatCurrency(product.price), product.stock],
          }))}
          emptyMessage="조건에 맞는 상품이 없습니다."
        />
      </section>
      <section>
        <Controls
          value={orderFilter}
          options={[
            { value: "all", label: "전체" },
            { value: "paid", label: "결제 완료" },
            { value: "preparing", label: "배송 준비" },
            { value: "shipping", label: "배송 중" },
          ]}
          search={orderSearch}
          placeholder="주문번호 또는 주문자명 검색"
          onValueChange={setOrderFilter}
          onSearchChange={setOrderSearch}
        />
        <p className="mb-2 text-xs text-slate-500">{filteredOrders.length.toLocaleString()}건</p>
        <DataTable
          columns={["주문번호", "주문일", "상태", "금액"]}
          rows={filteredOrders.map((order) => ({
            id: order.id,
            cells: [order.orderNo, formatDateTime(order.createdAt), <StatusBadge key="status" status={order.status} />, formatCurrency(order.totalAmount)],
          }))}
          emptyMessage="조건에 맞는 주문이 없습니다."
        />
      </section>
    </div>
  );
}
