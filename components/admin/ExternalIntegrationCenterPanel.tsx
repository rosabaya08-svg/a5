import {
  apiAccessControls,
  apiDocumentLifecycle,
  duplicateGuardKey,
  firestoreCollections,
  integrationCenterMetrics,
  integrationCenterModules,
  integrationDocuments,
  integrationEndpoints,
  integrationFieldMappings,
  integrationRecords,
  integrationStatusMappings,
  publicApiEndpoints,
  standardOrderFlow,
  syncJobs,
  syncLogs,
  webhookEvents,
} from "@/data/admin/integrations";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { formatDateTime } from "@/lib/utils/format";
import type {
  IntegrationAuthType,
  IntegrationEndpointPurpose,
  IntegrationPlatformType,
  IntegrationStatus,
  PublicApiEndpointRecord,
  SyncLogStatus,
} from "@/types/integration";

const platformLabels: Record<IntegrationPlatformType, string> = {
  SABANGNET: "사방넷",
  NAVER_COMMERCE: "네이버 커머스API",
  CAFE24: "카페24",
  COUPANG: "쿠팡",
  ERP: "ERP",
  WMS: "WMS",
  CUSTOM: "커스텀",
};

const authLabels: Record<IntegrationAuthType, string> = {
  api_key: "API Key",
  oauth2: "OAuth2",
  bearer: "Bearer Token",
  hmac: "HMAC",
};

const integrationStatusLabels: Record<IntegrationStatus, string> = {
  draft: "미설정",
  testing: "테스트중",
  active: "정상",
  paused: "중지",
  error: "오류",
};

const integrationStatusTone: Record<IntegrationStatus, BadgeTone> = {
  draft: "slate",
  testing: "amber",
  active: "green",
  paused: "purple",
  error: "red",
};

const purposeLabels: Record<IntegrationEndpointPurpose, string> = {
  orders_pull: "주문 수집",
  inventory_sync: "재고 동기화",
  invoice_push: "송장 전송",
  claim_pull: "클레임 수집",
  product_sync: "상품 동기화",
  webhook_receive: "웹훅 수신",
};

const logStatusLabels: Record<SyncLogStatus, string> = {
  success: "성공",
  failed: "실패",
  retrying: "재시도",
  blocked: "차단",
};

const logStatusTone: Record<SyncLogStatus, BadgeTone> = {
  success: "green",
  failed: "red",
  retrying: "amber",
  blocked: "red",
};

const publicApiStatusTone: Record<PublicApiEndpointRecord["status"], BadgeTone> = {
  draft: "slate",
  required: "amber",
  ready: "green",
};

type BadgeTone = "slate" | "blue" | "amber" | "red" | "green" | "purple";

const badgeClasses: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  purple: "bg-violet-100 text-violet-800 ring-violet-200",
};

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: BadgeTone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${badgeClasses[tone]}`}>{children}</span>;
}

function formatMaybeDateTime(value: string) {
  if (!value.includes("T")) return value;
  return formatDateTime(value);
}

function findIntegrationName(integrationId: string) {
  const integration = integrationRecords.find((item) => item.id === integrationId);
  return integration ? `${platformLabels[integration.platformType]} / ${integration.companyName}` : integrationId;
}

function FlowPanel() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">Pull</p>
        <h2 className="mt-2 text-lg font-black text-slate-950">외부 플랫폼 주문 수집</h2>
        <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
          {["기업 사용 플랫폼", "A5 외부 연동 커넥터", "A5 주문 DB", "기업 관리자 / 입점사 관리자", "배송 처리 / 정산 / 고객 안내"].map((step, index) => (
            <div key={step} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </article>
      <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-600">Public API / Webhook</p>
        <h2 className="mt-2 text-lg font-black text-slate-950">외부 시스템의 A5 주문 회수</h2>
        <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
          {["A5 쇼핑몰 주문 발생", "A5 공개 API 또는 Webhook", "기업 ERP / WMS / 사방넷", "출고 처리", "송장번호 A5 회신"].map((step, index) => (
            <div key={step} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function ModuleGrid() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {integrationCenterModules.map((module) => (
        <article key={module.title} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-950">{module.title}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-600">{module.body}</p>
        </article>
      ))}
    </section>
  );
}

function PlatformTable() {
  return (
    <section>
      <FilterBar
        title="연동 플랫폼 목록"
        filters={["전체", "정상", "테스트중", "오류", "중지"]}
        mode="toolbar"
        resultCount={integrationRecords.length}
        searchPlaceholder="플랫폼, 기업명 검색"
        sortOptions={["마지막 동기화순", "실패 건수순", "플랫폼순"]}
      />
      <DataTable
        columns={["플랫폼", "기업명", "상태", "인증", "마지막 동기화", "실패", "관리"]}
        rows={integrationRecords.map((integration) => ({
          id: integration.id,
          cells: [
            <span key="platform" className="font-semibold text-slate-950">{integration.displayName}</span>,
            integration.companyName,
            <Badge key="status" tone={integrationStatusTone[integration.status]}>{integrationStatusLabels[integration.status]}</Badge>,
            authLabels[integration.authType],
            formatMaybeDateTime(integration.lastSyncAt),
            <span key="failure" className={integration.failureCount > 0 ? "font-black text-red-700" : "font-bold text-emerald-700"}>
              {integration.failureCount}
            </span>,
            <div key="actions" className="flex flex-wrap gap-1">
              {["설정", "로그", "테스트", integration.status === "paused" ? "재개" : "중지"].map((action) => (
                <span key={action} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-700">
                  {action}
                </span>
              ))}
            </div>,
          ],
        }))}
      />
    </section>
  );
}

function DocumentAndEndpointPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-600">API Docs</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">문서 등록 이후 처리 흐름</h2>
          </div>
          <Badge tone="purple">버전관리</Badge>
        </div>
        <div className="mt-4 grid gap-2">
          {apiDocumentLifecycle.map((stage, index) => (
            <div key={stage} className="flex items-center gap-3 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">
              <span className="flex size-7 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
              <span>{stage}</span>
            </div>
          ))}
        </div>
      </article>
      <div>
        <DataTable
          columns={["문서명", "유형", "플랫폼", "버전", "상태"]}
          rows={integrationDocuments.map((document) => ({
            id: document.id,
            cells: [
              <span key="title" className="font-semibold text-slate-950">{document.title}</span>,
              document.documentType.toUpperCase(),
              findIntegrationName(document.integrationId),
              document.version,
              <Badge key="status" tone={document.status === "production" ? "green" : document.status === "tested" ? "blue" : "amber"}>
                {document.status === "production" ? "운영중" : document.status === "tested" ? "테스트완료" : "검토중"}
              </Badge>,
            ],
          }))}
        />
      </div>
      <div className="xl:col-span-2">
        <DataTable
          columns={["플랫폼", "작업", "Method", "Path", "매핑", "테스트"]}
          rows={integrationEndpoints.map((endpoint) => ({
            id: endpoint.id,
            cells: [
              findIntegrationName(endpoint.integrationId),
              purposeLabels[endpoint.purpose],
              <Badge key="method" tone={endpoint.method === "GET" ? "blue" : "green"}>{endpoint.method}</Badge>,
              <code key="path" className="break-all rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800">{endpoint.path}</code>,
              endpoint.mapping,
              <Badge key="test" tone={endpoint.testStatus === "passed" ? "green" : endpoint.testStatus === "failed" ? "red" : "slate"}>
                {endpoint.testStatus === "passed" ? "성공" : endpoint.testStatus === "failed" ? "실패" : "대기"}
              </Badge>,
            ],
          }))}
        />
      </div>
    </section>
  );
}

function MappingPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article>
        <FilterBar title="필드 매핑" filters={["외부 필드", "A5 필드", "변환 규칙"]} />
        <DataTable
          columns={["플랫폼", "외부 필드", "A5 필드", "변환"]}
          rows={integrationFieldMappings.map((mapping) => ({
            id: mapping.id,
            cells: [
              findIntegrationName(mapping.integrationId),
              <code key="external" className="rounded bg-slate-100 px-2 py-1 text-xs font-bold">{mapping.externalField}</code>,
              <code key="internal" className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">{mapping.internalField}</code>,
              mapping.transformRule,
            ],
          }))}
        />
      </article>
      <article>
        <FilterBar title="상태 매핑" filters={["결제완료", "배송준비", "배송중", "반품"]} />
        <DataTable
          columns={["플랫폼", "외부 상태", "A5 표준 상태", "메모"]}
          rows={integrationStatusMappings.map((mapping) => ({
            id: mapping.id,
            cells: [
              findIntegrationName(mapping.integrationId),
              mapping.externalStatus,
              <Badge key="status" tone="blue">{mapping.internalStatus}</Badge>,
              mapping.note,
            ],
          }))}
        />
      </article>
    </section>
  );
}

function SchedulerAndLogPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <article>
        <FilterBar title="동기화 스케줄러" filters={["주문 수집", "송장 전송", "재고 동기화"]} />
        <DataTable
          columns={["작업", "플랫폼", "주기", "마지막 실행", "다음 실행", "상태"]}
          rows={syncJobs.map((job) => ({
            id: job.id,
            cells: [
              purposeLabels[job.jobType],
              findIntegrationName(job.integrationId),
              job.schedule,
              formatMaybeDateTime(job.lastRunAt),
              formatMaybeDateTime(job.nextRunAt),
              <Badge key="status" tone={job.status === "scheduled" ? "green" : job.status === "error" ? "red" : job.status === "paused" ? "purple" : "blue"}>
                {job.status === "scheduled" ? "예약" : job.status === "error" ? "오류" : job.status === "paused" ? "중지" : "실행중"}
              </Badge>,
            ],
          }))}
        />
      </article>
      <article>
        <FilterBar title="실패 로그/재시도" filters={["성공", "실패", "차단", "재시도"]} />
        <DataTable
          columns={["시간", "플랫폼", "결과", "오류코드", "재시도", "메시지"]}
          rows={syncLogs.map((log) => ({
            id: log.id,
            cells: [
              formatMaybeDateTime(log.createdAt),
              findIntegrationName(log.integrationId),
              <Badge key="status" tone={logStatusTone[log.status]}>{logStatusLabels[log.status]}</Badge>,
              log.errorCode ?? "-",
              log.retryCount,
              log.errorMessage ?? "정상 처리",
            ],
          }))}
        />
      </article>
      <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-600">Webhook</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">웹훅 수신 관리</h2>
          </div>
          <Badge tone="green">서명 검증 대상</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {webhookEvents.map((event) => (
            <div key={event.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-slate-950">{event.eventType}</p>
                <Badge tone={event.processed ? "green" : "amber"}>{event.processed ? "처리완료" : "대기"}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-600">{findIntegrationName(event.integrationId)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{formatMaybeDateTime(event.receivedAt)}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function StandardModelPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">A5 Standard Model</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">표준 주문/물류 프로세스</h2>
        </div>
        <Badge tone="blue">중복 방지 키: {duplicateGuardKey}</Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {standardOrderFlow.map((step, index) => (
          <div key={step} className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{index + 1}</span>
            <span className="text-sm font-bold text-slate-700">{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicApiPanel() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <article>
        <FilterBar title="A5 공개 API 카탈로그" filters={["주문", "상품", "재고", "클레임", "웹훅"]} />
        <DataTable
          columns={["Method", "Endpoint", "권한 범위", "목적", "상태"]}
          rows={publicApiEndpoints.map((endpoint) => ({
            id: endpoint.id,
            cells: [
              <Badge key="method" tone={endpoint.method === "GET" ? "blue" : endpoint.method === "PATCH" ? "purple" : "green"}>{endpoint.method}</Badge>,
              <code key="path" className="break-all rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800">{endpoint.path}</code>,
              endpoint.scope,
              endpoint.purpose,
              <Badge key="status" tone={publicApiStatusTone[endpoint.status]}>
                {endpoint.status === "ready" ? "준비완료" : endpoint.status === "required" ? "필수" : "초안"}
              </Badge>,
            ],
          }))}
        />
      </article>
      <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">Access Control</p>
        <h2 className="mt-1 text-lg font-black text-slate-950">기업 API 접근키 발급</h2>
        <div className="mt-4 grid gap-2">
          {apiAccessControls.map((control) => (
            <div key={control} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
              {control}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function FirestoreBlueprintPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Firestore Blueprint</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">외부 연동 센터 컬렉션 구조</h2>
        </div>
        <Badge tone="red">Secret 평문 저장 금지</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {firestoreCollections.map((item) => (
          <article key={item.collection} className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <code className="text-sm font-black text-blue-800">{item.collection}</code>
            <p className="mt-2 text-sm leading-6 text-slate-700">{item.purpose}</p>
            <p className="mt-2 text-xs font-bold text-red-700">{item.security}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ExternalIntegrationCenterPanel() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {integrationCenterMetrics.map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </div>

      <ConfirmBox
        title="외부 연동 센터 운영 경계"
        description="API 문서 보관함이 아니라 인증정보, 필드 매핑, 상태 매핑, 테스트 호출, 스케줄러, 실패 로그, A5 공개 API 문서를 함께 관리하는 최고관리자 허브입니다. Secret 값은 Firestore에 평문 저장하지 않고 Secret Manager 또는 별도 암호화 저장소 참조값만 남깁니다."
        confirmLabel="SUPER_ADMIN 승인"
      />

      <FlowPanel />
      <ModuleGrid />
      <PlatformTable />
      <StandardModelPanel />
      <DocumentAndEndpointPanel />
      <MappingPanel />
      <SchedulerAndLogPanel />
      <PublicApiPanel />
      <FirestoreBlueprintPanel />
    </div>
  );
}
