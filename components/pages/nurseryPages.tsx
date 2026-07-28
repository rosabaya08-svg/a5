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
  getLiveCompanyById,
  getLiveNurseryOrders,
  getLiveNurseryQrSessionsByScope,
  getLiveNurseryRooms,
  getLiveNurseryTablets,
  getLiveOrderItemsByOrderNos,
} from "@/lib/repositories/liveCommerceRepository";
import { readPortalSession } from "@/lib/auth/session";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { useEffect, useMemo, useState } from "react";
import type { DashboardMetric, Order, OrderItem, QrPaymentSession, Room, Tablet } from "@/types/commerce";

const missingNurseryScope = {
  nurseryId: "__missing_nursery_scope__",
  businessRegistrationNo: "",
  displayName: "",
};

type NurseryRuntimeScope = typeof missingNurseryScope;

type NurseryRuntimeData = {
  rooms: Room[];
  tablets: Tablet[];
  orders: Order[];
  orderItemsByOrderNo: Record<string, OrderItem[]>;
  companyNamesById: Record<string, string>;
  qrSessions: QrPaymentSession[];
  source: string;
};

function initialNurseryRuntimeData(): NurseryRuntimeData {
  return {
    rooms: [],
    tablets: [],
    orders: [],
    orderItemsByOrderNo: {},
    companyNamesById: {},
    qrSessions: [],
    source: "loading",
  };
}

function readNurseryRuntimeScope(): NurseryRuntimeScope {
  const session = readPortalSession("nursery");
  if (!session?.nurseryId) return missingNurseryScope;

  return {
    nurseryId: session.nurseryId,
    businessRegistrationNo: session.businessNo ?? missingNurseryScope.businessRegistrationNo,
    displayName: session.displayName || missingNurseryScope.displayName,
  };
}

function useNurseryRuntimeScope() {
  return useMemo(() => readNurseryRuntimeScope(), []);
}

function tabletsFromLinkedRooms(rooms: Room[], nurseryId: string): Tablet[] {
  const now = new Date().toISOString();

  return rooms
    .filter((room) => Boolean(room.activeTabletId))
    .map((room) => ({
      id: room.activeTabletId as string,
      nurseryId,
      roomId: room.id,
      label: `${room.name || room.id} 태블릿`,
      status: "active" as const,
      lastSeenAt: now,
    }));
}

function mergeNurseryTablets(liveTablets: Tablet[], rooms: Room[], nurseryId: string) {
  const byId = new Map<string, Tablet>();

  for (const tablet of liveTablets) {
    byId.set(tablet.id, tablet);
  }

  for (const tablet of tabletsFromLinkedRooms(rooms, nurseryId)) {
    if (!byId.has(tablet.id)) {
      byId.set(tablet.id, tablet);
      continue;
    }

    const current = byId.get(tablet.id) as Tablet;
    byId.set(tablet.id, {
      ...tablet,
      ...current,
      roomId: current.roomId || tablet.roomId,
      label: current.label || tablet.label,
    });
  }

  return [...byId.values()];
}

function roomDisplayName(rooms: Room[], roomId: string) {
  const room = rooms.find((candidate) => candidate.id === roomId);
  if (!room) return `${roomId} (미등록 객실)`;
  return room.name || room.id;
}

function roomRegisteredLabel(rooms: Room[], roomId: string) {
  const room = rooms.find((candidate) => candidate.id === roomId);
  return room ? "등록 객실" : "미등록/복구 필요";
}

function cartItemSummary(items: QrPaymentSession["items"] | OrderItem[]) {
  if (!items.length) return "상품 없음";
  const [first] = items;
  const name = "productName" in first ? first.productName : "상품";
  const quantity = "quantity" in first ? first.quantity : 1;
  return items.length > 1 ? `${name} ${quantity}개 외 ${items.length - 1}건` : `${name} ${quantity}개`;
}

function orderCompanySummary(items: OrderItem[], companyNamesById: Record<string, string>) {
  const companyIds = [...new Set(items.map((item) => item.companyId).filter(Boolean))];
  if (!companyIds.length) return "업체 미연결";
  return companyIds.map((companyId) => companyNamesById[companyId] || companyId).join(", ");
}

function orderLinkedToSession(orders: Order[], sessionId: string) {
  return orders.find((order) => order.qrSessionId === sessionId);
}

function useNurseryRuntimeData(nurseryId: string) {
  const [data, setData] = useState<NurseryRuntimeData>(() => initialNurseryRuntimeData());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [rooms, tablets, orders] = await Promise.all([
        getLiveNurseryRooms(nurseryId),
        getLiveNurseryTablets(nurseryId),
        getLiveNurseryOrders(nurseryId),
      ]);

      if (cancelled) return;

      const mergedTablets = mergeNurseryTablets(tablets.data, rooms.data, nurseryId);
      const qrSessions = await getLiveNurseryQrSessionsByScope({
        nurseryId,
        roomIds: rooms.data.map((room) => room.id),
        tabletIds: mergedTablets.map((tablet) => tablet.id),
      });
      const orderItemsRead = await getLiveOrderItemsByOrderNos(orders.data.map((order) => order.orderNo));
      const sources = [rooms.source, tablets.source, orders.source, qrSessions.source, orderItemsRead.source];
      const orderItemsByOrderNo: Record<string, OrderItem[]> = {};
      const companyIds = new Set<string>();

      for (const item of orderItemsRead.data) {
        const order = orders.data.find((candidate) => candidate.id === item.orderId || candidate.itemIds.includes(item.id));
        const orderNo = order?.orderNo;
        if (!orderNo) continue;
        orderItemsByOrderNo[orderNo] = [...(orderItemsByOrderNo[orderNo] ?? []), item];
        if (item.companyId) companyIds.add(item.companyId);
      }

      const companyReads = await Promise.all([...companyIds].map((companyId) => getLiveCompanyById(companyId)));
      const companyNamesById: Record<string, string> = {};

      companyReads.forEach((read) => {
        if (read.data) companyNamesById[read.data.id] = read.data.name;
      });

      setData({
        rooms: rooms.data,
        tablets: mergedTablets,
        orders: orders.data,
        orderItemsByOrderNo,
        companyNamesById,
        qrSessions: qrSessions.data,
        source:
          sources.includes("Firestore") && sources.includes("mock fallback")
            ? "Firestore + fallback"
            : sources.includes("Firestore")
              ? "Firestore"
              : "mock fallback",
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
    { label: "객실", value: `${data.rooms.length}개`, helper: "등록된 객실", tone: "blue" },
    { label: "연결 태블릿", value: `${data.tablets.length}대`, helper: "객실에 연결된 태블릿", tone: "green" },
    { label: "QR 세션", value: `${data.qrSessions.length}건`, helper: "발급된 QR 주문", tone: "purple" },
    { label: "현장수령", value: `${pickupOrders.length}건`, helper: "현장수령 주문", tone: "amber" },
  ];
}

function NurseryIdentityPanel({ scope }: { scope: NurseryRuntimeScope }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-normal tracking-[0.14em] text-rose-700">조리원 범위</p>
          <h2 className="mt-1 text-lg font-normal text-slate-950">조리원 계정 정보</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            등록된 사업자번호 기준으로 객실과 태블릿을 연결합니다.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {[
          ["사업자등록번호", scope.businessRegistrationNo],
          ["조리원 ID", scope.nurseryId],
          ["조리원명", scope.displayName],

        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-normal text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-normal text-slate-900">{value}</p>
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
      <NurseryIdentityPanel scope={scope} />
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

function LegacyNurseryQrHistoryPage() {
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

function LegacyNurseryOrdersPage() {
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

void LegacyNurseryQrHistoryPage;
void LegacyNurseryOrdersPage;

export function NurseryQrHistoryPage() {
  const { data } = useNurseryPageState();
  const sessions = data.qrSessions;

  return (
    <NurseryShell title="QR 주문 생성 이력" subtitle="등록 객실 기준으로 QR 생성, 만료, 결제 주문 연결 상태를 확인합니다.">
      <FilterBar title="QR 주문 생성 필터" filters={["전체", "활성", "결제완료", "만료"]} resultCount={sessions.length} />
      <DataTable
        columns={["생성 시간", "객실", "객실 상태", "QR 코드", "상태", "상품/수량", "금액", "주문 연결", "만료"]}
        rows={sessions.map((session) => {
          const linkedOrder = orderLinkedToSession(data.orders, session.id);

          return {
            id: session.id,
            cells: [
              formatDateTime(session.createdAt),
              roomDisplayName(data.rooms, session.roomId),
              roomRegisteredLabel(data.rooms, session.roomId),
              session.shortCode,
              <StatusBadge key="status" status={session.status} />,
              cartItemSummary(session.items),
              formatCurrency(session.totalAmount),
              linkedOrder ? linkedOrder.orderNo : "주문 미생성",
              formatDateTime(session.expiresAt),
            ],
          };
        })}
        emptyMessage="QR 주문 생성 이력이 없습니다."
      />
    </NurseryShell>
  );
}

export function NurseryOrdersPage() {
  const { data } = useNurseryPageState();

  return (
    <NurseryShell title="주문 이력" subtitle="QR 생성 객실과 연결된 결제 주문, 상품, 업체, 금액을 확인합니다.">
      <DataTable
        columns={["결제 시간", "객실", "주문번호", "주문 회사", "상품 조회", "수령", "상태", "결제 금액"]}
        rows={data.orders.map((order) => {
          const items = data.orderItemsByOrderNo[order.orderNo] ?? [];

          return {
            id: order.id,
            cells: [
              formatDateTime(order.paidAt || order.createdAt),
              roomDisplayName(data.rooms, order.roomId),
              order.orderNo,
              orderCompanySummary(items, data.companyNamesById),
              cartItemSummary(items),
              order.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
              <StatusBadge key="status" status={order.status} />,
              formatCurrency(order.totalAmount),
            ],
          };
        })}
        emptyMessage="주문 이력이 없습니다."
      />
    </NurseryShell>
  );
}
