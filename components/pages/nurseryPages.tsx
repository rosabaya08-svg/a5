import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import {
  NurseryChip,
  NurseryDetailLink,
  NurseryDetailMock,
  NurseryMockActionList,
  NurseryMockControlPanel,
  NurseryOperationNotes,
  NurseryPaginationPanel,
  NurseryPanel,
  NurseryRiskBadge,
  NurseryRiskList,
  NurserySearchSortPanel,
  NurseryScopeGrid,
  NurseryStateScenarioGrid,
  NurseryTabMock,
  NurseryUnifiedSearchPanel,
} from "@/components/nursery/NurseryAdminWidgets";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  activeNurseryId,
  nurseryBulkRoomPreview,
  nurseryDashboardSummary,
  nurseryDeliveryEvents,
  nurseryDetailRecords,
  nurseryGeneratedDeliveryEvents,
  nurseryGeneratedOrders,
  nurseryGeneratedPickupEvents,
  nurseryGeneratedQrSessions,
  nurseryGeneratedRooms,
  nurseryGeneratedTablets,
  nurseryMockControls,
  nurseryOperationNotes,
  nurseryOrderHistoryRows,
  nurseryOrderItemSnapshots,
  nurseryPaginationSnapshots,
  nurseryPickupAuditLogs,
  nurseryPickupEvents,
  nurseryQrReviewRows,
  nurseryRiskStatuses,
  nurseryRoomOrderStats,
  nurserySearchPresets,
  nurseryRoomWorkflows,
  nurseryScopeFilters,
  nurseryStateScenarios,
  nurseryTabletAccessRows,
  nurseryTabletQrStats,
  nurseryTabletWorkflows,
  nurseryUnifiedSearchResults,
} from "@/data/nursery/mockNurseryAdmin";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

const nurseryId = activeNurseryId;

const nurseryNav: NavItem[] = [
  { href: "/nursery/dashboard", label: "대시보드" },
  { href: "/nursery/rooms", label: "객실" },
  { href: "/nursery/rooms/bulk", label: "객실 대량" },
  { href: "/nursery/rooms/bulk-create", label: "대량 생성" },
  { href: "/nursery/rooms/status", label: "객실 상태" },
  { href: "/nursery/tablets", label: "태블릿" },
  { href: "/nursery/tablets/assignment", label: "태블릿 배정" },
  { href: "/nursery/tablets/access", label: "접근상태" },
  { href: "/nursery/pickups", label: "현장수령" },
  { href: "/nursery/qr-history", label: "QR 이력" },
  { href: "/nursery/orders", label: "주문 이력" },
  { href: "/nursery/stats/rooms", label: "객실 통계" },
  { href: "/nursery/stats/tablets", label: "QR 통계" },
  { href: "/nursery/search", label: "통합 검색" },
  { href: "/nursery/states", label: "상태 UI" },
  { href: "/nursery/mock-data", label: "대량 데이터" },
  { href: "/nursery/operations", label: "운영 체크" },
  { href: "/nursery/risk-center", label: "위험 센터" },
  { href: "/nursery/status", label: "진행 상태" },
];

function NurseryShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
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
      <div className="mb-4">
        <NurseryPanel title="Mock Context" eyebrow="nursery scope">
          <NurseryScopeGrid filters={nurseryScopeFilters} />
        </NurseryPanel>
      </div>
      {children}
    </AppShell>
  );
}

export function NurseryIndexPage() {
  return <NurseryDashboardPage />;
}

export function NurseryDashboardPage() {
  const activeNursery = mockApi.nurseries().find((nursery) => nursery.id === nurseryId);
  const recentOrders = nurseryOrderHistoryRows.slice(0, 3);

  return (
    <NurseryShell
      title="조리원 대시보드"
      subtitle="객실, 태블릿, 활성 QR, 현장수령 대기와 주문 이력을 nursery_id 기준으로 확인합니다."
    >
      {!activeNursery ? (
        <EmptyState
          title="선택된 조리원이 없습니다"
          description="mock 데이터의 nursery_id와 관리자 scope가 맞지 않습니다."
        />
      ) : null}
      <FilterBar
        title="기간/상태 필터"
        filters={["오늘", "최근 7일", "이번 달", "active", "expired", "payment_failed", "pickup_ready", "risk"]}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {nurseryDashboardSummary.map((metric) => (
          <StatCard key={metric.id} metric={metric} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <NurseryPanel title="조리원 scope" eyebrow="filter mock">
          <NurseryScopeGrid filters={nurseryScopeFilters} />
        </NurseryPanel>
        <NurseryPanel title="운영 메모" eyebrow={activeNursery?.region ?? "mock"}>
          <NurseryOperationNotes notes={nurseryOperationNotes} />
        </NurseryPanel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <NurseryPanel title="위험 상태" eyebrow="risk badges">
          <NurseryRiskList risks={nurseryRiskStatuses.slice(0, 3)} />
        </NurseryPanel>
        <NurseryPanel title="빈/오류 상태" eyebrow="state mock">
          <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
        </NurseryPanel>
      </div>
      <div className="mt-4">
        <NurserySearchSortPanel presets={nurserySearchPresets} />
      </div>
      <div className="mt-4">
        <NurseryPaginationPanel snapshots={nurseryPaginationSnapshots} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryPanel title="최근 주문 이력" eyebrow="nursery_id">
          <DataTable
            columns={["주문번호", "객실", "고객", "상태", "금액"]}
            rows={recentOrders.map((order) => ({
              id: order.id,
              cells: [
                order.orderNo,
                order.roomId,
                order.customerName,
                <StatusBadge key="status" status={order.status} />,
                formatCurrency(order.amount),
              ],
            }))}
          />
        </NurseryPanel>
        <NurseryPanel title="현장수령 대기" eyebrow="pickup_events">
          <DataTable
            columns={["주문번호", "객실", "상품", "처리"]}
            rows={nurseryPickupEvents.slice(0, 2).map((event) => ({
              id: event.id,
              cells: [
                event.orderNo,
                event.roomId,
                event.productSummary,
                <NurseryChip
                  key="status"
                  label={event.status === "ready" ? "대기" : event.status === "completed" ? "완료" : "확인"}
                  tone={event.status === "ready" ? "blue" : event.status === "completed" ? "green" : "amber"}
                />,
              ],
            }))}
          />
        </NurseryPanel>
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
  const roomControl = nurseryMockControls.find((control) => control.id === "control-room-create");

  return (
    <NurseryShell title="객실 관리" subtitle="객실 추가, 수정, 비활성 mock 흐름과 태블릿 연결 상태를 확인합니다.">
      <FilterBar title="객실 필터" filters={["전체", "활성", "수정 중", "중복 검토", "현장수령 가능"]} />
      <DataTable
        columns={["room_id", "room_number", "상태", "연결 태블릿", "활성 QR", "최근 주문", "중복 방지", "상세"]}
        rows={nurseryRoomWorkflows.map((room) => ({
            id: room.id,
            cells: [
              room.roomId,
              <span key="name" className="font-semibold text-slate-950">
                {room.roomNumber}호
              </span>,
              <NurseryChip
                key="status"
                label={
                  room.status === "active"
                    ? "활성"
                    : room.status === "inactive"
                      ? "비활성"
                      : room.status === "editing"
                        ? "수정 중"
                        : "중복 검토"
                }
                tone={
                  room.status === "active"
                    ? "green"
                    : room.status === "inactive"
                      ? "neutral"
                      : room.status === "editing"
                        ? "blue"
                        : "amber"
                }
              />,
              room.linkedTabletId ?? "미연결",
              `${room.activeQrCount}건`,
              room.recentOrderNo,
              room.duplicateGuard,
              <NurseryDetailLink key="detail" href="/nursery/rooms/detail" />,
            ],
          }))}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryMockActionList
          title="객실 처리 mock"
          actions={["객실 추가 초안", "객실명 수정", "비활성 처리", "태블릿 연결 변경"]}
        />
        <ConfirmBox
          title="room_id / room_number 중복 방지"
          description="실제 저장 전 서버 검증이 필요하므로 베타에서는 중복 검사 결과와 차단 사유만 mock으로 표시합니다."
          confirmLabel="서버 검증 필요"
        />
      </div>
      {roomControl ? (
        <div className="mt-4">
          <NurseryMockControlPanel control={roomControl} />
        </div>
      ) : null}
      <div className="mt-4">
        <NurserySearchSortPanel presets={nurserySearchPresets.filter((preset) => preset.scope === "객실")} />
      </div>
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      </div>
    </NurseryShell>
  );
}

function findDetail(kind: "room" | "tablet" | "pickup" | "qr" | "order") {
  return nurseryDetailRecords.find((record) => record.kind === kind) ?? nurseryDetailRecords[0];
}

function qrStatusLabel(status: string) {
  if (status === "active") return "active";
  if (status === "expired") return "expired";
  if (status === "used") return "used";
  if (status === "canceled") return "canceled";
  if (status === "payment_failed") return "payment_failed";
  return status;
}

function qrStatusTone(status: string): "neutral" | "blue" | "green" | "amber" | "red" | "purple" {
  if (status === "active") return "blue";
  if (status === "used") return "green";
  if (status === "expired" || status === "payment_failed") return "red";
  return "neutral";
}

function deliveryStatusLabel(status: string) {
  if (status === "label_created") return "송장 생성 mock";
  if (status === "shipping") return "배송중 mock";
  if (status === "delivered") return "배송완료 mock";
  if (status === "blocked") return "배송조회 blocker";
  return status;
}

function deliveryStatusTone(status: string): "neutral" | "blue" | "green" | "amber" | "red" | "purple" {
  if (status === "label_created") return "blue";
  if (status === "shipping") return "purple";
  if (status === "delivered") return "green";
  if (status === "blocked") return "red";
  return "neutral";
}

export function NurseryTabletsPage() {
  const tabletControl = nurseryMockControls.find((control) => control.id === "control-tablet-pair");

  return (
    <NurseryShell title="태블릿 관리" subtitle="tablet_id, room_id, 폐쇄몰 접근 상태와 마지막 접속 시각을 확인합니다.">
      <FilterBar title="태블릿 필터" filters={["전체", "활성", "비활성", "페어링 필요", "브라우저 차단"]} />
      <DataTable
        columns={["tablet_id", "room_id", "상태", "위험", "마지막 접속", "QR 생성 수", "장바구니", "접근", "상세"]}
        rows={nurseryTabletWorkflows.map((tablet) => ({
            id: tablet.id,
            cells: [
              <span key="label" className="font-semibold text-slate-950">
                {tablet.tabletId}
              </span>,
              tablet.roomId,
              <NurseryChip
                key="status"
                label={tablet.status === "active" ? "활성" : tablet.status === "inactive" ? "비활성" : "점검"}
                tone={tablet.status === "active" ? "green" : tablet.status === "inactive" ? "neutral" : "amber"}
              />,
              <NurseryRiskBadge
                key="risk"
                level={tablet.accessStatus === "blocked_browser_mock" ? "critical" : tablet.accessStatus === "needs_pairing" ? "warning" : "ok"}
              />,
              formatDateTime(tablet.lastSeenAt),
              `${tablet.qrGeneratedCount}건`,
              tablet.cartState,
              tablet.closedMallAccess,
              <NurseryDetailLink key="detail" href="/nursery/tablets/detail" />,
            ],
          }))}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryMockActionList
          title="태블릿 처리 mock"
          actions={["페어링 대기", "객실 재연결", "비활성 전환", "마지막 접속 갱신 표시"]}
        />
        <ConfirmBox
          title="일반 브라우저 접근 차단"
          description="운영 인증, App Check, 태블릿 식별 정책이 확정되기 전에는 실제 차단 로직을 연결하지 않습니다."
          confirmLabel="Firebase 계약 이후"
        />
      </div>
      {tabletControl ? (
        <div className="mt-4">
          <NurseryMockControlPanel control={tabletControl} />
        </div>
      ) : null}
      <div className="mt-4">
        <NurseryPanel title="태블릿 상태 메모" eyebrow="responsive notes">
          <div className="grid gap-3 md:grid-cols-2">
            {nurseryTabletWorkflows.map((tablet) => (
              <div key={`${tablet.id}-note`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-950">{tablet.tabletId}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{tablet.operatorNote}</p>
              </div>
            ))}
          </div>
        </NurseryPanel>
      </div>
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      </div>
    </NurseryShell>
  );
}

export function NurseryPickupsPage() {
  const pickupControl = nurseryMockControls.find((control) => control.id === "control-pickup-complete");

  return (
    <NurseryShell title="현장수령" subtitle="pickup_events 기준으로 주문자, 객실, 상품, 수령 상태를 확인합니다.">
      <FilterBar title="수령 필터" filters={["전체", "수령 대기", "수령 완료", "확인 필요"]} />
      <DataTable
        columns={["주문번호", "객실", "주문자", "상품", "상태", "요청시각", "담당", "처리"]}
        rows={nurseryPickupEvents.map((event) => ({
          id: event.id,
          cells: [
            event.orderNo,
            event.roomId,
            event.customerName,
            event.productSummary,
            <NurseryChip
              key="status"
              label={event.status === "ready" ? "수령 대기" : event.status === "completed" ? "수령 완료" : "확인 필요"}
              tone={event.status === "ready" ? "blue" : event.status === "completed" ? "green" : "amber"}
            />,
            formatDateTime(event.requestedAt),
            event.handledBy,
            <div key="actions" className="flex flex-wrap gap-2">
              <span>{event.actionLabel}</span>
              <NurseryDetailLink href="/nursery/pickups/detail" />
            </div>,
          ],
        }))}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryMockActionList
          title="수령 처리 mock"
          actions={["수령 완료 처리", "객실 확인", "상품 확인", "예외 메모 남김"]}
        />
        <ConfirmBox
          title="고객 알림 연결 차단"
          description="알림톡, 문자, 배송조회 API는 실제 연결하지 않고 수령 상태 UI와 mock 기록만 제공합니다."
          confirmLabel="외부 API 금지"
        />
      </div>
      {pickupControl ? (
        <div className="mt-4">
          <NurseryMockControlPanel control={pickupControl} />
        </div>
      ) : null}
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios.filter((scenario) => scenario.state !== "loading")} />
      </div>
    </NurseryShell>
  );
}

export function NurseryQrHistoryPage() {
  const searchControl = nurseryMockControls.find((control) => control.id === "control-qr-order-search");

  return (
    <NurseryShell title="QR 이력" subtitle="QR 세션 만료, 사용완료, 취소 상태와 출처를 검색합니다.">
      <FilterBar title="QR 필터" filters={["전체", "active", "expired", "used", "canceled", "payment_failed", "room_id", "tablet_id"]} />
      <div className="mb-4">
        <ConfirmBox
          title="QR 2~3시간 만료 안내"
          description="베타에서는 qr_payment_sessions mock 데이터의 expiresAt만 표시하며, 실제 서버 만료 job이나 결제창 이동은 연결하지 않습니다."
          confirmLabel="mock 만료"
        />
      </div>
      <DataTable
        columns={["코드", "세션", "상태", "객실", "태블릿", "만료", "금액", "출처"]}
        rows={nurseryQrReviewRows.map((session) => ({
            id: session.id,
            cells: [
              session.shortCode,
              session.qrSessionId,
              <NurseryChip
                key="status"
                label={qrStatusLabel(session.status)}
                tone={qrStatusTone(session.status)}
              />,
              session.roomId,
              session.tabletId,
              formatDateTime(session.expiresAt),
              formatCurrency(session.amount),
              <div key="source" className="flex flex-wrap items-center gap-2">
                <span>{session.source}</span>
                <NurseryDetailLink href="/nursery/qr-history/detail" />
              </div>,
            ],
          }))}
      />
      <div className="mt-4">
        <NurseryMockActionList
          title="검색 mock"
          actions={["nursery_id: nursery-gangnam-01", "room_id: room-701", "tablet_id: tablet-701-a", "short_code: SANHO701"]}
        />
      </div>
      {searchControl ? (
        <div className="mt-4">
          <NurseryMockControlPanel control={searchControl} />
        </div>
      ) : null}
      <div className="mt-4">
        <NurseryRiskList risks={nurseryRiskStatuses.filter((risk) => risk.route.includes("qr-history"))} />
      </div>
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      </div>
    </NurseryShell>
  );
}

export function NurseryOrdersPage() {
  const searchControl = nurseryMockControls.find((control) => control.id === "control-qr-order-search");

  return (
    <NurseryShell title="조리원 주문 이력" subtitle="nursery_id 기준 주문, QR 출처, 수령 방식을 함께 확인합니다.">
      <FilterBar title="주문 필터" filters={["전체", "현장수령", "택배배송", "환불 요청", "결제 대기"]} />
      <DataTable
        columns={["주문번호", "객실", "고객", "상태", "수령", "QR", "생성", "금액"]}
        rows={nurseryOrderHistoryRows.map((order) => ({
            id: order.id,
            cells: [
              order.orderNo,
              order.roomId,
              order.customerName,
              <StatusBadge key="status" status={order.status} />,
              order.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
              order.sourceQr,
              formatDateTime(order.createdAt),
              <div key="amount" className="flex flex-wrap items-center gap-2">
                <span>{formatCurrency(order.amount)}</span>
                <NurseryDetailLink href="/nursery/orders/detail" />
              </div>,
            ],
          }))}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryPanel title="pickup_events" eyebrow="현장수령">
          <DataTable
            columns={["주문번호", "room_id", "상태", "담당", "처리"]}
            rows={nurseryPickupEvents.slice(0, 4).map((event) => ({
              id: event.id,
              cells: [
                event.orderNo,
                event.roomId,
                <NurseryChip
                  key="status"
                  label={event.status === "ready" ? "수령 대기" : event.status === "completed" ? "수령 완료" : "예외"}
                  tone={event.status === "ready" ? "blue" : event.status === "completed" ? "green" : "amber"}
                />,
                event.handledBy,
                event.actionLabel,
              ],
            }))}
          />
        </NurseryPanel>
        <NurseryPanel title="delivery_events" eyebrow="택배배송">
          <DataTable
            columns={["주문번호", "room_id", "배송상태", "송장", "차단"]}
            rows={nurseryDeliveryEvents.map((event) => ({
              id: event.id,
              cells: [
                event.orderNo,
                event.roomId,
                <NurseryChip key="status" label={deliveryStatusLabel(event.status)} tone={deliveryStatusTone(event.status)} />,
                event.trackingNoMasked,
                event.blockerNote,
              ],
            }))}
          />
        </NurseryPanel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryMockActionList
          title="주문 검색 mock"
          actions={["order_no", "room_id", "customer masked", "short_code", "pickup status"]}
        />
        <ConfirmBox
          title="고객정보 저장 금지"
          description="조리원 화면은 마스킹된 주문자 정보와 QR 출처만 표시하며 실제 고객정보 저장 로직은 연결하지 않습니다."
          confirmLabel="Privacy gate"
        />
      </div>
      {searchControl ? (
        <div className="mt-4">
          <NurseryMockControlPanel control={searchControl} />
        </div>
      ) : null}
      <div className="mt-4">
        <NurserySearchSortPanel presets={nurserySearchPresets.filter((preset) => preset.scope === "주문 이력")} />
      </div>
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomDetailPage() {
  const room = findDetail("room");
  const roomQrRows = nurseryQrReviewRows.filter((session) => session.roomId === "room-701");
  const roomOrderRows = nurseryOrderHistoryRows.filter((order) => order.roomId === "room-701");
  const roomPickupRows = nurseryPickupEvents.filter((event) => event.roomId === "room-701");

  return (
    <NurseryShell title="객실 상세 mock" subtitle="객실 단위 상태, 태블릿 연결, 차단된 실제 동작을 확인합니다.">
      <NurseryDetailMock record={room} />
      <div className="mt-4">
        <NurseryTabMock
          tabs={[
            {
              id: "room-info",
              label: "객실 정보",
              children: <NurseryScopeGrid filters={nurseryScopeFilters} />,
            },
            {
              id: "tablet-info",
              label: "태블릿 정보",
              children: (
                <DataTable
                  columns={["tablet_id", "room_id", "상태", "마지막 접속"]}
                  rows={nurseryTabletWorkflows
                    .filter((tablet) => tablet.roomId === "room-701")
                    .map((tablet) => ({
                      id: tablet.id,
                      cells: [tablet.tabletId, tablet.roomId, tablet.status, formatDateTime(tablet.lastSeenAt)],
                    }))}
                />
              ),
            },
            {
              id: "qr-history",
              label: "QR 이력",
              children: (
                <DataTable
                  columns={["short_code", "상태", "만료", "금액"]}
                  rows={roomQrRows.map((session) => ({
                    id: session.id,
                    cells: [
                      session.shortCode,
                      <NurseryChip key="status" label={qrStatusLabel(session.status)} tone={qrStatusTone(session.status)} />,
                      formatDateTime(session.expiresAt),
                      formatCurrency(session.amount),
                    ],
                  }))}
                />
              ),
            },
            {
              id: "orders",
              label: "주문 이력",
              children: (
                <DataTable
                  columns={["주문번호", "상태", "수령", "금액"]}
                  rows={roomOrderRows.map((order) => ({
                    id: order.id,
                    cells: [
                      order.orderNo,
                      <StatusBadge key="status" status={order.status} />,
                      order.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
                      formatCurrency(order.amount),
                    ],
                  }))}
                />
              ),
            },
            {
              id: "pickups",
              label: "현장수령 이력",
              children: (
                <DataTable
                  columns={["주문번호", "상품", "상태", "담당"]}
                  rows={roomPickupRows.map((event) => ({
                    id: event.id,
                    cells: [event.orderNo, event.productSummary, event.status, event.handledBy],
                  }))}
                />
              ),
            },
          ]}
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryTabletDetailPage() {
  const tabletControl = nurseryMockControls.find((control) => control.id === "control-tablet-pair");

  return (
    <NurseryShell title="태블릿 상세 mock" subtitle="태블릿 접근 상태와 일반 브라우저 차단 안내를 확인합니다.">
      <NurseryDetailMock record={findDetail("tablet")} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        {tabletControl ? <NurseryMockControlPanel control={tabletControl} /> : null}
        <ConfirmBox
          title="태블릿 배정/재배정/비활성화 mock"
          description="실제 장치 인증, 세션 폐기, 원격 비활성화는 연결하지 않고 재배정 예상값만 표시합니다."
          confirmLabel="device stub"
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryTabletAssignmentPage() {
  const tabletControl = nurseryMockControls.find((control) => control.id === "control-tablet-pair");

  return (
    <NurseryShell title="태블릿 배정 mock" subtitle="tablet_id, room_id, nursery_id 기준 배정/재배정/비활성화 후보를 표시합니다.">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {tabletControl ? <NurseryMockControlPanel control={tabletControl} /> : null}
        <NurseryPanel title="배정 후보 테이블" eyebrow="room-bound mock">
          <DataTable
            columns={["tablet_id", "현재 room_id", "배정 후보", "접근상태", "위험", "처리"]}
            rows={nurseryTabletWorkflows.map((tablet, index) => ({
              id: `assignment-${tablet.id}`,
              cells: [
                tablet.tabletId,
                tablet.roomId,
                index % 2 === 0 ? tablet.roomId : "room-701",
                tablet.closedMallAccess,
                <NurseryRiskBadge
                  key="risk"
                  level={tablet.accessStatus === "blocked_browser_mock" ? "critical" : tablet.accessStatus === "needs_pairing" ? "warning" : "ok"}
                />,
                "재배정 mock",
              ],
            }))}
          />
        </NurseryPanel>
      </div>
      <div className="mt-4">
        <ConfirmBox
          title="실제 장치 세션 변경 금지"
          description="태블릿 배정/재배정은 device claim, App Check, room-bound 정책 승인 전까지 mock 후보만 표시합니다."
          confirmLabel="session blocker"
        />
      </div>
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      </div>
    </NurseryShell>
  );
}

export function NurseryPickupDetailPage() {
  return (
    <NurseryShell title="현장수령 상세 mock" subtitle="수령 완료 처리 전 확인해야 할 주문/객실/상품 상태를 표시합니다.">
      <NurseryDetailMock record={findDetail("pickup")} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryPanel title="상품 snapshot / order_items" eyebrow="snapshot">
          <DataTable
            columns={["상품", "옵션", "수량", "단가", "상태"]}
            rows={nurseryOrderItemSnapshots.map((item) => ({
              id: item.id,
              cells: [item.productName, item.optionName, item.quantity, formatCurrency(item.unitPrice), item.pickupStatus],
            }))}
          />
        </NurseryPanel>
        <NurseryPanel title="수령 audit log" eyebrow="mock log">
          <DataTable
            columns={["주문번호", "담당자", "액션", "시간"]}
            rows={nurseryPickupAuditLogs.map((log) => ({
              id: log.id,
              cells: [log.orderNo, log.actor, log.action, formatDateTime(log.at)],
            }))}
          />
        </NurseryPanel>
      </div>
    </NurseryShell>
  );
}

export function NurseryQrDetailPage() {
  return (
    <NurseryShell title="QR 상세 mock" subtitle="QR 세션 상태, 만료 시각, 차단된 결제 동작을 확인합니다.">
      <NurseryDetailMock record={findDetail("qr")} />
      <div className="mt-4">
        <DataTable
          columns={["short_code", "qr_session_id", "cart_id", "room_id", "tablet_id", "만료시간", "결제상태"]}
          rows={nurseryQrReviewRows.slice(0, 4).map((session) => ({
            id: session.id,
            cells: [
              session.shortCode,
              session.qrSessionId,
              `cart-${session.roomId}`,
              session.roomId,
              session.tabletId,
              formatDateTime(session.expiresAt),
              <NurseryChip key="status" label={qrStatusLabel(session.status)} tone={qrStatusTone(session.status)} />,
            ],
          }))}
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryOrderDetailPage() {
  return (
    <NurseryShell title="주문 상세 mock" subtitle="조리원 주문 출처와 위험 상태를 상세 mock으로 확인합니다.">
      <NurseryDetailMock record={findDetail("order")} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryPanel title="상품 snapshot / order_items" eyebrow="order detail">
          <DataTable
            columns={["상품", "옵션", "수량", "단가", "수령상태"]}
            rows={nurseryOrderItemSnapshots.map((item) => ({
              id: item.id,
              cells: [item.productName, item.optionName, item.quantity, formatCurrency(item.unitPrice), item.pickupStatus],
            }))}
          />
        </NurseryPanel>
        <NurseryPanel title="수령 방식 분기" eyebrow="pickup_events vs delivery_events">
          <DataTable
            columns={["이벤트", "주문번호", "room_id", "상태", "실제 연결"]}
            rows={[
              ...nurseryPickupEvents.slice(0, 2).map((event) => ({
                id: `detail-${event.id}`,
                cells: [
                  "pickup_events",
                  event.orderNo,
                  event.roomId,
                  event.status,
                  "알림톡/실제 수령 저장 금지",
                ],
              })),
              ...nurseryDeliveryEvents.slice(0, 2).map((event) => ({
                id: `detail-${event.id}`,
                cells: [
                  "delivery_events",
                  event.orderNo,
                  event.roomId,
                  deliveryStatusLabel(event.status),
                  event.blockerNote,
                ],
              })),
            ]}
          />
        </NurseryPanel>
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomBulkPage() {
  const roomControl = nurseryMockControls.find((control) => control.id === "control-room-create");

  return (
    <NurseryShell title="객실 대량 등록 mock" subtitle="시작 번호, 종료 번호, prefix, 중복 경고와 미리보기 테이블을 표시합니다.">
      <FilterBar title="대량 등록 조건" filters={["시작 번호 701", "종료 번호 706", "prefix 7F", "중복 검사 mock"]} />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        {roomControl ? <NurseryMockControlPanel control={roomControl} /> : null}
        <NurseryPanel title="미리보기 테이블" eyebrow="bulk preview">
          <DataTable
            columns={["room_number", "room_id preview", "prefix", "중복 경고", "태블릿", "처리"]}
            rows={nurseryBulkRoomPreview.map((room) => ({
              id: room.id,
              cells: [
                room.roomNumber,
                room.roomIdPreview,
                room.prefix,
                <NurseryChip
                  key="warning"
                  label={room.duplicateWarning}
                  tone={room.duplicateWarning === "신규 가능" ? "green" : room.duplicateWarning === "기존 객실" ? "red" : "amber"}
                />,
                room.linkedTabletPreview,
                room.action,
              ],
            }))}
          />
        </NurseryPanel>
      </div>
      <div className="mt-4">
        <ConfirmBox
          title="대량 저장 차단"
          description="베타에서는 미리보기와 중복 경고만 표시하며 실제 객실 생성/수정 저장은 수행하지 않습니다."
          confirmLabel="저장 금지"
        />
      </div>
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomBulkCreatePage() {
  return <NurseryRoomBulkPage />;
}

export function NurseryTabletAccessPage() {
  return (
    <NurseryShell title="태블릿 폐쇄몰 접근 상태" subtitle="일반 브라우저 접근 차단, tablet session, room-bound 상태를 mock으로 표시합니다.">
      <ConfirmBox
        title="일반 브라우저 접근 차단 안내"
        description="운영 인증, App Check, 태블릿 세션 정책이 확정되기 전에는 실제 차단 로직 없이 상태 UI만 제공합니다."
        confirmLabel="policy gate"
      />
      <div className="mt-4">
        <DataTable
          columns={["tablet_id", "room_id", "tablet session", "browser policy", "room-bound", "cart", "만료", "위험"]}
          rows={nurseryTabletAccessRows.map((row) => ({
            id: row.id,
            cells: [
              row.tabletId,
              row.roomId,
              row.sessionId,
              row.browserPolicy,
              row.roomBoundState,
              row.cartState,
              formatDateTime(row.expiresAt),
              <NurseryRiskBadge key="risk" level={row.riskLevel} />,
            ],
          }))}
        />
      </div>
      <div className="mt-4">
        <NurseryRiskList risks={nurseryRiskStatuses.filter((risk) => risk.route.includes("tablets"))} />
      </div>
      <div className="mt-4">
        <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      </div>
    </NurseryShell>
  );
}

export function NurseryOperationsPage() {
  return (
    <NurseryShell title="운영 체크 mock" subtitle="조리원 베타 운영 중 확인해야 할 위험, 상태, 검색 프리셋을 한 화면에 모읍니다.">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <NurseryPanel title="위험 알림 전체" eyebrow="operation risk">
          <NurseryRiskList risks={nurseryRiskStatuses} />
        </NurseryPanel>
        <NurseryPanel title="상태 시나리오" eyebrow="empty/error/loading/ready">
          <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
        </NurseryPanel>
      </div>
      <div className="mt-4">
        <NurserySearchSortPanel presets={nurserySearchPresets} />
      </div>
      <div className="mt-4">
        <NurseryPanel title="오늘의 mock 운영 큐" eyebrow="no external action">
          <DataTable
            columns={["대상", "확인 항목", "실제 연결 차단", "상태"]}
            rows={[
              {
                id: "ops-tablet",
                cells: ["태블릿", "미접속/room-bound 확인", "원격 제어 금지", <NurseryRiskBadge key="risk" level="critical" />],
              },
              {
                id: "ops-qr",
                cells: ["QR", "2~3시간 만료 및 실패 mock 확인", "PG 연결 금지", <NurseryRiskBadge key="risk" level="warning" />],
              },
              {
                id: "ops-pickup",
                cells: ["현장수령", "장기대기/수령완료 mock 확인", "알림톡 발송 금지", <NurseryRiskBadge key="risk" level="attention" />],
              },
              {
                id: "ops-room",
                cells: ["객실", "대량등록 중복 경고 확인", "실제 bulk write 금지", <NurseryRiskBadge key="risk" level="ok" />],
              },
            ]}
          />
        </NurseryPanel>
      </div>
    </NurseryShell>
  );
}

export function NurseryRiskCenterPage() {
  return (
    <NurseryShell title="위험 센터 mock" subtitle="태블릿 미접속, QR 만료 증가, 현장수령 장기대기, 미배정 태블릿, 결제 실패를 한 화면에서 확인합니다.">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <NurseryPanel title="위험 알림" eyebrow="risk center">
          <NurseryRiskList risks={nurseryRiskStatuses} />
        </NurseryPanel>
        <NurseryPanel title="상태별 즉시 확인" eyebrow="empty/loading/error/risk">
          <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
        </NurseryPanel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryPanel title="QR 위험 상태" eyebrow="payment_failed included">
          <DataTable
            columns={["short_code", "상태", "room_id", "tablet_id", "만료", "위험"]}
            rows={nurseryQrReviewRows.map((session) => ({
              id: `risk-${session.id}`,
              cells: [
                session.shortCode,
                <NurseryChip key="status" label={qrStatusLabel(session.status)} tone={qrStatusTone(session.status)} />,
                session.roomId,
                session.tabletId,
                formatDateTime(session.expiresAt),
                <NurseryRiskBadge key="risk" level={session.status === "active" || session.status === "used" ? "ok" : session.status === "expired" ? "warning" : "critical"} />,
              ],
            }))}
          />
        </NurseryPanel>
        <NurseryPanel title="수령/배송 차단 상태" eyebrow="no external APIs">
          <DataTable
            columns={["이벤트", "주문번호", "room_id", "상태", "차단"]}
            rows={[
              ...nurseryPickupEvents.map((event) => ({
                id: `risk-${event.id}`,
                cells: [
                  "pickup_events",
                  event.orderNo,
                  event.roomId,
                  event.status,
                  "알림톡/실제 수령 저장 금지",
                ],
              })),
              ...nurseryDeliveryEvents.map((event) => ({
                id: `risk-${event.id}`,
                cells: [
                  "delivery_events",
                  event.orderNo,
                  event.roomId,
                  deliveryStatusLabel(event.status),
                  event.blockerNote,
                ],
              })),
            ]}
          />
        </NurseryPanel>
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomStatusPage() {
  return (
    <NurseryShell title="객실 상태 변경 mock" subtitle="active, inactive, maintenance, blocked 상태 전환을 저장 없이 검토합니다.">
      <FilterBar title="상태 변경 필터" filters={["active", "inactive", "maintenance", "blocked", "중복 경고", "저장 금지"]} />
      <DataTable
        columns={["room_id", "room_number", "현재 상태", "변경 후보", "위험", "처리"]}
        rows={nurseryGeneratedRooms.slice(0, 16).map((room, index) => ({
          id: room.id,
          cells: [
            room.roomId,
            room.roomNumber,
            <NurseryChip key="current" label={room.status} tone={room.status === "active" ? "green" : room.status === "blocked" ? "red" : "amber"} />,
            index % 4 === 0 ? "maintenance" : index % 4 === 1 ? "blocked" : index % 4 === 2 ? "inactive" : "active",
            <NurseryRiskBadge key="risk" level={room.status === "blocked" ? "critical" : room.status === "maintenance" ? "warning" : "ok"} />,
            "상태 변경 mock",
          ],
        }))}
      />
      <div className="mt-4">
        <ConfirmBox
          title="상태 저장 차단"
          description="객실 상태 변경은 운영 정책과 서버 검증이 필요하므로 베타에서는 변경 후보와 위험도만 표시합니다."
          confirmLabel="server gate"
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryRoomStatsPage() {
  return (
    <NurseryShell title="객실별 주문 통계 mock" subtitle="객실별 주문 수, 현장수령 수, 활성 QR 수와 최근 주문을 표시합니다.">
      <NurseryPaginationPanel snapshots={nurseryPaginationSnapshots.filter((snapshot) => snapshot.id === "page-rooms")} />
      <div className="mt-4">
        <DataTable
          columns={["room_id", "객실번호", "주문", "현장수령", "활성 QR", "최근 주문", "위험"]}
          rows={nurseryRoomOrderStats.map((stat) => ({
            id: stat.id,
            cells: [
              stat.roomId,
              stat.roomNumber,
              `${stat.orderCount}건`,
              `${stat.pickupCount}건`,
              `${stat.activeQrCount}건`,
              stat.lastOrderNo,
              <NurseryRiskBadge key="risk" level={stat.riskLevel} />,
            ],
          }))}
        />
      </div>
    </NurseryShell>
  );
}

export function NurseryTabletQrStatsPage() {
  return (
    <NurseryShell title="태블릿별 QR 통계 mock" subtitle="태블릿별 QR 생성, 만료, 사용완료, 결제실패, 장바구니 상태를 표시합니다.">
      <NurseryPaginationPanel snapshots={nurseryPaginationSnapshots.filter((snapshot) => snapshot.id === "page-tablets" || snapshot.id === "page-qr")} />
      <div className="mt-4">
        <DataTable
          columns={["tablet_id", "room_id", "생성", "만료", "사용", "결제실패", "장바구니", "위험"]}
          rows={nurseryTabletQrStats.map((stat) => ({
            id: stat.id,
            cells: [
              stat.tabletId,
              stat.roomId,
              `${stat.qrCreated}건`,
              `${stat.qrExpired}건`,
              `${stat.qrUsed}건`,
              `${stat.paymentFailed}건`,
              stat.cartState,
              <NurseryRiskBadge key="risk" level={stat.riskLevel} />,
            ],
          }))}
        />
      </div>
    </NurseryShell>
  );
}

export function NurserySearchPage() {
  return (
    <NurseryShell title="통합 검색 mock" subtitle="객실번호, 태블릿ID, 주문번호, QR 코드, 상태 검색을 한 화면에서 표시합니다.">
      <FilterBar title="검색 입력 mock" filters={["객실번호 701", "tablet-702-a", "A5-20260519-002", "FAILPAY", "status:ready"]} />
      <NurseryUnifiedSearchPanel results={nurseryUnifiedSearchResults} />
      <div className="mt-4">
        <NurserySearchSortPanel presets={nurserySearchPresets} />
      </div>
    </NurseryShell>
  );
}

export function NurseryStatesPage() {
  return (
    <NurseryShell title="상태 UI mock" subtitle="empty, loading, error, risk, ready 상태 컴포넌트를 nursery 화면 기준으로 모아둡니다.">
      <NurseryStateScenarioGrid scenarios={nurseryStateScenarios} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NurseryPanel title="위험 상태 배지" eyebrow="risk">
          <NurseryRiskList risks={nurseryRiskStatuses} />
        </NurseryPanel>
        <NurseryPanel title="페이지네이션 상태" eyebrow="table state">
          <NurseryPaginationPanel snapshots={nurseryPaginationSnapshots} />
        </NurseryPanel>
      </div>
    </NurseryShell>
  );
}

export function NurseryScaleDataPage() {
  return (
    <NurseryShell title="대량 mock 데이터 현황" subtitle="객실 30개, 태블릿 30개, QR 50개, 주문 50개, 현장수령 30개와 배송 이벤트 mock을 확인합니다.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard metric={{ label: "객실 mock", value: `${nurseryGeneratedRooms.length}`, helper: "generated rooms", tone: "neutral" }} />
        <StatCard metric={{ label: "태블릿 mock", value: `${nurseryGeneratedTablets.length}`, helper: "generated tablets", tone: "blue" }} />
        <StatCard metric={{ label: "QR mock", value: `${nurseryGeneratedQrSessions.length}`, helper: "generated QR sessions", tone: "purple" }} />
        <StatCard metric={{ label: "주문 mock", value: `${nurseryGeneratedOrders.length}`, helper: "generated orders", tone: "green" }} />
        <StatCard metric={{ label: "수령 mock", value: `${nurseryGeneratedPickupEvents.length}`, helper: "generated pickup events", tone: "amber" }} />
        <StatCard metric={{ label: "배송 mock", value: `${nurseryGeneratedDeliveryEvents.length}`, helper: "generated delivery events", tone: "red" }} />
      </div>
      <div className="mt-4">
        <NurseryPaginationPanel snapshots={nurseryPaginationSnapshots} />
      </div>
    </NurseryShell>
  );
}
