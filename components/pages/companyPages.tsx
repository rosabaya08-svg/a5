import Link from "next/link";
import { CompanyApiIntegrationPanel } from "@/components/company/CompanyApiIntegrationPanel";
import {
  CompanyExcelExportPanel,
  type CompanyExcelOrderRow,
  type CompanyExcelProductRow,
} from "@/components/company/CompanyExcelExportPanel";
import { CompanyConsentSummary } from "@/components/company/CompanyConsentSummary";
import { CompanyDocumentUploadPanel } from "@/components/company/CompanyDocumentUploadPanel";
import { CompanyPgReadOnlyPanel } from "@/components/company/CompanyPgReadOnlyPanel";
import { CompanyProductDraftPreview } from "@/components/company/CompanyProductDraftPreview";
import { CompanyProductRegistrationWorkspace } from "@/components/company/CompanyProductRegistrationWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { companyNavItems } from "@/components/layout/navigation";
import { companyOnboardingDocuments } from "@/data/company/onboarding";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

const companyId = "company-test-1004";
const companyName = "테스트 기업";

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
      scopeLabel="입점사 업무 콘솔"
      navItems={companyNavItems}
      accent="company"
    >
      {children}
    </AppShell>
  );
}

function CompanyNoticePanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">seller scope</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">입점사 운영 기준</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            상품, 주문, 재고, 정산 정보는 로그인한 기업 범위로만 표시됩니다. 승인된 상품만 조리원 태블릿 폐쇄몰에 노출됩니다.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <CompanyConsentSummary />
      </div>
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

function companyExcelOrderRows(): CompanyExcelOrderRow[] {
  const productsByName = new Map(companyProducts().map((product) => [product.name, product]));
  const ordersById = new Map(companyOrders().map((order) => [order.id, order]));

  return companyOrderItems().map((item) => {
    const order = ordersById.get(item.orderId);
    const product = productsByName.get(item.productName);
    const isPickup = order?.deliveryMethod === "pickup";

    return {
      orderNo: order?.orderNo ?? item.orderId,
      orderedAt: order?.createdAt ?? "",
      paidAt: order?.paidAt ?? "",
      orderStatus: order?.status ?? "paid",
      buyerName: order?.customerName ?? "",
      buyerPhone: order?.customerPhoneMasked ?? "",
      buyerEmail: "",
      receiverName: order?.customerName ?? "",
      receiverPhone: order?.customerPhoneMasked ?? "",
      postalCode: "",
      address: isPickup ? "조리원 현장수령" : "",
      addressDetail: order?.roomId ?? "",
      productCode: product?.externalProductCode ?? product?.id ?? item.id,
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      salePrice: item.unitPrice,
      productAmount: item.unitPrice * item.quantity,
      shippingFee: 0,
      totalPaidAmount: order?.totalAmount ?? item.unitPrice * item.quantity,
      paymentMethod: "with.commerce 결제",
      carrier: isPickup ? "현장수령" : "",
      invoiceNo: "",
      deliveryMemo: isPickup ? "조리원 데스크 수령" : "",
      companyId,
      supplierName: companyName,
      settlementStatus: "입금 예정",
    };
  });
}

function companyExcelProductRows(): CompanyExcelProductRow[] {
  return companyProducts().map((product) => ({
    a5ProductCode: product.id,
    sabangnetProductCode: product.externalProductCode ?? "",
    productName: product.name,
    optionName: product.optionIds.join(" / ") || "기본",
    normalPrice: product.comparison.listPrice,
    platformLowestPrice: product.comparison.platformLowestPrice,
    closedMallPrice: product.price,
    stock: product.stock,
    status: product.status,
    companyId,
    supplierName: companyName,
  }));
}

export function CompanyIndexPage() {
  return <CompanyDashboardPage />;
}

export function CompanyDashboardPage() {
  const products = companyProducts();
  const orders = companyOrders();

  return (
    <CompanyShell title="기업 대시보드" subtitle="상품, 주문, 재고, API 연동, 입금 예정 상태를 한 화면에서 확인합니다.">
      <CompanyNoticePanel />
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Link href="/company/products/new" className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-black text-white">
          상품 등록
        </Link>
        <Link href="/company/excel" className="rounded-md bg-white px-4 py-3 text-sm font-black text-slate-950 ring-1 ring-slate-200">
          사방넷 엑셀 다운로드
        </Link>
        <Link href="/company/api-integration" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          API 연동 요청
        </Link>
      </div>
      <div className="mt-4">
        <CompanyPgReadOnlyPanel companyId={companyId} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.companyMetrics(companyId).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section>
          <FilterBar title="최근 상품" filters={["전체", "승인완료", "승인요청", "재고부족"]} resultCount={products.length} />
          <DataTable
            columns={["상품", "상태", "판매가", "재고"]}
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
                <Link key="order" href="/company/orders" className="font-bold text-emerald-700">
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
    <CompanyShell title="상품 목록" subtitle="상품 승인 상태, 옵션, 재고, 외부 상품코드를 관리합니다.">
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href="/company/products/new" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          상품 등록
        </Link>
      </div>
      <FilterBar title="상품 필터" filters={["전체", "임시저장", "승인요청", "승인완료", "반려", "판매중지"]} resultCount={products.length} mode="toolbar" />
      <DataTable
        columns={["상품", "카테고리", "상태", "폐쇄몰가", "옵션", "외부코드", "재고"]}
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
  return (
    <CompanyShell title="상품 등록" subtitle="카테고리, 상세페이지, 옵션 조합 SKU, 가격, 재고, 고시정보를 작성하고 승인 요청을 보냅니다.">
      <CompanyProductRegistrationWorkspace companyId={companyId} />
    </CompanyShell>
  );
}

export function CompanyProductPreviewPage() {
  return (
    <CompanyShell title="상품 상세 미리보기" subtitle="승인 요청 전 태블릿 폐쇄몰에 노출될 상품 상세 구성을 확인합니다.">
      <CompanyProductDraftPreview />
    </CompanyShell>
  );
}

export function CompanyOnboardingRequirementsPage() {
  return (
    <CompanyShell title="입점 신청 상태" subtitle="입점 서류와 운영 정보를 확인합니다.">
      <CompanyNoticePanel />
      <div className="mt-4">
        <CompanyDocumentUploadPanel
          companyId={companyId}
          companyName={companyName}
          title="입점 서류 업로드"
          description="사업자등록증, 통장 사본, 통신판매업 신고증, 정산 통장 사본 등 입점 필수 파일을 제출합니다."
          documents={companyOnboardingDocuments}
          destinationEmail="qsc0921@gmail.com"
          deliveryMode="gmail"
        />
      </div>
    </CompanyShell>
  );
}

export function CompanyOrdersPage() {
  const items = companyOrderItems();

  return (
    <CompanyShell title="주문 목록" subtitle="입점사에 배정된 주문 상품을 확인하고 출고 상태를 관리합니다.">
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

export function CompanyExcelIntegrationPage() {
  return (
    <CompanyShell title="사방넷 엑셀 다운로드" subtitle="API 연동 전 주문, 상품, 송장 양식을 사방넷/ERP 호환 CSV로 내려받습니다.">
      <CompanyExcelExportPanel orderRows={companyExcelOrderRows()} productRows={companyExcelProductRows()} />
    </CompanyShell>
  );
}

export function CompanyApiIntegrationPage() {
  return (
    <CompanyShell title="API 연동 요청/다운로드" subtitle="기업 ERP, WMS, 사방넷 프로그램에서 A5 주문 API 배포를 요청하고 승인 후 문서를 내려받습니다.">
      <CompanyApiIntegrationPanel companyId={companyId} companyName={companyName} />
    </CompanyShell>
  );
}

export function CompanyInventoryPage() {
  return (
    <CompanyShell title="재고 현황" subtitle="SKU와 옵션별 재고 상태를 관리합니다.">
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
    <CompanyShell title="매출 현황" subtitle="확정 매출과 환불 보류 금액을 확인합니다.">
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
          emptyMessage="매출로 집계된 주문이 없습니다."
        />
      </div>
    </CompanyShell>
  );
}

export function CompanyPayoutsPage() {
  const total = companyOrderItems().reduce((sum, item) => sum + item.settlementAmount, 0);

  return (
    <CompanyShell title="입금 예정" subtitle="입금 예정액, 수수료, 정산서 다운로드 상태를 확인합니다.">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
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
