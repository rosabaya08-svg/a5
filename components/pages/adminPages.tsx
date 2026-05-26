import Link from "next/link";
import { AdminInvitePanel } from "@/components/admin/AdminInvitePanel";
import { CompanySignupRequestsPanel } from "@/components/admin/CompanySignupRequestsPanel";
import { ComplianceSummaryPanel } from "@/components/admin/ComplianceSummaryPanel";
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
import { mockPreviewRoutes } from "@/data/mockPreviewRoutes";
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
      scopeLabel="최고관리자"
      navItems={adminNavItems}
      accent="admin"
    >
      {children}
    </AppShell>
  );
}

function AdminOperationMap() {
  const items = [
    { title: "폐쇄몰 홈 디자인", body: "메인 배너, 광고 배너, 브랜드 로고, 기획전 섹션을 모의 콘텐츠 관리로 편성", href: "/admin/home-editor" },
    { title: "광고 소재 승인", body: "이미지, 영상, GIF 등록 위치와 승인/반려 상태를 운영자가 검토", href: "/admin/marketing/banners" },
    { title: "기업 관리자 발급", body: "비밀번호 평문 발급 금지. Firebase Auth 초대/비밀번호 재설정/권한 클레임으로 설계", href: "/admin/companies" },
    { title: "PG 전환 게이트", body: "결제 키 입력 후에도 서버 금액 재계산과 승인 엔드포인트 없이는 실결제 차단", href: "/admin/payments" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link key={item.title} href={item.href} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-black uppercase text-blue-600">운영 제어</p>
          <h3 className="mt-2 text-lg font-black text-slate-950">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
        </Link>
      ))}
    </section>
  );
}

const featureGroups = [
  {
    title: "최고관리자",
    description: "입점사, 조리원, 상품, 주문, 결제, 정산, 외부 연동을 전체 관리합니다.",
    links: [
      { href: "/admin/dashboard", label: "대시보드", body: "주문, 상품 승인, QR, 정산 보류 요약" },
      { href: "/admin/companies", label: "입점사", body: "회원가입 요청, 기업 승인, MID, 권한 확인" },
      { href: "/admin/nurseries", label: "조리원", body: "조리원 계정, 객실, 태블릿 현황" },
      { href: "/admin/products", label: "상품 승인", body: "승인 대기 상품, 고시, KC, 가격 검토" },
      { href: "/admin/orders", label: "주문", body: "전체 주문과 QR 출처, order_items 확인" },
      { href: "/admin/integrations", label: "외부 연동 센터", body: "사방넷, ERP, WMS, 공개 API 연동 관리" },
      { href: "/admin/payments", label: "결제", body: "PG 상태, 승인/실패, 결제 로그 확인" },
      { href: "/admin/settlements", label: "정산 검토", body: "입점사별 수수료와 입금 예정 검산" },
      { href: "/admin/audit-logs", label: "감사 로그", body: "권한, 금액, 상태 변경 이력" },
    ],
  },
  {
    title: "기업 관리자",
    description: "입점사가 자기 상품, 주문, 재고, 배송, 매출, 입금을 처리합니다.",
    links: [
      { href: "/company/dashboard", label: "대시보드", body: "상품, 주문, 재고, 입금 예정 요약" },
      { href: "/company/onboarding", label: "입점 신청", body: "사업자 서류와 운영 정보 확인" },
      { href: "/company/products", label: "상품 관리", body: "상품 상태, 옵션, 외부 상품코드, 재고" },
      { href: "/company/products/new", label: "상품 등록", body: "상품 정보 작성과 승인 요청" },
      { href: "/company/orders", label: "주문 관리", body: "자기 회사 주문상품 확인" },
      { href: "/company/inventory", label: "재고 관리", body: "SKU/옵션별 재고와 품절 상태" },
      { href: "/company/deliveries", label: "배송/수령", body: "송장 등록과 현장수령 처리" },
      { href: "/company/sales", label: "매출", body: "확정 매출과 환불 보류" },
      { href: "/company/payouts", label: "입금", body: "수수료, 입금 예정액, 정산서" },
    ],
  },
  {
    title: "조리원 관리자",
    description: "조리원이 자기 객실, 태블릿, QR, 현장수령, 주문 이력을 확인합니다.",
    links: [
      { href: "/nursery/dashboard", label: "대시보드", body: "객실, 태블릿, QR, 현장수령 요약" },
      { href: "/nursery/rooms", label: "객실", body: "A4 객실 가져오기와 A5 객실 운영본" },
      { href: "/nursery/tablets", label: "태블릿", body: "객실별 단말 연결 상태" },
      { href: "/nursery/pickups", label: "현장수령", body: "조리원에서 받을 주문 확인" },
      { href: "/nursery/qr-history", label: "QR 이력", body: "QR 생성, 만료, 결제 상태" },
      { href: "/nursery/orders", label: "주문 이력", body: "조리원 객실에서 발생한 주문" },
    ],
  },
  {
    title: "태블릿 / 고객",
    description: "객실 태블릿에서 상품을 담고 고객 모바일 QR 결제와 주문조회로 이어집니다.",
    links: [
      { href: "/tablet/login", label: "태블릿 로그인", body: "사업자번호 확인과 객실 선택" },
      { href: "/tablet/products", label: "상품 목록", body: "객실 고정 폐쇄몰 상품 탐색" },
      { href: "/tablet/cart", label: "장바구니", body: "객실/태블릿별 장바구니" },
      { href: "/tablet/qr", label: "QR 생성", body: "고객 모바일 결제 QR 표시" },
      { href: "/orders/guest", label: "비회원 주문조회", body: "주문번호 기반 주문 상태 확인" },
      { href: "/q/SANHO701", label: "고객 QR", body: "QR 스캔 후 모바일 결제 진입" },
    ],
  },
];

export function AdminFeatureStatusPage() {
  return (
    <AdminShell
      title="기능 현황"
      subtitle="첫 화면에서 빠졌던 기능 목록을 최고관리자 내부에서 다시 확인합니다."
    >
      <div className="grid gap-4">
        {featureGroups.map((group) => (
          <section key={group.title} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">A5 기능 묶음</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{group.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{group.links.length}개 기능</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-950 hover:bg-white hover:shadow-md"
                >
                  <p className="text-base font-black text-slate-950">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-3 text-xs font-black text-blue-700">{item.href}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">내부 점검</p>
              <h2 className="mt-1 text-xl font-black">이전 미리보기/진행 점검 화면</h2>
              <p className="mt-2 text-sm leading-6">
                운영 사용자 첫 화면에서는 숨기고, 최고관리자 내부에서만 접근해 화면 상태와 경로를 점검합니다.
              </p>
            </div>
            <Link href="/mock-ui/status" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
              진행 상태 열기
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {mockPreviewRoutes.map((route) => (
              <Link key={route.id} href={route.href} className="rounded-md bg-white p-4 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-sm font-black">{route.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{route.description}</p>
                <p className="mt-3 text-xs font-black text-amber-700">{route.href}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function AccountProvisioningPanel() {
  const rows = [
    ["초대 방식", "Firebase Auth 이메일 초대 또는 비밀번호 재설정 링크"],
    ["권한 클레임", "role, company_id, nursery_id, room_id, tablet_id"],
    ["금지", "관리자가 임시 비밀번호를 평문 저장하거나 전달하는 방식"],
    ["운영 전 확인", "대표 승인, 계정 회수 정책, 2단계 인증 권고"],
  ];

  return (
    <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <h2 className="text-lg font-black">기업 관리자 아이디/비밀번호 부여 설계</h2>
      <p className="mt-2 text-sm leading-6">
        운영자는 계정 생성 권한만 갖고, 비밀번호 자체는 Firebase Auth 초대/재설정 흐름으로 사용자가 설정해야 합니다.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-white p-3">
            <p className="text-xs font-black text-blue-600">{label}</p>
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
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">PG 연동 준비 상태</h2>
          <p className="mt-2 text-sm leading-6">
            PG 키를 받아도 이 화면에서 바로 실결제를 실행하지 않습니다. 서버 confirm, webhook 검증, 주문 snapshot, 재고 차감, audit log가 먼저 필요합니다.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-900">{readiness.label}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-black text-slate-500">결제사</p>
          <p className="mt-1 font-black text-slate-950">{readiness.provider}</p>
        </div>
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-black text-slate-500">누락 키</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-950">{readiness.missingKeys.join(", ") || "없음"}</p>
        </div>
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-black text-slate-500">필수 서버</p>
          <p className="mt-1 text-sm font-bold text-slate-950">Functions / Cloud Run / Workers 중 확정 필요</p>
        </div>
      </div>
    </section>
  );
}

export function AdminIndexPage() {
  return (
    <AdminShell
      title="운영 콘솔"
      subtitle="산후조리원 폐쇄몰 베타의 모의 운영 지표와 차단 항목을 확인합니다."
    >
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
          title="운영 전환 차단"
          description="이 콘솔은 Firebase, PG, 알림톡, 배송조회, 외부 재고 API에 연결하지 않는 개발용 모의/테스트 화면입니다."
        />
      </div>
    </AdminShell>
  );
}

export function AdminDashboardPage() {
  const orders = mockApi.orders().slice(0, 5);

  return (
    <AdminShell
      title="통합 대시보드"
      subtitle="주문, QR, 상품 승인, 정산 보류를 한 화면에서 점검합니다."
    >
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
          <FilterBar title="최근 주문" filters={["오늘", "모의 결제", "QR 출처 포함"]} />
          <DataTable
            columns={["주문번호", "고객", "상태", "금액", "생성"]}
            rows={orders.map((order) => ({
              id: order.id,
              cells: [
                <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-semibold text-blue-700">
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
    <AdminShell title="입점사 관리" subtitle="기업 승인, 인피니 MID, 수수료율, 정산 차단 상태를 확인합니다.">
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
            <span key="name" className="font-semibold text-slate-950">{company.name}</span>,
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
    <AdminShell title="산후조리원 관리" subtitle="조리원별 객실, 태블릿, 승인 상태를 확인합니다.">
      <FilterBar title="조리원 필터" filters={["전체", "서울/경기", "승인", "대기"]} />
      <DataTable
        columns={["조리원", "지역", "담당자", "상태", "객실", "태블릿"]}
        rows={mockApi.nurseries().map((nursery) => ({
          id: nursery.id,
          cells: [
            <span key="name" className="font-semibold text-slate-950">{nursery.name}</span>,
            nursery.region,
            nursery.managerName,
            nursery.status,
            nursery.roomCount,
            nursery.tabletCount,
          ],
        }))}
      />
    </AdminShell>
  );
}

export function AdminRoomsPage() {
  const nurseries = mockApi.nurseries();

  return (
    <AdminShell title="객실 관리" subtitle="QR 출처 저장 기준인 nursery_id, room_id를 점검합니다.">
      <DataTable
        columns={["객실", "조리원", "층", "현장수령", "연결 태블릿"]}
        rows={mockApi.rooms().map((room) => ({
          id: room.id,
          cells: [
            <span key="name" className="font-semibold text-slate-950">{room.name}</span>,
            nurseries.find((nursery) => nursery.id === room.nurseryId)?.name ?? room.nurseryId,
            room.floor,
            room.pickupEnabled ? "가능" : "불가",
            room.activeTabletId ?? "미연결",
          ],
        }))}
      />
    </AdminShell>
  );
}

export function AdminTabletsPage() {
  const rooms = mockApi.rooms();

  return (
    <AdminShell title="태블릿 관리" subtitle="폐쇄몰 접근 장치와 객실 연결 상태를 확인합니다.">
      <DataTable
        columns={["태블릿", "객실", "상태", "마지막 접속", "세션 원칙"]}
        rows={mockApi.tablets().map((tablet) => ({
          id: tablet.id,
          cells: [
            <span key="label" className="font-semibold text-slate-950">{tablet.label}</span>,
            rooms.find((room) => room.id === tablet.roomId)?.name ?? tablet.roomId,
            tablet.status,
            formatDateTime(tablet.lastSeenAt),
            "nursery_id + room_id + tablet_id",
          ],
        }))}
      />
    </AdminShell>
  );
}

export function AdminProductsPage() {
  const companies = mockApi.companies();

  return (
    <AdminShell title="상품 승인" subtitle="승인 대기 상품과 가격비교 표시값을 검토합니다.">
      <ComplianceSummaryPanel />
      <div className="mt-4" />
      <ProductApprovalQueuePanel />
      <div className="mt-4" />
      <FilterBar title="상품 필터" filters={["전체", "승인대기", "승인완료", "재고부족"]} />
      <DataTable
        columns={["상품", "입점사", "카테고리", "상태", "폐쇄몰가", "재고"]}
        rows={mockApi.products().map((product) => ({
          id: product.id,
          cells: [
            <span key="name" className="font-semibold text-slate-950">{product.name}</span>,
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
    <AdminShell title="전체 주문" subtitle="QR 출처와 order_items 기준 정산 원장을 함께 확인합니다.">
      <OrderMonitorPanel />
      <div className="mt-4" />
      <DataTable
        columns={["주문번호", "고객", "상태", "수령", "금액", "QR"]}
        rows={mockApi.orders().map((order) => ({
          id: order.id,
          cells: [
            <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-semibold text-blue-700">
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
    <AdminShell title="결제" subtitle="인피니 PG 전환 전까지 모의 결제 상태와 TID 형식만 확인합니다.">
      <PgReadinessPanel />
      <div className="mt-4" />
      <PaymentMonitorPanel />
      <div className="mt-4" />
      <ConfirmBox
        title="인피니 MID 승인 전 실결제 차단"
        description="기업별 MID, 분할정산 API, 테스트 승인, webhook 검증 전까지 실제 결제 모듈은 열지 않습니다. MID 입력은 최고관리자 화면에서만 처리합니다."
      />
      <div className="mt-4">
        <DataTable
          columns={["주문번호", "상태", "금액", "모의 거래번호", "승인시각"]}
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

export function AdminSettlementsPage() {
  const companies = mockApi.companies();

  return (
    <AdminShell title="인피니 정산 검산" subtitle="order_items 기준 인피니 공제율을 확인하며 우리 시스템 지급은 차단합니다.">
      <ConfirmBox
        title="우리 시스템 정산 지급 실행 금지"
        description={`인피니가 PG 수수료 ${formatPercent(INFINY_PG_FEE_RATE)}와 우리 주문 수수료 ${formatPercent(A5_PLATFORM_FEE_RATE)}를 합산해 총 ${formatPercent(INFINY_TOTAL_FEE_RATE)} 공제 후 기업사에 정산합니다. 이 화면은 검산과 조회만 제공합니다.`}
      />
      <div className="mt-4">
        <DataTable
          columns={["기간", "입점사", "상태", "총액", "인피니 2.5%", "A5 4.5%", "환불보류", "예상입금"]}
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
    <AdminShell title="감사 로그" subtitle="권한, 금액, 상태 변경은 audit log로 보존한다는 원칙을 확인합니다.">
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
    <AdminShell title="권한/계정 발급" subtitle="Firebase Auth 초대, 권한 클레임, 역할별 접근 범위를 운영자가 검토합니다.">
      <AdminInvitePanel />
      <div className="mt-4" />
      <ConfirmBox
        title="실제 계정 대량 생성 금지"
        description="이 화면은 운영 설계와 초대 흐름을 표시합니다. 대량 사용자 생성, 평문 비밀번호 저장, Secret Key 노출은 금지합니다."
        confirmLabel="SUPER_ADMIN 승인 필요"
      />
    </AdminShell>
  );
}
