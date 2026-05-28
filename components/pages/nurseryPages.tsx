import { AppShell } from "@/components/layout/AppShell";
import { A4RoomImportPanel } from "@/components/nursery/A4RoomImportPanel";
import { NurseryConsentSummary } from "@/components/nursery/NurseryConsentSummary";
import { nurseryNavItems } from "@/components/layout/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listA4RoomsReadOnly } from "@/lib/integrations/a4/readOnlyRooms";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

const nurseryId = "nursery-test-1004";
const nurseryBusinessRegistrationNo = "1004-1004-1004";

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
      sectionTitle="조리원 관리자"
      title={title}
      subtitle={subtitle}
      scopeLabel="조리원 운영 콘솔"
      navItems={nurseryNavItems}
      accent="nursery"
    >
      {children}
    </AppShell>
  );
}

function rooms() {
  return mockApi.rooms().filter((room) => room.nurseryId === nurseryId);
}

function tablets() {
  return mockApi.tablets().filter((tablet) => tablet.nurseryId === nurseryId);
}

function orders() {
  return mockApi.orders().filter((order) => order.nurseryId === nurseryId);
}

function NurseryIdentityPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-700">nursery scope</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">조리원 계정 정보</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            signage-partner에 등록된 사업자번호 기준으로 객실과 태블릿을 연결합니다.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {[
          ["사업자등록번호", nurseryBusinessRegistrationNo],
          ["조리원 ID", nurseryId],
          ["객실", `${rooms().length}개`],
          ["연결 태블릿", `${tablets().length}대`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <NurseryConsentSummary />
      </div>
    </section>
  );
}

export function NurseryIndexPage() {
  return <NurseryDashboardPage />;
}

export function NurseryDashboardPage() {
  return (
    <NurseryShell title="조리원 대시보드" subtitle="객실, 태블릿, QR, 현장수령 주문을 확인합니다.">
      <NurseryIdentityPanel />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockApi.nurseryMetrics(nurseryId).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-4">
        <FilterBar title="객실 현황" filters={["전체", "태블릿 연결", "현장수령 가능"]} resultCount={rooms().length} />
        <DataTable
          columns={["객실", "층", "현장수령", "연결 태블릿"]}
          rows={rooms().map((room) => ({
            id: room.id,
            cells: [room.name, room.floor, room.pickupEnabled ? "가능" : "불가", room.activeTabletId ?? "미연결"],
          }))}
          emptyMessage="등록된 객실이 없습니다."
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomsPage() {
  const nurseryRooms = rooms();
  const a4Rooms = listA4RoomsReadOnly(nurseryId);

  return (
    <NurseryShell title="객실 관리/자동 연동" subtitle="signage-partner 사업자번호 기준으로 등록된 객실을 불러오고 태블릿 연결 상태를 확인합니다.">
      <A4RoomImportPanel
        nurseryId={nurseryId}
        businessRegistrationNo={nurseryBusinessRegistrationNo}
        existingRooms={nurseryRooms}
        a4Rooms={a4Rooms}
      />
      <div className="mt-4" />
      <DataTable
        columns={["객실", "층", "현장수령", "연결 태블릿", "QR 출처"]}
        rows={nurseryRooms.map((room) => ({
          id: room.id,
          cells: [room.name, room.floor, room.pickupEnabled ? "가능" : "불가", room.activeTabletId ?? "미연결", `${nurseryId} / ${room.id}`],
        }))}
        emptyMessage="등록된 객실이 없습니다."
      />
    </NurseryShell>
  );
}

export function NurseryTabletsPage() {
  return (
    <NurseryShell title="태블릿 관리" subtitle="객실별 단말 연결 상태를 확인합니다.">
      <DataTable
        columns={["태블릿", "객실", "상태", "마지막 접속", "접근 범위"]}
        rows={tablets().map((tablet) => ({
          id: tablet.id,
          cells: [tablet.label, tablet.roomId, tablet.status, formatDateTime(tablet.lastSeenAt), "객실 고정"],
        }))}
        emptyMessage="등록된 태블릿이 없습니다."
      />
    </NurseryShell>
  );
}

export function NurseryPickupsPage() {
  const pickupOrders = orders().filter((order) => order.deliveryMethod === "pickup");

  return (
    <NurseryShell title="현장수령 관리" subtitle="조리원에서 확인해야 하는 현장수령 주문을 표시합니다.">
      <DataTable
        columns={["주문번호", "객실", "고객", "상태", "금액"]}
        rows={pickupOrders.map((order) => ({
          id: order.id,
          cells: [order.orderNo, order.roomId, order.customerName, <StatusBadge key="status" status={order.status} />, formatCurrency(order.totalAmount)],
        }))}
        emptyMessage="현장수령 주문이 없습니다."
      />
    </NurseryShell>
  );
}

export function NurseryQrHistoryPage() {
  const sessions = mockApi.qrSessions().filter((session) => session.nurseryId === nurseryId);

  return (
    <NurseryShell title="QR 이력" subtitle="객실과 태블릿 기준 QR 생성, 만료, 결제 상태를 확인합니다.">
      <FilterBar title="QR 필터" filters={["전체", "활성", "결제완료", "만료"]} resultCount={sessions.length} />
      <DataTable
        columns={["코드", "유형", "상태", "객실", "태블릿", "만료", "금액"]}
        rows={sessions.map((session) => ({
          id: session.id,
          cells: [
            session.shortCode,
            session.type === "ask" ? "문의" : "구매",
            <StatusBadge key="status" status={session.status} />,
            session.roomId,
            session.tabletId,
            formatDateTime(session.expiresAt),
            formatCurrency(session.totalAmount),
          ],
        }))}
        emptyMessage="QR 이력이 없습니다."
      />
    </NurseryShell>
  );
}

export function NurseryOrdersPage() {
  return (
    <NurseryShell title="주문 이력" subtitle="조리원 객실에서 발생한 주문만 확인합니다.">
      <DataTable
        columns={["주문번호", "객실", "고객", "상태", "수령", "금액"]}
        rows={orders().map((order) => ({
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
        emptyMessage="주문 이력이 없습니다."
      />
    </NurseryShell>
  );
}
