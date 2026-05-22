import type {
  CompanyDailySales,
  CompanyDetailEvent,
  CompanyDeliveryEvent,
  CompanyEmptyStateSpec,
  CompanyErrorStateSpec,
  CompanyExternalInventoryMapping,
  CompanyFilterPreset,
  CompanyInventoryMovement,
  CompanyKpi,
  CompanyOrder,
  CompanyOrderLine,
  CompanyPayout,
  CompanyPickupEvent,
  CompanyPriceChange,
  CompanyProduct,
  CompanyProductOption,
  CompanyProfile,
  CompanyRefundRequest,
  CompanyRiskItem,
  CompanySalesBreakdown,
  CompanySettlement,
  CompanyAuditLog,
  CompanyNotificationSetting,
  CompanyUserAccess,
  CompanyWorkQueueItem,
} from "@/types/company";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";

export const companyProfile: CompanyProfile = {
  id: "company_sanho_luxury_001",
  name: "산호케어",
  managerName: "김서윤",
  managerEmail: "ops@sanho-care.example",
  status: "approved",
  commissionRate: 12,
  settlementAccountMasked: "신한 110-***-482911",
  defaultReturnPolicy: "상품 출고 전 취소 가능, 출고 후 반품은 운영자 승인 mock",
};

export const companyProducts: CompanyProduct[] = [
  {
    id: "product-care-kit",
    companyId: companyProfile.id,
    brand: "Sanho Care",
    name: "산모 회복 케어 키트",
    category: "산모 케어",
    status: "approved",
    normalPrice: 89000,
    closedMallPrice: 69000,
    platformLowestPrice: 76000,
    priceComparisonStatus: "valid_mock",
    stockTotal: 27,
    imagePlaceholder: "Storage 미연결 placeholder",
    description: "산후 회복용 소모품을 묶은 폐쇄몰 전용 구성입니다.",
    deliveryAvailable: true,
    pickupAvailable: true,
    refundGuide: "출고 전 취소 가능, 출고 후 단순 변심은 관리자 검토 mock",
    externalProductCode: "EXT-CARE-001",
    approvalRequestedAt: "2026-05-17T09:10:00+09:00",
    storageState: "placeholder_only",
  },
  {
    id: "product-robe",
    companyId: companyProfile.id,
    brand: "Lounge Mom",
    name: "수유 라운지 로브",
    category: "의류",
    status: "needs_reapproval",
    normalPrice: 69000,
    closedMallPrice: 54000,
    platformLowestPrice: 62000,
    priceComparisonStatus: "needs_update",
    stockTotal: 11,
    imagePlaceholder: "GIF/이미지 업로드 대기",
    description: "수유실과 객실에서 입기 쉬운 라운지 로브 mock 상품입니다.",
    deliveryAvailable: true,
    pickupAvailable: false,
    refundGuide: "착용 상품 특성상 수령 후 환불은 검수 필요",
    externalProductCode: "EXT-ROBE-204",
    approvalRequestedAt: "2026-05-19T14:45:00+09:00",
    reapprovalReason: "폐쇄몰가 변경으로 재승인 필요",
    storageState: "placeholder_only",
  },
  {
    id: "product-pillow",
    companyId: companyProfile.id,
    brand: "Posture Lab",
    name: "수유 자세 서포트 필로우",
    category: "산모 케어",
    status: "approved",
    normalPrice: 79000,
    closedMallPrice: 58000,
    platformLowestPrice: 68000,
    priceComparisonStatus: "valid_mock",
    stockTotal: 24,
    imagePlaceholder: "대표 이미지 mock",
    description: "수유 자세를 편하게 잡아주는 쿠션형 mock 상품입니다.",
    deliveryAvailable: true,
    pickupAvailable: true,
    refundGuide: "개봉 전 환불 가능 mock",
    externalProductCode: "EXT-PILLOW-031",
    approvalRequestedAt: "2026-05-16T11:20:00+09:00",
    storageState: "mock_uploaded",
  },
  {
    id: "product-cream",
    companyId: companyProfile.id,
    brand: "Pure Mom",
    name: "저자극 바디 크림 세트",
    category: "스킨케어",
    status: "draft",
    normalPrice: 62000,
    closedMallPrice: 48500,
    platformLowestPrice: 53000,
    priceComparisonStatus: "blocked_external_check",
    stockTotal: 0,
    imagePlaceholder: "등록 전 placeholder",
    description: "민감 피부용 바디 크림 등록 초안입니다.",
    deliveryAvailable: true,
    pickupAvailable: false,
    refundGuide: "화장품류 환불 정책 확인 필요",
    storageState: "placeholder_only",
  },
  {
    id: "product-band",
    companyId: companyProfile.id,
    brand: "Recovery Fit",
    name: "복부 회복 밴드",
    category: "산모 케어",
    status: "rejected",
    normalPrice: 52000,
    closedMallPrice: 41000,
    platformLowestPrice: 45000,
    priceComparisonStatus: "needs_update",
    stockTotal: 8,
    imagePlaceholder: "반려 이미지 재확인 필요",
    description: "복부 회복 보조용 밴드 mock 상품입니다.",
    deliveryAvailable: true,
    pickupAvailable: true,
    refundGuide: "착용 흔적 여부 확인 후 환불 검토",
    externalProductCode: "EXT-BAND-042",
    approvalRequestedAt: "2026-05-18T10:30:00+09:00",
    rejectionReason: "의료효능 표현 문구 삭제 필요",
    storageState: "placeholder_only",
  },
  {
    id: "product-oil",
    companyId: companyProfile.id,
    brand: "Calm Studio",
    name: "릴랙스 마사지 오일",
    category: "스킨케어",
    status: "suspended",
    normalPrice: 45000,
    closedMallPrice: 36000,
    platformLowestPrice: 41000,
    priceComparisonStatus: "blocked_external_check",
    stockTotal: 6,
    imagePlaceholder: "위험 문구 검수 전 placeholder",
    description: "성분 고지 확인 전까지 판매중지 처리한 mock 상품입니다.",
    deliveryAvailable: true,
    pickupAvailable: false,
    refundGuide: "미개봉 상태만 환불 가능 mock",
    externalProductCode: "EXT-OIL-015",
    approvalRequestedAt: "2026-05-20T08:50:00+09:00",
    rejectionReason: "성분 고지와 사용 주의 문구 확인 필요",
    storageState: "placeholder_only",
  },
];

export const companyProductOptions: CompanyProductOption[] = [
  {
    id: "opt-care-basic",
    productId: "product-care-kit",
    name: "기본 구성",
    sku: "CARE-KIT-BASIC",
    stock: 18,
    safetyStock: 8,
    priceDelta: 0,
    saleState: "on_sale",
    externalSkuCode: "EXT-CARE-001-A",
    externalMappingStatus: "mapped_mock",
  },
  {
    id: "opt-care-premium",
    productId: "product-care-kit",
    name: "프리미엄 구성",
    sku: "CARE-KIT-PREMIUM",
    stock: 9,
    safetyStock: 6,
    priceDelta: 6000,
    saleState: "on_sale",
    externalSkuCode: "EXT-CARE-001-B",
    externalMappingStatus: "mapped_mock",
  },
  {
    id: "opt-robe-m",
    productId: "product-robe",
    name: "M",
    sku: "ROBE-M",
    stock: 7,
    safetyStock: 5,
    priceDelta: 0,
    saleState: "on_sale",
    externalSkuCode: "EXT-ROBE-204-M",
    externalMappingStatus: "mapped_mock",
  },
  {
    id: "opt-robe-l",
    productId: "product-robe",
    name: "L",
    sku: "ROBE-L",
    stock: 4,
    safetyStock: 5,
    priceDelta: 0,
    saleState: "out_of_stock",
    externalSkuCode: "EXT-ROBE-204-L",
    externalMappingStatus: "blocked_external_api",
  },
  {
    id: "opt-pillow-basic",
    productId: "product-pillow",
    name: "단품",
    sku: "PILLOW-BASIC",
    stock: 16,
    safetyStock: 8,
    priceDelta: 0,
    saleState: "on_sale",
    externalSkuCode: "EXT-PILLOW-031-A",
    externalMappingStatus: "mapped_mock",
  },
  {
    id: "opt-pillow-cover",
    productId: "product-pillow",
    name: "커버 추가",
    sku: "PILLOW-COVER",
    stock: 8,
    safetyStock: 5,
    priceDelta: 9000,
    saleState: "on_sale",
    externalMappingStatus: "needs_mapping",
  },
  {
    id: "opt-band-m",
    productId: "product-band",
    name: "M",
    sku: "BAND-M",
    stock: 5,
    safetyStock: 6,
    priceDelta: 0,
    saleState: "sales_suspended",
    externalSkuCode: "EXT-BAND-042-M",
    externalMappingStatus: "needs_mapping",
  },
  {
    id: "opt-band-l",
    productId: "product-band",
    name: "L",
    sku: "BAND-L",
    stock: 3,
    safetyStock: 6,
    priceDelta: 0,
    saleState: "sales_suspended",
    externalMappingStatus: "blocked_external_api",
  },
  {
    id: "opt-oil-100",
    productId: "product-oil",
    name: "100ml",
    sku: "OIL-100",
    stock: 4,
    safetyStock: 6,
    priceDelta: 0,
    saleState: "sales_suspended",
    externalSkuCode: "EXT-OIL-015-100",
    externalMappingStatus: "blocked_external_api",
  },
  {
    id: "opt-oil-200",
    productId: "product-oil",
    name: "200ml",
    sku: "OIL-200",
    stock: 2,
    safetyStock: 5,
    priceDelta: 8000,
    saleState: "sales_suspended",
    externalMappingStatus: "needs_mapping",
  },
];

export const companyInventoryMovements: CompanyInventoryMovement[] = [
  {
    id: "inv-001",
    productId: "product-care-kit",
    optionId: "opt-care-basic",
    type: "initial",
    quantity: 20,
    memo: "베타 seed 재고",
    createdAt: "2026-05-18T09:00:00+09:00",
  },
  {
    id: "inv-002",
    productId: "product-care-kit",
    optionId: "opt-care-premium",
    type: "order_reserved_mock",
    quantity: -1,
    memo: "A5-20260519-002 주문 예약",
    createdAt: "2026-05-19T15:22:00+09:00",
  },
  {
    id: "inv-003",
    productId: "product-robe",
    optionId: "opt-robe-l",
    type: "external_sync_mock_blocked",
    quantity: 0,
    memo: "외부 명품몰 재고 API 연결 금지, mock 상태만 표시",
    createdAt: "2026-05-19T16:20:00+09:00",
  },
  {
    id: "inv-004",
    productId: "product-pillow",
    optionId: "opt-pillow-cover",
    type: "manual_adjustment_mock",
    quantity: 2,
    memo: "관리자 수동 보정 mock",
    createdAt: "2026-05-20T10:10:00+09:00",
  },
  {
    id: "inv-005",
    productId: "product-care-kit",
    optionId: "opt-care-basic",
    type: "order_confirmed_mock",
    quantity: -1,
    memo: "A5-20260520-005 결제완료 mock 확정",
    createdAt: "2026-05-20T11:16:00+09:00",
  },
  {
    id: "inv-006",
    productId: "product-band",
    optionId: "opt-band-m",
    type: "cancel_restore_mock",
    quantity: 1,
    memo: "환불 요청 검토 중 재고 복구 예정 mock",
    createdAt: "2026-05-20T13:20:00+09:00",
  },
];

export const companyOrders: CompanyOrder[] = [
  {
    id: "order-002",
    orderNo: "A5-20260519-002",
    customerNameMasked: "박*리",
    customerPhoneMasked: "010-****-7811",
    nurseryName: "강남 산후조리원",
    roomName: "701호",
    status: "ready_for_pickup",
    deliveryMethod: "pickup",
    orderedAt: "2026-05-19T15:22:00+09:00",
    paidAt: "2026-05-19T15:28:00+09:00",
    totalAmount: 75000,
  },
  {
    id: "order-004",
    orderNo: "A5-20260520-004",
    customerNameMasked: "이*윤",
    customerPhoneMasked: "010-****-1134",
    nurseryName: "분당 산후케어",
    roomName: "502호",
    status: "invoice_pending",
    deliveryMethod: "delivery",
    orderedAt: "2026-05-20T09:40:00+09:00",
    paidAt: "2026-05-20T09:43:00+09:00",
    totalAmount: 58000,
  },
  {
    id: "order-005",
    orderNo: "A5-20260520-005",
    customerNameMasked: "정*아",
    customerPhoneMasked: "010-****-9041",
    nurseryName: "강남 산후조리원",
    roomName: "705호",
    status: "preparing",
    deliveryMethod: "delivery",
    orderedAt: "2026-05-20T11:15:00+09:00",
    paidAt: "2026-05-20T11:16:00+09:00",
    totalAmount: 69000,
  },
  {
    id: "order-006",
    orderNo: "A5-20260520-006",
    customerNameMasked: "최*원",
    customerPhoneMasked: "010-****-2710",
    nurseryName: "송도 마더스테이",
    roomName: "803호",
    status: "refund_requested",
    deliveryMethod: "delivery",
    orderedAt: "2026-05-20T12:20:00+09:00",
    paidAt: "2026-05-20T12:21:00+09:00",
    totalAmount: 41000,
  },
  {
    id: "order-007",
    orderNo: "A5-20260520-007",
    customerNameMasked: "한*별",
    customerPhoneMasked: "010-****-6620",
    nurseryName: "송도 마더스테이",
    roomName: "806호",
    status: "shipping",
    deliveryMethod: "delivery",
    orderedAt: "2026-05-20T14:05:00+09:00",
    paidAt: "2026-05-20T14:06:00+09:00",
    totalAmount: 44000,
  },
];

export const companyOrderLines: CompanyOrderLine[] = [
  {
    id: "line-002-a",
    orderId: "order-002",
    orderNo: "A5-20260519-002",
    productId: "product-care-kit",
    productName: "산모 회복 케어 키트",
    optionName: "프리미엄 구성",
    quantity: 1,
    unitPrice: 75000,
    settlementAmount: 66000,
    deliveryMethod: "pickup",
    deliveryStatus: "ready_for_pickup",
    pickupCode: "PICK-701",
  },
  {
    id: "line-004-a",
    orderId: "order-004",
    orderNo: "A5-20260520-004",
    productId: "product-pillow",
    productName: "수유 자세 서포트 필로우",
    optionName: "단품",
    quantity: 1,
    unitPrice: 58000,
    settlementAmount: 51040,
    deliveryMethod: "delivery",
    deliveryStatus: "invoice_pending",
  },
  {
    id: "line-005-a",
    orderId: "order-005",
    orderNo: "A5-20260520-005",
    productId: "product-care-kit",
    productName: "산모 회복 케어 키트",
    optionName: "기본 구성",
    quantity: 1,
    unitPrice: 69000,
    settlementAmount: 60720,
    deliveryMethod: "delivery",
    deliveryStatus: "preparing",
  },
  {
    id: "line-006-a",
    orderId: "order-006",
    orderNo: "A5-20260520-006",
    productId: "product-band",
    productName: "복부 회복 밴드",
    optionName: "M",
    quantity: 1,
    unitPrice: 41000,
    settlementAmount: 36080,
    deliveryMethod: "delivery",
    deliveryStatus: "refund_requested",
  },
  {
    id: "line-007-a",
    orderId: "order-007",
    orderNo: "A5-20260520-007",
    productId: "product-oil",
    productName: "릴랙스 마사지 오일",
    optionName: "200ml",
    quantity: 1,
    unitPrice: 44000,
    settlementAmount: 38720,
    deliveryMethod: "delivery",
    deliveryStatus: "shipping",
    invoiceNo: "CJ-4488-0011",
  },
];

export const companyDeliveryEvents: CompanyDeliveryEvent[] = [
  {
    id: "delivery-004-ready",
    orderLineId: "line-004-a",
    orderNo: "A5-20260520-004",
    courierName: "CJ대한통운 mock",
    invoiceNo: "read-only input",
    status: "invoice_ready_mock",
    occurredAt: "2026-05-20T10:00:00+09:00",
    memo: "송장 입력 UI만 제공, 저장/조회 없음",
  },
  {
    id: "delivery-007-blocked",
    orderLineId: "line-007-a",
    orderNo: "A5-20260520-007",
    courierName: "CJ대한통운 mock",
    invoiceNo: "CJ-4488-0011",
    status: "tracking_blocked",
    occurredAt: "2026-05-20T14:25:00+09:00",
    memo: "배송조회 API 호출 금지",
  },
];

export const companyPickupEvents: CompanyPickupEvent[] = [
  {
    id: "pickup-002-ready",
    orderLineId: "line-002-a",
    orderNo: "A5-20260519-002",
    nurseryName: "강남 산후조리원",
    roomName: "701호",
    customerNameMasked: "박*리",
    productName: "산모 회복 케어 키트 / 프리미엄 구성",
    status: "waiting",
    handledBy: "nursery pickup desk mock",
  },
  {
    id: "pickup-002-done-sample",
    orderLineId: "line-002-a",
    orderNo: "A5-20260519-002",
    nurseryName: "강남 산후조리원",
    roomName: "701호",
    customerNameMasked: "박*리",
    productName: "산모 회복 케어 키트 / 프리미엄 구성",
    status: "picked_up_mock",
    handledBy: "company operator mock",
    handledAt: "2026-05-20T16:00:00+09:00",
  },
];

export const companyExternalInventoryMappings: CompanyExternalInventoryMapping[] = [
  {
    id: "map-care-basic",
    productId: "product-care-kit",
    optionId: "opt-care-basic",
    externalProductId: "EXT-CARE-001",
    externalSku: "EXT-CARE-001-A",
    lastSyncStatus: "mapped_mock",
    blockedReason: "mock mapped, no live sync",
    lastSyncAt: "2026-05-20T09:00:00+09:00",
  },
  {
    id: "map-robe-l",
    productId: "product-robe",
    optionId: "opt-robe-l",
    externalProductId: "EXT-ROBE-204",
    externalSku: "EXT-ROBE-204-L",
    lastSyncStatus: "external_sync_mock_blocked",
    blockedReason: "external inventory API disabled",
    lastSyncAt: "2026-05-19T16:20:00+09:00",
  },
  {
    id: "map-oil-200",
    productId: "product-oil",
    optionId: "opt-oil-200",
    externalProductId: "EXT-OIL-015",
    externalSku: "pending",
    lastSyncStatus: "needs_mapping",
    blockedReason: "external_sku decision required",
  },
];

export const companySettlements: CompanySettlement[] = [
  {
    id: "settlement-202605-w3",
    period: "2026-05 3주차",
    status: "review",
    grossAmount: 202000,
    commissionAmount: 24240,
    refundHoldAmount: 41000,
    payoutAmount: 136760,
    scheduledPayoutDate: "2026-05-27",
  },
  {
    id: "settlement-202605-w3-scheduled",
    period: "2026-05 3주차 예약",
    status: "payout_scheduled_mock",
    grossAmount: 161000,
    commissionAmount: 19320,
    refundHoldAmount: 0,
    payoutAmount: 141680,
    scheduledPayoutDate: "2026-05-29",
  },
  {
    id: "settlement-202605-w2",
    period: "2026-05 2주차",
    status: "confirmed_mock",
    grossAmount: 184000,
    commissionAmount: 22080,
    refundHoldAmount: 0,
    payoutAmount: 161920,
    scheduledPayoutDate: "2026-05-22",
  },
  {
    id: "settlement-202605-w1",
    period: "2026-05 1주차",
    status: "paid_mock",
    grossAmount: 128000,
    commissionAmount: 15360,
    refundHoldAmount: 0,
    payoutAmount: 112640,
    scheduledPayoutDate: "2026-05-15",
  },
  {
    id: "settlement-real-payout-block",
    period: "운영 지급 차단",
    status: "blocked_real_payout",
    grossAmount: 0,
    commissionAmount: 0,
    refundHoldAmount: 0,
    payoutAmount: 0,
    scheduledPayoutDate: "blocked",
  },
];

export const companyPayouts: CompanyPayout[] = [
  {
    id: "payout-202605-w3",
    settlementId: "settlement-202605-w3",
    status: "scheduled_mock",
    amount: 136760,
    bankAccountMasked: companyProfile.settlementAccountMasked,
    scheduledAt: "2026-05-27T11:00:00+09:00",
  },
  {
    id: "payout-202605-w1",
    settlementId: "settlement-202605-w1",
    status: "paid_mock",
    amount: 112640,
    bankAccountMasked: companyProfile.settlementAccountMasked,
    scheduledAt: "2026-05-15T11:00:00+09:00",
  },
  {
    id: "payout-real-blocked",
    settlementId: "settlement-real-payout-block",
    status: "blocked_real_payout",
    amount: 0,
    bankAccountMasked: companyProfile.settlementAccountMasked,
    scheduledAt: "blocked",
    blockedReason: "Actual payout is disabled in mock/test beta.",
  },
];

export const companyRefundRequests: CompanyRefundRequest[] = [
  {
    id: "refund-006",
    orderNo: "A5-20260520-006",
    productName: "복부 회복 밴드 / M",
    requesterMasked: "최*원",
    reason: "사이즈 교환 요청 후 반품 전환",
    status: "company_review",
    requestedAt: "2026-05-20T13:10:00+09:00",
    refundAmount: 41000,
    companyReviewMemo: "의료효능 문구 반려 상품과 연결되어 운영자 확인 필요",
  },
  {
    id: "refund-004",
    orderNo: "A5-20260520-004",
    productName: "수유 자세 서포트 필로우 / 단품",
    requesterMasked: "이*윤",
    reason: "배송 전 단순 변심",
    status: "requested",
    requestedAt: "2026-05-20T14:20:00+09:00",
    refundAmount: 58000,
    companyReviewMemo: "송장 미입력 상태라 mock 승인 가능",
  },
];

export const companyDailySales: CompanyDailySales[] = [
  { date: "2026-05-18", orderCount: 1, grossAmount: 69000, payoutEstimate: 60720 },
  { date: "2026-05-19", orderCount: 1, grossAmount: 75000, payoutEstimate: 66000 },
  { date: "2026-05-20", orderCount: 4, grossAmount: 212000, payoutEstimate: 186560 },
];

export const companySalesBreakdowns: CompanySalesBreakdown[] = [
  {
    id: "sales-period-20260520",
    label: "2026-05-20",
    group: "period",
    orderCount: 4,
    grossAmount: 212000,
    payoutEstimate: 186560,
  },
  {
    id: "sales-product-care",
    label: "산모 회복 케어 키트",
    group: "product",
    orderCount: 2,
    grossAmount: 144000,
    payoutEstimate: 126720,
  },
  {
    id: "sales-product-pillow",
    label: "수유 자세 서포트 필로우",
    group: "product",
    orderCount: 1,
    grossAmount: 58000,
    payoutEstimate: 51040,
  },
  {
    id: "sales-nursery-gangnam",
    label: "강남 산후조리원",
    group: "nursery",
    orderCount: 2,
    grossAmount: 144000,
    payoutEstimate: 126720,
  },
  {
    id: "sales-status-refund",
    label: "환불요청",
    group: "order_status",
    orderCount: 1,
    grossAmount: 41000,
    payoutEstimate: 36080,
  },
];

export const companyUserAccessList: CompanyUserAccess[] = [
  {
    id: "user-company-admin-01",
    companyId: companyProfile.id,
    name: "김서윤",
    emailMasked: "k**@sanho-care.example",
    role: "COMPANY_ADMIN",
    status: "active_mock",
    lastSeenAt: "2026-05-20T16:10:00+09:00",
    permissionSummary: "상품, 재고, 주문, 배송, 정산 mock 조회/요청 가능",
  },
  {
    id: "user-company-ops-02",
    companyId: companyProfile.id,
    name: "운영 스태프",
    emailMasked: "o**@sanho-care.example",
    role: "COMPANY_STAFF_OPERATOR",
    status: "invited_mock",
    permissionSummary: "송장 입력 mock, 현장수령 처리 mock만 허용 예정",
  },
  {
    id: "user-company-viewer-03",
    companyId: companyProfile.id,
    name: "정산 조회자",
    emailMasked: "f**@sanho-care.example",
    role: "COMPANY_STAFF_VIEWER",
    status: "suspended_mock",
    permissionSummary: "읽기 전용 권한 mock, 실제 Auth 미연결",
  },
];

export const companyPriceChanges: CompanyPriceChange[] = [
  {
    id: "price-change-robe-001",
    productId: "product-robe",
    beforePrice: 62000,
    afterPrice: 54000,
    status: "needs_reapproval",
    requestedAt: "2026-05-19T14:45:00+09:00",
    reason: "Closed mall price lowered after first approval.",
  },
  {
    id: "price-change-care-001",
    productId: "product-care-kit",
    beforePrice: 72000,
    afterPrice: 69000,
    status: "approved_mock",
    requestedAt: "2026-05-17T09:10:00+09:00",
    reason: "Launch discount mock approved.",
  },
  {
    id: "price-change-band-001",
    productId: "product-band",
    beforePrice: 45000,
    afterPrice: 41000,
    status: "rejected_mock",
    requestedAt: "2026-05-18T10:30:00+09:00",
    reason: "Rejected while compliance wording is unresolved.",
  },
];

export const companyNotificationSettings: CompanyNotificationSetting[] = [
  {
    id: "notify-product-approval",
    channel: "dashboard_only",
    event: "product_approval",
    enabledMock: true,
  },
  {
    id: "notify-order-created",
    channel: "email_mock",
    event: "order_created",
    enabledMock: true,
  },
  {
    id: "notify-delivery-waiting",
    channel: "alimtalk_blocked",
    event: "delivery_waiting",
    enabledMock: false,
    blockedReason: "Alimtalk sending is disabled in mock beta.",
  },
  {
    id: "notify-refund-requested",
    channel: "dashboard_only",
    event: "refund_requested",
    enabledMock: true,
  },
  {
    id: "notify-payout-ready",
    channel: "sms_mock",
    event: "payout_ready",
    enabledMock: false,
    blockedReason: "Real SMS/Alimtalk policy is not approved.",
  },
];

export const companyAuditLogs: CompanyAuditLog[] = [
  {
    id: "audit-company-001",
    actor: "김서윤",
    role: "COMPANY_ADMIN",
    action: "product_price_change_requested_mock",
    targetType: "product",
    targetId: "product-robe",
    createdAt: "2026-05-19T14:45:00+09:00",
    message: "Closed mall price changed and needs reapproval.",
  },
  {
    id: "audit-company-002",
    actor: "SYSTEM_MOCK",
    role: "SYSTEM_MOCK",
    action: "external_sync_blocked",
    targetType: "inventory",
    targetId: "opt-robe-l",
    createdAt: "2026-05-19T16:20:00+09:00",
    message: "External inventory API call blocked by mock mode.",
  },
  {
    id: "audit-company-003",
    actor: "운영 스태프",
    role: "COMPANY_STAFF_OPERATOR",
    action: "invoice_input_viewed_mock",
    targetType: "order",
    targetId: "order-007",
    createdAt: "2026-05-20T14:25:00+09:00",
    message: "Invoice field displayed as read-only mock.",
  },
  {
    id: "audit-company-004",
    actor: "김서윤",
    role: "COMPANY_ADMIN",
    action: "refund_review_opened_mock",
    targetType: "refund",
    targetId: "refund-006",
    createdAt: "2026-05-20T13:10:00+09:00",
    message: "Refund review opened, PG refund disabled.",
  },
];

export const companyRiskItems: CompanyRiskItem[] = [
  {
    id: "risk-storage-placeholder",
    title: "상품 이미지 Storage 미연결",
    severity: "medium",
    status: "blocked",
    owner: "firebase-contract",
    surface: "product",
    detail: "이미지/GIF는 placeholder만 노출하며 실제 Storage 업로드는 정책 확정 전까지 차단합니다.",
  },
  {
    id: "risk-external-stock-api",
    title: "외부 재고 API 차단",
    severity: "high",
    status: "blocked",
    owner: "company",
    surface: "inventory",
    detail: "외부 명품몰 재고 코드는 mock 매핑 상태만 표시하고 실제 호출은 수행하지 않습니다.",
  },
  {
    id: "risk-delivery-tracking",
    title: "배송조회 API 미연결",
    severity: "medium",
    status: "watching",
    owner: "qa",
    surface: "delivery",
    detail: "송장번호 입력은 read-only mock이며 배송조회, 알림톡, webhook은 BLOCKERS에 남겼습니다.",
  },
  {
    id: "risk-refund-pg",
    title: "PG 환불/부분취소 차단",
    severity: "high",
    status: "blocked",
    owner: "firebase-contract",
    surface: "refund",
    detail: "환불 검토 화면은 상태 표시만 제공하고 실제 PG 취소 또는 지급을 실행하지 않습니다.",
  },
  {
    id: "risk-payout-approval",
    title: "정산 확정 권한 미정",
    severity: "high",
    status: "open",
    owner: "admin",
    surface: "settlement",
    detail: "정산 대기, 확정, 입금 완료는 mock 상태이며 승인 권한과 audit log 계약이 필요합니다.",
  },
];

export const companyFilterPresets: CompanyFilterPreset[] = [
  {
    id: "filter-products-pending",
    label: "승인 대기 상품",
    target: "products",
    query: "status:pending_approval company_id:company_sanho_luxury_001",
    sort: "approvalRequestedAt desc",
    resultCount: companyProducts.filter(
      (product) => product.status === "pending_approval" || product.status === "needs_reapproval",
    ).length,
  },
  {
    id: "filter-products-risk",
    label: "위험/반려 상품",
    target: "products",
    query: "status:rejected,suspended",
    sort: "risk desc",
    resultCount: companyProducts.filter(
      (product) => product.status === "rejected" || product.status === "suspended",
    ).length,
  },
  {
    id: "filter-orders-delivery",
    label: "배송 처리 필요",
    target: "orders",
    query: "delivery:invoice_pending,shipping",
    sort: "orderedAt desc",
    resultCount: companyOrderLines.filter(
      (line) => line.deliveryStatus === "invoice_pending" || line.deliveryStatus === "shipping",
    ).length,
  },
  {
    id: "filter-inventory-low",
    label: "안전재고 미만",
    target: "inventory",
    query: "stock < safetyStock",
    sort: "stock asc",
    resultCount: companyProductOptions.filter((option) => option.stock < option.safetyStock).length,
  },
  {
    id: "filter-refunds-open",
    label: "환불 검토중",
    target: "refunds",
    query: "status:requested,company_review",
    sort: "requestedAt asc",
    resultCount: companyRefundRequests.filter(
      (refund) => refund.status === "requested" || refund.status === "company_review",
    ).length,
  },
];

export const companyEmptyStates: CompanyEmptyStateSpec[] = [
  {
    id: "empty-approved-refunds",
    surface: "환불 승인 완료",
    title: "mock 승인 완료 환불이 없습니다",
    description: "실제 PG 환불 연결 전까지 승인 완료 목록은 비워 둡니다.",
    recovery: "환불 검토 요청만 확인하고 지급/취소 액션은 실행하지 않습니다.",
  },
  {
    id: "empty-live-storage",
    surface: "상품 이미지 업로드",
    title: "업로드된 실제 Storage 이미지가 없습니다",
    description: "이미지와 GIF는 placeholder 상태만 보여줍니다.",
    recovery: "Storage rules 확정 후 업로드 UI를 별도 작업으로 연결합니다.",
  },
  {
    id: "empty-paid-out-live",
    surface: "운영 입금 실행",
    title: "실제 입금 실행 내역이 없습니다",
    description: "mock 입금완료 상태는 UI 검증용 표시값입니다.",
    recovery: "정산 승인 권한, audit log, 계좌 검증 계약 확정 후 활성화합니다.",
  },
];

export const companyErrorStates: CompanyErrorStateSpec[] = [
  {
    id: "error-firebase-repository",
    surface: "repository",
    title: "Firebase repository not connected",
    description: "현재 company Admin은 data/company mock dataset만 읽습니다.",
    blockedBy: "REPOSITORY_INTERFACE_PLAN and Firebase contract track",
  },
  {
    id: "error-delivery-tracking",
    surface: "delivery",
    title: "Delivery tracking API disabled",
    description: "송장 조회, 배송 webhook, 알림톡 전송은 mock 화면에서 실행하지 않습니다.",
    blockedBy: "carrier API contract and notification policy",
  },
  {
    id: "error-payment-refund",
    surface: "refund",
    title: "PG refund action disabled",
    description: "환불 승인 버튼은 disabled mock이며 실제 취소/환불을 호출하지 않습니다.",
    blockedBy: "payment provider contract and audit gate",
  },
];

export const companyDetailEvents: CompanyDetailEvent[] = [
  {
    id: "event-product-care-created",
    targetId: "product-care-kit",
    label: "상품 seed 생성",
    status: "done",
    at: "2026-05-17T09:00:00+09:00",
    detail: "mock 상품 기본 정보와 옵션이 생성되었습니다.",
  },
  {
    id: "event-product-care-approved",
    targetId: "product-care-kit",
    label: "운영자 승인 mock",
    status: "done",
    at: "2026-05-17T09:10:00+09:00",
    detail: "approved 상태로 노출되지만 실제 승인 audit log는 아직 연결하지 않았습니다.",
  },
  {
    id: "event-product-oil-blocked",
    targetId: "product-oil",
    label: "위험 문구 검수 필요",
    status: "blocked",
    at: "2026-05-20T08:50:00+09:00",
    detail: "성분 고지와 사용 주의 문구 확인 전 판매중지 mock 상태입니다.",
  },
  {
    id: "event-order-007-paid",
    targetId: "order-007",
    label: "결제완료 mock",
    status: "done",
    at: "2026-05-20T14:06:00+09:00",
    detail: "PG 실제 승인 없이 mock 결제완료 상태만 표시합니다.",
  },
  {
    id: "event-order-007-shipping",
    targetId: "order-007",
    label: "배송중 mock",
    status: "current",
    at: "2026-05-20T14:20:00+09:00",
    detail: "송장번호는 표시하지만 배송조회 API는 호출하지 않습니다.",
  },
  {
    id: "event-refund-006-review",
    targetId: "refund-006",
    label: "입점사 검토중",
    status: "current",
    at: "2026-05-20T13:10:00+09:00",
    detail: "PG 취소 없이 검토 메모만 작성된 상태입니다.",
  },
];

export const companyWorkQueue: CompanyWorkQueueItem[] = [
  {
    day: "DAY 1",
    title: "기업 Admin 대시보드",
    status: "done_mock",
    detail: "상품 수, 승인 대기, 주문, 배송 대기, mock 매출, 입금 예정 KPI 구성",
  },
  {
    day: "DAY 2",
    title: "상품 등록/수정/승인요청",
    status: "done_mock",
    detail: "가격비교, 옵션, 이미지 placeholder, 승인 상태 흐름 구성",
  },
  {
    day: "DAY 3",
    title: "옵션/재고 관리",
    status: "done_mock",
    detail: "옵션 재고, inventory_movements, 외부 재고 코드 매핑 mock 구성",
  },
  {
    day: "DAY 4",
    title: "주문/배송/현장수령",
    status: "done_mock",
    detail: "기업별 order_items 기준 주문, 송장 입력 mock, 현장수령 상태 구성",
  },
  {
    day: "DAY 5",
    title: "매출/입금/정산/환불",
    status: "done_mock",
    detail: "정산 대기/확정/입금완료, 환불 검토 mock 및 보고서 작성",
  },
];

const generatedProducts: CompanyProduct[] = Array.from({ length: 14 }, (_, index) => {
  const seq = index + 7;
  const statusPool = [
    "approved",
    "pending_approval",
    "draft",
    "needs_reapproval",
    "rejected",
    "suspended",
  ] as const;
  const categoryPool = ["care", "wear", "skin", "food", "room"];
  const status = statusPool[index % statusPool.length];
  const normalPrice = 42000 + seq * 3000;
  const closedMallPrice = normalPrice - 7000;

  return {
    id: `product-generated-${seq}`,
    companyId: companyProfile.id,
    brand: `Mock Brand ${seq}`,
    name: `Generated Company Product ${seq}`,
    category: categoryPool[index % categoryPool.length],
    status,
    normalPrice,
    closedMallPrice,
    platformLowestPrice: normalPrice - 3000,
    priceComparisonStatus: index % 3 === 0 ? "needs_update" : "valid_mock",
    stockTotal: 6 + index * 3,
    imagePlaceholder: "generated placeholder only",
    description: "Generated mock product used for company beta table coverage.",
    deliveryAvailable: index % 2 === 0,
    pickupAvailable: index % 3 === 0,
    refundGuide: "Generated refund guide mock. No real refund action.",
    externalProductCode: `EXT-GEN-${String(seq).padStart(3, "0")}`,
    approvalRequestedAt: `2026-05-${String(10 + (index % 10)).padStart(2, "0")}T09:00:00+09:00`,
    rejectionReason: status === "rejected" ? "Generated rejection reason mock" : undefined,
    reapprovalReason: status === "needs_reapproval" ? "Generated price change reapproval required" : undefined,
    storageState: "placeholder_only",
  };
});

companyProducts.push(...generatedProducts);

const generatedOptions: CompanyProductOption[] = generatedProducts.flatMap((product, index) => {
  const baseStock = 5 + index;

  return [
    {
      id: `${product.id}-opt-basic`,
      productId: product.id,
      name: "Basic",
      sku: `${product.id.toUpperCase()}-BASIC`,
      stock: baseStock,
      safetyStock: 6,
      priceDelta: 0,
      saleState: baseStock < 6 ? "out_of_stock" : "on_sale",
      externalSkuCode: `${product.externalProductCode}-A`,
      externalMappingStatus: "mapped_mock",
    },
    {
      id: `${product.id}-opt-plus`,
      productId: product.id,
      name: "Plus",
      sku: `${product.id.toUpperCase()}-PLUS`,
      stock: baseStock - 2,
      safetyStock: 5,
      priceDelta: 5000,
      saleState: product.status === "suspended" ? "sales_suspended" : "on_sale",
      externalSkuCode: `${product.externalProductCode}-B`,
      externalMappingStatus: index % 4 === 0 ? "blocked_external_api" : "needs_mapping",
    },
  ];
});

companyProductOptions.push(...generatedOptions);

const generatedOrders: CompanyOrder[] = Array.from({ length: 25 }, (_, index) => {
  const seq = index + 8;
  const statusPool = [
    "paid",
    "preparing",
    "invoice_pending",
    "shipping",
    "ready_for_pickup",
    "refund_requested",
  ] as const;
  const deliveryMethod = index % 4 === 0 ? "pickup" : "delivery";

  return {
    id: `order-generated-${seq}`,
    orderNo: `A5-202605${String(20 + (index % 6)).padStart(2, "0")}-${String(seq).padStart(3, "0")}`,
    customerNameMasked: `고객${seq}*`,
    customerPhoneMasked: `010-****-${String(3000 + seq).slice(-4)}`,
    nurseryName: index % 2 === 0 ? "강남 산후조리원" : "분당 산후케어",
    roomName: `${600 + seq}호`,
    status: statusPool[index % statusPool.length],
    deliveryMethod,
    orderedAt: `2026-05-${String(20 + (index % 6)).padStart(2, "0")}T${String(9 + (index % 8)).padStart(2, "0")}:20:00+09:00`,
    paidAt: `2026-05-${String(20 + (index % 6)).padStart(2, "0")}T${String(9 + (index % 8)).padStart(2, "0")}:25:00+09:00`,
    totalAmount: 36000 + index * 2500,
  };
});

companyOrders.push(...generatedOrders);

const generatedOrderLines: CompanyOrderLine[] = generatedOrders.map((order, index) => {
  const product = companyProducts[index % companyProducts.length];
  const option = companyProductOptions.find((item) => item.productId === product.id) ?? companyProductOptions[0];
  const deliveryStatus = order.deliveryMethod === "pickup" ? "ready_for_pickup" : order.status;
  const unitPrice = product.closedMallPrice;

  return {
    id: `line-generated-${index + 8}`,
    orderId: order.id,
    orderNo: order.orderNo,
    productId: product.id,
    productName: product.name,
    optionName: option.name,
    quantity: 1 + (index % 2),
    unitPrice,
    settlementAmount: Math.round(unitPrice * 0.88),
    deliveryMethod: order.deliveryMethod,
    deliveryStatus,
    invoiceNo: order.deliveryMethod === "delivery" && index % 3 === 0 ? `MOCK-${5000 + index}` : undefined,
    pickupCode: order.deliveryMethod === "pickup" ? `PICK-${700 + index}` : undefined,
  };
});

companyOrderLines.push(...generatedOrderLines);

const generatedInventoryMovements: CompanyInventoryMovement[] = Array.from({ length: 44 }, (_, index) => {
  const option = companyProductOptions[index % companyProductOptions.length];
  const typePool = [
    "manual_adjustment_mock",
    "order_reserved_mock",
    "order_confirmed_mock",
    "cancel_restore_mock",
    "external_sync_mock_blocked",
  ] as const;

  return {
    id: `inv-generated-${String(index + 7).padStart(3, "0")}`,
    productId: option.productId,
    optionId: option.id,
    type: typePool[index % typePool.length],
    quantity: index % 3 === 0 ? 2 : -1,
    memo: `Generated inventory movement ${index + 7}. No real stock API call.`,
    createdAt: `2026-05-${String(10 + (index % 15)).padStart(2, "0")}T${String(8 + (index % 10)).padStart(2, "0")}:00:00+09:00`,
  };
});

companyInventoryMovements.push(...generatedInventoryMovements);

const generatedSettlements: CompanySettlement[] = Array.from({ length: 6 }, (_, index) => {
  const grossAmount = 90000 + index * 28000;

  return {
    id: `settlement-generated-${index + 6}`,
    period: `2026-05 generated ${index + 1}`,
    status: index % 3 === 0 ? "review" : index % 3 === 1 ? "confirmed_mock" : "payout_scheduled_mock",
    grossAmount,
    commissionAmount: Math.round(grossAmount * 0.12),
    refundHoldAmount: index % 2 === 0 ? 0 : 12000,
    payoutAmount: Math.round(grossAmount * 0.88) - (index % 2 === 0 ? 0 : 12000),
    scheduledPayoutDate: `2026-05-${String(22 + index).padStart(2, "0")}`,
  };
});

companySettlements.push(...generatedSettlements);

companyExternalInventoryMappings.push(
  ...generatedOptions.slice(0, 20).map((option, index) => ({
    id: `map-generated-${index + 1}`,
    productId: option.productId,
    optionId: option.id,
    externalProductId: `EXT-GEN-MAP-${String(index + 1).padStart(3, "0")}`,
    externalSku: option.externalSkuCode ?? `SKU-GEN-${index + 1}`,
    lastSyncStatus: index % 5 === 0 ? "external_sync_mock_blocked" : "mapped_mock",
    blockedReason: index % 5 === 0 ? "External API disabled in beta" : "Mock mapping only",
    lastSyncAt: `2026-05-20T${String(8 + (index % 8)).padStart(2, "0")}:30:00+09:00`,
  })),
);

const orderLineTotal = companyOrderLines.reduce(
  (total, line) => total + line.unitPrice * line.quantity,
  0,
);

const payoutEstimate = companyOrderLines.reduce(
  (total, line) => total + line.settlementAmount,
  0,
);

const shippingWaitCount = companyOrderLines.filter(
  (line) => line.deliveryMethod === "delivery" && line.deliveryStatus === "invoice_pending",
).length;

const pickupWaitCount = companyPickupEvents.filter((event) => event.status === "waiting").length;
const refundRequestCount = companyRefundRequests.filter(
  (refund) => refund.status === "requested" || refund.status === "company_review",
).length;

export const companyDashboardKpis: CompanyKpi[] = [
  {
    label: "등록 상품",
    value: formatNumber(companyProducts.length),
    helper: "draft/pending/approved 포함",
    tone: "neutral",
  },
  {
    label: "승인 대기",
    value: formatNumber(
      companyProducts.filter(
        (product) => product.status === "pending_approval" || product.status === "needs_reapproval",
      ).length,
    ),
    helper: "운영자 검토 필요",
    tone: "amber",
  },
  {
    label: "주문 라인",
    value: formatNumber(companyOrderLines.length),
    helper: "order_items 기준",
    tone: "blue",
  },
  {
    label: "배송 대기",
    value: formatNumber(shippingWaitCount),
    helper: "송장 입력 mock 필요",
    tone: "red",
  },
  {
    label: "현장수령 대기",
    value: formatNumber(pickupWaitCount),
    helper: "pickup_events mock 기준",
    tone: "blue",
  },
  {
    label: "mock 매출",
    value: formatCurrency(orderLineTotal),
    helper: "실제 PG 정산 아님",
    tone: "green",
  },
  {
    label: "입금 예정",
    value: formatCurrency(payoutEstimate),
    helper: `${formatPercent(companyProfile.commissionRate)} 수수료 반영 mock`,
    tone: "purple",
  },
  {
    label: "환불 요청 mock",
    value: formatNumber(refundRequestCount),
    helper: "PG 환불 호출 없음",
    tone: "amber",
  },
];
