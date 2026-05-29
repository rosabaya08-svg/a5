"use client";

import { AppShell } from "@/components/layout/AppShell";
import { A4RoomImportPanel } from "@/components/nursery/A4RoomImportPanel";
import { NurseryConsentSummary } from "@/components/nursery/NurseryConsentSummary";
import { nurseryNavItems } from "@/components/layout/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listA4RoomsReadOnly } from "@/lib/integrations/a4/readOnlyRooms";
import {
  getLiveNurseryOrders,
  getLiveNurseryQrSessions,
  getLiveNurseryRooms,
  getLiveNurseryTablets,
} from "@/lib/repositories/liveCommerceRepository";
import { readPortalSession } from "@/lib/auth/session";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { useEffect, useMemo, useState } from "react";
import type { DashboardMetric, Order, QrPaymentSession, Room, Tablet } from "@/types/commerce";

const fallbackNurseryScope = {
  nurseryId: "nursery-test-1004",
  businessRegistrationNo: "1004-1004-1004",
  displayName: "테스트 산후조리원",
};

type NurseryRuntimeScope = typeof fallbackNurseryScope;

type NurseryRuntimeData = {
  rooms: Room[];
  tablets: Tablet[];
  orders: Order[];
  qrSessions: QrPaymentSession[];
  source: string;
};

function fallbackData(nurseryId: string): NurseryRuntimeData {
  return {
    rooms: mockApi.rooms().filter((room) => room.nurseryId === nurseryId),
    tablets: mockApi.tablets().filter((tablet) => tablet.nurseryId === nurseryId),
    orders: mockApi.orders().filter((order) => order.nurseryId === nurseryId),
    qrSessions: mockApi.qrSessions().filter((session) => session.nurseryId === nurseryId),
    source: "mock fallback",
  };
}

function useNurseryRuntimeScope() {
  const [scope, setScope] = useState<NurseryRuntimeScope>(fallbackNurseryScope);

  useEffect(() => {
    const session = readPortalSession("nursery");
    if (!session?.nurseryId) return;

    setScope({
      nurseryId: session.nurseryId,
      businessRegistrationNo: session.businessNo ?? fallbackNurseryScope.businessRegistrationNo,
      displayName: session.displayName || fallbackNurseryScope.displayName,
    });
  }, []);

  return scope;
}

function useNurseryRuntimeData(nurseryId: string) {
  const [data, setData] = useState<NurseryRuntimeData>(() => fallbackData(nurseryId));

  useEffect(() => {
    let cancelled = false;
    setData(fallbackData(nurseryId));

    async function load() {
      const [rooms, tablets, orders, qrSessions] = await Promise.all([
        getLiveNurseryRooms(nurseryId),
        getLiveNurseryTablets(nurseryId),
        getLiveNurseryOrders(nurseryId),
        getLiveNurseryQrSessions(nurseryId),
      ]);

      if (cancelled) return;

      setData({
        rooms: rooms.data,
        tablets: tablets.data,
        orders: orders.data,
        qrSessions: qrSessions.data,
        source: [rooms.source, tablets.source, orders.source, qrSessions.source].includes("Firestore") ? "Firestore" : "mock fallback",
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [nurseryId]);

  return data;
}

function useNurseryPageState() {
  const scope = useNurseryRuntimeScope();
  const data = useNurseryRuntimeData(scope.nurseryId);
  return { scope, data };
}

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

function nurseryMetrics(data: NurseryRuntimeData): DashboardMetric[] {
  const pickupOrders = data.orders.filter((order) => order.deliveryMethod === "pickup");
  return [
    { label: "객실", value: `${data.rooms.length}개`, helper: `${data.source} 기준 객실`, tone: "blue" },
    { label: "연결 태블릿", value: `${data.tablets.length}대`, helper: "rooms/tablets nursery_id 매칭", tone: "green" },
    { label: "QR 세션", value: `${data.qrSessions.length}건`, helper: "해당 조리원 QR 이력", tone: "purple" },
    { label: "현장수령", value: `${pickupOrders.length}건`, helper: "주문 중 현장수령 건수", tone: "amber" },
  ];
}

function NurseryIdentityPanel({ scope, data }: { scope: NurseryRuntimeScope; data: NurseryRuntimeData }) {
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
          ["사업자등록번호", scope.businessRegistrationNo],
          ["조리원 ID", scope.nurseryId],
          ["조리원명", scope.displayName],
          ["데이터 출처", data.source],
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
  const { scope, data } = useNurseryPageState();

  return (
    <NurseryShell title="조리원 대시보드" subtitle="객실, 태블릿, QR, 현장수령 주문을 확인합니다.">
      <NurseryIdentityPanel scope={scope} data={data} />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {nurseryMetrics(data).map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-4">
        <FilterBar title="객실 현황" filters={["전체", "태블릿 연결", "현장수령 가능"]} resultCount={data.rooms.length} />
        <DataTable
          columns={["객실", "현장수령", "연결 태블릿"]}
          rows={data.rooms.map((room) => ({
            id: room.id,
            cells: [room.name, room.pickupEnabled ? "가능" : "불가", room.activeTabletId ?? "미연결"],
          }))}
          emptyMessage="등록된 객실이 없습니다."
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomsPage() {
  const { scope, data } = useNurseryPageState();
  const a4Rooms = useMemo(() => listA4RoomsReadOnly(scope.nurseryId), [scope.nurseryId]);

  return (
    <NurseryShell title="객실 관리/자동 연동" subtitle="signage-partner 사업자번호 기준으로 등록된 객실을 불러오고 태블릿 연결 상태를 확인합니다.">
      <A4RoomImportPanel
        nurseryId={scope.nurseryId}
        businessRegistrationNo={scope.businessRegistrationNo}
        existingRooms={data.rooms}
        a4Rooms={a4Rooms}
      />
      <div className="mt-4" />
      <DataTable
        columns={["객실", "현장수령", "연결 태블릿", "QR 출처"]}
        rows={data.rooms.map((room) => ({
          id: room.id,
          cells: [room.name, room.pickupEnabled ? "가능" : "불가", room.activeTabletId ?? "미연결", `${scope.nurseryId} / ${room.id}`],
        }))}
        emptyMessage="등록된 객실이 없습니다."
      />
    </NurseryShell>
  );
}

export function NurseryTabletsPage() {
  const { data } = useNurseryPageState();

  return (
    <NurseryShell title="태블릿 관리" subtitle="객실별 단말 연결 상태를 확인합니다.">
      <DataTable
        columns={["태블릿", "객실", "상태", "마지막 접속", "접근 범위"]}
        rows={data.tablets.map((tablet) => ({
          id: tablet.id,
          cells: [tablet.label, tablet.roomId, tablet.status, formatDateTime(tablet.lastSeenAt), "객실 고정"],
        }))}
        emptyMessage="등록된 태블릿이 없습니다."
      />
    </NurseryShell>
  );
}

export function NurseryPickupsPage() {
  const { data } = useNurseryPageState();
  const pickupOrders = data.orders.filter((order) => order.deliveryMethod === "pickup");

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
  const { data } = useNurseryPageState();
  const sessions = data.qrSessions;

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
  const { data } = useNurseryPageState();

  return (
    <NurseryShell title="주문 이력" subtitle="조리원 객실에서 발생한 주문만 확인합니다.">
      <DataTable
        columns={["주문번호", "객실", "고객", "상태", "수령", "금액"]}
        rows={data.orders.map((order) => ({
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
