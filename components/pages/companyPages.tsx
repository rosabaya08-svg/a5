import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { companyNavItems } from "@/components/layout/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

const companyId = "company-test-1004";

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
      sectionTitle="기업 관리자"
      title={title}
      subtitle={subtitle}
      scopeLabel="입점사 업무 범위"
      navItems={companyNavItems}
      accent="company"
    >
      {children}
    </AppShell>
  );
}

function CompanyNoticePanel() {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <h2 className="text-lg font-black">입점사 운영 기준</h2>
      <p className="mt-2 text-sm leading-6">
        상품, 주문, 재고, 정산 정보는 로그인한 기업 범위로만 표시됩니다. 상품은 승인 완료 후 조리원 객실 상품 목록에 노출됩니다.
      </p>
    </section>
  );
}

function companyProducts() {
  return mockApi.products().filter((product) => product.companyId === companyId);
}

function companyOrderItems() {
  return mockApi.orderItems().filter((item) => item.companyId === companyId);
}

function companyOrders() {
  const orderIds = new Set(companyOrderItems().map((item) => item.orderId));
  return mockApi.orders().filter((order) => orderIds.has(order.id));
}

export function CompanyIndexPage() {
  return <CompanyDashboardPage />;
}

export function CompanyDashboardPage() {
  const products = companyProducts();
  const orders = companyOrders();

  return (
    <CompanyShell title="기업 대시보드" subtitle="상품, 주문, 재고, 입금 예정 상태를 확인합니다.">
      <CompanyNoticePanel />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.companyMetrics(companyId).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section>
          <FilterBar title="최근 상품" filters={["전체", "승인완료", "승인요청", "재고부족"]} resultCount={products.length} />
          <DataTable
            columns={["상품", "상태", "가격", "재고"]}
            rows={products.map((product) => ({
              id: product.id,
              cells: [product.name, <StatusBadge key="status" status={product.status} />, formatCurrency(product.price), product.stock],
            }))}
            emptyMessage="등록된 상품이 없습니다."
          />
        </section>
        <section>
          <FilterBar title="최근 주문" filters={["전체", "결제완료", "배송준비", "배송중"]} resultCount={orders.length} />
          <DataTable
            columns={["주문번호", "고객", "상태", "금액"]}
            rows={orders.map((order) => ({
              id: order.id,
              cells: [
                <Link key="order" href="/company/orders" className="font-semibold text-emerald-700">
                  {order.orderNo}
                </Link>,
                order.customerName,
                <StatusBadge key="status" status={order.status} />,
                formatCurrency(order.totalAmount),
              ],
            }))}
            emptyMessage="배정된 주문이 없습니다."
          />
        </section>
      </div>
    </CompanyShell>
  );
}

export function CompanyProductsPage() {
  const products = companyProducts();
  const options = mockApi.productOptions();

  return (
    <CompanyShell title="상품 관리" subtitle="상품 승인 상태, 옵션, 재고, 외부 상품코드를 관리합니다.">
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href="/company/products/new" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          상품 등록
        </Link>
      </div>
      <FilterBar title="상품 필터" filters={["전체", "임시저장", "승인요청", "승인완료", "반려", "판매중지"]} resultCount={products.length} mode="toolbar" />
      <DataTable
        columns={["상품", "카테고리", "상태", "산후조리원 핫딜가", "옵션", "외부코드", "재고"]}
        rows={products.map((product) => ({
          id: product.id,
          cells: [
            product.name,
            product.category,
            <StatusBadge key="status" status={product.status} />,
            formatCurrency(product.price),
            options.filter((option) => option.productId === product.id).map((option) => option.name).join(", ") || "기본",
            product.externalProductCode ?? "미등록",
            product.stock,
          ],
        }))}
        emptyMessage="등록된 상품이 없습니다."
      />
    </CompanyShell>
  );
}

export function CompanyProductNewPage() {
  const fields = [
    ["상품명", "상품명을 입력하세요"],
    ["브랜드", "브랜드명을 입력하세요"],
    ["카테고리", "카테고리를 선택하세요"],
    ["SKU / 옵션", "옵션명, SKU, 재고를 입력하세요"],
    ["정상가", "정상가를 입력하세요"],
    ["플랫폼 최저가", "비교 기준 금액을 입력하세요"],
    ["산후조리원 핫딜가", "판매 금액을 입력하세요"],
    ["배송/수령 방식", "택배배송 또는 현장수령"],
    ["반품/교환/AS", "고객 안내 기준을 입력하세요"],
  ];

  return (
    <CompanyShell title="상품 등록" subtitle="상품 정보를 작성한 뒤 임시 저장하거나 승인 요청을 보냅니다.">
      <form className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(([label, placeholder]) => (
            <label key={label} className="grid gap-2 text-sm font-bold text-slate-700">
              {label}
              <input className="rounded-md border border-slate-200 px-3 py-3 text-sm" placeholder={placeholder} />
            </label>
          ))}
        </div>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          상세 설명
          <textarea className="min-h-36 rounded-md border border-slate-200 px-3 py-3 text-sm" placeholder="상품 상세, 고시정보, 사용 주의사항을 입력하세요." />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          {["상품 이미지", "KC 인증/증빙", "상품 영상/GIF"].map((label) => (
            <label key={label} className="grid gap-2 rounded-md border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-700">
              {label}
              <input type="file" className="text-xs" />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-800">
            임시 저장
          </button>
          <button type="button" className="rounded-md bg-emerald-600 px-4 py-3 text-sm font-black text-white">
            승인 요청
          </button>
        </div>
      </form>
    </CompanyShell>
  );
}

export function CompanyOnboardingRequirementsPage() {
  return (
    <CompanyShell title="입점 신청 상태" subtitle="입점 서류와 운영 정보를 확인합니다.">
      <CompanyNoticePanel />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {["사업자등록증", "통장 사본", "담당자 연락처", "CS 연락처", "반품지 주소", "브랜드 로고"].map((item) => (
          <div key={item} className="rounded-md border border-slate-200 bg-white p-4">
            <p className="font-black text-slate-950">{item}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">확인 대기</p>
          </div>
        ))}
      </div>
    </CompanyShell>
  );
}

export function CompanyOrdersPage() {
  const items = companyOrderItems();

  return (
    <CompanyShell title="주문 관리" subtitle="입점사에 배정된 주문 상품을 확인하고 출고 상태를 관리합니다.">
      <DataTable
        columns={["주문", "상품", "옵션", "수량", "배송상태", "판매금액", "정산기준"]}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.orderId, item.productName, item.optionName, item.quantity, item.deliveryStatus, formatCurrency(item.unitPrice * item.quantity), formatCurrency(item.settlementAmount)],
        }))}
        emptyMessage="배정된 주문 상품이 없습니다."
      />
    </CompanyShell>
  );
}

export function CompanyInventoryPage() {
  return (
    <CompanyShell title="재고 관리" subtitle="SKU와 옵션별 재고 상태를 관리합니다.">
      <DataTable
        columns={["상품", "현재재고", "외부 상품코드", "동기화 방식", "상태"]}
        rows={companyProducts().map((product) => ({
          id: product.id,
          cells: [product.name, product.stock, product.externalProductCode ?? "미등록", "수동 관리", product.stock < 10 ? "재고 부족" : "정상"],
        }))}
        emptyMessage="관리할 재고가 없습니다."
      />
    </CompanyShell>
  );
}

export function CompanyDeliveriesPage() {
  return (
    <CompanyShell title="배송/현장수령" subtitle="송장 입력과 현장수령 준비 상태를 관리합니다.">
      <DataTable
        columns={["주문상품", "상품", "수량", "배송상태", "송장/수령 처리"]}
        rows={companyOrderItems().map((item) => ({
          id: item.id,
          cells: [
            item.id,
            item.productName,
            item.quantity,
            item.deliveryStatus,
            <button key="action" type="button" className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
              처리하기
            </button>,
          ],
        }))}
        emptyMessage="배송 처리할 주문이 없습니다."
      />
    </CompanyShell>
  );
}

export function CompanySalesPage() {
  const orders = companyOrders();
  const total = companyOrderItems().reduce((sum, item) => sum + item.settlementAmount, 0);

  return (
    <CompanyShell title="매출" subtitle="확정 매출과 환불 보류 금액을 확인합니다.">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard metric={{ label: "주문 수", value: String(orders.length), tone: "blue", helper: "기업 배정 주문 기준" }} />
        <StatCard metric={{ label: "정산 기준 금액", value: formatCurrency(total), tone: "green", helper: "주문상품 기준" }} />
        <StatCard metric={{ label: "환불 보류", value: "0건", tone: "amber", helper: "처리 대기 없음" }} />
      </div>
      <div className="mt-4">
        <DataTable
          columns={["주문번호", "주문일", "상태", "금액"]}
          rows={orders.map((order) => ({
            id: order.id,
            cells: [order.orderNo, formatDateTime(order.createdAt), <StatusBadge key="status" status={order.status} />, formatCurrency(order.totalAmount)],
          }))}
          emptyMessage="매출로 집계할 주문이 없습니다."
        />
      </div>
    </CompanyShell>
  );
}

export function CompanyPayoutsPage() {
  const total = companyOrderItems().reduce((sum, item) => sum + item.settlementAmount, 0);

  return (
    <CompanyShell title="입금" subtitle="입금 예정액, 수수료, 정산서 다운로드 상태를 확인합니다.">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs font-black text-slate-500">확정 매출</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-500">수수료</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(Math.round(total * 0.055))}</p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-500">입금 예정액</p>
            <p className="mt-1 text-xl font-black text-emerald-700">{formatCurrency(Math.round(total * 0.945))}</p>
          </div>
          <div>
            <p className="text-xs font-black text-slate-500">입금 예정일</p>
            <p className="mt-1 text-xl font-black text-slate-950">월말 정산</p>
          </div>
        </div>
        <button type="button" className="mt-4 rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-900">
          정산서 다운로드
        </button>
      </section>
    </CompanyShell>
  );
}
