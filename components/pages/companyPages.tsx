import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import { companyNavItems } from "@/components/layout/navigation";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { CertificationEvidenceUploader } from "@/components/company/CertificationEvidenceUploader";
import { CompanyPgReadOnlyPanel } from "@/components/company/CompanyPgReadOnlyPanel";
import {
  CompanyExcelExportPanel,
  type CompanyExcelOrderRow,
  type CompanyExcelProductRow,
} from "@/components/company/CompanyExcelExportPanel";
import {
  CompanyFirestoreProductsPanel,
  CompanyInventoryMovementsPanel,
  CompanyOperationsOverview,
  CompanyOrderItemsPanel,
  CompanyProductRegistrationFlowPanel,
  CompanySettlementPreviewPanel,
} from "@/components/company/CompanyFirebaseOperations";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { LegalNoticeChecklist } from "@/components/company/LegalNoticeChecklist";
import { ProductCategoryClassificationPanel } from "@/components/company/ProductCategoryClassificationPanel";
import { ProductComplianceForm } from "@/components/company/ProductComplianceForm";
import { ProductPricePolicyForm } from "@/components/company/ProductPricePolicyForm";
import { ReturnPolicyForm } from "@/components/company/ReturnPolicyForm";
import { SellerDisclosureForm } from "@/components/company/SellerDisclosureForm";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  A5_PLATFORM_FEE_RATE,
  calculateInfinySettlement,
  INFINY_PG_FEE_RATE,
  INFINY_TOTAL_FEE_RATE,
} from "@/lib/payments/infinySettlementPolicy";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils/format";

const companyId = "company-sanho-care";

function companyNameFor(targetCompanyId: string) {
  return mockApi.companies().find((company) => company.id === targetCompanyId)?.name ?? targetCompanyId;
}

function settlementStatusFor(targetCompanyId: string) {
  return mockApi.settlements().find((settlement) => settlement.companyId === targetCompanyId)?.status ?? "draft";
}

function companyOrderExcelRows(targetCompanyId: string): CompanyExcelOrderRow[] {
  const companyItems = mockApi.orderItems().filter((item) => item.companyId === targetCompanyId);
  const supplierName = companyNameFor(targetCompanyId);
  const settlementStatus = settlementStatusFor(targetCompanyId);

  return companyItems.map((item) => {
    const order = mockApi.orders().find((candidate) => candidate.id === item.orderId);
    const payment = order ? mockApi.payments().find((candidate) => candidate.orderId === order.id) : undefined;
    const product = mockApi.products().find((candidate) => candidate.name === item.productName || candidate.companyId === item.companyId);
    const productAmount = item.unitPrice * item.quantity;

    return {
      orderNo: order?.orderNo ?? item.orderId,
      orderedAt: order?.createdAt ?? "",
      paidAt: order?.paidAt ?? payment?.approvedAt ?? "",
      orderStatus: order?.status ?? item.deliveryStatus,
      buyerName: order?.customerName ?? "",
      buyerPhone: order?.customerPhoneMasked ?? "",
      buyerEmail: "",
      receiverName: order?.customerName ?? "",
      receiverPhone: order?.customerPhoneMasked ?? "",
      postalCode: "",
      address: "",
      addressDetail: order ? `${order.nurseryId} / ${order.roomId}` : "",
      productCode: product?.externalProductCode ?? product?.id ?? item.id,
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      salePrice: item.unitPrice,
      productAmount,
      shippingFee: 0,
      totalPaidAmount: order?.totalAmount ?? productAmount,
      paymentMethod: payment ? "PG mock" : "결제대기",
      carrier: "",
      invoiceNo: "",
      deliveryMemo: order?.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
      companyId: targetCompanyId,
      supplierName,
      settlementStatus,
    };
  });
}

function companyProductExcelRows(targetCompanyId: string): CompanyExcelProductRow[] {
  const supplierName = companyNameFor(targetCompanyId);

  return mockApi
    .products()
    .filter((product) => product.companyId === targetCompanyId)
    .flatMap((product) => {
      const options = mockApi.productOptions().filter((option) => option.productId === product.id);
      const rows = options.length > 0 ? options : [{ id: `${product.id}-default`, name: "기본", stock: product.stock }];

      return rows.map((option) => ({
        a5ProductCode: product.id,
        sabangnetProductCode: product.externalProductCode ?? "",
        productName: product.name,
        optionName: option.name,
        normalPrice: product.comparison.listPrice,
        platformLowestPrice: product.comparison.platformLowestPrice,
        closedMallPrice: product.comparison.closedMallPrice,
        stock: option.stock,
        status: product.status,
        companyId: targetCompanyId,
        supplierName,
      }));
    });
}

export const legacyCompanyNavItems: NavItem[] = [
  { href: "/company/dashboard", label: "대시보드" },
  { href: "/company/products", label: "상품" },
  { href: "/company/products/new", label: "상품 등록" },
  { href: "/company/products/preview", label: "상세 미리보기", badge: "신규" },
  { href: "/company/ads/banners", label: "배너 광고" },
  { href: "/company/ads/videos", label: "영상 광고" },
  { href: "/company/brand", label: "브랜드관" },
  { href: "/company/exhibitions", label: "기획전" },
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
      sectionTitle="기업 관리자"
      title={title}
      subtitle={subtitle}
      scopeLabel="기업 관리자 / 입점사 범위"
      navItems={companyNavItems}
      accent="company"
    >
      {children}
    </AppShell>
  );
}

function CompanyOnboardingPanel() {
  const docs = [
    "사업자등록증",
    "통장 사본",
    "대표/정산 담당자 연락처",
    "반품/파손/AS 책임 안내",
    "배송 출고지와 CS 주소",
    "브랜드 로고와 상세 이미지",
  ];

  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <h2 className="text-lg font-black">입점 신청 자료 업로드 모의 화면</h2>
      <p className="mt-2 text-sm leading-6">
        실제 Storage 업로드는 Blaze와 보안 규칙 승인 전까지 차단합니다. 현재는 필요한 서류와 입력 항목을 기업 미팅에서 확인할 수 있게 표시합니다.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {docs.map((doc) => (
          <div key={doc} className="rounded-md bg-white p-3 text-sm font-bold text-slate-800">
            {doc}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductCompliancePanel() {
  const items = [
    "상품명, 옵션, 정상가, 폐쇄몰가, 가격비교 기준을 허위 없이 입력",
    "반품, 파손, 교환, AS 책임 주체와 고객 연락처를 상품 상세에 노출",
    "식품/유아용품/화장품 등 카테고리별 법정 표시사항 검토",
    "승인 요청 전 모바일/태블릿 미리보기 확인",
    "외부 재고 API는 실제 호출 금지, 외부 상품 코드만 모의 저장",
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black text-slate-950">상품 등록 주의사항</h2>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductPreviewGate() {
  return (
    <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">승인 요청 전 미리보기</h2>
          <p className="mt-2 text-sm leading-6">
            상세페이지 본문, 이미지 갤러리, 모바일/태블릿 화면, 가격 비교 레이어를 먼저 확인한 뒤 승인 요청하는 구조입니다.
          </p>
        </div>
        <Link href="/company/products/preview" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          미리보기 열기
        </Link>
      </div>
    </section>
  );
}

export function CompanyIndexPage() {
  return <CompanyDashboardPage />;
}

export function CompanyDashboardPage() {
  const products = mockApi.products().filter((product) => product.companyId === companyId);

  return (
    <CompanyShell title="기업 대시보드" subtitle="상품, 주문, 재고, 입금 예정 금액을 입점사 기준으로 확인합니다.">
      <CompanyOnboardingPanel />
      <div className="mt-4" />
      <CompanyPgReadOnlyPanel companyId={companyId} />
      <div className="mt-4" />
      <CompanyOperationsOverview companyId={companyId} />
      <div className="mt-4" />
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
  const productExcelRows = companyProductExcelRows(companyId);

  return (
    <CompanyShell title="상품 관리" subtitle="상품 승인 상태와 옵션 재고를 확인합니다.">
      <ProductPreviewGate />
      <div className="mt-4" />
      <CompanyExcelExportPanel orderRows={companyOrderExcelRows(companyId)} productRows={productExcelRows} />
      <div className="mt-4" />
      <CompanyFirestoreProductsPanel companyId={companyId} />
      <div className="mt-4" />
      <FilterBar title="상품 필터" filters={["승인완료", "승인요청", "외부 재고 코드", "상세 미리보기"]} mode="toolbar" resultCount={mockApi.products().filter((product) => product.companyId === companyId).length} />
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
  const draftFields = [
    ["상품명", "입점 상품명 입력"],
    ["대분류", "산후조리원 전용 taxonomy 선택"],
    ["세분류", "상품군별 세부 분류 선택"],
    ["검수 레벨", "기본/증빙/전문가 검토 자동 분기"],
    ["폐쇄몰 가격", "정상가/플랫폼 최저가 기준 계산"],
    ["배송/수령 방식", "현장수령, 택배, 예약/바우처"],
  ];

  return (
    <CompanyShell title="기업 상품 등록" subtitle="입점사 상품을 분류, 가격, 인증, 고시, 미리보기, 승인 요청 gate 기준으로 관리합니다.">
      <CompanyOnboardingPanel />
      <div className="mt-4" />
      <CompanyPgReadOnlyPanel companyId={companyId} />
      <div className="mt-4" />
      <CompanyProductRegistrationFlowPanel />
      <div className="mt-4" />
      <ProductCategoryClassificationPanel />
      <div className="mt-4" />
      <ProductPricePolicyForm />
      <div className="mt-4" />
      <SellerDisclosureForm />
      <div className="mt-4" />
      <LegalNoticeChecklist />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ProductComplianceForm />
        <CertificationEvidenceUploader />
      </div>
      <div className="mt-4" />
      <ReturnPolicyForm />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <ProductCompliancePanel />
        <ProductPreviewGate />
      </div>
      <div className="mt-4" />
      <ConfirmBox
        title="저장/승인 연동 상태"
        description="현재 베타에서는 기업 계정 claim, Storage rules, 서버 write 검증 전까지 상품 저장과 이미지 업로드 실행을 비활성화합니다."
        confirmLabel="등록 입력 대기"
      />
      <div className="mt-4 grid gap-4 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2">
        {draftFields.map(([label, value]) => (
          <label key={label} className="grid gap-2 text-sm font-semibold text-slate-700">
            {label}
            <input
              readOnly
              value={value}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500"
            />
          </label>
        ))}
      </div>
    </CompanyShell>
  );
}

export function CompanyOnboardingRequirementsPage() {
  return (
    <CompanyShell title="입점 신청/서류 준비" subtitle="사업자등록증, 통장 사본, 담당자 연락처, CS/반품지 정보를 승인 전 점검합니다.">
      <CompanyOnboardingPanel />
      <div className="mt-4" />
      <SellerDisclosureForm />
      <div className="mt-4" />
      <CertificationEvidenceUploader />
      <div className="mt-4" />
      <ConfirmBox
        title="입점 승인 전 운영 확인"
        description="Firebase Auth 계정 발급, Custom Claims 부여, 사업자등록증/통장 사본 검수 전에는 실제 판매와 정산 지급이 차단됩니다."
        confirmLabel="운영자 승인 필요"
      />
    </CompanyShell>
  );
}

export function CompanyOrdersPage() {
  const orderExcelRows = companyOrderExcelRows(companyId);
  const productExcelRows = companyProductExcelRows(companyId);
  const companyOrderIds = mockApi
    .orderItems()
    .filter((item) => item.companyId === companyId)
    .map((item) => item.orderId);

  return (
    <CompanyShell title="주문 관리" subtitle="입점사에 배정된 order_items 기준 주문만 확인합니다.">
      <CompanyOrderItemsPanel companyId={companyId} />
      <div className="mt-4" />
      <CompanyExcelExportPanel orderRows={orderExcelRows} productRows={productExcelRows} />
      <div className="mt-4" />
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
      <CompanyInventoryMovementsPanel companyId={companyId} />
      <div className="mt-4" />
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
              "모의 어댑터",
              product.stock < 10 ? "재고 부족" : "정상",
            ],
          }))}
      />
    </CompanyShell>
  );
}

export function CompanyDeliveriesPage() {
  return (
    <CompanyShell title="배송/현장수령" subtitle="송장 입력과 현장수령 처리는 모의 상태로만 표시합니다.">
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
    <CompanyShell title="매출 현황" subtitle="기업별 MID와 인피니 정산 정책을 기준으로 매출을 조회합니다.">
      <CompanyPgReadOnlyPanel companyId={companyId} />
      <div className="mt-4" />
      <CompanySettlementPreviewPanel companyId={companyId} />
      <div className="mt-4" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.companyMetrics(companyId).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-4">
        <ConfirmBox
          title="인피니 정산 기준 안내"
          description={`매출과 입금 예정액은 상품별 order_items snapshot 기준입니다. 인피니 ${formatPercent(INFINY_PG_FEE_RATE)} + 우리 주문 수수료 ${formatPercent(A5_PLATFORM_FEE_RATE)} = 총 ${formatPercent(INFINY_TOTAL_FEE_RATE)} 공제 후 정산되며, 우리 시스템 지급 실행은 차단합니다.`}
        />
      </div>
    </CompanyShell>
  );
}

export function CompanyPayoutsPage() {
  return (
    <CompanyShell title="인피니 입금 현황" subtitle="PG사, MID, 수수료 공제, 지급 차단 상태를 읽기 전용으로 확인합니다.">
      <CompanyPgReadOnlyPanel companyId={companyId} />
      <div className="mt-4" />
      <CompanySettlementPreviewPanel companyId={companyId} />
      <div className="mt-4" />
      <DataTable
        columns={["기간", "상태", "총액", "인피니 2.5%", "A5 4.5%", "보류", "인피니 예상입금"]}
        rows={mockApi
          .settlements()
          .filter((settlement) => settlement.companyId === companyId)
          .map((settlement) => {
            const fees = calculateInfinySettlement(settlement.grossAmount);

            return {
              id: settlement.id,
              cells: [
                settlement.period,
                <StatusBadge key="status" status={settlement.status} />,
                formatCurrency(settlement.grossAmount),
                formatCurrency(fees.pgFeeAmount),
                formatCurrency(fees.platformFeeAmount),
                formatCurrency(settlement.refundHoldAmount),
                formatCurrency(settlement.payoutAmount),
              ],
            };
          })}
      />
    </CompanyShell>
  );
}
