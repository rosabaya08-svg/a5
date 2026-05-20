import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

const companyId = "company-sanho-care";

const companyNav: NavItem[] = [
  { href: "/company/dashboard", label: "대시보드" },
  { href: "/company/products", label: "상품" },
  { href: "/company/products/new", label: "상품 등록" },
  { href: "/company/orders", label: "주문" },
  { href: "/company/inventory", label: "재고" },
  { href: "/company/deliveries", label: "배송/수령" },
  { href: "/company/sales", label: "매출" },
  { href: "/company/payouts", label: "입금" },
];

function CompanyShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sectionTitle="기업 Admin"
      title={title}
      subtitle={subtitle}
      scopeLabel="COMPANY_ADMIN / company_id scoped"
      navItems={companyNav}
      accent="company"
    >
      {children}
    </AppShell>
  );
}

export function CompanyIndexPage() {
  return <CompanyDashboardPage />;
}

export function CompanyDashboardPage() {
  const products = mockApi.products().filter((product) => product.companyId === companyId);

  return (
    <CompanyShell title="기업 대시보드" subtitle="상품, 주문, 재고, 입금 예정 금액을 입점사 기준으로 확인합니다.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.companyMetrics(companyId).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6">
        <FilterBar title="최근 상품 상태" filters={["내 company_id", "승인대기", "재고부족"]} />
        <DataTable
          columns={["상품", "카테고리", "상태", "가격", "재고"]}
          rows={products.map((product) => ({
            id: product.id,
            cells: [
              <span key="name" className="font-semibold text-slate-950">{product.name}</span>,
              product.category,
              <StatusBadge key="status" status={product.status} />,
              formatCurrency(product.price),
              product.stock,
            ],
          }))}
        />
      </div>
    </CompanyShell>
  );
}

export function CompanyProductsPage() {
  const options = mockApi.productOptions();

  return (
    <CompanyShell title="상품 관리" subtitle="상품 승인 상태와 옵션 재고를 확인합니다.">
      <FilterBar title="상품 필터" filters={["승인완료", "승인요청", "외부 재고 코드"]} />
      <DataTable
        columns={["상품", "상태", "가격", "옵션", "외부코드", "재고"]}
        rows={mockApi
          .products()
          .filter((product) => product.companyId === companyId)
          .map((product) => ({
            id: product.id,
            cells: [
              product.name,
              <StatusBadge key="status" status={product.status} />,
              formatCurrency(product.price),
              options.filter((option) => option.productId === product.id).map((option) => option.name).join(", ") || "기본",
              product.externalProductCode ?? "미등록",
              product.stock,
            ],
          }))}
      />
    </CompanyShell>
  );
}

export function CompanyProductNewPage() {
  return (
    <CompanyShell title="상품 등록 초안" subtitle="실제 저장 없이 등록 폼 구조와 필수 입력 항목만 표시합니다.">
      <ConfirmBox
        title="저장 동작 없음"
        description="이 화면은 mock/test 베타용 UI입니다. 이미지 업로드, Firebase Storage, 상품 저장 Server Action은 아직 만들지 않습니다."
        confirmLabel="mock form"
      />
      <div className="mt-4 grid gap-4 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2">
        {["상품명", "카테고리", "폐쇄몰 가격", "플랫폼 최저가", "외부 상품 코드", "배송/수령 방식"].map((label) => (
          <label key={label} className="grid gap-2 text-sm font-semibold text-slate-700">
            {label}
            <input
              readOnly
              value="mock 입력 대기"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500"
            />
          </label>
        ))}
      </div>
    </CompanyShell>
  );
}

export function CompanyOrdersPage() {
  const companyOrderIds = mockApi
    .orderItems()
    .filter((item) => item.companyId === companyId)
    .map((item) => item.orderId);

  return (
    <CompanyShell title="주문 관리" subtitle="입점사에 배정된 order_items 기준 주문만 확인합니다.">
      <DataTable
        columns={["주문번호", "고객", "상태", "수령", "금액", "생성"]}
        rows={mockApi
          .orders()
          .filter((order) => companyOrderIds.includes(order.id))
          .map((order) => ({
            id: order.id,
            cells: [
              <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-semibold text-emerald-700">
                {order.orderNo}
              </Link>,
              order.customerName,
              <StatusBadge key="status" status={order.status} />,
              order.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
              formatCurrency(order.totalAmount),
              formatDateTime(order.createdAt),
            ],
          }))}
      />
    </CompanyShell>
  );
}

export function CompanyInventoryPage() {
  return (
    <CompanyShell title="재고 관리" subtitle="내 상품의 내부 재고와 외부 재고 코드 매핑 상태를 확인합니다.">
      <DataTable
        columns={["상품", "내부 재고", "외부 상품 코드", "동기화 방식", "주의"]}
        rows={mockApi
          .products()
          .filter((product) => product.companyId === companyId)
          .map((product) => ({
            id: product.id,
            cells: [
              product.name,
              product.stock,
              product.externalProductCode ?? "미등록",
              "mock adapter",
              product.stock < 10 ? "재고 부족" : "정상",
            ],
          }))}
      />
    </CompanyShell>
  );
}

export function CompanyDeliveriesPage() {
  return (
    <CompanyShell title="배송/현장수령" subtitle="송장 입력과 현장수령 처리는 mock 상태로만 표시합니다.">
      <DataTable
        columns={["주문상세", "상품", "수량", "상태", "정산 기준액"]}
        rows={mockApi
          .orderItems()
          .filter((item) => item.companyId === companyId)
          .map((item) => ({
            id: item.id,
            cells: [
              item.id,
              item.productName,
              item.quantity,
              item.deliveryStatus,
              formatCurrency(item.settlementAmount),
            ],
          }))}
      />
    </CompanyShell>
  );
}

export function CompanySalesPage() {
  return (
    <CompanyShell title="매출 현황" subtitle="orders 총액이 아니라 입점사 order_items 기준으로 표시합니다.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.companyMetrics(companyId).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-4">
        <ConfirmBox
          title="정산 기준 안내"
          description="매출과 입금 예정액은 상품별 order_items snapshot을 기준으로 계산해야 하며, 운영 지급은 이 화면에서 처리하지 않습니다."
        />
      </div>
    </CompanyShell>
  );
}

export function CompanyPayoutsPage() {
  return (
    <CompanyShell title="입금 현황" subtitle="mock 정산 상태와 지급 차단 여부를 확인합니다.">
      <DataTable
        columns={["기간", "상태", "총액", "수수료", "보류", "예상입금"]}
        rows={mockApi
          .settlements()
          .filter((settlement) => settlement.companyId === companyId)
          .map((settlement) => ({
            id: settlement.id,
            cells: [
              settlement.period,
              <StatusBadge key="status" status={settlement.status} />,
              formatCurrency(settlement.grossAmount),
              formatCurrency(settlement.commissionAmount),
              formatCurrency(settlement.refundHoldAmount),
              formatCurrency(settlement.payoutAmount),
            ],
          }))}
      />
    </CompanyShell>
  );
}
