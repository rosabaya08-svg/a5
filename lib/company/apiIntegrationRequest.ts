import type { CmsRecord } from "@/lib/firebase/contentRepository";

export const COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY = "a5.company.api-integration-request";

export type CompanyApiIntegrationStatus = "pending_approval" | "approved" | "live" | "rejected";

export type CompanyApiIntegrationRequest = {
  id: string;
  companyId: string;
  companyName: string;
  status: CompanyApiIntegrationStatus;
  platformName: string;
  platformType: "ERP" | "WMS" | "SABANGNET" | "CUSTOM";
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
  { id: "orders:confirm", label: "주문 확인 회신" },
  { id: "shipments:write", label: "송장번호 회신" },
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
    platformType: "CUSTOM",
    purpose: "A5 주문내역 상세를 기업 ERP/WMS/사방넷 연동 프로그램에서 실시간 조회하고 송장번호를 A5로 회신",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    webhookUrl: "",
    serverIps: "",
    requestedScopes: ["orders:read", "orders:confirm", "shipments:write", "webhooks:test"],
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
    companyId: typeof record.company_id === "string" ? record.company_id : "company-test-1004",
    companyName: typeof record.company_name === "string" ? record.company_name : "A5 테스트 기업",
    status: ["pending_approval", "approved", "live", "rejected"].includes(status)
      ? (status as CompanyApiIntegrationStatus)
      : "pending_approval",
    platformName: typeof record.platform_name === "string" ? record.platform_name : "",
    platformType: record.platform_type === "ERP" || record.platform_type === "WMS" || record.platform_type === "SABANGNET" ? record.platform_type : "CUSTOM",
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
    deployment: record.deployment && typeof record.deployment === "object"
      ? record.deployment as CompanyApiIntegrationRequest["deployment"]
      : undefined,
  };
}

export function buildApiDeployment(request: CompanyApiIntegrationRequest) {
  const stamp = Date.now().toString(36).toUpperCase();

  return {
    apiBaseUrl: "https://api.a5-closed-mall.com",
    apiKeyId: `a5_${request.companyId}_${stamp}`,
    webhookSecretId: `whsec_${request.companyId}_${stamp}`,
    packageVersion: "a5-order-api-v1.0.0",
    deployedBy: "SUPER_ADMIN",
  };
}

export function buildCompanyOpenApiSpec(request: CompanyApiIntegrationRequest) {
  return {
    openapi: "3.0.3",
    info: {
      title: `A5 ${request.companyName} Order Integration API`,
      version: "1.0.0",
      description: "A5 주문내역 상세 조회와 송장 회신을 위한 기업 전용 API 스펙입니다.",
    },
    servers: [{ url: request.deployment?.apiBaseUrl ?? "https://api.a5-closed-mall.com" }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/api/v1/orders": {
        get: {
          summary: "기업 범위 주문 목록 조회",
          parameters: [
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", maximum: 100, default: 50 } },
          ],
          responses: { "200": { description: "기업 주문 목록" } },
        },
      },
      "/api/v1/orders/{orderId}": {
        get: {
          summary: "주문 상세 조회",
          parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "주문, 상품, 수령자, 결제, 배송 상세" } },
        },
      },
      "/api/v1/orders/{orderId}/confirm": {
        post: {
          summary: "기업 시스템 주문 확인",
          parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "주문 확인 완료" } },
        },
      },
      "/api/v1/orders/{orderId}/shipments": {
        post: {
          summary: "송장번호 A5 회신",
          parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["carrierCode", "invoiceNumber"],
                  properties: {
                    carrierCode: { type: "string" },
                    invoiceNumber: { type: "string" },
                    shippedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "송장 저장 완료" } },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "X-A5-API-Key" },
      },
    },
  };
}

export function buildCompanyApiGuide(request: CompanyApiIntegrationRequest) {
  const deployment = request.deployment;

  return `# A5 기업 주문 API 연동 패키지

## 기업
- company_id: ${request.companyId}
- company_name: ${request.companyName}
- 연동 대상: ${request.platformName || request.platformType}
- 상태: ${apiIntegrationStatusLabel(request.status)}

## 배포 정보
- API Base URL: ${deployment?.apiBaseUrl ?? "배포 전"}
- API Key ID: ${deployment?.apiKeyId ?? "배포 전"}
- Webhook Secret ID: ${deployment?.webhookSecretId ?? "배포 전"}
- Package Version: ${deployment?.packageVersion ?? "배포 전"}

실제 API Secret 원문은 보안상 문서에 포함하지 않습니다. 최고관리자가 별도 보안 채널로 전달해야 합니다.

## 목적
기업 ERP, WMS, 사방넷, 자체 주문 관리 프로그램에서 A5 주문 상세를 실시간 조회하고 송장번호를 A5로 회신합니다.

## 필수 Header
\`\`\`http
X-A5-API-Key: {issued_api_key}
Content-Type: application/json
\`\`\`

## 주요 API
| Method | Path | 용도 |
| --- | --- | --- |
| GET | /api/v1/orders | 기업 범위 주문 목록 조회 |
| GET | /api/v1/orders/{orderId} | 주문 상세 조회 |
| POST | /api/v1/orders/{orderId}/confirm | 주문 확인 회신 |
| POST | /api/v1/orders/{orderId}/shipments | 송장번호 회신 |

## 권한 범위
${request.requestedScopes.map((scope) => `- ${scope}`).join("\n")}

## 중복 방지 키
companyId + orderId + orderItemId

## Webhook URL
${request.webhookUrl || "미등록"}

## 서버 IP
${request.serverIps || "미등록"}
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
    endpoints: {
      orders: "/api/v1/orders",
      orderDetail: "/api/v1/orders/{orderId}",
      confirm: "/api/v1/orders/{orderId}/confirm",
      shipments: "/api/v1/orders/{orderId}/shipments",
    },
  };
}

export function apiDownloadDocuments(request: CompanyApiIntegrationRequest) {
  return [
    {
      title: "OpenAPI JSON",
      filename: `a5-${request.companyId}-order-api.openapi.json`,
      mimeType: "application/json",
      content: JSON.stringify(buildCompanyOpenApiSpec(request), null, 2),
    },
    {
      title: "연동 가이드",
      filename: `a5-${request.companyId}-order-api-guide.md`,
      mimeType: "text/markdown",
      content: buildCompanyApiGuide(request),
    },
    {
      title: "연동 설정 JSON",
      filename: `a5-${request.companyId}-connection-profile.json`,
      mimeType: "application/json",
      content: JSON.stringify(buildConnectionProfile(request), null, 2),
    },
  ];
}
