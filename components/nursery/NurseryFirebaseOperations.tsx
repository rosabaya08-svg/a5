import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getLiveNurseryOrders,
  getLiveNurseryPickupEvents,
  getLiveNurseryQrSessions,
  getLiveNurseryRooms,
  getLiveNurseryTablets,
  type LiveRead,
  type NurseryPickupEventPreview,
} from "@/lib/repositories/liveCommerceRepository";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Order, QrPaymentSession, Room, Tablet } from "@/types/commerce";

const defaultNurseryId = "nursery-gangnam-01";

function SourceBadge({ read }: { read: Pick<LiveRead<unknown>, "source" | "reason"> }) {
  const isFirebase = read.source === "Firestore";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 font-black ${
          isFirebase ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"
        }`}
      >
        {isFirebase ? "Firebase schema read" : "mock fallback"}
      </span>
      <p className="mt-2 leading-5">
        {isFirebase
          ? "nursery_id 범위로 Firestore를 우선 읽고 있습니다."
          : read.reason ?? "Firestore 결과가 비어 있거나 권한/env 문제로 mock fallback을 표시합니다."}
      </p>
    </div>
  );
}

function externalId(prefix: string, id: string) {
  return `A4-${prefix}-${id.toUpperCase()}`;
}

function ScopeCard({ nurseryId }: { nurseryId: string }) {
  return (
    <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-rose-700">Firebase nursery scope</p>
          <h2 className="mt-1 text-lg font-black">조리원 운영 데이터는 nursery_id 범위로만 표시</h2>
          <p className="mt-2 text-sm leading-6">
            객실, 태블릿, QR 세션, 주문, 현장수령은 모두 <strong>{nurseryId}</strong> 기준으로 읽습니다. A4 연동을 위해
            external_nursery_id, external_room_id, external_tablet_id 후보도 같이 표시합니다.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-800 ring-1 ring-rose-200">
          A4 연동 필드 준비
        </span>
      </div>
    </section>
  );
}

function buildRoomRows(rooms: Room[]) {
  return rooms.map((room) => ({
    id: room.id,
    cells: [
      <div key="room">
        <p className="font-black text-slate-950">{room.name}</p>
        <p className="mt-1 text-xs text-slate-500">{room.id}</p>
      </div>,
      room.floor,
      room.pickupEnabled ? "가능" : "불가",
      room.activeTabletId ?? "미연결",
      externalId("ROOM", room.id),
    ],
  }));
}

function buildTabletRows(tablets: Tablet[]) {
  return tablets.map((tablet) => ({
    id: tablet.id,
    cells: [
      <div key="tablet">
        <p className="font-black text-slate-950">{tablet.label}</p>
        <p className="mt-1 text-xs text-slate-500">{tablet.id}</p>
      </div>,
      tablet.roomId,
      tablet.status,
      formatDateTime(tablet.lastSeenAt),
      externalId("TABLET", tablet.id),
    ],
  }));
}

function buildQrRows(sessions: QrPaymentSession[]) {
  return sessions.map((session) => ({
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
  }));
}

function buildOrderRows(orders: Order[]) {
  return orders.map((order) => ({
    id: order.id,
    cells: [
      order.orderNo,
      order.roomId,
      order.customerName,
      <StatusBadge key="status" status={order.status} />,
      order.deliveryMethod === "pickup" ? "현장수령" : "택배배송",
      formatCurrency(order.totalAmount),
      formatDateTime(order.createdAt),
    ],
  }));
}

function buildPickupRows(events: NurseryPickupEventPreview[]) {
  return events.map((event) => ({
    id: event.id,
    cells: [
      event.orderNo,
      event.roomId,
      <StatusBadge key="status" status={event.status} />,
      formatCurrency(event.amount),
      event.sourceCollection,
      formatDateTime(event.createdAt),
    ],
  }));
}

export async function NurseryOperationsOverview({ nurseryId = defaultNurseryId }: { nurseryId?: string }) {
  const [rooms, tablets, qrSessions, orders, pickups] = await Promise.all([
    getLiveNurseryRooms(nurseryId),
    getLiveNurseryTablets(nurseryId),
    getLiveNurseryQrSessions(nurseryId),
    getLiveNurseryOrders(nurseryId),
    getLiveNurseryPickupEvents(nurseryId),
  ]);

  return (
    <div className="grid gap-4">
      <ScopeCard nurseryId={nurseryId} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["객실", `${rooms.data.length}개`, rooms.source],
          ["태블릿", `${tablets.data.length}대`, tablets.source],
          ["QR 세션", `${qrSessions.data.length}건`, qrSessions.source],
          ["주문", `${orders.data.length}건`, orders.source],
          ["현장수령", `${pickups.data.length}건`, pickups.source],
        ].map(([label, value, source]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">{source}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">A4 integration ids</p>
        <p className="mt-2 text-sm font-bold text-slate-700">
          external_nursery_id: {externalId("NURSERY", nurseryId)}
        </p>
      </div>
    </div>
  );
}

export async function NurseryRoomsFirestorePanel({ nurseryId = defaultNurseryId }: { nurseryId?: string }) {
  const read = await getLiveNurseryRooms(nurseryId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["객실", "층", "현장수령", "연결 태블릿", "external_room_id"]}
        rows={buildRoomRows(read.data)}
        emptyMessage="이 nursery_id에 연결된 rooms가 없습니다."
        sortLabel="범위: nursery_id가 일치하는 rooms"
        paginationLabel={`${read.data.length}개`}
      />
    </section>
  );
}

export async function NurseryTabletsFirestorePanel({ nurseryId = defaultNurseryId }: { nurseryId?: string }) {
  const read = await getLiveNurseryTablets(nurseryId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["태블릿", "객실", "상태", "마지막 접속", "external_tablet_id"]}
        rows={buildTabletRows(read.data)}
        emptyMessage="이 nursery_id에 연결된 tablets가 없습니다."
        sortLabel="범위: nursery_id가 일치하는 tablets"
        paginationLabel={`${read.data.length}대`}
      />
    </section>
  );
}

export async function NurseryQrSessionsPanel({ nurseryId = defaultNurseryId }: { nurseryId?: string }) {
  const read = await getLiveNurseryQrSessions(nurseryId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["코드", "유형", "상태", "객실", "태블릿", "만료", "금액"]}
        rows={buildQrRows(read.data)}
        emptyMessage="이 nursery_id에 연결된 qr_payment_sessions가 없습니다."
        sortLabel="범위: nursery_id가 일치하는 qr_payment_sessions"
        paginationLabel={`${read.data.length}건`}
      />
    </section>
  );
}

export async function NurseryOrdersFirestorePanel({ nurseryId = defaultNurseryId }: { nurseryId?: string }) {
  const read = await getLiveNurseryOrders(nurseryId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["주문번호", "객실", "고객", "상태", "수령", "금액", "생성"]}
        rows={buildOrderRows(read.data)}
        emptyMessage="이 nursery_id에 연결된 orders가 없습니다."
        sortLabel="범위: nursery_id가 일치하는 orders"
        paginationLabel={`${read.data.length}건`}
      />
    </section>
  );
}

export async function NurseryPickupEventsPanel({ nurseryId = defaultNurseryId }: { nurseryId?: string }) {
  const read = await getLiveNurseryPickupEvents(nurseryId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["주문번호", "객실", "상태", "금액", "출처 컬렉션", "생성"]}
        rows={buildPickupRows(read.data)}
        emptyMessage="이 nursery_id에 연결된 현장수령 이벤트가 없습니다."
        sortLabel="pickup_events 서버 write 전까지 orders에서 파생 표시"
        paginationLabel={`${read.data.length}건`}
      />
    </section>
  );
}
