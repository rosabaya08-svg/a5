export type PayupFeatureFlagKey =
  | "PAYUP_MASTER"
  | "NEW_ORDER"
  | "PAYMENT_WINDOW"
  | "FINAL_APPROVAL"
  | "CART_DISTRIBUTION"
  | "SUBMERCHANT_CREATE"
  | "SUBMERCHANT_UPDATE"
  | "SUBMERCHANT_SYNC"
  | "TRANSACTION_RECON"
  | "SETTLEMENT_RECON"
  | "FULL_CANCEL"
  | "PARTIAL_CANCEL"
  | "PAYOUT_HOLD"
  | "MOCK_MODE"
  | "LOCAL_PAID_FALLBACK";

export type PayupFeatureFlag = {
  key: PayupFeatureFlagKey;
  label: string;
  group: "결제" | "하위사업자" | "대사" | "취소/정산" | "안전장치";
  description: string;
  enabled: boolean;
  locked?: boolean;
  lockReason?: string;
  dependency?: string;
};

export type PayupSubmerchantRow = {
  id: string;
  organizationId: string;
  role: string;
  businessNumber: string;
  companyName: string;
  subMerchantId: string;
  representative: string;
  accountBank: string;
  accountMasked: string;
  status: "ACTIVE" | "PENDING_REVIEW" | "REGISTERING" | "ERROR" | "SUSPENDED";
  payupSync: "일치" | "미확인" | "불일치";
  lastSyncedAt: string;
};

export type PayupTransactionRow = {
  id: string;
  approvedAt: string;
  channel: "A5S" | "A5WS" | "A5LS";
  orderNumber: string;
  transactionId: string;
  subTransactionId: string;
  subMerchantId: string;
  organizationName: string;
  distributionType: "상품대금" | "A5S 이용료" | "파트너 차액" | "배송비";
  amount: number;
  status: "승인성공" | "취소성공" | "대사대기" | "대사불일치";
};

export type PayupSettlementRow = {
  id: string;
  supplyDate: string;
  targetDate: string;
  organizationName: string;
  subMerchantId: string;
  supplyType: string;
  accountCount: number;
  accountAmount: number;
  feeAmount: number;
  vatAmount: number;
  supplyAmount: number;
  reconciliation: "일치" | "대기" | "불일치";
};

export type PayupCancellationRow = {
  id: string;
  requestedAt: string;
  orderNumber: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: "요청" | "정산보류" | "취소완료" | "수동처리" | "실패";
  responseCode: string;
  owner: string;
};

export type PayupLogRow = {
  id: string;
  occurredAt: string;
  category: "API" | "감사" | "사업이벤트";
  action: string;
  actor: string;
  organizationName: string;
  target: string;
  result: "성공" | "실패" | "차단" | "대기";
  correlationId: string;
  message: string;
};

export const defaultPayupFeatureFlags: PayupFeatureFlag[] = [
  {
    key: "PAYUP_MASTER",
    label: "PayUp 전체 연결",
    group: "결제",
    description: "PayUp 중앙 Gateway를 사용합니다. 이 스위치만으로 기존 거래 대사와 취소 회로는 끄지 않습니다.",
    enabled: false,
    dependency: "운영 merchantId · API KEY · API Cert Key · 고정 IP",
  },
  {
    key: "NEW_ORDER",
    label: "신규 주문요청",
    group: "결제",
    description: "PayUp 주문요청 API 호출을 허용합니다.",
    enabled: false,
    dependency: "PAYUP_MASTER",
  },
  {
    key: "PAYMENT_WINDOW",
    label: "PC/모바일 결제창",
    group: "결제",
    description: "PayUp/NICEPAY 인증 결제창 진입을 허용합니다.",
    enabled: false,
    dependency: "NEW_ORDER",
  },
  {
    key: "FINAL_APPROVAL",
    label: "최종 승인",
    group: "결제",
    description: "인증결과 수신 후 payUrl 승인 요청을 허용합니다.",
    enabled: false,
    dependency: "배분합계=승인금액 · 모든 subMerchantId ACTIVE",
  },
  {
    key: "CART_DISTRIBUTION",
    label: "장바구니 차액분배",
    group: "결제",
    description: "상품대금·A5S 이용료·파트너 차액·배송비를 cartPayList로 변환합니다.",
    enabled: false,
    dependency: "분배원장 LOCKED",
  },
  {
    key: "SUBMERCHANT_CREATE",
    label: "하위사업자 신규등록",
    group: "하위사업자",
    description: "공급사·파트너·위드커머스 본사 하위업체 등록을 허용합니다.",
    enabled: false,
    dependency: "SUPER_ADMIN 승인",
  },
  {
    key: "SUBMERCHANT_UPDATE",
    label: "하위사업자 정보수정",
    group: "하위사업자",
    description: "사업자·계좌정보 수정 요청을 PayUp에 반영합니다.",
    enabled: false,
    dependency: "변경 사유 · 승인 로그",
  },
  {
    key: "SUBMERCHANT_SYNC",
    label: "하위사업자 목록 동기화",
    group: "하위사업자",
    description: "PayUp 등록값과 내부 사업자 원장을 정기 대사합니다.",
    enabled: true,
  },
  {
    key: "TRANSACTION_RECON",
    label: "거래내역 자동대사",
    group: "대사",
    description: "PayUp 거래내역 조회와 내부 주문·분배원장을 대사합니다.",
    enabled: true,
  },
  {
    key: "SETTLEMENT_RECON",
    label: "정산내역 자동대사",
    group: "대사",
    description: "정산목록·정산상세를 내부 정산원장과 대사합니다.",
    enabled: true,
  },
  {
    key: "FULL_CANCEL",
    label: "전체취소",
    group: "취소/정산",
    description: "PayUp cancel2 전체취소를 허용합니다. 실행 전 정산 HOLD가 선행됩니다.",
    enabled: false,
    dependency: "거래번호 · 취소 테스트 통과",
  },
  {
    key: "PARTIAL_CANCEL",
    label: "부분취소",
    group: "취소/정산",
    description: "PayUp 공식 부분취소 API가 제공될 때까지 영구 잠금합니다.",
    enabled: false,
    locked: true,
    lockReason: "PAYUP_NOT_SUPPORTED",
  },
  {
    key: "PAYOUT_HOLD",
    label: "이상거래 지급보류",
    group: "취소/정산",
    description: "취소·대사불일치·1003 오류 시 지급을 자동 보류합니다.",
    enabled: true,
  },
  {
    key: "MOCK_MODE",
    label: "모의결제",
    group: "안전장치",
    description: "테스트 환경에서만 사용합니다. 운영 환경에서는 강제로 OFF 처리합니다.",
    enabled: true,
    dependency: "TEST 환경 전용",
  },
  {
    key: "LOCAL_PAID_FALLBACK",
    label: "브라우저 결제완료 대체처리",
    group: "안전장치",
    description: "실제 승인 없이 브라우저가 paid 상태를 만드는 기능입니다. 영구 금지합니다.",
    enabled: false,
    locked: true,
    lockReason: "PERMANENTLY_DISABLED",
  },
];

export const payupSubmerchantRows: PayupSubmerchantRow[] = [
  {
    id: "sub-001",
    organizationId: "org-withcommerce",
    role: "위드커머스 본사",
    businessNumber: "7458703132",
    companyName: "위드커머스",
    subMerchantId: "WCHQ7458703132",
    representative: "정**",
    accountBank: "우리은행",
    accountMasked: "1005-****-****-87",
    status: "PENDING_REVIEW",
    payupSync: "미확인",
    lastSyncedAt: "-",
  },
  {
    id: "sub-002",
    organizationId: "org-haesung",
    role: "상품 공급사",
    businessNumber: "1234567890",
    companyName: "해성청과",
    subMerchantId: "WCS1234567890",
    representative: "김**",
    accountBank: "농협은행",
    accountMasked: "301-****-****-11",
    status: "REGISTERING",
    payupSync: "미확인",
    lastSyncedAt: "-",
  },
  {
    id: "sub-003",
    organizationId: "org-foodmart",
    role: "A5WS 판매 파트너",
    businessNumber: "2345678901",
    companyName: "식자재마트",
    subMerchantId: "WCP2345678901",
    representative: "이**",
    accountBank: "국민은행",
    accountMasked: "453-****-****-22",
    status: "PENDING_REVIEW",
    payupSync: "미확인",
    lastSyncedAt: "-",
  },
  {
    id: "sub-004",
    organizationId: "org-groupbuy",
    role: "A5WS 판매 파트너",
    businessNumber: "3456789012",
    companyName: "공동구매마트",
    subMerchantId: "WCP3456789012",
    representative: "박**",
    accountBank: "신한은행",
    accountMasked: "110-****-****-33",
    status: "ERROR",
    payupSync: "불일치",
    lastSyncedAt: "2026-07-29 09:18",
  },
];

export const payupTransactionRows: PayupTransactionRow[] = [
  {
    id: "txn-001-1",
    approvedAt: "2026-07-29 09:30:18",
    channel: "A5WS",
    orderNumber: "A5WS-20260729-0001",
    transactionId: "SANDBOX-TXN-0001",
    subTransactionId: "SANDBOX-SUB-0001-A",
    subMerchantId: "WCS1234567890",
    organizationName: "해성청과",
    distributionType: "상품대금",
    amount: 10000,
    status: "대사대기",
  },
  {
    id: "txn-001-2",
    approvedAt: "2026-07-29 09:30:18",
    channel: "A5WS",
    orderNumber: "A5WS-20260729-0001",
    transactionId: "SANDBOX-TXN-0001",
    subTransactionId: "SANDBOX-SUB-0001-B",
    subMerchantId: "WCHQ7458703132",
    organizationName: "위드커머스",
    distributionType: "A5S 이용료",
    amount: 300,
    status: "대사대기",
  },
  {
    id: "txn-001-3",
    approvedAt: "2026-07-29 09:30:18",
    channel: "A5WS",
    orderNumber: "A5WS-20260729-0001",
    transactionId: "SANDBOX-TXN-0001",
    subTransactionId: "SANDBOX-SUB-0001-C",
    subMerchantId: "WCP2345678901",
    organizationName: "식자재마트",
    distributionType: "파트너 차액",
    amount: 100,
    status: "대사대기",
  },
];

export const payupSettlementRows: PayupSettlementRow[] = [
  {
    id: "settlement-001",
    supplyDate: "2026-08-03",
    targetDate: "2026-07-29",
    organizationName: "해성청과",
    subMerchantId: "WCS1234567890",
    supplyType: "0001 지급예정",
    accountCount: 1,
    accountAmount: 10000,
    feeAmount: 0,
    vatAmount: 0,
    supplyAmount: 10000,
    reconciliation: "대기",
  },
  {
    id: "settlement-002",
    supplyDate: "2026-08-03",
    targetDate: "2026-07-29",
    organizationName: "위드커머스",
    subMerchantId: "WCHQ7458703132",
    supplyType: "0001 지급예정",
    accountCount: 1,
    accountAmount: 300,
    feeAmount: 0,
    vatAmount: 0,
    supplyAmount: 300,
    reconciliation: "대기",
  },
  {
    id: "settlement-003",
    supplyDate: "2026-08-03",
    targetDate: "2026-07-29",
    organizationName: "식자재마트",
    subMerchantId: "WCP2345678901",
    supplyType: "0002 지급보류",
    accountCount: 1,
    accountAmount: 100,
    feeAmount: 0,
    vatAmount: 0,
    supplyAmount: 100,
    reconciliation: "불일치",
  },
];

export const payupCancellationRows: PayupCancellationRow[] = [
  {
    id: "cancel-001",
    requestedAt: "2026-07-29 09:42:10",
    orderNumber: "A5WS-20260729-0001",
    transactionId: "SANDBOX-TXN-0001",
    amount: 10400,
    reason: "샌드박스 전체취소 검증",
    status: "정산보류",
    responseCode: "대기",
    owner: "A5S 기업관리자",
  },
];

export const payupLogRows: PayupLogRow[] = [
  {
    id: "log-001",
    occurredAt: "2026-07-29 09:17:55",
    category: "감사",
    action: "PAYUP.FEATURE_FLAG.CHANGED",
    actor: "rosabaya08@gmail.com",
    organizationName: "위드커머스",
    target: "TRANSACTION_RECON",
    result: "성공",
    correlationId: "corr-sandbox-001",
    message: "거래내역 자동대사를 ON으로 변경했습니다.",
  },
  {
    id: "log-002",
    occurredAt: "2026-07-29 09:18:02",
    category: "API",
    action: "PAYUP.SUBMERCHANT.LIST",
    actor: "system",
    organizationName: "공동구매마트",
    target: "WCP3456789012",
    result: "실패",
    correlationId: "corr-sandbox-002",
    message: "샌드박스 API 자격증명 미등록으로 실제 조회를 실행하지 않았습니다.",
  },
  {
    id: "log-003",
    occurredAt: "2026-07-29 09:30:18",
    category: "사업이벤트",
    action: "PARTNER.SALE.RECORDED",
    actor: "system",
    organizationName: "식자재마트",
    target: "A5WS-20260729-0001",
    result: "대기",
    correlationId: "corr-sandbox-003",
    message: "파트너 차액 100원 판매 이벤트가 생성됐으며 PayUp 거래대사를 기다립니다.",
  },
];
