"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiDownloadDocuments,
  apiIntegrationScopes,
  apiIntegrationStatusLabel,
  buildApiIntegrationCmsRecord,
  COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY,
  createDefaultApiIntegrationRequest,
  requestFromCmsRecord,
  type CompanyApiIntegrationRequest,
} from "@/lib/company/apiIntegrationRequest";
import {
  saveCmsRecord,
  subscribeCmsRecords,
  type CmsRecord,
} from "@/lib/firebase/contentRepository";
import { formatDateTime } from "@/lib/utils/format";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

function readLocalRequest(companyId: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompanyApiIntegrationRequest;
    return parsed.companyId === companyId ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalRequest(request: CompanyApiIntegrationRequest) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY, JSON.stringify(request));
}

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
    readLocalRequest(companyId) ?? createDefaultApiIntegrationRequest(companyId, companyName),
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
          writeLocalRequest(companyRequests[0]);
        }
      },
      () => undefined,
    );
  }, [companyId]);

  const activeRequest = remoteRequests[0] ?? request;
  const canDownload = activeRequest.status === "live" && Boolean(activeRequest.deployment);
  const documents = useMemo(() => apiDownloadDocuments(activeRequest), [activeRequest]);

  function update<K extends keyof CompanyApiIntegrationRequest>(key: K, value: CompanyApiIntegrationRequest[K]) {
    setRequest((current) => ({
      ...current,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  }

  function toggleScope(scopeId: string) {
    setRequest((current) => {
      const exists = current.requestedScopes.includes(scopeId);
      return {
        ...current,
        requestedScopes: exists
          ? current.requestedScopes.filter((item) => item !== scopeId)
          : [...current.requestedScopes, scopeId],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function submitRequest() {
    const now = new Date().toISOString();
    const nextRequest: CompanyApiIntegrationRequest = {
      ...request,
      companyId,
      companyName,
      status: "pending_approval",
      createdAt: request.createdAt || now,
      updatedAt: now,
      rejectedReason: undefined,
    };

    setSaveState({ status: "saving", message: "API 연동 요청을 접수하는 중입니다." });
    setRequest(nextRequest);
    writeLocalRequest(nextRequest);

    try {
      await saveCmsRecord("company_api_integration_requests", buildApiIntegrationCmsRecord(nextRequest));
      setSaveState({ status: "saved", message: "API 연동 요청이 접수되었습니다. 최고관리자 승인 후 배포됩니다." });
    } catch {
      setSaveState({
        status: "saved",
        message: "요청 내용은 이 브라우저에 저장되었습니다. 운영 저장소 권한이 열리면 같은 내용으로 다시 접수할 수 있습니다.",
      });
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">company api request</p>
            <h2 className="mt-1 text-xl font-black">API 연동 요청 / 다운로드</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6">
              기업 ERP, WMS, 사방넷, 자체 주문 프로그램에서 with.commerce 주문내역 상세를 조회하고
              송장번호를 회신할 수 있도록 연동 API 배포를 요청합니다.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone(activeRequest.status)}`}>
            {apiIntegrationStatusLabel(activeRequest.status)}
          </span>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-slate-800">
            연동 프로그램명
            <input
              value={request.platformName}
              onChange={(event) => update("platformName", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-3 text-sm font-bold"
              placeholder="예: 사방넷, 자체 ERP, 물류 WMS"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-800">
            플랫폼 유형
            <select
              value={request.platformType}
              onChange={(event) => update("platformType", event.target.value as CompanyApiIntegrationRequest["platformType"])}
              className="rounded-md border border-slate-200 px-3 py-3 text-sm font-bold"
            >
              <option value="SABANGNET">사방넷</option>
              <option value="ERP">ERP</option>
              <option value="WMS">WMS</option>
              <option value="CUSTOM">자체 프로그램</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-800">
            담당자명
            <input value={request.contactName} onChange={(event) => update("contactName", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-bold" />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-800">
            담당자 이메일
            <input value={request.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-bold" inputMode="email" />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-800">
            담당자 연락처
            <input value={request.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-bold" />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-800">
            Webhook URL
            <input value={request.webhookUrl} onChange={(event) => update("webhookUrl", event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm font-bold" placeholder="https://..." />
          </label>
        </div>

        <label className="mt-4 grid gap-2 text-sm font-black text-slate-800">
          허용 서버 IP
          <textarea
            value={request.serverIps}
            onChange={(event) => update("serverIps", event.target.value)}
            className="min-h-24 rounded-md border border-slate-200 px-3 py-3 text-sm font-bold"
            placeholder="예: 123.123.123.10, 123.123.123.11"
          />
        </label>

        <div className="mt-4">
          <p className="text-sm font-black text-slate-800">요청 권한 범위</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {apiIntegrationScopes.map((scope) => (
              <label key={scope.id} className="flex items-center gap-3 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={request.requestedScopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} />
                <span>{scope.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-black ${saveState.status === "error" ? "text-red-700" : saveState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
            {saveState.message || `최근 상태: ${apiIntegrationStatusLabel(activeRequest.status)} / ${formatDateTime(activeRequest.updatedAt)}`}
          </p>
          <button type="button" onClick={submitRequest} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
            API 연동 요청
          </button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">API 다운로드</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              최고관리자가 요청을 승인하고 배포를 완료하면 OpenAPI, 연동 가이드, 접속 설정 JSON을 내려받을 수 있습니다.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${canDownload ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
            {canDownload ? "다운로드 가능" : "배포 대기"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {documents.map((document) => (
            <article key={document.filename} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <h4 className="font-black text-slate-950">{document.title}</h4>
              <p className="mt-1 break-words text-xs font-bold text-slate-500">{document.filename}</p>
              <button
                type="button"
                disabled={!canDownload}
                onClick={() => downloadFile(document.filename, document.mimeType, document.content)}
                className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                내려받기
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
