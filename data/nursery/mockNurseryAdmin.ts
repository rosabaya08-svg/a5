import type {
  NurseryDashboardSummary,
  NurseryDeliveryEvent,
  NurseryDetailRecord,
  NurseryBulkRoomPreview,
  NurseryMockControl,
  NurseryOperationNote,
  NurseryOrderHistoryRow,
  NurseryOrderItemSnapshot,
  NurseryPaginationSnapshot,
  NurseryPickupAuditLog,
  NurseryPickupEvent,
  NurseryQrReviewRow,
  NurseryRiskStatus,
  NurserySearchPreset,
  NurseryRoomOrderStat,
  NurseryRoomWorkflow,
  NurseryScopeFilter,
  NurseryStateScenario,
  NurseryTabletAccessRow,
  NurseryTabletQrStat,
  NurseryTabletWorkflow,
  NurseryUnifiedSearchResult,
} from "@/types/nursery";

export const activeNurseryId = "nursery-gangnam-01";

export const nurseryScopeFilters: NurseryScopeFilter[] = [
  {
    id: "scope-nursery",
    label: "nursery_id",
    value: "nursery-gangnam-01",
    helper: "조리원 관리자 권한의 기본 필터",
  },
  {
    id: "scope-room",
    label: "room_id",
    value: "room-701, room-702",
    helper: "객실별 태블릿/QR 출처 확인",
  },
  {
    id: "scope-tablet",
    label: "tablet_id",
    value: "tablet-701-a, tablet-702-a",
    helper: "폐쇄몰 접근 장치 추적",
  },
];

export const nurseryDashboardSummary: NurseryDashboardSummary[] = [
  {
    id: "metric-rooms",
    label: "객실 수",
    value: "30",
    helper: "대량 mock 객실 포함",
    tone: "neutral",
  },
  {
    id: "metric-tablets",
    label: "태블릿 수",
    value: "30",
    helper: "대량 mock 태블릿 포함",
    tone: "blue",
  },
  {
    id: "metric-active-qr",
    label: "활성 QR",
    value: "13",
    helper: "만료 전 결제 가능 세션",
    tone: "purple",
  },
  {
    id: "metric-expired-qr",
    label: "만료 QR",
    value: "13",
    helper: "2~3시간 만료 안내 대상",
    tone: "red",
  },
  {
    id: "metric-pickup-ready",
    label: "현장수령 대기",
    value: "10",
    helper: "조리원 확인 필요",
    tone: "green",
  },
  {
    id: "metric-today-orders",
    label: "오늘 주문",
    value: "50",
    helper: "mock 주문 생성 기준",
    tone: "amber",
  },
  {
    id: "metric-risk-alerts",
    label: "위험 알림",
    value: "8",
    helper: "미접속/만료/대기/실패 포함",
    tone: "red",
  },
];

export const nurseryRoomWorkflows: NurseryRoomWorkflow[] = [
  {
    id: "room-flow-701",
    roomId: "room-701",
    roomNumber: "701",
    floor: "7F",
    status: "active",
    pickupEnabled: true,
    linkedTabletId: "tablet-701-a",
    activeQrCount: 1,
    recentOrderNo: "A5-20260519-002",
    duplicateGuard: "room_number 701 중복 없음",
    pendingAction: "수정 mock 저장 가능",
    lastEditedAt: "2026-05-20T09:10:00+09:00",
  },
  {
    id: "room-flow-702",
    roomId: "room-702",
    roomNumber: "702",
    floor: "7F",
    status: "editing",
    pickupEnabled: true,
    linkedTabletId: "tablet-702-a",
    activeQrCount: 0,
    recentOrderNo: "A5-20260518-011",
    duplicateGuard: "room_id 고정, room_number 변경 검토",
    pendingAction: "비활성 처리 mock 대기",
    lastEditedAt: "2026-05-20T09:22:00+09:00",
  },
  {
    id: "room-flow-703",
    roomId: "room-703-draft",
    roomNumber: "703",
    floor: "7F",
    status: "duplicate_review",
    pickupEnabled: false,
    activeQrCount: 0,
    recentOrderNo: "없음",
    duplicateGuard: "room_number 703 신규 등록 전 중복 검사",
    pendingAction: "객실 추가 mock 초안",
    lastEditedAt: "2026-05-20T09:35:00+09:00",
  },
  {
    id: "room-flow-704",
    roomId: "room-704",
    roomNumber: "704",
    floor: "7F",
    status: "inactive",
    pickupEnabled: false,
    activeQrCount: 0,
    recentOrderNo: "A5-20260520-007",
    duplicateGuard: "퇴실 객실로 신규 QR 생성 차단",
    pendingAction: "재활성화 mock 검토",
    lastEditedAt: "2026-05-20T10:05:00+09:00",
  },
];

export const nurseryTabletWorkflows: NurseryTabletWorkflow[] = [
  {
    id: "tablet-flow-701",
    tabletId: "tablet-701-a",
    roomId: "room-701",
    status: "active",
    accessStatus: "allowed_mock",
    lastSeenAt: "2026-05-20T09:42:00+09:00",
    closedMallAccess: "허용 mock",
    browserBlockMode: "일반 브라우저 접근 차단 예정",
    qrGeneratedCount: 8,
    cartState: "장바구니 2건 유지",
    operatorNote: "QR 생성과 현장수령 모두 사용 가능",
  },
  {
    id: "tablet-flow-702",
    tabletId: "tablet-702-a",
    roomId: "room-702",
    status: "active",
    accessStatus: "allowed_mock",
    lastSeenAt: "2026-05-20T09:37:00+09:00",
    closedMallAccess: "허용 mock",
    browserBlockMode: "태블릿 식별 토큰 설계 필요",
    qrGeneratedCount: 4,
    cartState: "장바구니 비어 있음",
    operatorNote: "객실 이동 시 재연결 확인 필요",
  },
  {
    id: "tablet-flow-draft",
    tabletId: "tablet-703-a-draft",
    roomId: "room-703-draft",
    status: "inactive",
    accessStatus: "needs_pairing",
    lastSeenAt: "2026-05-20T08:10:00+09:00",
    closedMallAccess: "차단 mock",
    browserBlockMode: "페어링 전 QR 생성 차단",
    qrGeneratedCount: 0,
    cartState: "페어링 전 장바구니 차단",
    operatorNote: "객실 신규 등록 후 활성화 가능",
  },
  {
    id: "tablet-flow-browser-block",
    tabletId: "tablet-704-a",
    roomId: "room-704",
    status: "maintenance",
    accessStatus: "blocked_browser_mock",
    lastSeenAt: "2026-05-19T18:04:00+09:00",
    closedMallAccess: "점검 차단 mock",
    browserBlockMode: "일반 브라우저 접근 시 차단 안내",
    qrGeneratedCount: 1,
    cartState: "퇴실 객실 cart 차단",
    operatorNote: "퇴실 객실 태블릿 회수 필요",
  },
];

export const nurseryPickupEvents: NurseryPickupEvent[] = [
  {
    id: "pickup-event-001",
    orderNo: "A5-20260519-002",
    roomId: "room-701",
    customerName: "박*린",
    productSummary: "산모 회복 케어 키트 외 1건",
    status: "ready",
    requestedAt: "2026-05-19T15:28:00+09:00",
    handledBy: "프론트 데스크",
    actionLabel: "수령 완료 처리 mock",
  },
  {
    id: "pickup-event-002",
    orderNo: "A5-20260518-011",
    roomId: "room-702",
    customerName: "이*아",
    productSummary: "신생아 오가닉 블랭킷",
    status: "completed",
    requestedAt: "2026-05-18T21:02:00+09:00",
    completedAt: "2026-05-18T21:18:00+09:00",
    handledBy: "야간 데스크",
    actionLabel: "완료 기록 보기",
  },
  {
    id: "pickup-event-003",
    orderNo: "A5-20260520-004",
    roomId: "room-703-draft",
    customerName: "최*은",
    productSummary: "조리원 현장수령 테스트 상품",
    status: "exception",
    requestedAt: "2026-05-20T09:50:00+09:00",
    handledBy: "운영 확인",
    actionLabel: "객실 연결 확인 필요",
  },
  {
    id: "pickup-event-004",
    orderNo: "A5-20260520-007",
    roomId: "room-704",
    customerName: "정*윤",
    productSummary: "퇴실 객실 테스트 상품",
    status: "exception",
    requestedAt: "2026-05-20T10:12:00+09:00",
    handledBy: "운영 확인",
    actionLabel: "퇴실 객실 차단 확인",
  },
];

export const nurseryDeliveryEvents: NurseryDeliveryEvent[] = [
  {
    id: "delivery-event-001",
    orderNo: "A5-20260520-004",
    roomId: "room-703-draft",
    customerName: "최*은",
    productSummary: "조리원 택배배송 테스트 상품",
    status: "label_created",
    carrierMock: "CJ대한통운 mock",
    trackingNoMasked: "CJ-****-004",
    requestedAt: "2026-05-20T09:52:00+09:00",
    updatedAt: "2026-05-20T10:10:00+09:00",
    blockerNote: "실제 배송조회 API 연결 금지",
  },
  {
    id: "delivery-event-002",
    orderNo: "A5-20260520-012",
    roomId: "room-705",
    customerName: "김*서",
    productSummary: "퇴실 후 택배 mock 상품",
    status: "shipping",
    carrierMock: "롯데택배 mock",
    trackingNoMasked: "LT-****-012",
    requestedAt: "2026-05-20T11:05:00+09:00",
    updatedAt: "2026-05-20T12:15:00+09:00",
    blockerNote: "배송조회는 blocker로 유지",
  },
  {
    id: "delivery-event-003",
    orderNo: "A5-20260520-018",
    roomId: "room-711",
    customerName: "박*린",
    productSummary: "산모 케어 택배 mock",
    status: "delivered",
    carrierMock: "우체국택배 mock",
    trackingNoMasked: "PO-****-018",
    requestedAt: "2026-05-20T12:40:00+09:00",
    updatedAt: "2026-05-20T15:20:00+09:00",
    blockerNote: "실제 배송완료 callback 없음",
  },
  {
    id: "delivery-event-004",
    orderNo: "A5-20260520-021",
    roomId: "room-714",
    customerName: "이*아",
    productSummary: "외부 재고 확인 필요 상품",
    status: "blocked",
    carrierMock: "배송사 미확정 mock",
    trackingNoMasked: "BLOCKED",
    requestedAt: "2026-05-20T13:25:00+09:00",
    updatedAt: "2026-05-20T13:25:00+09:00",
    blockerNote: "외부 재고 API/배송조회 연결 금지",
  },
];

export const nurseryQrReviewRows: NurseryQrReviewRow[] = [
  {
    id: "qr-review-001",
    shortCode: "SANHO701",
    qrSessionId: "qr-001",
    roomId: "room-701",
    tabletId: "tablet-701-a",
    status: "active",
    expiresAt: "2026-05-20T12:12:00+09:00",
    amount: 147000,
    source: "태블릿 장바구니",
  },
  {
    id: "qr-review-002",
    shortCode: "OLDQR22",
    qrSessionId: "qr-003",
    roomId: "room-702",
    tabletId: "tablet-702-a",
    status: "expired",
    expiresAt: "2026-05-18T23:14:00+09:00",
    amount: 39000,
    source: "만료된 현장수령",
  },
  {
    id: "qr-review-003",
    shortCode: "USED701",
    qrSessionId: "qr-used-701",
    roomId: "room-701",
    tabletId: "tablet-701-a",
    status: "used",
    expiresAt: "2026-05-19T18:28:00+09:00",
    amount: 147000,
    source: "결제 완료 mock",
  },
  {
    id: "qr-review-004",
    shortCode: "CXL702",
    qrSessionId: "qr-cancel-702",
    roomId: "room-702",
    tabletId: "tablet-702-a",
    status: "canceled",
    expiresAt: "2026-05-20T10:30:00+09:00",
    amount: 0,
    source: "고객 취소 mock",
  },
  {
    id: "qr-review-005",
    shortCode: "BLOCK704",
    qrSessionId: "qr-block-704",
    roomId: "room-704",
    tabletId: "tablet-704-a",
    status: "canceled",
    expiresAt: "2026-05-20T10:25:00+09:00",
    amount: 88000,
    source: "비활성 객실 차단 mock",
  },
  {
    id: "qr-review-006",
    shortCode: "FAILPAY",
    qrSessionId: "qr-failed-payment",
    roomId: "room-702",
    tabletId: "tablet-702-a",
    status: "payment_failed",
    expiresAt: "2026-05-20T11:15:00+09:00",
    amount: 56000,
    source: "결제 실패 mock",
  },
];

export const nurseryOrderHistoryRows: NurseryOrderHistoryRow[] = [
  {
    id: "order-history-001",
    orderNo: "A5-20260519-002",
    roomId: "room-701",
    customerName: "박*린",
    deliveryMethod: "pickup",
    status: "ready_for_pickup",
    amount: 147000,
    sourceQr: "SANHO701",
    createdAt: "2026-05-19T15:22:00+09:00",
  },
  {
    id: "order-history-002",
    orderNo: "A5-20260518-011",
    roomId: "room-702",
    customerName: "이*아",
    deliveryMethod: "pickup",
    status: "refund_requested",
    amount: 39000,
    sourceQr: "OLDQR22",
    createdAt: "2026-05-18T20:56:00+09:00",
  },
  {
    id: "order-history-003",
    orderNo: "A5-20260520-004",
    roomId: "room-703-draft",
    customerName: "최*은",
    deliveryMethod: "delivery",
    status: "pending_payment",
    amount: 88000,
    sourceQr: "DRAFT703",
    createdAt: "2026-05-20T09:48:00+09:00",
  },
  {
    id: "order-history-004",
    orderNo: "A5-20260520-007",
    roomId: "room-704",
    customerName: "정*윤",
    deliveryMethod: "pickup",
    status: "cancelled",
    amount: 88000,
    sourceQr: "BLOCK704",
    createdAt: "2026-05-20T10:12:00+09:00",
  },
];

export const nurseryOperationNotes: NurseryOperationNote[] = [
  {
    id: "note-room-guard",
    title: "객실 중복 방지",
    detail: "room_id는 불변 키로 유지하고 room_number 변경은 mock 저장 전 중복 검사를 먼저 표시합니다.",
    owner: "Nursery Admin",
    tone: "amber",
  },
  {
    id: "note-tablet-browser",
    title: "일반 브라우저 차단",
    detail: "운영 인증 전에는 실제 차단 로직 없이 태블릿 전용 접근 상태만 mock으로 노출합니다.",
    owner: "Firebase 계약 이후",
    tone: "red",
  },
  {
    id: "note-pickup",
    title: "현장수령 기록",
    detail: "수령 완료 처리는 pickup_events mock 행으로만 남기며 고객 알림톡은 연결하지 않습니다.",
    owner: "Front Desk",
    tone: "green",
  },
];

export const nurseryMockControls: NurseryMockControl[] = [
  {
    id: "control-room-create",
    title: "객실 추가/수정 mock",
    description: "room_id는 서버 발급 예정값으로 표시하고 room_number 중복 방지 흐름만 노출합니다.",
    fields: [
      {
        id: "room-number",
        label: "room_number",
        value: "703",
        helper: "같은 nursery_id 안에서 중복 검사 필요",
      },
      {
        id: "room-floor",
        label: "floor",
        value: "7F",
        helper: "객실 목록 정렬 기준",
      },
      {
        id: "room-pickup",
        label: "pickup_enabled",
        value: "false -> true",
        helper: "현장수령 가능 여부 mock 전환",
      },
    ],
    primaryAction: "객실 저장 mock",
    secondaryAction: "비활성 처리 mock",
  },
  {
    id: "control-tablet-pair",
    title: "태블릿 연결 mock",
    description: "실제 장치 인증 없이 tablet_id와 room_id 연결 상태만 확인합니다.",
    fields: [
      {
        id: "tablet-id",
        label: "tablet_id",
        value: "tablet-703-a-draft",
        helper: "페어링 전 임시 식별자",
      },
      {
        id: "tablet-room",
        label: "room_id",
        value: "room-703-draft",
        helper: "객실 확정 뒤 연결 가능",
      },
      {
        id: "tablet-access",
        label: "closed_mall_access",
        value: "blocked_mock",
        helper: "운영 인증 전 접근 차단 표시",
      },
    ],
    primaryAction: "태블릿 연결 mock",
    secondaryAction: "비활성 전환 mock",
  },
  {
    id: "control-pickup-complete",
    title: "수령 완료 처리 mock",
    description: "고객 알림 없이 pickup_events 상태 변경 예상값만 표시합니다.",
    fields: [
      {
        id: "pickup-order",
        label: "order_no",
        value: "A5-20260519-002",
        helper: "현장수령 대기 주문",
      },
      {
        id: "pickup-room",
        label: "room_id",
        value: "room-701",
        helper: "조리원 프론트 확인",
      },
      {
        id: "pickup-state",
        label: "pickup_status",
        value: "ready -> completed",
        helper: "실제 알림톡 전송 없음",
      },
    ],
    primaryAction: "수령 완료 mock",
    secondaryAction: "예외 메모 mock",
  },
  {
    id: "control-qr-order-search",
    title: "QR/주문 검색 mock",
    description: "nursery_id 범위 안에서 QR 코드, 객실, 주문번호로 검색하는 정적 베타 UI입니다.",
    fields: [
      {
        id: "search-nursery",
        label: "nursery_id",
        value: "nursery-gangnam-01",
        helper: "조리원 관리자 기본 scope",
      },
      {
        id: "search-qr",
        label: "short_code",
        value: "SANHO701",
        helper: "QR 세션 조회 mock",
      },
      {
        id: "search-order",
        label: "order_no",
        value: "A5-20260519-002",
        helper: "주문 이력 조회 mock",
      },
    ],
    primaryAction: "검색 mock",
    secondaryAction: "필터 초기화 mock",
  },
];

export const nurseryRiskStatuses: NurseryRiskStatus[] = [
  {
    id: "risk-tablet-offline",
    title: "태블릿 미접속",
    target: "tablet-704-a",
    level: "critical",
    detail: "마지막 접속이 오래된 태블릿입니다. 실제 장치 푸시나 원격 제어는 연결하지 않습니다.",
    route: "/nursery/tablets/detail",
  },
  {
    id: "risk-qr-expired-growth",
    title: "QR 만료 증가",
    target: "OLDQR22 / BLOCK704",
    level: "warning",
    detail: "2~3시간 만료 안내 대상이 증가한 mock 상태입니다. 서버 만료 job은 연결하지 않습니다.",
    route: "/nursery/qr-history/detail",
  },
  {
    id: "risk-pickup-long-wait",
    title: "현장수령 장기대기",
    target: "A5-20260519-002",
    level: "attention",
    detail: "수령 대기 시간이 긴 현장수령 건입니다. 알림톡 발송은 연결하지 않습니다.",
    route: "/nursery/pickups/detail",
  },
  {
    id: "risk-unassigned-tablet",
    title: "객실 미배정 태블릿",
    target: "tablet-703-a-draft",
    level: "warning",
    detail: "room_id가 draft 상태라 QR 생성이 차단된 mock 상태입니다.",
    route: "/nursery/tablets/access",
  },
  {
    id: "risk-payment-failed",
    title: "결제 실패 mock",
    target: "FAILPAY",
    level: "critical",
    detail: "실제 PG 호출 없이 결제 실패 상태만 QR 이력에 표시합니다.",
    route: "/nursery/qr-history/detail",
  },
  {
    id: "risk-room-704",
    title: "비활성 객실 QR 생성 시도",
    target: "room-704 / BLOCK704",
    level: "critical",
    detail: "퇴실 객실에서 QR 생성 시도가 감지된 mock 상태입니다. 실제 결제 진입은 연결하지 않습니다.",
    route: "/nursery/qr-history/detail",
  },
  {
    id: "risk-pickup-exception",
    title: "현장수령 예외",
    target: "A5-20260520-007",
    level: "attention",
    detail: "퇴실 객실 주문으로 표시되어 조리원 프론트 확인이 필요합니다.",
    route: "/nursery/pickups/detail",
  },
  {
    id: "risk-empty-search",
    title: "검색 결과 없음 상태",
    target: "room-999",
    level: "ok",
    detail: "검색 결과 없음/오류 상태 UI 확인용 mock 항목입니다.",
    route: "/nursery/orders/detail",
  },
];

export const nurseryBulkRoomPreview: NurseryBulkRoomPreview[] = [
  {
    id: "bulk-701",
    roomNumber: "701",
    roomIdPreview: "room-701",
    prefix: "7F",
    duplicateWarning: "기존 객실",
    linkedTabletPreview: "tablet-701-a",
    action: "건너뛰기 mock",
  },
  {
    id: "bulk-702",
    roomNumber: "702",
    roomIdPreview: "room-702",
    prefix: "7F",
    duplicateWarning: "기존 객실",
    linkedTabletPreview: "tablet-702-a",
    action: "건너뛰기 mock",
  },
  {
    id: "bulk-703",
    roomNumber: "703",
    roomIdPreview: "room-703",
    prefix: "7F",
    duplicateWarning: "중복 검토",
    linkedTabletPreview: "tablet-703-a-draft",
    action: "사람 확인 필요",
  },
  {
    id: "bulk-705",
    roomNumber: "705",
    roomIdPreview: "room-705",
    prefix: "7F",
    duplicateWarning: "신규 가능",
    linkedTabletPreview: "미배정",
    action: "등록 예정 mock",
  },
  {
    id: "bulk-706",
    roomNumber: "706",
    roomIdPreview: "room-706",
    prefix: "7F",
    duplicateWarning: "신규 가능",
    linkedTabletPreview: "미배정",
    action: "등록 예정 mock",
  },
];

export const nurseryTabletAccessRows: NurseryTabletAccessRow[] = [
  {
    id: "access-701",
    tabletId: "tablet-701-a",
    roomId: "room-701",
    sessionId: "tablet-session-701-active",
    browserPolicy: "태블릿 세션 허용 mock",
    roomBoundState: "room-bound",
    cartState: "장바구니 2건",
    expiresAt: "2026-05-20T13:42:00+09:00",
    riskLevel: "ok",
  },
  {
    id: "access-702",
    tabletId: "tablet-702-a",
    roomId: "room-702",
    sessionId: "tablet-session-702-review",
    browserPolicy: "일반 브라우저 차단 설계 필요",
    roomBoundState: "room-bound",
    cartState: "장바구니 없음",
    expiresAt: "2026-05-20T13:37:00+09:00",
    riskLevel: "warning",
  },
  {
    id: "access-703",
    tabletId: "tablet-703-a-draft",
    roomId: "room-703-draft",
    sessionId: "tablet-session-703-blocked",
    browserPolicy: "페어링 전 접근 차단 mock",
    roomBoundState: "not-bound",
    cartState: "cart 차단",
    expiresAt: "2026-05-20T11:10:00+09:00",
    riskLevel: "warning",
  },
  {
    id: "access-704",
    tabletId: "tablet-704-a",
    roomId: "room-704",
    sessionId: "tablet-session-704-expired",
    browserPolicy: "퇴실 객실 접근 차단 mock",
    roomBoundState: "blocked-room",
    cartState: "cart 폐기 예정 mock",
    expiresAt: "2026-05-19T18:40:00+09:00",
    riskLevel: "critical",
  },
];

export const nurseryPickupAuditLogs: NurseryPickupAuditLog[] = [
  {
    id: "pickup-audit-001",
    orderNo: "A5-20260519-002",
    actor: "프론트 데스크",
    action: "pickup_ready",
    at: "2026-05-19T15:35:00+09:00",
    detail: "상품 도착 확인 mock",
  },
  {
    id: "pickup-audit-002",
    orderNo: "A5-20260519-002",
    actor: "프론트 데스크",
    action: "pickup_complete_pending",
    at: "2026-05-19T16:10:00+09:00",
    detail: "수령완료 버튼 mock 표시",
  },
  {
    id: "pickup-audit-003",
    orderNo: "A5-20260520-007",
    actor: "운영 확인",
    action: "blocked_room_review",
    at: "2026-05-20T10:13:00+09:00",
    detail: "퇴실 객실 현장수령 차단 상태 표시",
  },
];

export const nurseryOrderItemSnapshots: NurseryOrderItemSnapshot[] = [
  {
    id: "pickup-item-001",
    orderNo: "A5-20260519-002",
    productName: "산모 회복 케어 키트",
    optionName: "선물 포장",
    quantity: 1,
    unitPrice: 75000,
    pickupStatus: "pickup_ready",
  },
  {
    id: "pickup-item-002",
    orderNo: "A5-20260519-002",
    productName: "수유맘 루이보스 티 세트",
    optionName: "20포",
    quantity: 2,
    unitPrice: 36000,
    pickupStatus: "pickup_ready",
  },
  {
    id: "pickup-item-003",
    orderNo: "A5-20260520-007",
    productName: "퇴실 객실 테스트 상품",
    optionName: "기본",
    quantity: 1,
    unitPrice: 88000,
    pickupStatus: "blocked_mock",
  },
];

export const nurserySearchPresets: NurserySearchPreset[] = [
  {
    id: "search-active-qr",
    label: "활성 QR",
    query: "status:active nursery_id:nursery-gangnam-01",
    scope: "QR 이력",
    sort: "expiresAt ASC",
    helper: "만료가 가까운 QR 먼저 확인",
  },
  {
    id: "search-pickup-ready",
    label: "수령 대기",
    query: "pickup_status:ready room_id:room-701",
    scope: "현장수령",
    sort: "requestedAt ASC",
    helper: "오래 기다린 현장수령 건 우선",
  },
  {
    id: "search-room-issues",
    label: "객실 이슈",
    query: "room_status:inactive OR duplicate_review",
    scope: "객실",
    sort: "lastEditedAt DESC",
    helper: "객실 중복/비활성 상태 점검",
  },
  {
    id: "search-order-risk",
    label: "주문 위험",
    query: "status:cancelled OR refund_requested",
    scope: "주문 이력",
    sort: "createdAt DESC",
    helper: "실제 환불/결제 연결 없이 위험 주문만 표시",
  },
];

export const nurseryStateScenarios: NurseryStateScenario[] = [
  {
    id: "state-empty-room",
    title: "검색 결과 없음",
    state: "empty",
    description: "room_id 또는 short_code가 현재 nursery_id 범위에 없을 때 표시합니다.",
    recoveryAction: "필터 초기화 mock",
    targetRoute: "/nursery/orders",
  },
  {
    id: "state-error-scope",
    title: "scope 불일치 오류",
    state: "error",
    description: "다른 조리원 room_id가 입력되면 저장 없이 오류 안내만 표시합니다.",
    recoveryAction: "nursery_id 확인",
    targetRoute: "/nursery/rooms",
  },
  {
    id: "state-loading-static",
    title: "목록 갱신 중",
    state: "loading",
    description: "실시간 연결 전까지 skeleton 대신 정적 상태 문구를 표시합니다.",
    recoveryAction: "mock 데이터 유지",
    targetRoute: "/nursery/dashboard",
  },
  {
    id: "state-ready-beta",
    title: "베타 표시 가능",
    state: "ready",
    description: "실제 저장/알림/결제 없이 목록 표시만 가능한 상태입니다.",
    recoveryAction: "운영 연결 차단 유지",
    targetRoute: "/nursery/tablets",
  },
];

export const nurseryDetailRecords: NurseryDetailRecord[] = [
  {
    id: "detail-room",
    kind: "room",
    title: "701호 객실 상세 mock",
    subtitle: "room-701 / nursery-gangnam-01",
    statusLabel: "활성",
    riskLevel: "ok",
    facts: [
      { label: "room_id", value: "room-701" },
      { label: "room_number", value: "701" },
      { label: "tablet_id", value: "tablet-701-a" },
      { label: "pickup_enabled", value: "true" },
    ],
    timeline: [
      {
        label: "객실 생성",
        at: "2026-05-18T09:00:00+09:00",
        detail: "mock 객실 등록",
      },
      {
        label: "태블릿 연결",
        at: "2026-05-19T09:20:00+09:00",
        detail: "tablet-701-a 연결 상태 표시",
      },
    ],
    blockedActions: ["실제 객실 저장", "고객정보 저장", "실시간 Firebase 동기화"],
  },
  {
    id: "detail-tablet",
    kind: "tablet",
    title: "태블릿 상세 mock",
    subtitle: "tablet-702-a / room-702",
    statusLabel: "활성",
    riskLevel: "warning",
    facts: [
      { label: "tablet_id", value: "tablet-702-a" },
      { label: "room_id", value: "room-702" },
      { label: "last_seen", value: "2026-05-20 09:37" },
      { label: "closed_mall_access", value: "allowed_mock" },
    ],
    timeline: [
      {
        label: "최근 접속",
        at: "2026-05-20T09:37:00+09:00",
        detail: "폐쇄몰 접근 허용 mock",
      },
      {
        label: "정책 대기",
        at: "2026-05-20T10:00:00+09:00",
        detail: "태블릿 식별 토큰 설계 필요",
      },
    ],
    blockedActions: ["실제 장치 인증", "App Check 연결", "브라우저 차단 실동작"],
  },
  {
    id: "detail-pickup",
    kind: "pickup",
    title: "현장수령 상세 mock",
    subtitle: "A5-20260519-002 / room-701",
    statusLabel: "수령 대기",
    riskLevel: "attention",
    facts: [
      { label: "order_no", value: "A5-20260519-002" },
      { label: "room_id", value: "room-701" },
      { label: "customer", value: "박*린" },
      { label: "pickup_status", value: "ready" },
    ],
    timeline: [
      {
        label: "결제 완료 mock",
        at: "2026-05-19T15:28:00+09:00",
        detail: "실제 PG 연결 없음",
      },
      {
        label: "프론트 확인 대기",
        at: "2026-05-19T15:35:00+09:00",
        detail: "수령 완료 처리 mock 가능",
      },
    ],
    blockedActions: ["알림톡 발송", "배송조회", "실제 수령 확정 저장"],
  },
  {
    id: "detail-qr",
    kind: "qr",
    title: "QR 세션 상세 mock",
    subtitle: "SANHO701 / qr-001",
    statusLabel: "활성",
    riskLevel: "ok",
    facts: [
      { label: "short_code", value: "SANHO701" },
      { label: "qr_session_id", value: "qr-001" },
      { label: "expires_at", value: "2026-05-20 12:12" },
      { label: "amount", value: "147,000 KRW" },
    ],
    timeline: [
      {
        label: "QR 생성",
        at: "2026-05-20T09:12:00+09:00",
        detail: "태블릿 장바구니 기준 생성 mock",
      },
      {
        label: "만료 예정",
        at: "2026-05-20T12:12:00+09:00",
        detail: "서버 만료 job 미연결",
      },
    ],
    blockedActions: ["실제 결제창 이동", "PG 승인", "서버 만료 job"],
  },
  {
    id: "detail-order",
    kind: "order",
    title: "주문 상세 mock",
    subtitle: "A5-20260520-007 / BLOCK704",
    statusLabel: "취소",
    riskLevel: "critical",
    facts: [
      { label: "order_no", value: "A5-20260520-007" },
      { label: "room_id", value: "room-704" },
      { label: "source_qr", value: "BLOCK704" },
      { label: "status", value: "cancelled" },
    ],
    timeline: [
      {
        label: "비활성 객실 감지",
        at: "2026-05-20T10:12:00+09:00",
        detail: "퇴실 객실의 QR 생성 시도 mock",
      },
      {
        label: "차단 표시",
        at: "2026-05-20T10:13:00+09:00",
        detail: "실제 결제 연결 없이 취소 상태로 표시",
      },
    ],
    blockedActions: ["실제 결제 취소", "환불 처리", "고객 알림"],
  },
];

const roomStatusCycle: NurseryRoomWorkflow["status"][] = [
  "active",
  "active",
  "active",
  "maintenance",
  "inactive",
  "blocked",
];

const tabletStatusCycle: NurseryTabletWorkflow["status"][] = [
  "active",
  "active",
  "maintenance",
  "inactive",
];

const tabletAccessCycle: NurseryTabletWorkflow["accessStatus"][] = [
  "allowed_mock",
  "allowed_mock",
  "needs_pairing",
  "blocked_browser_mock",
];

const qrStatusCycle: NurseryQrReviewRow["status"][] = [
  "active",
  "expired",
  "used",
  "canceled",
  "payment_failed",
];

const pickupStatusCycle: NurseryPickupEvent["status"][] = [
  "ready",
  "completed",
  "exception",
];

function padNumber(value: number) {
  return value.toString().padStart(3, "0");
}

function roomNumberFor(index: number) {
  return `${700 + index}`;
}

function roomIdFor(index: number) {
  return `room-${roomNumberFor(index)}`;
}

function tabletIdFor(index: number) {
  return `tablet-${roomNumberFor(index)}-a`;
}

export const nurseryGeneratedRooms: NurseryRoomWorkflow[] = Array.from({ length: 30 }, (_, index) => {
  const number = roomNumberFor(index + 1);
  const status = roomStatusCycle[index % roomStatusCycle.length];

  return {
    id: `generated-room-${number}`,
    roomId: `room-${number}`,
    roomNumber: number,
    floor: `${Math.floor(Number(number) / 100)}F`,
    status,
    pickupEnabled: status === "active" || status === "maintenance",
    linkedTabletId: status === "blocked" ? undefined : `tablet-${number}-a`,
    activeQrCount: status === "active" ? (index % 3) + 1 : 0,
    recentOrderNo: `A5-20260520-${padNumber(index + 1)}`,
    duplicateGuard: status === "blocked" ? "blocked 객실 QR 생성 차단" : "room_number 중복 없음",
    pendingAction: status === "maintenance" ? "점검 후 재활성화 mock" : "상태 변경 mock 가능",
    lastEditedAt: `2026-05-20T${(8 + (index % 10)).toString().padStart(2, "0")}:10:00+09:00`,
  };
});

export const nurseryGeneratedTablets: NurseryTabletWorkflow[] = Array.from({ length: 30 }, (_, index) => {
  const number = roomNumberFor(index + 1);
  const status = tabletStatusCycle[index % tabletStatusCycle.length];
  const accessStatus = tabletAccessCycle[index % tabletAccessCycle.length];

  return {
    id: `generated-tablet-${number}`,
    tabletId: `tablet-${number}-a`,
    roomId: status === "inactive" ? `room-${number}-draft` : `room-${number}`,
    status,
    accessStatus,
    lastSeenAt: `2026-05-20T${(7 + (index % 11)).toString().padStart(2, "0")}:35:00+09:00`,
    closedMallAccess: accessStatus === "allowed_mock" ? "허용 mock" : "차단/검토 mock",
    browserBlockMode: accessStatus === "blocked_browser_mock" ? "일반 브라우저 차단 mock" : "태블릿 세션 확인 mock",
    qrGeneratedCount: (index % 9) + 1,
    cartState: index % 4 === 0 ? "장바구니 2건" : index % 4 === 1 ? "장바구니 없음" : "cart 검토 mock",
    operatorNote: status === "maintenance" ? "점검 대상 태블릿" : "room-bound 상태 확인",
  };
});

export const nurseryGeneratedQrSessions: NurseryQrReviewRow[] = Array.from({ length: 50 }, (_, index) => {
  const roomIndex = (index % 30) + 1;
  const status = qrStatusCycle[index % qrStatusCycle.length];

  return {
    id: `generated-qr-${padNumber(index + 1)}`,
    shortCode: `NQR${padNumber(index + 1)}`,
    qrSessionId: `qr-generated-${padNumber(index + 1)}`,
    roomId: roomIdFor(roomIndex),
    tabletId: tabletIdFor(roomIndex),
    status,
    expiresAt: `2026-05-20T${(10 + (index % 8)).toString().padStart(2, "0")}:${((index * 7) % 60).toString().padStart(2, "0")}:00+09:00`,
    amount: 32000 + (index % 12) * 9000,
    source: status === "payment_failed" ? "결제 실패 mock" : "대량 QR mock",
  };
});

export const nurseryGeneratedOrders: NurseryOrderHistoryRow[] = Array.from({ length: 50 }, (_, index) => {
  const roomIndex = (index % 30) + 1;

  return {
    id: `generated-order-${padNumber(index + 1)}`,
    orderNo: `A5-20260520-${padNumber(index + 1)}`,
    roomId: roomIdFor(roomIndex),
    customerName: `${["김", "박", "이", "최", "정"][index % 5]}*${["린", "아", "윤", "은", "서"][index % 5]}`,
    deliveryMethod: index % 3 === 0 ? "delivery" : "pickup",
    status: index % 7 === 0 ? "refund_requested" : index % 5 === 0 ? "cancelled" : index % 3 === 0 ? "paid" : "ready_for_pickup",
    amount: 39000 + (index % 14) * 8000,
    sourceQr: `NQR${padNumber(index + 1)}`,
    createdAt: `2026-05-20T${(8 + (index % 10)).toString().padStart(2, "0")}:${((index * 5) % 60).toString().padStart(2, "0")}:00+09:00`,
  };
});

export const nurseryGeneratedPickupEvents: NurseryPickupEvent[] = Array.from({ length: 30 }, (_, index) => {
  const order = nurseryGeneratedOrders[index];
  const status = pickupStatusCycle[index % pickupStatusCycle.length];

  return {
    id: `generated-pickup-${padNumber(index + 1)}`,
    orderNo: order.orderNo,
    roomId: order.roomId,
    customerName: order.customerName,
    productSummary: index % 2 === 0 ? "산모 케어 상품 외 1건" : "조리원 현장수령 상품",
    status,
    requestedAt: order.createdAt,
    completedAt: status === "completed" ? `2026-05-20T${(10 + (index % 8)).toString().padStart(2, "0")}:55:00+09:00` : undefined,
    handledBy: status === "exception" ? "운영 확인" : "프론트 데스크",
    actionLabel: status === "ready" ? "수령완료 버튼 mock" : status === "completed" ? "완료 기록 보기" : "예외 확인 mock",
  };
});

const deliveryStatusCycle: NurseryDeliveryEvent["status"][] = [
  "label_created",
  "shipping",
  "delivered",
  "blocked",
];

export const nurseryGeneratedDeliveryEvents: NurseryDeliveryEvent[] = nurseryGeneratedOrders
  .filter((order) => order.deliveryMethod === "delivery")
  .slice(0, 20)
  .map((order, index) => {
    const status = deliveryStatusCycle[index % deliveryStatusCycle.length];

    return {
      id: `generated-delivery-${padNumber(index + 1)}`,
      orderNo: order.orderNo,
      roomId: order.roomId,
      customerName: order.customerName,
      productSummary: index % 2 === 0 ? "택배배송 상품 snapshot" : "퇴실 후 배송 상품 snapshot",
      status,
      carrierMock: ["CJ대한통운 mock", "롯데택배 mock", "우체국택배 mock", "배송사 미확정 mock"][index % 4],
      trackingNoMasked: status === "blocked" ? "BLOCKED" : `MOCK-****-${padNumber(index + 1)}`,
      requestedAt: order.createdAt,
      updatedAt: `2026-05-20T${(11 + (index % 7)).toString().padStart(2, "0")}:20:00+09:00`,
      blockerNote: status === "blocked" ? "배송조회/외부 재고 API blocker" : "배송조회 API 실제 호출 없음",
    };
  });

export const nurseryRoomOrderStats: NurseryRoomOrderStat[] = nurseryGeneratedRooms.slice(0, 20).map((room, index) => ({
  id: `room-stat-${room.roomNumber}`,
  roomId: room.roomId,
  roomNumber: room.roomNumber,
  orderCount: (index % 7) + 1,
  pickupCount: (index % 4) + 1,
  activeQrCount: room.activeQrCount,
  lastOrderNo: `A5-20260520-${padNumber(index + 1)}`,
  riskLevel: room.status === "blocked" ? "critical" : room.status === "maintenance" ? "warning" : "ok",
}));

export const nurseryTabletQrStats: NurseryTabletQrStat[] = nurseryGeneratedTablets.slice(0, 20).map((tablet, index) => ({
  id: `tablet-stat-${tablet.tabletId}`,
  tabletId: tablet.tabletId,
  roomId: tablet.roomId,
  qrCreated: tablet.qrGeneratedCount,
  qrExpired: index % 4,
  qrUsed: (index % 5) + 1,
  paymentFailed: index % 6 === 0 ? 1 : 0,
  cartState: tablet.cartState,
  riskLevel: tablet.accessStatus === "blocked_browser_mock" ? "critical" : tablet.accessStatus === "needs_pairing" ? "warning" : "ok",
}));

export const nurseryUnifiedSearchResults: NurseryUnifiedSearchResult[] = [
  {
    id: "search-room-701",
    type: "room",
    keyword: "701",
    title: "701호 객실",
    status: "active",
    route: "/nursery/rooms/detail",
    helper: "객실/태블릿/QR/주문 통합 결과",
  },
  {
    id: "search-tablet-702",
    type: "tablet",
    keyword: "tablet-702-a",
    title: "tablet-702-a",
    status: "active",
    route: "/nursery/tablets/detail",
    helper: "room-702에 연결된 태블릿",
  },
  {
    id: "search-order-002",
    type: "order",
    keyword: "A5-20260519-002",
    title: "현장수령 대기 주문",
    status: "ready_for_pickup",
    route: "/nursery/orders/detail",
    helper: "박*린 / room-701",
  },
  {
    id: "search-qr-failpay",
    type: "qr",
    keyword: "FAILPAY",
    title: "결제 실패 QR mock",
    status: "payment_failed",
    route: "/nursery/qr-history/detail",
    helper: "실제 PG 호출 없음",
  },
  {
    id: "search-pickup-long",
    type: "pickup",
    keyword: "pickup ready",
    title: "현장수령 장기대기",
    status: "ready",
    route: "/nursery/pickups/detail",
    helper: "알림톡 발송 없이 상태만 표시",
  },
];

export const nurseryPaginationSnapshots: NurseryPaginationSnapshot[] = [
  {
    id: "page-rooms",
    label: "객실 목록",
    page: 1,
    pageSize: 10,
    total: nurseryGeneratedRooms.length,
    sort: "room_number ASC",
    filter: "status:any",
  },
  {
    id: "page-tablets",
    label: "태블릿 목록",
    page: 1,
    pageSize: 10,
    total: nurseryGeneratedTablets.length,
    sort: "lastSeenAt DESC",
    filter: "access:any",
  },
  {
    id: "page-qr",
    label: "QR 이력",
    page: 1,
    pageSize: 10,
    total: nurseryGeneratedQrSessions.length,
    sort: "expiresAt ASC",
    filter: "status:any",
  },
  {
    id: "page-orders",
    label: "주문 이력",
    page: 1,
    pageSize: 10,
    total: nurseryGeneratedOrders.length,
    sort: "createdAt DESC",
    filter: "delivery:any",
  },
  {
    id: "page-pickups",
    label: "현장수령",
    page: 1,
    pageSize: 10,
    total: nurseryGeneratedPickupEvents.length,
    sort: "requestedAt ASC",
    filter: "ready",
  },
];
