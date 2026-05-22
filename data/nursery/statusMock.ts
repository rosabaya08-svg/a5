export const nurseryStatusSummary = {
  track: "nursery",
  statusRoute: "/nursery/status",
  mode: "mock/test beta",
  generatedMajorFileCount: 54,
  progressPercent: 94,
  warning: "운영 오픈/실결제 아님",
  firebaseState: "실제 연결 없음",
  pgState: "mock only",
  alimtalkState: "blocker",
  deliveryTrackingState: "blocker",
  externalInventoryState: "blocker",
  storageState: "Spark 제한으로 보류",
};

export const statusProgressCards = [
  {
    id: "progress-ui",
    label: "화면 생성",
    value: "25 routes",
    helper: "nursery route mock",
    state: "done",
  },
  {
    id: "progress-data",
    label: "mock 데이터",
    value: "30/30/50/50/30",
    helper: "rooms/tablets/QR/orders/pickups",
    state: "done",
  },
  {
    id: "progress-state",
    label: "상태 커버리지",
    value: "empty/loading/error/risk",
    helper: "display-only",
    state: "done",
  },
  {
    id: "progress-connect",
    label: "실제 연결",
    value: "blocked",
    helper: "Firebase/PG/notification",
    state: "blocked",
  },
];

export const statusMajorScreens = [
  "/nursery",
  "/nursery/dashboard",
  "/nursery/rooms",
  "/nursery/rooms/detail",
  "/nursery/rooms/bulk",
  "/nursery/rooms/bulk-create",
  "/nursery/rooms/status",
  "/nursery/tablets",
  "/nursery/tablets/detail",
  "/nursery/tablets/assignment",
  "/nursery/tablets/access",
  "/nursery/pickups",
  "/nursery/pickups/detail",
  "/nursery/qr-history",
  "/nursery/qr-history/detail",
  "/nursery/orders",
  "/nursery/orders/detail",
  "/nursery/stats/rooms",
  "/nursery/stats/tablets",
  "/nursery/search",
  "/nursery/states",
  "/nursery/mock-data",
  "/nursery/operations",
  "/nursery/risk-center",
  "/nursery/status",
];

export const statusMockContext = {
  nurseryId: "nursery-gangnam-01",
  roomId: "room-701",
  tabletId: "tablet-701-a",
};

export const statusRoutePreviewGroups = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/nursery",
    helper: "KPI, 기간 필터, 위험 알림",
    state: "done",
    context: "nursery_id / room_id / tablet_id",
  },
  {
    id: "rooms",
    title: "Rooms",
    href: "/nursery/rooms",
    helper: "객실 목록, 태블릿 연결, 활성 QR",
    state: "done",
    context: "room_id 중심",
  },
  {
    id: "room-detail",
    title: "Room Detail",
    href: "/nursery/rooms/detail",
    helper: "객실 정보, 태블릿, QR, 주문, 수령 탭",
    state: "done",
    context: "room-701",
  },
  {
    id: "room-bulk-create",
    title: "Room Bulk Create",
    href: "/nursery/rooms/bulk-create",
    helper: "시작/종료 번호, prefix, 중복 경고",
    state: "done",
    context: "bulk preview",
  },
  {
    id: "tablets",
    title: "Tablets",
    href: "/nursery/tablets",
    helper: "태블릿 목록, 마지막 접속, cart 상태",
    state: "done",
    context: "tablet_id 중심",
  },
  {
    id: "tablet-detail",
    title: "Tablet Detail",
    href: "/nursery/tablets/detail",
    helper: "태블릿 상세와 접근 차단 안내",
    state: "done",
    context: "tablet-701-a",
  },
  {
    id: "tablet-assignment",
    title: "Tablet Assignment",
    href: "/nursery/tablets/assignment",
    helper: "배정/재배정/비활성화 mock",
    state: "done",
    context: "room-bound mock",
  },
  {
    id: "qr-history",
    title: "QR History",
    href: "/nursery/qr-history",
    helper: "active/expired/used/payment_failed/canceled",
    state: "done",
    context: "qr_payment_sessions",
  },
  {
    id: "qr-detail",
    title: "QR Detail",
    href: "/nursery/qr-history/detail",
    helper: "short_code, session, cart, 만료",
    state: "done",
    context: "SANHO701",
  },
  {
    id: "pickups",
    title: "Pickups",
    href: "/nursery/pickups",
    helper: "pickup_events 현장수령 목록",
    state: "done",
    context: "pickup_events",
  },
  {
    id: "pickup-detail",
    title: "Pickup Detail",
    href: "/nursery/pickups/detail",
    helper: "상품 snapshot, 담당자, audit log",
    state: "done",
    context: "order_items",
  },
  {
    id: "orders",
    title: "Orders",
    href: "/nursery/orders",
    helper: "주문 이력과 배송/현장수령 분기",
    state: "done",
    context: "order history",
  },
  {
    id: "order-detail",
    title: "Order Detail",
    href: "/nursery/orders/detail",
    helper: "상품 snapshot, 결제/수령 상태",
    state: "done",
    context: "A5-20260519-002",
  },
  {
    id: "risk-center",
    title: "Risk Center",
    href: "/nursery/risk-center",
    helper: "태블릿 미접속, QR 만료, 장기대기, 결제 실패",
    state: "risk",
    context: "risk review",
  },
];

export const statusQrSessionStateCards = [
  { id: "qr-active", label: "active", helper: "2~3시간 만료 전 결제 가능 mock", tone: "blue" },
  { id: "qr-expired", label: "expired", helper: "만료된 QR 재사용 차단 mock", tone: "red" },
  { id: "qr-used", label: "used", helper: "결제 완료 후 사용완료 mock", tone: "green" },
  { id: "qr-payment-failed", label: "payment_failed", helper: "PG 실제 호출 없이 실패 상태 표시", tone: "red" },
  { id: "qr-canceled", label: "canceled", helper: "고객/객실 상태로 취소 mock", tone: "neutral" },
];

export const statusFulfillmentEventGroups = [
  {
    id: "pickup-events",
    title: "pickup_events",
    helper: "현장수령 대기/완료/예외를 조리원 직원이 확인",
    states: ["ready", "completed", "exception"],
  },
  {
    id: "delivery-events",
    title: "delivery_events",
    helper: "택배 송장/배송 상태는 mock이며 실제 배송조회 API는 blocker",
    states: ["label_created", "shipping", "delivered", "blocked"],
  },
];

export const statusCompletedItems = [
  "조리원 dashboard KPI/기간/상태 필터",
  "객실 목록/상세/대량등록/상태변경 mock",
  "태블릿 목록/상세/접근상태 mock",
  "현장수령 목록/상세/timeline/audit log mock",
  "QR 이력/상세/payment_failed 상태 mock",
  "주문 목록/상세/배송-현장수령 분기 mock",
  "위험 알림/검색/필터/정렬/페이지네이션 mock",
  "대량 generated mock data",
  "운영 체크/상태 UI/route map reports",
  "브라우저 육안 확인용 /nursery/status 대시보드",
];

export const statusInProgressItems = [
  "브라우저 smoke 확인 대기",
  "lint/build 허용 전 정적 파일 검토 상태",
  "동적 route param 전환 여부 검토 대기",
  "tablet session/server policy 계약 대기",
  "Firebase repository interface 연결 전 계약 대기",
];

export const statusConnectionBlockers = [
  { id: "firebase", label: "Firebase 연결 상태", value: "실제 연결 없음" },
  { id: "pg", label: "PG 상태", value: "mock only" },
  { id: "alimtalk", label: "알림톡 상태", value: "blocker" },
  { id: "delivery", label: "배송조회 상태", value: "blocker" },
  { id: "inventory", label: "외부 재고 API 상태", value: "blocker" },
  { id: "storage", label: "Storage 상태", value: "Spark 제한으로 보류" },
];

export const statusNextTasks = [
  "허용 시 npm run lint 실행",
  "허용 시 npm run build 실행",
  "브라우저에서 /nursery/status smoke 확인",
  "브라우저에서 /nursery/dashboard smoke 확인",
  "정적 상세 route를 dynamic route로 전환할지 결정",
  "room bulk wizard를 실제 draft form으로 전환할지 결정",
  "tablet session 정책 검토",
  "pickup audit persistence 정책 검토",
  "Firebase/Auth contract 확정 후 repository interface 연결",
  "mock data를 seed plan으로 옮길지 검토",
];

export const statusHumanReviewItems = [
  "Next.js 내부 docs 부재로 static route 패턴을 유지한 점",
  "shared layout/sidebar 모바일 동작은 nursery 범위 밖이라 미수정",
  "고객정보 저장 금지 정책",
  "PG/환불/정산/알림/배송조회 연결 금지 정책",
  "Storage Spark 제한과 업그레이드 여부",
  "generated mock data가 실제 seed script가 아니라는 점",
];

export const statusSmokeRoutes = [
  "/nursery",
  "/nursery/status",
  "/nursery/dashboard",
  "/nursery/rooms",
  "/nursery/rooms/bulk-create",
  "/nursery/rooms/status",
  "/nursery/tablets",
  "/nursery/tablets/assignment",
  "/nursery/tablets/access",
  "/nursery/pickups",
  "/nursery/qr-history",
  "/nursery/orders",
  "/nursery/stats/rooms",
  "/nursery/stats/tablets",
  "/nursery/search",
  "/nursery/states",
  "/nursery/mock-data",
  "/nursery/operations",
  "/nursery/risk-center",
];

export const statusVisualStateMatrix = [
  {
    id: "state-rooms",
    screen: "객실",
    empty: "객실 검색 결과 없음",
    loading: "객실 목록 mock 로딩",
    error: "room_number 중복/room_id mismatch",
    risk: "blocked 또는 maintenance 객실",
  },
  {
    id: "state-tablets",
    screen: "태블릿",
    empty: "미배정 태블릿 없음",
    loading: "마지막 접속 동기화 전",
    error: "tablet_id와 room_id 바인딩 오류",
    risk: "미접속/브라우저 차단/페어링 필요",
  },
  {
    id: "state-qr",
    screen: "QR",
    empty: "short_code 검색 결과 없음",
    loading: "만료 상태 계산 전",
    error: "qr_session_id와 cart_id 불일치",
    risk: "expired/payment_failed/canceled",
  },
  {
    id: "state-pickups",
    screen: "현장수령",
    empty: "수령 대기 없음",
    loading: "수령 담당자 확인 전",
    error: "pickup_events와 order_items 불일치",
    risk: "장기대기/예외/알림톡 blocker",
  },
  {
    id: "state-delivery",
    screen: "택배배송",
    empty: "택배배송 주문 없음",
    loading: "송장 mock 생성 전",
    error: "trackingNoMasked 없음",
    risk: "delivery_events blocked/배송조회 API blocker",
  },
];

export const statusStateCoverage = [
  { id: "empty", label: "empty", coverage: "검색 결과 없음, 미배정, 데이터 없음" },
  { id: "loading", label: "loading", coverage: "실시간 연결 전 정적 loading state" },
  { id: "error", label: "error", coverage: "nursery_id scope mismatch, invalid room/tablet binding" },
  { id: "risk", label: "risk", coverage: "offline tablet, expired QR, long pickup wait, payment_failed" },
  { id: "ready", label: "ready", coverage: "mock/test beta 표시 가능 상태" },
];

export const statusMockDataSnapshot = [
  { id: "rooms", label: "객실", value: "30 generated + curated rows" },
  { id: "tablets", label: "태블릿", value: "30 generated + access rows" },
  { id: "qr", label: "QR 세션", value: "50 generated + review rows" },
  { id: "orders", label: "주문", value: "50 generated + order_items snapshot" },
  { id: "pickups", label: "현장수령", value: "30 generated + audit timeline" },
];

export const statusDesignHighlights = [
  "상단에 mock/test beta와 운영 오픈 아님 배지를 고정 표시",
  "완료/진행중/차단 상태를 분리해 육안 확인 가능",
  "route 목록과 smoke route 목록을 따로 표시",
  "empty/loading/error/risk 커버리지를 한 화면에서 확인",
  "모바일에서는 카드가 한 줄씩 쌓이고 태블릿 이상에서는 다열 grid로 전환",
];

export const statusBlockerCards = [
  "실제 Firebase SDK import 금지",
  "실제 Firestore/Auth 연결 금지",
  "실제 PG/환불/정산 연결 금지",
  "실제 알림톡/배송조회/외부 재고 API 연결 금지",
  "운영 배포 금지",
  "공용 보고서 수정 금지",
];
