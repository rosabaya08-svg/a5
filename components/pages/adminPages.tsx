import Link from "next/link";
import { A5PublicApiDocsPanel } from "@/components/admin/A5PublicApiDocsPanel";
import { AdminA5sFirebaseIntegrationPanel } from "@/components/admin/AdminA5sFirebaseIntegrationPanel";
import { AdminInvitePanel } from "@/components/admin/AdminInvitePanel";
import { AdminApiIntegrationRequestsPanel } from "@/components/admin/AdminApiIntegrationRequestsPanel";
import { AdminIntegrationMonitoringPanel } from "@/components/admin/AdminIntegrationMonitoringPanel";
import { InnopayPgIntegrationPanel } from "@/components/admin/InnopayPgIntegrationPanel";
import { PgGatewaySettingsPanel } from "@/components/admin/PgGatewaySettingsPanel";
import { PgPaymentLogMonitoringPanel } from "@/components/admin/PgPaymentLogMonitoringPanel";
import { AdminNurseryPartnerSyncPanel } from "@/components/admin/AdminNurseryPartnerSyncPanel";
import { AdminCompanySelectionDashboard } from "@/components/admin/AdminCompanySelectionDashboard";
import { AdminCompanyAdModerationPanel } from "@/components/admin/AdminCompanyAdModerationPanel";
import { AdminCancelRequestsPanel } from "@/components/admin/AdminCancelRequestsPanel";
import { AdminCustomerAnalyticsPanel } from "@/components/admin/AdminCustomerAnalyticsPanel";
import { AdminRoomsTable, AdminTabletsTable } from "@/components/admin/AdminRoomDeviceTables";
import { AdminProductModerationPanel } from "@/components/admin/AdminProductModerationPanel";
import { CompanySignupRequestsPanel } from "@/components/admin/CompanySignupRequestsPanel";
import { ExternalIntegrationCenterPanel } from "@/components/admin/ExternalIntegrationCenterPanel";
import {
  CompanyApprovalQueuePanel,
  RepositoryConnectionPanel,
} from "@/components/admin/AdminOperationsPanel";
import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { RiskAlert } from "@/components/ui/RiskAlert";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  A5_SALES_COMMISSION_RATE,
  calculateA5SalesCommission,
  PAYUP_PROVIDER_LABEL,
} from "@/lib/payments/payupReconciliation";
import { readVisitorAnalyticsSummary } from "@/lib/analytics/visitorAnalytics";
import { getPaymentReadiness } from "@/lib/payments/paymentService";
import { commerceRepositories } from "@/lib/repositories";
import type { RepositoryResult } from "@/lib/repositories/types";
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from "@/lib/utils/format";
import type {
  AuditLog,
  Company,
  DashboardMetric,
  Nursery,
  Order,
  OrderItem,
  Payment,
  Product,
  QrPaymentSession,
  RiskItem,
  Room,
  Settlement,
  Tablet,
} from "@/types/commerce";

export const legacyAdminNavItems = adminNavItems;

type AdminRuntimeData = {
  companies: Company[];
  nurseries: Nursery[];
  rooms: Room[];
  tablets: Tablet[];
  products: Product[];
  qrSessions: QrPaymentSession[];
  orders: Order[];
  orderItems: OrderItem[];
  payments: Payment[];
  settlements: Settlement[];
  auditLogs: AuditLog[];
};

function repositoryDataOr<T>(result: RepositoryResult<T>, fallback: T): T {
  return result.ok ? result.data : fallback;
}

async function readAdminRuntimeData(): Promise<AdminRuntimeData> {
  const [companiesRead, nurseriesRead, roomsRead, tabletsRead, productsRead, qrSessionsRead, ordersRead, paymentsRead, auditLogsRead] = await Promise.all([
    commerceRepositories.companies.listCompanies(),
    commerceRepositories.nurseries.listNurseries(),
    commerceRepositories.rooms.listRooms(),
    commerceRepositories.tablets.listTablets(),
    commerceRepositories.products.listProducts(),
    commerceRepositories.qrSessions.listQrSessions(),
    commerceRepositories.orders.listOrders(),
    commerceRepositories.payments.listPayments(),
    commerceRepositories.auditLogs.listAuditLogs(),
  ]);
  const companies = repositoryDataOr(companiesRead, []);
  const nurseries = repositoryDataOr(nurseriesRead, []);
  const rooms = repositoryDataOr(roomsRead, []);
  const tablets = repositoryDataOr(tabletsRead, []);
  const products = repositoryDataOr(productsRead, []);
  const qrSessions = repositoryDataOr(qrSessionsRead, []);
  const orders = repositoryDataOr(ordersRead, []);
  const payments = repositoryDataOr(paymentsRead, []);
  const auditLogs = repositoryDataOr(auditLogsRead, []);
  const orderItemGroups = await Promise.all(companies.map((company) => commerceRepositories.orders.listOrderItemsByCompany(company.id)));
  const orderItems = orderItemGroups.flatMap((result) => repositoryDataOr(result, []));

  return {
    companies,
    nurseries,
    rooms,
    tablets,
    products,
    qrSessions,
    orders,
    orderItems,
    payments,
    settlements: buildAdminSettlementPreviews(companies, orderItems),
    auditLogs,
  };
}

function buildAdminSettlementPreviews(companies: Company[], orderItems: OrderItem[]): Settlement[] {
  return companies.map((company) => {
    const companyItems = orderItems.filter((item) => item.companyId === company.id);
    const grossAmount = companyItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const fees = calculateA5SalesCommission(grossAmount, company.commissionRate || A5_SALES_COMMISSION_RATE);

    return {
      id: `settlement-preview-${company.id}`,
      companyId: company.id,
      period: "live-preview",
      status: company.settlementBlocked ? "payout_blocked" : "review",
      grossAmount,
      commissionAmount: fees.a5CommissionAmount,
      refundHoldAmount: 0,
      payoutAmount: 0,
    };
  });
}

function buildAdminMetrics(data: AdminRuntimeData): DashboardMetric[] {
  const paidAmount = data.orders.filter((order) => order.status !== "cancelled").reduce((total, order) => total + order.totalAmount, 0);
  const activeQr = data.qrSessions.filter((session) => session.status === "active").length;
  const pendingProducts = data.products.filter((product) => product.status === "pending_approval").length;
  const blockedSettlements = data.settlements.filter((settlement) => settlement.status === "payout_blocked").length;

  return [
    { label: "오늘 매출", value: formatCurrency(paidAmount), helper: "취소 제외 주문 기준", tone: "green" },
    { label: "활성 QR", value: formatNumber(activeQr), helper: "만료 전 결제 대기 QR", tone: "blue" },
    { label: "상품 운영 확인", value: formatNumber(pendingProducts), helper: "예외 검토가 필요한 상품", tone: "amber" },
    { label: "Payup 대조 보류", value: formatNumber(blockedSettlements), helper: "원장 확인 필요", tone: "red" },
  ];
}

function buildAdminRisks(data: AdminRuntimeData): RiskItem[] {
  const pendingProducts = data.products.filter((product) => product.status === "pending_approval").length;
  const pgMissingCompanies = data.companies.filter((company) => company.status === "approved" && !company.pgProfile?.credentialRefsStored).length;
  const unlinkedRooms = data.rooms.filter((room) => !room.activeTabletId).length;
  const settlementBlocked = data.companies.filter((company) => company.settlementBlocked).length;

  return [
    {
      id: "risk-payment-prod",
      title: "운영 PG 연결 확인",
      severity: pgMissingCompanies > 0 ? "high" : "low",
      owner: "최고관리자",
      detail: `${pgMissingCompanies}개 승인 기업의 PG 연결 상태를 확인해야 합니다.`,
    },
    {
      id: "risk-product-approval",
      title: "상품 예외 검토",
      severity: pendingProducts > 0 ? "medium" : "low",
      owner: "상품 운영",
      detail: `${pendingProducts}개 상품이 예외 검토 상태입니다. 일반 상품은 기업관리자 등록 후 즉시 노출을 기준으로 봅니다.`,
    },
    {
      id: "risk-room-tablet-link",
      title: "객실 태블릿 연결",
      severity: unlinkedRooms > 0 ? "medium" : "low",
      owner: "조리원 운영",
      detail: `${unlinkedRooms}개 객실에 연결된 태블릿이 없습니다.`,
    },
    {
      id: "risk-payout",
      title: "Payup 원장 대조",
      severity: settlementBlocked > 0 ? "medium" : "low",
      owner: "재무 검토",
      detail: `${settlementBlocked}개 기업의 Payup 원장 대조 보류 상태를 검토해야 합니다.`,
    },
  ];
}

function AdminRepositoryNotice() {
  return null;
}

function AdminShell({
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
      sectionTitle="최고관리자"
      title={title}
      subtitle={subtitle}
      scopeLabel="운영 관리 콘솔"
      navItems={adminNavItems}
      accent="admin"
    >
      {children}
    </AppShell>
  );
}

function AdminOperationMap() {
  const items = [
    { title: "입점사 관리", body: "입점사 목록, 가입 요청, PG 준비 상태를 확인합니다.", href: "/admin/companies/list" },
    { title: "상품 운영", body: "등록 상품, 노출 URL, 판매중지/복구 상태를 확인합니다.", href: "/admin/products/list" },
    { title: "외부 연동 센터", body: "사방넷, ERP, WMS, 기업 공개 API 요청과 문서 배포를 관리합니다.", href: "/admin/integrations" },
    { title: "결제/정산", body: "PG 상태, 결제 로그, 정산 검토와 감사 기록을 확인합니다.", href: "/admin/payments" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link key={item.title} href={item.href} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-[11px] font-normal tracking-[0.14em] text-blue-700">운영</p>
          <h3 className="mt-2 text-lg font-normal text-slate-950">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
        </Link>
      ))}
    </section>
  );
}

function AccountProvisioningPanel() {
  const rows = [
    ["초대 방식", "Firebase Auth 초대 또는 비밀번호 재설정 링크"],
    ["권한 클레임", "role, company_id, nursery_id, room_id, tablet_id"],
    ["운영 금지", "관리자가 평문 비밀번호를 저장하거나 전달하지 않음"],
    ["운영 점검", "계정 회수 정책, 2단계 인증, 감사 로그 확인"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-normal text-slate-950">기업 관리자 계정 발급 기준</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        운영자는 계정 생성 권한만 갖고, 비밀번호는 사용자 재설정 흐름으로 관리합니다.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-normal text-blue-700">{label}</p>
            <p className="mt-1 text-sm font-normal text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PgReadinessPanel() {
  const readiness = getPaymentReadiness();

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-normal text-slate-950">PG 연동 준비 상태</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업별 Payup 가맹점 ID와 인증키 참조값을 입력한 뒤 테스트 결제, 결제 결과 저장, 주문/재고 기록까지 확인해야 실제 결제를 열 수 있습니다.
          </p>
        </div>
        <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-normal text-amber-900 ring-1 ring-amber-200">{readiness.label}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-normal text-slate-500">결제사</p>
          <p className="mt-1 font-normal text-slate-950">{readiness.provider}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-normal text-slate-500">부족한 키</p>
          <p className="mt-1 break-words text-sm font-normal text-slate-950">{readiness.missingKeys.join(", ") || "없음"}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-normal text-slate-500">필수 서버</p>
          <p className="mt-1 text-sm font-normal text-slate-950">Firebase Functions 결제 모듈</p>
        </div>
      </div>
    </section>
  );
}

export function AdminFeatureStatusPage() {
  const groups = [
    {
      title: "상품/홈 운영",
      links: [
        { href: "/admin/products/list", label: "상품 목록", body: "기업관리자가 등록한 상품과 폐쇄몰 노출 상태를 확인합니다." },
        { href: "/admin/products", label: "판매중지/복구", body: "문제 상품을 판매중지하거나 복구합니다." },
        { href: "/admin/home-editor", label: "홈/광고 운영", body: "메인 배너, 영상 광고, 모바일 미리보기를 관리합니다." },
      ],
    },
    {
      title: "연동/배포",
      links: [
        { href: "/admin/public-api-docs", label: "A5 공개 API 문서", body: "기업 연동 API 문서를 승인 후 배포합니다." },
        { href: "/admin/integrations", label: "외부 연동 센터", body: "사방넷, 네이버, 카페24, 쿠팡, WMS, ERP 커넥터를 관리합니다." },
        { href: "/admin/pg-settings", label: "PG 가맹점 설정", body: "사업자별 Payup 가맹점 정보와 사용 상태를 점검합니다." },
      ],
    },
    {
      title: "운영 감사",
      links: [
        { href: "/admin/orders", label: "전체 주문", body: "QR 출처와 order_items 기준 주문 흐름을 확인합니다." },
        { href: "/admin/settlements", label: "Payup 매출 대조", body: "Payup 원장 조회 상태, 환불 보류, A5 수수료를 확인합니다." },
        { href: "/admin/audit-logs", label: "감사 로그", body: "승인, 반려, 권한, 금액 변경 이력을 확인합니다." },
      ],
    },
  ];

  return (
    <AdminShell title="운영 점검" subtitle="승인, 배포, 결제, 정산, 외부 연동 준비 상태를 최고관리자 내부에서 확인합니다.">
      <div className="grid gap-4">
        {groups.map((group) => (
          <section key={group.title} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-normal text-slate-950">{group.title}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.links.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-400 hover:bg-white">
                  <p className="font-normal text-slate-950">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-3 text-xs font-normal text-blue-700">{item.href}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}

export function AdminFeatureStatusLegacyPage() {
  return <AdminFeatureStatusPage />;
}

export async function AdminIndexPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell title="운영 콘솔" subtitle="입점사, 조리원, 상품, 주문, 결제, 정산, 외부 연동 상태를 관리합니다.">
      <AdminRepositoryNotice />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {buildAdminMetrics(data).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6">
        <RepositoryConnectionPanel />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <RiskAlert risks={buildAdminRisks(data)} />
        <ConfirmBox
          title="운영 전환 점검"
          description="권한, PG, 외부 연동, API 문서, 감사 로그가 실제 운영 기준으로 연결되어 있는지 확인합니다."
        />
      </div>
    </AdminShell>
  );
}

export async function AdminDashboardPage() {
  const [data, visitorSummary] = await Promise.all([
    readAdminRuntimeData(),
    readVisitorAnalyticsSummary(14),
  ]);
  const orders = data.orders.slice(0, 5);

  return (
    <AdminShell title="통합 대시보드" subtitle="주문, QR, 상품 운영, Payup 대조, 외부 연동 상태를 한 화면에서 확인합니다.">
      <AdminRepositoryNotice />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {buildAdminMetrics(data).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6">
        <AdminCustomerAnalyticsPanel summary={visitorSummary} orders={data.orders} mode="overview" />
      </div>
      <div className="mt-6">
        <AdminOperationMap />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section>
          <FilterBar title="최근 주문" filters={["전체", "오늘", "QR 출처", "정산 확인"]} />
          <DataTable
            columns={["주문번호", "고객", "상태", "금액", "생성"]}
            rows={orders.map((order) => ({
              id: order.id,
              cells: [
                <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-normal text-blue-700">
                  {order.orderNo}
                </Link>,
                order.customerName,
                <StatusBadge key="status" status={order.status} />,
                formatCurrency(order.totalAmount),
                formatDateTime(order.createdAt),
              ],
            }))}
          />
        </section>
        <RiskAlert risks={buildAdminRisks(data)} />
      </div>
    </AdminShell>
  );
}

export async function AdminCustomersPage() {
  const [data, visitorSummary] = await Promise.all([
    readAdminRuntimeData(),
    readVisitorAnalyticsSummary(14),
  ]);

  return (
    <AdminShell title="고객관리" subtitle="비회원 고객, 방문자수, 주문수를 한 화면에서 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <AdminCustomerAnalyticsPanel summary={visitorSummary} orders={data.orders} mode="overview" />
    </AdminShell>
  );
}

export async function AdminGuestCustomersPage() {
  const [data, visitorSummary] = await Promise.all([
    readAdminRuntimeData(),
    readVisitorAnalyticsSummary(14),
  ]);

  return (
    <AdminShell title="비회원-고객리스트" subtitle="주문번호 기준으로 생성된 비회원 고객을 연락처와 최근 주문 기준으로 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <AdminCustomerAnalyticsPanel summary={visitorSummary} orders={data.orders} mode="guests" />
    </AdminShell>
  );
}

export async function AdminVisitorAnalyticsPage() {
  const [data, visitorSummary] = await Promise.all([
    readAdminRuntimeData(),
    readVisitorAnalyticsSummary(30),
  ]);

  return (
    <AdminShell title="방문자수" subtitle="폐쇄몰, 모바일 둘러보기, A5S 웹몰, A5S 앱몰 방문자 집계를 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <AdminCustomerAnalyticsPanel summary={visitorSummary} orders={data.orders} mode="visitors" />
    </AdminShell>
  );
}

export async function AdminCustomerOrdersPage() {
  const [data, visitorSummary] = await Promise.all([
    readAdminRuntimeData(),
    readVisitorAnalyticsSummary(14),
  ]);

  return (
    <AdminShell title="주문수" subtitle="비회원 주문과 폐쇄몰 주문 상태별 건수를 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <AdminCustomerAnalyticsPanel summary={visitorSummary} orders={data.orders} mode="orders" />
    </AdminShell>
  );
}

export async function AdminCompaniesPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell title="가입 요청/입점사 상세" subtitle="신규 가입 요청, 입점사 상세 상태, 권한 발급 흐름을 관리합니다. 업체 목록과 PG 설정은 별도 엑셀형 화면에서 처리합니다.">
      <AdminRepositoryNotice />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/companies/list" className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white">
          입점사 목록 보기
        </Link>
        <Link href="/admin/pg-settings" className="rounded-md bg-white px-3 py-2 text-xs font-normal text-slate-700 ring-1 ring-slate-200">
          PG 가맹점 설정
        </Link>
      </div>
      <CompanySignupRequestsPanel />
      <div className="mt-4" />
      <AdminCompanySelectionDashboard companies={data.companies} products={data.products} orderItems={data.orderItems} settlements={data.settlements} />
      <div className="mt-4" />
      <AccountProvisioningPanel />
      <div className="mt-4" />
      <CompanyApprovalQueuePanel />
      <div className="mt-4" />
      <FilterBar title="입점사 필터" filters={["전체", "승인", "대기", "정산 보류"]} />
      <DataTable
        columns={["기업", "담당자", "상태", "PG", "수수료", "상품", "예외검토", "정산"]}
        rows={data.companies.map((company) => ({
          id: company.id,
          cells: [
            <span key="name" className="font-normal text-slate-950">{company.name}</span>,
            company.managerName,
            company.status,
            `${company.pgProfile?.providerLabel ?? PAYUP_PROVIDER_LABEL} / ${company.pgProfile?.merchantIdMasked ?? "가맹점 ID 대기"}`,
            formatPercent(company.commissionRate),
            company.productCount,
            company.pendingProductCount,
            company.settlementBlocked ? "지급 차단" : "정상",
          ],
        }))}
      />
    </AdminShell>
  );
}

export function AdminCompanyAdModerationPage() {
  return (
    <AdminShell title="기업 광고 노출 제재" subtitle="기업관리자가 등록한 이미지 광고와 팝업 광고를 검토하고 노출 제재 또는 승인 처리합니다.">
      <AdminCompanyAdModerationPanel />
    </AdminShell>
  );
}

export function AdminNurseriesPage() {
  return (
    <AdminShell title="조리원 관리" subtitle="signage-partner 산후조리원 카테고리 업체를 사업자등록번호 기준으로 A5 조리원 계정에 연동합니다.">
      <AdminNurseryPartnerSyncPanel />
    </AdminShell>
  );
}

export async function AdminRoomsPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell title="객실 관리" subtitle="QR 출처 저장 기준인 nursery_id, room_id를 관리합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <AdminRoomsTable rooms={data.rooms} nurseries={data.nurseries} />
    </AdminShell>
  );
}

export async function AdminTabletsPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell title="태블릿 관리" subtitle="조리원 폐쇄몰 접근 장치와 객실 연결 상태를 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <AdminTabletsTable rooms={data.rooms} tablets={data.tablets} />
    </AdminShell>
  );
}

export async function AdminProductsPage() {
  const data = await readAdminRuntimeData();
  const companies = data.companies;

  return (
    <AdminShell title="판매중지/복구" subtitle="기업관리자가 등록한 상품은 즉시 노출을 기준으로 보고, 최고관리자는 문제 상품의 판매중지와 복구만 처리합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/products/list" className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white">
          상품 목록 보기
        </Link>
        <Link href="/tablet/products/" className="rounded-md bg-white px-3 py-2 text-xs font-normal text-slate-700 ring-1 ring-slate-200">
          폐쇄몰 확인
        </Link>
      </div>
      <div className="mt-4" />
      <AdminProductModerationPanel companies={companies} />
      <div className="mt-4" />
      <FilterBar title="상품 필터" filters={["전체", "판매중", "중지", "재고부족"]} />
      <DataTable
        columns={["상품", "입점사", "카테고리", "상태", "폐쇄몰가", "재고"]}
        rows={data.products.map((product) => ({
          id: product.id,
          cells: [
            <span key="name" className="font-normal text-slate-950">{product.name}</span>,
            companies.find((company) => company.id === product.companyId)?.name ?? product.companyId,
            product.category,
            <StatusBadge key="status" status={product.status} />,
            formatCurrency(product.price),
            product.stock,
          ],
        }))}
      />
    </AdminShell>
  );
}

export async function AdminOrdersPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell title="주문 관리" subtitle="QR 출처와 order_items 기준 정산 저장 흐름을 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <AdminCancelRequestsPanel />
      <div className="mt-4" />
      <DataTable
        columns={["주문번호", "고객", "상태", "수령", "금액", "QR"]}
        rows={data.orders.map((order) => ({
          id: order.id,
          cells: [
            <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-normal text-blue-700">
              {order.orderNo}
            </Link>,
            order.customerName,
            <StatusBadge key="status" status={order.status} />,
            order.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
            formatCurrency(order.totalAmount),
            order.qrSessionId,
          ],
        }))}
      />
    </AdminShell>
  );
}

export async function AdminPaymentsPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell title="결제 관리" subtitle="Payup 결제 상태와 승인/실패 로그를 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <PgReadinessPanel />
      <div className="mt-4" />
      <ConfirmBox
        title="기업별 Payup 가맹점 검증 필요"
        description="기업별 Payup 가맹점 ID, 인증키 참조값, webhook 검증값을 저장하고 테스트 결제 1건이 성공해야 실제 결제를 열 수 있습니다."
      />
      <div className="mt-4">
        <DataTable
          columns={["주문번호", "상태", "금액", "거래번호", "승인시각"]}
          rows={data.payments.map((payment) => ({
            id: payment.id,
            cells: [
              payment.orderNo,
              <StatusBadge key="status" status={payment.status} />,
              formatCurrency(payment.amount),
              payment.mockTid,
              payment.approvedAt ? formatDateTime(payment.approvedAt) : "-",
            ],
          }))}
        />
      </div>
    </AdminShell>
  );
}

export function AdminPgPaymentLogsPage() {
  return (
    <AdminShell
      title="PG 결제 로그"
      subtitle="Payup 결제창 복귀, 거래조회, 결제확정, 웹훅 로그를 운영자가 해석할 수 있는 문장으로 모니터링합니다."
    >
      <PgPaymentLogMonitoringPanel />
    </AdminShell>
  );
}

export async function AdminA5sFirebaseIntegrationPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell
      title="A5S Firebase 연동"
      subtitle="A5S 웹몰, 앱몰, 매출 취합, PG 연동을 기존 A5와 분리된 Firebase 좌표로 설계하고 관리합니다."
    >
      <AdminA5sFirebaseIntegrationPanel
        companies={data.companies}
        orders={data.orders}
        orderItems={data.orderItems}
        payments={data.payments}
      />
    </AdminShell>
  );
}

export async function AdminPgIntegrationPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell
      title="이전 PG 연동 보관"
      subtitle="기존 PG 연동 화면입니다. 운영 입력은 PG 가맹점 설정 화면을 기준으로 처리합니다."
    >
      <InnopayPgIntegrationPanel companies={data.companies} />
    </AdminShell>
  );
}

export async function AdminPgSettingsPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell
      title="PG 가맹점 설정"
      subtitle="사업자별 Payup 가맹점 ID, 인증키 참조명, 운영 활성화 상태를 관리합니다."
    >
      <PgGatewaySettingsPanel companies={data.companies} />
    </AdminShell>
  );
}

export function AdminIntegrationsPage() {
  return (
    <AdminShell
      title="외부 연동 센터"
      subtitle="사방넷, 네이버 커머스API, 카페24, 쿠팡, WMS, ERP를 A5 표준 주문/물류 모델과 연결합니다."
    >
      <AdminIntegrationMonitoringPanel />
      <div className="mt-4" />
      <ExternalIntegrationCenterPanel />
    </AdminShell>
  );
}

export function AdminPublicApiDocsPage() {
  return (
    <AdminShell
      title="A5 공개 API 문서/기업 요청"
      subtitle="기업 개발자가 자체 플랫폼에 A5 주문 상세 실시간 연동 API를 붙일 수 있도록 요청 승인과 문서 배포를 관리합니다."
    >
      <AdminApiIntegrationRequestsPanel />
      <div className="mt-4" />
      <AdminIntegrationMonitoringPanel />
      <div className="mt-4" />
      <A5PublicApiDocsPanel />
    </AdminShell>
  );
}

export async function AdminSettlementsPage() {
  const data = await readAdminRuntimeData();
  const companies = data.companies;

  return (
    <AdminShell title="Payup 매출 대조" subtitle="order_items 매출과 Payup 거래 원장을 읽기 전용으로 대조하고 A5 영업 수수료를 확인합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <ConfirmBox
        title="Payup 조회/A5 수수료 범위"
        description={`기업 정산금은 ${PAYUP_PROVIDER_LABEL}에서 기업과 직접 처리합니다. A5는 order_items와 Payup 원장을 읽기 전용으로 대조하고 A5 영업 수수료 ${formatPercent(A5_SALES_COMMISSION_RATE)} 기준 금액만 확인합니다.`}
      />
      <div className="mt-4">
        <DataTable
          columns={["기간", "입점사", "상태", "A5 주문 총액", "Payup 원장", "A5 수수료", "환불 보류", "A5 지급"]}
          rows={data.settlements.map((settlement) => ({
            id: settlement.id,
            cells: [
              settlement.period,
              companies.find((company) => company.id === settlement.companyId)?.name ?? settlement.companyId,
              <StatusBadge key="status" status={settlement.status} />,
              formatCurrency(settlement.grossAmount),
              "조회 대기",
              formatCurrency(settlement.commissionAmount),
              formatCurrency(settlement.refundHoldAmount),
              "없음",
            ],
          }))}
        />
      </div>
    </AdminShell>
  );
}

export async function AdminAuditLogsPage() {
  const data = await readAdminRuntimeData();

  return (
    <AdminShell title="감사 로그" subtitle="권한, 금액, 상태 변경 이력을 audit log로 보존하고 추적합니다.">
      <AdminRepositoryNotice />
      <div className="mt-4" />
      <DataTable
        columns={["시각", "역할", "행위자", "액션", "대상", "메시지"]}
        rows={data.auditLogs.map((log) => ({
          id: log.id,
          cells: [
            formatDateTime(log.createdAt),
            log.actorRole,
            log.actorName,
            log.action,
            log.target,
            log.message,
          ],
        }))}
      />
    </AdminShell>
  );
}

export function AdminPermissionsPage() {
  return (
    <AdminShell title="권한/계정" subtitle="Firebase Auth 초대, 권한 클레임, 역할별 접근 범위를 운영자가 검토합니다.">
      <AdminInvitePanel />
      <div className="mt-4" />
      <ConfirmBox
        title="실제 계정 평문 저장 금지"
        description="이 화면은 운영 설계와 초대 흐름을 표시합니다. 테스트 계정 외 평문 비밀번호 저장과 secret 노출은 금지합니다."
        confirmLabel="SUPER_ADMIN 승인 필요"
      />
    </AdminShell>
  );
}
