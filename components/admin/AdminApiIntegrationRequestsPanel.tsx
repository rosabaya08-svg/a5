"use client";

import { useEffect, useState } from "react";
import {
  apiIntegrationStatusLabel,
  buildApiDeployment,
  buildApiIntegrationCmsRecord,
  COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY,
  requestFromCmsRecord,
  type CompanyApiIntegrationRequest,
} from "@/lib/company/apiIntegrationRequest";
import {
  saveCmsRecord,
  subscribeCmsRecords,
  type CmsRecord,
} from "@/lib/firebase/contentRepository";
import { formatDateTime } from "@/lib/utils/format";

type ReviewState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

function readLocalRequest() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompanyApiIntegrationRequest) : null;
  } catch {
    return null;
  }
}

function writeLocalRequest(request: CompanyApiIntegrationRequest) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPANY_API_INTEGRATION_REQUEST_STORAGE_KEY, JSON.stringify(request));
}

function statusTone(status: CompanyApiIntegrationRequest["status"]) {
  if (status === "live") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "approved") return "bg-blue-50 text-blue-800 ring-blue-200";
  if (status === "rejected") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-amber-50 text-amber-900 ring-amber-200";
}

export function AdminApiIntegrationRequestsPanel() {
  const [localFallback] = useState<CompanyApiIntegrationRequest | null>(() => readLocalRequest());
  const [requests, setRequests] = useState<CompanyApiIntegrationRequest[]>(() => localFallback ? [localFallback] : []);
  const [reviewMemo, setReviewMemo] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState>({ status: "idle", message: "" });

  useEffect(() => {
    return subscribeCmsRecords(
      "company_api_integration_requests",
      (records: CmsRecord[]) => {
        const nextRequests = records
          .map(requestFromCmsRecord)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        setRequests(nextRequests.length ? nextRequests : localFallback ? [localFallback] : []);
      },
      () => undefined,
    );
  }, [localFallback]);

  async function updateRequest(request: CompanyApiIntegrationRequest, status: CompanyApiIntegrationRequest["status"]) {
    const now = new Date().toISOString();
    const nextRequest: CompanyApiIntegrationRequest = {
      ...request,
      status,
      updatedAt: now,
      approvedAt: status === "approved" || status === "live" ? request.approvedAt ?? now : request.approvedAt,
      deployedAt: status === "live" ? now : request.deployedAt,
      rejectedReason: status === "rejected" ? reviewMemo : undefined,
      deployment: status === "live" ? request.deployment ?? buildApiDeployment(request) : request.deployment,
    };

    setReviewState({ status: "saving", message: "API 요청 상태를 저장하는 중입니다." });
    writeLocalRequest(nextRequest);
    setRequests((current) => [nextRequest, ...current.filter((item) => item.id !== nextRequest.id)]);

    try {
      await saveCmsRecord("company_api_integration_requests", buildApiIntegrationCmsRecord(nextRequest));
      setReviewState({
        status: "saved",
        message: status === "live"
          ? "API 배포가 완료되었습니다. 기업 어드민에서 API 패키지를 다운로드할 수 있습니다."
          : status === "approved"
            ? "API 요청을 승인했습니다. 배포를 누르면 기업 다운로드가 열립니다."
            : "API 요청을 반려했습니다.",
      });
    } catch {
      setReviewState({ status: "saved", message: "브라우저 상태는 반영했습니다. 운영 저장소 권한이 열리면 다시 저장할 수 있습니다." });
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">company api requests</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">기업 API 연동 요청</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업이 자기 ERP, WMS, 사방넷, 자체 주문 프로그램에서 A5 주문 API를 쓰기 위해 보낸 요청을 승인하고 배포합니다.
          </p>
        </div>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-black text-slate-800">
        검토 메모 / 반려 사유
        <textarea
          value={reviewMemo}
          onChange={(event) => setReviewMemo(event.target.value)}
          className="min-h-20 rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-blue-500"
          placeholder="승인, 배포, 반려 사유를 남깁니다."
        />
      </label>

      <div className="mt-4 grid gap-3">
        {requests.length ? (
          requests.map((request) => (
            <article key={request.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">{request.companyName}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">{request.companyId} / {request.platformName || request.platformType}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone(request.status)}`}>
                  {apiIntegrationStatusLabel(request.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                {[
                  ["담당자", request.contactName || "-"],
                  ["Webhook", request.webhookUrl || "미등록"],
                  ["서버 IP", request.serverIps || "미등록"],
                  ["요청일", formatDateTime(request.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-white p-3">
                    <p className="text-xs font-black text-blue-700">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              {request.deployment ? (
                <div className="mt-3 rounded-md bg-white p-3 text-xs font-bold leading-5 text-slate-700">
                  API Key ID: {request.deployment.apiKeyId} / Webhook Secret ID: {request.deployment.webhookSecretId}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => updateRequest(request, "approved")} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                  승인
                </button>
                <button type="button" onClick={() => updateRequest(request, "live")} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                  배포
                </button>
                <button type="button" onClick={() => updateRequest(request, "rejected")} className="rounded-md bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200">
                  반려
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-md bg-slate-50 p-4 text-sm font-bold text-slate-600">접수된 API 연동 요청이 없습니다.</p>
        )}
      </div>

      {reviewState.message ? (
        <p className={`mt-4 rounded-md p-3 text-sm font-black ${reviewState.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {reviewState.message}
        </p>
      ) : null}
    </section>
  );
}
