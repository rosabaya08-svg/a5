import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

const nurseryId = "nursery-gangnam-01";

const nurseryNav: NavItem[] = [
  { href: "/nursery/dashboard", label: "대시보드" },
  { href: "/nursery/rooms", label: "객실" },
  { href: "/nursery/tablets", label: "태블릿" },
  { href: "/nursery/pickups", label: "현장수령" },
  { href: "/nursery/qr-history", label: "QR 이력" },
  { href: "/nursery/orders", label: "주문 이력" },
];

function NurseryShell({
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
      sectionTitle="산후조리원 Admin"
      title={title}
      subtitle={subtitle}
      scopeLabel="NURSERY_ADMIN / nursery_id scoped"
      navItems={nurseryNav}
      accent="nursery"
    >
      {children}
    </AppShell>
  );
}

export function NurseryIndexPage() {
  return <NurseryDashboardPage />;
}

export function NurseryDashboardPage() {
  return (
    <NurseryShell title="조리원 대시보드" subtitle="객실, 태블릿, QR, 현장수령 주문을 조리원 기준으로 확인합니다.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.nurseryMetrics(nurseryId).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-4">
        <ConfirmBox
          title="태블릿 전용 폐쇄몰"
          description="일반 브라우저 직접 접속 차단은 운영 인증 설계 이후 구현하며, 현재는 mock UI만 제공합니다."
          confirmLabel="설계 필요"
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomsPage() {
  return (
    <NurseryShell title="객실 관리" subtitle="객실과 태블릿 연결, 현장수령 가능 여부를 확인합니다.">
      <DataTable
        columns={["객실", "층", "현장수령", "연결 태블릿", "QR 출처"]}
        rows={mockApi
          .rooms()
          .filter((room) => room.nurseryId === nurseryId)
          .map((room) => ({
            id: room.id,
            cells: [
              <span key="name" className="font-semibold text-slate-950">{room.name}</span>,
              room.floor,
              room.pickupEnabled ? "가능" : "불가",
              room.activeTabletId ?? "미연결",
              `${room.nurseryId} / ${room.id}`,
            ],
          }))}
      />
    </NurseryShell>
  );
}

export function NurseryTabletsPage() {
  return (
    <NurseryShell title="태블릿 관리" subtitle="객실 태블릿 활성 상태와 마지막 접속 시각을 확인합니다.">
      <DataTable
        columns={["태블릿", "객실", "상태", "마지막 접속", "접근 범위"]}
        rows={mockApi
          .tablets()
          .filter((tablet) => tablet.nurseryId === nurseryId)
          .map((tablet) => ({
            id: tablet.id,
            cells: [
              <span key="label" className="font-semibold text-slate-950">{tablet.label}</span>,
              tablet.roomId,
              tablet.status,
              formatDateTime(tablet.lastSeenAt),
              "폐쇄몰 mock",
            ],
          }))}
      />
    </NurseryShell>
  );
}

export function NurseryPickupsPage() {
  const pickupOrders = mockApi
    .orders()
    .filter((order) => order.nurseryId === nurseryId && order.deliveryMethod === "pickup");

  return (
    <NurseryShell title="현장수령" subtitle="조리원에서 확인해야 하는 현장수령 주문을 표시합니다.">
      <DataTable
        columns={["주문번호", "객실", "고객", "상태", "금액"]}
        rows={pickupOrders.map((order) => ({
          id: order.id,
          cells: [
            order.orderNo,
            order.roomId,
            order.customerName,
            <StatusBadge key="status" status={order.status} />,
            formatCurrency(order.totalAmount),
          ],
        }))}
      />
    </NurseryShell>
  );
}

export function NurseryQrHistoryPage() {
  return (
    <NurseryShell title="QR 이력" subtitle="객실/태블릿별 QR 세션 생성, 만료, 결제 상태를 확인합니다.">
      <FilterBar title="QR 필터" filters={["활성", "결제완료", "만료", "조르기"]} />
      <DataTable
        columns={["코드", "타입", "상태", "객실", "태블릿", "만료", "금액"]}
        rows={mockApi
          .qrSessions()
          .filter((session) => session.nurseryId === nurseryId)
          .map((session) => ({
            id: session.id,
            cells: [
              session.shortCode,
              session.type === "ask" ? "조르기" : "구매",
              <StatusBadge key="status" status={session.status} />,
              session.roomId,
              session.tabletId,
              formatDateTime(session.expiresAt),
              formatCurrency(session.totalAmount),
            ],
          }))}
      />
    </NurseryShell>
  );
}

export function NurseryOrdersPage() {
  return (
    <NurseryShell title="조리원 주문 이력" subtitle="조리원 출처로 생성된 주문만 확인합니다.">
      <DataTable
        columns={["주문번호", "객실", "고객", "상태", "수령", "금액"]}
        rows={mockApi
          .orders()
          .filter((order) => order.nurseryId === nurseryId)
          .map((order) => ({
            id: order.id,
            cells: [
              order.orderNo,
              order.roomId,
              order.customerName,
              <StatusBadge key="status" status={order.status} />,
              order.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
              formatCurrency(order.totalAmount),
            ],
          }))}
      />
    </NurseryShell>
  );
}
