import Link from "next/link";
import { CompanyApiIntegrationPanel } from "@/components/company/CompanyApiIntegrationPanel";
import {
  CompanyExcelExportPanel,
  type CompanyExcelOrderRow,
  type CompanyExcelProductRow,
} from "@/components/company/CompanyExcelExportPanel";
import { CompanyConsentSummary } from "@/components/company/CompanyConsentSummary";
import { CompanyDocumentUploadPanel } from "@/components/company/CompanyDocumentUploadPanel";
import { CompanyOrderOperationsPanel } from "@/components/company/CompanyOrderOperationsPanel";
import { CompanyAdManager } from "@/components/company/CompanyAdManager";
import { CompanyAccountSecurityPanel } from "@/components/company/CompanyAccountSecurityPanel";
import { CompanyBrandPageEditor } from "@/components/company/CompanyBrandPageEditor";
import { CompanyBrandEventBoard } from "@/components/company/CompanyBrandEventBoard";
import { CompanyBrandMessageCenter } from "@/components/company/CompanyBrandMessageCenter";

import { CompanyCommerceCommandCenter } from "@/components/company/CompanyCommerceCommandCenter";
import { CompanyDashboardTables } from "@/components/company/CompanyDashboardTables";
import { CompanyProductDraftPreview } from "@/components/company/CompanyProductDraftPreview";
import { CompanyProductManagementPanel, type ProductManagementView } from "@/components/company/CompanyProductManagementPanel";
import { CompanyInventoryAdjustmentPanel } from "@/components/company/CompanyInventoryAdjustmentPanel";
import { CompanyProductRegistrationWorkspace } from "@/components/company/CompanyProductRegistrationWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { companyNavItems } from "@/components/layout/navigation";
import { companyOnboardingDocuments } from "@/data/company/onboarding";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { readPortalServerSession } from "@/lib/auth/serverSession";
import {
  getLiveCompanyInventoryMovements,
  getLiveCompanyById,
  getLiveCompanyOrderItems,
  getLiveCompanyOrders,
  getLiveCompanyProductOptions,
  getLiveCompanyProducts,
  getLiveProductById,
  getLiveProductOptions,
  getLiveCompanySettlementPreview,
  type CompanySettlementPreview,
  type LiveRead,
} from "@/lib/repositories/liveCommerceRepository";
import type { InventoryMovement } from "@/lib/repositories/types";
import { isRegisteredProductForBrandPage } from "@/lib/storefront/brandRouting";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Company, DashboardMetric, Order, OrderItem, Product, ProductOption } from "@/types/commerce";

const preservedTestCompanyId = "company-test-1004";
const preservedTestBusinessNo = "7592901311";
const missingCompanyScopeId = "__missing_company_scope__";

type CompanyRuntimeScope = {
  companyId: string;
  companyName: string;
  businessNo?: string;
  hasSessionScope: boolean;
  isPreservedTestCompany: boolean;
};

async function readCompanyRuntimeScope(): Promise<CompanyRuntimeScope> {
  const session = await readPortalServerSession("company");
  const sessionCompanyId = session?.companyId;
  const isPreservedTestCompany = session?.businessNo === preservedTestBusinessNo || sessionCompanyId === preservedTestCompanyId;
  const companyId = isPreservedTestCompany ? preservedTestCompanyId : sessionCompanyId || missingCompanyScopeId;

  return {
    companyId,
    companyName: session?.displayName || session?.businessNo || companyId,
    businessNo: session?.businessNo,
    hasSessionScope: companyId !== missingCompanyScopeId,
    isPreservedTestCompany,
  };
}

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
      scopeLabel="입점사 운영 콘솔"
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
          <p className="text-[11px] font-normal tracking-[0.14em] text-emerald-700">판매자 범위</p>
          <h2 className="mt-1 text-lg font-normal text-slate-950">입점사 운영 기준</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            상품, 주문, 재고, 매출 정보는 로그인한 기업 범위로만 표시됩니다. 등록한 상품은 판매중 상태로 폐쇄몰과 모바일에 반영되며, 운영 정책 위반 시 판매가 중지될 수 있습니다.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <CompanyConsentSummary />
      </div>
    </section>
  );
}

type SourceRead = Pick<LiveRead<unknown>, "source" | "reason">;

type CompanyRuntimeData = {
  company?: Company;
  products: Product[];
  productsSource: SourceRead["source"];
  productOptions: ProductOption[];
  orderItems: OrderItem[];
  orders: Order[];
  settlement: CompanySettlementPreview;
  reads: SourceRead[];
};

type CompanyProductListRuntimeData = {
  products: Product[];
  productsSource: SourceRead["source"];
  productOptions: ProductOption[];
  orderItems: OrderItem[];
  orders: Order[];
  reads: SourceRead[];
};

function normalizeProductManagementView(view: unknown): ProductManagementView {
  return view === "list" ? "list" : "dashboard";
}

function RepositorySourceNotice({ reads }: { title: string; reads: SourceRead[] }) {
  const hasLoadIssue = reads.some((read) => read.source !== "Firestore");

  if (!hasLoadIssue) return null;

  return (
    <section className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-normal text-amber-900">
      일부 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
    </section>
  );
}

function emptySettlementPreview(companyId: string): CompanySettlementPreview {
  return {
    companyId,
    period: "2026-05",
    grossAmount: 0,
    grossSalesAmount: 0,
    commissionAmount: 0,
    a5CommissionRate: 4.5,
    a5CommissionAmount: 0,
    refundHoldAmount: 0,
    payoutAmount: 0,
    payupConfirmedAmount: 0,
    payupDataLinked: false,
    reconciliationStatus: "payup_data_pending",
    itemCount: 0,
    basis: "a5_order_items_payup_read_only",
    settlementOwner: "payup",
    payupSettlementOwner: "payup",
    settlementExecutionBlocked: true,
    a5SettlementExecutionBlocked: true,
  };
}

function companyRuntimeData(
  companyId: string,
  partial: Partial<Omit<CompanyRuntimeData, "reads">> & { reads: SourceRead[] },
): CompanyRuntimeData {
  return {
    company: undefined,
    products: [],
    productsSource: "Firestore",
    productOptions: [],
    orderItems: [],
    orders: [],
    settlement: emptySettlementPreview(companyId),
    ...partial,
  };
}

async function readCompanyRuntimeData(companyId: string): Promise<CompanyRuntimeData> {
  const [companyRead, productsRead, productOptionsRead, orderItemsRead, ordersRead, settlementRead] = await Promise.all([
    getLiveCompanyById(companyId),
    getLiveCompanyProducts(companyId),
    getLiveCompanyProductOptions(companyId),
    getLiveCompanyOrderItems(companyId),
    getLiveCompanyOrders(companyId),
    getLiveCompanySettlementPreview(companyId),
  ]);

  return companyRuntimeData(companyId, {
    company: companyRead.data,
    products: productsRead.data,
    productsSource: productsRead.source,
    productOptions: productOptionsRead.data,
    orderItems: orderItemsRead.data,
    orders: ordersRead.data,
    settlement: settlementRead.data,
    reads: [companyRead, productsRead, productOptionsRead, orderItemsRead, ordersRead, settlementRead],
  });
}

async function readCompanyProductListRuntimeData(companyId: string): Promise<CompanyProductListRuntimeData> {
  const [productsRead, orderItemsRead, ordersRead] = await Promise.all([
    getLiveCompanyProducts(companyId),
    getLiveCompanyOrderItems(companyId),
    getLiveCompanyOrders(companyId),
  ]);
  const optionReads = await Promise.all(productsRead.data.map((product) => getLiveProductOptions(product.id)));

  const productOptionsRead: SourceRead = {
    source: productsRead.source === "Firestore" && optionReads.every((read) => read.source === "Firestore") ? "Firestore" : "mock fallback",
    reason: [productsRead.reason, ...optionReads.map((read) => read.reason)].filter(Boolean).join(" / ") || undefined,
  };

  return {
    products: productsRead.data,
    productsSource: productsRead.source,
    productOptions: optionReads.flatMap((read) => read.data),
    orderItems: orderItemsRead.data,
    orders: ordersRead.data,
    reads: [productsRead, productOptionsRead, orderItemsRead, ordersRead],
  };
}

function companyMetrics(data: CompanyRuntimeData): DashboardMetric[] {
  const sales = data.orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const pendingOrders = data.orderItems.filter((item) => ["invoice_pending", "pickup_ready"].includes(String(item.deliveryStatus))).length;

  return [
    { label: "입점사 매출", value: formatCurrency(sales), helper: "결제 완료 주문 기준", tone: "green" },
    { label: "A5 수수료 예상", value: formatCurrency(data.settlement.a5CommissionAmount), helper: "입점 계약 수수료 참고", tone: "blue" },
    { label: "상품 수", value: String(data.products.length), helper: "등록된 판매 상품", tone: "neutral" },
    { label: "처리 필요", value: String(pendingOrders), helper: "송장 대기 또는 현장수령 준비", tone: "amber" },
  ];
}

function companyExcelOrderRows(data: CompanyRuntimeData, scope: CompanyRuntimeScope): CompanyExcelOrderRow[] {
  const productsByName = new Map(data.products.map((product) => [product.name, product]));
  const ordersById = new Map(data.orders.map((order) => [order.id, order]));
  const orderItemTotals = new Map<string, number>();
  const firstItemByOrder = new Map<string, string>();

  for (const item of data.orderItems) {
    orderItemTotals.set(item.orderId, (orderItemTotals.get(item.orderId) ?? 0) + item.unitPrice * item.quantity);
    if (!firstItemByOrder.has(item.orderId)) firstItemByOrder.set(item.orderId, item.id);
  }

  return data.orderItems.map((item) => {
    const order = ordersById.get(item.orderId);
    const product = productsByName.get(item.productName);
    const isPickup = order?.deliveryMethod === "pickup";
    const shippingFee =
      !isPickup && firstItemByOrder.get(item.orderId) === item.id
        ? Math.max(0, (order?.totalAmount ?? 0) - (orderItemTotals.get(item.orderId) ?? 0))
        : 0;

    return {
      orderNo: order?.orderNo ?? item.orderId,
      orderedAt: order?.createdAt ?? "",
      paidAt: order?.paidAt ?? "",
      orderStatus: order?.status ?? "paid",
      buyerName: order?.customerName ?? "",
      buyerPhone: order?.customerPhoneMasked ?? "",
      buyerEmail: order?.customerEmail ?? "",
      receiverName: order?.receiverName || order?.customerName || "",
      receiverPhone: order?.receiverPhone || order?.customerPhoneMasked || "",
      postalCode: isPickup ? "" : order?.receiverPostalCode ?? "",
      address: isPickup ? "조리원 현장수령" : order?.receiverAddress ?? "",
      addressDetail: isPickup ? order?.roomId ?? "" : order?.receiverAddressDetail ?? "",
      productCode: product?.externalProductCode ?? product?.id ?? item.id,
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      salePrice: item.unitPrice,
      productAmount: item.unitPrice * item.quantity,
      shippingFee,
      totalPaidAmount: order?.totalAmount ?? item.unitPrice * item.quantity,
      paymentMethod: "위드커머스 결제",
      carrier: isPickup ? "현장수령" : item.carrierName || item.carrierCode || "",
      invoiceNo: isPickup ? "" : item.invoiceNumber ?? "",
      deliveryMemo: isPickup ? "조리원 데스크 수령" : order?.deliveryMemo ?? "",
      companyId: scope.companyId,
      supplierName: scope.companyName,
      settlementStatus: "PayUp 대조 대기",
    };
  });
}

function companyExcelProductRows(data: CompanyRuntimeData, scope: CompanyRuntimeScope): CompanyExcelProductRow[] {
  const optionsByProductId = new Map<string, ProductOption[]>();

  for (const option of data.productOptions) {
    const options = optionsByProductId.get(option.productId) ?? [];
    options.push(option);
    optionsByProductId.set(option.productId, options);
  }

  return data.products.map((product) => ({
    a5ProductCode: product.id,
    sabangnetProductCode: product.externalProductCode ?? "",
    productName: product.name,
    optionName: optionsByProductId.get(product.id)?.map((option) => option.name).join(" / ") || "기본",
    normalPrice: product.comparison.listPrice,
    platformLowestPrice: product.comparison.platformLowestPrice,
    closedMallPrice: product.price,
    stock: product.stock,
    status: product.status,
    companyId: scope.companyId,
    supplierName: scope.companyName,
  }));
}

export async function CompanyIndexPage() {
  return CompanyDashboardPage();
}

export async function CompanyDashboardPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const data = await readCompanyRuntimeData(companyId);
  const { products, orders } = data;

  return (
    <CompanyShell title="기업 대시보드" subtitle="상품, 주문, 배송, 재고와 매출 현황을 한 화면에서 확인합니다.">
      <CompanyNoticePanel />
      <div className="mt-4">
        <RepositorySourceNotice title="기업관리자 실제 연동 범위" reads={data.reads} />
      </div>
      <div className="mt-4">
        <CompanyCommerceCommandCenter products={products} orders={orders} orderItems={data.orderItems} />
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Link href="/company/products/new" className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-normal text-white">
          상품 등록
        </Link>
        <Link href="/company/excel" className="rounded-md bg-white px-4 py-3 text-sm font-normal text-slate-950 ring-1 ring-slate-200">
          주문/상품 엑셀 다운로드
        </Link>

      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {companyMetrics(data).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6">
        <CompanyDashboardTables products={products} orders={orders} />
      </div>
    </CompanyShell>
  );
}

export async function CompanyProductsPage({ view }: { view?: unknown } = {}) {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const data = await readCompanyProductListRuntimeData(companyId);
  const productView = normalizeProductManagementView(view);
  const editableProductIds = data.products
    .filter((product) => product.companyId === companyId)
    .map((product) => product.id);

  return (
    <CompanyShell
      title={productView === "dashboard" ? "상품 현황" : "상품 목록 / 수정"}
      subtitle={productView === "dashboard" ? "등록 상품, 판매량, 재고, 매출을 먼저 확인합니다." : "상품 상태, 옵션, 재고, 외부 상품코드, 판매가를 관리합니다."}
    >
      <div className="mb-4">
        <RepositorySourceNotice title={productView === "dashboard" ? "상품 현황 실제 연동 범위" : "상품 목록/수정 실제 연동 범위"} reads={data.reads} />
      </div>
      <CompanyProductManagementPanel
        products={data.products}
        options={data.productOptions}
        editableProductIds={editableProductIds}
        orderItems={data.orderItems}
        orders={data.orders}
        view={productView}
      />
    </CompanyShell>
  );
}

export async function CompanyProductNewPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const companyRead = await getLiveCompanyById(companyId);

  return (
    <CompanyShell title="상품 등록" subtitle="필수 정보, 상세페이지, 가격, 옵션/재고, 배송 정책을 단계별로 작성하고 폐쇄몰/모바일에 즉시 등록합니다.">
      <CompanyProductRegistrationWorkspace companyId={companyId} initialCompany={companyRead.data} />
    </CompanyShell>
  );
}

export async function CompanyProductEditPage({ productId }: { productId: string }) {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const [companyRead, productRead, optionsRead] = await Promise.all([getLiveCompanyById(companyId), getLiveProductById(productId), getLiveProductOptions(productId)]);
  const product = productRead.data;
  const isCompanyProduct = product.companyId === companyId;

  return (
    <CompanyShell title="상품 수정" subtitle="이미 등록된 상품의 이미지, 상세페이지, 옵션, 가격, 재고를 수정하고 폐쇄몰/모바일 노출에 즉시 반영합니다.">
      <div className="mb-4">
        <RepositorySourceNotice title="상품 수정 실제 연동 범위" reads={[productRead, optionsRead]} />
      </div>
      {isCompanyProduct ? (
        <CompanyProductRegistrationWorkspace companyId={companyId} editProduct={product} editProductOptions={optionsRead.data} initialCompany={companyRead.data} />
      ) : (
        <section className="rounded-md border border-red-200 bg-red-50 p-5 text-red-900">
          <h2 className="text-lg font-normal">수정 권한이 없는 상품입니다</h2>
          <p className="mt-2 text-sm font-normal">현재 기업 범위({companyId})의 상품만 수정할 수 있습니다.</p>
        </section>
      )}
    </CompanyShell>
  );
}

export async function CompanyProductPreviewPage({ productId }: { productId?: string } = {}) {
  const scope = await readCompanyRuntimeScope();
  let product: Product | undefined;
  let options: ProductOption[] = [];
  let reads: SourceRead[] = [];

  if (productId) {
    const [productRead, optionsRead] = await Promise.all([getLiveProductById(productId), getLiveProductOptions(productId)]);
    const isCompanyProduct = productRead.data.companyId === scope.companyId || scope.isPreservedTestCompany;
    reads = [productRead, optionsRead];

    if (isCompanyProduct) {
      product = productRead.data;
      options = optionsRead.data;
    }
  }

  return (
    <CompanyShell title="상품 상세 미리보기" subtitle="폐쇄몰과 모바일에 노출되는 상품 상세 구성을 확인합니다.">
      {reads.length ? (
        <div className="mb-4">
          <RepositorySourceNotice title="상품 미리보기 실제 연동 범위" reads={reads} />
        </div>
      ) : null}
      {productId && !product ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-5 text-red-900">
          <h2 className="text-lg font-normal">미리보기 권한이 없거나 상품을 찾을 수 없습니다.</h2>
          <p className="mt-2 text-sm font-normal">로그인한 사업자의 상품만 미리볼 수 있습니다.</p>
        </section>
      ) : (
        <CompanyProductDraftPreview product={product} options={options} />
      )}
    </CompanyShell>
  );
}

export async function CompanyBrandPageManagementPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const data = await readCompanyProductListRuntimeData(companyId);

  return (
    <CompanyShell title="브랜드관 편집" subtitle="등록 상품의 브랜드와 카테고리를 기준으로 기업 자체 브랜드관 배너를 관리합니다.">
      <div className="mb-4">
        <RepositorySourceNotice title="브랜드관 상품 연동 범위" reads={data.reads} />
      </div>
      <CompanyBrandPageEditor companyId={companyId} products={data.products.filter(isRegisteredProductForBrandPage)} />
    </CompanyShell>
  );
}

export async function CompanyBrandEventBoardPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const data = await readCompanyProductListRuntimeData(companyId);

  return (
    <CompanyShell title="이벤트 안내 게시판" subtitle="브랜드관 팝업 안내와 일반 이벤트 게시글을 기업이 직접 등록하고 관리합니다.">
      <div className="mb-4">
        <RepositorySourceNotice title="이벤트 안내 게시판 상품 연동 범위" reads={data.reads} />
      </div>
      <CompanyBrandEventBoard companyId={companyId} products={data.products.filter(isRegisteredProductForBrandPage)} />
    </CompanyShell>
  );
}

export async function CompanyBrandMessageCenterPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const data = await readCompanyProductListRuntimeData(companyId);

  return (
    <CompanyShell title="브랜드 소통함" subtitle="폐쇄몰 브랜드관에서 고객에게 보낼 공개 메시지를 기업이 등록하고 관리합니다.">
      <div className="mb-4">
        <RepositorySourceNotice title="브랜드 소통함 상품 연동 범위" reads={data.reads} />
      </div>
      <CompanyBrandMessageCenter companyId={companyId} products={data.products.filter(isRegisteredProductForBrandPage)} />
    </CompanyShell>
  );
}

export async function CompanyAdsPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;

  return (
    <CompanyShell title="기업 광고 관리" subtitle="기업이 업로드한 이미지 광고와 팝업 광고의 등록 상태와 심사 상태를 확인합니다.">
      <CompanyAdManager companyId={companyId} />
    </CompanyShell>
  );
}

export async function CompanyOnboardingRequirementsPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;

  return (
    <CompanyShell title="입점 신청 상태" subtitle="입점 서류와 운영 정보를 확인합니다.">
      <CompanyNoticePanel />
      <div className="mt-4">
        <CompanyDocumentUploadPanel
          companyId={companyId}
          companyName={scope.companyName}
          title="입점 서류 업로드"
          description="사업자등록증, 통장 사본, 통신판매업 신고증, 정산 통장 사본 등 입점 필수 파일을 제출합니다."
          documents={companyOnboardingDocuments}
          destinationEmail="withcadmin@gmail.com"
          deliveryMode="gmail"
        />
      </div>
    </CompanyShell>
  );
}

export async function CompanyAccountSecurityPage() {
  return (
    <CompanyShell title="계정 보안" subtitle="담당자 이메일 인증 기반 비밀번호 변경과 회원 탈퇴 요청을 관리합니다.">
      <CompanyAccountSecurityPanel />
    </CompanyShell>
  );
}

export async function CompanyOrdersPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;

  return (
    <CompanyShell
      title="일자별 주문관리"
      subtitle="결제일 또는 주문 접수일 기준으로 주문을 조회하고 출고 상태를 관리합니다."
    >
      <CompanyOrderOperationsPanel companyId={companyId} mode="orders" />
    </CompanyShell>
  );
}

export async function CompanyClaimsPage() {
  const scope = await readCompanyRuntimeScope();
  return (
    <CompanyShell title="클레임 관리" subtitle="업체 상품의 취소, 반품, 교환 처리 상태를 관리합니다.">
      <CompanyOrderOperationsPanel companyId={scope.companyId} mode="claims" />
    </CompanyShell>
  );
}

export async function CompanyExcelIntegrationPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const [catalogData, orderItemsRead, ordersRead] = await Promise.all([
    readCompanyProductListRuntimeData(companyId),
    getLiveCompanyOrderItems(companyId),
    getLiveCompanyOrders(companyId),
  ]);
  const data = companyRuntimeData(companyId, {
    products: catalogData.products,
    productsSource: catalogData.productsSource,
    productOptions: catalogData.productOptions,
    orderItems: orderItemsRead.data,
    orders: ordersRead.data,
    reads: [...catalogData.reads, orderItemsRead, ordersRead],
  });

  return (
    <CompanyShell title="주문/상품 엑셀 다운로드" subtitle="API 연동 전 주문, 상품, 송장 양식을 CSV로 내려받습니다.">
      <div className="mb-4">
        <RepositorySourceNotice title="엑셀 다운로드 실제 연동 범위" reads={data.reads} />
      </div>
      <CompanyExcelExportPanel companyId={companyId} orderRows={companyExcelOrderRows(data, scope)} productRows={companyExcelProductRows(data, scope)} />
    </CompanyShell>
  );
}

export async function CompanyApiIntegrationPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;

  return (
    <CompanyShell title="API 연동 요청/다운로드" subtitle="기업 ERP, WMS, 사방넷 프로그램에서 A5 주문 API 배포를 요청하고 승인 후 문서를 내려받습니다.">
      <CompanyApiIntegrationPanel companyId={companyId} companyName={scope.companyName} />
    </CompanyShell>
  );
}

export async function CompanyInventoryPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const [data, inventoryRead] = await Promise.all([readCompanyProductListRuntimeData(companyId), getLiveCompanyInventoryMovements(companyId)]);
  const productsById = new Map(data.products.map((product) => [product.id, product]));
  const optionsById = new Map(data.productOptions.map((option) => [option.id, option]));

  return (
    <CompanyShell title="재고 현황" subtitle="SKU와 옵션별 재고 이동 상태를 관리합니다.">
      <CompanyInventoryAdjustmentPanel
        products={data.products.map((product) => ({
          id: product.id,
          name: product.name,
          stock: product.stock,
        }))}
        options={data.productOptions.map((option) => ({
          id: option.id,
          productId: option.productId,
          name: option.name,
          stock: option.stock,
        }))}
      />
      <div className="mb-4">
        <RepositorySourceNotice title="재고 이동 실제 연동 범위" reads={[...data.reads, inventoryRead]} />
      </div>
      <DataTable
        columns={["상품", "옵션", "이동", "수량", "사유", "출처", "생성"]}
        rows={inventoryRead.data.map((movement: InventoryMovement) => {
          const product = movement.productId ? productsById.get(movement.productId) : undefined;
          const option = optionsById.get(movement.optionId);

          return {
            id: movement.id,
            cells: [
              product?.name ?? movement.productId ?? "-",
              option?.name ?? movement.optionId,
              movement.type,
              movement.quantity,
              movement.reason,
              movement.sourceId ?? "-",
              formatDateTime(movement.createdAt),
            ],
          };
        })}
        emptyMessage="연동된 재고 이동 기록이 없습니다."
      />
    </CompanyShell>
  );
}

export async function CompanyDeliveriesPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;

  return (
    <CompanyShell
      title="일자별 배송관리"
      subtitle="결제일 또는 주문 접수일 기준으로 송장 입력, 배송 진행과 현장수령 상태를 관리합니다."
    >
      <CompanyOrderOperationsPanel companyId={companyId} mode="deliveries" />
    </CompanyShell>
  );
}

export async function CompanySalesPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const [ordersRead, orderItemsRead] = await Promise.all([getLiveCompanyOrders(companyId), getLiveCompanyOrderItems(companyId)]);
  const orders = ordersRead.data;
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const excludedStatuses = new Set(["cancelled", "refunded"]);
  const total = orderItemsRead.data.reduce((sum, item) => {
    const orderStatus = ordersById.get(item.orderId)?.status;
    return excludedStatuses.has(String(orderStatus)) ? sum : sum + item.unitPrice * item.quantity;
  }, 0);
  const cancelledOrRefunded = orders.filter((order) => excludedStatuses.has(String(order.status))).length;

  return (
    <CompanyShell title="매출 현황" subtitle="확정 매출과 환불 보류 금액을 확인합니다.">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard metric={{ label: "주문 수", value: String(orders.length), tone: "blue", helper: "기업 배정 주문 기준" }} />
        <StatCard metric={{ label: "매출 기준 금액", value: formatCurrency(total), tone: "green", helper: "취소·환불 주문 제외" }} />
        <StatCard metric={{ label: "취소·환불 주문", value: `${cancelledOrRefunded}건`, tone: "amber", helper: "주문 상태 기준" }} />
      </div>
      <div className="mt-4">
        <RepositorySourceNotice title="매출 화면 실제 연동 범위" reads={[ordersRead, orderItemsRead]} />
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

export async function CompanyPayoutsPage() {
  const scope = await readCompanyRuntimeScope();
  const companyId = scope.companyId;
  const settlementRead = await getLiveCompanySettlementPreview(companyId);
  const settlement = settlementRead.data;
  const total = settlement.grossAmount;

  return (
    <CompanyShell title="PayUp 매출 대조" subtitle="PayUp 원장 조회 상태와 A5 영업 수수료 예상액을 확인합니다.">
      <div className="mb-4">
        <RepositorySourceNotice title="PayUp/A5 수수료 실제 연동 범위" reads={[settlementRead]} />
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs font-normal text-slate-500">A5 주문 총액</p>
            <p className="mt-1 text-xl font-normal text-slate-950">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">A5 영업 수수료</p>
            <p className="mt-1 text-xl font-normal text-slate-950">{formatCurrency(settlement.a5CommissionAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">PayUp 원장 조회</p>
            <p className="mt-1 text-xl font-normal text-emerald-700">{settlement.payupDataLinked ? "연동됨" : "대기"}</p>
          </div>
          <div>
            <p className="text-xs font-normal text-slate-500">대조 상태</p>
            <p className="mt-1 text-xl font-normal text-slate-950">{settlement.reconciliationStatus}</p>
          </div>
        </div>
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-normal leading-6 text-amber-900">
          A5는 정산 실행 주체가 아닙니다. 기업은 PayUp과 직접 계약하고, A5는 주문/매출 데이터와 영업수수료 참고값만 대조합니다.
        </p>
        <Link href="/company/excel" className="mt-4 inline-flex rounded-md border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900">
          주문 CSV 다운로드
        </Link>
      </section>
    </CompanyShell>
  );
}
