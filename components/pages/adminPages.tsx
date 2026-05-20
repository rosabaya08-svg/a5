import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { RiskAlert } from "@/components/ui/RiskAlert";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils/format";

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/companies", label: "입점사" },
  { href: "/admin/nurseries", label: "조리원" },
  { href: "/admin/rooms", label: "객실" },
  { href: "/admin/tablets", label: "태블릿" },
  { href: "/admin/products", label: "상품 승인" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/payments", label: "결제 mock" },
  { href: "/admin/settlements", label: "정산 검산" },
  { href: "/admin/audit-logs", label: "감사 로그" },
];

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
      scopeLabel="SUPER_ADMIN / mock"
      navItems={adminNav}
      accent="admin"
    >
      {children}
    </AppShell>
  );
}

export function AdminIndexPage() {
  return (
    <AdminShell
      title="운영 콘솔"
      subtitle="산후조리원 폐쇄몰 베타의 mock 운영 지표와 차단 항목을 확인합니다."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.adminMetrics().map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <RiskAlert risks={mockApi.risks()} />
        <ConfirmBox
          title="운영 전환 차단"
          description="이 콘솔은 Firebase, PG, 알림톡, 배송조회, 외부 재고 API에 연결하지 않는 개발용 mock/test 화면입니다."
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section>
          <FilterBar title="최근 주문" filters={["오늘", "mock 결제", "QR 출처 포함"]} />
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
    <AdminShell title="입점사 관리" subtitle="기업 승인, 수수료율, 정산 차단 상태를 확인합니다.">
      <FilterBar title="입점사 필터" filters={["전체", "승인", "대기", "정산 보류"]} />
      <DataTable
        columns={["기업", "담당자", "상태", "수수료", "상품", "승인대기", "정산"]}
        rows={mockApi.companies().map((company) => ({
          id: company.id,
          cells: [
            <span key="name" className="font-semibold text-slate-950">{company.name}</span>,
            company.managerName,
            company.status,
            formatPercent(company.commissionRate),
            company.productCount,
            company.pendingProductCount,
            company.settlementBlocked ? "보류" : "정상",
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
    <AdminShell title="결제 mock" subtitle="실제 PG가 아닌 mock 결제 상태와 TID 형식만 확인합니다.">
      <ConfirmBox
        title="실제 PG 연동 금지"
        description="운영 MID/KEY, 테스트 MID, 공식 문서, 사람 승인 전까지 실제 결제 모듈은 만들지 않습니다."
      />
      <div className="mt-4">
        <DataTable
          columns={["주문번호", "상태", "금액", "mock TID", "승인시각"]}
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

export function AdminSettlementsPage() {
  const companies = mockApi.companies();

  return (
    <AdminShell title="정산 검산" subtitle="order_items 기준 mock 정산을 확인하며 실제 지급은 차단합니다.">
      <ConfirmBox
        title="정산 지급 실행 금지"
        description="이 화면은 정산 계산 초안과 검산 상태만 표시합니다. 지급 완료 처리는 사람 승인 전까지 만들지 않습니다."
      />
      <div className="mt-4">
        <DataTable
          columns={["기간", "입점사", "상태", "총액", "수수료", "환불보류", "예상입금"]}
          rows={mockApi.settlements().map((settlement) => ({
            id: settlement.id,
            cells: [
              settlement.period,
              companies.find((company) => company.id === settlement.companyId)?.name ?? settlement.companyId,
              <StatusBadge key="status" status={settlement.status} />,
              formatCurrency(settlement.grossAmount),
              formatCurrency(settlement.commissionAmount),
              formatCurrency(settlement.refundHoldAmount),
              formatCurrency(settlement.payoutAmount),
            ],
          }))}
        />
      </div>
    </AdminShell>
  );
}

export function AdminAuditLogsPage() {
  return (
    <AdminShell title="감사 로그" subtitle="권한, 금액, 상태 변경은 audit log로 보존한다는 원칙을 확인합니다.">
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
