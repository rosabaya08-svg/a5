import type { DashboardMetric } from "@/types/commerce";
import type {
  IntegrationDocumentRecord,
  IntegrationEndpointRecord,
  IntegrationFieldMappingRecord,
  IntegrationRecord,
  IntegrationStatusMappingRecord,
  PublicApiEndpointRecord,
  SyncJobRecord,
  SyncLogRecord,
} from "@/types/integration";

export const integrationCenterMetrics: DashboardMetric[] = [
  {
    label: "활성 연동",
    value: "3",
    helper: "주문 수집 또는 송장 전송 가능",
    tone: "green",
  },
  {
    label: "테스트 필요",
    value: "2",
    helper: "인증/필드 매핑 검증 대기",
    tone: "amber",
  },
  {
    label: "최근 실패",
    value: "7",
    helper: "재시도 큐와 관리자 확인 포함",
    tone: "red",
  },
  {
    label: "공개 API 범위",
    value: "6",
    helper: "기업별 키/권한 분리 대상",
    tone: "blue",
  },
];

export const integrationCenterModules = [
  {
    title: "연동 플랫폼 관리",
    body: "사방넷, 네이버, 카페24, 쿠팡, WMS, ERP, 커스텀 커넥터를 기업별로 등록",
  },
  {
    title: "API 인증정보 관리",
    body: "API Key, Client Secret, Access Token은 Secret Manager 참조값으로 분리",
  },
  {
    title: "API 문서 관리",
    body: "문서 URL, PDF, OpenAPI JSON/YAML, 수동 엔드포인트 정의를 버전별 보관",
  },
  {
    title: "필드 매핑 관리",
    body: "외부 주문/상품/송장 필드를 A5 표준 주문 구조로 변환",
  },
  {
    title: "상태 매핑 관리",
    body: "플랫폼별 주문 상태를 A5 내부 표준 상태값으로 정규화",
  },
  {
    title: "연동 테스트",
    body: "인증, 주문 조회, 송장 전송, 재고 변경 호출을 운영 전 사전 검증",
  },
  {
    title: "동기화 스케줄러",
    body: "주문 수집, 재고 동기화, 송장 전송, 클레임 수집 주기를 제어",
  },
  {
    title: "실패 로그/재시도",
    body: "API 오류코드, 원문 요청 ID, 재시도 횟수, 수동 조치 사유를 보존",
  },
  {
    title: "웹훅 수신 관리",
    body: "외부 플랫폼 이벤트를 A5 표준 이벤트로 수신하고 중복 처리 방지",
  },
  {
    title: "A5 공개 API 문서",
    body: "외부 ERP/WMS가 A5 주문, 상품, 송장, 재고를 연동할 수 있는 계약 문서",
  },
];

export const integrationRecords: IntegrationRecord[] = [
  {
    id: "integration-sabangnet-sanho",
    platformType: "SABANGNET",
    companyId: "company-sanho-care",
    companyName: "산호케어",
    displayName: "사방넷 주문/송장 연동",
    status: "testing",
    authType: "api_key",
    baseUrl: "계약 후 발급",
    lastSyncAt: "2026-05-26T16:40:00+09:00",
    failureCount: 2,
    owner: "운영팀",
    capabilities: ["orders_pull", "invoice_push", "inventory_sync"],
  },
  {
    id: "integration-naver-bebelux",
    platformType: "NAVER_COMMERCE",
    companyId: "company-bebe-lux",
    companyName: "베베럭스",
    displayName: "네이버 커머스API",
    status: "active",
    authType: "oauth2",
    baseUrl: "https://api.commerce.naver.com",
    lastSyncAt: "2026-05-26T17:10:00+09:00",
    failureCount: 0,
    owner: "커머스 운영",
    capabilities: ["orders_pull", "invoice_push", "claim_pull"],
  },
  {
    id: "integration-cafe24-momtable",
    platformType: "CAFE24",
    companyId: "company-momtable",
    companyName: "맘테이블",
    displayName: "카페24 Admin API",
    status: "draft",
    authType: "oauth2",
    baseUrl: "https://{mall_id}.cafe24api.com",
    lastSyncAt: "-",
    failureCount: 0,
    owner: "입점 지원",
    capabilities: ["orders_pull", "product_sync", "invoice_push"],
  },
  {
    id: "integration-coupang-sanho",
    platformType: "COUPANG",
    companyId: "company-sanho-care",
    companyName: "산호케어",
    displayName: "쿠팡 Open API 송장",
    status: "error",
    authType: "hmac",
    baseUrl: "https://api-gateway.coupang.com",
    lastSyncAt: "2026-05-26T15:05:00+09:00",
    failureCount: 5,
    owner: "물류 담당",
    capabilities: ["invoice_push", "claim_pull"],
  },
  {
    id: "integration-erp-custom",
    platformType: "ERP",
    companyId: "company-bebe-lux",
    companyName: "베베럭스",
    displayName: "기업 ERP 주문 회수",
    status: "paused",
    authType: "bearer",
    baseUrl: "https://erp.example.internal",
    lastSyncAt: "2026-05-25T11:30:00+09:00",
    failureCount: 0,
    owner: "기업 IT",
    capabilities: ["webhook_receive", "inventory_sync"],
  },
];

export const integrationDocuments: IntegrationDocumentRecord[] = [
  {
    id: "doc-sabangnet-api",
    integrationId: "integration-sabangnet-sanho",
    documentType: "url",
    title: "사방넷 API 서비스 안내",
    source: "https://www.sabangnet.co.kr/service-intro/api-service",
    version: "public",
    status: "review",
    uploadedAt: "2026-05-26T14:20:00+09:00",
  },
  {
    id: "doc-naver-dispatch",
    integrationId: "integration-naver-bebelux",
    documentType: "url",
    title: "네이버 커머스API 발송 처리",
    source: "POST /v1/pay-order/seller/product-orders/dispatch",
    version: "2.74.0",
    status: "tested",
    uploadedAt: "2026-05-26T13:50:00+09:00",
  },
  {
    id: "doc-cafe24-admin",
    integrationId: "integration-cafe24-momtable",
    documentType: "openapi",
    title: "카페24 Admin API 주문/배송",
    source: "OpenAPI YAML 업로드 대기",
    version: "v2026-05",
    status: "review",
    uploadedAt: "2026-05-26T12:30:00+09:00",
  },
  {
    id: "doc-coupang-invoice",
    integrationId: "integration-coupang-sanho",
    documentType: "manual",
    title: "쿠팡 송장 업로드 처리 조건",
    source: "상품준비중 상태 검증 필요",
    version: "manual-1",
    status: "production",
    uploadedAt: "2026-05-25T18:20:00+09:00",
  },
];

export const integrationEndpoints: IntegrationEndpointRecord[] = [
  {
    id: "endpoint-naver-orders",
    integrationId: "integration-naver-bebelux",
    purpose: "orders_pull",
    method: "GET",
    path: "/v1/pay-order/seller/product-orders",
    mapping: "네이버 productOrder -> A5 order_items",
    testStatus: "passed",
  },
  {
    id: "endpoint-naver-dispatch",
    integrationId: "integration-naver-bebelux",
    purpose: "invoice_push",
    method: "POST",
    path: "/v1/pay-order/seller/product-orders/dispatch",
    mapping: "A5 shipments -> 네이버 발송 처리",
    testStatus: "passed",
  },
  {
    id: "endpoint-coupang-upload",
    integrationId: "integration-coupang-sanho",
    purpose: "invoice_push",
    method: "POST",
    path: "/v2/providers/openapi/apis/api/v4/vendors/{vendorId}/orders/invoices",
    mapping: "상품준비중 주문만 송장 업로드",
    testStatus: "failed",
  },
  {
    id: "endpoint-cafe24-orders",
    integrationId: "integration-cafe24-momtable",
    purpose: "orders_pull",
    method: "GET",
    path: "/api/v2/admin/orders",
    mapping: "카페24 order -> A5 orders",
    testStatus: "not_run",
  },
  {
    id: "endpoint-sabangnet-orders",
    integrationId: "integration-sabangnet-sanho",
    purpose: "orders_pull",
    method: "POST",
    path: "계약 문서 확보 후 등록",
    mapping: "외부 주문번호 중복 키 필수",
    testStatus: "not_run",
  },
];

export const integrationFieldMappings: IntegrationFieldMappingRecord[] = [
  {
    id: "field-external-order",
    integrationId: "integration-naver-bebelux",
    externalField: "productOrderId",
    internalField: "order_items.externalOrderItemId",
    transformRule: "platformType + companyId와 함께 unique key 생성",
  },
  {
    id: "field-receiver-name",
    integrationId: "integration-cafe24-momtable",
    externalField: "receiver.name",
    internalField: "orders.shipping.receiverName",
    transformRule: "공백 제거 후 원문 암호화 저장 대상 검토",
  },
  {
    id: "field-product-code",
    integrationId: "integration-sabangnet-sanho",
    externalField: "product_code",
    internalField: "order_items.externalProductCode",
    transformRule: "A5 SKU와 별도 보존",
  },
  {
    id: "field-invoice",
    integrationId: "integration-coupang-sanho",
    externalField: "invoiceNumber",
    internalField: "shipments.invoiceNumber",
    transformRule: "택배사 코드 매핑 성공 시만 전송",
  },
];

export const integrationStatusMappings: IntegrationStatusMappingRecord[] = [
  {
    id: "status-paid",
    integrationId: "integration-naver-bebelux",
    externalStatus: "PAYED",
    internalStatus: "PAYMENT_COMPLETED",
    note: "결제 완료 후 주문 확인 대기",
  },
  {
    id: "status-ready",
    integrationId: "integration-coupang-sanho",
    externalStatus: "상품준비중",
    internalStatus: "READY_TO_SHIP",
    note: "쿠팡 송장 업로드 허용 상태",
  },
  {
    id: "status-shipped",
    integrationId: "integration-cafe24-momtable",
    externalStatus: "배송중",
    internalStatus: "SHIPPED",
    note: "송장번호 등록 이후 배송 추적 대상",
  },
  {
    id: "status-return",
    integrationId: "integration-sabangnet-sanho",
    externalStatus: "반품요청",
    internalStatus: "RETURN_REQUESTED",
    note: "클레임 수집 잡에서 처리",
  },
];

export const syncJobs: SyncJobRecord[] = [
  {
    id: "job-naver-orders",
    integrationId: "integration-naver-bebelux",
    jobType: "orders_pull",
    schedule: "10분마다",
    lastRunAt: "2026-05-26T17:10:00+09:00",
    nextRunAt: "2026-05-26T17:20:00+09:00",
    status: "scheduled",
  },
  {
    id: "job-coupang-invoice",
    integrationId: "integration-coupang-sanho",
    jobType: "invoice_push",
    schedule: "송장 등록 이벤트",
    lastRunAt: "2026-05-26T15:05:00+09:00",
    nextRunAt: "대기 중",
    status: "error",
  },
  {
    id: "job-erp-inventory",
    integrationId: "integration-erp-custom",
    jobType: "inventory_sync",
    schedule: "1시간마다",
    lastRunAt: "2026-05-25T11:30:00+09:00",
    nextRunAt: "일시중지",
    status: "paused",
  },
];

export const syncLogs: SyncLogRecord[] = [
  {
    id: "log-coupang-state",
    integrationId: "integration-coupang-sanho",
    jobId: "job-coupang-invoice",
    requestId: "req_20260526_150501",
    status: "blocked",
    errorCode: "INVALID_ORDER_STATUS",
    errorMessage: "상품준비중 상태가 아닌 주문의 송장 전송 차단",
    retryCount: 0,
    createdAt: "2026-05-26T15:05:01+09:00",
  },
  {
    id: "log-sabangnet-doc",
    integrationId: "integration-sabangnet-sanho",
    jobId: "manual-test",
    requestId: "req_20260526_144211",
    status: "failed",
    errorCode: "DOCUMENT_REQUIRED",
    errorMessage: "세부 엔드포인트 문서 미확보",
    retryCount: 0,
    createdAt: "2026-05-26T14:42:11+09:00",
  },
  {
    id: "log-naver-orders",
    integrationId: "integration-naver-bebelux",
    jobId: "job-naver-orders",
    requestId: "req_20260526_171000",
    status: "success",
    retryCount: 0,
    createdAt: "2026-05-26T17:10:00+09:00",
  },
];

export const webhookEvents = [
  {
    id: "webhook-erp-invoice",
    integrationId: "integration-erp-custom",
    eventType: "shipment.created",
    processed: false,
    receivedAt: "2026-05-26T16:55:00+09:00",
  },
  {
    id: "webhook-wms-claim",
    integrationId: "integration-erp-custom",
    eventType: "claim.return_requested",
    processed: true,
    receivedAt: "2026-05-26T13:15:00+09:00",
  },
];

export const standardOrderFlow = [
  "상품 등록",
  "SKU / 옵션 코드 생성",
  "재고 등록",
  "주문 발생",
  "결제 완료",
  "주문 확인",
  "출고 요청",
  "송장 등록",
  "배송중",
  "배송완료",
  "취소 / 반품 / 교환",
  "정산",
];

export const duplicateGuardKey = "platformType + companyId + externalOrderId + externalOrderItemId";

export const publicApiEndpoints: PublicApiEndpointRecord[] = [
  {
    id: "a5-orders-list",
    method: "GET",
    path: "/api/v1/orders",
    scope: "orders:read",
    purpose: "외부 ERP/WMS 주문 목록 수집",
    status: "required",
  },
  {
    id: "a5-order-detail",
    method: "GET",
    path: "/api/v1/orders/{orderId}",
    scope: "orders:read",
    purpose: "주문 상세 및 품목 확인",
    status: "required",
  },
  {
    id: "a5-order-confirm",
    method: "POST",
    path: "/api/v1/orders/{orderId}/confirm",
    scope: "orders:write",
    purpose: "외부 시스템 주문 확인 회신",
    status: "draft",
  },
  {
    id: "a5-shipment-create",
    method: "POST",
    path: "/api/v1/orders/{orderId}/shipments",
    scope: "orders:write",
    purpose: "송장번호와 택배사 코드 회신",
    status: "required",
  },
  {
    id: "a5-products-list",
    method: "GET",
    path: "/api/v1/products",
    scope: "products:read",
    purpose: "상품/SKU 목록 조회",
    status: "required",
  },
  {
    id: "a5-inventory-patch",
    method: "PATCH",
    path: "/api/v1/inventory/{sku}",
    scope: "inventory:write",
    purpose: "외부 재고 변경 반영",
    status: "draft",
  },
  {
    id: "a5-claims-list",
    method: "GET",
    path: "/api/v1/claims",
    scope: "claims:read",
    purpose: "취소/반품/교환 요청 조회",
    status: "draft",
  },
  {
    id: "a5-webhook-test",
    method: "POST",
    path: "/api/v1/webhooks/test",
    scope: "webhooks:test",
    purpose: "Webhook Secret 검증",
    status: "draft",
  },
];

export const apiAccessControls = [
  "기업별 API Key 발급",
  "IP 화이트리스트",
  "권한 범위: 주문 읽기 / 송장 쓰기 / 재고 수정",
  "호출량 제한",
  "요청/응답 감사 로그",
  "Webhook Secret 서명 검증",
];

export const firestoreCollections = [
  {
    collection: "integrations",
    purpose: "플랫폼 유형, 기업, 상태, 인증 방식, Base URL",
    security: "관리자 쓰기, 기업별 읽기 제한",
  },
  {
    collection: "integration_credentials",
    purpose: "Secret Manager 또는 암호화 저장소 참조값",
    security: "평문 Secret 저장 금지",
  },
  {
    collection: "integration_documents",
    purpose: "URL, PDF, OpenAPI, 수동 문서 버전 관리",
    security: "문서 파일은 Storage 권한 분리",
  },
  {
    collection: "integration_endpoints",
    purpose: "주문 수집, 재고 동기화, 송장 전송 엔드포인트",
    security: "테스트 호출은 서버 런타임에서만 실행",
  },
  {
    collection: "field_mappings",
    purpose: "외부 응답 필드와 A5 DB 필드 연결",
    security: "운영 반영 전 변경 이력 필수",
  },
  {
    collection: "status_mappings",
    purpose: "외부 주문상태와 A5 표준 상태값 연결",
    security: "미매핑 상태는 주문 자동 처리 차단",
  },
  {
    collection: "sync_jobs",
    purpose: "스케줄, 마지막 실행, 다음 실행, 상태",
    security: "잡 실행자는 백엔드 서비스 계정",
  },
  {
    collection: "sync_logs",
    purpose: "실패 사유, 오류코드, requestId, 재시도 횟수",
    security: "원문 payload 마스킹 저장",
  },
  {
    collection: "webhook_events",
    purpose: "외부 이벤트 payload, 처리 여부, 수신 시각",
    security: "서명 검증 실패 이벤트 격리",
  },
];

export const apiDocumentLifecycle = [
  "문서 등록",
  "인증 등록",
  "필드 매핑",
  "테스트 호출",
  "동기화 반영",
  "버전 변경 이력",
];
