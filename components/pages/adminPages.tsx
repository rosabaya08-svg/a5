import Link from "next/link";
import { A5PublicApiDocsPanel } from "@/components/admin/A5PublicApiDocsPanel";
import { AdminInvitePanel } from "@/components/admin/AdminInvitePanel";
import { AdminApiIntegrationRequestsPanel } from "@/components/admin/AdminApiIntegrationRequestsPanel";
import { InnopayPgIntegrationPanel } from "@/components/admin/InnopayPgIntegrationPanel";
import { AdminNurseryPartnerSyncPanel } from "@/components/admin/AdminNurseryPartnerSyncPanel";
import { AdminRoomsTable, AdminTabletsTable } from "@/components/admin/AdminRoomDeviceTables";
import { AdminProductDraftRequestsPanel } from "@/components/admin/AdminProductDraftRequestsPanel";
import { CompanySignupRequestsPanel } from "@/components/admin/CompanySignupRequestsPanel";
import { ExternalIntegrationCenterPanel } from "@/components/admin/ExternalIntegrationCenterPanel";
import {
  AuditLogViewerPanel,
  CmsOperationsPanel,
  CompanyApprovalQueuePanel,
  OrderMonitorPanel,
  PaymentMonitorPanel,
  ProductApprovalQueuePanel,
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
  A5_PLATFORM_FEE_RATE,
  calculateInfinySettlement,
  INFINY_PG_FEE_RATE,
  INFINY_TOTAL_FEE_RATE,
} from "@/lib/payments/infinySettlementPolicy";
import { getPaymentReadiness } from "@/lib/payments/paymentService";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils/format";

export const legacyAdminNavItems = adminNavItems;

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
    { title: "입점사 승인", body: "회원가입 요청, 사업자 서류, MID/PG 준비 상태를 확인합니다.", href: "/admin/companies" },
    { title: "상품 검수", body: "상품 등록 요청, 고시정보, KC/증빙, 가격 정책을 검수합니다.", href: "/admin/products" },
    { title: "외부 연동 센터", body: "사방넷, ERP, WMS, 기업 공개 API 요청과 문서 배포를 관리합니다.", href: "/admin/integrations" },
    { title: "결제/정산", body: "PG 상태, 결제 로그, 정산 검토와 감사 기록을 확인합니다.", href: "/admin/payments" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link key={item.title} href={item.href} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">operation</p>
          <h3 className="mt-2 text-lg font-black text-slate-950">{item.title}</h3>
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
      <h2 className="text-lg font-black text-slate-950">기업 관리자 계정 발급 기준</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        운영자는 계정 생성 권한만 갖고, 비밀번호는 사용자 재설정 흐름으로 관리합니다.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-blue-700">{label}</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
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
          <h2 className="text-lg font-black text-slate-950">PG 연동 준비 상태</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업별 MID와 인피니 PG 키값을 입력한 뒤 서버 승인, webhook 검증, 주문/재고 기록까지 확인해야 실제 결제를 열 수 있습니다.
          </p>
        </div>
        <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-black text-amber-900 ring-1 ring-amber-200">{readiness.label}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">결제사</p>
          <p className="mt-1 font-black text-slate-950">{readiness.provider}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">부족한 키</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-950">{readiness.missingKeys.join(", ") || "없음"}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-500">필수 서버</p>
          <p className="mt-1 text-sm font-bold text-slate-950">Firebase Functions 결제 모듈</p>
        </div>
      </div>
    </section>
  );
}

export function AdminFeatureStatusPage() {
  const groups = [
    {
      title: "검수/승인",
      links: [
        { href: "/admin/products", label: "상품 승인", body: "기업 상품 등록 요청과 검수 상태를 확인합니다." },
        { href: "/admin/companies", label: "입점사 승인", body: "회원가입 요청과 사업자 서류를 검토합니다." },
        { href: "/admin/marketing/banners", label: "광고 검수", body: "배너, 영상, GIF 소재 노출 상태를 관리합니다." },
      ],
    },
    {
      title: "연동/배포",
      links: [
        { href: "/admin/public-api-docs", label: "A5 공개 API 문서", body: "기업 연동 API 문서를 승인 후 배포합니다." },
        { href: "/admin/integrations", label: "외부 연동 센터", body: "사방넷, 네이버, 카페24, 쿠팡, WMS, ERP 커넥터를 관리합니다." },
        { href: "/admin/payments", label: "PG 결제", body: "기업별 MID와 키값 입력 상태를 점검합니다." },
      ],
    },
    {
      title: "운영 감사",
      links: [
        { href: "/admin/orders", label: "전체 주문", body: "QR 출처와 order_items 기준 주문 흐름을 확인합니다." },
        { href: "/admin/settlements", label: "정산 검토", body: "수수료, 환불 보류, 입금 예정 금액을 확인합니다." },
        { href: "/admin/audit-logs", label: "감사 로그", body: "승인, 반려, 권한, 금액 변경 이력을 확인합니다." },
      ],
    },
  ];

  return (
    <AdminShell title="운영 점검" subtitle="승인, 배포, 결제, 정산, 외부 연동 준비 상태를 최고관리자 내부에서 확인합니다.">
      <div className="grid gap-4">
        {groups.map((group) => (
          <section key={group.title} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">{group.title}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.links.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-400 hover:bg-white">
                  <p className="font-black text-slate-950">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-3 text-xs font-black text-blue-700">{item.href}</p>
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

export function AdminIndexPage() {
  return (
    <AdminShell title="운영 콘솔" subtitle="입점사, 조리원, 상품, 주문, 결제, 정산, 외부 연동 상태를 관리합니다.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.adminMetrics().map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6">
        <RepositoryConnectionPanel />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <RiskAlert risks={mockApi.risks()} />
        <ConfirmBox
          title="운영 전환 점검"
          description="권한, PG, 외부 연동, API 문서, 감사 로그가 실제 운영 기준으로 연결되어 있는지 확인합니다."
        />
      </div>
    </AdminShell>
  );
}

export function AdminDashboardPage() {
  const orders = mockApi.orders().slice(0, 5);

  return (
    <AdminShell title="통합 대시보드" subtitle="주문, QR, 상품 승인, 정산 보류, 외부 연동 상태를 한 화면에서 확인합니다.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.adminMetrics().map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6">
        <AdminOperationMap />
      </div>
      <div className="mt-6">
        <CmsOperationsPanel />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section>
          <FilterBar title="최근 주문" filters={["전체", "오늘", "QR 출처", "정산 확인"]} />
          <DataTable
            columns={["주문번호", "고객", "상태", "금액", "생성"]}
            rows={orders.map((order) => ({
              id: order.id,
              cells: [
                <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-bold text-blue-700">
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
        <RiskAlert risks={mockApi.risks()} />
      </div>
    </AdminShell>
  );
}

export function AdminCompaniesPage() {
  return (
    <AdminShell title="입점사 관리/가입 요청" subtitle="회원가입 요청, 기업 승인, MID/PG 입력, 권한 발급을 관리합니다.">
      <CompanySignupRequestsPanel />
      <div className="mt-4" />
      <AccountProvisioningPanel />
      <div className="mt-4" />
      <CompanyApprovalQueuePanel />
      <div className="mt-4" />
      <FilterBar title="입점사 필터" filters={["전체", "승인", "대기", "정산 보류"]} />
      <DataTable
        columns={["기업", "담당자", "상태", "PG/MID", "수수료", "상품", "승인대기", "정산"]}
        rows={mockApi.companies().map((company) => ({
          id: company.id,
          cells: [
            <span key="name" className="font-bold text-slate-950">{company.name}</span>,
            company.managerName,
            company.status,
            `${company.pgProfile?.providerLabel ?? "인피니 PG"} / ${company.pgProfile?.merchantIdMasked ?? "MID 발급 대기"}`,
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

export function AdminNurseriesPage() {
  return (
    <AdminShell title="조리원 관리" subtitle="A1/A2 가입자 자료를 A5 조리원 계정으로 일괄 연동하고, 객실/태블릿 운영 상태를 관리합니다.">
      <AdminNurseryPartnerSyncPanel />
    </AdminShell>
  );
}

export function AdminRoomsPage() {
  const nurseries = mockApi.nurseries();

  return (
    <AdminShell title="객실 관리" subtitle="QR 출처 저장 기준인 nursery_id, room_id를 관리합니다.">
      <AdminRoomsTable rooms={mockApi.rooms()} nurseries={nurseries} />
    </AdminShell>
  );
}

export function AdminTabletsPage() {
  const rooms = mockApi.rooms();

  return (
    <AdminShell title="태블릿 관리" subtitle="조리원 폐쇄몰 접근 장치와 객실 연결 상태를 확인합니다.">
      <AdminTabletsTable rooms={rooms} tablets={mockApi.tablets()} />
    </AdminShell>
  );
}

export function AdminProductsPage() {
  const companies = mockApi.companies();

  return (
    <AdminShell title="상품 승인" subtitle="기업 어드민이 제출한 상품 draft를 검수하고 승인/반려합니다.">
      <AdminProductDraftRequestsPanel />
      <div className="mt-4" />
      <ProductApprovalQueuePanel />
      <div className="mt-4" />
      <FilterBar title="상품 필터" filters={["전체", "승인대기", "승인완료", "재고부족"]} />
      <DataTable
        columns={["상품", "입점사", "카테고리", "상태", "폐쇄몰가", "재고"]}
        rows={mockApi.products().map((product) => ({
          id: product.id,
          cells: [
            <span key="name" className="font-bold text-slate-950">{product.name}</span>,
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

export function AdminOrdersPage() {
  return (
    <AdminShell title="주문 관리" subtitle="QR 출처와 order_items 기준 정산 저장 흐름을 확인합니다.">
      <OrderMonitorPanel />
      <div className="mt-4" />
      <DataTable
        columns={["주문번호", "고객", "상태", "수령", "금액", "QR"]}
        rows={mockApi.orders().map((order) => ({
          id: order.id,
          cells: [
            <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-bold text-blue-700">
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

export function AdminPaymentsPage() {
  return (
    <AdminShell title="결제 관리" subtitle="인피니 PG 전환 전후 결제 상태와 승인/실패 로그를 확인합니다.">
      <PgReadinessPanel />
      <div className="mt-4" />
      <PaymentMonitorPanel />
      <div className="mt-4" />
      <ConfirmBox
        title="기업별 MID/키값 검증 필요"
        description="기업별 MID, 시리얼번호, 모듈키, secret key, sign key, webhook secret 입력 후 테스트 승인 1건이 성공해야 실제 결제를 열 수 있습니다."
      />
      <div className="mt-4">
        <DataTable
          columns={["주문번호", "상태", "금액", "거래번호", "승인시각"]}
          rows={mockApi.payments().map((payment) => ({
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

export function AdminPgIntegrationPage() {
  return (
    <AdminShell
      title="PG 연동"
      subtitle="인피니 REST API 경로, MID, Merchant-Key, licenseKey, cancelPwd, Noti URL을 한 화면에서 설계하고 저장합니다."
    >
      <InnopayPgIntegrationPanel />
    </AdminShell>
  );
}

export function AdminIntegrationsPage() {
  return (
    <AdminShell
      title="외부 연동 센터"
      subtitle="사방넷, 네이버 커머스API, 카페24, 쿠팡, WMS, ERP를 A5 표준 주문/물류 모델과 연결합니다."
    >
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
      <A5PublicApiDocsPanel />
    </AdminShell>
  );
}

export function AdminSettlementsPage() {
  const companies = mockApi.companies();

  return (
    <AdminShell title="정산 검토" subtitle="order_items 기준 인피니 PG 공제율과 A5 주문 수수료를 확인합니다.">
      <ConfirmBox
        title="최고관리자 정산 검토"
        description={`인피니 PG 수수료 ${formatPercent(INFINY_PG_FEE_RATE)}와 A5 수수료 ${formatPercent(A5_PLATFORM_FEE_RATE)}를 합산해 총 ${formatPercent(INFINY_TOTAL_FEE_RATE)} 공제 후 기업사에 정산합니다.`}
      />
      <div className="mt-4">
        <DataTable
          columns={["기간", "입점사", "상태", "총액", "인피니 PG", "A5 수수료", "환불보류", "예상입금"]}
          rows={mockApi.settlements().map((settlement) => {
            const fees = calculateInfinySettlement(settlement.grossAmount);

            return {
              id: settlement.id,
              cells: [
                settlement.period,
                companies.find((company) => company.id === settlement.companyId)?.name ?? settlement.companyId,
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
      </div>
    </AdminShell>
  );
}

export function AdminAuditLogsPage() {
  return (
    <AdminShell title="감사 로그" subtitle="권한, 금액, 상태 변경 이력을 audit log로 보존하고 추적합니다.">
      <AuditLogViewerPanel />
      <div className="mt-4" />
      <DataTable
        columns={["시각", "역할", "행위자", "액션", "대상", "메시지"]}
        rows={mockApi.auditLogs().map((log) => ({
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
