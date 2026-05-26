export type IntegrationPlatformType =
  | "SABANGNET"
  | "NAVER_COMMERCE"
  | "CAFE24"
  | "COUPANG"
  | "ERP"
  | "WMS"
  | "CUSTOM";

export type IntegrationAuthType = "api_key" | "oauth2" | "bearer" | "hmac";

export type IntegrationStatus = "draft" | "testing" | "active" | "paused" | "error";

export type IntegrationDocumentType = "url" | "pdf" | "openapi" | "manual";

export type IntegrationEndpointPurpose =
  | "orders_pull"
  | "inventory_sync"
  | "invoice_push"
  | "claim_pull"
  | "product_sync"
  | "webhook_receive";

export type IntegrationHttpMethod = "GET" | "POST" | "PUT" | "PATCH";

export type A5StandardOrderStatus =
  | "PAYMENT_COMPLETED"
  | "ORDER_CONFIRMED"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCEL_REQUESTED"
  | "CANCELED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "EXCHANGE_REQUESTED";

export type SyncLogStatus = "success" | "failed" | "retrying" | "blocked";

export type IntegrationRecord = {
  id: string;
  platformType: IntegrationPlatformType;
  companyId: string;
  companyName: string;
  displayName: string;
  status: IntegrationStatus;
  authType: IntegrationAuthType;
  baseUrl: string;
  lastSyncAt: string;
  failureCount: number;
  owner: string;
  capabilities: IntegrationEndpointPurpose[];
};

export type IntegrationDocumentRecord = {
  id: string;
  integrationId: string;
  documentType: IntegrationDocumentType;
  title: string;
  source: string;
  version: string;
  status: "review" | "tested" | "production";
  uploadedAt: string;
};

export type IntegrationEndpointRecord = {
  id: string;
  integrationId: string;
  purpose: IntegrationEndpointPurpose;
  method: IntegrationHttpMethod;
  path: string;
  mapping: string;
  testStatus: "not_run" | "passed" | "failed";
};

export type IntegrationFieldMappingRecord = {
  id: string;
  integrationId: string;
  externalField: string;
  internalField: string;
  transformRule: string;
};

export type IntegrationStatusMappingRecord = {
  id: string;
  integrationId: string;
  externalStatus: string;
  internalStatus: A5StandardOrderStatus;
  note: string;
};

export type SyncJobRecord = {
  id: string;
  integrationId: string;
  jobType: IntegrationEndpointPurpose;
  schedule: string;
  lastRunAt: string;
  nextRunAt: string;
  status: "scheduled" | "running" | "paused" | "error";
};

export type SyncLogRecord = {
  id: string;
  integrationId: string;
  jobId: string;
  requestId: string;
  status: SyncLogStatus;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
};

export type PublicApiEndpointRecord = {
  id: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  scope: "orders:read" | "orders:write" | "products:read" | "inventory:write" | "claims:read" | "webhooks:test";
  purpose: string;
  status: "draft" | "required" | "ready";
};
