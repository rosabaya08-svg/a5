"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiDownloadDocuments,
  apiIntegrationScopes,
  apiIntegrationStatusLabel,
  buildApiIntegrationCmsRecord,
  createDefaultApiIntegrationRequest,
  requestFromCmsRecord,
  type CompanyApiIntegrationRequest,
} from "@/lib/company/apiIntegrationRequest";
import { saveCmsRecord, subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import { formatDateTime } from "@/lib/utils/format";
import { CompanyIntegrationOperationsPanel } from "@/components/company/CompanyIntegrationOperationsPanel";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

const integrationTracks = [
  {
    id: "SABANGNET",
    title: "사방넷 전용 연동",
    body: "사방넷 담당자가 항목별 매핑을 갈무리할 수 있도록 사방넷 호환 필드명과 상태 코드로 주문, 상품, 송장 API를 제공합니다.",
  },
  {
    id: "STANDARD",
    title: "기업 표준 API 연동",
    body: "ERP, WMS, 자체 주문 시스템이 같은 주문, 상품, 송장 Core에 붙을 수 있도록 A5 표준 API 트랙을 제공합니다.",
  },
] as const;

function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusTone(status: CompanyApiIntegrationRequest["status"]) {
  if (status === "live") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "approved") return "bg-blue-50 text-blue-800 ring-blue-200";
  if (status === "rejected") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-amber-50 text-amber-900 ring-amber-200";
}

export function CompanyApiIntegrationPanel({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [request, setRequest] = useState<CompanyApiIntegrationRequest>(() =>
    createDefaultApiIntegrationRequest(companyId, companyName),
  );
  const [remoteRequests, setRemoteRequests] = useState<CompanyApiIntegrationRequest[]>([]);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  useEffect(() => {
    return subscribeCmsRecords(
      "company_api_integration_requests",
      (records: CmsRecord[]) => {
        const companyRequests = records
          .map(requestFromCmsRecord)
          .filter((item) => item.companyId === companyId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        setRemoteRequests(companyRequests);

        if (companyRequests[0]) {
          setRequest(companyRequests[0]);
        }
      },
      () => undefined,
    );
  }, [companyId]);

  const activeRequest = remoteRequests[0] ?? request;
  const canDownload = activeRequest.status === "live" && Boolean(activeRequest.deployment);
  const documents = useMemo(() => apiDownloadDocuments(activeRequest), [activeRequest]);

  function update<K extends keyof CompanyApiIntegrationRequest>(key: K, value: CompanyApiIntegrationRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }

  function toggleScope(scopeId: string) {
    setRequest((current) => {
      const exists = current.requestedScopes.includes(scopeId);
      return {
        ...current,
        requestedScopes: exists ? current.requestedScopes.filter((item) => item !== scopeId) : [...current.requestedScopes, scopeId],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function submitRequest(platformType?: CompanyApiIntegrationRequest["platformType"]) {
    const now = new Date().toISOString();
    const nextPlatformType = platformType ?? request.platformType;
    const nextRequest: CompanyApiIntegrationRequest = {
      ...request,
      companyId,
      companyName,
      platformType: nextPlatformType,
      platformName: request.platformName || (nextPlatformType === "SABANGNET" ? "사방넷" : "기업 표준 API"),
      status: "pending_approval",
      createdAt: request.createdAt || now,
      updatedAt: now,
      rejectedReason: undefined,
    };

    setSaveState({ status: "saving", message: "API 연동 요청을 접수하는 중입니다." });
    setRequest(nextRequest);

    try {
      await saveCmsRecord("company_api_integration_requests", buildApiIntegrationCmsRecord(nextRequest));
      setSaveState({
        status: "saved",
        message: `${nextRequest.platformType === "SABANGNET" ? "사방넷" : "기업 표준 API"} 연동 요청이 접수되었습니다. 승인 후 연결 정보와 문서가 열립니다.`,
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "Firestore save failed.",
      });
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-blue-700">기업 연동 API</p>
            <h2 className="mt-1 text-xl font-normal">기업관리자 API 연동 관리</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6">
              주문, 상품, 송장, 결제 이벤트는 하나의 A5 연동 Core에서 관리하고 사방넷 전용 트랙과 기업 표준 API 트랙으로 나누어 제공합니다.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-normal ring-1 ${statusTone(activeRequest.status)}`}>
            {apiIntegrationStatusLabel(activeRequest.status)}
          </span>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {integrationTracks.map((track) => (
          <article key={track.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-normal uppercase tracking-[0.14em] text-emerald-700">{track.id}</p>
            <h3 className="mt-1 text-lg font-normal text-slate-950">{track.title}</h3>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{track.body}</p>
            <button type="button" onClick={() => submitRequest(track.id)} className="mt-4 rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
              {track.title} 요청
            </button>
          </article>
        ))}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            연동 프로그램명
            <input
              value={request.platformName}
              onChange={(event) => update("platformName", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-3 text-sm font-normal"
              placeholder="예: 사방넷, 자체 ERP, 물류 WMS"
            />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            연동 유형
            <select
              value={request.platformType}
              onChange={(event) => update("platformType", event.target.value as CompanyApiIntegrationRequest["platformType"])}
              className="rounded-md border border-slate-200 px-3 py-3 text-sm font-normal"
            >
              <option value="SABANGNET">사방넷</option>
              <option value="STANDARD">기업 표준 API</option>
              <option value="ERP">ERP</option>
              <option value="WMS">WMS</option>
              <option value="CUSTOM">자체 시스템</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            담당자명
            <input value={request.contactName} onChange={(event) => update("contactName", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            담당자 이메일
            <input value={request.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-normal" inputMode="email" />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            담당자 연락처
            <input value={request.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            Webhook URL
            <input value={request.webhookUrl} onChange={(event) => update("webhookUrl", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-normal" placeholder="https://..." />
          </label>
        </div>

        <label className="mt-4 grid gap-2 text-sm font-normal text-slate-800">
          허용 서버 IP
          <textarea
            value={request.serverIps}
            onChange={(event) => update("serverIps", event.target.value)}
            className="min-h-24 rounded-md border border-slate-200 px-3 py-3 text-sm font-normal"
            placeholder="예: 123.123.123.10, 123.123.123.11"
          />
        </label>

        <div className="mt-4">
          <p className="text-sm font-normal text-slate-800">요청 권한 범위</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {apiIntegrationScopes.map((scope) => (
              <label key={scope.id} className="flex items-center gap-3 rounded-md bg-slate-50 p-3 text-sm font-normal text-slate-700">
                <input type="checkbox" checked={request.requestedScopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} />
                <span>{scope.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-normal ${saveState.status === "error" ? "text-red-700" : saveState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
            {saveState.message || `최근 상태: ${apiIntegrationStatusLabel(activeRequest.status)} / ${formatDateTime(activeRequest.updatedAt)}`}
          </p>
          <button type="button" onClick={() => submitRequest()} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
            API 연동 요청 저장
          </button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-normal text-slate-950">API 문서 다운로드</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              승인 및 배포가 완료되면 사방넷 매핑표, A5 표준 OpenAPI, 연결 프로파일을 내려받을 수 있습니다.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-normal ring-1 ${canDownload ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
            {canDownload ? "다운로드 가능" : "배포 대기"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {documents.map((document) => (
            <article key={document.filename} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <h4 className="font-normal text-slate-950">{document.title}</h4>
              <p className="mt-1 break-words text-xs font-normal text-slate-500">{document.filename}</p>
              <button
                type="button"
                disabled={!canDownload}
                onClick={() => downloadFile(document.filename, document.mimeType, document.content)}
                className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                내려받기
              </button>
            </article>
          ))}
        </div>
      </section>

      <CompanyIntegrationOperationsPanel companyId={companyId} />
    </div>
  );
}
