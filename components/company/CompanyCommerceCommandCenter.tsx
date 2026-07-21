import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Order, OrderItem, Product } from "@/types/commerce";

type CompanyCommerceCommandCenterProps = {
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
};

function countBy<T>(items: T[], predicate: (item: T) => boolean) {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

export function CompanyCommerceCommandCenter({ products, orders, orderItems }: CompanyCommerceCommandCenterProps) {
  const sellingProducts = countBy(products, (product) => ["active", "approved"].includes(String(product.status)));
  const lowStockProducts = countBy(products, (product) => product.stock < 10);
  const shippingReadyItems = countBy(orderItems, (item) =>
    ["paid", "ready", "invoice_pending", "pickup_ready"].includes(String(item.deliveryStatus)),
  );
  const grossSales = orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const latestOrder = [...orders].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  const quickLinks = [
    {
      title: "상품 관리",
      body: "상품을 등록하고 가격, 이미지, 재고를 수정합니다.",
      href: "/company/products/list",
      badge: `${products.length}개`,
    },
    {
      title: "주문 확인",
      body: "새 주문과 주문별 상품 정보를 확인합니다.",
      href: "/company/orders",
      badge: `${orderItems.length}건`,
    },
    {
      title: "배송 처리",
      body: "배송 준비, 송장 입력, 현장수령 상태를 처리합니다.",
      href: "/company/deliveries",
      badge: `${shippingReadyItems}건`,
    },
    {
      title: "브랜드관 꾸미기",
      body: "로고, 배너, 브랜드 소개와 추천 상품을 관리합니다.",
      href: "/company/brand-page",
      badge: "브랜드",
    },
    {
      title: "고객 소통",
      body: "공지, 이벤트와 고객 안내 내용을 관리합니다.",
      href: "/company/brand-messages",
      badge: "소통",
    },
    {
      title: "광고 관리",
      body: "기업 광고 소재와 폐쇄몰 노출 현황을 확인합니다.",
      href: "/company/ads",
      badge: "광고",
    },
  ];

  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">오늘 처리할 업무</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">판매 운영</h2>
          <p className="mt-2 max-w-3xl text-sm font-normal leading-6 text-slate-600">
            상품, 주문, 배송과 브랜드 홍보에 필요한 메뉴만 모았습니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-normal md:grid-cols-4">
          <span className="rounded-md bg-white px-3 py-2 text-emerald-800 ring-1 ring-emerald-200">판매 상품 {sellingProducts}</span>
          <span className="rounded-md bg-white px-3 py-2 text-rose-800 ring-1 ring-rose-200">재고 주의 {lowStockProducts}</span>
          <span className="rounded-md bg-white px-3 py-2 text-blue-800 ring-1 ring-blue-200">처리 주문 {shippingReadyItems}</span>
          <span className="rounded-md bg-white px-3 py-2 text-slate-800 ring-1 ring-slate-200">주문 상품 {orderItems.length}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-white bg-white p-4 text-slate-950 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-normal">{item.title}</h3>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-normal text-slate-700">{item.badge}</span>
              </div>
              <p className="mt-2 text-sm font-normal leading-6 text-slate-600">{item.body}</p>
            </Link>
          ))}
        </div>

        <aside className="rounded-md border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-normal tracking-[0.14em] text-slate-500">판매 현황</p>
          <dl className="mt-3 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-normal text-slate-500">주문 매출</dt>
              <dd className="font-normal text-slate-950">{formatCurrency(grossSales)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-normal text-slate-500">판매 상품</dt>
              <dd className="font-normal text-slate-950">{sellingProducts.toLocaleString()}개</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-normal text-slate-500">배송 처리</dt>
              <dd className="font-normal text-slate-950">{shippingReadyItems.toLocaleString()}건</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-normal text-slate-500">최근 주문</dt>
              <dd className="text-right font-normal text-slate-950">
                {latestOrder ? `${latestOrder.orderNo} / ${formatDateTime(latestOrder.createdAt)}` : "-"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}