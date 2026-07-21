import type { CmsRecord } from "@/lib/firebase/contentRepository";

export const COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY = "a5.company.api-integration-request";

export type CompanyApiIntegrationStatus = "pending_approval" | "approved" | "live" | "rejected";
export type CompanyApiIntegrationPlatformType = "SABANGNET" | "STANDARD" | "ERP" | "WMS" | "CUSTOM";

export type CompanyApiIntegrationRequest = {
  id: string;
  companyId: string;
  companyName: string;
  status: CompanyApiIntegrationStatus;
  platformName: string;
  platformType: CompanyApiIntegrationPlatformType;
  purpose: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  webhookUrl: string;
  serverIps: string;
  requestedScopes: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  deployedAt?: string;
  rejectedReason?: string;
  deployment?: {
    apiBaseUrl: string;
    apiKeyId: string;
    webhookSecretId: string;
    packageVersion: string;
    deployedBy: string;
  };
};

export const apiIntegrationScopes = [
  { id: "orders:read", label: "주문 목록/상세 조회" },
  { id: "orders:status", label: "주문 상태 변경" },
  { id: "shipments:write", label: "송장번호 입력" },
  { id: "products:read", label: "상품 조회" },
  { id: "claims:read", label: "취소/반품/교환 조회" },
  { id: "events:read", label: "연동 이벤트 조회" },
  { id: "events:write", label: "연동 이벤트 상태 변경" },
  { id: "webhooks:test", label: "Webhook 테스트" },
];

export function createApiIntegrationRequestId(companyId: string) {
  return `api-link-${companyId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultApiIntegrationRequest(companyId: string, companyName: string): CompanyApiIntegrationRequest {
  const now = new Date().toISOString();

  return {
    id: createApiIntegrationRequestId(companyId),
    companyId,
    companyName,
    status: "pending_approval",
    platformName: "",
    platformType: "SABANGNET",
    purpose: "A5 주문/상품/송장 데이터를 공통 연동 Core로 제공하고 사방넷 또는 기업 표준 API 트랙으로 항목별 매핑",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    webhookUrl: "",
    serverIps: "",
    requestedScopes: ["orders:read", "orders:status", "shipments:write", "products:read", "claims:read", "events:read", "events:write", "webhooks:test"],
    createdAt: now,
    updatedAt: now,
  };
}

export function apiIntegrationStatusLabel(status: CompanyApiIntegrationStatus) {
  if (status === "pending_approval") return "검토 대기";
  if (status === "approved") return "승인 완료";
  if (status === "live") return "배포 완료";
  return "반려";
}

export function buildApiIntegrationCmsRecord(request: CompanyApiIntegrationRequest): CmsRecord {
  return {
    id: request.id,
    title: `${request.companyName} API 연동 요청`,
    status: request.status,
    approval_status: request.status,
    source_app: request.status === "pending_approval" ? "company" : "admin",
    company_id: request.companyId,
    company_name: request.companyName,
    platform_name: request.platformName,
    platform_type: request.platformType,
    purpose: request.purpose,
    contact_name: request.contactName,
    contact_email: request.contactEmail,
    contact_phone: request.contactPhone,
    webhook_url: request.webhookUrl,
    server_ips: request.serverIps,
    requested_scopes: request.requestedScopes,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    approved_at: request.approvedAt,
    deployed_at: request.deployedAt,
    rejected_reason: request.rejectedReason,
    deployment: request.deployment,
  };
}

export function requestFromCmsRecord(record: CmsRecord): CompanyApiIntegrationRequest {
  const now = new Date().toISOString();
  const status = typeof record.status === "string" ? record.status : "pending_approval";

  return {
    id: record.id,
    companyId: typeof record.company_id === "string" ? record.company_id : "__missing_company_scope__",
    companyName: typeof record.company_name === "string" ? record.company_name : "__missing_company_name__",
    status: ["pending_approval", "approved", "live", "rejected"].includes(status)
      ? (status as CompanyApiIntegrationStatus)
      : "pending_approval",
    platformName: typeof record.platform_name === "string" ? record.platform_name : "",
    platformType: asPlatformType(record.platform_type),
    purpose: typeof record.purpose === "string" ? record.purpose : "",
    contactName: typeof record.contact_name === "string" ? record.contact_name : "",
    contactEmail: typeof record.contact_email === "string" ? record.contact_email : "",
    contactPhone: typeof record.contact_phone === "string" ? record.contact_phone : "",
    webhookUrl: typeof record.webhook_url === "string" ? record.webhook_url : "",
    serverIps: typeof record.server_ips === "string" ? record.server_ips : "",
    requestedScopes: Array.isArray(record.requested_scopes) ? record.requested_scopes.filter((item): item is string => typeof item === "string") : ["orders:read"],
    createdAt: typeof record.created_at === "string" ? record.created_at : now,
    updatedAt: typeof record.updated_at === "string" ? record.updated_at : now,
    approvedAt: typeof record.approved_at === "string" ? record.approved_at : undefined,
    deployedAt: typeof record.deployed_at === "string" ? record.deployed_at : undefined,
    rejectedReason: typeof record.rejected_reason === "string" ? record.rejected_reason : undefined,
    deployment: record.deployment && typeof record.deployment === "object" ? record.deployment as CompanyApiIntegrationRequest["deployment"] : undefined,
  };
}

export function buildApiDeployment(request: CompanyApiIntegrationRequest) {
  const stamp = Date.now().toString(36).toUpperCase();

  return {
    apiBaseUrl: "https://asia-northeast3-a5-closed-mall.cloudfunctions.net",
    apiKeyId: `a5_${request.companyId}_${stamp}`,
    webhookSecretId: `whsec_${request.companyId}_${stamp}`,
    packageVersion: "a5-company-integration-api-v1.0.0",
    deployedBy: "SUPER_ADMIN",
  };
}

export function buildCompanyOpenApiSpec(request: CompanyApiIntegrationRequest) {
  const baseUrl = request.deployment?.apiBaseUrl ?? "https://asia-northeast3-a5-closed-mall.cloudfunctions.net";

  return {
    openapi: "3.0.3",
    info: {
      title: `A5 ${request.companyName} Company Integration API`,
      version: "1.0.0",
      description: "A5 기업관리자 외부 연동 API. 사방넷 호환 트랙과 기업 표준 API 트랙을 같은 주문/상품/송장 Core에서 제공합니다.",
    },
    servers: [{ url: baseUrl }],
    security: [{ ApiKeyAuth: [], CompanyId: [] }],
    paths: {
      "/integrationStandardOrders": {
        get: { summary: "기업 표준 API 주문 목록 조회", responses: { "200": { description: "A5 표준 주문 목록" } } },
        post: { summary: "기업 표준 API 주문 목록 조회", responses: { "200": { description: "A5 표준 주문 목록" } } },
      },
      "/integrationStandardProducts": {
        get: { summary: "기업 표준 API 상품 목록 조회", responses: { "200": { description: "A5 표준 상품 목록" } } },
        post: { summary: "기업 표준 API 상품 목록 조회", responses: { "200": { description: "A5 표준 상품 목록" } } },
      },
      "/integrationStandardShipments": {
        post: { summary: "기업 표준 API 송장 등록", responses: { "200": { description: "송장 반영 결과" } } },
      },
      "/integrationStandardOrderStatus": {
        post: { summary: "기업 표준 API 주문상태 변경", responses: { "200": { description: "상태 변경 결과" } } },
      },
      "/integrationStandardEvents": {
        get: { summary: "기업 표준 API 연동 이벤트 조회", responses: { "200": { description: "연동 이벤트 목록" } } },
        post: { summary: "기업 표준 API 연동 이벤트 조회", responses: { "200": { description: "연동 이벤트 목록" } } },
      },
      "/integrationStandardEventStatus": {
        post: { summary: "기업 표준 API 연동 이벤트 상태 변경", responses: { "200": { description: "이벤트 상태 변경 결과" } } },
      },
      "/sabangnetOrderListAPI": {
        post: { summary: "사방넷 호환 주문내역 조회", responses: { "200": { description: "사방넷 arrOrderList 응답" } } },
      },
      "/sabangnetOrderStatusInfoAPI": {
        post: { summary: "사방넷 호환 주문상태 변경", responses: { "200": { description: "상태 변경 결과" } } },
      },
      "/sabangnetSheetNoInfoAPI": {
        post: { summary: "사방넷 호환 송장번호 입력", responses: { "200": { description: "송장 반영 결과" } } },
      },
      "/sabangnetGoodsViewAPI": {
        post: { summary: "사방넷 호환 상품상세 조회", responses: { "200": { description: "사방넷 arrGoodsList 응답" } } },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "X-A5-API-Key" },
        CompanyId: { type: "apiKey", in: "header", name: "X-A5-Company-Id" },
      },
    },
  };
}

export function buildSabangnetMappingGuide(request: CompanyApiIntegrationRequest) {
  return `# A5 사방넷 연동 매핑표

## 기업
- company_id: ${request.companyId}
- company_name: ${request.companyName}
- 연동 상태: ${apiIntegrationStatusLabel(request.status)}

## 공통 인증 Header
\`\`\`http
X-A5-Company-Id: ${request.companyId}
X-A5-API-Key: {issued_api_key}
Content-Type: application/json
\`\`\`

## 사방넷 호환 API
| 사방넷 API | A5 Function | 용도 |
| --- | --- | --- |
| orderListAPI | /sabangnetOrderListAPI | 주문내역 조회 |
| orderStatusInfoAPI | /sabangnetOrderStatusInfoAPI | 주문상태 변경 |
| sheetNoInfoAPI | /sabangnetSheetNoInfoAPI | 송장번호 입력 |
| goodsViewAPI | /sabangnetGoodsViewAPI | 상품상세 조회 |

## 주문 필드 매핑
| A5 필드 | 사방넷 필드 |
| --- | --- |
| orders.order_no | orderNum |
| order_items.id | orderGoodsNum |
| order_items.product_id | goodsCd |
| order_items.product_name | goodsNm |
| order_items.quantity | orderQty |
| order_items.option_name | optionContent |
| orders.paid_at | orderDt |
| orders.customer_name | sndNm / rcvrNm |
| orders.customer_phone_masked | sndMobile / rcvrMobile |

## 상태 매핑
| A5 상태 | 사방넷 코드 |
| --- | --- |
| paid | 1001 주문완료 |
| ready_to_ship | 1002 출고준비중 |
| shipping | 1003 배송중 |
| delivered | 1004 수령완료 |
| cancelled | 1005 주문취소 |
| return_requested | 1007 반품요청 |
| returned | 1008 반품완료 |
| exchange_requested | 1011 교환요청 |
| exchanged | 1012 교환완료 |
`;
}

export function buildCompanyApiGuide(request: CompanyApiIntegrationRequest) {
  const deployment = request.deployment;

  return `# A5 기업관리자 연동 API 가이드

## 구조
A5는 하나의 연동 Core를 기준으로 두 트랙을 제공합니다.

1. 사방넷 전용 연동: 사방넷 필드명과 상태코드로 변환합니다.
2. 기업 표준 API 연동: ERP/WMS/자체 시스템용 A5 표준 JSON을 제공합니다.

## 배포 정보
- API Base URL: ${deployment?.apiBaseUrl ?? "배포 대기"}
- API Key ID: ${deployment?.apiKeyId ?? "배포 대기"}
- Webhook Secret ID: ${deployment?.webhookSecretId ?? "배포 대기"}
- Package Version: ${deployment?.packageVersion ?? "배포 대기"}

## 권한 범위
${request.requestedScopes.map((scope) => `- ${scope}`).join("\n")}

## 중복 방지 키
- 주문: companyId + orderNo
- 주문상품: companyId + orderNo + orderItemId
- 송장: companyId + orderNo + orderItemId + invoiceNumber
- 이벤트: companyId + eventId

## 페이지 조회
목록 API는 limit와 cursor를 지원합니다.
- limit: 1~100
- cursor: 이전 응답의 nextCursor
- nextCursor가 null이면 다음 페이지가 없습니다.

## 결제 즉시 반영
폐쇄몰 결제 완료 시 orders, order_items, company_notifications, integration_events가 같은 결제 확정 흐름에서 생성됩니다.
기업관리자 주문 화면은 company_notifications와 order_items를 실시간 구독해 즉시 반영하고 알림음을 재생합니다.
연동 요청이 live 상태이고 webhook_url이 등록되어 있으면 integration_events 생성 시 외부 webhook으로 자동 전송합니다.
`;
}

export function buildConnectionProfile(request: CompanyApiIntegrationRequest) {
  return {
    companyId: request.companyId,
    companyName: request.companyName,
    platformName: request.platformName,
    platformType: request.platformType,
    apiBaseUrl: request.deployment?.apiBaseUrl,
    apiKeyId: request.deployment?.apiKeyId,
    webhookSecretId: request.deployment?.webhookSecretId,
    packageVersion: request.deployment?.packageVersion,
    scopes: request.requestedScopes,
    tracks: {
      sabangnet: {
        orderListAPI: "/sabangnetOrderListAPI",
        orderStatusInfoAPI: "/sabangnetOrderStatusInfoAPI",
        sheetNoInfoAPI: "/sabangnetSheetNoInfoAPI",
        goodsViewAPI: "/sabangnetGoodsViewAPI",
      },
      standard: {
        orders: "/integrationStandardOrders",
        products: "/integrationStandardProducts",
        shipments: "/integrationStandardShipments",
        orderStatus: "/integrationStandardOrderStatus",
        events: "/integrationStandardEvents",
        eventStatus: "/integrationStandardEventStatus",
      },
    },
  };
}

export function apiDownloadDocuments(request: CompanyApiIntegrationRequest) {
  return [
    {
      title: "OpenAPI JSON",
      filename: `a5-${request.companyId}-company-integration.openapi.json`,
      mimeType: "application/json",
      content: JSON.stringify(buildCompanyOpenApiSpec(request), null, 2),
    },
    {
      title: "연동 가이드",
      filename: `a5-${request.companyId}-company-integration-guide.md`,
      mimeType: "text/markdown",
      content: buildCompanyApiGuide(request),
    },
    {
      title: "사방넷 매핑표",
      filename: `a5-${request.companyId}-sabangnet-mapping.md`,
      mimeType: "text/markdown",
      content: buildSabangnetMappingGuide(request),
    },
    {
      title: "연동 설정 JSON",
      filename: `a5-${request.companyId}-connection-profile.json`,
      mimeType: "application/json",
      content: JSON.stringify(buildConnectionProfile(request), null, 2),
    },
  ];
}

function asPlatformType(value: unknown): CompanyApiIntegrationPlatformType {
  const text = String(value ?? "");
  if (text === "SABANGNET" || text === "STANDARD" || text === "ERP" || text === "WMS" || text === "CUSTOM") return text;
  return "SABANGNET";
}
